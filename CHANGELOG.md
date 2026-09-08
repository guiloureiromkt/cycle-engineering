# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/guiloureiromkt/cycle-engineering/releases/tag/v0.2.0
