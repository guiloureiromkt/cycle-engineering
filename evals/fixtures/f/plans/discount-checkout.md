---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/discount-checkout.md
intent: intent/discount-checkout.md
research: research/discount-checkout.md
date: 2026-09-12
accepted_by:
gates: []
---

# Discount at checkout — implementation plan (draft, gates not run yet)

**Goal:** `charge()` accepts a coupon code and applies the SET10 percentage discount without losing cents.

**Architecture:** a `resolveCoupon(code, now)` in `src/coupons.js` returns `{ percent, validUntil }` or throws; `charge()` in `src/billing.js` calls it and computes the discounted amount in integer cents.

### Task 1: `resolveCoupon`
**Files:** create `src/coupons.js`; test `tests/run.js`.
- [ ] Test: `resolveCoupon('SET10', new Date('2026-09-15'))` → `{ percent: 10 }`; unknown code throws.
- [ ] Implement; run `npm test`; commit.

### Task 2: `charge()` applies the discount
**Files:** modify `src/billing.js`; test `tests/run.js`.
- [ ] Test: `charge(1000, 'SET10')` → `900`; `charge(1005, 'SET10')` → `905` (round half up on the last cent).
- [ ] Implement in integer cents; run `npm test`; commit.

## Risks
none

## Proof
`npm test` green.
