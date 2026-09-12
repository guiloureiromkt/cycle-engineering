---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/readme-typo.md
intent: intent/readme-typo.md
research: research/readme-typo.md
date: 2026-09-12
accepted_by:
gates: []
---

# Fix the typo "recieve" in README.md — plan (draft, gates not run yet)

**Goal:** README.md says "receive".

### Task 1: the word
**Files:** modify `README.md` line 2.
- [ ] Change "recieve" to "receive"; `grep -c recieve README.md` → 0; commit.

## Risks
none

## Proof
`grep -c recieve README.md` prints 0.
