---
status: accepted (2026-11-25)
---

# No EAS; Maestro runs on local release builds

The template doesn't use EAS: deployment is out of scope, and copies shouldn't need an Expo account. Expo's Maestro docs assume EAS builds, so we build locally instead:

- Android: `npx expo run:android --variant release`
- iOS: `npx expo run:ios --configuration Release`

A release build includes the JavaScript bundle, so Maestro flows run without Metro.

In CI, one Android-emulator job on Ubuntu runs the flows for pull requests into `develop` and `release/*`. It is not a required check until it has proved stable. iOS flows run only on teammates' Macs, because macOS runners are slower and harder to keep stable.

## Considered options

- **Expo's own E2E framework**, now in Expo's docs. Rejected for now: the brief names Maestro, and Maestro has an MCP server that agents can drive.
- **Expo Go.** Rejected: it ships only Expo's built-in native modules, so it doesn't match what users run.

## Consequences

- An iOS-only regression isn't caught in CI.
- AGENTS.md must not send agents to EAS commands, even though Expo's docs often do.
