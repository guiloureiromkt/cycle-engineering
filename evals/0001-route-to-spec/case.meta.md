# 0001-route-to-spec · provenance and hand-checks

**origin:** real task · GREEN A, 2026-09-03 (the run that produced the rule 'a file without frontmatter does not count', commit 39650ea). Re-pointed on 2026-09-12 when fixture a gained a done research, so the route is spec, not research.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no file under src/ or tests/ modified | `created-nothing-under-src` (file_exists, exists:false) for files Claude creates, plus `routed-to-spec-and-left-the-code-alone` condition 1 over the trace for files it edits — `file_exists` cannot see a modification |
| specs/dark-mode.md created with status: draft | `wrote-the-spec` (file_exists) plus the llm grader's condition 2 for the draft status |
| final report names cycle:spec as the route | llm grader, condition 3 |
| — | `the-router-fired` (tool_used with input_match `cycle:using-cycle`, arm with-only): the router actually fired |

**hand-checks:** none.

**2026-10-16 · no run — a declared waiver for one key added to `templates/config.json`: `products: []`.** The key is read only by `scripts/retro.mjs --repeats --across` and by the weekly evolve routine, in the method repository (`method_repo: "."`); a product repository leaves it empty and nothing in routing, spec, plan or build reads it. This case proves the router sends an accepted intent with a done research to `cycle:spec`; its fixture's config is the template's, and an empty list in it changes no decision the graders look at. The behaviour the key enables is proved deterministically in `tests/retro.test.mjs` (`--across` with a products list, a missing path reported, worktree copies collapsed), seen red before the script read the key and green after. A paid run here would measure a key the run never touches.
