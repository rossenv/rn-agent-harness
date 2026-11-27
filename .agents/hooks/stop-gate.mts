// Stop hook for Claude Code and Codex: the agent can't finish while the checks fail.
// - Always: no skipped or focused tests, and no silencing comments (CI's search), in
//   committed and uncommitted files alike.
// - When the tree has changes: typecheck, lint, format:check and the tests for the changed files.
// It blocks once. On the retry (stop_hook_active) it lets the agent stop and tells the person.
// Both tools read {"decision":"block","reason"} on stdout; the reason goes back to the agent.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type StopInput = { cwd?: string; stop_hook_active?: boolean };

// [name the agent sees, npm arguments]
const NPM_CHECKS: [string, string[]][] = [
  ["npm run typecheck", ["run", "-s", "typecheck"]],
  ["npm run lint", ["run", "-s", "lint"]],
  ["npm run format:check", ["run", "-s", "format:check"]],
  [
    "npm run test -- --onlyChanged",
    ["run", "-s", "test", "--", "--onlyChanged"],
  ],
];

// Jest's default test files: *.test.* and *.spec.*, and anything in __tests__/.
const TEST_FILE = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$/;
// it.skip, test.only, describe.skip.each, test.concurrent.only, xit, fdescribe, ...
const SKIPPED = [
  /\b(it|test|describe)(\.\w+)*\.(skip|only)\b/,
  /\b(xit|xtest|xdescribe|fit|ftest|fdescribe)\s*\(/,
];

// The folders and comments CI's "No silencing comments" step searches.
const SILENCER_DIRS = ["src", "__tests__", "scripts", ".agents"];
const SILENCER = /eslint-(disable|enable)|@ts-(ignore|expect-error|nocheck)/;

const TAIL_LINES = 30;

function allow(systemMessage?: string): never {
  if (systemMessage) console.log(JSON.stringify({ systemMessage }));
  process.exit(0);
}

function readInput(): StopInput {
  try {
    return JSON.parse(readFileSync(0, "utf8")) as StopInput;
  } catch {
    // Trapping the agent would be worse than letting it stop unchecked.
    return allow(
      "Stop gate: couldn't read its input, so it didn't check this work. Run the four checks in AGENTS.md before merging.",
    );
  }
}

const input = readInput();
const cwd = input.cwd ?? process.cwd();

function run(cmd: string, args: string[], dir: string) {
  return spawnSync(cmd, args, {
    cwd: dir,
    encoding: "utf8",
    // npm prints "npm notice run ..." for each script; the agent needs only the problems.
    env: { ...process.env, npm_config_loglevel: "error" },
  });
}

// Codex runs hooks from the session's cwd, which may be below the repo root.
const toplevel = run("git", ["rev-parse", "--show-toplevel"], cwd);
const root =
  process.env.CLAUDE_PROJECT_DIR ??
  (toplevel.status === 0 ? toplevel.stdout.trim() : cwd);

// Tracked and untracked files, without the ones .gitignore leaves out.
function repoFiles(paths: string[] = []): string[] {
  const r = run(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ...paths,
    ],
    root,
  );
  return [...new Set(r.stdout.split("\0").filter(Boolean))];
}

// "path:line: text" for each line that matches.
function search(files: string[], patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue; // deleted but not yet staged
    }
    text.split("\n").forEach((line, i) => {
      if (patterns.some((p) => p.test(line)))
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  return hits;
}

const failures: { name: string; detail: string }[] = [];

const skipped = search(
  repoFiles().filter((f) => TEST_FILE.test(f)),
  SKIPPED,
);
if (skipped.length > 0)
  failures.push({
    name: "a skipped or focused test",
    detail: `Remove .skip / .only (and xit, fit, ...): every test runs.\n${skipped.join("\n")}`,
  });

const silenced = search(repoFiles(SILENCER_DIRS), [SILENCER]);
if (silenced.length > 0)
  failures.push({
    name: "a silencing comment",
    detail: `Remove the comment and fix what it hid.\n${silenced.join("\n")}`,
  });

// Nothing changed since the last commit: the commit's checks already ran.
const dirty = run("git", ["status", "--porcelain"], root).stdout.trim() !== "";
if (dirty) {
  for (const [name, args] of NPM_CHECKS) {
    const r = run("npm", args, root);
    if (r.status === 0) continue;
    const tail = `${r.stdout}${r.stderr}`
      .trim()
      .split("\n")
      .slice(-TAIL_LINES)
      .join("\n");
    failures.push({ name, detail: tail || `exited with status ${r.status}` });
  }
}

if (failures.length === 0) allow();

const names = failures.map((f) => f.name).join(", ");

if (input.stop_hook_active) {
  // It already had its retry: let it stop, and tell the person.
  allow(
    `Stop gate: still failing after one retry: ${names}. Check before merging.`,
  );
}

const reason = [
  `Not done: ${names}. Fix the cause, then finish.`,
  "Don't silence a check: no disable comments, no .skip or .only, no narrowed scripts.",
  "If a lint rule is wrong here, stop and ask: exceptions go in eslint.config.js, which a person owns.",
  "",
  ...failures.map((f) => `## ${f.name}\n${f.detail}\n`),
].join("\n");
console.log(JSON.stringify({ decision: "block", reason }));
process.exit(0);
