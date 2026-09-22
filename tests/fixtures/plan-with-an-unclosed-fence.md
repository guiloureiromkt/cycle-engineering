---
type: plan
status: draft
spec: specs/fences.md
intent: intent/fences.md
date: 2026-09-20
accepted_by: someone · 2026-09-20
---

# Plan: a plan whose code fences are not well behaved

**Goal:** rename an internal helper.

## Files that change

- Modify: one helper

    ```
    This fence is indented, so it is content inside a list item, not a fence
    marker. If the extractor toggles on it, everything below is swallowed and
    the Proof section never reaches the matcher.

## Proof

- **Bar:** the customer sees the refund exactly once.

```
This fence opens at column zero and is never closed. Everything after it is
skipped, and the resolver has to say so rather than resolve on a silent partial.
