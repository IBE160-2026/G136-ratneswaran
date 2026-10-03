#!/usr/bin/env bash
# PreToolUse(Bash): refuse git commit/push while on main (AGENTS.md Policy).
cmd=$(jq -r '.tool_input.command // empty')
echo "$cmd" | grep -Eq '\bgit\b.*\b(commit|push)\b' || exit 0
branch=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null)
if [ "$branch" = "main" ] || echo "$cmd" | grep -Eq '\bpush\b.*\bmain\b'; then
  echo "Blocked: no commits or pushes to main. Create a branch (git switch -c feat/...) and open a PR." >&2
  exit 2
fi
exit 0
