---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/discount-checkout.md
intent: intent/discount-checkout.md
research: research/discount-checkout.md
date: 2026-09-12
accepted_by:
gates:
  - graph: done · 2026-09-12
  - devils-advocate: done · 2026-09-12 · 3 🔴 · 3 🟠 · 3 🟡 · all answered below
  - pre-mortem: done · 2026-09-12
  - council: run · 2026-09-12 · gates lite, trigger money · the user asked to "run the gates" (interpreted as including the council; no separate answer recorded) · 5 demands, all answered below
  - loop: done · 2026-09-12 · gauntlet: no
---

# Discount at checkout — implementation plan

**Goal:** `charge()` accepts a coupon code and applies the SET10 percentage discount in integer cents, rounding once, in the customer's favor, with the audit fields finance needs.

**Architecture:** `resolveCoupon(code, now)` in `src/coupons.js` validates the code against a fixed server-side table and returns `{ code, percent, validUntil }` or throws. `charge(customerId, amountCents, couponCode?, now?)` in `src/billing.js` calls it, computes the discount in integer arithmetic, applies the existing positive-amount guard to the **final** amount, and returns the old fields plus `originalAmountCents`, `discountCents`, `coupon`.

## Decisions (each one answers a gate finding; the acceptor is signing these)

| # | Decision | Why | Source |
|---|---|---|---|
| D1 | Signature is **additive**: `charge(customerId, amountCents, couponCode = undefined, now = new Date())`. Return object is **extended**, never replaced. | The checkout screen lives outside this repo (spec § Fora de escopo, intent § Usuários), so callers we cannot see pass two positional args. The draft's `charge(1000, 'SET10') → 900` changed both the arity and the return type. | advocate 🔴 #2 |
| D2 | Rounding: `discountCents = ceil(amountCents × percent / 100)`, computed as `n = amountCents*percent; floor(n/100) + (n % 100 ? 1 : 0)`. No floating point. `charge(c, 1005, 'SET10')` → discount 101, final **904**. | Spec R5 says "a favor do cliente". The draft asserted 905 (round half up on the amount), which is one cent against the customer. Research line 18 marks half-up as a 🟡 inference, and the research's own recommendation is a test that fails on the half-cent case; the spec, approved by Ana, is the rule. | advocate 🔴 #1 · council voice 2 |
| D3 | R4 floor: the guard already at `src/billing.js:3` moves to run on the **final** amount. If final < 1 cent, `charge` throws `invalid amount`. `charge(c, 1, 'SET10')` throws (discount ceil(0.1)=1 → 0). | Intent § Restrições: "Nunca cobrar zero". Clamping the discount would silently charge a different price than promised. | advocate 🟠 R4 |
| D4 | Coupon input policy (spec § Áreas de preocupação, "resolver no plano"): see the table below. Unknown or expired coupon **throws** rather than charging full price. | Charging full price when the customer typed a coupon recreates the refund queue the intent exists to kill. Throwing lets the caller show the error before money moves. | advocate 🟠 · council voice 4 |
| D5 | Validity: SET10 valid through **2026-09-30 23:59:59.999 America/Sao_Paulo** (inclusive), compared against `now`, which `charge` receives as a parameter (default `new Date()`) and passes through. | Intent § Sub-intents ("expira em 30/09"). Without injecting `now`, the suite goes red on its own on 2026-10-01 and no test can hit the boundary. | advocate 🟠 time |
| D6 | Single currency, 2 decimals, assumed. Tax not modeled: the discount applies to the amount passed in. | Research § What we assume / What we did not check. Cheap check run 2026-09-12: no `currency` field anywhere in `src/`, `tests/`, `package.json`; `charge` takes cents with no currency. | research lines 27–31 · council voice 3 |
| D7 | Failed coupon lookups are logged with `console.warn('coupon rejected', { customerId, reason })`. Rate limiting is **not** in this repo (no HTTP layer here); it belongs to the caller and is recorded as a risk. | Council asked for abuse visibility; intent forbids new dependencies. | council voice 4 |

### Coupon input table (D4)

| Input | Behavior | Test |
|---|---|---|
| `undefined` / `null` | no discount · `discountCents: 0` · `coupon: null` · existing behavior | T2.1 |
| non-string (`10`, `{}`, `['SET10']`) | throws `invalid coupon` | T1.3 |
| `' set10 '` | trimmed, upper-cased, then matched → SET10 | T1.4 |
| string not matching `/^[A-Z0-9]{1,16}$/` after normalization | throws `invalid coupon` (never reaches the lookup) | T1.3 |
| unknown code | throws `unknown coupon` | T1.2 |
| known code, `now` past validity | throws `coupon expired` | T1.6 |

Security-review sign-off named in the spec: **Gui**. Signing this plan closes the concern for this repo's surface.

## Shape of the work (Gate 1 · graph)

- **Sequential, one agent (main session).** Task 2 imports Task 1's function, so the edge is real; nothing here splits.
- **Separate verifier: required** (money). `cycle:verifier`, model `sonnet` per `.cycle/config.json`, runs after the session's own `npm test` is green, from a fresh context, and reproduces the numbers in the Proof table.
- **Human gates:** (1) acceptance of this plan; (2) the release approval before deploy, written by a human as the repo's CLAUDE.md requires. None between the two tasks.
- **Merge owner:** main session.

## Tasks

### Task 1: `resolveCoupon`
**Files:** create `src/coupons.js`; tests in `tests/run.js`.
- [ ] Tests first (all must fail before implementation):
  - T1.1 `resolveCoupon('SET10', new Date('2026-09-15T12:00:00-03:00'))` → `{ code: 'SET10', percent: 10, validUntil: <Date 2026-09-30T23:59:59.999-03:00> }`
  - T1.2 `resolveCoupon('NOPE', now)` throws `unknown coupon`
  - T1.3 `resolveCoupon(10, now)`, `resolveCoupon({}, now)`, `resolveCoupon('SET-10!', now)` throw `invalid coupon`
  - T1.4 `resolveCoupon(' set10 ', now)` → SET10
  - T1.5 boundary valid: `now = new Date('2026-09-30T23:59:59-03:00')` → resolves
  - T1.6 boundary expired: `now = new Date('2026-10-01T00:00:00-03:00')` throws `coupon expired`
- [ ] Implement: fixed table `{ SET10: { percent: 10, validUntil: '2026-09-30T23:59:59.999-03:00' } }`, normalization, pattern check, lookup, expiry check. No dependency.
- [ ] `npm test` green; commit.

### Task 2: `charge()` applies the discount
**Files:** modify `src/billing.js`; tests in `tests/run.js`.
- [ ] Tests first:
  - T2.0 the pre-existing test `charge('c1', 100)` is **unchanged** and still passes (D1)
  - T2.1 `charge('c1', 1000)` → `{ customerId: 'c1', amountCents: 1000, originalAmountCents: 1000, discountCents: 0, coupon: null, status: 'charged' }` (R3 shape with no coupon)
  - T2.2 `charge('c1', 1000, 'SET10', sept)` → `amountCents: 900, originalAmountCents: 1000, discountCents: 100, coupon: 'SET10'` (R3 shape with coupon)
  - T2.3 half-cent: `charge('c1', 1005, 'SET10', sept)` → `amountCents: 904, discountCents: 101` (R5, D2)
  - T2.4 floor: `charge('c1', 1, 'SET10', sept)` throws `invalid amount` (R4, D3)
  - T2.5 `charge('c1', 1000, 10, sept)` throws `invalid coupon` (R1: a percentage is not a coupon)
  - T2.6 `charge('c1', 1000, 'SET10', new Date('2026-10-01T00:00:00-03:00'))` throws `coupon expired` (R2 through the real entry point)
  - T2.7 `charge('c1', 0)` still throws `invalid amount` (guard preserved for the no-coupon path)
- [ ] Implement per D1–D3, D5, D7. Integer arithmetic only; one rounding step.
- [ ] `npm test` green; commit.

### Requirement coverage

| Req | Task | Tests |
|---|---|---|
| R1 coupon string, not a percent | T1, T2 | T1.3, T2.5 |
| R2 SET10 = 10% until 30/09, server-side | T1, T2 | T1.1, T1.5, T1.6, T2.6 |
| R3 return has originalAmountCents, discountCents, coupon | T2 | T2.1, T2.2 |
| R4 never zero or negative | T2 | T2.4, T2.7 |
| R5 round once, integer cents, customer's favor | T2 | T2.3 |
| Spec concern: client coupon unvalidated | T1 | T1.2, T1.3, T1.4 · D4 table · sign-off Gui |

## Pre-mortem (Gate 3) — "six months later, this failed. Why?"

| Sev | Failure | Cheap test before building |
|---|---|---|
| 🔴 | Half-cent rounding went against the customer; finance found the spec violated on every odd-cent order. | T2.3 asserts 904. Acceptor confirms 904 is what "a favor do cliente" means (R5). |
| 🔴 | Out-of-repo checkout broke on deploy because `charge` changed arity or return type. | T2.0 keeps the old call and old fields untouched. |
| 🔴 | Coupon still worked in October: `now` came from the client, or the boundary was in UTC (a 22:00 BRT purchase on 30/09 is already 01/10 UTC). | T1.5/T1.6 and T2.6 at the São Paulo boundary; `now` is never read from the request in this repo. |
| 🟠 | Finance could not reconcile: the audit fields were missing, so 40 refunds/week became 40 untraceable discounts/week. | T2.1/T2.2 assert the R3 shape. |
| 🟠 | Customers got 20%: code shipped while support kept refunding 10% by hand. | Operational, not code: release note tells support to stop manual refunds the day this deploys; R3 fields let them verify. Listed in Risks. |
| 🟠 | `charge` returned 0 on a 1-cent order with a coupon. | T2.4. |
| 🟡 | Coupon string abused as an oracle (enumeration) from the checkout. | Pattern gate + warn log (D7); rate limit owned by the caller, recorded in Risks. |
| 🟡 | Floating point crept back (`amount * 0.9`). | D2 formula uses only integer ops; T2.3 would catch a float slip on 1005 only by luck, so the verifier also reviews the arithmetic line. |

## Risks

Money moves here (`src/billing.js:1`), so this section cannot be "none".

1. **Rounding direction is a financial policy.** Plan follows spec R5 (customer's favor, 904 on 1005). If finance actually meant half-up, the spec is wrong, not this plan; the acceptor decides before accepting.
2. **Callers outside this repo.** Mitigated by the additive signature (D1) and T2.0. Rollback: `git revert` of the two task commits restores the old `charge()`; no data migration is involved.
3. **Expiry and timezone.** Boundary fixed to America/Sao_Paulo end of day (D5). If the campaign is announced in another timezone, change the constant, not the logic.
4. **Double discount during transition.** Support must stop manual refunds when this deploys. Human action; goes in the release note.
5. **Single currency and no tax modeled** (D6). If a currency field or tax step appears later, the discount step must be re-placed deliberately.
6. **Coupon enumeration / rate limiting** lives outside this repo. Recorded here so the checkout owner sees it.
7. 🟡 For the record: the spec (approved 2026-09-02) cites a research file dated 2026-09-12. R5's "conselho financeiro" is the only R5 source that predates the approval. Not a blocker; noted so nobody thinks the research was reviewed before approval.

## Proof (Gate 5 · the bar for "done")

- `npm test` output pasted, showing T1.1–T1.6 and T2.0–T2.7 green, with the pre-existing test unchanged.
- `npm run lint` and `npm run build` output pasted (both are echo stubs in this repo; pasted anyway).
- `cycle:verifier` (sonnet, fresh context) reproduces T2.3 = 904, T2.4 throws, T2.6 throws, and reads the arithmetic line in `charge()` for any floating-point operation. Its report is pasted.
- Security-review sign-off for the coupon input table: Gui, by name, in the PR.
- Gauntlet: **no**. Every acceptance criterion is a number a test checks; there is nothing to compare blind.

## Discarded

- Clamping the discount so the final amount is ≥ 1 instead of throwing (D3): silently charges a price the customer was not shown.
- Charging full price on an unknown coupon (D4): recreates the manual-refund queue.
- Replacing the return type with a bare number (draft): breaks callers and drops R3.
- Applying the discount per line item (research: Shopify, verdict refuse): there are no line items in this repo.
