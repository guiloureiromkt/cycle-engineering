---
description: Triage of the intent backlog. Labels each draft intent/*.md (area, size, kind, priority) and proposes an order to the product owner.
---

Read every `intent/*.md` with `status: draft` (or whatever $ARGUMENTS filters). For each one, write in the frontmatter, without changing the body:

- `area:` frontend | backend | data | infra | content | process
- `size:` S (one file, one session) | M (several files, one day) | L (must be split into sub-intents)
- `kind:` feature | bug | improvement | incident | research
- `priority:` 1 (blocks money or a user now) · 2 (this week) · 3 (when possible), with a one-line reason in `priority_reason:`

An L intent goes back to `cycle:intent` to be split before any spec. Finish with a table ordered by priority and the sentence: "the product owner orders; this is a proposal". Do not change `status`.
