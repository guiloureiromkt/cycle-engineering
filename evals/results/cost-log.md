# Cost log · every full eval run of the method's own suite

One line per **full** run (`npm run evals:full`, or any run of the whole suite). Partial runs — one
case, one tag, the gate's selection — are not logged here; they cost single dollars and the report
files record them. This file exists so a month is auditable in one place, and so the weekly routine
can tell whether a full run already happened this week (`docs/routines/weekly-evolve.md`).

| Date | What fired it | Cases | Runs | Overall | US$ | Notes |
|---|---|---|---|---|---|---|
| 2026-09-13 | the port to the native runner, by hand | 8 | 1 | 0.76 | 13.65 | the first honest number; two failures are findings, `evals/results/2026-09-13-port.md` |
