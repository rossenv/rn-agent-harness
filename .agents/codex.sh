#!/bin/sh
# Starts Codex with the agents' GitHub account (ADR 0002). Use it instead of `codex`:
#   .agents/codex.sh [codex arguments]
# Codex hooks can't set environment variables, so the launcher does it before Codex starts.
. "$(dirname "$0")/github-identity.sh"
if [ -z "$GH_TOKEN" ]; then
  echo "No agent token in the Keychain (rn-agent-harness-gh-agent): Codex will use your own GitHub login." >&2
fi
exec codex "$@"
