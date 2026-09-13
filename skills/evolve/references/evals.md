# Evals · the method's regression test

An eval is a real task plus what counts as accepted. The host runs them: `claude plugin eval <plugin>` loads the plugin, runs each case, scores it with graders and can compare against a no-plugin arm.

## Where a case lives
One directory per case under `evals/<id>/`:
- `case.yaml` — `schema_version: "1.1"`, `name`, `runs`, `context.scaffold_script` (a **script file** in the case directory that seeds the workspace, run only under `--scaffold`), `execution.{prompt, allowed_tools, max_turns, timeout_seconds}`, and `graders`.
- `scaffold.sh` — runs in the empty workspace as you; `$PWD` is the workspace, `$0` is its own absolute path.
- `case.meta.md` — where the case came from, and any check no grader can express.

## Graders
`regex · tool_used · tool_order · file_exists · llm · baseline`. Each needs a `name`. Useful shapes:
- `tool_used` with `input_match` (a regex over the call's JSON input) and `min`/`max`; `min: 0, max: 0` asserts a tool was never called.
- `file_exists` with `path` and `exists: false` — but it only sees files the **run created**: a file the scaffold wrote, or one the run merely edited, is invisible to it.
- `llm` with `focus`: `last_message` (default), `files`, `{source: file, path: …}` to read what the run produced, or `trace`. **A trace judge sees only the first 12 and the last 12 messages**, so on a long run it reads hook noise and misses the work: prefer judging a produced file.
- `arm: with-only` keeps a plugin-fired indicator out of the no-plugin arm's score.

## The three run shapes
| shape | command | when |
|---|---|---|
| gate | `npm run gate` | before every publish; one run per case, no ablation, only the cases covering what changed |
| baseline | `claude plugin eval . --ablation with-without --case '<id>*'` | when a changed skill owes a RED→GREEN |
| full | `npm run evals:full` | weekly, and before a minor tag |

## Where cases come from, and who may write them
Every case is a real task with a date in its `origin`. `cycle:evolve` may propose cases; it may never grade a change with a case that same change introduced, and it never moves the threshold. Both are the owner's.
