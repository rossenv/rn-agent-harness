// PostToolUse hook for Claude Code and Codex: lint and format-check each file the agent just edited.
// The edit has already happened; exit 2 sends the problems back so the agent fixes them now.
// It runs ESLint and Prettier with this repo's configs, the same checks CI runs (ADR 0003).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

type HookInput = {
  cwd?: string;
  tool_input?: { file_path?: string; command?: string };
};

const CHECKED = /\.(ts|tsx|js|mts)$/;

// A disable comment turns off every rule, including any rule that would catch it,
// so these are found with a plain text search instead.
const LINT_DIRECTIVE = /eslint-(disable|enable)/;
const TS_SILENCER = /@ts-(ignore|expect-error|nocheck)/;

function readInput(): HookInput {
  try {
    return JSON.parse(readFileSync(0, "utf8")) as HookInput;
  } catch {
    // Exit 1 doesn't block, and the edit has already happened anyway.
    console.error(
      "The lint-edit hook couldn't read its input, so it didn't check this edit. Run npm run lint and npm run format:check yourself.",
    );
    process.exit(1);
  }
}

// Codex's apply_patch sends the whole patch in `command`, with one header line per file.
function patchPaths(patch: string): string[] {
  return [...patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map((m) =>
    (m[1] ?? "").trim(),
  );
}

// The path relative to the repo root, with "/" separators, or null when it's outside the repo.
function repoPath(absolute: string, root: string): string | null {
  const rel = relative(root, absolute).split(sep).join("/");
  if (rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    return null;
  return rel;
}

function run(args: string[], root: string): string | null {
  const result = spawnSync("npx", ["--no-install", ...args], {
    cwd: root,
    encoding: "utf8",
    // npm prints "npm notice run ..." for each npx call; the agent needs only the problems.
    env: { ...process.env, npm_config_loglevel: "error" },
  });
  return result.status === 0
    ? null
    : `${result.stdout}${result.stderr}`.trim() ||
        `${args[0]} exited with status ${result.status}.`;
}

const input = readInput();
const cwd = input.cwd ?? process.cwd();
const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;

// Claude Code's Edit, Write and MultiEdit send file_path; Codex's apply_patch sends a patch.
const edited = input.tool_input?.file_path
  ? [input.tool_input.file_path]
  : patchPaths(input.tool_input?.command ?? "");

const files = [
  ...new Set(
    edited
      .map((p) => (isAbsolute(p) ? p : resolve(cwd, p)))
      .filter((p) => CHECKED.test(p) && existsSync(p))
      .map((p) => repoPath(p, root))
      .filter((p): p is string => p !== null),
  ),
];
if (files.length === 0) process.exit(0);

const problems: string[] = [];

for (const file of files) {
  const text = readFileSync(resolve(root, file), "utf8");
  if (LINT_DIRECTIVE.test(text))
    problems.push(`${file}: remove the lint disable comment.`);
  if (TS_SILENCER.test(text))
    problems.push(
      `${file}: remove the TypeScript suppression comment and fix the type error.`,
    );
}

// --no-warn-ignored: a file the config ignores isn't a problem.
const eslint = run(
  ["eslint", "--max-warnings=0", "--no-warn-ignored", ...files],
  root,
);
if (eslint) problems.push(`ESLint:\n${eslint}`);

const prettier = run(["prettier", "--check", ...files], root);
if (prettier)
  problems.push(
    `Prettier:\n${prettier}\nRun npx prettier --write on the file to fix the formatting.`,
  );

if (problems.length === 0) process.exit(0);
console.error(
  [
    "Lint failed on the file you just edited. Fix it now, before moving on.",
    "",
    ...problems,
    "",
    "If a rule is wrong here, stop and ask: lint exceptions go in eslint.config.js, which a person owns.",
  ].join("\n"),
);
process.exit(2);
