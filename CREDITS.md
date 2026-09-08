# Credits

Cycle Engineering is MIT (see `LICENSE`). It stands on the work below. Every bundled skill carries a `Source:` line at the top with the upstream path and the commit it was copied from. License texts are in `LICENSES/`.

| Who | What | Where it lives here | License |
|---|---|---|---|
| Anthropic (Louis Claxton), [The AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) | The spine: one artifact per stage, each one triggers the next; production writes back to intent | The seven stages: `cycle:intent`, `cycle:spec`, `cycle:plan`, `cycle:build`, `cycle:test`, `cycle:deploy`, `cycle:maintain` | Article, linked |
| Jesse Vincent, [obra/superpowers](https://github.com/obra/superpowers) | brainstorming, writing-plans, executing-plans, subagent-driven-development, test-driven-development, verification-before-completion, dispatching-parallel-agents, using-git-worktrees | `skills/brainstorming/`, `skills/writing-plans/`, `skills/executing-plans/`, `skills/subagent-driven-development/`, `skills/tdd/`, `skills/verify-before-done/`, `skills/parallel-agents/`, `skills/worktrees/`. Upstream SHA: see each skill's `Source:` line | MIT, `LICENSES/superpowers-MIT.txt` |
| Matt Pocock, [mattpocock/skills](https://github.com/mattpocock/skills) | The grilling method: an interview in rounds that follows a decision tree | Inside `skills/intent/` | MIT, `LICENSES/mattpocock-skills-MIT.txt` |
| Matt Shumer and robonuggets | Gauntlet loop: technique and original prompt by Matt Shumer; packaged as a skill by robonuggets (`gauntlet-loop`) | `skills/gauntlet/` | CC BY 4.0, `LICENSES/gauntlet-CC-BY-4.0.txt` |
| Rob Shocks | The video reading of the playbook that started this project | Nothing copied | None needed |

Changes made to bundled copies: cross-references renamed to `cycle:*` so nothing points outside this repo; a `Source:` line added at the top. Where a copy has since diverged, its `Source:` line says so with the date and the CHANGELOG entry behind it; everything else is the upstream's.
