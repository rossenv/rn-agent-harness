# How work flows

Status: proposed (2026-11-25). The reasons behind these rules are in `docs/adr/`; the words are defined in `GLOSSARY.md`.

## Branches

| Type     | Name                              | Branch from                           | Merge into               |
| -------- | --------------------------------- | ------------------------------------- | ------------------------ |
| feat     | `feat/<ticket-id>-short-name`     | `develop`                             | `develop`                |
| fix      | `fix/<ticket-id>-short-name`      | `develop`, or the open release branch | where it came from       |
| chore    | `chore/<ticket-id>-short-name`    | `develop`                             | `develop`                |
| refactor | `refactor/<ticket-id>-short-name` | `develop`                             | `develop`                |
| release  | `release/vX.Y.Z`                  | `develop`                             | `main`, in version order |
| hotfix   | `hotfix/<ticket-id>-short-name`   | `main`                                | `main`                   |

After a merge into `main` or a release branch, the change is passed forward through back-merges (see "Passing changes forward").

- The short name uses lowercase letters, digits and hyphens. Example: `feat/ABC-12-add-todo`.
- CI rejects a branch name that doesn't match its type's pattern.
- `main`, `develop` and `release/*` are protected (ADR 0001).

## Passing changes forward

More than one release branch can be open at once. For example, one may be with the client for approval while QA tests the next. The long-lived branches form a chain, from oldest to newest:

```
main → release/v1.4.5 → release/v1.5.0 → develop
```

- When anything merges into a branch in the chain, open a back-merge pull request from that branch into the next one. When that merges, continue until you reach `develop`.
- A fix made on an older release branch therefore reaches every newer release and `develop`. So does a hotfix on `main`.
- Each hop is its own pull request. An agent may merge it once the check passes (ADR 0002).
- A workflow opens the next back-merge pull request automatically. A person or agent steps in only to resolve a conflict.
- Expect a conflict on the version and `CHANGELOG.md` when a hotfix reaches a release branch. Keep the release branch's version, and keep the hotfix's changelog entry under its own version.

Release branches merge into `main` in version order: `v1.4.5` before `v1.5.0`. If a release is dropped, close its branch; its fixes have already been passed forward.

## Commits

Every commit starts with its ticket ID in parentheses:

```
(ABC-12): Add the todo list screen
```

- CI checks every commit in a pull request. GitHub's own merge commits are skipped.
- A release branch's commits use the release ticket's ID.
- Dependency-bot commits use the copy's standing chore ticket.

## Pull requests

- Most pull requests need no review. A pull request that touches a rule file needs the owner's approval (ADR 0002).
- Pull requests merge with a merge commit. Squash and rebase are off.
- An agent may merge into `develop` or `release/*` once the check passes. Only a person merges into `main`.
- Teammates or agents can review any pull request. An AI review comment is advice; the check decides.

## Versions and the changelog

- The version follows [Semantic Versioning](https://semver.org/) and starts at `0.1.0`.
- `package.json` holds the version, and CI fails if `app.json` disagrees.
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- Each feat or fix pull request adds one line under `[Unreleased]`, in the right section, linked to its ticket.
- The release pull request moves the `[Unreleased]` lines under the new version and date.
- When a pull request merges into `main`, CI creates the tag `vX.Y.Z`. Nobody pushes tags by hand.

## Feature, fix, chore or refactor

1. A teammate or agent creates a ticket. Agents can help split a story into tickets and estimate them. Fix Version is set later, at planning.
2. Create the work branch from `develop` (from the release branch for a fix during a release).
3. Do the work, with or without an agent.
4. Open a pull request into the branch it came from. Review it if wanted.
5. Merge once the check passes.

## Release

1. When the release's tickets are done, create `release/vX.Y.Z` from `develop`.
2. QA pulls the release branch and runs the app locally (deployment is out of scope).
3. Fix bugs on `fix/...` branches cut from the release branch, through pull requests back into it.
4. Update `CHANGELOG.md` and the version.
5. A person merges the release branch into `main`, after any older open release. CI tags it.
6. Pass the release forward from `main`, through any newer release branches, to `develop`.

## Hotfix

1. Create a ticket, then `hotfix/<ticket-id>-short-name` from `main`.
2. Fix the bug, raise the patch version and update `CHANGELOG.md`.
3. QA tests the hotfix branch locally and approves it.
4. A person merges it into `main`. CI tags it.
5. Pass the hotfix forward from `main` through each open release branch, oldest first, to `develop`.

## Jira

- Every work branch, commit and pull request names a ticket.
- Agents may read Jira, must ask before any write, and can't delete (ADR 0006).
- Only the admin, PO or PM delete tickets.
- Nobody but the planning meeting sets Fix Version.
