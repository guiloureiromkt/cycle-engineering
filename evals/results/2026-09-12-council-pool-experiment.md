# Do pool seats without corpus or skill add anything? · experiment · 2026-09-12

The advocate on plan v1 attacked the premise: a marketing seat with `knowledge: null` and no reachable skill may only restate the five engineering seats. His cheap test, run before rewriting the plan: the same draft plan (fixture g: coupon discount + customer-facing banner), the current `council` agent on `sonnet`, twice.

| Run | Seats | Demands | Tokens | Time |
|---|---|---|---|---|
| A | the five defaults | 5 | 23,964 | 35 s |
| B | five + marketing, content, ux, cx, brand-voice, commercial (briefs only, "no corpus; general practice") | 11 | 26,524 | 60 s |

**What the six added that the five did not say** (none of these appears in run A):
6. [marketing] the plan cites "the marketing team's brief attached to the intent" and no such brief exists.
7. [content] nothing says what the checkout shows after the coupon expires on 30/09.
8. [ux] the error path is a server-side throw; no customer-facing message for an invalid or expired code.
9. [cx] the banner's savings and the charged amount may come from different rounding paths — a new class of support ticket replacing the one the intent wants to kill.
10. [brand-voice] the hardcoded sentence was never reviewed by whoever owns tone.
11. [commercial] `resolveCoupon` is hardcoded to one code; every campaign becomes a code change.

Run A's five demands reappear in run B as demands 1–5 (same substance). No pool seat restated an engineering seat.

**Reading.** Even without corpus or skill, distinct briefs with distinct reasoning verbs produced six demands the engineering seats did not, at +11% tokens and +25 s. The premise holds for briefs; corpus and skill remain the lever for *sourced* demands (research assumption 2), still untested. Demand 9 (rounding parity between banner and charge) is a real defect risk the five missed.
