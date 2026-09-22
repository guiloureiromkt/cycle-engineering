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

## Before the gate means anything

Two prerequisites, and a rule.

- **`claude plugin eval`, CLI 2.1.270 or newer.** The suite under `evals/` is run by the host's own runner. `claude plugin eval --help` should print usage; if it says the command is in early access, run `claude update`.
- **A credential that will spend.** Each case is a full Claude run on your own account. Measured on 2026-09-13: one case costs US$0.77 to $3.15, the whole suite once US$13.65, and a three-run pass with the no-plugin arm US$60–120. `npm run gate` keeps the blocking run small by scoring only the cases that cover what changed; the ceilings live in `package.json` and are the owner's numbers, not the agent's.
- **A case file from someone else is not run until a human has read its `scaffold_script`.** `--scaffold` executes author-supplied bash as you, outside the agent's sandbox, and `--trust-plugin` skips the prompt that would have asked. On a contributed case, read the script first; never pass either flag on a suite you have not read.

## The rule that keeps the suite honest

A change to `skills/`, `agents/` or `hooks/` may not ride in the same commit as a change under `evals/`. `npm run gate` fails and names any commit that does. It is the plainest form of a rule the literature is blunt about: when the verifier evolves with the system, the cheapest way to pass is to make the test easier. Propose cases freely; never let a change grade itself with a case it wrote.


### When the case itself is the defect

The rule above assumes the test is right. Sometimes it is not: a case can fail a run that did everything
asked of it, and then the case is what has to change. That is the one exception, and it is narrow.

**The justification must be a kept artifact from a run** — a trace, a graded file, the workspace held with
`--keep-temp` — **never an argument.** "This grader is too strict" is not evidence. "Here are the ten
edits that run made, and none of them is the thing the grader claims" is.

**The claim may be no wider than the artifact supports.** On 2026-09-21 a case was changed on the strength
of a trace showing that *no `Edit` or `Write` in that run accepted the plan*. The first three drafts of
that cycle said *"the run was correct"* instead, and the same trace refutes it: the run also executed host
code from inside its sandbox. The narrow claim was enough; the wide one was false.

**A replacement is not trusted until it has been shown failing.** Build a throwaway case that commits the
violation on purpose, run it, and keep the result in the case's `case.meta.md`. A grader that has only
ever been seen passing is a grader nobody has tested. Two instruments in that same cycle returned green
for a pattern that matched nothing, which is how this was learned.

**An offline matrix is calibration, not proof.** A test that reimplements the runner's matching in
JavaScript never calls the runner. Record the CLI version it was calibrated against and re-validate it
against one live case load when that version changes.

Three designs died at the gates in that cycle, two of them on measurements that contradicted the design's
own headline number. If a fourth is needed, that is the process working, not a reason to skip it.
