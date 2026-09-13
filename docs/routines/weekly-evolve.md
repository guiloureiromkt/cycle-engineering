# The weekly evolve routine

Once a week, something has to read what the method learned and say so out loud. Not a person remembering to — a scheduled run, with a report that exists even when the run fails. This file **is** the routine's definition: its prompt, where it opens, what it may touch, and what it must leave behind.

It runs as the host's scheduled agent where one exists. Anyone without one runs the same prompt by hand — the line at the bottom is the whole thing.

## Where it opens

**In the method repository**, the one whose `.cycle/config.json` has `method_repo: "."`. Not in the vault, not in a product repo, not in a worktree.

The first thing the routine does is check that `.cycle/` exists in the working directory. If it does not, it **stops and says so**, and writes the "did not complete" artifact below. It does not carry on gateless. This is the 04/09 incident written as a rule: a whole cycle once ran from a directory with no `.cycle/`, so no hook fired, and nobody noticed until afterwards.

## What it may use

Allowed: `Read`, `Grep`, `Glob`, `Bash` limited to `git status`, `git log`, `git diff`, `git show <ref>:<path>` (read-only; the way back when the run has overwritten a committed file), `git switch -c`, `git switch <branch>` (to return to the default branch once a proposal is committed), `git add`, `git commit`, `npm test`, `npm run gate`, `node scripts/retro.mjs`, and `Write`/`Edit` inside `intent/`, `docs/`, `.cycle/work/` and `CLAUDE.md`.

Documents go through `Write`/`Edit`, never through a Bash heredoc. The release gate reads the whole command string, prose included: on 13/09 it refused an intent because one line of its text named the gate's file and a deploy. A heredoc that trips the gate teaches the run to route around it, which is worse than the lost tool call.

Forbidden, and the reason each one is:

| Never | Why |
|---|---|
| `gh pr merge` | merging is the owner's act; an agent that can merge its own proposal has no reviewer |
| `git merge` | same, by another road |
| `git push` to a protected branch | the branch protection is the last gate that does not depend on anyone's discipline |
| `claude plugin install` / `marketplace` | the routine must not change the plugin the next run will be judged by |
| any command in `.cycle/gate.json` → `patterns` | those are deploys |

The routine proposes. It opens a branch for a docs-only fix and leaves it unmerged. **Everything else becomes an `intent/<date>-<name>.md` with `origin: agent`.** Its report says what it wanted to change and could not, which is the part a person actually reads.

## What it reads

1. Every `.cycle/work/*/retro.md` written since the previous run (`git log --since` on that path).
2. `node scripts/retro.mjs --repeats` — findings that appeared in two or more retros. A repeat is a candidate line for `CLAUDE.md` under "What Claude gets wrong here" (R11), proposed as a branch, never committed to the default branch by the agent.
3. `intent/` — runs `/cycle:triage` and orders the backlog for the owner.
4. `evals/coverage.json` — how many method files are **declared debt**, and the delta since last week. A number that only grows is the method rotting quietly; it goes in the report even when nothing else does.
5. The cost log, to see whether a full run already happened this week.

## What it writes

- `.cycle/work/evolve/<date>.md` (or `<date>-2.md` for a second run on the same date): what appeared, what the retros say, the repeats, the triage table ordered for the owner, the uncovered-file count and its delta, and the list of "wanted to change, could not".
- Branches for docs-only fixes, unmerged.
- New `intent/` files for everything else.
- One line in `evals/results/cost-log.md` **if** it ran a full eval.

## The "did not complete" artifact

A routine that dies silently is worse than no routine: the week looks healthy because nothing complained. So the run writes `.cycle/work/evolve/<date>.md` **first**, with `status: did not complete` and the reason it has so far (usually "started"), and rewrites it at the end with the real report. If the run dies anywhere in between, the file survives saying it did not finish. The next run reads that and says so in its own report.

**A second run on the same date does not overwrite the first.** Before writing the stub, the run checks whether `.cycle/work/evolve/<date>.md` already exists. If it does and is not this run's own stub, the run writes `<date>-2.md` (then `-3.md`, and so on) and names the earlier file in its own frontmatter (`run: 2`, `previous_run: <date>`). The 13/09 second run wrote its stub over the first run's committed report before reading it; the report came back from `git show HEAD:…`, but a run that dies at that point leaves the week's real report replaced by a stop notice, which is the exact failure this artifact exists to prevent.

## The cost rule

A full eval run (`npm run evals:full`) costs three figures in a bad month, and two ways of firing it exist: this routine, and the pre-tag run before a release. **They never both fire in the same week.** The routine checks `evals/results/cost-log.md` for a full run in the last seven days; if it finds one, it skips its own and says so in the report. Every full run appends one line:

```
| date | what fired it | cases | runs | overall | US$ | notes |
```

## The prompt

```
Run the weekly evolve routine of docs/routines/weekly-evolve.md, in this repository.
Follow that file exactly: write the "did not complete" artifact first, stop loudly if .cycle/
is missing, read the retros since the last run, run scripts/retro.mjs --repeats, triage intent/,
report the declared-debt count and its delta, and skip the full eval if the cost log shows one in
the last seven days. Propose only: branches for docs, intents for everything else. Do not merge,
do not push to a protected branch, do not install or update a plugin.
```

By hand, that is:

```bash
claude -p "$(sed -n '/^Run the weekly evolve/,/do not install or update a plugin./p' docs/routines/weekly-evolve.md)" --allowedTools Read Grep Glob Bash Write Edit
```
