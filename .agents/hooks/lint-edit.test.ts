import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const REPO = resolve(__dirname, "../..");
const HOOK = resolve(__dirname, "lint-edit.mts");

// The configs ESLint and Prettier read, copied from the repo.
const CONFIGS = [
  "eslint.config.js",
  ".prettierrc.json",
  ".prettierignore",
  "tsconfig.json",
  "package.json",
];

// Each run starts ESLint and Prettier, which takes a few seconds.
jest.setTimeout(60_000);

// The fixtures live in a throwaway project outside the repo, with the repo's configs
// and node_modules. Inside the repo they'd show up in git and wake jest --watch.
let ROOT: string;
let dir: string;
beforeAll(() => {
  ROOT = mkdtempSync(join(tmpdir(), "lint-edit-project-"));
  for (const config of CONFIGS)
    copyFileSync(join(REPO, config), join(ROOT, config));
  symlinkSync(join(REPO, "node_modules"), join(ROOT, "node_modules"), "dir");
  dir = join(ROOT, "src");
  mkdirSync(dir);
});
afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

type Run = { status: number | null; stderr: string };

function runHook(input: unknown): Run {
  const result = spawnSync("node", [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
  return { status: result.status, stderr: result.stderr };
}

function file(name: string, text: string): string {
  const path = join(dir, name);
  writeFileSync(path, text);
  return path;
}

const claude = (tool_name: string, file_path: string) =>
  runHook({ tool_name, tool_input: { file_path }, cwd: ROOT });

const patch = (...headers: string[]) =>
  runHook({
    tool_name: "apply_patch",
    tool_input: {
      command: [
        "*** Begin Patch",
        ...headers.flatMap((h) => [h, "+x"]),
        "*** End Patch",
      ].join("\n"),
    },
    cwd: ROOT,
  });

// Relative to the project root, as Codex writes paths in a patch.
const rel = (path: string) => `${basename(dir)}/${basename(path)}`;

const CLEAN_TSX =
  'import { Text } from "react-native";\n\nexport const Hello = () => <Text>Hello</Text>;\n';
const UNUSED_VAR = "export const one = 1;\nconst unused = 2;\n";
const BAD_FORMAT = "export const   two={a:1}\n";
// Built from pieces so this file doesn't contain the comments CI searches for.
const LINT_DIRECTIVE = `// eslint${"-"}disable-next-line no-console\nexport const three = 3;\n`;
const TS_SILENCERS = ["ignore", "expect-error", "nocheck"].map(
  (word) => `// @ts${"-"}${word}\nexport const four = 4;\n`,
);

describe("Claude's file tools", () => {
  it.each(["Write", "Edit", "MultiEdit"])(
    "passes a clean .tsx file after %s",
    (tool) => {
      const run = claude(tool, file(`clean-${tool}.tsx`, CLEAN_TSX));
      expect(run.status).toBe(0);
      expect(run.stderr).toBe("");
    },
  );

  it("reports an ESLint problem in a .tsx file", () => {
    const path = file("unused.tsx", UNUSED_VAR);
    const run = claude("Edit", path);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("no-unused-vars");
    expect(run.stderr).toContain("unused.tsx");
    expect(run.stderr).toContain("Fix");
    expect(run.stderr).toContain("eslint.config.js");
  });

  it.each(["ts", "tsx", "js", "mts"])(
    "reports a Prettier problem in a .%s file",
    (ext) => {
      const run = claude("Write", file(`format.${ext}`, BAD_FORMAT));
      expect(run.status).toBe(2);
      expect(run.stderr).toContain(`format.${ext}`);
      expect(run.stderr).toContain("prettier --write");
    },
  );

  it("reports a lint disable comment", () => {
    const run = claude("Write", file("directive.ts", LINT_DIRECTIVE));
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("lint disable comment");
    expect(run.stderr).toContain("eslint.config.js");
  });

  it.each(TS_SILENCERS.map((text, i) => [i, text]))(
    "reports a TypeScript suppression comment (%i)",
    (i, text) => {
      const run = claude("Write", file(`silencer-${i}.ts`, text));
      expect(run.status).toBe(2);
      expect(run.stderr).toContain("TypeScript suppression comment");
    },
  );

  it("skips files that aren't .ts, .tsx, .js or .mts", () => {
    expect(claude("Write", file("notes.md", "#   messy  \n")).status).toBe(0);
    expect(claude("Write", file("data.json", "{ }")).status).toBe(0);
  });

  it("skips a file that no longer exists", () => {
    expect(claude("Edit", join(dir, "gone.ts")).status).toBe(0);
  });

  it("skips a file outside the project", () => {
    const outside = mkdtempSync(join(tmpdir(), "lint-edit-outside-"));
    try {
      const path = join(outside, "x.ts");
      writeFileSync(path, UNUSED_VAR);
      expect(claude("Write", path).status).toBe(0);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("Codex's apply_patch", () => {
  it("checks added and updated files, relative to cwd", () => {
    const added = file("added.ts", UNUSED_VAR);
    const updated = file("updated.tsx", BAD_FORMAT);
    const run = patch(
      `*** Add File: ${rel(added)}`,
      `*** Update File: ${rel(updated)}`,
    );
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("added.ts");
    expect(run.stderr).toContain("updated.tsx");
  });

  it("passes a patch of clean files", () => {
    const clean = file("patched-clean.tsx", CLEAN_TSX);
    expect(patch(`*** Update File: ${rel(clean)}`).status).toBe(0);
  });

  it("ignores deleted files", () => {
    const bad = file("deleted.ts", UNUSED_VAR);
    expect(patch(`*** Delete File: ${rel(bad)}`).status).toBe(0);
  });
});

describe("unreadable input", () => {
  it("doesn't block, but says it couldn't check", () => {
    const run = runHook("not json");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("couldn't read");
  });
});
