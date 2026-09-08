---
name: verify-before-done
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

> Source: obra/superpowers (MIT) · upstream SHA ceb2f1f67f4cadb29b32a06e54d3d0be832071f5 · copied 2026-09-03. Cross-references retargeted to cycle:*. **Diverged 2026-09-08** (prompt audit for Fable 5.1, CHANGELOG 0.2.1): refresh by merge, never overwrite.

# Verification Before Completion

## Overview

**Core principle:** evidence before claims. A claim you have not run the command for in this message is a guess, and a guess reported as a result costs more than the check would have.

Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

The check itself: name the command that proves the claim, run it complete, read the exit code and the failure count, then state the claim with that output beside it.

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## When To Apply

Before any statement that the work is done, passing, fixed or ready, and before committing, opening a PR, moving to the next task, or acting on a subagent's report. Paraphrase counts: the rule is about the claim, not the wording.

## Why it matters

False completion is expensive in a particular way: the user acts on it, finds the gap later, and pays the rework plus the cost of doubting every report after it. The command that would have caught it takes seconds.
