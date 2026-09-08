# Evolve · evals in detail

Companion to front 2 of `cycle:evolve`.

## What an eval is
A real task the agent has done, plus what counts as accepted, in `evals/<id>.json` (template: `<plugin root>/templates/eval-example.json`). Fields: `id`, `origin` (incident or real task, with date), `prompt` (the task as it was requested), `accepted_if` (a list of checks a script or a reviewer can confirm), `tools` (the restricted tool set the run may use).

## Building the first set
- Start with 20 to 50 recent real tasks whose result was accepted. Accepted results are the ground truth; do not invent tasks.
- Each fixed incident becomes a permanent eval, written by whoever handled it, while the context is fresh.
- An eval that stopped discriminating (every run passes, or every run fails for reasons unrelated to the method) leaves; what the monitoring suggests enters.

## Running
- CI: on any PR that touches `CLAUDE.md`, `.claude/**`, `skills/`, `agents/`, `hooks/` or `templates/`; on a daily cron; and whenever a new model is adopted.
- Run each eval with the host's headless mode and a restricted tool set, JSON output, and a check script comparing the output against `accepted_if`. When the host ships a native eval runner, prefer it and keep the JSON as the fallback format.
- A change that lowers the pass rate is reviewed before merge, not after.

## Reading results
Pass rate per eval over time, not a single number. A drop tied to a skill change is a regression of the method; a drop tied to a model change is an adoption question that goes back through `cycle:adoption-filter` and an intent.
