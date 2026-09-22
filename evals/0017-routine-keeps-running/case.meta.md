# 0017-routine-keeps-running · provenance and hand-checks

**origin:** intent `rule-1-speaks-to-a-builder-not-to-a-routine` (2026-09-20): two users' scheduled loops read the block and stopped, asking for a plan nobody was there to accept.

**What it scores**

| condition | grader |
|---|---|
| the routine did its job | `the-report-was-written` (`reports/daily.md`), `the-summary-was-written` (`data/summary.json`), `the-script-was-written` (`scripts/summarize.py`) |
| it did not open the cycle for itself | `no-plan-was-created`, `no-intent-was-created` (`tool_used`, `max: 0`, a Write whose `file_path` is under `plans/` or `intent/`) |

**about the `input_match`:** `tool_used` matches the tool's whole JSON input (intent of 2026-09-21, "a grader fires on a string the fixture already contains"). The pattern here anchors on `file_path":"…plans/` so a Write whose *content* mentions `plans/` (the block itself does) is not counted. If the runner treats `input_match` as a plain substring rather than a regex, the anchor degrades to matching the literal characters and the grader goes silent.

**how to run it:** the case needs `--allow-tools Read Write Edit Glob Grep Skill` on the command line as well as `allowed_tools` in the file; without the grant the runner refuses Write and the file graders fail for the wrong reason (seen 2026-09-21, first attempt, score 0.50 with "not granted" in the notes).

**hand-check:** whether the run *mentioned* Rule 1 and moved on, or never noticed it. Both are fine; a run that stops to ask for a plan fails the three `file_exists` graders, which is the bug this case guards.

## RED baseline · 2026-09-21 · **not reproducible in the sandbox**

Run against the **pre-change block** (no exemption line; `grep -c "needs no plan" CLAUDE.md` = 0 in the assembled workspace), `claude` 2.1.273, case `schema_version` 1.1:

| attempt | routine writes | score | cost | time |
|---|---|---|---|---|
| 1 | `reports/daily.md`, `data/summary.json` | **1.00** | US$0.20 | 30 s |
| 2 | the same plus `scripts/summarize.py` (a code file, per the plan's fallback) | **1.00** | US$0.32 | 64 s |

The run in the sandbox, told "you are the routine, started by the scheduler", writes its outputs under the old block without asking for a plan. The incident the intent describes (loops on GitHub Actions reading the block at a workspace root and stopping) did not reproduce with this prompt and these tools; the sandbox has no Bash, no commit and no scheduler, and the prompt names the routine explicitly, which the real loops' prompts may not. **Accepted gap, written here so it is not mistaken for coverage:** this case cannot go RED on the old block, so it does not prove that the two new lines *fix* the stall; it proves that a routine under the new block keeps running (GREEN below), and it guards against a future block change that would make a routine stop. The proof that the block *says* what the spec requires is `tests/init-routines.test.mjs`; the proof that the init warning fires is the manual smoke test below. (Plan risks table, rows "The eval case cannot go RED on the old block" and "the fallback is a second guess".)

## GREEN · 2026-09-21 · **1.00**

Run against the new block (`grep -c "needs no plan" CLAUDE.md` = 1 in the assembled workspace), `claude` 2.1.273, case `schema_version` 1.1: **score 1.00**, all five graders green, US$0.26, 46 s. A routine under the new block writes its three outputs and opens neither a plan nor an intent.

## init warning, manual · 2026-09-21 · **fired**

`/cycle:init` cannot run in the eval sandbox (it needs the `plugin root` line the session hook prints), so the R5 warning was checked by hand: a scratch clone of this repository (which has `docs/routines/weekly-evolve.md` and `claude -p` invocations in docs and plans), `claude -p` given the plugin root and the text of `commands/init.md`, tools Read/Glob/Grep only, 8 turns, ≈US$0.30. **Step 2 fired before anything was written:** it listed the signs (`docs/routines/`, the `loops/` folder inside fixture `o`, the `claude -p` mentions; no `.github/`, no crontab, no systemd), quoted the sentence "routines run from this folder; the cycle belongs in the repository of the thing you are building, beside the routines, never above them", noted honestly that this folder is the method repo itself and already initialized, and stopped with the question "go on and write `.cycle/` and the block anyway?". Nothing was created. Two caveats: the plan said to remove `.cycle/` from the clone first and that was not done (a recursive remove inside a folder carrying `.cycle/` is what `snapshot-guard` refuses; the warning fires the same on a re-init), and the run also flagged the `loops/` hit as fixture data, which is the heuristic's known imprecision (plan risks table, council: maintainer).
