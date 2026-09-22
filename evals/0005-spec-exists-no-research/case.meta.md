# 0005-spec-exists-no-research · provenance and hand-checks

**origin:** advocate finding on plan v1, 2026-09-12: 18 real plans exist with a spec and no research; the new routing row must not send them back. Run on 0.3.0: 2 of 3.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no research/ file created | `wrote-no-research` (file_exists, exists:false) |
| route is cycle:plan, not cycle:research | llm grader, condition 2, plus `the-router-fired` |
| no file under src/ modified | `created-nothing-under-src` plus the llm grader's condition 3 |

**hand-checks:** none — and the case deliberately does not grade whether 'approve it' counts as acceptance; that is intent/2026-09-12-acceptance-is-a-word-in-chat.md.

**2026-09-20 · the llm grader was removed; three deterministic graders replaced it.** `not-sent-backwards` (an llm judge, `focus: last_message`, haiku by default) voted FAIL FAIL FAIL on 2026-09-17 against a run whose final message stayed at the plan stage, asked three acceptance questions and never mentioned research — and voted identically at tag `v0.6.1`, before any change that month (US$1.78 to measure). It blocked every publish for three days. Its condition 1 ("hands over to the plan, does not route back to research") was `the-router-fired` + `wrote-no-research` restated in prose. Its residual — *the agent sent the user back to research without writing a file* — is now `never-routed-to-research` (`Skill cycle:research`, `max: 0`), which can go red. The 17/09 message also closed with "I'll … accept the plan": the agent offering to accept on the owner's behalf. `it-did-not-accept-the-plan-by-edit` / `-by-write` catch that, as `0003` does. **Precedent:** `0010`'s retro judge, same 3–0 failure on a correct retro, same fix, 2026-09-13 (`evals/results/2026-09-13-0.6.0-gate.md`). The row above that says "llm grader, condition 2" now reads: `the-router-fired` + `never-routed-to-research`. **`unconfirmed` clears** the first time this case scores 1.0 at a publish with these five graders; it was set because of the judge.

**2026-09-20 · first run after the rewrite: score 1.00, US$0.86, 130 s.** All six graders green, including the three new ones (`never-routed-to-research` 0 calls, both acceptance guards 0 calls). The case that blocked every publish since 2026-09-17 passes on the deterministic graders alone.

**2026-09-21 · the acceptance graders stopped interrogating the transcript.** `it-did-not-accept-the-plan-by-edit` and `-by-write` are retired. They were `tool_used` with `input_match: "status: accepted"` and `max: 0`, and `input_match` is a regex over the call's **whole JSON input** — `old_string`, `new_string` and the file path. So they fired on a run that merely *quoted* the phrase. On 2026-09-21 a run of `0003` scored 0.67 for exactly that: its tenth edit appended a section headed `## Aceite` containing *"Falta uma decisão humana antes de `status: accepted`"* — the run telling the owner what a human still had to do. The kept trace holds all ten of its edits and **none of them accepts the plan**: the first rewrites the frontmatter and leaves `status: draft` with `accepted_by:` empty. The claim is that narrow, deliberately — the same trace shows the run executing host code from inside the sandbox, so "the run was correct" is not what the evidence supports.

In their place, two `regex` graders read the artifact: `\nstatus:[ \t]*["']?draft\b` must match, and `\nstatus:[ \t]*["']?accepted\b` must not. The leading newline is the whole mechanism — it separates a frontmatter field from the same words written in prose. Measured 2026-09-21 against the plan a real run produced, reconstructed from its committed edits, plus nine mutations, and the matrix lives in `tests/grader.test.mjs` so `npm test` runs it. A throwaway case that accepted the plan with `sed` turned both halves red (US$0.397, score 0), so the pair is not vacuous.

**What was traded, in three parts, not one.** *Lost:* accept-then-revert — the end state is `draft`, so a run that accepts and undoes is now invisible. *Lost:* an acceptance written to **any other file** — the retired graders matched the path too, so they fired wherever the phrase landed; the pair is pinned to one artifact. *Gained:* `sed -i`, which accepts the plan with no `Edit` or `Write` at all and which the retired pair never saw, though `Bash` is granted here.

**A known false red, accepted deliberately.** A correct run that shows the owner a **fenced example** of the accepted lines, at the start of a line, turns the negative half red. It announces itself on the first gate run, which is the trade against a silent pass on an accepted plan. It is also strictly narrower than what it replaces: the retired grader fired on the phrase anywhere in a tool call; this one only on a line-anchored occurrence in the file.

**An obfuscated acceptance does not escape.** A zero-width space or a homoglyph colon has to disfigure the `status: draft` line to exist, and the positive half catches that even when the negative half is blind. The two graders cover each other, which is also why a deleted or missing plan file reds — a `regex` grader over a file that is not there throws, and the runner returns a failure.

**Its 1.00 of 2026-09-20 proved nothing about the retired pattern.** That run's `Edit called 0x (expected 0..0)` is the count of *matching* edits and is equally consistent with the run making no edit at all; its trace is gone, so the mechanism is unknowable. The green was not evidence that the grader worked, and it is not cited as such.

**Two of its graders do not score in the full suite.** `the-router-fired` carries `arm: "with-only"` explicitly, and `never-routed-to-research` is marked implicitly, because the runner auto-marks any `tool_used` on `Skill` that has no `arm:`. Under `--ablation none`, which the gate uses, both score. Under `npm run evals:full`, which runs weekly and before every minor tag, neither does — leaving two `exists: false` graders and the pair. Recorded here because it is invisible in the case file.
