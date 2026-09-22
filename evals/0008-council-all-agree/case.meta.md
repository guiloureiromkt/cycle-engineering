# 0008-council-all-agree · provenance and hand-checks

**origin:** council demand on plan v1 (2026-09-12): the 'all seats agree' warning must exist in a run, not only in the agent text. Two runs on 0.4.0, both 4/4; the warning branch has never been seen in practice, because even a typo plan gives the seats something true to demand.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| resolver shows five seats, no pool seat | `the-resolver-ran` plus the llm grader's condition 1 |
| the all-agree warning, or real demands without it | llm grader, condition 2 |
| the Mule dispatched separately | llm grader, condition 3, plus `the-gates-were-real-dispatches` (Agent min 2) |
| status draft; only the plan modified | llm grader, condition 4 |

**hand-checks:** none.

**2026-09-20 · first run after the rewrite: score 0.67, US$2.59, 596 s — the judge was skipped, not failed.** `the-resolver-ran` and `the-gates-were-real-dispatches` (3 Agent calls) passed; `five-seats-and-an-honest-close` was **skipped by the runner's cost ceiling** (US$1.50 for this run; the case alone costs ≈US$2.60 because gate 4 dispatches the council and the Mule). The rewritten judge, now pointed at `plans/readme-typo.md`, has therefore not voted yet. A re-run needs a ceiling of ≈US$4 for this one case. Until then: *rewritten, not verified*.

**2026-09-20, second and third runs — the judge was RIGHT, and the case is red for a real reason.** Re-run with a US$4 ceiling: score 0.67, US$1.39, `judge votes: FAIL FAIL PASS`. Re-run with `--keep-temp`: 0.67, US$2.19, `FAIL FAIL FAIL`, and the runner's own note: *"long file (15111 chars); llm judges are noisy on long inputs, prefer a regex grader for large artifacts."* The kept workspace showed the plan the run wrote: `council: [minimalist, user, maintainer, payer, security, operator, pollyana, data, commercial, scenario]` — **two pool seats sat on a README typo**, which criterion 1 forbids. They sat because the plan's prose contains "quote" (customers *quote* the sentence in tickets) and "report"/"tracking", which light `commercial` and `data`. That is `intent/2026-09-20-pool-triggers-match-prose.md` — the pool matches words, not subjects — **and from today it blocks a publish**: `skills/plan/SKILL.md` is in the range, this case covers it, and it stays red until the triggers are fixed. The judge is gone anyway: the four criteria are now four `regex` graders on the frontmatter and the risks table, each able to go red on its own line, immune to the length noise. Total spent on this case today: US$6.17.
