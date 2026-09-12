---
name: research
description: Use when an intent/<name>.md has status accepted and no research/<name>.md with status done exists, before any spec. Also when a spec or plan lacks a market, design or technical benchmark it needs.
---

# Research (stage 2 · ammunition before decisions)

An accepted intent says what hurts. Nobody decides how to solve it before looking at how it has been solved. Output: `research/<name>.md` from the plugin template, `status: done`, five sections filled, every row of "What we know" with a source and a date. It is committed next to `intent/`, `specs/` and `plans/`, not under `.cycle/work/`, because it authorizes the spec the way the intent authorizes the research. The spec cites it.

## Depth, by trigger (say it in the first line of the artifact)
| Depth | When | What runs |
|---|---|---|
| **shallow** | bug with an accepted intent · size S | pass 1 (the two sweeps of `cycle:intent` §3, already in the intent) checked and extended; no benchmarks required; 20 minutes |
| **standard** | a user surface, a screen, data, a market claim or a design | pass 1 + benchmarks + the host's deep-research skill in `quick` mode when it exists, else one fresh-context researcher on `models.research` |
| **deep** | a new product, or money | standard + deep-research `standard` mode, or two researchers (inside · outside) in parallel |
When two triggers light, the deeper one wins: a size-S change that touches a screen is `standard`, not `shallow`. The owner's hurry ("ten minutes", "no questions") never lowers the depth; it shortens the prose. Never `ultradeep` inside a cycle. The shortcut of `cycle:using-cycle` is the only way to skip this stage entirely.

## Sources, in order
1. **Inside.** The repo, its git log, and the knowledge base or vault when the host has one.
2. **`knowledge`** in `.cycle/config.json` (missing key = empty list): entries `{name, kind: notebooklm | vault | folder | url, id, areas: []}` whose `areas` match the intent. Query each and cite it.
3. **Outside.** Public practice, repos, standards, papers, with access dates. Brazil is the default market when the intent does not say.
4. **Benchmarks** (standard and deep). Three to five, direct *and* indirect. Use the product when it can be used (real browser); do not only read about it. Evidence per row: a screenshot committed under `research/<name>/` (small; one file per benchmark), or a URL, with the date it was taken. A single benchmark is a defect: name it in "What we did not check". Five is the ceiling: a sixth candidate is dropped or named under "What we did not check", because a longer table stops being read.

## Evidence rules
Every row in "What we know" carries a source, an access date and a confidence: 🟢 fact · 🟡 inference · 🔴 opinion (a hypothesis, never a bet). An inference repeats the URL or path it derives from; "from the sources above" is not a source. A claim without a source goes under "What we assume" with a cheap check. Nothing invented: "not found with a good source" is an answer. A confidential finding (a client's numbers, a private document) is an assumption tagged `[confidential]` pointing at where the evidence lives; this file is committed.

## Steps
1. Read the accepted intent and its "What already exists" table (pass 1).
2. Pick the depth from the triggers; write the first line.
3. Run the sources in order. Researchers get `model` = `models.research` (missing key = `inherit`); the main session keeps its model.
4. Fill the five sections. Write the recommendation first, five lines.
5. Show the owner the block below; `status: done`; commit. Next: `cycle:spec`, whose visual references are this artifact's benchmarks.

## Block for the owner (last thing in the message; nothing after it)
- What we found: three lines.
- The recommendation: one line.
- Assumptions we ride on, numbered, each with a recommended answer.
- What to type to move on.

## Later uses of the same file
`cycle:plan` appends a "Technical unknowns" section (decision · justification · alternatives) to `research/<name>.md`. Never a second research file.

## Common mistakes
- One benchmark anchoring every decision.
- A 40-line table from the cheapest model called research.
- A source without a date, or a finding without a source in "What we know".
- Research that decides: the recommendation is for the spec; the owner decides.
- Picking `shallow` because the owner is in a hurry, or because the slice "could be small": the trigger table decides, and the deeper trigger wins.
