# Cost log · every full eval run of the method's own suite

One line per **full** run (`npm run evals:full`, or any run of the whole suite). Partial runs — one
case, one tag, the gate's selection — are not logged here; they cost single dollars and the report
files record them. This file exists so a month is auditable in one place, and so the weekly routine
can tell whether a full run already happened this week (`docs/routines/weekly-evolve.md`).

| Date | What fired it | Cases | Runs | Overall | US$ | Notes |
|---|---|---|---|---|---|---|
| 2026-09-13 | the port to the native runner, by hand | 8 | 1 | 0.76 | 13.65 | the first honest number; two failures are findings, `evals/results/2026-09-13-port.md` |
| 2026-09-21 | the 0.7.0 publish attempt, 160 commits past `v0.6.1` | 15 selected, 4 scored | 1 | — | 3.10 | stopped at `0006`; see below |

**2026-09-21 · the gate stopped on a flaky run, not a regression.** `0001` 1.00, **`0003` 1.00** — a case
that had never passed in five runs across two weeks — `0005` 1.00, then `0006-gates-read-research` scored
0.67. Its `llm` grader `the-risks-trace-back-to-the-research` voted FAIL 3–0, and it was **right**: the
run had written no risks. It took **one turn**, against 26 on the run that passed this case on 2026-09-13
and 10–20 on its three siblings in the same gate run. It dispatched the advocate and stopped.

A re-run with `--keep-temp` (US$1.35, 253 s, 2 turns) scored **1.00**, all three graders green, judge
3–0 PASS. So the case is sound and the run was not.

**This is where the method's own warning applies to the person reading it:** a flaky gate teaches whoever
hits it to re-run until green, and that is exactly what must not become the habit. What justifies the
re-run here is not that it went green — it is that the failing run took one turn and therefore cannot have
done the work the grader asked about. The turn count is the evidence; the green is the consequence.

**Eleven of the fifteen cases never ran.** A green gate for this release still needs a complete pass, and
the historical rate (8 cases for US$13.65 on 2026-09-13) puts fifteen close to or over the US$15 ceiling,
which is the owner's number and was not changed.
| 2026-09-21 | the 0.7.0 publish, second attempt, ceiling raised to US$25 by the owner | 15 selected, 4 scored | 1 | — | 3.12 | stopped at `0006` again |

**2026-09-21, second attempt · the same case, the opposite reading of it.** `0001`, `0003` and `0005`
scored 1.00 again; `0006-gates-read-research` scored 0.67 again, same `llm` grader, same 3–0 FAIL — but
this time at **3 turns**, where the run that passed it an hour earlier took **2**. So the turn count is
not what separates them, and the note in the entry above is superseded: this is not one bad run.

Three runs of `0006` today on an unchanged case: **PASS, FAIL, PASS, FAIL** counting 2026-09-13. A grader
that returns different verdicts for the same case is not measuring what it claims to, whichever verdict
is right. The runner prints the reason on the passing one: *"long file (14635 chars); llm judge…"*. The
fixture seeds that plan at 1,203 characters and the run grows it to ~14,600, which is the case working as
designed.

**Third time this defect class has blocked a release** — `0005` on 2026-09-17, `0008` on 2026-09-20, this
one now. The first two were fixed one case at a time. Ten `llm` graders remain, five of them over a file a
fixture seeds small and a run expands. Raised as
`intent/2026-09-21-a-judge-over-a-grown-artifact-blocks-every-release.md`, priority 1.

**Not re-run a third time.** Two of three failed; the one that passed is not the answer, and re-running
until green is the habit this repo's own records warn against.

**Spend, 2026-09-21:** US$5.64 (diagnosis) + US$2.01 (grader cycle) + US$4.45 (first gate attempt and its
diagnostic) + US$3.12 (second gate attempt) = **US$15.22**.

**2026-09-22 · GREEN for the method fix, before the third gate attempt.** Not a full run and not the gate:
two paid runs of `0006-gates-read-research` alone, with the changed `skills/plan/SKILL.md` (the advocate's
rows into the plan at gate 2, the pre-mortem's at gate 3, one commit there). `--runs 2 --max-cost-usd 25`
— the owner's ceiling, so that a short remainder could not skip the paid judge. **1.00 and 1.00**, judge
3–0 PASS both times, 5 and 26 turns, `skippedPaidGraders: false`, **US$2.58**, 460 s, result folder
`2026-09-22T12-54-06-960Z`. Kept plans and traces are committed under `.cycle/work/2026-09-21-a-judge-
over-a-grown-artifact-blocks-every-release/`. Logged here although partial, because it is the RED→GREEN
of a skill change and the gate that follows it will be read against it.

**Spend, 2026-09-22 so far:** US$2.58.

**2026-09-22 · third gate attempt for 0.7.0 — stopped on `0007`, and the judge was wrong.** From `d0e6917`
(the method fix, its record, the retro and the changelog fold). `0001` 1.00 (15 turns), `0003` 1.00 (43
turns, US$3.00), `0005` 1.00, **`0006` 1.00** (26 turns — the third straight 1.00 with the new
`cycle:plan` text, after pass/fail/fail on the old one), then **`0007-council-seats-by-trigger` 0.80**:
four graders green, including `the-mule-came-after-a-commit`, which had never passed on the native
runner and now does because the plan is committed at gate 3; the one red is the `llm` grader
`seats-scenario-and-signposts`, **FAIL 3–0 on a 15,834-character plan**, with the runner's own note
*"long file; llm judges are noisy on long inputs, prefer a regex grader for large artifacts"*. The plan it
read is kept at `.cycle/work/2026-09-21-a-judge-over-a-grown-artifact-blocks-every-release/gate-attempt-3-0007-plan.md`,
and checked by script against the grader's five conditions: `council:` lists `cx` and `commercial` beyond
the seven fixed seats; `joker: regulator — …` with a demand; exactly two risk rows whose Origin column is
`council: cx` / `council: commercial`; `## Signposts` with ten lines; `status: draft`. **All five hold.**
The judge failed a correct run — the fourth time this class (`0005` 09-17, `0008` 09-20, `0006` 09-21,
`0007` now) has blocked this release. Not re-run. Eleven cases (`0008`–`0017`, minus what ran) still
unseen in this release. Gate exit 1 ("a regression, not a budget problem"), **US$7.91**, ~30 min.

**Spend, 2026-09-22:** US$2.58 (GREEN) + US$7.91 (gate) = **US$10.49**.

**2026-09-22 · published anyway, by the owner.** After the third attempt the owner asked why this stage keeps blocking and whether it should exist. 0.7.0 was published from `main` with the gate red on `0007`'s judge, the unit suite green and the RED→GREEN of the changed skill as the proof; recorded in the 0.7.0 changelog under "Notes on what is not covered". No further paid run today.

