#!/usr/bin/env bash
# PreToolUse(Bash|Edit|Write|MultiEdit|NotebookEdit): enforce AGENTS.md Policy and Traceability for Claude.
input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
branch=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null)
block() { echo "Blocked: $1" >&2; exit 2; }

if [ "$tool" != Bash ]; then
  path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
  case $path in
    */src/types/database.ts) block "never hand-edit database.ts; regenerate it with 'supabase gen types'." ;;
    */_bmad/*) block "never edit _bmad/ (AGENTS.md Policy)." ;;
    */_bmad-output/planning-artifacts/*)
      [[ $branch =~ ^(feat|fix)/[0-9]+\.[0-9]+- ]] \
        && block "planning documents are read-only on a story branch; propose bmad-correct-course instead." ;;
  esac
  exit 0
fi

cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
grep -Eq '\bgh\b.*\bpr\b.*\bmerge\b' <<<"$cmd" && block "the owner merges every PR; never merge yourself."
# ponytail: catches --no-verify only, not the short 'commit -n'; CI re-checks every commit message anyway.
grep -Eq -- '\bgit\b.*\b(commit|push)\b.*--no-verify' <<<"$cmd" && block "never skip git hooks (--no-verify)."
grep -Eq '\bgit\b.*\b(commit|push)\b' <<<"$cmd" || exit 0
if [ "$branch" = main ] || grep -Eq '\bgit\b[^|;&]*\bpush\b[^|;&]*\bmain\b' <<<"$cmd"; then
  block "no commits or pushes to main. Create a branch (git switch -c feat/<story-id>-<slug>) and open a PR."
fi
if grep -Eq '\bgit\b.*\bcommit\b' <<<"$cmd" && ! grep -Eq '\-\-amend|--no-edit' <<<"$cmd"; then
  # ponytail: reads the trailer from the command text, so 'commit -F <file>' must use a heredoc (-F -).
  grep -q 'Co-Authored-By:' <<<"$cmd" || block "every commit you author keeps the Co-Authored-By trailer (AGENTS.md Policy)."
fi
exit 0
