---
status: accepted (2026-11-25)
---

# Gitflow with merge commits, and CI creates the tags

We use Gitflow. `main`, `develop` and `release/*` are protected: each needs a pull request and a passing check, and none can be force-pushed or deleted. `develop` is the default branch, so pull requests and agents target it unless told otherwise. Pull requests merge with merge commits only; squash and rebase are turned off. When a pull request merges into `main`, CI creates the tag `vX.Y.Z` from the version in `package.json`. A ruleset protects `v*` tags, so no person or agent pushes tags by hand.

Merge commits keep each ticket's commits in the history, and every one of those commits names its ticket (see `docs/process.md`). Teams new to Gitflow often expect squash merges, so this choice is written down here.

## Consequences

- Every commit on a work branch reaches `develop` as it is, so each one needs a ticket ID. CI checks this.
- Several release branches may be open at once, for example one waiting for client approval while QA tests the next.
- Changes pass forward along a chain in version order: `main` → each open release branch, oldest first → `develop`. Each hop is a back-merge pull request of its own, because every branch in the chain is protected. A workflow opens each one automatically.
- Because pull requests merge with merge commits, a change that reaches a branch by two routes isn't applied twice.
- Release branches merge into `main` in version order, so tags never point backwards in history.
