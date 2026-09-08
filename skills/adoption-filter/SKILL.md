---
name: adoption-filter
description: Use before adopting any external skill, plugin, library or practice found during an intent sweep or an evolve watch, and before marking a finding "use" in the "What already exists" table.
---

# Adoption filter
Six checks, then a verdict. One pass, no more than fifteen minutes.
1. **License** compatible with this repo, and attribution feasible.
2. **Alive:** a commit in the last 6 months, or a stated "finished" status with no open critical issues.
3. **Does one thing**, and that thing is the one you need.
4. **Does not duplicate** what the repo or the host already has.
5. **Testable in 15 minutes:** you can run it on a real task from this repo before deciding.
6. **Verdict:** `use` (as is, with a Source line) · `adapt` (fork, note what changed and why) · `discard` (one line of reason in the table).
