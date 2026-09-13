---
name: evolve
description: Use when a new model, skill or practice appears; when the repo's CLAUDE.md, skills or hooks change; after every fixed incident; and after every complete cycle (intent → PR), for the method's retrospective.
---

# Evolve (the stage outside the ring)

Most playbooks stop at maintain. The cycle adds an agent that watches the method itself. Four fronts. Everything it produces is a **proposal**: an intent or a PR. It never changes the method on its own.

## When it runs
Not "monthly, or when a new model ships" — that is a wish, and nothing invoked it for nine days of real use. Four triggers, each with what it reads and what it may write:

| Trigger | It reads | It may write |
|---|---|---|
| **A retro was written** (`.cycle/work/<intent>/retro.md`) | that retro, and the plan it measures | an `intent/` about the method, `origin: agent` |
| **`npm run gate` failed** | the failing case's report and the diff that broke it | an `intent/`, or a branch fixing the case when the case is what is wrong |
| **The weekly routine** (`docs/routines/weekly-evolve.md`) | every retro since the last run, `--repeats`, `intent/`, the declared-debt count | `.cycle/work/evolve/<date>.md`, intents, a branch for a docs-only fix |
| **A person asks** | whatever they point at | whatever they ask for, still as a proposal |

None of the four may merge, push to a protected branch, install or update a plugin, or edit the gate's threshold or cost ceiling.

## 1 · Watch what appeared
Monthly, or when a new model ships. A subagent reads the host's release notes, new skills and plugins in public registries and marketplaces, and what peers publish. Each finding goes through `cycle:adoption-filter` and becomes `intent/<date>-<name>.md` with `origin: agent`. The repo's product owner accepts.

## 2 · Evals: the method has a regression test
An eval is a real task plus what counts as accepted, as `evals/<id>/case.yaml` with a `scaffold.sh` that seeds the workspace (template in the plugin root; details in `references/evals.md`). The host scores them: `claude plugin eval`. Build the suite from real tasks with an accepted result, and prefer a grader that reads a **file the run produced** over one that reads the conversation — a trace judge sees only the first and last dozen messages of a long run, which is how a suite goes green on nothing. A fixed incident becomes a permanent case, written by whoever handled it. Before a publish, `npm run gate` selects the cases covering what changed and scores them; `evals/coverage.json` says, for every method file, which case covers it, which unit test covers it deterministically, or why it is **declared debt**.

## 3 · Retrospective of the cycle itself
Written by `scripts/retro.mjs <intent>` at the close of every cycle (`cycle:test`, or `cycle:deploy` if test did not), into `.cycle/work/<intent>/retro.md`. The numbers come from git and from the artifacts, never from the session's own account of how the work went.

What it measures, and why not the obvious thing: **rework is not "plan commits after the first code commit"** — rule 2 of `cycle:build` makes every departure update the plan in the same commit, so that definition scored 11 and 8 on this repo's two closed cycles where a person said 1 (`evals/results/2026-09-13-retro-metrics.md`). It counts instead the **deviations** the plan itself records and the **spec amendments** made after the plan was accepted. Stage clocks run from the previous artifact's **acceptance**, not its creation; two stages written by one commit report an `overlap`, never a zero gap; anything git cannot answer says `not computable: <reason>`.

Where the cycle jammed becomes an intent about the method. A finding that shows up in **two** retros (`scripts/retro.mjs --repeats`) becomes a proposed line under "What Claude gets wrong here" in the method repo's `CLAUDE.md` — as a branch, never committed to the default branch by an agent.

## 4 · Rewrite the skills themselves
From the evals and the retro, the agent opens a **PR against the plugin repository** changing skills, templates or hooks. The PR carries the eval or retro that motivated it, prefixed `evolve:`. A human reviews. Every changed skill ships with a RED → GREEN baseline: what the agent did without the change, what it did with it. Bundled skills carry an upstream SHA in their `Source:` line; compare it to the upstream and propose a refresh when they drift.

## Output
Short report: what appeared and became an intent · eval pass rate and what changed · what the retro found · PRs open on the plugin. Store it in `.cycle/work/evolve/<date>.md`.

## Common mistakes
- Switching models "because it shipped" without running the evals.
- Adopting an external skill directly, without an intent and without the filter.
- Changing a cycle skill without a baseline.
