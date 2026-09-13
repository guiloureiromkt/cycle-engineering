# 0004-route-to-research · provenance and hand-checks

**origin:** real gap · 2026-09-12: nine days of cycles decided on 40-line haiku sweeps; the owner: 'ele toma decisões sem saber tanto das coisas'. RED under 0.3.0 and three GREEN runs in evals/results/2026-09-12-0004-*.md.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no file under src/ or tests/ modified | `created-nothing-under-src` |
| no specs/ file created | `created-no-spec-yet` (file_exists, exists:false) |
| final report names cycle:research as the route | `the-router-fired` plus `wrote-the-research` (file_exists) |
| node evals/grade-research.mjs research/dark-mode.md exits 0 | `the-artifact-holds-up`: an llm grader reading the produced file (`focus: {source: file}`) against the same five rules the script checks. The deterministic script stays a hand-check |
| at least two WebSearch or WebFetch calls | `sources-were-fetched-not-remembered` (tool_used: WebFetch, min 1) — the runner refuses a grader for a tool the operator did not grant, so the run needs `--allow-tools WebFetch` |
| a benchmark's evidence is a fetched URL or an existing file | `the-artifact-holds-up`, condition 4 |

**hand-checks:** `node evals/grade-research.mjs research/dark-mode.md` exiting 0 — run it by hand on the produced artifact; the llm grader judges the same rules but is not the script.
