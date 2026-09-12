---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/readme-typo.md
intent: intent/readme-typo.md
research: research/readme-typo.md
date: 2026-09-12
accepted_by:
gates: [graph, advocate, pre-mortem, council, joker, loop]
council: [user, maintainer, payer, security, operator, scenario]
joker: regulator — demand recorded (scope line, risk 6)
---

# Fix the typo "recieve" in README.md — plan (gates run 2026-09-12, awaiting acceptance)

**Goal:** README.md says "receive".

**Correction found at the gates:** intent, research and spec all say "line 2". README.md has a single line (`wc -l` → 1; `grep -n recieve README.md` → `1:`). This plan reads spec R1 as "the README's only line". Ana confirms this reading at acceptance; the spec text itself is left for her to amend or not.

### Task 1: the word
**Files:** modify `README.md`, the only line (the one containing "recieve").
- [ ] On a branch off `main` (`main` is protected in `.cycle/config.json`): change "recieve" to "receive". Nothing else in the sentence changes (no capitalisation, no punctuation; intent constraint "no other copy changes").
- [ ] Proof, all four pasted in the commit or PR:
  - `grep -c recieve README.md` → 0
  - `grep -c "receive your order within 3 days." README.md` → 1
  - `git diff --stat main` → 1 file changed, 1 insertion, 1 deletion
  - `npm test && npm run lint && npm run build` output (nothing depends on the README; pasted per CLAUDE.md anyway)
- [ ] Commit message mentions: "line 2" in intent/spec was line 1; a duplicate of the sentence on any published site outside this repo was not checked (research, "What we did not check").

## Shape of the work (gate 1)
One task, one file, one line. Nothing splits; no false edge to remove. Separate verifier: yes, `cycle:verifier` at the end of the build, because the sentence is customer-facing copy (customers quote it in tickets). Judged by the four proof numbers above, never by self-report. Human gates: acceptance of this plan (now) and the PR merge into protected `main`. Merge owner: the main session.

## Pre-mortem (gate 3)
"Six months later this failed because of something inside the plan":
- 🟡 The proof only checked absence of "recieve". A build that deleted the line, or replaced the whole sentence, would have passed. Cheap test: the positive grep (→ 1) and `git diff --stat` (1/1/1) added to the proof above.
- 🟡 The builder followed "line 2" literally, found nothing there, and appended or misplaced the fix. Cheap test: run today: `wc -l README.md` → 1, `grep -n recieve` → line 1. Plan now names the line by content.
- 🟡 A case variant ("Recieve") survived elsewhere. Cheap test run today: `grep -rni recieve . --exclude-dir=.git` finds the word only in README.md and in the cycle artifacts that describe this fix.

## Risks
| # | Risk | Origin | Severity | Cheap test or mitigation |
|---|---|---|---|---|
| 1 | Intent, research and spec say "line 2"; README has one line. A literal builder or verifier flags a mismatch or edits the wrong place. | advocate, pre-mortem | 🟡 | `sed -n 2p README.md` prints nothing. Task 1 names the line by content; Ana confirms the reading of R1 at acceptance. |
| 2 | Proof proves absence of the typo, not presence of the intended sentence; deleting the line also passes. | advocate, pre-mortem | 🟡 | Positive grep → 1 and `git diff --stat` 1 file / 1 line, both in Task 1 proof. |
| 3 | The sentence is duplicated on a published site outside this repo, so customers keep quoting "recieve" after merge and the outcome looks unmet. | advocate, council (scenario) | 🟡 | Out of scope by spec. Commit message says the duplicate was not checked, so a post-merge recurrence traces back fast. Ana to say where customers read the sentence. |
| 4 | `main` is protected and the plan is a draft; the edit is blocked until a human writes `accepted_by`, and the commit goes to a branch. | advocate | 🟡 | Task 1 starts on a branch; acceptance is the human gate before it. |
| 5 | A later README edit reintroduces "recieve" by copy-paste from an old branch or fork. | council (scenario) | 🟡 | Signpost below; `grep -rn recieve .` is cheap to rerun in any later README PR. |
| 6 | A consumer-protection ruling treats "receive your order within 3 days" as a delivery guarantee and orders it reworded; someone stretches this plan to cover the content change. | joker (regulator) | 🟡 | Scope line below: this plan covers spelling only. A content change is a new intent and a new plan, never an amendment here. |

Council seats user, maintainer, payer, security and operator: no demand (no new data, no infra, no cost, undo is one `git revert`, nothing programmatic reads the README: `grep -rn README src tests package.json` is empty).

**Scope (Mule's demand):** the constraint "no other copy changes" belongs to this intent only. Any future mandate to change what the sentence says, as opposed to how "receive" is spelled, is a new intent and a new plan. This plan is never amended to carry it.

## Signposts
- a new support ticket still quotes "recieve" within the week after merge
- grep confirmed 0 in the merged commit's own history (day-after path holds)
- a later README edit reintroduces "recieve" via copy-paste from an old branch or fork
- zero related tickets in the six months after merge (the duplicate-elsewhere worry was unfounded)

## Bar for done (gate 5)
Verifiable by number: the four proof lines in Task 1. Gauntlet: no. A one-word fix has no quality gradient to compare blind.

## Proof
`grep -c recieve README.md` prints 0 **and** `grep -c "receive your order within 3 days." README.md` prints 1, with `git diff --stat` showing one file, one line.
