# Build plan

Status: proposed (2026-11-25). This plan turns the create-expo-app scaffold (Expo SDK 58) into the template. It comes from `docs/initial-brief.md` (kept out of git) and the lab's `docs/agent-playbook.md`.

## Decisions

| #   | Decision                                                                                                                                                                                                                                               | Recorded in                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Q1  | Most pull requests need no review. A rule-file change needs the owner's approval.                                                                                                                                                                      | ADR 0002                    |
| Q2  | Protect `main`, `develop` and `release/*`; merge commits only; `develop` is the default branch; protect `v*` tags.                                                                                                                                     | ADR 0001                    |
| Q3  | ESLint with `eslint-config-expo`, not oxlint.                                                                                                                                                                                                          | ADR 0003                    |
| Q4  | `@/` import paths; no `../` imports.                                                                                                                                                                                                                   | ADR 0004                    |
| Q5  | npm (the lockfile already exists).                                                                                                                                                                                                                     | this plan                   |
| Q6  | No EAS; rewrite the generated AGENTS.md.                                                                                                                                                                                                               | ADR 0005                    |
| Q7  | Default exports are banned except in `src/app/**` and config files. There is no `src/index.ts` re-export rule.                                                                                                                                         | this plan                   |
| Q8  | CI checks the ticket-ID prefix on each commit and the branch name.                                                                                                                                                                                     | `docs/process.md`           |
| Q9  | The Gitflow table, back-merges as pull requests, tags created by CI. Changes pass forward along `main` → open release branches (oldest first) → `develop`; releases merge into `main` in version order; a workflow opens each back-merge pull request. | ADR 0001, `docs/process.md` |
| Q10 | Version starts at 0.1.0 and lives in `package.json`; each PR adds a line under `[Unreleased]`.                                                                                                                                                         | `docs/process.md`           |
| Q11 | Agents may read Jira, ask before writes, and can't delete.                                                                                                                                                                                             | ADR 0006                    |
| Q12 | Maestro runs on local release builds; one Android CI job, not required at first.                                                                                                                                                                       | ADR 0005                    |
| Q13 | Folders in `src/` import in one direction.                                                                                                                                                                                                             | ADR 0004                    |
| Q14 | The TODO demo supports add, complete and delete, with a `useReducer` store saved through `expo-sqlite/kv-store`.                                                                                                                                       | this plan                   |
| Q15 | A GitHub template repository, `docs/setup.md`, `scripts/setup-repo.sh`, and a check that fails while placeholders remain.                                                                                                                              | this plan                   |
| Q16 | Remove the on-save `organizeImports` and `sortMembers` actions; the brief stays out of git.                                                                                                                                                            | this plan                   |
| Q17 | Only people merge into `main`. Agents use the teammate's GitHub login, so the agent tools enforce it: ask before `gh pr merge`, deny `--admin`.                                                                                                        | ADR 0002                    |
| Q18 | The rule-file list, including `app.json`.                                                                                                                                                                                                              | ADR 0002                    |
| Q19 | Prettier as its own step; the edit hook formats each edited file.                                                                                                                                                                                      | ADR 0003                    |
| Q20 | Node 26 (active LTS), pinned in `.nvmrc` and `engines`.                                                                                                                                                                                                | this plan                   |

## What comes from the lab

**As-is**

- The seven principles, the rollout tiers, the "Not covered" table and the after-upgrade checks.
- `CLAUDE.md` containing `@AGENTS.md`.
- The AGENTS.md lines that treat outside text as data, with "issue" changed to "ticket".
- The sandbox and the `.env` deny rules.
- The shape of the Codex `hooks.json`.
- `.agents/review/test-review.md`.
- How `protect-files.ts` and `stop-gate.ts` work: block, allow one retry, then tell the person.

**Needs an RN version**

- AGENTS.md content.
- The protected-path list (ADR 0002).
- `lint-edit.ts`: the lab's version skips `.tsx`; it must run ESLint and Prettier instead.
- `stop-gate.ts`: npm, `jest --onlyChanged`, and the layer rules running through ESLint.
- `.oxlintrc.json` becomes `eslint.config.js`.
- `ci.yml`: add triggers for `develop` and `release/**`, plus the branch, commit and version checks.
- `test-review.yml`: compare against `github.base_ref`, not `origin/main`.
- The dependency prompt: cover `npx expo install` and `npm install`.
- The `add-module` skill becomes `add-screen` and `add-component`.
- MCP: Atlassian replaces GitHub issues, and Maestro is added.
- `.vscode`: the ESLint and Prettier extensions instead of Oxc.

**Doesn't apply**

- The fake tracker MCP and `mcp/`.
- The GitHub-issues MCP.
- Vitest.
- The `src/index.ts` re-export rule.
- Banning default exports in routes.
- The `migrations` protection.

## Steps

Each step ends with the check that proves it's done. Nothing here pushes to GitHub or writes to Jira until that step says so.

### A. Make agent work safe (tiers 0 and 1)

1. **ADRs 0001–0006, `docs/process.md`, `GLOSSARY.md`.**
   Check: the owner reads them, changes the status to accepted, and commits them by hand.
2. **Rewrite AGENTS.md; add CLAUDE.md with `@AGENTS.md`.**
   Check: in a new session of each tool, ask "Where does a fix branch from during a release?" and "Do we use EAS?". Both answer as `docs/process.md` and ADR 0005 say.
3. **npm scripts `typecheck`, `lint`, `format:check` and `test`; jest-expo (needs Jest 30) with one smoke test; Prettier; `.nvmrc` and `engines` pinning Node 26.**
   Check: all four scripts pass locally.
4. **`ci.yml` with the `check` job, triggered by pull requests and by pushes to `main`, `develop` and `release/**`.**
   Check: a pull request with a deliberate type error goes red, and its fix goes green.
5. **Branch-name, commit-prefix and version-match scripts in `scripts/`, with unit tests, run by CI.**
   Check: the script tests pass, and a pull request from a branch named `bad-name` fails.
6. **CODEOWNERS; `develop` created and made the default branch; two branch rulesets for `main`, `develop` and `release/*`: "Protected branches" (PR, `check`, merge commits only; no bypass) and "Rule-file review" (code-owner review; admin bypass for pull requests only); a ruleset for `v*` tags.**
   Check:
   - `git push origin main` is rejected.
   - `gh api repos/<owner>/<repo>/rulesets` lists the rulesets.
   - `gh api repos/<owner>/<repo>/codeowners/errors` reports no errors. (GitHub doesn't enforce code-owner review here; ADR 0002 says what does.)
7. **The protect-files hook with the ADR 0002 list, and its tests.**
   Check: the hook tests pass, and an agent asked to edit `AGENTS.md` or `app.json` is blocked as a rule file, in both tools.
8. **The lint-edit hook: ESLint, Prettier and a silencer search on edited `.ts`, `.tsx`, `.js` and `.mts` files.**
   Check: an agent adds `src/tmp.tsx` with an unused variable and wrong formatting, and lint feedback comes back right after the edit, in both tools. Delete the file afterwards. (The import-order rule arrives in step 11.)
9. **The stop gate.**
   Check: ask an agent to add `.skip` to a test and finish. The gate refuses.
10. **Permissions and sandbox in both tools: ask before `npx expo install`, `npm install` and `gh pr merge`, and deny `gh pr merge --admin` and pushing tags (`git push --tags`, `git push origin v*`); the Codex prefix rules; the `.vscode` fix.**
    Check: `npx expo install x` and `gh pr merge` ask first in both tools, `gh pr merge --admin` and `git push --tags` are refused, and saving a file in VS Code keeps the import groups.

### B. The Expo app

11. **Remove the starter code; create the folders from the brief; add the `@/` and `../` import rules.**
    Check: lint fails on a sample file with a `../` import, and on one with badly grouped imports.
12. **The layer rules from ADR 0004.**
    Check: importing `@/store` from `src/utils/` fails lint.
13. **The TODO store, built test-first.**
    Check: Jest tests cover add, complete, delete and loading saved items.
14. **The TODO screens, with `testID`s and `renderRouter` tests.**
    Check: Jest passes, and the app works on the iOS simulator and the Android emulator.
15. **The `add-screen` and `add-component` skills; the test-reviewer agents for both tools.**
    Check: an agent asked to add a screen follows the skill, and the result passes all checks.
16. **`test-review.yml`, comparing against the pull request's base branch.**
    Check: a pull request into `develop` gets a verdict comment.
17. **`CHANGELOG.md` at 0.1.0; versions aligned in `package.json` and `app.json`.**
    Check: CI fails when the two versions disagree.

### C. Jira and Maestro

18. **Atlassian MCP in both tools, with the ADR 0006 limits.** First check how Codex signs in to Atlassian's remote MCP server.
    Check: reading a ticket works, a transition asks first, and a delete is refused.
19. **A `start-ticket` skill and a `finish-ticket` skill.** `start-ticket` reads the ticket and creates the branch, with the right commit prefix. `finish-ticket` opens the pull request with the ticket link and moves the ticket to In Review.
    Check: a dry run on a test ticket produces correct names and asks before each Jira write.
20. **`.maestro/` flows for the TODO app.**
    Check: `maestro test .maestro` passes on a local release build on both platforms.
21. **Maestro MCP in both tools, plus an AGENTS.md line telling agents to run the flows after a UI change.**
    Check: an agent changes a label, runs the flows through MCP and reports the result.
22. **An Android E2E job in CI, not required at first.**
    Check: a green run on a pull request into `develop`.
23. **A back-merge workflow.** After a merge into `main` or a `release/*` branch, it opens a pull request into the next branch in the chain. It reads the version order from the branch names, and it leaves a conflict for a person or agent to resolve.
    Check: with `release/v0.1.0` and `release/v0.2.0` open, a merge into `main` opens a pull request into `release/v0.1.0`. When that merges, the next pull request goes into `release/v0.2.0`, then into `develop`.
24. **A release and hotfix dry run, with two release branches open.**
    Check:
    - The `v0.1.0` tag exists.
    - A fix made on `release/v0.1.0` reaches `release/v0.2.0` and `develop` through the workflow's pull requests.
    - `develop` contains `main`.
    - `CHANGELOG.md` is right.
25. **The RN playbook, `docs/setup.md` (including the agents' GitHub account from ADR 0002: the account, its repo invite, the token in the Keychain, and `.agents/codex.sh` for Codex), `scripts/setup-repo.sh`, the placeholder check, and turning the repo into a template.**
    Check: a teammate creates a copy by following `docs/setup.md`, and every check in it passes.
