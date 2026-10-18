# 0006-gates-read-research · provenance and hand-checks

**origin:** reach proof for R9 of specs/ammunition-before-decisions.md, 2026-09-12. Ran 4/4 on 0.3.0 and again on 0.4.0 without council.json (the defaults path).

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| an Agent dispatch to cycle:devils-advocate naming research/… | `the-advocate-was-dispatched-with-the-research` (tool_used: Agent with input_match on the research path) — the dispatch's own argument, not a claim about it |
| a risk row whose origin is the advocate and names a research assumption | `the-risks-trace-back-to-the-research`, an llm grader reading the produced plan |
| status stays draft | same grader, condition 3 |
| no src/tests modified | `created-nothing-under-src` |

**hand-checks:** none.

**2026-09-22 · the cause was in the skill, not in the case**

This case blocked the 0.7.0 gate on 2026-09-21: three runs on an unchanged case and an unchanged plugin
went pass, fail, fail, and the judge voted 3–0 every time. Two workspaces were kept, and they are
committed under `.cycle/work/2026-09-21-a-judge-over-a-grown-artifact-blocks-every-release/`. The run
that failed did twenty turns, ran gates 1 to 3, found nine things and three blockers, wrote 4,435 bytes
of them into `.cycle/work/discount-checkout/gates.md`, and left `plans/discount-checkout.md` at its
fixture size of 1,203 bytes with `Risks: none` — then ended by asking the owner whether the plan should
round to 904 or 905, and recommended "not yet" on the council. The run that passed wrote eleven risk
rows into the plan, one of them citing the research's own "what we did not check". The judge read what
each run wrote, and was right in every recorded run of this case.

The cause was `skills/plan/SKILL.md`: it said "write the risks table now" inside gate 4, and never said
where the raw output of gates 1 to 3 goes, while the CLAUDE.md block seeded into every workspace says
intermediate files go under `.cycle/work/<intent>/`. Both readings were defensible and each run took
one. In lite mode — this case's mode, and the default every adopter installs — a correct run stops
before gate 4 to ask the owner a question an eval cannot answer, so under the old text it could stop
before the one instruction that put risks into the plan. The fix moved that instruction: the advocate's
rows go into the plan at gate 2, the pre-mortem's at gate 3, the plan is committed there, and the
council appends at gate 4. Two routes were measured dead before that one: `gates: full` on this case
(grows the judge's input, and the sibling `0007` in full mode has never scored 1.00), and grading the
work-folder file instead (the run that passes never writes it).

**The case stays lite on purpose.** It had lite by inheritance — no `config` key in `evals/fixtures.json`
— and it keeps it by decision: lite is what every adopter gets, and a lite run is now what this case
grades. Nothing in `case.yaml` changed. The two 2026-09-21 routes that would have changed it are
recorded in the research file of that intent as the roads not taken.

**GREEN, 2026-09-22, result folder `2026-09-22T12-54-06-960Z`:** two runs with the new text, `--runs 2`
under the owner's US$25 ceiling so that a short remainder could not skip the paid judge. Run 1: 1.00,
5 turns, US$1.36, judge PASS PASS PASS, 23 risk rows, `gates: [graph, advocate, pre-mortem]`, the
council question asked in the last message but **no `council:` line written** in the frontmatter.
Run 2: 1.00, 26 turns, US$1.22, judge PASS PASS PASS, 16 risk rows, `council: pending — "<the question,
verbatim>"` and `joker: pending`. `skippedPaidGraders: false` on both. In both traces the `Skill` call
loading `cycle:plan` precedes the `Agent` dispatch, and the last write to `plans/discount-checkout.md`
precedes the final message — the checks that separate a fixed cause from two lucky votes, as far as
two runs can. Both runs committed inside the sandbox, which the two kept runs of 2026-09-21 had not
done; the runner's git one level above the workspace accepts a commit, and a "Commit." in the skill is
still not something this case can see. Total: US$2.58, 460 s.

**What this does not fix.** The judge splits on long input: across every recorded judgement of a long
artifact in this suite, three of eight are 2–1 votes (`0006` on 2026-09-13, `0007` on 2026-09-13,
`0008` once). This change removes the measured cause of the flip — where the run writes — and leaves
the judge's noise where it was. If this case flips again with a plan that carries rows, the remaining
cause is the judge, and that is the intent's open question about advisory verdicts, not a re-run.

### 2026-10-17 · no run, and why
Slice 1 (the diagnosis) changed a file this case covers, but its fixture has no `size:`, which keeps the old path by design (asserted by `tests/diagnosis.test.mjs`), and `small`/`project` keep the five gates until slice 7. 0002 and 0017 ran for the routing and the session text; 0018 and 0019 for the new skill.
