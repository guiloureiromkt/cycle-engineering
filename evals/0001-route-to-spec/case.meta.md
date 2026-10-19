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

**2026-10-17 · no run — a declared waiver for two template edits (0.9.2).** `templates/claude-md-block.md` changed one line (the production deploy passes the gate with `RELEASE_APPROVAL`, or the approval at `.git/cycle/release-approval` shared by every worktree, or `.cycle/release-approval` for one checkout) and `templates/config.json` gained the key `"timezone": null`. This case grades whether a request for something new is routed to the spec stage and nothing is built before it; neither the approval's location nor a timezone key is read by its graders, and the routing text of the block is unchanged. What the two edits describe is proved deterministically in the suite the gate runs above (`tests/hooks.test.mjs`: "docs: every place that tells the owner where the approval goes names the shared place", "config template: timezone is present, the cut window key is not, and the other keys survive", and the gate tests of the shared place and the owner's day, each seen red first). The next monitor run of `0001` keeps testing the routing; it cannot see these lines either way.

### 2026-10-17 · no run, and why
Slice 1 (the diagnosis) changed a file this case covers, but its fixture has no `size:`, which keeps the old path by design (asserted by `tests/diagnosis.test.mjs`), and `small`/`project` keep the five gates until slice 7. 0002 and 0017 ran for the routing and the session text; 0018 and 0019 for the new skill.

### 2026-10-19 · slices 2 to 7 (0.11.0): no run, and why
The Master Brief pointer, the mentor layer, research rounds, `## How we'll know`, the routes and the gates-by-size table changed the files listed below, which this case covers. **No run of this case:** the owner asked for a lean finish and for no paid or blind comparison; the change is text, the artifacts with no `size:` keep the five gates (this case's fixture carries no `size:` (checked by grep), and the skill text for that path is asserted by `tests/diagnosis.test.mjs`), and `tests/slices.test.mjs` checks the new text. The next weekly `npm run evals` is the monitor; a red there opens an intent and does not block a tag. Files: `skills/spec/SKILL.md`, `skills/using-cycle/SKILL.md`, `templates/config.json`, `templates/spec.md`.
