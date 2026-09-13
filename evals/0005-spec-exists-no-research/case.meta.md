# 0005-spec-exists-no-research · provenance and hand-checks

**origin:** advocate finding on plan v1, 2026-09-12: 18 real plans exist with a spec and no research; the new routing row must not send them back. Run on 0.3.0: 2 of 3.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no research/ file created | `wrote-no-research` (file_exists, exists:false) |
| route is cycle:plan, not cycle:research | llm grader, condition 2, plus `the-router-fired` |
| no file under src/ modified | `created-nothing-under-src` plus the llm grader's condition 3 |

**hand-checks:** none — and the case deliberately does not grade whether 'approve it' counts as acceptance; that is intent/2026-09-12-acceptance-is-a-word-in-chat.md.
