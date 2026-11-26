// Checks the git naming rules from docs/process.md. CI runs it in the `check` job.
//
//   node scripts/check-git-rules.ts branch <branch-name>
//   node scripts/check-git-rules.ts commits <base-sha> <head-sha>
//   node scripts/check-git-rules.ts versions
//
// Exits 1 and prints each problem when a rule is broken.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  checkBranchName,
  checkCommits,
  checkVersions,
  type Commit,
} from "./git-rules.ts";

const FIELD = "\x1f";

function commitsBetween(base: string, head: string): Commit[] {
  const log = execFileSync(
    "git",
    ["log", `--format=%H${FIELD}%P${FIELD}%s`, `${base}..${head}`],
    {
      encoding: "utf8",
    },
  );
  return log
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [sha = "", parents = "", subject = ""] = line.split(FIELD);
      return {
        sha,
        parents: parents.split(" ").filter(Boolean).length,
        subject,
      };
    });
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function run(args: string[]): string[] {
  const [command, ...rest] = args;
  switch (command) {
    case "branch":
      if (rest.length !== 1 || !rest[0]) return ["Usage: branch <branch-name>"];
      return checkBranchName(rest[0]);
    case "commits":
      if (rest.length !== 2 || !rest[0] || !rest[1])
        return ["Usage: commits <base-sha> <head-sha>"];
      return checkCommits(commitsBetween(rest[0], rest[1]));
    case "versions": {
      const expo = readJson("app.json").expo as
        Record<string, unknown> | undefined;
      return checkVersions(
        String(readJson("package.json").version),
        String(expo?.version),
      );
    }
    default:
      return [
        "Usage: check-git-rules.ts branch <name> | commits <base> <head> | versions",
      ];
  }
}

const problems = run(process.argv.slice(2));
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
