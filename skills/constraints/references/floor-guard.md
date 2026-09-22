# Floor guard

Five diff-scoped checks, run at review time against `git diff` from the branch point. None need tooling beyond `git diff`. Tightening the bar is silent; loosening it is loud — surface only what got weaker.

1. **The threshold moved.** A budget lowered, a severity dropped, a check removed from the fast stage. Diff `CONSTRAINTS.md` against its state at the branch point.
2. **A test got easier.** A skip/pending marker added (`.skip`, `@pytest.mark.skip`, `t.Skip()`, `#[ignore]`, or the ecosystem's equivalent), a test file deleted, an assertion pulled out of a test that stayed.
3. **A checker got silenced.** A new suppression comment for this ecosystem (`@ts-ignore` / `eslint-disable` for JS, `# noqa` / `# type: ignore` for Python, `//nolint` for Go, `#[allow(...)]` for Rust) that switches a check off rather than fixing what it found.
4. **Work is unfinished.** A stub that throws or panics, a placeholder return, an empty exception handler turning a failure into silence, a `TODO` standing where the implementation should be.
5. **An exception appeared.** A new row in the Exceptions table nobody discussed, or one with no owner, or an expiry more than a year out.

Adapt the patterns per ecosystem rather than reinventing the check — the mechanism should read the same across every repo this skill runs in. Report the rule and where it moved, never a value pulled out of a secret or a suppressed line.
