# Evals

A skill is a prompt, and the only proof a prompt works is what the agent does with it. These are the method's own tests: a real task that was once run and accepted, plus what counts as accepted, so a change to a skill can be judged instead of argued about.

## Why this format and not the native runner

Claude Code ships `claude plugin eval`, which reads `evals/**/case.yaml` (or `prompt.md` plus `graders/*.md`), runs a no-plugin baseline arm and scores the result. That is the better home for these cases and the intended destination. It is in early access and not open on this account yet — `claude plugin eval init` answers `plugin eval is currently in early access` — so the cases live here as the JSON described in `skills/evolve/references/evals.md`, and `npm run evals` assembles them. When the runner opens, translate the `prompt` and `accepted_if` fields into case files and keep the JSON only as the record of where each case came from.

## What a case is

One directory per case: `evals/<id>/case.yaml`, a `scaffold.sh` that seeds the workspace, and `case.meta.md` carrying provenance and any hand-check the graders cannot express. The authoritative reference is the host's own documentation (`claude plugin eval --help`, and the plugin-evals page); what follows is what this suite uses and the traps it already fell into.

```yaml
schema_version: "1.1"          # 1.1, not 1.0
name: 0002-plan-without-intent
description: one line: the situation the case puts the method in
runs: 1                        # the gate uses 1; the full run uses 3
context:
  scaffold_script: scaffold.sh # a FILE in the case directory — not an inline command
execution:
  prompt: "the task, in the words it was really asked"
  allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
  max_turns: 45
  timeout_seconds: 900
graders:
  - type: tool_used
    name: the-router-fired     # every grader needs a name
    arm: with-only             # a plugin-fired indicator, not scored in the no-plugin arm
    tool: Skill
    input_match: "cycle:using-cycle"
```

`scaffold.sh` runs **in the empty workspace**, as you, only under `--scaffold`. `$PWD` is the workspace and `$0` is the script's absolute path, so a case seeds itself with:

```bash
node "$(dirname "$0")/../run.mjs" --assemble <case-id> --out "$PWD"
```

### The grader types this suite uses
| type | asserts | the trap |
|---|---|---|
| `tool_used` | calls to `tool` whose JSON input matches `input_match`, between `min` (default 1) and `max` | `min: 0, max: 0` is how you assert a tool was never called |
| `tool_order` | `before` and `after` were both called, in that order | each is a tool name or `{tool, input_match}` |
| `file_exists` | a file **Claude created** matches the `path` glob, or none does with `exists: false` | it only sees files created **during the run**: a file the scaffold wrote, or one Claude merely modified, is invisible to it. "Nothing under `src/` changed" therefore needs an `llm` grader over the trace |
| `regex` | a pattern in the **`target`** (`last_message` by default, or `trace`, `files`, `{source: file, path: …}`) | the key is `target`, not `focus` (that one is the `llm` grader's) — and like `file_exists` it only sees files the run **creates**, so a fixture file cannot be asserted this way. To check that the run did not change something, count tool calls with `tool_used` and `max: 0` |
| `llm` | a judge votes PASS in at least two of three votes | `focus` picks what it reads: `last_message`, `trace`, `files`, or `{source: file, path: …}` to grade a file the run produced |
| `baseline` | the run is at least as good as a reference transcript | |

**A case file is validated only when it is selected.** `--tag` or `--case` that matches nothing validates nothing, so a broken case can sit in the suite looking fine until the day the gate picks it. To check a case you just wrote, select it: `claude plugin eval . --trust-plugin --ablation none --case '<id>' --max-cost-usd 0.02`. It loads, warns about what cannot pass, prints the deterministic graders, and stops on the ceiling for about twenty cents.

Prefer deterministic graders. Every `llm` grader is named in the case's `case.meta.md`, so the drift risk stays visible.

### A judge over a long file votes noise
On a 36,285-character plan, three judges voted FAIL on a run that had done nothing wrong — and the runner said so itself in the grader's own explanation: *"long file (36285 chars); llm judges are noisy on long inputs, prefer a regex grader for large artifacts"*. Same family as the trace trap below: **the bigger the input, the less a judge is reading it.** For a large artifact, assert the two or three things that actually distinguish a good run with `regex`, and write the rest down as a named hand-check in the case's `case.meta.md`.

### What the eval sandbox does not have
`node` and `npm` are **not installed** in the run's sandbox — more precisely, `node`, `npm` and `npx` on `PATH` are symlinks into a directory the sandbox cannot read, so they resolve as broken, and no `bun` or `deno` either (a run reported this itself on 13/09). A case cannot expect `scripts/*.mjs` or `npm test` to run there; a good run applies the logic by hand and says so, and the criteria must accept that. Found on 2026-09-13 when a run that did everything right was failed by a judge demanding the resolver's printed summary.

### 🩸 The false green, 2026-09-13
The first port of `0002` scored **1.00** and proved nothing: `scaffold_script` had been written as an inline command under `execution:`, which the loader silently ignored, so the agent ran in an **empty workspace**. "No file under `src/` changed" was vacuously true and the judge passed a run that had nothing to do. The lesson is in the suite now: a case whose fixture matters carries a `file_exists` grader for something the fixture makes possible, so an empty workspace fails loudly instead of passing quietly.

## Running

```bash
npm run evals            # every case once, no ablation arm, ceiling $25 — what the gate uses
npm run evals:full       # three runs per case with the no-plugin arm — weekly, and before a minor tag
npm run gate             # npm test, the commit-shape rule, then the cases covering what changed
npm run port-check       # nothing was lost when the JSON cases retired
npm run grade-research research/<name>.md [specs/<name>.md]   # machine checks on a research artifact
```

Every run needs `--scaffold` (off by default, or the workspace stays empty) and `--trust-plugin` in a
non-interactive shell. Tools beyond the read-only set need `--allow-tools` as well as the case's own
`allowed_tools`; the runner warns when a grader asks for a tool the operator did not grant.

The results of a run land in `results/<timestamp>/` (and `--json <path>` writes the machine-readable
document). What each run cost is part of the record: see `results/2026-09-13-*.md`.

## Where new cases come from

`cycle:evolve` writes one. Every fixed incident becomes a permanent case, written by whoever handled it while the context is still fresh. A case that stopped discriminating — every run passes, or every run fails for reasons that have nothing to do with the method — leaves.

## The cases

| Case | Fixture | What it holds the method to |
|---|---|---|
| `0001-route-to-spec` | `a` | An accepted intent and a hurried user asking for code. Routing wins over hurry: the run goes to `cycle:spec` and touches no source file |
| `0002-plan-without-intent` | `b` | A plan-looking file in the repository root, outside `plans/` and without frontmatter. It does not count as a plan, and the run goes back to `cycle:intent` |
| `0003-five-gates` | `c` | An approved spec and a draft plan. The five gates run, the plan comes out with real risks in it, and the status stays `draft` because accepting is a person's job |
| `0004-route-to-research` | `d` | An accepted intent and a hurried user. The run goes to `cycle:research`, not to the spec, and the artifact passes `npm run grade-research` (sources with dates, three to five benchmarks, a cheap check per assumption); RED on 0.2.2 in `results/2026-09-12-0004-red.md` |
| `0005-spec-exists-no-research` | `e` | A spec and a draft plan from before the research stage existed. The router never sends them back to research |
| `0006-gates-read-research` | `f` | A done research and a draft plan with no gates. The devil's advocate is dispatched with the research path and its first finding names one of its assumptions |
| `0007-council-seats-by-trigger` | `g` | A coupon-and-banner plan: the resolver lights marketing, content, ux and cx; the council answers with tagged demands and a scenario table with signposts; the Mule is dispatched after the risks table is committed |
| `0008-council-all-agree` | `h` | A README typo: no pool seat lights; if every seat says 'no demand', the council closes with the warning line |
