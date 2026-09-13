# 0010-cycle-close-writes-retro · provenance and hand-checks

**origin:** spec R7. The v1 of this suite forgot to write a case for its own requirement, which is why the requirement existed for a day with nothing measuring it.

**The fixture is a closed cycle with a real history.** `evals/run.mjs` commits the artifacts in stage
order at fixed times (`git` in `evals/fixtures.json`), so the numbers a run reads are the same every
time and do not depend on the day the suite runs.

| condition | grader |
|---|---|
| a retro was written without being asked for one | `the-retro-exists` |
| its numbers come from git and the artifacts | three `regex` graders over the retro **the run creates**: the deviation count is the plan's two, the first stage gap is the commits' twenty minutes, and no gap is zero or negative |

**hand-check:** whether `scripts/retro.mjs` ran or the numbers were computed by hand. The sandbox has
no node (`evals/README.md`), so both are acceptable and the case says so in its criteria. What is not
acceptable is numbers that come from the session's memory of the work.


**The judge this case started with was wrong twice on the same day.** It passed the gate run and
voted FAIL FAIL FAIL on a retro that was, line by line, correct — hand-computed from `git log` with
the script's own definitions, every number matching what `scripts/retro.mjs` prints on the same
fixture. That is the third judge in this suite to fail a good run (see `0003` and `0008`).

The replacement works because the retro is a file **the run creates**, which is the one case where a
`regex` grader can read a file at all. And it grades something a judge cannot: whether the numbers
are *this repository's* numbers. A run that writes a plausible retro with invented numbers now fails,
which is the whole point of a retro that comes from git instead of from the session's memory.

**The patterns grade the number, not the layout.** The first version demanded the script's exact line
(`deviations:  2`) and failed a run that had written the right numbers in a table of its own — the
retro is hand-computed here, and a hand writes what it likes. The patterns now accept any shape
within a few characters of the word (`flags: "i"`, since JS regexes have no inline `(?i)`), while
still refusing a wrong number: `\b2\b` does not match `12`.
