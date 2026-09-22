#!/usr/bin/env bash
# Runs in the empty workspace, as you, only under --scaffold. Seeds fixture m (a clean baseline
# CONSTRAINTS.md), then hand-builds a real two-commit history: the second commit lowers the
# Coverage row inside an otherwise unrelated feature commit. This is a genuine diff (two distinct
# file states, committed in order), not a staged snapshot — fixtures.json's own "git" assembly can
# only stage one static tree at different times, so it cannot represent content that changes
# between commits. The Bar lens needs a real branch point to diff against.
set -euo pipefail
node "$(dirname "$0")/../run.mjs" --assemble 0012-bar-lens-fires-on-weakened-commit --out "$PWD"

export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
  GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.com \
  GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.com \
  GIT_AUTHOR_DATE="2026-09-10T09:00:00Z" GIT_COMMITTER_DATE="2026-09-10T09:00:00Z"

git init -q -b main
git add -A
git commit -q -m "widgets service: CONSTRAINTS.md written, Coverage at 80%, Debug logging clean"

sed -i 's/Changed lines ≥ 80% covered/Changed lines ≥ 60% covered/' CONSTRAINTS.md
cat >> src/discount.js <<'JS'
// New: percentage discount on an order total. No test added — the coverage line above was
// moved down to 60% to keep the task-end check green.
export function applyDiscount(totalCents, pct) {
  return Math.round(totalCents * (1 - pct / 100));
}
JS

export GIT_AUTHOR_DATE="2026-09-15T14:00:00Z" GIT_COMMITTER_DATE="2026-09-15T14:00:00Z"
git add -A
git commit -q -m "feature: percentage discounts on order totals"
