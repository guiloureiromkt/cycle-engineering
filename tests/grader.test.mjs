// cycle-engineering · evals/grade-research.mjs must fail on the template, pass on the fixtures and the shallow sample,
// and treat an escaped pipe inside a table cell as text, not as a column separator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const grade = (...args) => spawnSync(process.execPath, [join(repo, "evals", "grade-research.mjs"), ...args], { encoding: "utf8" });

test("grader: the template fails (placeholders are not evidence)", () => {
  const r = grade(join(repo, "templates", "research.md"));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL {2}frontmatter status: done/);
});
for (const f of ["evals/fixtures/a/research/dark-mode.md", "evals/fixtures/c/research/discount-checkout.md", "evals/samples/research-shallow.md"]) {
  test(`grader: ${f} passes`, () => {
    const r = grade(join(repo, f));
    assert.equal(r.status, 0, r.stdout);
    assert.doesNotMatch(r.stdout, /FAIL/);
  });
}
test("grader: spec → research link passes on fixture c", () => {
  const r = grade(join(repo, "evals/fixtures/c/research/discount-checkout.md"), join(repo, "evals/fixtures/c/specs/discount-checkout.md"));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /PASS {2}spec frontmatter research: points at an existing done file/);
});
test("grader: an escaped pipe inside a cell does not shift the source column", () => {
  const base = readFileSync(join(repo, "evals/samples/research-shallow.md"), "utf8");
  const withPipe = base.replace(
    /\| The total is computed[^\n]*\n/,
    "| Nothing references `theme` or `localStorage` | `grep -rn theme\\|localStorage` over the repo · 2026-09-12 | 🟢 fact |\n"
  );
  assert.notEqual(withPipe, base, "the replacement must hit a row");
  const dir = mkdtempSync(join(tmpdir(), "cycle-grader-"));
  const f = join(dir, "x.md");
  writeFileSync(f, withPipe);
  const r = grade(f);
  assert.equal(r.status, 0, r.stdout);
});
