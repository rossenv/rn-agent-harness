import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const HOOK = resolve(__dirname, "stop-gate.mts");

jest.setTimeout(60_000);

// A throwaway git repo whose npm scripts are stand-ins: each one logs its name and arguments,
// and fails when its name is in FAIL. The real scripts are tested by CI, not here.
const FAKE_SCRIPT = `
const { appendFileSync } = require("node:fs");
const [name, ...args] = process.argv.slice(2);
appendFileSync("ran.log", [name, ...args].join(" ") + "\\n");
if ((process.env.FAIL ?? "").split(",").includes(name)) {
  console.error(name + " broke here");
  process.exit(1);
}
`;
const SCRIPTS = {
  typecheck: "node fake.js typecheck",
  lint: "node fake.js lint",
  "format:check": "node fake.js format:check",
  test: "node fake.js test",
};

let root: string;

function git(...args: string[]) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
}

function write(path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stop-gate-project-"));
  write("package.json", JSON.stringify({ private: true, scripts: SCRIPTS }));
  write("fake.js", FAKE_SCRIPT);
  write(".gitignore", "ran.log\nnode_modules/\n");
  write("src/sum.ts", "export const sum = (a: number, b: number) => a + b;\n");
  write("src/sum.test.ts", 'it("adds", () => {});\n');
  git("init", "-q");
  git("add", "-A");
  git(
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@example.com",
    "commit",
    "-qm",
    "init",
  );
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

type Run = {
  status: number | null;
  stdout: string;
  stderr: string;
  ran: string[];
  json: { decision?: string; reason?: string; systemMessage?: string } | null;
};

function runGate(
  input: unknown,
  {
    fail = "",
    projectDir = true,
  }: { fail?: string; projectDir?: boolean } = {},
): Run {
  const env: NodeJS.ProcessEnv = { ...process.env, FAIL: fail };
  if (projectDir) env.CLAUDE_PROJECT_DIR = root;
  else delete env.CLAUDE_PROJECT_DIR;
  const result = spawnSync("node", [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    cwd: root,
    env,
  });
  const log = join(root, "ran.log");
  const ran = existsSync(log)
    ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean)
    : [];
  let json: Run["json"] = null;
  try {
    json = JSON.parse(result.stdout) as Run["json"];
  } catch {
    json = null;
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    ran,
    json,
  };
}

const stop = (extra: object = {}, options?: Parameters<typeof runGate>[1]) =>
  runGate({ hook_event_name: "Stop", cwd: root, ...extra }, options);

const blocked = (run: Run) =>
  run.status === 0 && run.json?.decision === "block";

// Built from pieces so this file doesn't hold the text the gate and CI search for.
const SKIP = (word: string) => `it.${word}("adds", () => {});\n`;
const LINT_DIRECTIVE = `// eslint${"-"}disable-next-line\n`;
const TS_SILENCER = `// @ts${"-"}ignore\n`;

describe("a clean tree", () => {
  it("lets the agent stop without running the checks", () => {
    const run = stop();
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("");
    expect(run.ran).toEqual([]);
  });
});

describe("a changed tree", () => {
  beforeEach(() => {
    write(
      "src/sum.ts",
      "export const sum = (a: number, b: number) => b + a;\n",
    );
  });

  it("runs typecheck, lint, format:check and the changed tests, then allows the stop", () => {
    const run = stop();
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("");
    expect(run.ran).toEqual([
      "typecheck",
      "lint",
      "format:check",
      "test --onlyChanged",
    ]);
  });

  it("also runs for a new file git doesn't track yet", () => {
    git("checkout", "-q", "--", ".");
    write("src/new.ts", "export const x = 1;\n");
    expect(stop().ran).toHaveLength(4);
  });

  it.each(["typecheck", "lint", "format:check", "test"])(
    "blocks the stop when %s fails, with its output",
    (name) => {
      const run = stop({}, { fail: name });
      expect(blocked(run)).toBe(true);
      expect(run.json?.reason).toContain("Not done");
      expect(run.json?.reason).toContain(`npm run ${name}`);
      expect(run.json?.reason).toContain(`${name} broke here`);
    },
  );

  it("names every failing check, not just the first", () => {
    const run = stop({}, { fail: "typecheck,test" });
    expect(blocked(run)).toBe(true);
    expect(run.json?.reason).toContain("npm run typecheck");
    expect(run.json?.reason).toContain("npm run test");
    expect(run.json?.reason).not.toContain("npm run lint");
  });

  it("tells the agent not to silence a check", () => {
    const run = stop({}, { fail: "lint" });
    expect(run.json?.reason).toContain("Fix the cause");
    expect(run.json?.reason).toContain("eslint.config.js");
  });
});

describe("skipped and focused tests", () => {
  it.each(["skip", "only"])("blocks a .%s test in a changed file", (word) => {
    write("src/sum.test.ts", SKIP(word));
    const run = stop();
    expect(blocked(run)).toBe(true);
    expect(run.json?.reason).toContain("src/sum.test.ts:1");
  });

  it.each([
    "xit",
    "xtest",
    "xdescribe",
    "fit",
    "fdescribe",
    ["describe", "only"].join("."),
    ["test", "skip", "each([1])"].join("."),
  ])("blocks %s", (call) => {
    write("src/sum.test.ts", `${call}("adds", () => {});\n`);
    expect(blocked(stop())).toBe(true);
  });

  it("blocks one that's already committed", () => {
    write("src/sum.test.ts", SKIP("skip"));
    git("add", "-A");
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      "commit",
      "-qm",
      "skip",
    );
    const run = stop();
    expect(blocked(run)).toBe(true);
    expect(run.ran).toEqual([]);
  });

  it("finds them in __tests__ and .spec files too", () => {
    write("__tests__/a.tsx", SKIP("only"));
    write("src/b.spec.ts", SKIP("skip"));
    const run = stop();
    expect(run.json?.reason).toContain("__tests__/a.tsx");
    expect(run.json?.reason).toContain("src/b.spec.ts");
  });

  it("leaves ordinary code alone", () => {
    write(
      "src/sum.test.ts",
      'const only = { skip: 1 };\nit("reads fields", () => expect(only.skip).toBe(1));\n',
    );
    expect(blocked(stop())).toBe(false);
  });
});

describe("silencing comments", () => {
  it.each([
    ["a lint disable comment", LINT_DIRECTIVE],
    ["a TypeScript suppression comment", TS_SILENCER],
  ])("blocks %s", (_label, comment) => {
    write("src/sum.ts", `${comment}export const sum = 1;\n`);
    const run = stop();
    expect(blocked(run)).toBe(true);
    expect(run.json?.reason).toContain("src/sum.ts:1");
  });

  it("searches the same folders as CI", () => {
    write("docs/notes.ts", LINT_DIRECTIVE);
    expect(blocked(stop())).toBe(false);
  });
});

describe("one retry, then the person", () => {
  it("allows the stop on the retry, and tells the person what still fails", () => {
    write("src/sum.test.ts", SKIP("skip"));
    const run = stop({ stop_hook_active: true }, { fail: "lint" });
    expect(run.status).toBe(0);
    expect(run.json?.decision).toBeUndefined();
    expect(run.json?.systemMessage).toContain("Stop gate");
    expect(run.json?.systemMessage).toContain("npm run lint");
    expect(run.json?.systemMessage).toContain("skipped or focused test");
  });

  it("says nothing on the retry when everything passes", () => {
    write("src/sum.ts", "export const sum = 2;\n");
    const run = stop({ stop_hook_active: true });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("");
  });
});

describe("where it runs", () => {
  it("finds the repo root from cwd when CLAUDE_PROJECT_DIR isn't set (Codex)", () => {
    write("src/sum.ts", "export const sum = 2;\n");
    const run = runGate(
      { hook_event_name: "Stop", cwd: join(root, "src") },
      { projectDir: false },
    );
    expect(run.ran).toHaveLength(4);
  });

  it("doesn't trap the agent when it can't read its input", () => {
    const run = runGate("not json");
    expect(run.status).toBe(0);
    expect(run.json?.systemMessage).toContain("couldn't read");
  });
});
