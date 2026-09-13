// cycle-engineering · scripts/gate.mjs is the pre-publish gate: npm test, the commit-shape rule,
// coverage selection, and a bounded eval run whose exit code it must read correctly.
// The eval and test commands are stubbed through env vars so these unit tests cost nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const gate = join(repo, "scripts", "gate.mjs");
const dirs = [];
process.on("exit", () => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
const write = (cwd, rel, body = "x\n") => { mkdirSync(join(cwd, dirname(rel)), { recursive: true }); writeFileSync(join(cwd, rel), body); };

/** A repo with a tag, a coverage map and two cases. */
function repoWithBase({ tag = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "cycle-gate-"));
  dirs.push(d);
  git(d, "init", "-q", "-b", "main");
  write(d, "skills/using-cycle/SKILL.md", "# router\n");
  write(d, "agents/council.md", "# council\n");
  write(d, "evals/0001-route-to-spec/case.yaml", "name: 0001-route-to-spec\n");
  write(d, "evals/0007-council-seats-by-trigger/case.yaml", "name: 0007-council-seats-by-trigger\n");
  write(d, "evals/coverage.json", JSON.stringify({
    "skills/using-cycle/SKILL.md": ["0001-route-to-spec"],
    "agents/council.md": ["0007-council-seats-by-trigger"],
  }, null, 2));
  git(d, "add", "."); git(d, "commit", "-q", "-m", "base");
  if (tag) git(d, "tag", "-a", "v0.1.0", "-m", "base");
  return d;
}
function run(cwd, args = [], env = {}) {
  return spawnSync(process.execPath, [gate, ...args], {
    cwd, encoding: "utf8",
    env: { ...process.env, ...gitEnv, CYCLE_GATE_TEST_CMD: "true", CYCLE_GATE_EVAL_CMD: "true", ...env },
  });
}

test("gate: no method file changed since the base → exits 0 and says so", () => {
  const d = repoWithBase();
  write(d, "README.md", "docs only\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "docs");
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /no method file changed since v0\.1\.0/);
});

test("gate: a commit touching both a case and a method file fails, naming it (the R5 rule)", () => {
  const d = repoWithBase();
  write(d, "skills/using-cycle/SKILL.md", "# router, changed\n");
  write(d, "evals/0001-route-to-spec/case.yaml", "name: 0001-route-to-spec\n# and softened\n");
  git(d, "add", "."); git(d, "commit", "-q", "-m", "skill and its case together");
  const r = run(d);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /mixes a case with a method file/i);
  assert.match(r.stdout + r.stderr, /skill and its case together|[0-9a-f]{7}/);
});

test("gate: a clean range selects the cases covering what changed", () => {
  const d = repoWithBase();
  write(d, "agents/council.md", "# council, changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0007-council-seats-by-trigger/);
  assert.doesNotMatch(r.stdout, /0001-route-to-spec/);
});

test("gate: no base resolvable → non-zero, never a silent pass", () => {
  const d = repoWithBase({ tag: false });
  write(d, "skills/using-cycle/SKILL.md", "# changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "skill");
  const r = run(d);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /no base/i);
});

test("gate: a changed method file mapped by nothing fails — no silent green", () => {
  const d = repoWithBase();
  write(d, "skills/brand-new/SKILL.md", "# uncovered\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "new skill");
  const r = run(d);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /mapped by nothing/i);
  assert.match(r.stdout + r.stderr, /skills\/brand-new\/SKILL\.md/);
});

test("gate: declared debt and test-covered files are named, and score nothing on their own", () => {
  const d = repoWithBase();
  write(d, "hooks/session-start.mjs", "// changed\n");
  write(d, "skills/deploy/SKILL.md", "# changed\n");
  writeFileSync(join(d, "evals", "coverage.json"), JSON.stringify({
    "skills/using-cycle/SKILL.md": ["0001-route-to-spec"],
    "agents/council.md": ["0007-council-seats-by-trigger"],
    "hooks/session-start.mjs": { tests: "tests/hooks.test.mjs" },
    "skills/deploy/SKILL.md": { uncovered: "case 0009 is planned", since: "2026-09-13" },
  }, null, 2));
  git(d, "add", "."); git(d, "commit", "-q", "-m", "hook and deploy");
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /declared debt since 2026-09-13/);
  assert.match(r.stdout, /covered deterministically by tests\/hooks\.test\.mjs/);
  assert.match(r.stdout, /nothing to score/);
});

test("gate: the eval exiting 2 (budget ceiling) is a failure, and says so distinctly", () => {
  const d = repoWithBase();
  write(d, "agents/council.md", "# council, changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const r = run(d, [], { CYCLE_GATE_EVAL_CMD: "exit 2" });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /budget|ceiling/i);
  assert.doesNotMatch(r.stdout + r.stderr, /regression/i);
});

test("gate: the eval exiting 1 is reported as a regression, not as a budget problem", () => {
  const d = repoWithBase();
  write(d, "agents/council.md", "# council, changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const r = run(d, [], { CYCLE_GATE_EVAL_CMD: "exit 1" });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /below the threshold|regression/i);
});

test("gate: the threshold comes from argv and is printed, never computed", () => {
  const d = repoWithBase();
  write(d, "agents/council.md", "# council, changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const r = run(d, ["--threshold", "0.8"]);
  assert.match(r.stdout, /threshold 0\.8/);
});

test("gate: --json names the base, the changed files, the cases and the threshold", () => {
  const d = repoWithBase();
  write(d, "agents/council.md", "# council, changed\n"); git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const out = join(d, "gate.json");
  const r = run(d, ["--json", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(j.base, "v0.1.0");
  assert.deepEqual(j.cases, ["0007-council-seats-by-trigger"]);
  assert.deepEqual(j.changed, ["agents/council.md"]);
  assert.equal(j.threshold, 1);
  assert.equal(j.mixedCommits.length, 0);
});

test("gate: a method file DELETED since the base is not demanded of the coverage map", () => {
  const d = repoWithBase();
  // agents/council.md is mapped; delete it and remove its mapping, as a real removal would.
  rmSync(join(d, "agents/council.md"));
  write(d, "evals/coverage.json", JSON.stringify({ "skills/using-cycle/SKILL.md": ["0001-route-to-spec"] }, null, 2));
  git(d, "add", "-A"); git(d, "commit", "-q", "-m", "remove the council seat file");
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /mapped by nothing/);
});

test("gate: two selected cases mean two runner invocations, one case each (a repeated --case keeps only the last)", () => {
  const d = repoWithBase();
  write(d, "skills/using-cycle/SKILL.md", "# router, changed\n");
  git(d, "add", "."); git(d, "commit", "-q", "-m", "router");
  write(d, "agents/council.md", "# council, changed\n");
  git(d, "add", "."); git(d, "commit", "-q", "-m", "council");
  const log = join(d, "invocations.txt");
  const r = run(d, [], { CYCLE_GATE_EVAL_CMD: `echo "$CYCLE_GATE_CASE" >> ${log}` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 2, `expected one invocation per case, got:\n${lines.join("\n")}`);
  assert.match(lines[0] + lines[1], /0001-route-to-spec/);
  assert.match(lines[0] + lines[1], /0007-council-seats-by-trigger/);
  for (const l of lines) assert.equal(l.trim().split(/\s+/).length, 1, `one case per invocation: ${l}`);
});
