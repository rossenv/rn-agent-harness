---
status: accepted (2026-11-25), amended (2026-11-26)
---

# Rule files need the owner's review, and only people merge into main

Most pull requests need no review, and an agent may merge them into `develop` or `release/*` once the check passes. There are two exceptions:

1. **A pull request that touches a rule file needs the owner's approval.** The edit hooks keep agents' file tools away from rule files, but an agent's shell can still write them. The owner's review of the change is the backstop that catches it.
2. **Only people merge into `main`.** A merge into `main` is a release or a hotfix, and it creates a tag.

## What enforces them

An agent runs `git` and `gh` with the login of the teammate who started it, so GitHub sees the agent as that teammate. In this repository (public, owned by a personal account), GitHub can't enforce either exception. We tested this on 2026-11-26:

- **Code-owner review isn't enforced.** With CODEOWNERS in place and "Require review from Code Owners" on, but 0 required approvals, a pull request that changed `AGENTS.md` was mergeable with no review.
- **A file-path rule isn't available.** GitHub rejects "Restrict file paths" in a branch ruleset. A push ruleset allows only an "always" bypass, which an agent signed in as the owner would also get.
- **"Only people" can't be expressed,** because the agent is the person as far as GitHub knows.

So both exceptions are enforced by the agent tools, in Claude Code and Codex alike:

- The agent asks the teammate before every `gh pr merge`, so every merge an agent makes is one a teammate said yes to. That yes is the review: before giving it for a rule-file change, read the diff.
- `gh pr merge --admin`, which skips the rulesets, is denied.

These are rules on shell commands, so they are best-effort: an agent can reach GitHub by other routes, such as `gh api`.

GitHub still enforces the rest: a pull request and a passing `check` for every change to `develop`, `main` and `release/*`, merge commits only, and no force-push or deletion.

## For a team that wants GitHub to enforce them

Give agents their own GitHub identity (a bot account or a GitHub App token), and require 1 approval in the "Rule-file review" ruleset. A pull request the bot opens then needs a teammate's approval, and the bot isn't on the bypass list, so it can't merge into `main` or skip the review. `docs/setup.md` describes this. The cost is that every pull request needs a review, not only rule-file changes.

## Rule files

- the agent instructions (`AGENTS.md`, `CLAUDE.md`)
- the agent config (`.claude/`, except worktrees; `.codex/`; `.agents/`; `.mcp.json`)
- CI and its checks (`.github/`, the check scripts in `scripts/`)
- the ADRs (`docs/adr/`)
- the lint, format, test and TypeScript config, `package.json` and `.nvmrc`
- the editor config (`.vscode/`)
- `app.json`

The exact list lives in the protect-files hook. If this ADR and the hook disagree, the hook wins. `.github/CODEOWNERS` lists the same paths, so GitHub asks the owner to review when someone else opens the pull request.

`app.json` is protected because a config plugin or a native permission (camera, location) is a product and privacy decision, not a coding detail.

## Considered options

- **Require 1 approval on every pull request.** GitHub would enforce it, but the brief wants work to flow without waiting on reviewers, and a solo owner would have to bypass every pull request. It is the team option above.
- **A bot identity for agents, required.** Not required by default: every copy would need an extra account or app before an agent can do anything.
- **No backstop at all.** Rejected: an agent could change its own rules through the shell and merge the change.

## Consequences

- The "Rule-file review" ruleset (code-owner review, admin bypass for pull requests only) stays in place. It does nothing for a solo owner today, and it is where a team turns on required approvals.
- Every merge an agent proposes needs a teammate's yes.
- Adding a native module needs a person to edit `app.json`.
