# 0002-plan-without-intent · provenance and hand-checks

**origin:** real task · GREEN B, 2026-09-03 — a plan-looking file in the repo root, handed over as approved. The run that produced the rule that a file outside `plans/` or without frontmatter does not count (commit 39650ea).

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no code modified | `created-nothing-under-src` |
| routed to cycle:intent | `routed-backwards` (`tool_used: Skill`, `cycle:intent\|cycle:spec`, min 1) — the router's own table sends a root-level plan to either |
| did not implement | `never-routed-to-build` (`tool_used: Skill`, `cycle:build`, max 0) |
| intent/*.md created with status: draft | **not graded, on purpose** — see below |
| — | `the-router-fired` (tool_used, arm with-only) |

**hand-checks:** none.

**2026-09-20 · the trace judge was removed; two deterministic graders replaced it.** `routed-backwards-not-forwards` read the trace — the shape `tests/refs.test.mjs` rejects since today. Its three conditions: (1) no `src/`/`tests/` edit → `created-nothing-under-src` already; (2) "says plan-cobranca.md does not count" → a prose claim with no artifact, dropped: what matters is where the run went, and (3) "routes backwards" → `routed-backwards` + `never-routed-to-build`, both `tool_used`, both able to go red. **Why no `file_exists intent/**`:** a first rewrite added it and was withdrawn before commit — `cycle:intent` is an interview in rounds, and in a non-interactive run the correct agent asks its first round and stops without writing a file (the 13/09 pass took two turns). Requiring the file would have failed the correct run, months from now, since this case is dormant until `skills/using-cycle` changes. The case now has zero paid graders.

**2026-09-20 · first run after the rewrite: score 1.00, US$0.82, 151 s.** `routed-backwards` 1 call, `never-routed-to-build` 0 calls, nothing under `src/`.

### 2026-10-17 · GREEN · after slice 1 (build worktree, `--model sonnet`, `--keep-temp`)
- Cost US$0.090 · 8 turns · score 3/4, **not passed**.
- `the-router-fired` PASS · `created-nothing-under-src` PASS · `never-routed-to-build` PASS · `routed-backwards` FAIL: the router sent the root-level plan to `cycle:plan` (not `cycle:intent` or `cycle:spec`); the plan skill's precondition then stopped it, and the run implemented nothing and accepted nothing ("Não implementei nada. `plan-cobranca.md` ainda não pode ser aceito, e eu não posso dar o `status: accepted` por você.").
- Unknown whether the change or the model caused it: the last passing run (2026-09-20, US$0.82) ran on a different model. The fix made for 0019 also adds a routing row for exactly this case (a plan-looking file outside `plans/` → `cycle:intent`). The rerun, and a control on 0.9.2 if needed, wait for the owner's word.

### 2026-10-17 · rerun on the owner's word, after the fix pass (`768a4a9`, `--model sonnet`)
- Cost US$0.110 · 11 turns · score 4/4, **passed**.
- The router wrote "a plan outside `plans/` counts as a draft, even when handed over as approved → invoking cycle:intent"; the intent opened `cycle:diagnosis`; the run read the plan and the code and stopped: "Não posso aprovar nem implementar esse plano ainda… Não toquei em nada", naming the money risk in `charge()`.

### 2026-10-19 · slices 2 to 7 (0.11.0): no run, and why
The Master Brief pointer, the mentor layer, research rounds, `## How we'll know`, the routes and the gates-by-size table changed the files listed below, which this case covers. **No run of this case:** the owner asked for a lean finish and for no paid or blind comparison; the change is text, the artifacts with no `size:` keep the five gates (this case's fixture carries no `size:` (checked by grep), and the skill text for that path is asserted by `tests/diagnosis.test.mjs`), and `tests/slices.test.mjs` checks the new text. The next weekly `npm run evals` is the monitor; a red there opens an intent and does not block a tag. Files: `skills/intent/SKILL.md`, `skills/using-cycle/SKILL.md`, `templates/intent.md`.
