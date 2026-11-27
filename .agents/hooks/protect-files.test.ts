import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const HOOK = resolve(__dirname, "protect-files.mts");

type Run = { status: number | null; stderr: string };

function runHook(input: unknown, env: Record<string, string> = {}): Run {
  const result = spawnSync("node", [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT, ...env },
  });
  return { status: result.status, stderr: result.stderr };
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

const bash = (command: string) =>
  runHook({ tool_name: "Bash", tool_input: { command }, cwd: ROOT });

// Every rule file named in ADR 0002, as a path relative to the repo root.
const RULE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".claude/settings.json",
  ".codex/config.toml",
  ".agents/hooks/protect-files.mts",
  ".mcp.json",
  ".github/workflows/ci.yml",
  ".github/CODEOWNERS",
  "scripts/git-rules.ts",
  "scripts/tsconfig.json",
  "docs/adr/0002-rule-files-and-who-merges.md",
  "eslint.config.js",
  ".prettierrc.json",
  ".prettierignore",
  "tsconfig.json",
  "package.json",
  ".nvmrc",
  ".vscode/settings.json",
  "app.json",
];

describe("rule files: agents read them, people change them", () => {
  it.each(RULE_FILES)("blocks Edit of %s", (file) => {
    const run = claude("Edit", resolve(ROOT, file));
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("rule file");
  });

  it.each(["Write", "MultiEdit"])("blocks %s of AGENTS.md", (tool) => {
    expect(claude(tool, resolve(ROOT, "AGENTS.md")).status).toBe(2);
  });

  it("blocks NotebookEdit through notebook_path", () => {
    const run = runHook({
      tool_name: "NotebookEdit",
      tool_input: { notebook_path: resolve(ROOT, ".github/notes.ipynb") },
      cwd: ROOT,
    });
    expect(run.status).toBe(2);
  });

  it("blocks a relative path too", () => {
    expect(claude("Edit", "app.json").status).toBe(2);
  });

  it("blocks rule files inside a Claude worktree", () => {
    expect(
      claude("Edit", resolve(ROOT, ".claude/worktrees/feature-x/AGENTS.md"))
        .status,
    ).toBe(2);
  });

  it.each(RULE_FILES)("allows Read of %s", (file) => {
    expect(claude("Read", resolve(ROOT, file)).status).toBe(0);
  });
});

describe("ordinary files", () => {
  it.each([
    "src/app/index.tsx",
    "__tests__/router.test.tsx",
    "docs/process.md",
    "README.md",
    "CHANGELOG.md",
    "src/scripts/helpers.ts",
    "src/AGENTS.md.ts",
    ".claude/worktrees/feature-x/src/app/index.tsx",
  ])("allows Edit of %s", (file) => {
    expect(claude("Edit", resolve(ROOT, file)).status).toBe(0);
  });

  it("allows a file outside the repo", () => {
    expect(claude("Write", "/tmp/notes.md").status).toBe(0);
  });
});

describe("secrets: no reading or editing .env files", () => {
  it.each([".env", ".env.local", "src/.env.production"])(
    "blocks Read of %s",
    (file) => {
      const run = claude("Read", resolve(ROOT, file));
      expect(run.status).toBe(2);
      expect(run.stderr).toContain("protected");
    },
  );

  it("blocks Edit of .env", () => {
    expect(claude("Edit", resolve(ROOT, ".env")).status).toBe(2);
  });

  it.each([".env.example", "src/env.ts", ".envrc.md"])("allows %s", (file) => {
    expect(claude("Read", resolve(ROOT, file)).status).toBe(0);
  });

  it.each([
    "cat .env",
    "cat ./.env.local",
    "source .env && npm start",
    "grep KEY src/.env.production",
  ])("blocks the Bash command %j", (command) => {
    expect(bash(command).status).toBe(2);
  });

  it.each(["cat .env.example", "npm test", "echo $NODE_ENV", "cat src/env.ts"])(
    "allows the Bash command %j",
    (command) => {
      expect(bash(command).status).toBe(0);
    },
  );

  it("doesn't block Bash writes to rule files (best-effort: see the playbook's Not covered)", () => {
    expect(bash("sed -i '' 's/a/b/' AGENTS.md").status).toBe(0);
  });
});

describe("Codex apply_patch", () => {
  it.each(["Add File", "Update File", "Delete File"])(
    "blocks *** %s: AGENTS.md",
    (kind) => {
      const run = patch(`*** ${kind}: AGENTS.md`);
      expect(run.status).toBe(2);
      expect(run.stderr).toContain("AGENTS.md");
    },
  );

  it("blocks a move onto a rule file", () => {
    expect(
      patch("*** Update File: src/a.ts", "*** Move to: app.json").status,
    ).toBe(2);
  });

  it("blocks when any file in the patch is a rule file", () => {
    expect(
      patch(
        "*** Update File: src/a.ts",
        "*** Update File: .github/workflows/ci.yml",
      ).status,
    ).toBe(2);
  });

  it("blocks a .env file", () => {
    expect(patch("*** Add File: .env").status).toBe(2);
  });

  it("allows a patch of ordinary files", () => {
    expect(
      patch(
        "*** Update File: src/app/index.tsx",
        "*** Add File: src/utils/strings.ts",
      ).status,
    ).toBe(0);
  });
});

describe("unreadable input", () => {
  it("blocks when the hook can't parse its input", () => {
    const run = runHook("not json");
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("couldn't read");
  });

  it("allows a tool it doesn't check", () => {
    expect(
      runHook({ tool_name: "Glob", tool_input: { pattern: "**/*" }, cwd: ROOT })
        .status,
    ).toBe(0);
  });
});
