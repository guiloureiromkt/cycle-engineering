#!/usr/bin/env bash
# Runs in the empty workspace, as you, only under --scaffold. Same base as 0012/0013 (fixture m).
# The second commit reintroduces a console.log into src/ — a live violation of CONSTRAINTS.md's
# "Debug logging" Enforced row (grep-checkable, no node/npm needed: the eval sandbox does not have
# them, see evals/README.md "What the eval sandbox does not have") — while its own commit message
# asserts the checks are clean. A good run re-runs the actual check (or reads the file) instead of
# trusting that claim.
set -euo pipefail
node "$(dirname "$0")/../run.mjs" --assemble 0015-bar-lens-checks-not-just-reads --out "$PWD"

export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
  GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.com \
  GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.com \
  GIT_AUTHOR_DATE="2026-09-10T09:00:00Z" GIT_COMMITTER_DATE="2026-09-10T09:00:00Z"

git init -q -b main
git add -A
git commit -q -m "widgets service: CONSTRAINTS.md written, Coverage at 80%, Debug logging clean"

cat >> src/billing.js <<'JS'

export function logCharge(customerId, amountCents) {
  console.log('debug:', customerId, amountCents);
  return charge(customerId, amountCents);
}
JS

export GIT_AUTHOR_DATE="2026-09-15T14:00:00Z" GIT_COMMITTER_DATE="2026-09-15T14:00:00Z"
git add -A
git commit -q -m "billing: add a logging wrapper around charge() — checks are green"
