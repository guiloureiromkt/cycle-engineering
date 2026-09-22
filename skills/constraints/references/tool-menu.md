# Tool menu

One checker per dimension, per ecosystem — install what the interview in `cycle:constraints` picked. Don't hand-roll a checker when a de facto one exists: these are what the rest of each ecosystem already targets, so the team's own config keeps working.

| Dimension | JS/TS | Python | Go | Rust |
|---|---|---|---|---|
| Types | `tsc --noEmit` | `mypy .` | `go vet ./...` | `cargo check` |
| Lint | `eslint .` / `biome check` | `ruff check` | `golangci-lint run` | `cargo clippy` |
| Secrets | `gitleaks detect --redact --no-banner` | `detect-secrets scan` | `gitleaks detect --redact --no-banner` | `gitleaks detect --redact --no-banner` |
| Coverage | `vitest run --coverage` / `jest --coverage` | `pytest --cov --cov-report=lcov` | `go test -cover ./...` | `cargo tarpaulin` |
| Security: code | `semgrep scan --config p/default` | `semgrep scan --config p/default` | `semgrep scan --config p/default` | `cargo audit` |
| Security: deps | `osv-scanner scan source -r .` | `osv-scanner scan source -r .` | `osv-scanner scan source -r .` | `osv-scanner scan source -r .` |
| Accessibility | `axe $URL --tags wcag2a,wcag2aa,wcag21aa` | same, against the served app | same, against the served app | same, against the served app |
| Performance | `lighthouse $URL --output=json` | same, against the served app | same, against the served app | same, against the served app |

Secrets always gets a named tool — `gitleaks` covers JS/TS, Go and Rust (it is language-agnostic, a binary scan of the tree); Python defaults to `detect-secrets` since it is the tool the Python ecosystem's own tutorials point to. Never leave this row as a generic "secrets" placeholder: the Floor's "no secret in source" line is aspirational until a real scanner runs.

`--redact` on gitleaks is not optional: without it, a matched secret lands in the agent's transcript. Report the rule and the location, never the value.

Accessibility and performance checkers need a running URL — a CLI, a library or a desktop app has none. Say so and drop the dimension rather than inventing a check that cannot run.

Scope the expensive ones to the diff: coverage read from the lcov the suite already writes (never a second full run), Semgrep given the changed-file path list, not the whole repo.
