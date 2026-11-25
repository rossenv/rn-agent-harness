# React Native Agent Harness

A starter template that teams copy for new React Native apps. Claude Code and Codex do real work in it, under rules that people own.

## Language

### People and agents

**Teammate**:
A person on the team: PM, PO, QA, designer or developer.
_Avoid_: user, member

**Agent**:
Claude Code or Codex, working in this repo for a teammate.
_Avoid_: AI, bot, assistant

**Owner**:
The teammate who approves changes to rule files and merges releases into `main`.
_Avoid_: admin, maintainer

### Rules

**Harness**:
The rule files that shape what agents do, together with the checks that back them up.
_Avoid_: setup, config

**Rule file**:
A file that agents may read but only people may change, because it sets the rules agents work under.
_Avoid_: config file, protected file

**Check**:
The CI job that every pull request must pass before it can merge.
_Avoid_: build, pipeline, tests

**Copy**:
A new app repository created from this template.
_Avoid_: fork, clone, instance

### Tickets

**Ticket**:
A Jira work item.
_Avoid_: issue, task (except when naming a Jira issue type)

**Ticket ID**:
The Jira key of a ticket, such as `ABC-12`.
_Avoid_: task id, Jira id

**Fix Version**:
The release a ticket is planned for. It is set at planning.
_Avoid_: target version, milestone

### Branches and releases

**Work branch**:
A `feat`, `fix`, `chore` or `refactor` branch for one ticket.
_Avoid_: feature branch (when meaning any type)

**Release branch**:
A branch cut from `develop` to prepare one version for QA and release.

**Hotfix**:
An urgent fix to the released version, branched from `main`.
_Avoid_: patch, emergency fix

**Back-merge**:
A pull request that passes changes forward to the next branch in the chain: from `main` to the oldest open release branch, from one release branch to the next, and from the newest one to `develop`.
_Avoid_: sync, down-merge

**Release**:
A version merged into `main` and tagged.
_Avoid_: deploy, ship (deployment is out of scope)

**Version**:
The app's semantic version number, such as `0.1.0`.
_Avoid_: build number
