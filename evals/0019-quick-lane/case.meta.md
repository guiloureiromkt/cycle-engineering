# 0019-quick-lane · provenance and hand-checks

**origin:** spec mock 1 of slice 1 (2026-10-17) and the council's pollyana seat: nothing else runs the quick lane end to end. The fixture's README says a person publishes by hand, which is what keeps a fix to a public post out of the `outside` stake.

**What it scores:** the diagnosis fires; the run writes `size: quick` and a quoted `size_sentence` with no digit; the post still has the typo when the run ends, because the ten-line plan waits for the person's word; the last message asks for it, without process words.

**Cost:** the RED run (v0.9.2, the old shortcut) and the GREEN run (the quick lane) are the two numbers council seat payer asked for; both go below, side by side.

## Runs

### 2026-10-17 · RED · before slice 1 (plugin 0.9.2 at the build worktree, `--model sonnet`)
- Cost US$0.064 · 5 turns · 9 s · score 2/7, not passed.
- `the-diagnosis-fired` FAIL ("Skill called 0x"); `the-post-is-untouched-before-the-word` FAIL (the run edited the post directly, with no plan and no one's word); `sized-quick`, `the-sentence-is-recorded`, `asks-for-the-word` FAIL. `the-sentence-has-no-digit` and `no-process-words` PASS (nothing to read).
- The old path did not run the cycle at all for a typo in a Markdown post ("Before editing code"), so this cost is the cost of skipping the method, not of the old shortcut. The GREEN cost goes beside it.
- Last message: not kept by the runner; the GREEN run uses `--keep-temp`.

### 2026-10-17 · GREEN · after slice 1, first run (build worktree, `--model sonnet`, `--keep-temp`)
- Cost US$0.067 · 5 turns · score 2/7, **not passed**.
- The trace: `cycle:using-cycle` fired, then the session wrote "cycle: quick-size change, a one-word typo fix. The repo has no `intent/` or `plans/`, so I'm going straight to the edit" and edited the post. The router sized the request itself from the size table and skipped the diagnosis and the person's word.
- Finding about the skill, not the case: `skills/using-cycle/SKILL.md` gained "**The router never sizes.**", a routing row for a plan-looking file outside `plans/`, and the rationalization row "It's quick, I'll just do it" (test first, in `tests/diagnosis.test.mjs`). The rerun waits for the owner's word (paid).
- Cost side by side (council payer): RED, the old path, US$0.064 · this GREEN, US$0.067. Both skipped the method; the quick lane's own cost is still to be measured by the rerun.

### 2026-10-17 · rerun on the owner's word, after the fix pass (`768a4a9`, `--model sonnet`)
- Cost US$0.099 · 9 turns · score 4/7, not passed.
- PASS: `the-diagnosis-fired`, `the-post-is-untouched-before-the-word`, `the-sentence-has-no-digit`, `no-process-words`. FAIL: `sized-quick`, `the-sentence-is-recorded`, `asks-for-the-word`.
- What it did: router → `cycle:intent` → `cycle:diagnosis`; then "**Isso é rápido:** é corrigir uma palavra no título de um post, o resultado já está descrito e dá para mostrar o antes e o depois. Não vi nenhum fluxo de publicação automática no repositório. Se enxergar diferente, diz.", the short intent and the ten-line plan shown in the chat, "aguardando a sua aprovação", the post untouched. It never saved the two files and never asked a question.
- Finding about the skill: `skills/intent/SKILL.md` Step 5 said "write the ten-line plan in the same message", read as "show". Now: save both files as drafts before asking, and end on one question that asks for the word (test first). One more run waits for the owner.
- Quick lane's own cost, first measure (council payer): US$0.099, against US$0.064 for the old path that skipped the method.

### 2026-10-17 · second rerun on the owner's word ("roda"), after `f6c1d0d` (`--model sonnet`, `--keep-temp`)
- Cost US$0.129 · 11 turns · score 5/7, not passed.
- PASS: `the-diagnosis-fired`, `the-post-is-untouched-before-the-word`, `the-sentence-has-no-digit`, `asks-for-the-word`, `no-process-words`. FAIL: `sized-quick`, `the-sentence-is-recorded`.
- Last message: "Isso é rápido: falta uma letra no título de um post, e dá pra ver o antes e o depois. Se enxergar diferente, diz. Salvei o pedido e um plano de dez linhas como rascunho. Ainda não editei o post. […] **Arquivos:** `intent/corrige-typo-como-cobrar.md` e `plans/corrige-typo-como-cobrar.md`. Posso corrigir?"
- The trace shows both files written by a shell heredoc (`mkdir -p intent plans && cat > intent/… <<'EOF'`), with `size: quick` and a quoted `size_sentence` in the intent, and the run's own `ls` listing them. The two `files` graders did not see them. Unconfirmed: the `files` target may read only what the file tools wrote; the workspace was gone before it could be checked. Owner's choice: one line in the skill (save with the file-writing tool), one more run.

### 2026-10-18 · third rerun on the owner's word ("1"), after `01fe11f` (`--model sonnet`, `--keep-temp`)
- Cost US$0.115 · score 5/7 by the graders · **passed by hand-check, owner's decision ("sim", 2026-10-18)**.
- PASS: `the-diagnosis-fired`, `the-post-is-untouched-before-the-word`, `the-sentence-has-no-digit`, `asks-for-the-word`, `no-process-words`. FAIL by the graders: `sized-quick`, `the-sentence-is-recorded`.
- Why the hand-check: the trace shows both files written with the Write tool — `home/cwd/intent/corrigir-recebimeto.md` (frontmatter: `size: quick`, `stakes: []`, `size_sentence: "Isso é rápido: é uma letra faltando no título de um post, em um único arquivo. Anoto o que você pediu e o plano em dez linhas, corrijo o título e te mostro o antes e depois. Se enxergar diferente, diz."`) and `home/cwd/plans/corrigir-recebimeto.md` (`size: quick`, `spec: skipped · quick`, `research: skipped · quick`). The patterns the two graders look for are in those files. Second run in a row where the `regex` grader with `target: "files"` misses files the run wrote (by shell before, by Write now): the defect is the grader, not the run. No other case in this suite uses that target. Draft intent: `intent/2026-10-18-the-files-target-sees-nothing.md`.
- Last message: "Isso é rápido: é uma letra faltando no título de um post, em um único arquivo (`posts/como-cobrar.md`). Anotei o pedido e um plano de dez linhas em `intent/corrigir-recebimeto.md` e `plans/corrigir-recebimeto.md`. […] Se enxergar diferente, diz. Posso corrigir?"

