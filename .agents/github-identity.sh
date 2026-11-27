# Sourced, not run. Gives an agent's shell commands the agents' GitHub account (ADR 0002),
# so GitHub can tell agent work from yours. Your own terminal keeps your login.
#
# Claude Code sources it before every Bash command (the SessionStart hook in .claude/settings.json).
# Codex gets it from .agents/codex.sh, which sources it and then starts codex.
#
# The token lives in your macOS Keychain, never in a file:
#   security add-generic-password -a "$USER" -s rn-agent-harness-gh-agent -w
# Without that Keychain item this file changes nothing, and agents use your own login.

__agent_token="$(security find-generic-password -s rn-agent-harness-gh-agent -w 2>/dev/null)"
if [ -n "$__agent_token" ]; then
  # gh reads GH_TOKEN before its own stored login.
  export GH_TOKEN="$__agent_token"
  # git: clear the credential helpers from every other config (macOS keychain = your login),
  # then ask gh, which answers with GH_TOKEN.
  export GIT_CONFIG_COUNT=2
  export GIT_CONFIG_KEY_0=credential.helper
  export GIT_CONFIG_VALUE_0=
  export GIT_CONFIG_KEY_1=credential.https://github.com.helper
  export GIT_CONFIG_VALUE_1='!gh auth git-credential'
  # Commits name the agents' account, with its private no-reply address.
  export GIT_AUTHOR_NAME=CodyKnox
  export GIT_AUTHOR_EMAIL=361872766+CodyKnox@users.noreply.github.com
  export GIT_COMMITTER_NAME=CodyKnox
  export GIT_COMMITTER_EMAIL=361872766+CodyKnox@users.noreply.github.com
fi
unset __agent_token
