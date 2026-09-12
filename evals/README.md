# Evals

A skill is a prompt, and the only proof a prompt works is what the agent does with it. These are the method's own tests: a real task that was once run and accepted, plus what counts as accepted, so a change to a skill can be judged instead of argued about.

## Why this format and not the native runner

Claude Code ships `claude plugin eval`, which reads `evals/**/case.yaml` (or `prompt.md` plus `graders/*.md`), runs a no-plugin baseline arm and scores the result. That is the better home for these cases and the intended destination. It is in early access and not open on this account yet — `claude plugin eval init` answers `plugin eval is currently in early access` — so the cases live here as the JSON described in `skills/evolve/references/evals.md`, and `npm run evals` assembles them. When the runner opens, translate the `prompt` and `accepted_if` fields into case files and keep the JSON only as the record of where each case came from.

## What a case is

One `NNNN-<name>.json` per case:

| Field | What it holds |
|---|---|
| `id` | `NNNN-<short-name>`, matching the filename |
| `origin` | The real task or incident behind it, with its date. Never an invented scenario — accepted results are the ground truth |
| `fixture` | The directory under `fixtures/` that the run starts from |
| `prompt` | The task as it was actually requested, wording included |
| `accepted_if` | Checks a reviewer or a script can confirm, each one true or false on its own |
| `tools` | The restricted tool set the run may use |

## Running

```bash
npm run evals              # assembles all three
npm run evals -- --case=0002
npm run grade-research research/<name>.md [specs/<name>.md]   # machine checks on a research artifact
```

The command copies each fixture to a scratch directory and adds the `.cycle/` that turns the plugin on — the fixtures stay plain sample repos in the tree, so nothing here is mistaken for the plugin's own configuration. It prints, per case, the working directory, the prompt and the checklist. It does not drive the agent.

The run itself is one fresh subagent per case, with its working directory set to the printed path and no context from this repository. Then check the boxes by hand and write the result to `results/<date>.md`: which case, which checks passed, and the excerpt that proves each one. A failing check is a bug in the skill, not a criterion to soften.

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
