# Constraints

This file is the code-quality bar (coverage, lint, secrets…); `.cycle/gate.json` is the list of this repo's production-deploy command patterns — different files, different owners of the numbers.

Last reviewed: <date> by <owner>

## Floor (always enforced, no setup required)

- No new suppression comment (`@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`, or the ecosystem's equivalent)
- No unimplemented stub (`throw new Error("Not implemented")`, an empty `catch {}`, a `TODO` standing where the implementation should be)
- No test skipped or deleted without a reason in the commit message
- No secret in source
- This file is not weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at | Owner |
|---|---|---|---|---|
| <e.g. Coverage> | <e.g. changed lines ≥ 80% covered> | <command> | <every edit / task end / CI> | <name> |

Every row names the command that produces the verdict and the person accountable for the number. A dimension with a number and no command, or a number with no owner, is an aspiration, not a constraint.

## Measured, not yet enforced

| Metric | Today | Direction |
|---|---|---|
| <e.g. project coverage> | <e.g. 62.4%> | must not fall |

A metric nobody has an opinion on lives here, not in "Enforced with numbers": record today's value, never an invented target.

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|---|---|---|---|---|---|
| <e.g. W1> | <rule> | <path> | <reason> | <name> | <date> |
