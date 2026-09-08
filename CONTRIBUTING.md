# Contributing

## Ground rules

- Pull requests go against `main`. One change per PR.
- English in `skills/`, `agents/`, `commands/`, `hooks/`, `templates/`, `tests/` and every error message. `README.pt-BR.md` is the only file in Portuguese.
- This repository runs its own cycle. A change that adds or alters behavior needs its `intent/`, `specs/` and `plans/` files (see the README). A typo fix does not.
- Commits that change code under an accepted plan either stage the plan file or carry `plan: unchanged` in the message. The plan-sync hook enforces this in repos with `.cycle/`, including this one.

## Changes to skills, hooks or agents: attach a RED to GREEN baseline

A skill or an agent is a prompt. The only proof it works is what the agent does with it. Every PR that touches `skills/`, `hooks/` or `agents/` includes in its description:

- **RED**: what the agent did without your change. The prompt you used and an excerpt of the transcript, or a plain description of the run.
- **GREEN**: what it did with your change, same prompt.
- For `hooks/`: the case in `tests/hooks.test.mjs` that fails before the change and passes after it. `npm test` must pass on the PR.

No baseline, no review.

## PRs from the evolve stage

`cycle:evolve` opens pull requests when a new model, skill or practice changes the method. Those PRs are prefixed `evolve:` and follow the same baseline rule. An evolve PR is never merged by the agent that opened it. A human reviews and merges, or closes it with a reason in the thread.

## Bundled skills

`skills/` holds copies from other projects; `CREDITS.md` lists them. Upstream first is still the default: propose the change there, then refresh the copy and update its `Source:` line with the new commit. `cycle:evolve` watches those upstream commits.

A copy may diverge when the change belongs to this method rather than to the upstream project — a prompt audit against a new model generation, a rule that only exists here. A diverged copy declares it on its `Source:` line, with the date and the CHANGELOG entry that explains it. From then on it is refreshed by merge, never overwritten, and `cycle:evolve` must not blank the marker.

## Reporting a problem

Open an issue with three things: what you asked the agent, what it did, what you expected. A transcript excerpt says more than a description.
