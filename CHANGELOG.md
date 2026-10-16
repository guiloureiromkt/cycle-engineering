# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-10-16

The method read itself 23 days after 0.8.0 (`.cycle/work/evolve/2026-10-16.md`): the weekly routine had never run, 14 retro findings went unread, and 13 of 31 logged frictions were one defect — the gates matched words inside prose. Two cycles closed today, each with an advocate that ran the plan's code, a seven-seat council, the Mule, a fresh reviewer and a separate verifier; the gate plan needed three designs before the owner accepted it.

### Changed
- **The gates judge commands, not prose** (`hooks/_lib.mjs` `commandView` + `walk` + `viewFor`; `production-gate`, `snapshot-guard`, `protect-cycle`, `pre-bash`). Only what is inert leaves the judged text: a `#` comment outside `$()`/backticks, the body of a heredoc whose tag is quoted (`<<'E'`), and a quoted argument of a sink program (`echo`, `printf`, `cat`, `tee`, `grep`, `rg`, `ag`, `git commit/tag/notes`, `gh pr/issue/release`) with no `$(`, backtick or `$` and no redirect in its segment. Everything else stays judged as before, quotes included; when a consumer (`sh`, `bash`, `zsh`, `eval`, `source`, `.`, `xargs`, `ssh`, `sudo`, `psql`, `mysql`, `sqlite3`, `redis-cli`, `mongo`, `docker exec`) appears anywhere, nothing is removed at all. Each segment is judged in the directory and on the branch it will have (branch seeded per repository, carried across `&&` only, `checkout <x>` only when `refs/heads/<x>` exists); a segment in no gated repository is judged by the session's; every hit needs its own repository's approval (and, in the snapshot guard, its own snapshot). A read-only command skips `gate.json` substring patterns. A match that lives only in removed prose, or a push from an unknown branch whose repository did not start on a protected one, is **`ask`** — the host's own prompt, in plain words, with the command cut to 300 characters — and only when a human is present (`permission_mode` `default`, `plan`, `acceptEdits` or `auto`; `bypassPermissions`, `dontAsk`, an absent field or `CYCLE_UNATTENDED=1` deny instead). A `$'…'` string, an unterminated quote or heredoc, or `CYCLE_GATE_LEGACY=1` set by a person fall back to whole-string judgement. Every refusal names the segment and the rule. `.cycle/work/gate/gate.log` records every ask, deny and fallback without command text; `cycle:maintain` reads it.
- **The weekly evolve routine reads the products.** `scripts/retro.mjs --repeats --across [--since YYYY-MM-DD | --since-last-report]` reads every retro under the `products` list of the method repo's `.cycle/config.json`, prints a header per repository (retros read and kept, findings, worktrees not read, `not found`, `collapsed`, sibling repos with `.cycle/work/` not listed), collapses worktree copies (same cycle name and content) and keeps `--repeats` alone byte-identical. `lastEvolveReport()` (`hooks/_lib.mjs`) is the one definition of "the previous report" (`routine: weekly-evolve` in the frontmatter, never a stub or an owner-triggered report), read by the script and by `session-start`, which now prints "last evolve report: N days ago" in the method repo and warns past nine. `docs/routines/weekly-evolve.md` carries the grouping rubric, the 40-retro cap, the clean-tree rule for `git switch -c`, and runs as a desktop scheduled task (`docs/routines/cycle-weekly-evolve.SKILL.md`, after the probe `cycle-weekly-evolve-probe.SKILL.md`).
- `templates/config.json` gains `products: []`; `templates/cycle-gitignore` ignores `work/gate/`; `skills/build` says unattended runs export `CYCLE_UNATTENDED=1`; `skills/maintain` reads `gate.log`; `docs/CONTRACT.md` §Hooks and §Config describe all of the above.

### Fixed
- The approval file's name inside a `grep`, a PR body or a note; `deploy`+`production` inside a heredoc; `git reset --hard` inside a snapshot note; `git checkout -b x && git push origin HEAD` judged on the old branch; `git worktree remove --force`; a quoted multi-word `gate.json` pattern in a `grep` — the thirteen logged shapes no longer block (`tests/fixtures/gate-prose/cases.json`, 66 cases with `before` recorded by replaying the previous hooks at a named commit; a deny that stopped denying carries a declared reason).
- Pre-existing holes closed: `git -C <path> push origin main`, a deploy in a second gated repository after an approved hit in the first, a destructive command in a second repository after a snapshotted one in the first.

### Proof
`npm test` 254/254 at `c8ddc6b`, seen red first for every new behaviour; the suite goes red when the consumer second pass is disabled on purpose (8 cases). Verifier in a separate context: 53 fixtures replayed through the real `hooks/run.sh` entry points, 53/53; the owner's 27 real deploy commands (Command, Spriggan, site), typed with their quotes, all deny; the routine's header equals `ls` on every product. Fresh reviewer on each plan; the gate reviewer's 4 Critical, 3 Important and 2 Minor findings fixed in one pass, each with a case seen red. Not observed: the host's handling of a hook `ask` under `claude -p` (CLI login expired on the owner's machine); `onFailure: "block"` not added (host 2.1.281 < 2.1.295, dated follow-up in the contract).

## [0.8.0] - 2026-09-23

A plan the owner accepted can run to the end with nobody watching, and come back finished or stopped at a named point. The owner asked for it on 2026-09-23, after moving the owner's sessions to Claude Opus 5.5 — "sinto falta de coisas que são mais autônomas e mais longas, com tarefas sequenciais".

### Changed
- **`cycle:executing-plans` and `cycle:subagent-driven-development` are refreshed from obra/superpowers v6.4.1** (commit `5bf4e78`), which rebuilt both for continuous execution: no check-ins between tasks, ambiguities decided and ledgered as `Ruling: <what> — <why> — <cost if wrong>`, one `Task <N>: complete (commits a..b, tests: <cmd> → <result>)` line per task written only when the tests pass, resume from the first task without that line, one final review, a final message with every ruling and deferred minor. Imported verbatim in one commit and diverged in the next; `.cycle/work/2026-09-23-…/upstream-diff.md` is the whole divergence. The `Source:` lines now name the upstream **tree** hash and say so — the hashes they carried before were never commits.
- **The cycle's divergence:** the ledger is `.cycle/work/<plan>/run.md`, versioned and kept after the run (upstream deletes its workspace); the scripts find the plan's repository from any directory, since sessions are often rooted elsewhere; `task-brief` reads `Tarefa N` as well as `Task N`, keeps `Task 7` from swallowing `Task 7b`, and gives a plan with no task heading as one whole brief (35 of 89 accepted plans across seven repositories had none); two stops added to upstream's four (a departure touching a gate trigger the plan did not name; the owner's budget); the owner's word is quoted, never produced, when a subagent asks for an authorization; and **unattended mode**, started only by the owner's own sentence, which writes a header with that sentence verbatim and ends a stop with a `Stopped:` line instead of a question.
- **`cycle:build`** says how a plan runs to the end, and prints a ready `/goal` line for an owner who wants the host to keep the session going. No plugin hook keeps a session running: a Stop hook was designed and killed at gate 2, because the owner's sessions are rooted in the owner's notes vault — where it would never have found the ledger — and because a run cut short would have handed its open tasks to the next unrelated session in that repository.
- **`session-start`** names an unattended run left open in the session's own repository, with its next task.
- **The gate runs its commands in a plain shell.** A login shell cost 0.87 s per call on the owner's machine; the gate's tests went from 121 s to 2 s.

### Fixed
- Upstream's `task-done` died after a passing test whose command printed nothing (`grep` over an empty log under `set -euo pipefail`) and recorded nothing. Guarded here.

### Proof
Nine tests for the scripts and four for the session-start line, each seen red; a real unattended run of a four-task plan in a scratch repository, kept under `.cycle/work/2026-09-23-an-accepted-plan-runs-to-the-end-unattended/real-run/`.

## [0.7.1] - 2026-09-22

The owner asked, after the third gate attempt for 0.7.0: *why do we keep getting stuck at this stage, should it even exist, it is costing me money.* Over three attempts the gate had stopped five times on one publish path — four of them an `llm` judge over a plan a run had grown past 14 kB, the runner printing its long-file warning each time and the gate obeying the vote anyway — for US$26.93 and no tag. What had actually proven the change was the RED→GREEN of the one case covering the changed skill: US$2.58, kept plans and traces. So the gate now checks what can be checked for free, and the paid suite goes where its reds are findings.

### Changed
- **`npm run gate` is deterministic and never calls the paid runner.** It requires a clean tree; runs the unit suite; resolves the base (no base is a failure); applies the commit-shape rule; reads the coverage map; requires, for every changed method file a case covers, a commit to a covering case's `case.meta.md` on or after the change — the RED→GREEN record, read from git, whose prose says the run or says "no run, and why" (a declared waiver, the shape declared debt already had); extracts `git archive HEAD` into a temp dir and runs `npm test` there; and fails on any shipped file containing this machine's home path. `--threshold` and `--max-cost-usd` left the gate's script and stay on `npm run evals`. Five loop tests went with the loop; eight new ones were seen red on the old script first (`.cycle/work/2026-09-22-the-publish-gate-…/red.txt`).
- **The paid suite is a monitor.** `npm run evals` and `evals:full` keep their flags, ceiling and ledger; the weekly routine or a person runs them; a red case opens an intent or a branch fixing the case, and never blocks a tag. `docs/CONTRACT.md`, `skills/deploy/SKILL.md`, `skills/evolve/SKILL.md`, `skills/evolve/references/evals.md`, `CONTRIBUTING.md` and `evals/README.md` say so in the same words.
- **Publish per closed cycle.** `cycle:deploy`: a closed cycle that changed a method file publishes a patch version, and the previous release is tagged locally before the gate runs, so the record rule reads one cycle, not seven.

### Added
- **`.gitattributes` makes `git archive HEAD` the package**, for the gate and for the publish — one definition. Patterns are anchored at the root: the eval fixtures' own `intent/` and `plans/` ship (unanchored, they did not, and the package lost 31 files before the tag; caught by counting).

### Fixed
- **The shipped suite tells the truth inside a package.** Eight tests read working-copy artifacts (`.cycle/council.json`, `plans/`, the kept evidence under `.cycle/work/`); in a clone of the public repository they failed with `ENOENT`, 0.6.1 and 0.7.0 alike. They now skip with a reason: 138 pass, 8 skipped, 0 failed inside `git archive HEAD`.

## [0.7.0] - 2026-09-22

Seven cycles that had been sitting unpublished on `main` since 2026-09-13, released together (the three that gave the version its shape first): a bar a repository can be held to, a rollout that can be undone, and — the reason the version is minor and not a patch — **what the agent writes to the person reading it**. The method had rules for the documents an engineer picks up in six months, and none for the message the owner reads now, on a phone, between meetings, to decide.

Always-on context per session: **~1,400 tokens across 23 skills** (`cycle:constraints` is new here; the figure is measured from the skills' frontmatter, and replaces the ~1,950 estimate carried since 0.6.0, which was never remeasured after skills were added).

### Added
- `tests/init-routines.test.mjs` (regex on the prose, RED baseline kept verbatim) and eval case `0017-routine-keeps-running`: 1.00 on the new block; the old block also scored 1.00 twice in the sandbox, so the case guards the green side only and says so in its `case.meta.md`. The init warning was smoke-tested by hand in a scratch clone and fired.
- **Block ledger (start):** `templates/claude-md-block.md` is now 43 lines, 779 words (`wc -l -w`), ≈1,010 tokens (words × 1.3); the 2026-09-04 measurement was ~1,816 tokens for the whole always-on context. Every later addition to the block appends a line here. Commits of this change: `337b732..401fe73` (plus the changelog and the follow-up intent that follow).
- **The gates follow the command, not the session.** A gate now fires when **either** the repository a command acts on **or** the session's own root carries `.cycle/` — config, approval and plans are read from the command's repository when it resolves, and from the session root otherwise. A union, so the gate can only get tighter than before, never looser: an earlier draft that read the command's repository *instead* would have ungated 56 of 207 risky commands, measured. `hooks/_lib.mjs` gained `commandDir()`, which folds `cd` prefixes left to right and honours `git -C`, `make -C`, `env -C` and `--prefix`, and `gateRepo()`, which walks up to `.cycle/` and stops before `$HOME`.
- **Two seats the council did not have.** **Minimalist** speaks first — *is this the shape of what was asked, or the shape of what is now possible?* — and **Pollyana** last, whose first move is not invention but re-examination of material the room has stopped looking at. Both always on, ten lines each. The pool is reordered by trigger precision, because the cap of nine cuts from the end, and the council agent now puts demands before prose.
- **No eval grader asks the judge to read the chat or the trace.** Nine cases carried that shape, not the four two separate surveys counted; a standing test in `tests/refs.test.mjs` found the rest and keeps them out. Each claim is now proven by a deterministic grader where one exists, by a judge over a file the run actually wrote where it does not, or is named in `case.meta.md` as an accepted gap. Cases `0002`, `0005` and `0009` scored 1.00 on paid runs afterwards.
- **The acceptance graders read the artifact, not the transcript.** Cases `0003` and `0005` used to forbid the phrase `status: accepted` in any tool call, and `input_match` is a regex over the call's whole JSON input — so they failed a correct run for *quoting* the rule it was obeying, in a section telling the owner that a human decision was still missing. They now assert the plan file itself: `status: draft` present at the start of a line, `status: accepted` at the start of none. Shown red by a throwaway run that accepted the plan with `sed`. The same sweep found the shape in three cases and five graders, each forbidding a phrase its own fixture already contained.
- **A pool seat sits for a subject, not for a word.** `scripts/resolve-seats.mjs` now matches the pool's triggers against the plan's *subject* — the `**Goal:**` line with its wrapped continuation, and the bodies of `## Files that change` and `## Proof` — with fenced blocks and code spans dropped, URLs dropped whole, file paths split into their segments and their file names dropped, and whitespace collapsed so a two-word trigger survives a line wrap. Before this, `contract` matched the file name `docs/CONTRACT.md`, `table` matched "the risks table" and `tracking` matched a line the plan template gives every plan: across 21 plan files those words seated **106** reviewers, almost none about the plan under review. It now seats 24, of which 17 are seats with something to say and 7 are residuals named in the plan that made the change. A plan with neither heading is still matched whole, and the resolver says so instead of resolving on one sentence in silence. `--print-subject` shows what the matcher saw.
- **The pool's triggers changed, and `/cycle:init` never overwrites an existing `.cycle/council.json`.** If you adopted the cycle before this release, you keep your old triggers and get the new matching, which is the half that narrows without the half that compensates. Copy the `pool` block from `templates/council.json` into your `.cycle/council.json` to take the change; the resolver now names, on stderr and in its JSON `warnings`, exactly which seats differ. Removing or renaming a pool seat is reported too, never a crash.
- **`templates/plan.md` gained the `**Goal:**` line** it never had, though every plan written through `cycle:writing-plans` already carried one — it is the resolver's first signal.

- **`cycle:constraints`** — the quality bar as an artifact (`CONSTRAINTS.md`: Floor / Enforced / Measured / Exceptions, with an Owner column). Detect the repo's tooling before asking, a four-question interview with defaults, a named secret scanner per ecosystem, and the five ways a bar gets quietly weakened — generalized off JS/TS syntax so the shape holds in any language. Adapted from Addy Osmani's `constraint-driven-development` (MIT). The `verification-gate` gains a matching **Bar lens** with an exact trigger rule, and `cycle:spec` invites the skill when a repo has requirements worth constraining and no bar yet.
- **`skills/deploy/references/staged-rollout.md`** — the feature-flag lifecycle and a rollback template that is stack-agnostic (the upstream's `npx prisma migrate rollback` generalized), with the borrowed sigma vocabulary disclosed up front rather than in a footnote: small N, same baseline, and who acts on the number. Adapted from Addy Osmani's `shipping-and-launch` (MIT).
- **An output shape in the CLAUDE.md block `/cycle:init` writes, on by default in every repo initialized from now on.** Ten rules — lead with the next action, number multi-step work, end with one concrete next action, finish one thing before offering the second, restate where a task stands, concrete time estimates, visible progress, plain cause-and-fix on errors, five-item lists, no preamble or recap or closing pleasantry — plus the six exceptions that keep it from going rigid (an explicit "explain" ask, a destructive action, a debug spiral, real ambiguity, a rule that would delete the answer itself, and the harness's own system prompt). Condensed from Ayoub Ghriss's `i-have-adhd` (MIT), inlined rather than referenced: a public plugin cannot point at a path on its author's machine, and the copyright line travels inside the block because `/cycle:init` writes that text into other people's repositories.
- **A plain-language floor** in the same block, which does not come from the upstream skill: translate a technical term to its practical effect in one short sentence before relying on it, and lead a technical decision with a direct recommendation. It exists because the failure it answers happened mid-explanation, not at a stage boundary — the owner of this repo read a four-option question full of jargon and replied "eu não entendo metade das coisas que você fala".
- **Cases 0011–0016** — the Bar lens as a standing regression: the interview writing all four sections without inventing a number, the lens firing on a weakened commit and staying silent on an unrelated one, a bare repo with no tooling, a live-check-not-just-read case, and Python defaults. Three of them build real two-commit git history in `scaffold.sh`, because a fixture that stages one static tree at two times cannot vary content between commits.
- **`evals/README.md` corrected on four counts, all measured.** A `regex` or `llm` grader over `{source: file, path: …}` **does** read a file the scaffold placed — the runner's warning is about granted tools, not about what it can read. `^` is the start of the **file**, not of a line, unless `flags: "m"` is set. `match: contains | not_contains | count:N` and `flags` were undocumented. And the `--case` recipe does **not** stop on `--max-cost-usd`: the ceiling is checked between runs, so a single-case selection runs in full — measured at US$0.67 and US$0.61 on a line that promised twenty cents.
- **`CONTRIBUTING.md` says when the eval case itself is the defect.** The rule against editing a test to make one's own code pass stands; the exception is narrow and earned: the justification must be a kept artifact from a run and never an argument, the claim may be no wider than that artifact supports, and the replacement is not trusted until it has been shown failing.
- **`tests/refs.test.mjs` now resolves every `references/<file>` pointer** inside a `SKILL.md` to a real file — a mechanical check that a pointer still lands, not merely that both files exist. 6/6 pointers checked.

### Changed
- **The risks reach the plan at the gate that found them.** `cycle:plan` now puts the devil's advocate's findings into the plan's risks table at gate 2 and the pre-mortem's at gate 3 — a repeated finding adds `pre-mortem` to the existing row instead of a new one — and commits the plan there, the last point every mode reaches; the council appends its rows at gate 4 instead of starting the table. A lite-mode plan that stops before the council carries those rows, and when the one question to the owner goes unanswered the run writes `council: pending — <the question>` and stops, after asking, never instead of asking. The plan is the record: raw gate output may live under `.cycle/work/<intent>/`, but a finding that is not a row in the plan was not found. Origin: on 2026-09-21 two kept runs of the same eval case took the two readings the old text allowed — one wrote eleven rows into the plan, the other wrote nine findings into the work folder and left the plan at `Risks: none` for a change that moves money, which step 7 of the same skill forbids. The judge was right both times and the release blocked on it three times. Proven by the kept failing workspace and two paid runs of `0006` at 1.00 (`evals/0006-gates-read-research/case.meta.md`). What it does not fix: the judge's noise on long input, three 2–1 votes in eight recorded judgements, which stays an open question.
- **The block says whom it speaks to.** Two lines under its opening sentence: Rules 1–3 govern a session that changes the repository's source, Rule 4 and the deploy gate hold for everyone; a routine the repository runs (cron, Actions, a scheduled loop), writing its own outputs, is the product running — it needs no plan, skips `cycle:using-cycle`, still cannot push to a protected branch or deploy without approval, and opens a pull request when it needs `main`. Origin: two mentees' scheduled loops read the block at a workspace root and stopped, waiting for a plan nobody was there to accept (intent of 2026-09-20). The gates are unchanged.
- **`/cycle:init` looks for routine signs before it writes anything** (`schedule:` in workflows, `loops/`, `rotinas/`, `routines/`, cron or systemd references), says where `.cycle/` belongs instead — the repository of the thing you build, beside the routines, never above them, with one example path — and asks. The answer holds for that init only.
- READMEs: the cycle governs construction, not operation.
- **`cycle:build` and `cycle:test` name how progress reaches the owner**: numbered steps done so far, one concrete next action, nothing narrated between commits. They already produced visible progress through commit discipline and pasted output; what they lacked was the shape of the message carrying it.

### Notes on what is not covered
No eval case grades response shape. The owner was shown the choice on 2026-09-17 and took the declared debt (a one-off behavioral check, recorded in `.cycle/work/2026-09-12-what-the-owner-reads/behavioral-check.md`: two cold sessions, told nothing about formatting, answering the two failure modes the intent quotes) over a paid case that would run on every gate. A wording regression in the block will not go red. The plan's Signposts say what would show that was the wrong call.

## [0.6.1] - 2026-09-13

A fix that waited nine days in a branch, and the weekly routine's own first lesson. No skill changed, so nothing new is owed to the ablation.

### Fixed
- **`/cycle:init` wrote a `.gitignore` that ignored nothing.** It spelled `work/**/*.{png,jpg,mp4,zip,sql.gz}`, and **gitignore does not expand brace lists** — so screenshots under `.cycle/work/` showed up as untracked in a product repo, which is how it was found on 04/09. The init now copies `templates/cycle-gitignore`, one pattern per line, and `tests/init-gitignore.test.mjs` proves both sides with `git check-ignore` itself, keeping the old brace form as the RED baseline.

### Changed
- **The weekly routine does not overwrite its own report.** Its first two runs happened on the same day, and the second wrote the "did not complete" stub over the first's committed 133-line report before reading it. Restored from `git show`, byte-identical — but a run that died in between would have replaced the week's record with a stop notice. A second run on a date now writes `<date>-2.md` and names the earlier one. Documents go through `Write`, never a Bash heredoc: the release gate reads the whole command string, prose included, and refused an intent whose *text* named the gate's file and a deploy.
- `docs/routines/weekly-evolve.md` grants `git show <ref>:<path>` and `git switch <branch>`, each with the reason it exists — both were used by the run that needed them and disclosed rather than hidden.
- `CLAUDE.md` gains the line the retro earned: **a cycle is closed when its `retro.md` exists, not when the version is tagged.** Three releases shipped without one, the last of them the release that wrote the rule.

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

[Unreleased]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.6.1...HEAD
[0.6.1]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/guiloureiromkt/cycle-engineering/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/guiloureiromkt/cycle-engineering/releases/tag/v0.2.0
