# Naming contract (read before touching anything)

Marketplace: `cycle-engineering` (repo name). Plugin: `cycle`. Install: `claude plugin marketplace add guiloureiromkt/cycle-engineering` then `claude plugin install cycle@cycle-engineering`. Local during build: `claude plugin marketplace add <path to this working copy>`.

## Names
- Skills (own, 10): `cycle:using-cycle`, `cycle:intent`, `cycle:research`, `cycle:spec`, `cycle:plan`, `cycle:build`, `cycle:test`, `cycle:deploy`, `cycle:maintain`, `cycle:evolve`.
- Skills (bundled copies from obra/superpowers, MIT, 8): `cycle:brainstorming`, `cycle:writing-plans`, `cycle:executing-plans`, `cycle:subagent-driven-development`, `cycle:tdd`, `cycle:verify-before-done`, `cycle:parallel-agents`, `cycle:worktrees`.
- Skills (bundled, other): `cycle:gauntlet` (Shumer/robonuggets, CC BY 4.0).
- Skills (own, rewritten in English, 3): `cycle:verification-gate`, `cycle:task-graph`, `cycle:adoption-filter`.
- Commands: `/cycle`, `/cycle:init`, `/cycle:triage`. Agents: `verifier`, `devils-advocate`, `council`, `joker` (the Mule).
- Any `cycle:<name>` referenced anywhere must exist as `skills/<name>/SKILL.md` (`tests/refs.test.mjs` enforces). Bundle it or rewrite the line.

## Files in a user repo
`intent/`, `research/`, `specs/`, `plans/`, `evals/`, `.cycle/` (`config.json`, `gate.json`, `council.json`, `release-approval`, `work/<intent>/`, `work/.stop-warned`).
`research/<name>.md` is committed next to `specs/` and `plans/`, not under `.cycle/work/`, because it authorizes the spec (the same reason the intent is committed). Its evidence (screenshots) lives under `research/<name>/`.
`/cycle:init` creates ONLY `.cycle/` (config.json, gate.json, work/.gitkeep, .gitignore) and the CLAUDE.md block. It never copies templates. Skills read templates from the plugin root printed by the session hook (`plugin root: <path>`).
CLAUDE.md block lives between `<!-- cycle:start -->` and `<!-- cycle:end -->`; init and uninstall operate only inside the markers.

## Frontmatter
Keys: `type`, `status`, `author`, `date`, `origin`, `intent`, `research`, `spec`, `depth`, `accepted_by`, `approved_by`, `gates`, `council`, `joker`.
Statuses: intent `draft|accepted|closed` · research `draft|done` · spec `draft|approved` · plan `draft|accepted`.

## Magic strings
- Commit message containing `plan: unchanged` or `[plan-ok]` satisfies plan-sync.
- `.cycle/work/<intent>/snapshot.md` modified less than 60 minutes ago (mtime) satisfies snapshot-guard.
- Release: env `RELEASE_APPROVAL` or `.cycle/release-approval` containing today's date (YYYY-MM-DD). Written by a human outside the agent; `protect-cycle` blocks the agent from writing it or removing `.cycle/`.
- While plugin `ciclo` 0.1.2 is installed on this machine, commits in THIS repo that touch non-.md files carry `(plano: sem mudança)` or stage `plans/`. After `cycle` 0.2.0 is installed: `(plan: unchanged)`.

## Config (`.cycle/config.json`)
```json
{ "gates": "lite", "stateful": false, "protected_branches": ["main"],
  "models": { "advocate": "inherit", "council": "sonnet", "verifier": "sonnet", "sweeps": "haiku", "research": "inherit", "critic": "inherit", "joker": "sonnet" },
  "knowledge": [] }
```
- `gates`: `lite` (default) = devil's advocate always; council SUGGESTED to the user in one question when a trigger lights (money, hours, permission, schema, destructive data, user surface, or more than 8 files change), otherwise skipped and recorded as skipped in the plan. `full` = advocate and council always.
- `models`: passed as the `model` argument when dispatching agents. `sweeps` is the cheap pass-1 of `cycle:intent`; `research` is the stage-2 researcher. Missing `models.sweeps` = `haiku`; missing `models.research` = `inherit`.
- `knowledge`: list of `{name, kind: notebooklm | vault | folder | url, id, areas: []}` the research stage queries when `areas` match the intent. Missing key = empty list. The main session's model is the user's choice; the plugin never changes it.
- `stateful: true` makes production deploy require a restore test newer than 30 days (`.cycle/work/<intent>/restore-test.md`).
- `.cycle/gate.json`: `{ "patterns": [] }` — repo-specific deploy commands, lowercase substring match.

## Council seats (`.cycle/council.json`, template in `templates/`)
- `seats` (five, `always: true`), `pool` (`{id, triggers, knowledge, skill, brief}`), `cap` (9), `joker` (`enabled`, `domains`), `scenarios` (`horizons`, `paths`). Missing file = the template's defaults.
- Resolution is a script, not prose: `scripts/resolve-seats.mjs plans/<x>.md [--extra ids]` matches triggers as whole words against the plan text, sits the `always` seats, then lit pool seats in pool order up to `cap`, and prints seats, dropped (with reason), a summary line and a cost hint. `cycle:plan` pastes the summary.
- A `skill` names a host skill the cycle never bundles (Anthropic's knowledge-work plugins: `claude plugin marketplace add anthropics/knowledge-work-plugins`); when absent the seat says "lens not installed; general practice". A `knowledge` id must exist in `config.knowledge`; a knowledge-backed seat summarises and never quotes sensitive content verbatim into the plan.
- The joker is the Mule: dispatched separately, in a fresh context, on `models.joker`, **after** the risks table (advocate + pre-mortem + council rows) is committed; its shock must be absent from that table. The scenario seat writes no weights on futures and leaves `Signposts:` lines that the plan carries under `## Signposts` and `cycle:maintain` reads.

## The gate (`npm run gate`, `scripts/gate.mjs`)
- Runs before a publish, not on a pull request: this repository has none.
- Sequence: preflight (the runner still speaks the flags used) → `npm test` → base resolution (`git describe --tags`; **no base is a failure, never a pass**) → the commit-shape rule (no commit touches both `evals/` and `skills|agents|hooks|scripts|templates`) → case selection from `evals/coverage.json` → `claude plugin eval` on the selected cases → exit.
- `evals/coverage.json` maps every method file to one of three things: a list of case ids, `{tests: "<file>"}` when a unit test covers it deterministically, or `{uncovered: "<reason>", since: "<date>"}` — declared debt, printed on every run and counted by the weekly routine. A file mapped by **nothing** fails the gate.
- Exit 2 from the runner (the cost ceiling was hit, paid graders may have been skipped) is a **failure**, distinct from exit 1 (a case scored below the threshold).
- `--threshold` and `--max-cost-usd` live in `package.json`'s `gate` script. They are the owner's numbers: an agent may propose a change in an intent, never make one as a side effect.
- Three run shapes: **gate** (one run per case, no ablation, only what changed), **baseline** (`--ablation with-without` on a changed skill's case, which is the RED→GREEN the CONTRIBUTING asks for), **full** (`npm run evals:full`, three runs with the ablation arm, weekly and before a minor tag).

## Hooks (Node, via `hooks/run.sh`)
- Every gate checks `.cycle/` first (`cycleOn`): no `.cycle/`, no gate, no exception. Opt-out = the HUMAN deletes `.cycle/` in their own terminal.
- Exit codes: 0 allow · 1 non-blocking error (stderr shown to the user; the action proceeds) · 2 block (stderr goes to Claude).
- Internal-error rule, same in every hook: git unavailable or not a repo → allow (0); malformed JSON or unreadable config → block (2); node missing → `run.sh` prints "cycle-engineering: node not found on PATH. The cycle gates are NOT active. Install Node >= 18 and restart the session." and exits 1.
- Hook stderr never contains "no such file" or "can't open" (Claude Code downgrades such exit-2 hooks to non-blocking).
- Production defaults (regex on the lowercased command): `--prod\b`, `--target production`, `--env production`, `deploy.*production|production.*deploy`, `gh run rerun`, `gh workflow run`, `wrangler deploy`, `fly deploy`, `railway up`. Not matched: `NODE_ENV=production`, `grep production`, branch names containing production. Push: bare `git push` resolves the current branch (`git rev-parse --abbrev-ref HEAD`); `--tags` allowed; refspec matched with word boundaries.
- Destructive (snapshot-guard): `git reset --hard`, `git clean -f`, `git checkout -- .`, `rm -rf <inside repo>` except node_modules|dist|build|.next|coverage|.cache|.turbo, `drop table|database|schema`, `migrate reset|down|fresh`, `truncate table`.
- Stop reminder (save rule): at most once per 30 minutes per repo, never when `stop_hook_active` is true.
- One `node` process per Bash call: `pre-bash.mjs` dispatches production-gate, plan-sync and snapshot-guard in-process. `protect-cycle.mjs` runs on `Write|Edit|MultiEdit|Bash`. `stop-uncommitted.mjs` on `Stop`. `session-start.mjs` on `SessionStart` (speaks in every repo: one line without `.cycle/`, full state with it).

## Language
English everywhere except `README.pt-BR.md` and the presentation (vault).

## Sources and credits
Anthropic (AI-Native SDLC playbook) · Jesse Vincent (obra/superpowers, MIT; SHA per skill from `~/.agents/.skill-lock.json`, the version actually copied) · Matt Pocock (grilling, MIT) · Matt Shumer and robonuggets (gauntlet, CC BY 4.0) · Rob Shocks (video reading).
