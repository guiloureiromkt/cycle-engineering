# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-09-13

0.5.0 built the measuring stick. This is the half that uses it: a cycle that closes writes a retro about itself from git, `cycle:evolve` gets four triggers instead of a wish, and a weekly routine reads what the retros say and proposes — without being able to merge anything.

Always-on context per session: **~1,950 tokens, unchanged** (no skill description changed).

### Added
- **`scripts/retro.mjs`** — the retro a closed cycle writes about itself, into `.cycle/work/<intent>/retro.md`, with the machine numbers above a marker and the session's own prose below it, labelled. `cycle:test` writes it when the proof is pasted; `cycle:deploy` writes it if test did not. `--repeats` lists findings that appear in two or more retros, which is how a lesson becomes a proposed line in the method's `CLAUDE.md` (as a branch, never a commit to the default branch).
- **`docs/routines/weekly-evolve.md`** — the weekly routine's definition, not a description of one: its prompt, the directory it must open in, a tool list with a reason for every forbidden command (`gh pr merge`, `git merge`, a push to a protected branch, any plugin install), the **"did not complete" artifact written before the work starts**, and the rule that a weekly full run and a pre-tag full run never both fire in the same week. `evals/results/cost-log.md` is how it knows.
- **`method_repo`** in `.cycle/config.json` — `null` everywhere except the repository that holds the cycle. There, `cycle:deploy` refuses to publish without a gate run pasted in the session, and does not lower the threshold to get one.
- **Cases 0009 and 0010**: the method repo that will not publish without its gate, and the closing cycle that writes its retro from git. `evals/run.mjs` can now build a **git history** for a fixture, at fixed times, so the numbers a case reads never depend on the day it runs.
- **"The owner" is a role in `docs/CONTRACT.md`**, with a designated backup — the Mule's demand from gate 4, and the honest answer to a method where every gate waits on one person.

### Changed
- **`cycle:evolve`**: four triggers, each naming what it reads and what it may write — a retro was written, the gate failed, the weekly routine, a person asked. "Monthly, or when a new model ships" invoked it zero times in nine days of real use.
- The retro's definitions, **measured before the script existed** (`evals/results/2026-09-13-retro-metrics.md`): rework as R7 defined it scored **11 and 8** on this repo's two closed cycles where a person says **1**, because rule 2 of `cycle:build` makes every build commit touch the plan by design. It counts instead the deviations the plan records and the spec amendments made after acceptance. Stage clocks run from the previous artifact's **acceptance**, not its creation — that alone took the intent → research gap from 185 minutes to 2. Stages written by one commit report an `overlap`, never a zero.
- **0003's judge became three regex graders.** The runner's own warning, on a 36,285-character plan: *"llm judges are noisy on long inputs, prefer a regex grader for large artifacts"*. Three judges had voted FAIL on a run that did nothing wrong.

### Through its own gate
`0001`, `0009` and `0010` at **1.00**, US$2.37 of the $15 ceiling, base `v0.5.0` (`evals/results/2026-09-13-0.6.0-gate.md`). It took **six** runs to get there — two failures were the method, one was the gate itself, three were the cases:

| | What failed | What it cost |
|---|---|---|
| the method | `cycle:test` assumed the retro script would run; the sandbox has no Node, so a cycle closed with no retro at all | US$0.62 |
| **the method, again** | handed "no questions", a run wrote `status: approved` and signed `approved_by: user (in-session) · fast-track`. Nobody had approved anything | US$2.15 |
| the gate | `--case` keeps only the last flag: the gate was **scoring one case and reporting the selection** | — |
| the cases | a `regex` grader's key is `target`, not `focus`; and a case file is validated **only when something selects it**, so a broken case sat in the suite looking fine | US$1.80 |
| the cases | a pattern that demanded the script's exact line failed a hand-written retro carrying the right numbers in its own layout | US$1.09 |

**Ablation** (`--ablation with-without`, the plugin against no plugin at all): `0001` **1.00 vs 0.33**, `0010` **1.00 vs 0.00**, `0009` **1.00 vs 1.00** — and that last one is reported, not hidden: a session with no cycle skills also refused to publish, because it had no runtime to run a gate with, so caution looked identical to compliance. `0009` is a regression guard, not evidence that `cycle:deploy` earns its keep.

### Three judges, three wrong verdicts
`0003`, `0008` and `0010` each had an `llm` grader vote FAIL on a run that had done nothing wrong — the last one on a retro that was correct line by line. All three are now deterministic: regex over the file the run creates, tool calls counted in the trace, and the conditions that cannot be mechanised written down as **named hand-checks** in each case's `case.meta.md`. A file grader (`regex`, `file_exists`) only sees files the run **creates**, which is why "the fixture's plan still says draft" became "the run never issued an edit that writes `status: accepted`".

### The confirming runs 0.5.0 owed
`0001` **passes at 1.00**. `0003` and `0005` failed only their graders, and the evidence says so: 0005's criteria asked for "all three" conditions and listed two, and 0003's judge was reading that 36k-character file. Both are fixed here; `0003`'s unprovable conditions became **named hand-checks** in its `case.meta.md`, because its fixture ships with the gates already recorded and a grader for them would pass without the run doing anything.

### Migration
`method_repo` defaults to `null`: nothing to do in a product repo. To run the weekly routine, set it to `"."` in the repository that holds your method.

## [0.5.0] - 2026-09-13

The method's own eval suite stops being a checklist a person ticks and becomes a scored suite the host runs, with a gate in front of every publish. This is the first half of "the cycle runs on itself": the measuring stick. The second half — a retro the cycle writes for itself and a weekly routine — is 0.6.0, deliberately separate, because a slice that rewrites every case cannot be scored by them.

Always-on context per session: unchanged (no skill or agent was added).

### Added
- **The suite is native.** Eight cases as `evals/<id>/case.yaml` (schema 1.1) with a `scaffold.sh` that seeds the workspace and typed graders: `tool_used` with `input_match`, `file_exists` with `exists: false`, `tool_order`, and `llm` judges pointed at the files a run produces. `claude plugin eval` scores them and its `--ablation with-without` arm is the RED→GREEN baseline `CONTRIBUTING.md` asks for. The JSON cases retire; `scripts/port-check.mjs` proves all 34 of their `accepted_if` lines landed as a grader or a named hand-check, reading the retired files from `git show v0.4.0:` so the check cannot go vacuous.
- **`npm run gate`** (`scripts/gate.mjs`): preflight, `npm test`, base resolution, the commit-shape rule, case selection, a bounded eval run. Ten tests in `tests/gate.test.mjs`. Its first act was to fail the commit of its own author.
- **`evals/coverage.json`**: every method file maps to cases, to the unit test that covers it deterministically, or to **declared debt** (`{uncovered, since}`) that the gate prints on every run. A file mapped by nothing fails. A test keeps the map from rotting; it caught a rename minutes after it was written.
- **Five local tags** (`v0.2.0` … `v0.4.0`), recovered from the commits that set each version: this working repository had **none**, so the gate had no base to compare against. `v0.4.0` sits at the commit that recorded the publish, because a tag marks what shipped.

### Changed
- `evals/run.mjs` is now the scaffold assembler a case calls, not a checklist printer. `evals/README.md` carries the case schema, the grader table and the two traps that cost real money (below). `skills/evolve/references/evals.md` and the user-facing `templates/eval-example/` move to the native format. `CONTRIBUTING.md` states the prerequisites, the real costs and the untrusted-scaffold rule; `docs/CONTRACT.md` documents the gate and the three run shapes.

### What the first honest run says
Eight cases, **three pass, overall 0.76, US$13.65, 23 minutes** (`evals/results/2026-09-13-port.md`). Two failures are real findings, not case defects: a run created files under `src/` from "approve it and implement" on a **draft** plan (the acceptance-by-word intent, now measured rather than suspected), and a fixture whose plan already records its gates cannot prove a dispatch. Three cases had their judges re-pointed and are **unconfirmed**: 0001, 0003 and 0005 have not been re-run.

### Two traps, paid for
- **A judge reading `focus: trace` sees only the first 12 and the last 12 messages.** On a 20-to-46-turn run it reads hook noise and misses the work. Every trace judge on a long run failed; every judge reading a produced file passed.
- **`scaffold_script` is `context.scaffold_script` and names a file.** Written as an inline command under `execution:` it is silently ignored, the workspace stays empty, and a case can score **1.00 while proving nothing** — which is exactly what the first port did before anyone noticed.
- The eval sandbox has **no `node` and no `npm`**: a case cannot expect `scripts/*.mjs` or `npm test` to run inside it.

### Migration
Nothing to do. `evals/` is the plugin's own suite; a user repo is untouched.

## [0.4.0] - 2026-09-12

Gate 4 stops being five fixed engineering voices. The owner's diagnosis (12/09): the council sat on marketing products for nine days with no marketing seat, and he improvised two seats by hand in a prompt. Before writing the plan, the premise was tested: on a coupon-and-banner plan, six pool seats with briefs only (no corpus, no skill) produced six demands the five engineering seats did not, at +11% tokens (`evals/results/2026-09-12-council-pool-experiment.md`).

Gate 4 measured on fixtures under the installed 0.4.0 (fresh `claude -p`): a nine-seat council plus the Mule plus the advocate cost US$4.6–5.4 per plan (0007); five seats plus the Mule US$2.6–2.8 (0008); lite mode with the council pending US$3.2 (0006). The council alone: five seats ≈24k tokens, eleven seats ≈26.5k (`evals/results/2026-09-12-council-pool-experiment.md`).

Always-on context per session: **~1,958 tokens**, measured with `claude plugin details cycle@cycle-engineering` on the installed 0.4.0 (2026-09-12). 0.3.0 measured ~1,888: the `joker` agent adds ~70. `npm run install-fresh` passes on a temporary HOME.

### Added
- `.cycle/council.json` (template `templates/council.json`, seeded by `/cycle:init`): five default seats, a pool (marketing, content, ux, ui, cx, brand-voice, commercial, legal, data) with whole-word triggers, optional `knowledge` (a corpus id) and `skill` (a host skill as lens — Anthropic's knowledge-work plugins, installed separately), a `cap` of nine, the Mule's `domains`, the scenario horizons and paths.
- `scripts/resolve-seats.mjs` (`npm run resolve-seats`): plan + council file → seats, dropped seats with reason, a summary line and a cost hint. `tests/council.test.mjs` covers the template's shape, fixture g's resolution, the cap, `--extra`, and the no-file defaults.
- `agents/joker.md`: the Mule. Dispatched separately, in a fresh context, on `models.joker` (default `sonnet`), after the risks table is committed; one improbable external shock, what breaks, what survives, one demand or "survives as is".
- Evals `0007-council-seats-by-trigger` (fixture g) and `0008-council-all-agree` (fixture h); `evals/run.mjs` accepts `config` and `council` per case.

### Changed
- `agents/council.md`: takes the resolved seat list; `Skill` tool so a named lens can be applied; the scenario seat is unweighted, cites its drivers' sources, writes `Signposts:`; demands are tagged with seat ids; knowledge-backed seats summarise and never quote sensitive content verbatim; when every seat says "no demand" the last line is a warning, not a pass.
- `cycle:plan`: gate 3 is narrowed to causes inside the plan; gate 4 runs the resolver, keeps lite mode's one question (now with seat ids, count and cost), dispatches the council, writes and commits the risks table, then dispatches the Mule; records `council:` and `joker:` in the plan's frontmatter. `templates/plan.md` gains those keys and a `## Signposts` section.
- `cycle:maintain`: reads `## Signposts` of the plans shipped since the last review.
- `docs/CONTRACT.md`, README (the "council of five" line, Configure), `README.pt-BR.md`.

### Migration
Repos without `.cycle/council.json` get the template's defaults; run `/cycle:init` again to seed the file (it never overwrites). `models.joker` missing = `sonnet`.

## [0.3.0] - 2026-09-12

The ring gains a stage. An accepted intent says what hurts; nobody decides how to solve it before looking at how it has been solved. Research sits between intent and spec, and the devil's advocate opens on the research's weakest assumption. The owner's diagnosis behind it, from nine days of real use: "ele toma decisões sem saber tanto das coisas" — the method decided on 40-line tables written by the cheapest model, with one benchmark anchoring whole products.

Always-on context per session: **~1,888 tokens**, measured with `claude plugin details cycle@cycle-engineering` on the installed 0.3.0 (2026-09-12). 0.2.2 measured ~1,816: the research skill adds ~72. `npm run install-fresh` passes on a temporary HOME.

### Added
- `cycle:research`: stage 2. `research/<name>.md` (template `templates/research.md`) with five sections — what we know (sourced, dated, typed by confidence), what the market does (three to five benchmarks, direct and indirect, used not read, evidence with a date), what we assume (each with a cheap check), what we did not check, a recommendation for the spec. Depth by trigger: `shallow` for a bug or an S change, `standard` for a user surface, screen, data, market or design claim, `deep` for a new product or money. The artifact is committed next to `specs/` because it authorizes the spec.
- `evals/grade-research.mjs` (`npm run grade-research`): machine checks on a research artifact and on a spec's `research:` link. Proven to fail on the template and pass on the fixtures (`evals/results/2026-09-12-grader.md`). `tests/grader.test.mjs` keeps it honest inside `npm test` (52 tests).
- Measured on eval 0004 under real conditions (fresh `claude -p`, installed 0.3.0, `standard` depth): 3.0 minutes, US$3.55, 13 web calls plus one researcher subagent, five dated benchmarks. Three runs were needed to reach 6/6; the two misses each became a sentence in the skill (the deeper trigger wins; five benchmarks is a ceiling; an inference repeats its source). No accepted intent on the author's machine qualified for a `deep` run on release day; the first real one will be measured and added here.
- `evals/0004-route-to-research` with its behavioral RED on 0.2.2 (`evals/results/2026-09-12-0004-red.md`: route to spec, zero sources, zero benchmarks) and `evals/0005-spec-exists-no-research` (artifacts from before this release are never sent back to research). Fixtures `d` and `e`; fixtures `a` and `c` carry a done research so 0001 and 0003 keep their meaning. `evals/run.mjs` now writes the `CLAUDE.md` block into every fixture, which is what lets a subagent route (`evals/results/2026-09-12-harness.md`).
- `.cycle/config.json`: `models.sweeps` (the cheap pass 1 inside `cycle:intent`, `haiku`) split from `models.research` (the stage-2 researcher, now `inherit`); `knowledge: []` for the user's own sources (`{name, kind, id, areas}`).

### Changed
- `cycle:using-cycle`: one routing row for research and **one** skip rule — the existing shortcut (no trigger, one file, existing test) skips research and spec together and writes `research: skipped · shortcut` in its ten-line plan. A spec that already exists is never routed back to research.
- `/cycle`: lists `research/`, states "→ Research" before "→ Spec", and prints "specs without a research artifact: N of M". `/cycle:init`: the folder list it never creates includes `research/`. The `CLAUDE.md` block names the eight-stage ring. `session-start` counts `research/` (hook test added).
- `cycle:intent`: §3 is research pass 1 on `models.sweeps`; hands over to `cycle:research`. `cycle:spec`: precondition is a done research named in the spec's frontmatter; the visual reference is the benchmarks table, not a new image search. `cycle:plan`: dispatches the advocate and the council with four paths (plan, spec, intent, research); technical unknowns are appended to the research file. `cycle:test`: models line.
- `agents/devils-advocate.md`: question 1 starts from the research's "What we assume" and "What we did not check"; a missing research path is finding 0. `agents/council.md`: reads the research; a seat contradicting a sourced finding says which.
- README (eight stages, the reason before the table, `knowledge` and `sweeps` documented), `README.pt-BR.md` (step 4), `docs/CONTRACT.md`, `docs/loop.svg` regenerated by `docs/loop.py`.

### Migration (repos initialized on 0.2.x)
In `.cycle/config.json`: add `"sweeps": "haiku"` under `models` and set `"research": "inherit"` (or delete the `research` key: missing = inherit). `knowledge` is optional. Existing specs without a `research:` key are counted by `/cycle` as "(pre-0.3.0)" and never sent back.


### Fixed
- README: the demo image pointed at `docs/demo.gif`, a file that never existed. The first thing a visitor saw was a broken image. The line is gone until the GIF is recorded (`intent/2026-09-12-the-first-ten-seconds.md`).

### Changed
- README, `README.pt-BR.md` and the `CLAUDE.md` block template now say where to open the session: inside the repository. Every hook resolves `.cycle/` from the session's start directory, and in the author's own use 524 of 535 messages between 03/09 and 12/09 came from sessions started in a notes vault, so no gate ran on any product repository. The wording is the mitigation; the fix is the 04/09 intent.
- Ten new intents and one evidence addendum from the first retrospective of real use (`.cycle/work/evolve/2026-09-12.md`), each carrying its RED excerpt from a session transcript.

## [0.2.2] - 2026-09-08

The published tree catches up with what the repository actually holds: the evals and the tests go in, and an orphan example goes out.

### Added
- `evals/` and `tests/` are now part of the published tree. `CONTRIBUTING.md` tells a contributor that `npm test` must pass on the pull request, and until now the published repository shipped neither the tests nor the eval suite that sentence refers to.

### Removed
- `examples/plano-desconto-checkout.md`, and the `examples/` folder with it. It was 29 KB of Portuguese carrying the pre-rename frontmatter keys (`tipo`, `status: rascunho`, `aceito-por`, `portoes`) and four references to `ciclo:` skills that no longer exist, in a repository whose 0.2.0 entry promised English throughout. Nothing linked to it: not the README, not `cycle:plan`, which stopped pointing at it during the rename. The decision to translate it or drop it was handed to the merge owner at release and never taken; it is taken here. The same document lives on, migrated to the English contract, as the fixture behind `evals/0003-five-gates`.

## [0.2.1] - 2026-09-08

Prompt audit of the bundled skills against the [Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) and [Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) prompting guides. The nine skills copied from other projects were written for an earlier model generation, where forcefulness was load-bearing; on the current generation the same text over-applies, and an anxious prompt produces a hedging model. The twenty skills written for this plugin passed the audit with no findings.

The report and the per-finding patch stay in the working repository, under `.cycle/`, which is not part of the published tree.

### Added
- `evals/`: the three cases the 0.2.0 entry below already described, built at last. `0001-route-to-spec`, `0002-plan-without-intent` and `0003-five-gates`, each with the real run behind it, the prompt as it was asked, an `accepted_if` checklist, and a fixture repository under `evals/fixtures/{a,b,c}/`. `npm run evals` assembles each fixture into a scratch directory, adds the `.cycle/` that turns the plugin on, and prints the prompt and the checks. `evals/README.md` covers how to run them and why they are JSON: `claude plugin eval`, the native runner, answers `plugin eval is currently in early access` on this account, so the case files wait for it.

### Changed
- `cycle:verify-before-done`: the Iron Law block, the Gate Function pseudo-code, the Red Flags list, the Rationalization Prevention table and the "if you lie, you'll be replaced" line give way to the tested instruction from the Fable 5 guide's *Ground progress claims during long runs*, which Anthropic reports nearly eliminated fabricated status reports. The Common Failures table and the evidence patterns stay. 141 lines to 68.
- `cycle:tdd`: the Iron Law and its no-exceptions list become the rule with the reason attached — a test written to fit code that already exists passes whether or not that code is right.
- `cycle:subagent-driven-development` (`spec-reviewer-prompt.md`): "The implementer finished suspiciously quickly" removed. It was a false premise injected into every reviewer dispatch, priming the reviewer before it opened a file. The fresh-context reviewer itself stays; the Fable 5 guide backs it.
- `cycle:brainstorming`: three `MUST` lowered to plain statements. The rule that the visual-companion offer travels as its own message stays, now carrying its reason: it asks consent to open a local URL.
- `cycle:parallel-agents`: pointer to `cycle:task-graph`, which holds the false-edge test and the merge-owner rule this skill omitted.
- `CONTRIBUTING.md` and `CREDITS.md`: a bundled copy may now diverge from upstream when the change belongs to this method rather than to the upstream project. A diverged copy declares it on its `Source:` line with the date and the entry behind it, and is refreshed by merge from then on; `cycle:evolve` must not overwrite a declared divergence. The five skills above are the first to carry the marker.

Deliberately kept: the `MUST FAIL` in the red-green cycle, the three technical `NEVER`s in `testing-anti-patterns.md`, the gitignore check before creating a worktree, the required plan header, and the urgency in `cycle:brainstorming`'s trigger description — routing text may carry calibrated urgency.

The evals now exist, but they have not been run against this release: the five removals above still ship as hypotheses, with no RED to GREEN baseline attached. Running the three cases is the next step, and the 0.2.0 entry below should be read as having described them a release early.

## [0.2.0] - 2026-09-03

First public release, as `cycle` in the `cycle-engineering` marketplace. Everything before this was a Portuguese prototype on one machine.

Always-on context per session: **~1,816 tokens**, measured with `claude plugin details cycle` on the installed 0.2.0 plugin (2026-09-04). That is above the 1,500 bar the plan set for the bundled-copies option; the heaviest always-on entries are `gauntlet` (~150), `verification-gate` (~120) and `using-cycle` (~110). Open before the tag: trim descriptions or move to dependencies.

### Added
- Hooks in Node, dispatched through `hooks/run.sh`: `session-start`, `pre-bash` (production gate, plan-sync and snapshot-guard in one process), `protect-cycle`, `stop-uncommitted`. Every hook fails loud (exit 2 with a message) when something is missing; nothing exits 0 in silence.
- Save rules: one commit per numbered plan task; a `Stop` reminder when an accepted plan has uncommitted changes (at most once per 30 minutes); a dated snapshot required before destructive commands; `.cycle/work/<intent>/` for intermediates; a restore test newer than 30 days required for production deploy when `stateful: true`.
- Configurable production gate: `.cycle/gate.json` `patterns` for the repo's own deploy commands, plus conservative defaults and `protected_branches` in `.cycle/config.json`.
- Gate modes in `.cycle/config.json`: `gates: lite` (default; council suggested in one question when a trigger lights) and `gates: full`.
- Model routing per sub-agent: `models` in `.cycle/config.json`, passed as `model` when dispatching.
- Bundled skills with license and `Source:` line: `cycle:brainstorming`, `cycle:writing-plans`, `cycle:executing-plans`, `cycle:subagent-driven-development`, `cycle:tdd`, `cycle:verify-before-done`, `cycle:parallel-agents`, `cycle:worktrees` (obra/superpowers, MIT); `cycle:gauntlet` (Shumer/robonuggets, CC BY 4.0).
- Skills written for the plugin: `cycle:verification-gate`, `cycle:task-graph`, `cycle:adoption-filter`.
- `evals/0001-route-to-spec`, `0002-plan-without-intent`, `0003-five-gates`: the three green scenarios as the first evals, with fixtures and `accepted_if`.
- `tests/hooks.test.mjs` (`npm test`) and `tests/install-fresh.sh` (clean install in a temporary `HOME`).
- Public surface: `README.md` in English, `README.pt-BR.md` with the first-cycle guide, `CONTRIBUTING.md`, `CREDITS.md`, `LICENSES/`, `docs/loop.svg`, `docs/demo.gif`.

### Changed
- Name: marketplace `ciclo` is now `cycle-engineering`; plugin `ciclo` is now `cycle`; skills `ciclo:*` are now `cycle:*`; commands `/ciclo`, `/ciclo:iniciar`, `/ciclo:triagem` are now `/cycle`, `/cycle:init`, `/cycle:triage`; agents `verificador`, `advogado-do-diabo`, `conselho` are now `verifier`, `devils-advocate`, `council`.
- Language: English in every skill, agent, command, hook, template and error message. Frontmatter keys `type`, `status`, `author`, `date`, `origin`, `intent`, `spec`, `accepted_by`, `approved_by`, `gates`. Statuses `draft`, `accepted`, `approved`, `closed`. The plan-sync phrase is `plan: unchanged` (or `[plan-ok]`).
- Folders in a user repo: `intent/`, `specs/`, `plans/`, `evals/`, `.cycle/`.
- `/cycle:init` creates only `.cycle/` and the block between `<!-- cycle:start -->` and `<!-- cycle:end -->` in `CLAUDE.md`. It no longer copies templates; skills read them from the plugin root printed by the session hook.
- Session start speaks in every repo: one short line pointing to `/cycle:init` when there is no `.cycle/`, the full state when there is. Only `.cycle/` turns the plugin on; a `plans/` folder alone no longer does.
- Production gate defaults narrowed to explicit markers. `docker compose up` and `git push` to an unprotected branch no longer block.

### Removed
- `jq` and `python3` as undeclared dependencies.
- The bash hooks `production-gate.sh`, `plan-sync.sh`, `session-start.sh`.
- Every reference to a skill, path or person outside this repository.

## [0.1.x] - 2026-09-03 and earlier

Portuguese prototype, local only. Plugin `ciclo`, bash hooks depending on `jq`, skills coupled to the author's own skill library and knowledge base. Never published.

[Unreleased]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/guiloureiromkt/cycle-engineering/releases/tag/v0.2.0
