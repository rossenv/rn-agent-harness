---
status: accepted (2026-11-25), amended (2026-11-27)
---

# Rule files need the owner's review, and only people merge into main

Most pull requests need no review, and an agent may merge them into `develop` or `release/*` once the check passes. There are two exceptions:

1. **A pull request that touches a rule file needs the owner's approval.** The edit hooks keep agents' file tools away from rule files, but an agent's shell can still write them. The owner's review of the change is the backstop that catches it.
2. **Only people merge into `main`.** A merge into `main` is a release or a hotfix, and it creates a tag.

## Agents have their own GitHub account

Agents push, open pull requests and merge as the agents' GitHub account (`CodyKnox` here), a collaborator with Write access, not admin. Its token is a classic token with only the `repo` scope, kept in the macOS Keychain as `rn-agent-harness-gh-agent`. `.agents/github-identity.sh` hands it to `gh` and `git` for agent shell commands only:

- **Claude Code:** a SessionStart hook in `.claude/settings.json` makes every Bash command load it.
- **Codex:** start it with `.agents/codex.sh`, which loads it and then runs `codex`. Codex hooks can't set environment variables.

Your own terminal keeps your login. Commits made by agents name `CodyKnox` as author. Because GitHub now sees two people, it can enforce both exceptions:

| Exception                     | What enforces it                                                                                                                       | Tested                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Rule-file review              | CODEOWNERS and the "Rule-file review" ruleset (code-owner review, 0 required approvals).                                               | 2026-11-27: a pull request by `CodyKnox` that changed `AGENTS.md` asked `rossenv` for review and stayed blocked after `check` passed. |
| Only people merge into `main` | The "Main: people merge (admin only)" ruleset restricts updates to the admin role, through pull requests only. `CodyKnox` isn't admin. | Rule confirmed on `main`; not tried with a merge, which would risk `main`.                                                            |
| Agents can't skip rules       | `CodyKnox` is on no bypass list, so `gh pr merge --admin` fails for it.                                                                | Follows from its role.                                                                                                                |

Your own rule-file pull requests don't wait for review: GitHub doesn't ask an author to review their own change (tested 2026-11-26). That is fine, because the exception is about agents.

## What the account doesn't cover

- **The agent can still reach your login.** It runs on your machine, where your own `gh` and git credentials are stored. The account guards against mistakes and prompt injection, not an agent that sets out to switch back. The agent tools stay as a second layer: ask before every `gh pr merge`, and deny `gh pr merge --admin` and pushing tags.
- **Without the Keychain item,** for example a teammate who hasn't set it up, agents use that teammate's login and only the agent tools apply. The SessionStart hook says so at the start of each Claude session.
- **Codex started as plain `codex`** uses your login.

## Rule files

- the agent instructions (`AGENTS.md`, `CLAUDE.md`)
- the agent config (`.claude/`, except worktrees; `.codex/`; `.agents/`; `.mcp.json`)
- CI and its checks (`.github/`, the check scripts in `scripts/`)
- the ADRs (`docs/adr/`)
- the lint, format, test and TypeScript config, `package.json` and `.nvmrc`
- the editor config (`.vscode/`)
- `app.json`

The exact list lives in the protect-files hook. If this ADR and the hook disagree, the hook wins. `.github/CODEOWNERS` lists the same paths.

`app.json` is protected because a config plugin or a native permission (camera, location) is a product and privacy decision, not a coding detail.

## Considered options

- **Agents use the teammate's login, and the agent tools enforce everything.** Our first setup. GitHub can't tell agent from teammate then, so code-owner review isn't enforced (tested 2026-11-26) and "only people merge into `main`" can't be expressed.
- **A file-path rule for the rule files.** GitHub rejects "Restrict file paths" in a branch ruleset, and a push ruleset allows only an "always" bypass.
- **Require 1 approval on every pull request.** Enforced, but the brief wants work to flow without waiting on reviewers.
- **A GitHub App instead of an account.** Narrower, hour-long tokens, but it needs a private key and a script to mint tokens. A fine-grained token isn't an option either: GitHub doesn't allow one for a collaborator on a repository owned by a personal account.

## Consequences

- Each copy of the template needs its own agents' account, invited with Write, and a token in each teammate's Keychain. `docs/setup.md` describes it. GitHub allows one machine account per person.
- The token has no `workflow` scope, so GitHub refuses any agent push that changes `.github/workflows/`.
- A rule-file pull request from an agent waits for a code owner's approval.
- Adding a native module needs a person to edit `app.json`.
