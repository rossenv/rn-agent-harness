---
status: accepted (2026-11-25)
---

# Rule files need the owner's review, and only people merge into main

Most pull requests need no review, and an agent may merge them into `develop` or `release/*` once the check passes. Two exceptions are enforced by rulesets, not by advice:

1. **A pull request that touches a rule file needs the owner's approval** (CODEOWNERS with code-owner review). The edit hooks keep agents' file tools away from rule files, but an agent's shell can still write them. This review is the backstop that catches it.
2. **Only people merge into `main`.** A merge into `main` is a release or a hotfix, and it creates a tag.

The rule files are:

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

## Consequences

- A solo owner can't approve their own pull request. The ruleset gives the repository admin a bypass that works only through pull requests. A team can remove that bypass.
- Adding a native module needs a person to edit `app.json`.
