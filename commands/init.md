---
description: Starts the cycle in a repository. Creates .cycle/ (config.json, gate.json, work/) and the CLAUDE.md block between the cycle markers. Copies no templates.
---

Start the cycle in this repository. Do, don't ask, except where marked. Create ONLY what is listed here.

1. **Plugin root.** Take it from the `plugin root: <path>` line the session hook printed at the start of this session. If it is missing, ask the user to restart the session; do not guess a path.
2. **`.cycle/`**, without overwriting anything that already exists:
   - `.cycle/config.json` ← copy of `<plugin root>/templates/config.json`
   - `.cycle/gate.json` ← copy of `<plugin root>/templates/gate.json`
   - `.cycle/work/.gitkeep`
   - `.cycle/.gitignore` with two lines: `work/**/*.{png,jpg,mp4,zip,sql.gz}` and `release-approval`
   `.cycle/release-approval` is NOT created: a human creates it at deploy time.
3. **`CLAUDE.md` block.** Take `<plugin root>/templates/claude-md-block.md` (it already carries the `<!-- cycle:start -->` and `<!-- cycle:end -->` markers). If `CLAUDE.md` exists and contains both markers, replace everything from the start marker to the end marker, inclusive, with the template. If it exists without the markers, append the template at the end. If it does not exist, create `CLAUDE.md` with the block only and tell the user to run `/init` and cut the result to one page. Never touch anything outside the markers.
4. **Real commands.** Find the repo's actual test, lint, build and rollback commands (package.json, Makefile, pyproject, workflows) and fill them into the block's "Commands" line. If one does not exist, write "none" instead of inventing.
5. **Protected branches.** Detect the default branch (`git symbolic-ref refs/remotes/origin/HEAD`, else `main`) and set `protected_branches` in `.cycle/config.json`.
6. **Deploy commands.** If the repo has a deploy (workflow, script, Makefile, docs), list the commands found and check each against the gate's built-in defaults: `--prod`, `--target production`, `--env production`, `deploy … production`, `gh run rerun`, `gh workflow run`, `wrangler deploy`, `fly deploy`, `railway up`, and `git push` to a protected branch. For each command the defaults miss, propose the lowercase substring to add to `.cycle/gate.json` → `patterns`. **Ask before writing the patterns.**
7. **Existing method.** If the repo already has a method (another plan folder, another framework), don't delete it: note in the block that both coexist and which is the source of truth for each artifact.
8. **Do not** create `intent/`, `specs/`, `plans/` or `evals/`, and do not copy templates into the repo: the skills create these folders on first use, reading templates from the plugin root.
9. Finish with: what was created, what already existed, what is left for the human. Absolute paths in plain text.
