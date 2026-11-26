// The git naming rules from docs/process.md, as pure functions.
// Each returns a list of problems; an empty list means the input follows the rules.
// The CLI that feeds them real git data is scripts/check-git-rules.ts.

const TICKET_ID = "[A-Z][A-Z0-9]+-[0-9]+";
const SHORT_NAME = "[a-z0-9]+(?:-[a-z0-9]+)*";

const BRANCH_PATTERNS: RegExp[] = [
  new RegExp(`^(?:feat|fix|chore|refactor|hotfix)/${TICKET_ID}-${SHORT_NAME}$`),
  /^release\/v[0-9]+\.[0-9]+\.[0-9]+$/,
  // A back-merge pull request starts from main (docs/process.md, "Passing changes forward").
  /^main$/,
];

const COMMIT_SUBJECT = new RegExp(`^\\(${TICKET_ID}\\): \\S`);

const SEMVER =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export type Commit = { sha: string; parents: number; subject: string };

export function checkBranchName(name: string): string[] {
  if (BRANCH_PATTERNS.some((pattern) => pattern.test(name))) return [];
  return [
    `Branch "${name}" doesn't follow docs/process.md. Use <type>/<ticket-id>-short-name ` +
      `(type: feat, fix, chore, refactor or hotfix; for example feat/ABC-12-add-todo), or release/vX.Y.Z.`,
  ];
}

export function checkCommits(commits: Commit[]): string[] {
  return commits
    .filter((commit) => commit.parents < 2) // merge commits are written by GitHub
    .filter((commit) => !COMMIT_SUBJECT.test(commit.subject))
    .map(
      (commit) =>
        `Commit ${commit.sha.slice(0, 7)} "${commit.subject.trim()}" doesn't start with its ticket ID, ` +
        `like "(ABC-12): Add the todo list screen".`,
    );
}

export function checkVersions(
  packageVersion: string,
  appVersion: string,
): string[] {
  if (!SEMVER.test(packageVersion)) {
    return [
      `package.json version "${packageVersion}" isn't a semantic version like 1.4.0.`,
    ];
  }
  if (packageVersion !== appVersion) {
    return [
      `package.json version "${packageVersion}" and app.json expo.version "${appVersion}" differ. ` +
        `package.json holds the version; set app.json to match.`,
    ];
  }
  return [];
}
