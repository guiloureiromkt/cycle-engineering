---
description: Where this repository is in the cycle (intent → spec → plan → build → test → deploy → maintain) and what the next step is.
---

Read the state of the cycle in this repository and answer in at most 12 lines:

1. List `intent/*.md`, `specs/*.md` and `plans/*.md` with each one's `status` (frontmatter). If `.cycle/` does not exist, say the repo has not been started on the cycle and point to `/cycle:init`.
2. For each intent, say which stage it is in: no spec → Spec; spec without plan → Plan; draft plan → gates pending; accepted plan → Build; build done without pasted proof → Test; PR open → Deploy.
3. Say which cycle skill runs next for each one (`cycle:intent`, `cycle:spec`, `cycle:plan`, `cycle:build`, `cycle:test`, `cycle:deploy`, `cycle:maintain`).
4. If `.cycle/release-approval` exists, show its content and date; otherwise say production deploy is blocked by the gate. Show `gates` and `stateful` from `.cycle/config.json`.

Edit nothing. If the user passed an argument ($ARGUMENTS), filter by the intent with that name.
