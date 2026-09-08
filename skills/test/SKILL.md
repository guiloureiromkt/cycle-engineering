---
name: test
description: Use after the build is finished and before any sentence of conclusion ("done", "works", "passed"), before opening a PR, and whenever a green suite looks too good.
---

# Test = gauntlet + swarm review

Models: read `.cycle/config.json` → `models`; pass the value as the `model` argument when dispatching the verifier (default `sonnet`), the gauntlet critic (`inherit`) and research subagents (`haiku`). The main session's model is the user's choice.

1. **The session's own loop:** test, lint, build, output pasted; screens through a real browser (headless is fine), compared to the mock.
2. **Prove the test bites:** break the code on purpose; the suite has to go red. A suite whose tests accept any exception is green and worthless.
3. **Gauntlet when the bar is comparative** (`cycle:gauntlet`): design, prose, UX. Not when the bar is "exits 0".
4. **Verifier in fresh context** (agent `verifier`) with the plan's Proof.
5. **Swarm when a trigger lights** (`cycle:verification-gate`): money, hours, permission, schema, destructive data, user surface. The swarm replaces line-by-line human review; the human decides on the PR.
6. **Reach:** does the target user get to the surface?
7. **Protect the loop:** while fixing, tests are not edited.
8. Literal output → PR (`cycle:deploy`).
