# 0018-mentee-first-intention · provenance and hand-checks

**origin:** the owner's decision of 2026-10-17 in the intent `the-cycle-is-guided-thinking-for-any-intention`: the first eval case outside software is a mentee's first intention. The fixture is invented.

**What it scores:** the diagnosis's opening on a request that is not code, in Portuguese: it fires through the Skill tool, it ends on one question about the measure or the deadline, it writes no plan, spec or research, and it speaks without process words.

**Hand-checks, read in the run's last message, not graded:** the question is in Portuguese; it treats the request as an objective (how success is measured, or by when), not as a desire (what job it would do); it proposes no campaign, calendar or ad yet. Six of the seven graders can pass without the plugin; `the-diagnosis-fired` carries the case, which is why its RED is recorded.

## Runs

### 2026-10-17 · RED · before slice 1 (plugin 0.9.2 at the build worktree, `--model sonnet`)
- Cost US$0.083 · 6 turns · 15 s · score 6/7, not passed.
- `the-diagnosis-fired` FAIL ("Skill called 0x"): the old router never fired on a request that is not code. Every other grader PASS: the base model asked a question about the measure or the date on its own, wrote nothing, used no process words — as this file predicted, `the-diagnosis-fired` carries the case.
- Last message: not kept by the runner (the trace was cleaned after the run); the GREEN run uses `--keep-temp`.

### 2026-10-17 · GREEN · after slice 1 (build worktree, `--model sonnet`, `--keep-temp`)
- Cost US$0.080 · 7 turns · score 7/7, passed.
- `the-diagnosis-fired` PASS (Skill called once); every other grader PASS.
- Last message: "Isso é um objetivo: vender a mentoria. Antes de qualquer coisa, preciso de uma medida. **Quantas vendas você quer fazer pelo Instagram, e até quando?** Se ainda não tiver um número, sugiro começar com **5 vendas em 60 dias**. Se preferir, podemos mirar **10 conversas qualificadas no direct em 30 dias**. A meta pode mudar depois."
- Hand-checks: Portuguese · read as an objective (measure and date) · proposes no campaign yet. All hold.

### 2026-10-19 · slices 2 to 7 (0.11.0): no run, and why
`skills/diagnosis/SKILL.md` and `skills/intent/SKILL.md`, which this case covers, changed: the diagnosis records the audience without adding a question to its opening (it stays one question), names a route, and reads the Master Brief; the intent skill states that the acceptance is the person's own word. **No run of this case** (the owner asked for a lean finish with no paid run). **The risk to watch in the next `npm run evals`:** that a mentee-like first message now gets a second question or a method word, which this case's graders (`asks-the-measure-or-the-date`, `no-process-words`) would catch. `tests/slices.test.mjs` only checks the new text.
