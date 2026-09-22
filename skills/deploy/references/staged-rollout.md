# Staged rollout

> Source: shipping-and-launch, addyosmani/agent-skills (MIT) · adapted 2026-09-16

This is for a repo whose deploy already has feature flags or a canary mechanism — most don't. If this repo doesn't, stop reading: the binary approval gate (`skills/deploy/SKILL.md`, "The production gate") is all you need.

## Feature-flag lifecycle

1. **Deploy** with the flag off — code is in production but inactive.
2. **Enable** for team/beta — internal testing in production.
3. **Canary** — the flag on for a small slice of users.
4. **Gradual increase** — a larger slice at each step.
5. **Full rollout** — the flag on for everyone.
6. **Clean up** — remove the flag and the dead code path.

Monitor at every stage: error rates, performance, user feedback. Rules, kept from the source verbatim because they are stack-agnostic: **every feature flag has an owner and an expiration date; clean up flags within 2 weeks of full rollout.** Don't nest feature flags (exponential combinations). Test both flag states in CI.

## Decision thresholds

The σ labels here are a borrowed severity vocabulary, not `.cycle/bands.yaml`'s literal statistic. `bands.yaml` requires a `rolling_30d` baseline and Western Electric rules — both assume a stable, in-control process. A staged rollout is the opposite: the population and sample size change at every stage. Unless you have built a canary-specific baseline with enough samples for that math to mean something, treat 1σ/2σ/3σ here as informal words for "log it," "stop and look," "back out" — not as a computed standard deviation.

**Small-N warning:** a canary slice of a low-traffic product can be single digits. At that scale, σ language is meaningless — use a plain go/no-go judgment for the stage instead.

**Same-baseline warning:** never write a rollout's canary-window metric readings into the same `bands.yaml` baseline file used for steady-state `cycle:maintain` monitoring — the traffic-mix shift during a rollout will poison that baseline for weeks after the rollout completes. Use a separate, scoped metric name during the rollout window if `bands.yaml` is used at all.

**Who acts, per tier:** 1σ is a log line, no human needed. 2σ is a human- or agent-read diagnosis, read-only — same as `cycle:maintain`'s own 2σ tier. 3σ **proposes** a rollback; it does not execute one.

| Metric | 1σ (log) | 2σ (hold, diagnose) | 3σ (propose rollback) |
|---|---|---|---|
| *(fill in per metric — one worked example below)* | | | |
| Error rate | within 10% of the pre-rollout baseline | 10-100% above baseline | more than 2x baseline |
| *(your own metric here)* | | | |

Fill in your own row the same way you'd fill in a `bands.yaml` baseline: pick the metric, then decide what "log," "hold," and "back out" mean for it. No number here is enforced by this file — it is a template, not a check.

## Rollback-plan template

Write this before the first stage goes live, not after something breaks.

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 3σ above baseline (or your own written threshold from the table above)
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable the feature flag (if applicable)
   OR
1. Deploy the previous version: `git revert <commit> && git push`
2. Verify the rollback: health check, error monitoring
3. Communicate: notify the team

### Database / State Considerations
**Before running any command below, write `.cycle/work/<intent>/snapshot.md` yourself (name the snapshot, how to restore it, today's date) — `cycle:build` Rule 4's own hook only recognizes `migrate reset|down|fresh` as destructive, and none of these named rollback commands match that pattern, so the hook will not stop you. The snapshot step here is not optional just because the hook stays quiet.**
- Migration [X] has a rollback: the migration tool's own rollback command (e.g. `npx prisma migrate rollback`, `python manage.py migrate <app> <previous>`, `rails db:rollback`, a `goose down`) — name yours here, and confirm it has actually been exercised once, not just written (an untested rollback is a hypothesis, the same principle `skills/deploy/SKILL.md` and `skills/maintain/SKILL.md` already apply to backups)
- Data inserted by the new feature: [preserved / cleaned up] — "cleaned up" is itself a destructive production action; snapshot first, same as the migration rollback above

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```

**Executing a rollback, at any σ tier, still goes through the same human-authorized production path as any other production action (`RELEASE_APPROVAL`, `skills/deploy/SKILL.md`'s production gate). This table does not grant an agent standing authority to act at 3σ — it tells a human what to look at.**
