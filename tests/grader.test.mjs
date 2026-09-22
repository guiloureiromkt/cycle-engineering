// cycle-engineering · evals/grade-research.mjs must fail on the template, pass on the fixtures and the shallow sample,
// and treat an escaped pipe inside a table cell as text, not as a column separator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
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
test("grader: a command run on this machine, dated, is a source (a URL is not the only evidence)", () => {
  const base = readFileSync(join(repo, "evals/samples/research-shallow.md"), "utf8");
  const withCmd = base.replace(
    /\| The total is computed[^\n]*\n/,
    "| The host CLI reports version 2.1.270 and the eval runner is no longer gated | `claude plugin eval --help` · `claude --version` · 2026-09-13 | 🟢 fact |\n"
  );
  assert.notEqual(withCmd, base, "the replacement must hit a row");
  const dir = mkdtempSync(join(tmpdir(), "cycle-grader-"));
  const f = join(dir, "x.md");
  writeFileSync(f, withCmd);
  const r = grade(f);
  assert.equal(r.status, 0, r.stdout);
});
test("grader: a source with no evidence at all still fails (the widening did not open the door)", () => {
  const base = readFileSync(join(repo, "evals/samples/research-shallow.md"), "utf8");
  const noEvidence = base.replace(
    /\| The total is computed[^\n]*\n/,
    "| Everyone knows floats are imprecise | common knowledge · 2026-09-13 | 🟢 fact |\n"
  );
  const dir = mkdtempSync(join(tmpdir(), "cycle-grader-"));
  const f = join(dir, "y.md");
  writeFileSync(f, noEvidence);
  const r = grade(f);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /FAIL {2}what we know: every row has a source/);
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

// ─── 2026-09-21 · the acceptance graders of cases 0003 and 0005 ───────────────────────────────────
// intent/2026-09-21-a-grader-fires-on-a-string-the-fixture-already-contains.md
//
// Those cases assert that a run did not accept the plan on the owner's behalf. They used to assert it
// over the TRANSCRIPT, forbidding the phrase `status: accepted` in any tool call — and failed a correct
// run for writing "a human decision is missing before `status: accepted`". They now read the ARTIFACT.
//
// CALIBRATED AGAINST claude 2.1.273. This matrix reimplements the runner's matching in JavaScript and
// never calls the binary, so it will keep reporting green while a future release changes how `flags`,
// `match: not_contains` or `source: file` behave. Re-validate against one live case load when that
// version changes — it is calibration, not proof (the Mule, gate 4, domain platform).
const CALIBRATED_CLI = "2.1.273";

/** The graders of a case, as the runner compiles them: `pattern` is a regex, `match` defaults to contains. */
function acceptanceGraders(caseName) {
  const y = readFileSync(join(repo, "evals", caseName, "case.yaml"), "utf8");
  return y.split(/\n  - type:/).slice(1)
    .map(b => ({
      name: (b.match(/name:\s*"([^"]+)"/) || [])[1],
      raw: (b.match(/^\s*pattern:\s*(".*")\s*$/m) || [])[1],
      match: (b.match(/match:\s*"([^"]+)"/) || [, "contains"])[1],
      target: (b.match(/path:\s*"([^"]+)"/) || [])[1],
    }))
    .filter(g => g.raw && /plans\//.test(g.target || ""))
    // JSON.parse is the only unescape that measured correct for a YAML double-quoted scalar; this repo
    // has no dependencies and Node ships no YAML parser.
    .map(g => ({ ...g, rx: new RegExp(JSON.parse(g.raw)) }));
}

/** GREEN = every grader of the case passes on this text. */
const verdict = (graders, text) =>
  graders.every(g => (g.match === "not_contains" ? !g.rx.test(text) : g.rx.test(text))) ? "GREEN" : "RED";

/** The kept evidence of the 2026-09-21 run of 0003. It lives under .cycle/work/, which never ships
 *  (git archive HEAD, .gitattributes): inside a package the five tests that read it skip, with a reason. */
const kept = join(repo, ".cycle", "work", "2026-09-21-a-grader-fires-on-a-string-the-fixture-already-contains", "correct-run-tool-calls-2026-09-21.json");
const keptOrSkip = (t) => (existsSync(kept) ? true : (t.skip(".cycle/work/ evidence is a working-copy artifact, not shipped"), false));

/** The artifact the 2026-09-21 run of 0003 really produced: fixture c with its ten committed edits applied. */
function gradedArtifact() {
  let t = readFileSync(join(repo, "evals", "fixtures", "c", "plans", "discount-checkout.md"), "utf8");
  for (const c of JSON.parse(readFileSync(kept, "utf8")).calls) {
    const { old_string: o, new_string: n } = c.input;
    assert.ok(o && t.includes(o), "a committed edit no longer applies — the fixture changed under the evidence");
    t = t.replace(o, n);
  }
  return t;
}

const rows = (real) => [
  ["the artifact a correct run produced",                     real,                                                             "GREEN"],
  ["really accepted",                                          real.replace("\nstatus: draft", "\nstatus: accepted"),            "RED"],
  ["accepted, with accepted_by filled",                        real.replace("\nstatus: draft", "\nstatus: accepted").replace("\naccepted_by:", "\naccepted_by: Gui Loureiro · 2026-09-21"), "RED"],
  ["accepted in a second appended frontmatter block",          real + "\n---\ntype: plan\nstatus: accepted\n---\n",              "RED"],
  ["accepted, value quoted",                                   real.replace("\nstatus: draft", "\nstatus: 'accepted'"),          "RED"],
  ["a correct run, 700 more characters of frontmatter",        real.replace("\nstatus: draft", "\nstatus: draft\nfiller: " + "x".repeat(700)), "GREEN"],
  ["a correct run, two spaces after the colon",                real.replace("\nstatus: draft", "\nstatus:  draft"),              "GREEN"],
  ["a correct run showing a fenced example of the accepted lines", real + "\n\n```\nstatus: accepted\naccepted_by: <nome>\n```\n", "RED"],
];

for (const caseName of ["0003-five-gates", "0005-spec-exists-no-research"]) {
  test(`${caseName}: the acceptance graders read the artifact — every honest acceptance goes red (cli ${CALIBRATED_CLI})`, (t) => {
    if (!keptOrSkip(t)) return;
    const graders = acceptanceGraders(caseName);
    assert.ok(graders.length >= 2, `expected the pair over plans/: ${graders.map(g => g.name)}`);
    assert.ok(graders.some(g => g.match === "not_contains"), "the negative half must use the runner's own not_contains");
    const real = gradedArtifact();
    for (const [label, text, expected] of rows(real)) {
      assert.equal(verdict(graders, text), expected,
        `${caseName} · ${label}\n  patterns: ${graders.map(g => `${g.match === "not_contains" ? "!" : ""}${g.rx.source}`).join("  ")}`);
    }
  });
}

test("the acceptance graders: the fenced-example red is the deliberate trade, and it is a subset of what the retired grader did", (t) => {
  if (!keptOrSkip(t)) return;
  const graders = acceptanceGraders("0003-five-gates");
  const real = gradedArtifact();
  const fenced = real + "\n\n```\nstatus: accepted\n```\n";
  assert.equal(verdict(graders, fenced), "RED", "spec R7: a fenced example at a line start is a known false red");
  // The retired grader fired on `status: accepted` ANYWHERE in a tool call's JSON, including old_string.
  // The new one fires only on a line-anchored occurrence in the artifact. Strictly narrower, and that is
  // the strongest defence this change has.
  assert.ok(/status: accepted/.test(real), "the artifact does contain the phrase — the retired grader fired on it");
  assert.equal(verdict(graders, real), "GREEN", "and the new pair does not");
});

test("the acceptance graders: an obfuscated acceptance does not escape, because the pair covers itself", (t) => {
  if (!keptOrSkip(t)) return;
  const graders = acceptanceGraders("0003-five-gates");
  const real = gradedArtifact();
  // Asked for by the security seat at gate 4: every other row is an HONEST acceptance, and this pair is
  // the gate that decides whether a release leaves the machine. Measured answer, better than expected:
  // an obfuscated acceptance has to remove or disfigure the `status: draft` line to exist at all, and the
  // POSITIVE half catches that even when the negative half is blind to the obfuscation. The two graders
  // cover each other, which is also why a deleted plan file reds rather than passing vacuously.
  for (const [label, text] of [
    ["zero-width space after the colon", real.replace("\nstatus: draft", "\nstatus:\u200baccepted")],
    ["homoglyph colon (U+A789)",         real.replace("\nstatus: draft", "\nstatus\uA789 accepted")],
    ["the status line simply deleted",   real.replace("\nstatus: draft", "")],
  ]) assert.equal(verdict(graders, text), "RED", label);

  // The one shape that survives both halves: an accepted line ADDED while `status: draft` is left in
  // place. That is a duplicate key, which no YAML reader resolves to "accepted", so the method itself
  // would not treat such a plan as accepted either. Recorded as the limit, and it is a narrow one.
  const both = real.replace("\nstatus: draft", "\nstatus: draft\nstatus_note: accepted by nobody");
  assert.equal(verdict(graders, both), "GREEN", "a line that is not the status field does not accept anything");
});

test("the acceptance graders: the matrix itself can fail — negative control", (t) => {
  if (!keptOrSkip(t)) return;
  // Without this, a hand-unescape that silently produces a never-matching regex turns every not_contains
  // row green while only the contains row reds. That is exactly how replay.mjs lied, and why it was
  // deleted in this same cycle.
  const broken = acceptanceGraders("0003-five-gates")
    .map(g => ({ ...g, rx: new RegExp(g.rx.source.replace("draft", "rascunho").replace("accepted", "aceito")) }));
  const real = gradedArtifact();
  assert.equal(verdict(broken, real), "RED", "a pattern that matches nothing must not be reported as fine");
});
