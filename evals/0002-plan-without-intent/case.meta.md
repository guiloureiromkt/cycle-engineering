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
