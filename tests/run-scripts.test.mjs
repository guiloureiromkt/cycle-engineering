// cycle-engineering · the run scripts bundled with executing-plans and subagent-driven-development
// (refreshed from obra/superpowers v6.4.1, diverged 2026-09-23). They keep the ledger of a run that
// nobody watches, so each property here is one a real run depends on: the ledger is versioned and
// the scratch is not; the scripts find the plan's repository from any directory (sessions are rooted
// in the owner's vault); a task heading is found in the shapes real plans use; a failing test records
// nothing; a header the session wrote is kept.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SDD = join(repoRoot, "skills", "subagent-driven-development", "scripts");
const EP = join(repoRoot, "skills", "executing-plans", "scripts");
const dirs = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
const tmp = (prefix) => { const d = mkdtempSync(join(tmpdir(), prefix)); dirs.push(d); return d; };
const run = (script, args, cwd) => spawnSync("bash", [script, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });

const PLAN_TASKS = "# plan\n\n### Task 1: one\nstep one\n\n### Task 2: two\nstep two\n\n### Task 7: seven\nstep seven\n\n### Task 7b: seven-b\nstep seven-b\n";

/** A repo with .cycle/ and plans/p.md committed. Returns { dir, plan } with an absolute plan path. */
function repoWithPlan(body = PLAN_TASKS, name = "p.md") {
  const dir = tmp("cycle-run-");
  git(dir, "init", "-q", "-b", "main");
  mkdirSync(join(dir, ".cycle", "work"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "work", ".gitkeep"), "");
  mkdirSync(join(dir, "plans"), { recursive: true });
  writeFileSync(join(dir, "plans", name), body);
  git(dir, "add", "."); git(dir, "commit", "-q", "-m", "plan");
  return { dir, plan: join(dir, "plans", name) };
}
const ignored = (dir, rel) => spawnSync("git", ["check-ignore", "-q", rel], { cwd: dir, env: { ...process.env, ...gitEnv } }).status === 0;

test("run scripts (a): task-done writes the ledger to .cycle/work/<plan>/run.md, and git does not ignore it", () => {
  const { dir, plan } = repoWithPlan();
  const base = git(dir, "rev-parse", "HEAD");
  const r = run(join(EP, "task-done"), [plan, "1", base, "--", "true"], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ledger = join(dir, ".cycle", "work", "p", "run.md");
  assert.ok(existsSync(ledger), "the ledger is at .cycle/work/p/run.md");
  assert.match(readFileSync(ledger, "utf8"), /^Task 1: complete \(commits [0-9a-f]{7}\.\.[0-9a-f]{7}, tests: true → /m);
  assert.equal(ignored(dir, ".cycle/work/p/run.md"), false, "the ledger is versioned evidence, never ignored");
});

test("run scripts (b): the run's scratch lives in .cycle/work/<plan>/.run/ and is ignored", () => {
  const { dir, plan } = repoWithPlan();
  const r = run(join(SDD, "sdd-workspace"), [plan], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ws = r.stdout.trim().split("\n").pop();
  assert.equal(ws, join(dir, ".cycle", "work", "p", ".run"));
  writeFileSync(join(ws, "task-1-brief.md"), "x\n");
  assert.equal(ignored(dir, ".cycle/work/p/.run/task-1-brief.md"), true, "scratch is ignored");
  assert.equal(ignored(dir, ".cycle/work/p/run.md"), false, "the ignore rule reaches no further than .run/");
});

test("run scripts (c): from an unrelated directory, the scripts use the plan's repository", () => {
  const { dir, plan } = repoWithPlan();
  const elsewhere = tmp("cycle-vault-");
  git(elsewhere, "init", "-q", "-b", "master");
  const ws = run(join(SDD, "sdd-workspace"), [plan], elsewhere);
  assert.equal(ws.status, 0, ws.stdout + ws.stderr);
  assert.equal(ws.stdout.trim().split("\n").pop(), join(dir, ".cycle", "work", "p", ".run"));
  assert.equal(existsSync(join(elsewhere, ".cycle")), false, "the session's own directory is never turned into a cycle repo");
  const base = git(dir, "rev-parse", "HEAD");
  const done = run(join(EP, "task-done"), [plan, "2", base, "--", "true"], elsewhere);
  assert.equal(done.status, 0, done.stdout + done.stderr);
  assert.match(readFileSync(join(dir, ".cycle", "work", "p", "run.md"), "utf8"), /^Task 2: complete/m);
});

test("run scripts (d): Task 7's brief does not swallow Task 7b", () => {
  const { dir, plan } = repoWithPlan();
  const out = join(tmp("cycle-brief-"), "b.md");
  const r = run(join(SDD, "task-brief"), [plan, "7", out], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const brief = readFileSync(out, "utf8");
  assert.match(brief, /### Task 7: seven/);
  assert.doesNotMatch(brief, /Task 7b/);
});

test("run scripts (e): a Portuguese heading is a task heading", () => {
  const { dir, plan } = repoWithPlan("# plano\n\n## Tarefa 1 · medir\nm\n\n## Tarefa 2 · o preço\np\n");
  const out = join(tmp("cycle-brief-"), "b.md");
  const r = run(join(SDD, "task-brief"), [plan, "2", out], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(readFileSync(out, "utf8"), /Tarefa 2 · o preço/);
  assert.doesNotMatch(readFileSync(out, "utf8"), /Tarefa 1/);
});

test("run scripts (f): a plan with no task headings gives the whole plan as the brief, with a warning", () => {
  const body = "# plan\n\n## Order of work\n1. do this\n2. then that\n";
  const { dir, plan } = repoWithPlan(body);
  const out = join(tmp("cycle-brief-"), "b.md");
  const r = run(join(SDD, "task-brief"), [plan, "2", out], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(out, "utf8"), body);
  assert.match(r.stderr, /no task heading/i);
});

test("run scripts (g): a failing test command records nothing", () => {
  const { dir, plan } = repoWithPlan();
  const base = git(dir, "rev-parse", "HEAD");
  const r = run(join(EP, "task-done"), [plan, "1", base, "--", "false"], dir);
  assert.notEqual(r.status, 0);
  const ledger = join(dir, ".cycle", "work", "p", "run.md");
  assert.ok(!existsSync(ledger) || !/Task 1: complete/.test(readFileSync(ledger, "utf8")));
});

test("run scripts (h): a header the session wrote is kept, not duplicated", () => {
  const { dir, plan } = repoWithPlan();
  const header = "# cycle run — plan: plans/p.md\nmode: unattended\nrequested_by: \"roda sem mim\"\ntasks: 1 2 7 7b\n";
  mkdirSync(join(dir, ".cycle", "work", "p"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "work", "p", "run.md"), header);
  const base = git(dir, "rev-parse", "HEAD");
  const r = run(join(EP, "task-done"), [plan, "1", base, "--", "true"], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ledger = readFileSync(join(dir, ".cycle", "work", "p", "run.md"), "utf8");
  assert.ok(ledger.startsWith(header), "the session's header stays first");
  assert.doesNotMatch(ledger, /SDD ledger/);
});

test("run scripts (i): task-start prints the brief and BASE of the plan's repository, from any directory", () => {
  const { dir, plan } = repoWithPlan();
  const elsewhere = tmp("cycle-vault-");
  const r = run(join(EP, "task-start"), [plan, "2"], elsewhere);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const brief = (r.stdout.match(/^brief: (.+)$/m) || [])[1];
  assert.ok(brief && brief.startsWith(join(dir, ".cycle", "work", "p", ".run")), r.stdout);
  assert.match(readFileSync(brief, "utf8"), /### Task 2: two/);
  assert.match(r.stdout, new RegExp(`^base: ${git(dir, "rev-parse", "HEAD")}$`, "m"));
});
