# Intent · interview format, backlog triage, "no questions"

Companion to `cycle:intent`. Read when running the interview or when the user restricts questions.

## Round format
Number every question in the frontier. Each one carries your recommended answer, so the user can accept with one word:

```
❓ **Q1** · **<title>**: <question; multiple choice is fine>
➡️ <your recommendation>
---
❓ **Q2** · ...
```

Ask the whole frontier at once. Wait. Recompute the tree from the answers. Ask the next frontier. Stop when nothing is left assumed.

## Backlog triage
Several draft intents: `/cycle:triage` labels each one (area · size · kind · priority) and the product owner orders them. Size L goes back to `cycle:intent` to be split before any spec.

## When the user says "no questions"
One round only, with the three questions that most change the outcome, each with a recommendation. Everything else goes under "Open questions" and the intent is born as `status: draft`, not accepted. Hurry changes the size of the interview, not the existence of the artifact.

## Common mistakes
- Asking a fact ("what is the test command?"): look it up.
- One question per message when the frontier has five: a round is the whole frontier.
- Skipping the sweep because "it's simple": the sweep is what prevents rebuilding what already exists.
- An intent that already says "use localStorage": that is spec. Go back to the pain.
