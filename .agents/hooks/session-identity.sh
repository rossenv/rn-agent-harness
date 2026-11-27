#!/bin/sh
# Claude Code SessionStart hook: makes every later Bash command source .agents/github-identity.sh,
# and tells the session which GitHub account its commands will use (ADR 0002).
# The env file gets a `.` line, not the token: each command reads the token from the Keychain itself.
[ -n "$CLAUDE_ENV_FILE" ] || exit 0
printf '. "%s/.agents/github-identity.sh"\n' "$CLAUDE_PROJECT_DIR" >> "$CLAUDE_ENV_FILE"

if security find-generic-password -s rn-agent-harness-gh-agent >/dev/null 2>&1; then
  echo "GitHub: your git and gh commands use the agents' account (CodyKnox), not the teammate's."
else
  echo "GitHub: no agent token in the Keychain (rn-agent-harness-gh-agent), so git and gh use the teammate's own login. Tell the teammate before pushing or opening a pull request."
fi
exit 0
