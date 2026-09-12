---
type: research
status: done
intent: intent/discount-checkout.md
date: 2026-09-12
depth: deep
author: fixture
---

# Research: how do checkouts apply a percentage discount without losing cents

Depth: deep because the change touches money.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| Amounts are integers in the smallest currency unit; rounding is decided once, in the money type, never at display | https://docs.stripe.com/currencies · accessed 2026-09-12 | 🟢 fact |
| Percentage coupons need an explicit rule for the last cent (round half up is the common default) | https://docs.stripe.com/billing/subscriptions/coupons · accessed 2026-09-12 | 🟡 inference |

## What the market does (benchmarks)
| Product or practice | Direct / indirect | What it does | Evidence (screenshot path under research/<name>/ or URL · date) | Verdict | What we do differently |
|---|---|---|---|---|---|
| Stripe coupons | direct | percent_off with a validity window; server computes the amount | https://docs.stripe.com/api/coupons · 2026-09-12 | adapt | same validity rule, our own rounding |
| Shopify discounts | direct | percentage or fixed, applied at line level, then summed | https://help.shopify.com/en/manual/discounts · 2026-09-12 | refuse | we apply at order level |
| A hand-rolled float discount (the fixture's current code) | indirect | `price * 0.9` in floating point | src/billing.js · 2026-09-12 | refuse | integers only |

## What we assume
- Every order has a single currency — cheap check: grep the fixture's orders for a currency field.

## What we did not check
- Tax interaction: discount before or after tax.

## Recommendation for the spec
Integer cents, one rounding rule stated in the spec, validity window checked on the server, and a test that fails on the half-cent case.
