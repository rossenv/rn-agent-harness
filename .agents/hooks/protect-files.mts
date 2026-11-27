// PreToolUse hook for Claude Code and Codex.
// - Rule files (ADR 0002): agents may read them, but their file tools can't change them.
// - Secrets: no reading or editing .env files (.env.example is fine).
// Exit 2 blocks the tool call, and stderr tells the agent why.
// Bash commands are checked for .env only. A shell can still write a rule file
// (sed -i, echo >): the agents' GitHub account and code-owner review catch that (ADR 0002).
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

type HookInput = {
  tool_name?: string;
  cwd?: string;
  tool_input?: { file_path?: string; notebook_path?: string; command?: string };
};

// Paths relative to the repo root. Keep in step with ADR 0002 and .github/CODEOWNERS.
const RULE_FILES: RegExp[] = [
  // Agent instructions and config
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^\.claude\//, // .claude/worktrees/ is handled before this check
  /^\.codex\//,
  /^\.agents\//,
  /^\.mcp\.json$/,
  // CI and its checks
  /^\.github\//,
  /^scripts\//,
  // Decisions
  /^docs\/adr\//,
  // Lint, format, test and TypeScript config, and what CI runs
  /^eslint\.config\.js$/,
  /^\.prettierrc\.json$/,
  /^\.prettierignore$/,
  /^tsconfig(\.[\w-]+)?\.json$/,
  /^package\.json$/,
  /^\.nvmrc$/,
  // Editor config
  /^\.vscode\//,
  // Native config
  /^app\.json$/,
];

// Any .env file except .env.example, at any depth.
const SECRET_PATH = /(^|\/)\.env(?!\.example$)(\.[\w-]+)*$/;
// The same, found anywhere in a shell command. Best-effort.
const SECRET_IN_COMMAND =
  /(^|[^\w.-])\.env(?!\.example\b)(\.[\w-]+)*(?![\w.-])/;

// Claude's worktree agents work in .claude/worktrees/<name>/, a full copy of the repo.
const WORKTREE = /^\.claude\/worktrees\/[^/]+\//;

const FILE_TOOLS = ["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"];
const WRITE_TOOLS = [
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
  "apply_patch",
];

function block(message: string): never {
  console.error(message);
  process.exit(2);
}

function readInput(): HookInput {
  try {
    return JSON.parse(readFileSync(0, "utf8")) as HookInput;
  } catch {
    return block(
      "Blocked: the protect-files hook couldn't read its input, so it can't check this call. Ask the human.",
    );
  }
}

// Codex's apply_patch sends the whole patch in `command`, with one header line per file.
function patchPaths(patch: string): string[] {
  return [
    ...patch.matchAll(
      /^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm,
    ),
  ].map((m) => (m[1] ?? "").trim());
}

// The path relative to the repo root, with "/" separators, or null when it's outside the repo.
function repoPath(target: string, root: string, cwd: string): string | null {
  const absolute = isAbsolute(target) ? target : resolve(cwd, target);
  const rel = relative(root, absolute).split(sep).join("/");
  if (rel === "" || rel.startsWith("../") || rel === ".." || isAbsolute(rel))
    return null;
  return rel.replace(WORKTREE, "");
}

const input = readInput();
const tool = input.tool_name ?? "";
const cwd = input.cwd ?? process.cwd();
const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;
const command = input.tool_input?.command ?? "";

if (tool === "Bash") {
  if (SECRET_IN_COMMAND.test(command)) {
    block(
      "Blocked: this command touches a .env file, which holds secrets. Ask the human instead.",
    );
  }
  process.exit(0);
}

if (!FILE_TOOLS.includes(tool) && tool !== "apply_patch") process.exit(0);

const targets =
  tool === "apply_patch"
    ? patchPaths(command)
    : [
        input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "",
      ].filter(Boolean);

for (const target of targets) {
  const rel = repoPath(target, root, cwd);
  if (SECRET_PATH.test(rel ?? target)) {
    block(
      `Blocked: ${target} is a protected .env file, which holds secrets. Ask the human instead.`,
    );
  }
  if (
    rel !== null &&
    WRITE_TOOLS.includes(tool) &&
    RULE_FILES.some((rule) => rule.test(rel))
  ) {
    block(
      `Blocked: ${rel} is a rule file (instructions, hooks, CI, checks or their config; ADR 0002). ` +
        `Agents read it; people change it. Stop and ask the human, naming the file and the change you'd make.`,
    );
  }
}
process.exit(0);
