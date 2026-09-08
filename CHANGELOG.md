# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/guiloureiromkt/cycle-engineering/releases/tag/v0.2.0
