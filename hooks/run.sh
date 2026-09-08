#!/bin/sh
# cycle-engineering · usage: run.sh <hook.mjs> — stdin is forwarded to node.
# Fails loud without hanging when node is missing (the Claude Code installer does not guarantee Node on PATH).
# Only shell builtins run before the node check, so a broken PATH still produces the message below.
case "$0" in */*) dir=${0%/*} ;; *) dir=. ;; esac
if ! command -v node >/dev/null 2>&1; then
  echo "cycle-engineering: node not found on PATH. The cycle gates are NOT active. Install Node >= 18 and restart the session." >&2
  # `claude -p` does not surface a non-blocking hook's stderr, so the message above can go unseen.
  # Leave a marker; session-start.mjs reports it (and removes it) on the first session where node is back.
  # Still builtins only: `[` and `echo` with a redirection.
  root=${CLAUDE_PROJECT_DIR:-$PWD}
  if [ -d "$root/.cycle/work" ]; then
    echo "node was not found on PATH in a session; the cycle gates were NOT active (written by hooks/run.sh)." > "$root/.cycle/work/GATES-INACTIVE.md" 2>/dev/null
  fi
  exit 1
fi
exec node "$dir/$1"
