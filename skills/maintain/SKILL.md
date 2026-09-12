---
name: maintain
description: Use when an alert, ticket, channel message, schedule or out-of-band metric invokes the agent with no person in the loop, and for the four periodic reviews of a product in production (security, usage and usability, code, backup).
---

# Maintain

The loop closes. The trigger invokes the agent, it diagnoses, acts only through gated routes, and writes what it found as `intent/<name>.md` with `origin: incident`. People triage; they no longer have to start.

## Triggers
- **Band broken.** A deterministic script (no model) measures a metric against a rolling baseline; `.cycle/bands.yaml` (template in the plugin root): 1σ logs · 2σ diagnoses read-only · 3σ proposes (PR or pre-approved runbook, never a direct deploy).
- **Ticket, message, schedule.** Same output: an intent.

## The four periodic reviews (cadence in the repo's `CLAUDE.md`; weekly by default)
1. **Security.** The host's built-in security review when available; otherwise a fresh-context reviewer on auth, injection, secrets, PII in logs.
2. **Usage and usability**, both in the same review:
   - **Signposts:** read `## Signposts` of every plan shipped since the last review; for each inversion say whether it is now visible (that future is not coming) or not; a signpost that lit becomes an intent.
   - **Usage (data):** analytics, logs, funnel. What nobody uses, where they get stuck, what grew. Source: whatever measurement the product has installed.
   - **Usability (persona):** a subagent acts as the intent's target user and uses the product end to end (real browser), reporting friction and where it could not find the feature. It is the reach test, repeated in production.
3. **Code.** Review of what changed since the last one (built-in code review when available; the three passes of `cycle:deploy` otherwise).
4. **Backup.** Does it exist, does it run, and did it **restore** in a recent test? An untested backup is a hypothesis.

## Steps
1. Run stateless: read the trigger and the repo, no memory of the previous session.
2. Diagnose with read-only tools first.
3. Write `intent/<date>-<name>.md` in the `cycle:intent` format: anomaly with pasted evidence (log, number, screenshot), proposed outcome, affected systems, open questions.
4. 3σ with an approved runbook (rollback): run the runbook. Any other action becomes a PR through `cycle:deploy`.
5. Whoever operates triages: now · schedule · discard. A discard adjusts the band.
6. A fix that shipped becomes a permanent eval (`cycle:evolve`).

## Common mistakes
- A model deciding whether the band broke.
- Acting at 2σ.
- A usage review without a number, or a usability review without a named persona.
