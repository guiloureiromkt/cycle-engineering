#!/usr/bin/env bash
# Runs in the empty workspace, as you, only under --scaffold. Same base as 0012 (fixture m, a
# clean baseline CONSTRAINTS.md), but the second commit only touches README.md — nothing in
# CONSTRAINTS.md's Floor or Enforced scope, and CONSTRAINTS.md itself is untouched.
set -euo pipefail
node "$(dirname "$0")/../run.mjs" --assemble 0013-bar-lens-silent-on-unrelated-diff --out "$PWD"

export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
  GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.com \
  GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.com \
  GIT_AUTHOR_DATE="2026-09-10T09:00:00Z" GIT_COMMITTER_DATE="2026-09-10T09:00:00Z"

git init -q -b main
git add -A
git commit -q -m "widgets service: CONSTRAINTS.md written, Coverage at 80%, Debug logging clean"

cat > README.md <<'MD'
# widgets-service

## Local development
Run `npm test` before pushing.
MD

export GIT_AUTHOR_DATE="2026-09-15T14:00:00Z" GIT_COMMITTER_DATE="2026-09-15T14:00:00Z"
git add -A
git commit -q -m "docs: note the test command in the README"
