# RED · the self-improvement slice · 2026-09-13 (before any change)

Commands run in the repository root at the start of the build:

| Question | Command | Answer |
|---|---|---|
| native eval cases | `find evals -name case.yaml \| wc -l` | **0** |
| hand-graded JSON cases | `ls evals/*.json \| wc -l` | 8 |
| a gate script | `grep -c '"gate"' package.json` | **0** |
| retros written by the method | `find .cycle/work -name retro.md \| wc -l` | **0** — and six cycles closed in this repo on 12/09 |
| a base the gate could diff against | `git tag -l \| wc -l` | **0** (the five tags live only in the flattened public repo) |
| commits mixing a case with a method file (the rule about to be added) | loop over the last 30 commits | **2** (`3ee714f`, `f41bf29`, both 12/09) |

That is the state the slice starts from: a suite nobody scores, no gate, no retro, and no base to compare against.
