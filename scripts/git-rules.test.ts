import { checkBranchName, checkCommits, checkVersions } from "./git-rules";

describe("checkBranchName", () => {
  it.each([
    "feat/ABC-12-add-todo",
    "fix/RNAH-9-tab-bar-inset",
    "chore/RNAH-9-harness-setup",
    "refactor/AB2-1-split-store",
    "hotfix/ABC-7-crash-on-start",
    "release/v1.4.0",
    "release/v0.10.12",
    "main",
  ])("accepts %s", (name) => {
    expect(checkBranchName(name)).toEqual([]);
  });

  it.each([
    ["bad-name", "no type prefix"],
    ["feature/ABC-12-add-todo", "unknown type"],
    ["feat/add-todo", "no ticket ID"],
    ["feat/abc-12-add-todo", "lowercase ticket key"],
    ["feat/ABC-12", "no short name"],
    ["feat/ABC-12-Add-Todo", "uppercase short name"],
    ["feat/ABC-12-add_todo", "underscore in short name"],
    ["feat/ABC-12-add-todo-", "trailing hyphen"],
    ["release/1.4.0", "release without v"],
    ["release/v1.4", "release without patch"],
    ["release/RNAH-9-v1.4.0", "release with a ticket ID"],
    ["develop", "develop is never a pull request head"],
  ])("rejects %s (%s)", (name) => {
    const problems = checkBranchName(name);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(name);
  });
});

describe("checkCommits", () => {
  const commit = (subject: string, parents = 1) => ({
    sha: `sha-${subject.length}-${parents}`,
    parents,
    subject,
  });

  it("accepts commits that start with their ticket ID", () => {
    expect(
      checkCommits([
        commit("(RNAH-9): Add the CI check job"),
        commit("(ABC-12): Add the todo list screen"),
      ]),
    ).toEqual([]);
  });

  it("skips merge commits, which GitHub writes", () => {
    expect(
      checkCommits([
        commit(
          "Merge pull request #1 from rossenv/chore/RNAH-9-harness-setup",
          2,
        ),
      ]),
    ).toEqual([]);
  });

  it.each([
    ["Add the CI check job", "no ticket ID"],
    ["RNAH-9: Add the CI check job", "no parentheses"],
    ["(RNAH-9) Add the CI check job", "no colon"],
    ["(RNAH-9):Add the CI check job", "no space after the colon"],
    ["(rnah-9): Add the CI check job", "lowercase key"],
    ["(RNAH-9): ", "no summary"],
  ])("rejects %j (%s)", (subject) => {
    const problems = checkCommits([commit(subject)]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(subject.trim());
  });

  it("reports each bad commit", () => {
    expect(
      checkCommits([commit("one"), commit("(ABC-1): ok"), commit("three")]),
    ).toHaveLength(2);
  });
});

describe("checkVersions", () => {
  it("accepts matching versions", () => {
    expect(checkVersions("0.1.0", "0.1.0")).toEqual([]);
  });

  it("rejects versions that differ", () => {
    const problems = checkVersions("0.2.0", "0.1.0");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("0.2.0");
    expect(problems[0]).toContain("0.1.0");
  });

  it.each(["1.0", "v1.0.0", "1.0.0-", ""])(
    "rejects a package.json version that isn't semver: %j",
    (version) => {
      expect(checkVersions(version, version)).toHaveLength(1);
    },
  );

  it("accepts a prerelease version", () => {
    expect(checkVersions("1.0.0-rc.1", "1.0.0-rc.1")).toEqual([]);
  });
});
