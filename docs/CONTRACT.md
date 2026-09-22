# Naming contract (read before touching anything)

Marketplace: `cycle-engineering` (repo name). Plugin: `cycle`. Install: `claude plugin marketplace add guiloureiromkt/cycle-engineering` then `claude plugin install cycle@cycle-engineering`. Local during build: `claude plugin marketplace add <path to this working copy>`.

## Names
- Skills (own, 10): `cycle:using-cycle`, `cycle:intent`, `cycle:research`, `cycle:spec`, `cycle:plan`, `cycle:build`, `cycle:test`, `cycle:deploy`, `cycle:maintain`, `cycle:evolve`.
- Skills (bundled copies from obra/superpowers, MIT, 8): `cycle:brainstorming`, `cycle:writing-plans`, `cycle:executing-plans`, `cycle:subagent-driven-development`, `cycle:tdd`, `cycle:verify-before-done`, `cycle:parallel-agents`, `cycle:worktrees`.
- Skills (bundled, other): `cycle:gauntlet` (Shumer/robonuggets, CC BY 4.0).
- Skills (own, rewritten in English, 4): `cycle:verification-gate`, `cycle:task-graph`, `cycle:adoption-filter`, `cycle:constraints` (the last one carries an external credit too — `CREDITS.md`, Addy Osmani's `constraint-driven-development`, MIT — where the first three carry none).
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
{ "gates": "lite", "stateful": false, "method_repo": null, "protected_branches": ["main"],
  "models": { "advocate": "inherit", "council": "sonnet", "verifier": "sonnet", "sweeps": "haiku", "research": "inherit", "critic": "inherit", "joker": "sonnet" },
  "knowledge": [] }
```
- `gates`: `lite` (default) = devil's advocate always; council SUGGESTED to the user in one question when a trigger lights (money, hours, permission, schema, destructive data, user surface, or more than 8 files change), otherwise skipped and recorded as skipped in the plan. `full` = advocate and council always.
- `models`: passed as the `model` argument when dispatching agents. `sweeps` is the cheap pass-1 of `cycle:intent`; `research` is the stage-2 researcher. Missing `models.sweeps` = `haiku`; missing `models.research` = `inherit`.
- `knowledge`: list of `{name, kind: notebooklm | vault | folder | url, id, areas: []}` the research stage queries when `areas` match the intent. Missing key = empty list. The main session's model is the user's choice; the plugin never changes it.
- `stateful: true` makes production deploy require a restore test newer than 30 days (`.cycle/work/<intent>/restore-test.md`).
- `method_repo`: `null` in every product repo; `"."` only in the repository that holds the cycle itself. Two things read it: the weekly routine (`docs/routines/weekly-evolve.md`) opens there, and `cycle:deploy` refuses to publish a repo whose `method_repo` is `"."` without a gate run pasted in the session — because there, a skill edit is a change to the method everything else is judged by.
- `.cycle/gate.json`: `{ "patterns": [] }` — repo-specific deploy commands, lowercase substring match.

## Council seats (`.cycle/council.json`, template in `templates/`)
- `seats` (seven, `always: true`, in speaking order): **Minimalist** first — is this the shape of what was asked, or the shape of what is now possible; then the five custodial seats (user, maintainer, payer, security, operator); **Pollyana** last — look again at what already exists before inventing, then a route with its cost, or an honest no with the smallest change that would open one. A seat may carry `lines` (default 5; the two named seats have 10), which the resolver's `cost_hint` sums. `pool` (`{id, triggers, knowledge, skill, brief}`) is **ordered by trigger precision** (legal, data, commercial, cx first; the prose-matchers content and brand-voice last), because the cap cuts from the end. `cap` (9), `joker` (`enabled`, `domains`), `scenarios` (`horizons`, `paths`). Missing file = the template's defaults. A repo file that lacks a seat the template has gets a warning on stderr and a `warnings` array in the resolver's JSON — `/cycle:init` never overwrites an existing `council.json`.
- Resolution is a script, not prose: `scripts/resolve-seats.mjs plans/<x>.md [--extra ids]` matches triggers as whole words against the plan's **subject** — the `**Goal:**` line with its wrapped continuation, and the bodies of `## Files that change` and `## Proof` — with fenced blocks and code spans dropped, URLs dropped whole, paths split into their segments and their file names dropped, and whitespace collapsed. It then sits the `always` seats, then lit pool seats in pool order up to `cap`, and prints seats, dropped (with reason), `warnings`, a summary line and a cost hint. `--print-subject` prints what the matcher saw and nothing else.
- A plan with neither subject heading is matched **whole** and the resolver says so in `warnings`: an old plan degrades to the previous behaviour, never to silence, and never to a one-sentence subject. An unclosed code fence and a near-empty subject each get their own sentence, because an authoring slip and an old template are different problems.
- A trigger is a phrase about a product subject, never a word the method itself uses. `contract` was the file name `docs/CONTRACT.md`, `table` was "the risks table", `tracking` was a line the plan template gives every plan: across the 21 plan files in this repository on 2026-09-20, those ten words seated **106** pool reviewers, almost none of them about the plan under review. Subject matching left **24**, of which 17 were seats with something to say and 7 were named residuals. Both are a dated reading, not a standing claim: this repository's own plans are in that corpus, so writing a plan about coupons moves the count.
- `cycle:plan` pastes the `summary` line **and** every `warnings` entry — a warning nobody reads is the defect it was written to report. Where no JavaScript runtime exists, which is every eval sandbox, the same rule is applied by hand against the subject only, and the run says that it did.
- `subject()`'s section names are pinned to `templates/plan.md`. Renaming a section there without changing the resolver reverts every new plan to whole-text matching; the two change together.
- A `skill` names a host skill the cycle never bundles (Anthropic's knowledge-work plugins: `claude plugin marketplace add anthropics/knowledge-work-plugins`); when absent the seat says "lens not installed; general practice". A `knowledge` id must exist in `config.knowledge`; a knowledge-backed seat summarises and never quotes sensitive content verbatim into the plan.
- The joker is the Mule: dispatched separately, in a fresh context, on `models.joker`, **after** the risks table (advocate + pre-mortem + council rows) is committed; its shock must be absent from that table. The scenario seat writes no weights on futures and leaves `Signposts:` lines that the plan carries under `## Signposts` and `cycle:maintain` reads.

## The gate (`npm run gate`, `scripts/gate.mjs`)
- Runs before a publish, not on a pull request: this repository has none.
- Sequence: preflight (the runner still speaks the flags used) → `npm test` → base resolution (`git describe --tags`; **no base is a failure, never a pass**) → the commit-shape rule (no commit touches both `evals/` and `skills|agents|hooks|scripts|templates`) → case selection from `evals/coverage.json` → `claude plugin eval` on the selected cases → exit.
- `evals/coverage.json` maps every method file to one of three things: a list of case ids, `{tests: "<file>"}` when a unit test covers it deterministically, or `{uncovered: "<reason>", since: "<date>"}` — declared debt, printed on every run and counted by the weekly routine. A file mapped by **nothing** fails the gate.
- Exit 2 from the runner (the cost ceiling was hit, paid graders may have been skipped) is a **failure**, distinct from exit 1 (a case scored below the threshold).
- **A judge reads a file, never the chat.** An `llm` grader's `focus` is `{source: file, path: <a file the run produced>}`; `last_message` and `trace` are rejected by `tests/refs.test.mjs`. A claim with no artifact gets a deterministic grader (`tool_used`, `file_exists`) or is named as an accepted gap in `case.meta.md`; a claim already proven by a deterministic grader does not also get a judge. A `max: 0` grader is only as good as the `min: 1` grader beside it — if the host stopped logging a tool call, the `min: 1` graders go red suite-wide, the `max: 0` ones go quietly green. Precedents: `0010` (2026-09-13) and `0005` (2026-09-17), both a haiku judge voting 3–0 against a correct run; nine cases carried the shape when the rule was written, two surveys undercounted them, the standing test found them.
- `--threshold` and `--max-cost-usd` live in `package.json`'s `gate` script. They are the owner's numbers: an agent may propose a change in an intent, never make one as a side effect.
- Three run shapes: **gate** (one run per case, no ablation, only what changed), **baseline** (`--ablation with-without` on a changed skill's case, which is the RED→GREEN the CONTRIBUTING asks for), **full** (`npm run evals:full`, three runs with the ablation arm, weekly and before a minor tag).

## The weekly routine (`docs/routines/weekly-evolve.md`)
That file is the definition, not a description of one: the prompt, the working directory, the tool list with a reason per forbidden command, what it reads, what it writes, the "did not complete" artifact written **before** the work starts, and the rule that a weekly full run and a pre-tag full run never both fire in the same week (`evals/results/cost-log.md` is how it knows). The routine proposes — a branch for a docs fix, an intent for everything else — and never merges.

## "The owner" is a role, and it needs a second person
Everything outward-facing in this method waits on one sentence from a human: the intent's acceptance, the spec's approval, the plan's acceptance, `.cycle/release-approval`, the publish itself, the triage order, and the gate's threshold and cost ceiling. Today that human is one person. If he is away for two weeks, nothing breaks and nothing ships — the cycle simply stops at every gate, which is the failure mode of a method that works.

So the role is named here, separate from the person: **the owner** accepts intents and plans, approves specs, writes the release approval, orders the triage, and sets the gate's numbers. A repository using this method names its owner and **one designated backup** in its own `CLAUDE.md`, with the backup's authority stated plainly — usually everything except a production release. An agent never fills either slot, never writes an acceptance in someone's name, and never reads "the owner would have said yes" into a silence.

## Hooks (Node, via `hooks/run.sh`)
- Every command-judging gate resolves the repository first (`gateRepo`, `hooks/_lib.mjs`): the repo the **command acts on** — from a `cd` prefix, a `git|make|env -C` flag, one level of nested shell (`bash -c`, `ssh host "…"`), or the working directory the host sends in the payload — walking up to the nearest `.cycle/` and stopping before `$HOME`. **Unresolved is never "allowed": it falls back to the session's own repository.** Neither gated, no gate, no exception. Opt-out = the HUMAN deletes `.cycle/` in their own terminal. `protect-cycle` is the exception that proves the rule: its five string rules about `.cycle` paths run on every payload without resolving anything, because asking would make `cd /tmp &&` a bypass for the hook that exists to stop bypasses.
- **Precedent (2026-09-04 → 2026-09-19), citable against the next convenience default.** The gates keyed themselves to the session's start directory because one session meant one repository. Measured over nine days of real use: 524 of 535 messages came from sessions rooted in a notes vault, four product repositories ran full cycles, **no gate ever fired**, and twelve releases shipped with approval files written where the hook looked instead of where the deploy happened. The first attempt at the fix replaced the session check with the command check and measured *worse*: 56 of 207 deploy-shaped real commands would have become ungated, because "could not resolve" was read as "allow". The rule that came out of it: **a gate may become tighter than it was, never looser — and a default that silently resolves to somewhere convenient is how a guard stops guarding.**
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
