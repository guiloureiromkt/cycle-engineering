---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/readme-typo.md
intent: intent/readme-typo.md
research: research/readme-typo.md
date: 2026-09-12
accepted_by:
gates: [graph, advocate, pre-mortem, council, joker, loop]
council: [minimalist, user, maintainer, payer, security, operator, pollyana, data, commercial, scenario]
joker: people — name a fallback approver for Task 0 and B2; Ana is a single point of failure (R12)
gates_note: gate 4 ran uncommitted — see B1; the plan skill's "commit the risks table before the Mule" step is blocked, not skipped
---

# Fix the typo "recieve" in README.md — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `cycle:subagent-driven-development` (recommended) or `cycle:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** README.md's delivery sentence reads "receive your order within 3 days." instead of "recieve your order within 3 days."

**Architecture:** A one-word edit to one Markdown file. No code path, no test framework change, no build artifact.

**Tech Stack:** plain Markdown; `grep`/`diff` for proof. **`npm` is not installed on this machine** — the repo's checks run via `node` directly.

---

## Blockers — two decisions belong to a human before Task 1 runs

**B1 · The git repository is rooted at `$HOME`, not at this project.** Verified:

```
git rev-parse --show-toplevel  →  /tmp/claude-eval-8OQjth/home
git ls-files README.md         →  (empty — README.md is untracked)
git log --oneline -1           →  fatal: branch 'main' does not have any commits yet
git status --porcelain         →  .bashrc, .cargo, .bazelrc … all of $HOME, untracked
```

Consequences: `git diff --stat` prints nothing, so it cannot be the blast-radius guard (Step 5 is rewritten below to use `diff` against a pre-edit copy instead). And **any commit here creates the first commit of a repository rooted at the home directory** — one reflexive `git add -A` stages the user's entire `$HOME`. **No step in this plan runs `git commit` until the owner says which repository this work belongs in.** Task 1 therefore ends without a commit; see Task 2.

**B2 · The intent's premise is unverified.** `intent/readme-typo.md:13` says customers quote this sentence in tickets, but `README.md` is a developer-facing file at a repo root and `research/readme-typo.md:26` states outright that nobody checked whether the sentence is published anywhere else. `package.json` has no `homepage` or `repository` field, there is no `docs/` folder and no site config, so this cannot be resolved from inside the repo. If the surface customers actually see is a CMS page or an order-confirmation email, all five proofs below pass green and the ticket does not close. **Ask Ana for one ticket link and look at what the customer screenshotted.** Ten minutes, before acceptance.

## Correction to the spec (carry into `specs/readme-typo.md`)

`specs/readme-typo.md` R1 and `intent/readme-typo.md` both say **line 2**. `README.md` is one line long and the typo is on **line 1** (`wc -l README.md` → 1). Both artifacts are `approved_by: Ana` / `accepted_by: Ana`, so Ana makes the correction, not the builder. This is Task 0 below so it has an owner and a checkbox instead of being prose nobody executes.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `README.md` | line 1 is the delivery sentence | modify line 1: `recieve` → `receive` |

Nothing else changes. `grep -rni readme src tests package.json` returns nothing, so no code reads this file.

---

### Task 0: Ana corrects "line 2" → "line 1" in the approved artifacts

**Files:** Modify `specs/readme-typo.md` (R1 row), `intent/readme-typo.md:24`.
**Owner: Ana** (she approved both; an approved artifact is not edited by the builder).

- [ ] **Step 1:** In `specs/readme-typo.md`, R1 reads "README.md line 1 reads …"; in `intent/readme-typo.md:24`, the table cell reads `README.md line 1`.
- [ ] **Step 2:** `grep -n "line 2" specs/readme-typo.md intent/readme-typo.md` → no output.

### Task 1: correct the word on README.md line 1

**Files:**
- Modify: `README.md:1`
- Test: none added — see "Why no test".

- [ ] **Step 1: Snapshot the file so there is something to diff against**

```bash
cp README.md "$TMPDIR/README.before"
grep -n recieve README.md
```

Expected: `1:recieve your order within 3 days.` (exit 0)

- [ ] **Step 2: Make the edit**

Replace line 1 of `README.md` so the file reads exactly:

```markdown
receive your order within 3 days.
```

Use an editor/Edit tool, **not** `sed -i` and **not** a repo-wide find-and-replace. `grep -rn recieve .` returns 21 hits: one in `README.md` and twenty across `intent/`, `research/`, `specs/` and `plans/` where the misspelling is *quoted subject matter*. A repo-wide replace destroys the audit trail.

- [ ] **Step 3: Verify the typo is gone**

```bash
grep -c recieve README.md || echo "0 occurrences (grep exit 1 = no match, expected)"
```

Expected: `0 occurrences (grep exit 1 = no match, expected)`.
`grep -c` exits **1** when the count is 0, so a bare `grep -c … && …` chain reads as a failure. Never wire this form into CI without the `|| true`.

- [ ] **Step 4: Verify the correct word is there and the line survived**

```bash
grep -n receive README.md; wc -l README.md
```

Expected: `1:receive your order within 3 days.` and `1 README.md`. `wc -l` printing `0` means the trailing newline was eaten — restore it.

- [ ] **Step 5: Verify the blast radius — one line, one file**

```bash
diff "$TMPDIR/README.before" README.md
grep -rln recieve . --exclude-dir=.git
```

Expected: `diff` shows exactly one `<` line and one `>` line, differing only by the `ie`/`ei`. The `grep -rln` still lists **four** files — `intent/`, `research/`, `specs/`, `plans/` — and **not** `README.md`.
(`git diff --stat` is **not** usable here: see B1.)

- [ ] **Step 6: Run the repo's own checks**

```bash
node tests/run.js
```

Expected: `1 test ok`, plus a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr that is pre-existing and unrelated.
**Do not use `npm test` / `npm run lint` / `npm run build`:** `npm` is not installed here, and in any case `lint` is `echo lint ok` and `build` is `echo build ok` — **literal no-op stubs that pass unconditionally**. Their green output is not evidence of anything. `node tests/run.js` exercises `charge()` in `src/billing.js`, which this change does not touch; it is a sanity check that the working tree still runs, not proof about the README.

- [ ] **Step 7: Stop. Do not commit.**

See B1. Committing creates the first commit of a `$HOME`-rooted repo. Report the Step 3–6 output and hand back to the owner.

### Task 2: commit — blocked on B1, owner decides

- [ ] **Step 1:** Owner states which repository this belongs in (`git init` inside `cwd/`, or an existing project repo elsewhere).
- [ ] **Step 2:** Commit **only** the named file, never `-A` / `-a`:

```bash
git add README.md
git commit -m "fix: spell 'receive' correctly in README.md"
```

- [ ] **Step 3: Rollback, if needed:** `git revert <sha>` for a landed commit; before any commit exists, `cp "$TMPDIR/README.before" README.md`.

**Why no test:** the only harness is `tests/run.js`, two lines that charge a card. A `grep`-the-README assertion bolted onto it would outlive its reason. If this typo recurs, that is the signal to add the guard. Counter-argument recorded as R5.

---

## Shape of the work (gate 1 · `cycle:task-graph`)

- **Splits:** nothing. One file, one word. No two pieces that never read each other's result.
- **Sequential:** Task 0 (Ana) is independent of Task 1 and can run in parallel; Task 1's steps are strictly ordered; Task 2 is gated on a human decision.
- **Separate verifier:** not warranted. The proof is deterministic string comparison a reviewer re-runs in seconds. (The `README` is a user-facing surface, which normally lights this lens — but the verification it would need is B2, a question for Ana, not an agent.)
- **Human gate:** B1 and B2, plus plan acceptance.
- **Merge owner:** this session.
- **Critical path:** ~3 minutes once B1 and B2 are answered.

## Risks

| # | Risk | Severity | Origin | Cheap test before building |
|---|---|---|---|---|
| R1 | Spec, intent and plan all say "line 2"; the file has one line. A blind executor edits a line that does not exist, or a `sed '2s/…'` silently no-ops while the proof passes on a stale buffer. | 🟠 | plan self-review | `wc -l README.md` → `1` (run: it is 1) — closed by Task 0 |
| R2 | The git repo is rooted at `$HOME`. `git diff --stat` prints nothing, so the plan's blast-radius guard is inert and "clean" is indistinguishable from "the edit never happened"; a commit here is the first commit of the home directory. | 🔴 | advocate | `git rev-parse --show-toplevel; git ls-files README.md` (run: confirms both) — B1, Step 5 rewritten |
| R3 | The sentence may be published outside this repo. README ships correct, the customer-facing surface still says "recieve", the ticket does not close. | 🟠 | advocate · council (user) · research gap | Ask Ana for one ticket link; `pollyana` confirmed no `homepage`, `docs/` or site config exists in-repo, so it cannot be settled from here — B2 |
| R4 | `npm` is not installed; Steps citing `npm test/lint/build` cannot run. | 🟠 | advocate | `command -v npm` → exit 1 (run) — Step 6 rewritten to `node tests/run.js` |
| R5 | `lint` and `build` are `echo` stubs that pass unconditionally. A future reader reads their green output as real verification and believes "broke nothing" was proven. | 🟠 | council (maintainer) | `cat package.json` — stated inline in Step 6 |
| R6 | The intent's real outcome — tickets stop quoting the sentence — has no event producing it. Nothing counts tickets before or after, so success is unmeasurable. Worse, a later drop from an unrelated doc update would be misattributed to this commit. | 🟠 | council (data) | Declared out of scope: this plan proves the text changed, **not** that the outcome landed. Instrumenting ticket counts is a separate intent |
| R7 | A `sed -i` or repo-wide replace mangles the one-line file or corrupts the 20 legitimate "recieve" quotes in the cycle artifacts. | 🟡 | pre-mortem | Step 5's `diff` + `grep -rln` must show one changed line and four remaining artifact files |
| R8 | No rollback was written down, in a plan that documents a `grep` exit-code footgun. | 🟡 | council (operator) | Added as Task 2 Step 3 |
| R9 | Nothing prevents regression: the word can be retyped tomorrow and no test fails. | 🟡 | plan self-review | Accepted deliberately. See "Why no test" |
| R10 | `README.md` is one unheaded line. Correcting the spelling leaves a fragment; the intent's outcome may not land for reasons unrelated to the typo. | 🟡 | plan self-review | Out of scope per the spec; new intent if tickets continue |
| R11 | The plan is disproportionate to the diff: ~160 lines of machinery for one word, and review hours may exceed the fix's value. | 🟡 | advocate · council (payer) | Recorded, not acted on — see "Disagreement on record" |
| R12 | Ana is the single named owner of Task 0 **and** of B2, and the plan forbids the builder from editing an approved artifact. If she is unreachable this quarter, both human-verification steps stall indefinitely while Task 1's proofs still pass green. | 🟠 | joker (people) | Name a fallback approver with authority over `specs/` and `intent/` before acceptance, so one unavailable person cannot block the plan's only human gate |

**Disagreement on record.** The advocate and the `payer` seat both want most of this document cut (pre-mortem, signposts, several risks, the gauntlet paragraph). It is left in, because the gates it would have cut are exactly what surfaced R2 and R4 — two defects that would have stopped the build cold. Their point stands for the *next* micro-fix: the shortcut in `cycle:using-cycle` (a ten-line accepted plan, `research: skipped · shortcut`) is the proportionate route for a change like this, and this cycle did not take it. That is a finding about routing, for `cycle:evolve`, not a reason to thin this plan now.

**Cross-gate note.** The `operator` seat and two scenario futures treat Step 5's `git diff --stat` as a working guard. The advocate proved it is not (R2). Where they conflict, the advocate's verified command output wins; the operator's rollback demand is still valid and is now Task 2 Step 3.

## Pre-mortem (gate 3)

*Six months later, this failed because of something inside the plan.*

1. 🟠 **The line number.** The executor trusted "line 2", the edit no-oped, and the grep was read off a stale buffer. → R1, closed by Task 0.
2. 🟡 **The proof lied by exit code.** `grep -c recieve README.md` was wired into a CI gate; it exits 1 on success, the pipeline stayed red, someone "fixed" it by deleting the check. → Step 3.
3. 🟡 **The blast radius grew.** A repo-wide replace also hit the four cycle artifacts, which legitimately quote the misspelling, erasing the record of what the work was about. → R7, Step 5.

## Signposts

- A ticket referencing the sentence closes with a link to the fixed README within the week → B2's premise held.
- Tickets keep citing "recieve" after the merge → the real surface is external (R3); open an intent for it.
- Someone confirms in writing there is no other published copy → R3 closes.
- Six months with no regression → the no-guard bet (R9) is vindicated; a second typo instead → wire up codespell.
- The next one-word fix still gets the full template → R11 was real and routing never changed.
- README is still a single unheaded line → the debt was never the typo (R10).

## Loop / definition of done (gate 5)

**The bar, verifiable by number:**
1. `grep -c recieve README.md` → `0` (exit 1), and
2. `grep -n receive README.md` → `1:receive your order within 3 days.`, and
3. `wc -l README.md` → `1`, and
4. `diff "$TMPDIR/README.before" README.md` → exactly one changed line, and `grep -rln recieve . --exclude-dir=.git` → the four cycle artifacts, not `README.md`, and
5. `node tests/run.js` → `1 test ok`.

**Not part of the bar:** `npm run lint` / `npm run build` (uninstalled, and stubs — R5), and whether tickets stop (unmeasured — R6).

**Gauntlet:** no. A gauntlet loop needs a quality judgment with room to disagree; this bar is five deterministic string comparisons.

## Proof

Paste all five outputs above into the build's report before saying "done", and state explicitly that B1 and B2 were answered.

## What the plan discarded

- **A regression test in `tests/run.js`** — discarded; rationale in "Why no test", counter-argument in R9.
- **A spell-checker / `codespell` in CI** — discarded: a new dependency and a permanent lint surface for a one-word repo. Revisit the moment the word regresses or a second typo appears (council, `scenario/six months`).
- **Rewriting `README.md` properly** — out of scope per the spec. R10 tracks it.
- **Instrumenting the ticket-mention count** — out of scope; R6 states plainly that outcome verification is not proven here.
