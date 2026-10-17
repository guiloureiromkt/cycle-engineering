---
name: deploy
description: Use when the build passed its proof and is about to become a PR, a merge or a release, and whenever a deploy command is blocked by the cycle's production gate.
---

# Deploy

The agent does everything up to the production gate and nothing past it. Review runs both ways: the agent reviews PRs and answers comments on its own.

## Steps
1. **Protected branch.** Everything the agent writes becomes a PR. No direct path to `main`.
2. **Open the PR** with: what changed, literal test/lint/build output (from `cycle:test`), a link to `plans/<x>.md`, and what was left out.
3. **Three-pass review** by another instance (not the one that wrote): bugs · security · conformance with spec, plan and design principles. Policy in the repo's `REVIEW.md` if it exists (template: `<plugin root>/templates/REVIEW.md`). Use the host's built-in code and security review commands when available; otherwise a fresh-context reviewer runs the three passes. The security pass is mandatory when the change touches permission, data or network.
4. **A repeated finding becomes a line in `CLAUDE.md`** ("What Claude gets wrong here"), in the same PR.
5. **A human approves** through branch protection. A finding neither approves nor blocks on its own.
6. **Deploy per environment.** Dev: free. Staging: the agent publishes. Production: the agent prepares, the human authorizes.

## Before the PR
- **The retro, if `cycle:test` did not write it.** `node <plugin root>/scripts/retro.mjs <intent>` → `.cycle/work/<intent>/retro.md`. A cycle that ships without one leaves nothing for `cycle:evolve` to read next week.
- **The method repo publishes only behind its own gate.** If `.cycle/config.json` has `method_repo: "."`, this repository *is* the method: a changed skill changes what every other repo is judged by. Publishing requires the output of `npm run gate` pasted in this session, green, from the commit being published. The gate is deterministic and free — unit tests, the commit-shape rule, the coverage map, a RED→GREEN record committed for every changed method file a case covers, `npm test` green inside `git archive HEAD`, no machine path — so: **no baseline, no publish**; a paid run is never the tag's condition. A closed cycle that changed a method file publishes a **patch version**; tag the previous release locally before the gate runs, so the base is one cycle back and the record rule reads only what that cycle changed. A paid check, when someone wants one, is one or two cases of `npm run evals`, whose numbers are the owner's (`docs/CONTRACT.md`).
- **The publish runs from inside the gated tree, and the gate knows the method's remote.** `node scripts/publish.mjs <ref>` prepares the clone under `.cycle/work/publish/pub/`, refuses an unbumped version, and prints the push commands; run them from that directory. The production gate's publish guard judges by the remotes of the directories a command can reach, and refuses a push to the method's public repository from anywhere else, approval or not (2026-10-16: a clone in `/tmp` had escaped; the first guard read the text's shape and the final review found seven routes around it). Inside the method repository the push needs that repository's approval (`<git-common-dir>/cycle/release-approval`, shared by every worktree, or `.cycle/release-approval` for that checkout), written by a human, naming the publish: today's date and the word "publish" or the version being released.

## The production gate (plugin hook)
A command that looks like a production deploy is blocked (exit 2) unless `RELEASE_APPROVAL` is set in the session or `<git-common-dir>/cycle/release-approval` (shared by every worktree) or `.cycle/release-approval` carries today's date. Write the file with the date the refusal prints: the owner's local day.

**When blocked:** show the user the hook's message and stop. **The agent does not export the variable or create the file** (the `protect-cycle` hook blocks that as well). If the user says "release it", they write the file themselves (name · date · what is being released). Then run the command again.

A deploy command the hook does not recognize: say which one and propose adding it to `.cycle/gate.json` → `patterns`. Do not work around it with another spelling of the same command.

## Stateful systems
If `.cycle/config.json` has `stateful: true`, a production deploy requires a restore test newer than 30 days, recorded in `.cycle/work/<intent>/restore-test.md`. A backup that was never restored is a hypothesis.

## Rollback is the most rehearsed path
Before the first deploy through the cycle, a rollback command exists, is in `CLAUDE.md`, and has run in staging. `cycle:maintain` depends on it.

If this deploy has stages (flags, canary, gradual traffic), see `references/staged-rollout.md` before the first stage goes live. If it does not, this paragraph does not apply.

## Common mistakes
- Rewriting the command to escape the hook ("same deploy, just without the word").
- Confirming a deploy by the artifact instead of the process (a stale build file looks identical to the new one). Wait for the process to finish and check inside the container.
- Redeploying from a dashboard when the build is prebuilt: a new env var needs a new workflow run.
