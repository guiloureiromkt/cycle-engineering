# Review instructions (read by the PR reviewer)

## Passes
Run three passes and tag each finding with its pass:
- **Bugs:** logic errors, broken edge cases, subtle regressions.
- **Security:** injection, authentication gaps, PII in logs.
- **Conformance:** the change matches specs/<spec>.md, plans/<plan>.md and the repo's design principles.

## What "Important" means here
Reserve Important for a finding that breaks behavior, leaks data or violates a policy. Style and naming are nits.

## Nit ceiling
At most five nits per review; the rest becomes a count.

## Do not report
Generated files and anything CI already guarantees.
