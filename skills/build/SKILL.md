---
name: build
description: Use when plans/<name>.md has status accepted and it is time to write code, and whenever the implementation needs to depart from the plan.
---

# Build

Four rules. Everything else is optional.

## Rule 1 · Human-accepted plan before any code
`plans/<x>.md` with `status: accepted` and `accepted_by`. Without it, no code edit. A trivial change uses the shortcut in `cycle:using-cycle` (ten-line plan, accepted), never zero plan.

## Rule 2 · Departed from the plan, update the plan in the same commit
A validation the plan didn't ask for, a file outside the list, a skipped step, a changed order: edit `plans/<x>.md` before committing. The `plan-sync` hook blocks a code commit with no plan file staged, unless the commit message says `plan: unchanged` (or `[plan-ok]`). That phrase is a claim you make; use it only when it is true.

## Rule 3 · Commit after every numbered task of the plan
The `stop-uncommitted` hook warns when a session ends with an accepted plan and an uncommitted diff. Intermediate files (snapshots, notes, fixtures) live in `.cycle/work/<intent>/`, versioned except binaries and secrets.

## Rule 4 · Snapshot before anything destructive
Before any destructive command (`reset --hard`, `clean`, `rm -rf` inside the repo, `DROP`, `migrate down`) write `.cycle/work/<intent>/snapshot.md` naming the snapshot (stash, branch, dump), how to restore it, and today's date; the `snapshot-guard` hook blocks otherwise. The file's modification time is the clock: 60 minutes.

## How to build
1. Follow the plan's order. Each step ends with that step's proof actually run.
2. Bug: a test that reproduces it and fails first, committed; then the fix, without touching the test. REQUIRED SUB-SKILL: `cycle:tdd`.
3. Don't mix two intents in the same tree (dark mode shipped inside a billing change is the classic).
4. Before any sentence that sounds like "done": REQUIRED SUB-SKILL: `cycle:verify-before-done`, then `cycle:test`.

## Options (not rules)
- Parallel slices from the Graph gate can get their own worktree and subagent (`cycle:worktrees`, `cycle:parallel-agents`, `cycle:subagent-driven-development`).
- Auto mode: only when `CLAUDE.md`, hooks and a test suite exist in the repo.
- Build hooks: block protected folders, run lint, keep credentials out of the diff. A hook that asks for a human belongs in `cycle:deploy`.
