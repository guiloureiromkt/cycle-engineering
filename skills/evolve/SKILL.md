---
name: evolve
description: Use when a new model, skill or practice appears; when the repo's CLAUDE.md, skills or hooks change; after every fixed incident; and after every complete cycle (intent → PR), for the method's retrospective.
---

# Evolve (the seventh stage)

Most playbooks stop at maintain. The cycle adds an agent that watches the method itself. Four fronts. Everything it produces is a **proposal**: an intent or a PR. It never changes the method on its own.

## 1 · Watch what appeared
Monthly, or when a new model ships. A subagent reads the host's release notes, new skills and plugins in public registries and marketplaces, and what peers publish. Each finding goes through `cycle:adoption-filter` and becomes `intent/<date>-<name>.md` with `origin: agent`. The repo's product owner accepts.

## 2 · Evals: the method has a regression test
An eval is a real task plus what counts as accepted, in `evals/<id>.json` (template in the plugin root). Start with 20 to 50 recent real tasks with an accepted result; run them in CI on any PR that touches `CLAUDE.md`, `.claude/**`, skills or hooks, on a daily cron, and on every new model. A change that lowers the pass rate is reviewed before merge. A fixed incident becomes a permanent eval, written by whoever handled it. Details: `references/evals.md`.

## 3 · Retrospective of the cycle itself
After each complete cycle, the agent reads the artifacts (intent → spec → plan → PR) and the git log and measures: time between the commits of each stage (leading indicators), rework (spec commits after the first plan; plan commits after the first code), review findings that cite a policy (they should fall to zero if the policy skill works). Where it jammed becomes an intent about the method.

## 4 · Rewrite the skills themselves
From the evals and the retro, the agent opens a **PR against the plugin repository** changing skills, templates or hooks. The PR carries the eval or retro that motivated it, prefixed `evolve:`. A human reviews. Every changed skill ships with a RED → GREEN baseline: what the agent did without the change, what it did with it. Bundled skills carry an upstream SHA in their `Source:` line; compare it to the upstream and propose a refresh when they drift.

## Output
Short report: what appeared and became an intent · eval pass rate and what changed · what the retro found · PRs open on the plugin. Store it in `.cycle/work/evolve/<date>.md`.

## Common mistakes
- Switching models "because it shipped" without running the evals.
- Adopting an external skill directly, without an intent and without the filter.
- Changing a cycle skill without a baseline.
