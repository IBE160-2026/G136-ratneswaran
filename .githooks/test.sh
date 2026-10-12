#!/usr/bin/env bash
# Self-check for the git and Claude hooks. Run: .githooks/test.sh
cd "$(dirname "$0")/.." || exit 1
pass=0; bad=0
check() { # check <expected exit code> <description> <command...>
  want=$1 desc=$2; shift 2
  "$@" >/dev/null 2>&1; got=$?
  if [ "$got" = "$want" ]; then pass=$((pass+1)); else bad=$((bad+1)); echo "FAIL: $desc (want $want, got $got)"; fi
}
msg() { f=$(mktemp); printf '%s\n' "$1" > "$f"; .githooks/commit-msg "$f" "$2"; }
check 0 "story commit ok"            msg "4.3: add status change with optimistic update" feat/4.3-task-status
check 1 "story commit wrong id"      msg "4.4: add status change with optimistic update" feat/4.3-task-status
check 1 "story commit no id"         msg "docs: add status change with optimistic update" feat/4.3-task-status
check 0 "plan commit ok"             msg "plan: add Epic 6 stories for the AI assistant" plan/epic-6
check 1 "vague message"              msg "PRD3" plan/epic-6
check 1 "too short after prefix"     msg "plan: UX 0.2" plan/epic-6
check 0 "merge commit"               msg "Merge branch 'main' into plan/epic-6" plan/epic-6

push() { printf 'refs/heads/%s x refs/heads/%s y\n' "$1" "$2" | .githooks/pre-push; }
check 0 "push story branch"          push feat/4.3-task-status feat/4.3-task-status
check 0 "push chore branch"          push chore/process-hooks chore/process-hooks
check 1 "push to main"               push feat/4.3-task-status main
check 1 "push bad branch name"       push my-stuff my-stuff
check 1 "push feat without id"       push feat/new-thing feat/new-thing

guard() { CLAUDE_PROJECT_DIR=$PWD .claude/hooks/git-guard.sh <<<"$1"; }
bash_in() { jq -n --arg c "$1" '{tool_name:"Bash",tool_input:{command:$c}}'; }
merge_cmd="gh pr $(printf 'mer%s' ge) 3 --squash"   # built at runtime so this file's own commands never trip the guard
check 2 "claude merges PR"           guard "$(bash_in "$merge_cmd")"
check 2 "claude skips hooks"         guard "$(bash_in "git commit --no-$(printf ver)ify -m x")"
check 2 "commit without trailer"     guard "$(bash_in 'git commit -m "chore: tidy up the hook test file"')"
check 0 "commit with trailer"        guard "$(bash_in $'git commit -m "chore: tidy up the hook test file\n\nCo-Authored-By: Claude <noreply@anthropic.com>"')"
check 0 "flag only mentioned in text" guard "$(bash_in "echo 'never use --no-$(printf ver)ify' >> AGENTS.md")"
check 2 "claude pushes main"         guard "$(bash_in 'git push origin main')"
check 0 "main only in message text"  guard "$(bash_in $'git commit -F - <<X\nchore: hooks say never push main\n\nCo-Authored-By: C <n@a.com>\nX')"
check 0 "non-git command"        guard "$(bash_in 'ls -la')"
check 2 "edit database.ts"           guard '{"tool_name":"Edit","tool_input":{"file_path":"/x/src/types/database.ts"}}'
check 2 "edit _bmad"                 guard '{"tool_name":"Write","tool_input":{"file_path":"/x/_bmad/config.toml"}}'
check 0 "edit normal file"           guard '{"tool_name":"Edit","tool_input":{"file_path":"/x/src/app/page.tsx"}}'
echo "$pass passed, $bad failed"; [ "$bad" -eq 0 ]
