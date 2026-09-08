# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-09-08

Prompt audit of the bundled skills against the [Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) and [Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) prompting guides. The nine skills copied from other projects were written for an earlier model generation, where forcefulness was load-bearing; on the current generation the same text over-applies, and an anxious prompt produces a hedging model. The twenty skills written for this plugin passed the audit with no findings.

The report and the per-finding patch stay in the working repository, under `.cycle/`, which is not part of the published tree.

### Changed
- `cycle:verify-before-done`: the Iron Law block, the Gate Function pseudo-code, the Red Flags list, the Rationalization Prevention table and the "if you lie, you'll be replaced" line give way to the tested instruction from the Fable 5 guide's *Ground progress claims during long runs*, which Anthropic reports nearly eliminated fabricated status reports. The Common Failures table and the evidence patterns stay. 141 lines to 68.
- `cycle:tdd`: the Iron Law and its no-exceptions list become the rule with the reason attached — a test written to fit code that already exists passes whether or not that code is right.
- `cycle:subagent-driven-development` (`spec-reviewer-prompt.md`): "The implementer finished suspiciously quickly" removed. It was a false premise injected into every reviewer dispatch, priming the reviewer before it opened a file. The fresh-context reviewer itself stays; the Fable 5 guide backs it.
- `cycle:brainstorming`: three `MUST` lowered to plain statements. The rule that the visual-companion offer travels as its own message stays, now carrying its reason: it asks consent to open a local URL.
- `cycle:parallel-agents`: pointer to `cycle:task-graph`, which holds the false-edge test and the merge-owner rule this skill omitted.
- `CONTRIBUTING.md` and `CREDITS.md`: a bundled copy may now diverge from upstream when the change belongs to this method rather than to the upstream project. A diverged copy declares it on its `Source:` line with the date and the entry behind it, and is refreshed by merge from then on; `cycle:evolve` must not overwrite a declared divergence. The five skills above are the first to carry the marker.

Deliberately kept: the `MUST FAIL` in the red-green cycle, the three technical `NEVER`s in `testing-anti-patterns.md`, the gitignore check before creating a worktree, the required plan header, and the urgency in `cycle:brainstorming`'s trigger description — routing text may carry calibrated urgency.

Not verified: this repository has no evals (`evals/` holds only `.gitkeep`, though the 0.2.0 entry below lists three), so the five removals ship as hypotheses with no RED to GREEN baseline attached. Building that baseline is the next intent.

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

[Unreleased]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/guiloureiromkt/cycle-engineering/releases/tag/v0.2.0
