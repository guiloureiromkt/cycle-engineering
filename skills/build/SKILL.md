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

## Running a plan to the end
The accepted plan authorizes every reversible step it lists; the owner's word was given at acceptance and at deploy, and between those two gates the work is yours. Execute with `cycle:executing-plans` (or `cycle:subagent-driven-development` when the graph has parallel slices): no check-ins between tasks, decisions ledgered as rulings, one `Task <id>: complete` line per task in `.cycle/work/<plan>/run.md`, and resume from that ledger, never from memory. Stop only for the reasons those skills list — theirs and the cycle's two (a departure that touches a gate trigger the plan did not name; the owner's budget) — or for input only the owner can give.

- **Verification:** the verifier in a separate context at every task that touches a gate trigger, at the end, and every N tasks when the plan says `Verify every: N`.
- **Progress claims** point at a tool result from this session; what is not verified is said to be unverified.
- **Unattended** only when the owner says so ("roda sem mim", "run it unattended"): write the ledger header those skills describe, with the owner's sentence verbatim, then print this once, for an owner who wants the host to keep the session going until it is done:
- **Unattended runs export `CYCLE_UNATTENDED=1`** (belt); the gates also read the host's `permission_mode` (braces). A gate that would ask with nobody present denies instead, and the ledger records the stop with the gate's reason.

  ```
  /goal every task id on the tasks: line of .cycle/work/<plan>/run.md has a "Task <id>: complete" line, or the ledger's last line starts with "Stopped:" — shown by printing the ledger in the final message
  ```

  In a headless run the same condition goes after `claude -p "/goal …"`. `/goal` belongs to the session and stops by the host's own rules; nothing in this plugin keeps a session running.
- **The final message is a re-grounding** for someone who did not watch: the outcome first; what stopped it, if anything, and the one thing needed from the owner; the rulings made on their behalf and the deferred minors; the ledger printed.

## How to build
1. Follow the plan's order. Each step ends with that step's proof actually run.
2. Bug: a test that reproduces it and fails first, committed; then the fix, without touching the test. REQUIRED SUB-SKILL: `cycle:tdd`.
3. Don't mix two intents in the same tree (dark mode shipped inside a billing change is the classic).
4. Before any sentence that sounds like "done": REQUIRED SUB-SKILL: `cycle:verify-before-done`, then `cycle:test`.
5. Report progress to the owner in this repo's output shape (`CLAUDE.md`'s "Output shape" section): numbered steps done so far, one concrete next action, nothing narrated between commits.

## Options (not rules)
- After an edit, run the repo's own fast-check script named in `CONSTRAINTS.md`'s "Checked by" column, when one exists (`cycle:constraints`).
- Parallel slices from the Graph gate can get their own worktree and subagent (`cycle:worktrees`, `cycle:parallel-agents`, `cycle:subagent-driven-development`).
- Auto mode: only when `CLAUDE.md`, hooks and a test suite exist in the repo.
- Build hooks: block protected folders, run lint, keep credentials out of the diff. A hook that asks for a human belongs in `cycle:deploy`.
