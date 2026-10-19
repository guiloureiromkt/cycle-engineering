# The Master Brief (the project's living state)

An intent has its artifacts; a project has this. One file per project, read first and updated last by every stage, so nobody starts from zero and nobody asks twice.

## Where it lives
The path is the `master_brief` key of `.cycle/config.json`; the default is `.cycle/master-brief.md`. A vault project points the key at its own file (for example `20_Projetos/<brand>/master-brief.md`). The private forjas read and write the brief at that same path, with the same section numbers (§5.4 brand, §7 route, §9 handoff): there is **no second brief**. When a brief already exists at the path, a stage uses it; it never creates another beside it.

## What every stage does
1. **Read it first.** If it exists, skips what it already answers; never re-asks a person for something written here.
2. **Run its own work.**
3. **Update it when it ends:** the findings in the section this stage owns (diagnosis §1 to §3 and §7; research §5.2; spec and plan §2 (decisions taken, and why this path) and §7; build, test and deploy §0 and §8; maintain §0, §6 and §7), each with its kind ([Fact] with source and date, [Inference], [Opinion]) and its confidence (🟢🟡🔴); then §0 where we are, §6 gaps, §8 history and, when another stage follows, §9 handoff.
4. **Hand over** with the §9 block.

## Rules
- **No brief never blocks.** The diagnosis starts a thin one from what it finds (kind, size, who, the problem) and goes on. A project without a brief loses nothing but the shortcut.
- **Fact, inference and opinion stay apart.** A fact has a source and a date. A 🔴 finding is a hypothesis, never a bet. Nothing is invented: "not found with a good source" is an answer.
- **The library is a reference, not the author.** The notebooks in `.cycle/config.json` → `knowledge` are read-only: the method consults them for "who already solved this". It never answers "I don't know"; it answers "I don't know yet; I will research", and says where.
- **No second brief, and no parallel state.** Stages and forjas consume and extend this file.
- **Confidential material** is a pointer, not a copy: this file may be committed.

## The sections
0 where we are · 1 who (and the audience) · 2 the decision or the problem, its kind and size, and the decisions taken · 3 hypotheses · 4 material received · 5 findings (5.1 diagnosis, 5.2 market research, 5.3 audience research, 5.4 brand, 5.5 strategy, 5.6 growth and channels, 5.7 scenarios; the same numbers as the owner's canon, so a forja and the Cycle never collide) · 6 open gaps · 7 recommended route and how we'll know · 8 history · 9 handoff. Template: `templates/master-brief.md`.
