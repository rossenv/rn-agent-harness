---
status: accepted (2026-11-25), amended (2026-11-25)
---

# Rule files need the owner's review, and only people merge into main

Most pull requests need no review, and an agent may merge them into `develop` or `release/*` once the check passes. There are two exceptions:

1. **A pull request that touches a rule file needs the owner's approval** (CODEOWNERS with code-owner review). The edit hooks keep agents' file tools away from rule files, but an agent's shell can still write them. This review is the backstop that catches it.
2. **Only people merge into `main`.** A merge into `main` is a release or a hotfix, and it creates a tag.

## Agents use the teammate's GitHub login

An agent runs `git` and `gh` with the login of the teammate who started it. GitHub therefore sees the agent as that teammate, and a ruleset can't tell the two apart. What enforces each exception depends on that:

| Exception                     | With a team                                               | Working solo                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule-file review              | Rulesets: another teammate, the code owner, must approve. | The agent tools only: you can't approve your own pull request, so you merge with the admin bypass, which an agent signed in as you could use too. |
| Only people merge into `main` | The agent tools only.                                     | The agent tools only.                                                                                                                             |

The agent tools enforce them like this, in both Claude Code and Codex:

- The agent asks the teammate before every `gh pr merge`.
- `gh pr merge --admin`, which skips the ruleset, is denied.

These are rules on shell commands, so they are best-effort: an agent can reach GitHub by other routes, such as `gh api`. Reviewing the pull request before approving a merge is what catches that.

A team that wants GitHub itself to enforce both exceptions gives agents their own GitHub identity, a bot account or a GitHub App token. The bot isn't a code owner and isn't on the ruleset's bypass list, and only people can merge into `main`. `docs/setup.md` describes this option.

## Rule files

- the agent instructions (`AGENTS.md`, `CLAUDE.md`)
- the agent config (`.claude/`, except worktrees; `.codex/`; `.agents/`; `.mcp.json`)
- CI and its checks (`.github/`, the check scripts in `scripts/`)
- the ADRs (`docs/adr/`)
- the lint, format, test and TypeScript config, and `package.json`
- the editor config (`.vscode/`)
- `app.json`

The exact list lives in the protect-files hook. If this ADR and the hook disagree, the hook wins.

`app.json` is protected because a config plugin or a native permission (camera, location) is a product and privacy decision, not a coding detail.

## Considered options

- **Review every pull request.** Rejected: the brief wants work to flow without waiting on reviewers.
- **No required review at all.** Rejected: an agent could then change its own rules through the shell and merge the change.
- **A bot identity for agents, required.** Not required by default: every copy would need an extra account or app before an agent can do anything. It is the recommended option for teams.

## Consequences

- A solo owner can't approve their own pull request. The code-owner review lives in its own ruleset, "Rule-file review", which gives the repository admin a bypass that works only through pull requests. The other branch rules, including the required check, are in a ruleset with no bypass, so the bypass skips only the review. A team can remove the bypass.
- Every merge an agent proposes needs a teammate's yes.
- Adding a native module needs a person to edit `app.json`.
