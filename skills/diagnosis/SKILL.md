---
name: diagnosis
description: Use at the start of any new request in a repository that follows the cycle, code or not (a page, a campaign, a note), and again at the end of the intent interview. It names what kind of request it is, asks the first question that kind needs, and says in one plain sentence how big the work is, whether it needs research and what runs next. `cycle:intent` calls it with the Skill tool; it does not replace the intent.
---

# Diagnosis

**Master Brief.** Read `skills/using-cycle/references/master-brief.md` first: if the project has a brief, skip what it already answers; start or update it with the kind, the size and who (never a block when there is none).

Before anything is built: understand what the person wants, say how big it is and why, and decide how much thinking it deserves. Two moments and no extra stop: the opening is one question; the closing sentence is shown with the intent and accepted with it.

**Subagent dispatched with a specific task: skip this skill and do the task.**

## Opening (on a new request)
0. **A question, a lookup or a status check changes nothing: answer it.** No intent, no size. Judge by what would happen, not by the sentence's form: "dá pra mandar o e-mail pros 12 clientes?" asks for a send.
1. **Read what exists before asking:** the repo, its `CLAUDE.md`, the accepted intents, the project's living notes if it keeps any. A draft that already answers the first move (an intent from the mentoria harness, a brief) skips the opening question. Nothing to read is no obstacle.
2. **Name the kind.** The verb decides, not "I want": "quero vender" is an objective, "quero um site" is a desire.

| Kind (`request:`) | Sounds like | First move |
|---|---|---|
| `objective` | a result to reach: sell, grow, launch, by a date | ask the measure and by when, in one question ("Quantas vendas, e até quando?"); who owns it can come later. Not every objective needs a number; it needs a way to know it was reached |
| `problem` | something that goes wrong: it breaks, nobody uses it, it takes too long | ask what happens today, to whom and since when, before any solution |
| `desire` | a thing wanted: "quero um app", "queria ter um painel" | ask what job it would do and what is used today instead |
| `intention` | a direction without a result yet: "quero melhorar…", "pensei em…" | ask why, until it becomes one of the three above |

3. **One question in this opening**, in the language the person writes. Unsure of the kind: that is the question.
4. **"Não sei" never stops the work.** Offer two concrete starting points with your recommendation ("Começamos com 5 vendas em 60 dias, ou com 10 conversas no direct?") and go on with the one accepted; the measure can change later.
5. **Quick?** No stake (`references/stakes.md`), no schema change, the request already describes the result, it fits in one sitting, and its proof can be shown (a test, a before and after, a screenshot). A change people see can be quick. Before calling a fix to something public quick, look for what publishes it: a timer, a scheduled workflow or a connector makes the edit the release.

6. **Audience, without a second question.** The opening stays one question. When the first message asks for a result and not for code, record `Audience: mentee` in the Master Brief §1 as a hypothesis (🟡) and speak the way `skills/using-cycle/references/mentor-layer.md` says from the first reply on; if the person asks for the technical version, flip it to `developer`. The default comes from `audience` in `.cycle/config.json`.

## Closing (as soon as the size is clear, before research)
At `quick` and most `small` requests the size is clear right after the opening answer: say the sentence then, and the interview runs at that size. Before giving a size, answer to yourself, one line each: does this move money? does it speak to people outside? does it change who sees or does what? does it destroy something that does not come back? A yes is a stake.

**How big** (`size:`), named by what happens next:

| Size | When | What happens next |
|---|---|---|
| `quick` | the conditions of opening step 5 | the short intent and a ten-line plan are written together and accepted with one word; build; show the proof; a separate verifier checks |
| `small` | settled in a short conversation; one system, one result | one round of questions, a short intent, a plan with the reviews of "Gates by size" in `cycle:plan`; research once if the path is not known; the spec may be skipped |
| `project` | several parts, a new system, or many people | research while questions remain, a spec, a plan with the reviews of "Gates by size" in `cycle:plan` |

`S`, `M` and `L` (intents written before 0.10.0) are not quick, small and project, and are never translated: an artifact keeps the size it was written with.

**How known the path is** (`path:`):

| Path | Means | Research |
|---|---|---|
| `known` | it has been done here or the way is obvious; copy what works | none |
| `someone-knows` | the answer exists outside: a market, a practice, a product | one pass at `small`; the trigger table of `cycle:research` at `project` |
| `nobody-knows` | nobody can know before trying | a small test whose result is written down before the plan |
| `split` | parts of it are different cases | split it, and size each part |

**Which stakes** (`stakes:`): read `references/stakes.md`. A stake makes the size at least `small` and brings the council to the plan. Nothing lowers it.

**The sentence** (`size_sentence:`): one sentence, in the person's language, with no number. It names the size, two facts that justify it, what happens next, and invites the objection. Example: "Isso é pequeno: é um sistema que já existe e o resultado é uma lista de ajustes. Faço uma rodada de pesquisa sobre como os bons revisam, e combinamos o plano aqui. Se enxergar diferente, diz."

**The route** (`route:`): software, marketing or other, with one sentence of why; the table, and what to do when a forja is not installed, are in `skills/diagnosis/references/paths.md`.

Write the answers, and the sentence verbatim and quoted, into the intent's frontmatter: `request`, `size`, `path`, `route`, `stakes` (a list, `[]` when none), `size_sentence`. The person's answer to the intent accepts both. The intent's `size:` is the one that counts; the plan copies it.

## The size only grows
Found the work bigger: say it in one line, update `size:` in the intent and the plan in the same commit, and run what the new size asks. Several projects in one: say so, agree an order with the owner, one at a time. A size never shrinks in the middle of the work.

**A stake found during the work** ("troca o texto do botão" turns out to be the billing e-mail): stop before the change, say it in one line, add it to `stakes:` in the intent and the plan, and run what it asks (at least `small`, the council) before going on.

## Common mistakes
- Asking what the repository already answers.
- A number on screen ("7/10"): the person objects to a sentence, not to a score.
- Reading risk from size: stakes are a separate list, and a one-line change can carry one.
- Stage names and the method's own nouns in the sentence (intent, spec, gate, plan mode, pre-mortem): say what will happen ("anoto o que você pediu e o que vou fazer"), not what the step is called.
- Treating "no questions" or hurry as quick: hurry shortens the prose, never the size.
