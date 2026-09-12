---
name: intent
description: Use when someone brings an idea, feature, bug or request without an intent/<name>.md, when a draft intent needs closing, when an alert or incident must become a request, and when the user asks to be interviewed or "grilled".
---

# Intent (discovery)

Discovery built on the **decision-tree interview in rounds** from `grilling` (Matt Pocock, MIT) and the **context exploration + approaches** of `cycle:brainstorming`. Output: `intent/<name>.md` from the plugin template, `status: accepted`, author and date. It says what and why, in the words of whoever asked. Never a technical solution.

## Step 0 · Explore before asking
Read the repo (files, docs, recent commits), `CLAUDE.md`, accepted intents. If the request spans independent subsystems, say so and split: each becomes its own intent. Don't refine a request that needs splitting.

## Step 1 · Interview in rounds (the tree)
Map the request as a **decision tree**: each decision opens the ones that depend on it. The **frontier** is what you can ask now without guessing answers that haven't come. Ask the whole frontier in one numbered round, each question with your recommended answer. The answers reshape the tree and push the frontier; recompute and ask again. A question depending on one still open waits.

**Facts are your job, decisions are the user's.** A question that needs a fact (file, tool, number) becomes a subagent; never ask what you can look up. Focus: purpose, constraint, success criterion. The interview ends when the frontier is empty: nothing was silently assumed.

## Step 2 · Sub-intents
Tree closed, ask: what orbits this request and cannot be forgotten once it exists? Who else is affected? What breaks if this changes? Each answer is a line under "Sub-intents", with its why. A sub-intent is a product front, not a task.

## Step 3 · Two sweeps, in parallel (research pass 1)
Dispatch two subagents at once (REQUIRED SUB-SKILL: `cycle:parallel-agents`), `model` = `models.sweeps` from `.cycle/config.json` (missing key = `haiku`); the main session's model is the user's choice.
- **Inside:** if you have a knowledge base or vault, search it; otherwise search the repo, its git log, installed skills and project memory. What already solves part of this?
- **Outside:** repos, public skills, practices, benchmarks.
Each finding enters the "What already exists" table with a verdict **use · adapt · discard**. An external skill gets "use" only after `cycle:adoption-filter`. This is pass 1. `cycle:research` runs after acceptance and goes deeper by trigger; do not do its work here.

## Step 4 · Approaches
Propose 2 or 3 paths with trade-offs, recommendation first. Still intent, not spec: the chosen path goes under "Proposed outcome" in product language.

## Step 5 · Write, correct, accept
Template: `<plugin root>/templates/intent.md` (the session hook prints the root). Show the originator; they correct what you misread. Only then `status: accepted`, commit, next: `cycle:research`. The repo's product owner accepts, not the writer.

## Backlog, "no questions", common mistakes
Details in `references/interview.md`. In short: `/cycle:triage` labels draft intents; "no questions" means one round of three questions and a draft, not acceptance; never ask a fact, never skip the sweep, never write "use localStorage" in an intent.
