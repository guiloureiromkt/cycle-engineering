// cycle-engineering · scripts/gate.mjs is the pre-publish gate: a clean tree, npm test, the
// commit-shape rule, coverage selection, the RED→GREEN record read from git, and the package
// (git archive HEAD) tested on its own. Deterministic since 2026-09-22: it never calls the paid runner.
// The test commands are stubbed through env vars so these unit tests cost nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const gate = join(repo, "scripts", "gate.mjs");
const dirs = [];
process.on("exit", () => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const gitWith = (cwd, env, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv, ...env } }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
const git = (cwd, ...a) => gitWith(cwd, {}, ...a);
const write = (cwd, rel, body = "x\n") => { mkdirSync(join(cwd, dirname(rel)), { recursive: true }); writeFileSync(join(cwd, rel), body); };

/** A repo with a tag, a coverage map and two cases, each with a case.meta.md. */
function repoWithBase({ tag = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "cycle-gate-"));
  dirs.push(d);
  git(d, "init", "-q", "-b", "main");
  write(d, "skills/using-cycle/SKILL.md", "# router\n");
  write(d, "agents/council.md", "# council\n");
  write(d, "evals/0001-route-to-spec/case.yaml", "name: 0001-route-to-spec\n");
  write(d, "evals/0001-route-to-spec/case.meta.md", "# 0001 · provenance\n");
  write(d, "evals/0007-council-seats-by-trigger/case.yaml", "name: 0007-council-seats-by-trigger\n");
  write(d, "evals/0007-council-seats-by-trigger/case.meta.md", "# 0007 · provenance\n");
  write(d, "evals/coverage.json", JSON.stringify({
    "skills/using-cycle/SKILL.md": ["0001-route-to-spec"],
    "agents/council.md": ["0007-council-seats-by-trigger"],
  }, null, 2));
  git(d, "add", "."); git(d, "commit", "-q", "-m", "base");
  if (tag) git(d, "tag", "-a", "v0.1.0", "-m", "base");
  return d;
}
/** A RED→GREEN record: a dated paragraph appended to the covering case's meta, in its own commit (evals/ only). */
function record(d, caseId, text = "**2026-09-22 · RED→GREEN** — run kept, 1.00.\n", env = {}) {
  appendFileSync(join(d, "evals", caseId, "case.meta.md"), text);
  gitWith(d, env, "add", "."); gitWith(d, env, "commit", "-q", "-m", `record for ${caseId}`);
}
/** A method-file change in its own commit, optionally on another author date. */
function change(d, rel, body, env = {}) {
  write(d, rel, body);
  gitWith(d, env, "add", "."); gitWith(d, env, "commit", "-q", "-m", `change ${rel}`);
}
function run(cwd, args = [], env = {}) {
  return spawnSync(process.execPath, [gate, ...args], {
    cwd, encoding: "utf8",
    env: { ...process.env, ...gitEnv, CYCLE_GATE_TEST_CMD: "true", CYCLE_GATE_PACKAGE_TEST_CMD: "true", ...env },
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
  record(d, "0007-council-seats-by-trigger");
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

test("gate: --json names the base, the changed files, the cases, the records and the package — no threshold, no ceiling", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n");
  record(d, "0007-council-seats-by-trigger");
  const out = join(d, "gate.json");
  const r = run(d, ["--json", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(j.base, "v0.1.0");
  assert.deepEqual(j.cases, ["0007-council-seats-by-trigger"]);
  assert.deepEqual(j.changed, ["agents/council.md"]);
  assert.equal(j.records.length, 1);
  assert.equal(j.records[0].case, "0007-council-seats-by-trigger");
  assert.deepEqual(j.package, { tests: "green", paths: "clean" });
  assert.equal(j.threshold, undefined);
  assert.equal(j.maxCost, undefined);
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

// ─── 2026-09-22 · the gate is deterministic, and the paid suite is a monitor ───────────────────────
// Written before the script changed, and seen red on the old one (.cycle/work/<intent>/red.txt).

test("gate: a dirty tree fails before anything else — an uncommitted change has no date and would be packaged as HEAD", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n");
  record(d, "0007-council-seats-by-trigger");
  write(d, "agents/council.md", "# council, changed again, not committed\n");
  const r = run(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /clean tree|uncommitted/i);
});

test("gate: the paid runner is never invoked", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n");
  record(d, "0007-council-seats-by-trigger");
  const log = join(d, "invocations.txt");
  const r = run(d, [], { CYCLE_GATE_EVAL_CMD: `echo invoked >> ${log}` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!existsSync(log), "the gate spawned the paid runner");
});

test("gate: a changed method file whose covering cases have no case.meta commit in range fails, naming file, cases and the date it needed", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n");
  const r = run(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /no RED→GREEN record/);
  assert.match(r.stdout + r.stderr, /agents\/council\.md/);
  assert.match(r.stdout + r.stderr, /0007-council-seats-by-trigger/);
  assert.match(r.stdout + r.stderr, /\d{4}-\d{2}-\d{2}/);
});

test("gate: a record committed before the latest change fails", () => {
  const d = repoWithBase();
  record(d, "0007-council-seats-by-trigger", "**2026-09-20 · RED→GREEN**\n", { GIT_AUTHOR_DATE: "2026-09-20T10:00:00", GIT_COMMITTER_DATE: "2026-09-20T10:00:00" });
  change(d, "agents/council.md", "# council, changed after the record\n", { GIT_AUTHOR_DATE: "2026-09-21T10:00:00", GIT_COMMITTER_DATE: "2026-09-21T10:00:00" });
  const r = run(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /no RED→GREEN record/);
});

test("gate: a record committed on or after the latest change passes, and the gate says which case carries it", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n", { GIT_AUTHOR_DATE: "2026-09-21T10:00:00", GIT_COMMITTER_DATE: "2026-09-21T10:00:00" });
  record(d, "0007-council-seats-by-trigger", "**2026-09-21 · no run — the case's graders do not read the changed paragraph**\n", { GIT_AUTHOR_DATE: "2026-09-21T18:00:00", GIT_COMMITTER_DATE: "2026-09-21T18:00:00" });
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /record .*0007-council-seats-by-trigger/);
});

test("gate: npm test red inside the assembled package fails", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council, changed\n");
  record(d, "0007-council-seats-by-trigger");
  const r = run(d, [], { CYCLE_GATE_PACKAGE_TEST_CMD: "exit 1" });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /inside the package/i);
});

test("gate: this machine's home path inside the package fails, naming the file; an upstream /Users/jesse example does not", () => {
  const d = repoWithBase();
  change(d, "agents/council.md", "# council\nWorktree ready at /Users/jesse/myproject/.worktrees/auth\n");
  record(d, "0007-council-seats-by-trigger");
  let r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /paths clean/);
  change(d, "agents/council.md", `# council\nmeasured at ${homedir()}/x/.cycle\n`);
  record(d, "0007-council-seats-by-trigger");
  r = run(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /machine path/i);
  assert.match(r.stdout + r.stderr, /agents\/council\.md/);
});

test("gate: the package is git archive HEAD, and export-ignore keeps the private folders out", () => {
  const d = repoWithBase();
  write(d, ".gitattributes", "intent/ export-ignore\nresearch/ export-ignore\nspecs/ export-ignore\nplans/ export-ignore\n.cycle/ export-ignore\nCLAUDE.md export-ignore\n.gitignore export-ignore\n.gitattributes export-ignore\n");
  write(d, "intent/x.md", "private\n"); write(d, "plans/x.md", "private\n"); write(d, ".cycle/config.json", "{}\n"); write(d, "CLAUDE.md", "private\n");
  git(d, "add", "."); git(d, "commit", "-q", "-m", "private folders and the attributes");
  change(d, "agents/council.md", "# council, changed\n");
  record(d, "0007-council-seats-by-trigger");
  const r = run(d, [], { CYCLE_GATE_PACKAGE_TEST_CMD: "test ! -d intent && test ! -d plans && test ! -d .cycle && test ! -f CLAUDE.md && test -f agents/council.md && test -f evals/coverage.json" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /package: tests green/);
});
