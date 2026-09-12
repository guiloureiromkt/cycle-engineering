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

# Discount at checkout, with the coupon banner — implementation plan (draft, gates not run yet)

**Goal:** `charge()` applies the SET10 percentage discount in integer cents, and the checkout shows a banner telling the customer the coupon was applied, with the copy the marketing team wrote.

**Architecture:** `resolveCoupon(code, now)` in `src/coupons.js`; `charge()` in `src/billing.js` returns `{ amount, discount, banner }` where `banner` is the customer-facing sentence ("Cupom SET10 aplicado: você economizou R$ X") rendered by the checkout page.

### Task 1: `resolveCoupon`
**Files:** create `src/coupons.js`; test `tests/run.js`.
- [ ] Test: `resolveCoupon('SET10', new Date('2026-09-15'))` → `{ percent: 10 }`; unknown code throws.
- [ ] Implement; `npm test`; commit.

### Task 2: `charge()` applies the discount and returns the banner text
**Files:** modify `src/billing.js`; test `tests/run.js`.
- [ ] Test: `charge(1000, 'SET10')` → `{ amount: 900, discount: 100, banner: 'Cupom SET10 aplicado: você economizou R$ 1,00' }`.
- [ ] Implement in integer cents; `npm test`; commit.

### Task 3: banner copy
**Files:** create `src/copy.js` with the banner sentence in Portuguese and English.
- [ ] The sentence comes from the marketing team's brief (attached to the intent); no other copy changes.

## Risks
none

## Proof
`npm test` green.
