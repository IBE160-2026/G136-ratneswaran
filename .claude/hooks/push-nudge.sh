#!/usr/bin/env bash
# SessionStart / Stop: remind about unpushed or idle work so history stays steady (sensor criterion 1).
# Usage: push-nudge.sh start|stop
cd "$CLAUDE_PROJECT_DIR" || exit 0
ahead=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || git rev-list --count HEAD --not --remotes 2>/dev/null)
dirty=$(git status --porcelain | wc -l | tr -d ' ')
idle=$(( ( $(date +%s) - $(git log -1 --all --format=%ct) ) / 86400 ))

msg=""
[ "${ahead:-0}" -gt 0 ] && msg+="$ahead commit(s) on $(git branch --show-current) are not pushed. "
[ "$dirty" -gt 0 ] && msg+="$dirty uncommitted file(s). "
[ "$idle" -ge 3 ] && msg+="No commit for $idle days; sensors read steady history, so commit and push small steps. "
[ -z "$msg" ] && exit 0

if [ "$1" = stop ]; then
  [ "${ahead:-0}" -gt 0 ] || exit 0   # only nag at turn end when something is ready to push
  jq -n --arg m "Push reminder: $msg" '{systemMessage: $m}'
else
  echo "Git status at session start: ${msg% } Suggest committing and pushing early in this session (AGENTS.md › Traceability)."
fi
