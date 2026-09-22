---
name: constraints
description: Use when a repo has no written quality bar and `cycle:spec` step 1 finds no `CONSTRAINTS.md`, when the user says "set up constraints" or "define our standards", or standalone to retrofit a bar onto a repo with no feature in flight.
---

> Source: constraint-driven-development, addyosmani/agent-skills (MIT) · adapted 2026-09-16

# Constraints

Writes `CONSTRAINTS.md` once, at the repo root: the numeric quality bar that outlives the session. `cycle:verification-gate`'s Bar lens reads it back on every later diff.

## Step 0 · Detect before asking
Read `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `Gemfile` / `build.gradle` (whichever exists) and the repo's linter/test-runner/CI config. Report what was found in two lines before asking anything. **Nothing detected:** say so and route every dimension to "Measured, not yet enforced" — never invent an "Enforced" number against tooling that is not there.

## Step 1 · Four questions, one at a time, each with a default
1. Beyond the Floor, which matter: coverage, security scanning, performance, accessibility, architecture boundaries? Default: coverage + security, if a test runner and user input already exist.
2. Check fails mid-task: block or warn? Default: block on the Floor, warn elsewhere for two weeks.
3. Target numbers in mind, or measure today and hold the line? Default: measure and hold — a ratchet, Step 2.
4. Slowest check tolerable before work is handed back? Default: 90 seconds at task end, unlimited in CI.

"I don't know" is a complete answer every time — the default still produces a working file. Stop at four; a longer intake produces a config nobody can explain.

## Step 2 · Write CONSTRAINTS.md
From `templates/constraints.md`, four sections in fixed order: **Floor** (tool-free, always on) · **Enforced with numbers** (dimension · rule · checked by · runs at · owner — a number with no accountable person outlives whoever set it) · **Measured, not yet enforced** (today's value, "must not fall/grow") · **Exceptions** (id · rule · path · reason · owner · expiry).

**Never write a number into "Enforced" that the codebase fails today** unless the owner explicitly says to record it red and accept that. A number nobody has an opinion on goes to "Measured" instead — a ratchet, not an invention. Same rule `docs/CONTRACT.md` already applies to `.cycle/gate.json`: the owner's numbers, never the agent's.

## Step 3 · Tools
`references/tool-menu.md` names a concrete checker per dimension per ecosystem (JS/TS, Python, Go, Rust), including a named secret scanner — never a generic "secrets" placeholder. Install what the interview picked; don't hand-roll a checker when a de facto one exists.

## Notes
- **No concurrent invocation.** Two sessions on the same repo, or a hand-edit racing a ratchet update: undefined, don't do it.
- **Re-run only on request**, never automatically. Non-interactive (CI, `/loop`), nobody to interview: apply the Floor, note that, flag the rest for a human.

`references/floor-guard.md` is what the Bar lens checks a diff against; this skill only writes the file, it does not scan diffs.
