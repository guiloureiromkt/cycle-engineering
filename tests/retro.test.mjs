// cycle-engineering · scripts/retro.mjs writes the numbers a closed cycle leaves in git and in its
// own artifacts. The definitions these tests assert were measured by hand first, on this repo's two
// closed cycles: evals/results/2026-09-13-retro-metrics.md. Each one failed a naive definition there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const retro = join(repo, "scripts", "retro.mjs");
const dirs = [];
process.on("exit", () => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const git = (cwd, ...a) => {
  const r = spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });
  if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (cwd, rel, body) => { mkdirSync(join(cwd, dirname(rel)), { recursive: true }); writeFileSync(join(cwd, rel), body); };
/** Commit with a controlled timestamp, so durations are exact instead of "whatever the runner took". */
const commit = (cwd, msg, minutesFromEpochBase) => {
  const date = new Date(Date.UTC(2026, 8, 12, 12, 0, 0) + minutesFromEpochBase * 60000).toISOString();
  git(cwd, "add", "-A");
  const r = spawnSync("git", ["commit", "-q", "-m", msg], { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
  if (r.status !== 0) throw new Error(r.stderr);
  return git(cwd, "rev-parse", "--short", "HEAD");
};
const run = (cwd, args = [], env = {}) => spawnSync(process.execPath, [retro, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv, ...env } });

const N = "2026-09-12-a-closed-cycle";

/**
 * A repo whose history has the shape the measurement file found in the real one:
 * three intents created in ONE commit long before this one's turn, research and spec written by the
 * SAME commit, then a plan, then build commits that all touch the plan because rule 2 says they must.
 */
function closedCycle({ deviations = 2, verifierProse = false, spec = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "cycle-retro-"));
  dirs.push(d);
  git(d, "init", "-q", "-b", "main");

  write(d, `intent/${N}.md`, "---\ntype: intent\nstatus: draft\n---\n\nthe intent\n");
  write(d, "intent/2026-09-12-another.md", "---\ntype: intent\nstatus: draft\n---\n\nanother\n");
  write(d, "intent/2026-09-12-a-third.md", "---\ntype: intent\nstatus: draft\n---\n\na third\n");
  commit(d, "evolve: three intents from the owner's diagnosis", 0);          // 12:00

  write(d, `intent/${N}.md`, "---\ntype: intent\nstatus: accepted\n---\n\nthe intent\n");
  commit(d, "intent accepted by the owner", 180);                             // 15:00 — three hours later

  write(d, `research/${N}.md`, "---\ntype: research\nstatus: done\n---\n\nwhat we know\n");
  if (spec) write(d, `specs/${N}.md`, "---\ntype: spec\nstatus: draft\n---\n\nR1 | a requirement\n");
  const shared = commit(d, "research + spec(draft): written together", 182);  // 15:02 — one commit, two stages

  if (spec) { write(d, `specs/${N}.md`, "---\ntype: spec\nstatus: approved\n---\n\nR1 | a requirement\n"); commit(d, "spec approved", 190); }

  const plan = [
    "---", "type: plan", "status: draft", "---", "",
    "## Council demands absorbed (gate 4)",
    "1. one", "2. two", "3. three", "",
    "## Risks (gates 2, 3 and 4 · advocate · pre-mortem · council)",
    "| Risk | Severity | Origin | Cheap test |", "|---|---|---|---|",
    "| it breaks | 🔴 | advocate | a test |", "| it drifts | 🟠 | council | a check |", "",
    "### Task 1: do the thing",
    "- [ ] **Step 1:** a step that is not a deviation",
    "- [x] **Step 2:** another step that is not a deviation", "",
  ].join("\n");
  write(d, `plans/${N}.md`, plan + "\n");
  commit(d, "plan (draft)", 200);                                             // 15:20

  write(d, `plans/${N}.md`, plan.replace("status: draft", "status: accepted") + "\n");
  commit(d, "plan accepted by the owner", 210);                               // 15:30

  // Build: every commit touches the plan, because rule 2 of cycle:build requires it.
  write(d, "skills/build/SKILL.md", "# build\n");
  write(d, `plans/${N}.md`, plan.replace("status: draft", "status: accepted").replace("- [ ] **Step 1:**", "- [x] **Step 1:**") + "\n");
  commit(d, "build: the first code, plan checkboxes ticked", 235);            // 15:55

  let body = plan.replace("status: draft", "status: accepted").replace("- [ ] **Step 1:**", "- [x] **Step 1:**");
  const devs = Array.from({ length: deviations }, (_, i) => `- deviation number ${i + 1}: the plan met reality`).join("\n");
  body += "\n## Deviations during the build\n" + (devs ? devs + "\n" : "") +
    "\n## Verifier (regression lens)\n" +
    (verifierProse ? "Reproduced every proof (58/58), nothing to count here.\n" : "1. a finding\n2. another finding\n");
  write(d, `plans/${N}.md`, body + "\n");
  write(d, "skills/build/SKILL.md", "# build, again\n");
  commit(d, "build: more code and the deviations recorded", 250);
  if (spec) { write(d, `specs/${N}.md`, "---\ntype: spec\nstatus: approved\n---\n\nR1 | a requirement, amended after the plan was accepted\n"); commit(d, "spec amended by a verifier finding", 255); }
  return { d, shared };
}

test("retro: deviations come from the plan's own section, not from the commits that touched it", () => {
  const { d } = closedCycle({ deviations: 3 });
  const r = run(d, [N]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /deviations:\s+3\b/);
  // Four commits touch plans/ after the first code commit; none of that is rework.
  assert.doesNotMatch(r.stdout, /deviations:\s+[4-9]/);
});

test("retro: checkbox lines under a heading are not items, and the count stops at ###", () => {
  const { d } = closedCycle({ deviations: 0 });
  const r = run(d, [N]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /deviations:\s+0\b/);
});

test("retro: a spec amended after the plan was accepted counts as an amendment", () => {
  const { d } = closedCycle();
  const r = run(d, [N]);
  assert.match(r.stdout, /spec amendments after acceptance:\s+1\b/);
});

test("retro: the handoff is the previous stage's acceptance, not its creation commit", () => {
  const { d } = closedCycle();
  const r = run(d, [N]);
  // Created at 12:00 in a batch, accepted at 15:00, research at 15:02 → 2 min, never 182.
  assert.match(r.stdout, /intent → research: 2 min/);
  assert.doesNotMatch(r.stdout, /intent → research: 18[0-9] min/);
});

test("retro: two stages written by one commit report an overlap, never a zero or negative gap", () => {
  const { d, shared } = closedCycle();
  const r = run(d, [N]);
  assert.match(r.stdout, new RegExp(`research → spec: overlap \\(${shared}\\)`));
  assert.doesNotMatch(r.stdout, /: (0|-\d+) min/);
});

test("retro: a prose section says not computable, and says why", () => {
  const { d } = closedCycle({ verifierProse: true });
  const r = run(d, [N]);
  assert.match(r.stdout, /verifier findings: not computable \(the section is prose, not a list\)/);
});

test("retro: a missing artifact is not computable, naming the stage", () => {
  const { d } = closedCycle({ spec: false });
  const r = run(d, [N]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /spec amendments after acceptance: not computable \(no specs\/[^)]*\)/);
});

test("retro: writing twice keeps the session's prose below the marker", () => {
  const { d } = closedCycle();
  run(d, [N]);
  const file = join(d, ".cycle/work", N, "retro.md");
  assert.ok(existsSync(file));
  writeFileSync(file, readFileSync(file, "utf8") + "- the sandbox has no node\n");
  run(d, [N]);
  const after = readFileSync(file, "utf8");
  assert.match(after, /- the sandbox has no node/);
  assert.equal(after.split("- the sandbox has no node").length, 2, "the prose must not be duplicated");
  assert.equal(after.split("# Retro · ").length, 2, "the machine block must be replaced, not appended");
});

test("retro --repeats: a finding seen in two retros is listed; one seen once is not", () => {
  const { d } = closedCycle();
  for (const [name, finding] of [["cycle-a", "the sandbox has no node"], ["cycle-b", "the sandbox has no node"], ["cycle-c", "something else entirely"]]) {
    write(d, `.cycle/work/${name}/retro.md`, `# Retro\n<!-- cycle:retro:prose -->\n## Findings\n- ${finding}\n`);
  }
  const r = run(d, ["--repeats"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /the sandbox has no node/);
  assert.match(r.stdout, /cycle-a/);
  assert.match(r.stdout, /cycle-b/);
  assert.doesNotMatch(r.stdout, /something else entirely/);
});

test("retro: an intent with no artifacts at all fails loudly instead of printing zeros", () => {
  const { d } = closedCycle();
  const r = run(d, ["2026-09-12-an-intent-that-does-not-exist"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /no artifact/i);
});

test("retro: a plan with the same heading twice counts both sections, and says it did", () => {
  const { d } = closedCycle({ deviations: 2 });
  const plan = join(d, "plans", `${N}.md`);
  writeFileSync(plan, readFileSync(plan, "utf8") +
    "\n## Deviations during the build of the second release\n- a third one\n- a fourth one\n");
  git(d, "add", "-A"); commit(d, "the second release's deviations", 300);
  const r = run(d, [N]);
  assert.match(r.stdout, /deviations:\s+4 \(2 sections\)/);
});

test("retro: a stage dated differently from the plan is still found (the date is filing, not the name)", () => {
  const { d } = closedCycle();
  // The intent was filed a day earlier, as this repo's own cycle really was.
  git(d, "mv", `intent/${N}.md`, "intent/2026-09-11-a-closed-cycle.md");
  commit(d, "file the intent under the day it was written", 300);
  const r = run(d, [N]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /no intent artifact/);
});

// ─── --across (2026-10-16 · the evolve routine reads the products) ───────────────
/** A method repo with one retro and a product repo with one retro, both under a fake HOME so `~` labels are testable. */
function methodAndProduct() {
  const home = mkdtempSync(join(tmpdir(), "cycle-home-")); dirs.push(home);
  const method = join(home, "Repos", "method"); const product = join(home, "Repos", "product");
  for (const d of [method, product]) { mkdirSync(d, { recursive: true }); git(d, "init", "-q", "-b", "main"); write(d, "README.md", "# t\n"); commit(d, "init", 0); }
  write(method, ".cycle/config.json", JSON.stringify({ method_repo: ".", products: ["~/Repos/product", "~/Repos/missing"] }));
  write(method, ".cycle/work/2026-10-01-alpha/retro.md", "# Retro · alpha\n\n## Findings\n- **The gate read prose.** Three false blocks.\n");
  commit(method, "retro alpha", 10);
  write(product, ".cycle/work/2026-10-02-beta/retro.md", "# Retro · beta\n\n## Findings\n- **Comment is not proof.** The code said one thing.\n- **The gate read prose.** Three false blocks.\n");
  commit(product, "retro beta", 20);
  return { home, method, product, env: { HOME: home } };
}

test("--across: findings from the method repo and every products path; a missing path is reported, not fatal", () => {
  const { method, env } = methodAndProduct();
  const r = run(method, ["--repeats", "--across"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /~\/Repos\/method · 2026-10-01-alpha · The gate read prose\./);
  assert.match(r.stdout, /~\/Repos\/product · 2026-10-02-beta · Comment is not proof\./);
  assert.match(r.stdout, /not found: ~\/Repos\/missing/);
});

test("--repeats without --across keeps the single-repo behaviour and never reads products", () => {
  const { method, env } = methodAndProduct();
  const r = run(method, ["--repeats"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /Comment is not proof\./, "a product finding leaked into the single-repo run");
  assert.doesNotMatch(r.stdout, / · 2026-10-01-alpha · /, "the per-finding list must not print without --across");
  assert.match(r.stdout, /no finding appears in two or more retros yet\./);
});

test("--across: a worktree copy (same cycle name and content) is read once and the collapse is printed", () => {
  const { home, method, product, env } = methodAndProduct();
  const copy = join(home, "Repos", "product-wt"); mkdirSync(copy, { recursive: true });
  git(copy, "init", "-q", "-b", "main"); write(copy, "README.md", "# t\n"); commit(copy, "init", 0);
  write(copy, ".cycle/work/2026-10-02-beta/retro.md", readFileSync(join(product, ".cycle/work/2026-10-02-beta/retro.md"), "utf8"));
  commit(copy, "copy", 30);
  write(method, ".cycle/config.json", JSON.stringify({ method_repo: ".", products: ["~/Repos/product", "~/Repos/product-wt"] }));
  const r = run(method, ["--repeats", "--across"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout.match(/Comment is not proof\./g) || []).length, 1, "the duplicated retro must be listed once");
  assert.match(r.stdout, /collapsed 1 duplicate retro/);
  assert.match(r.stdout, /~\/Repos\/product-wt\/2026-10-02-beta = ~\/Repos\/product\/2026-10-02-beta/);
  assert.match(r.stdout, /The gate read prose\..*\[repeats ×2\]/);
});

test("--across: two different cycles with identical findings are both read and the repeat is reported", () => {
  const { method, product, env } = methodAndProduct();
  write(product, ".cycle/work/2026-10-03-gamma/retro.md", readFileSync(join(product, ".cycle/work/2026-10-02-beta/retro.md"), "utf8"));
  commit(product, "gamma", 40);
  const r = run(method, ["--repeats", "--across"], env);
  assert.doesNotMatch(r.stdout, /collapsed/);
  assert.match(r.stdout, /Comment is not proof\..*\[repeats ×2\]/);
});

test("--since: a retro committed before the date is read but not listed; the header says read and kept per repo", () => {
  const { method, env } = methodAndProduct();   // alpha committed at +10 min, beta at +20 min from 2026-09-12 12:00 UTC
  const r = run(method, ["--repeats", "--across", "--since", "2026-09-13"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /retros read since 2026-09-13:/);
  assert.match(r.stdout, /~\/Repos\/method: 1 retro, 0 since 2026-09-13/);
  assert.doesNotMatch(r.stdout, / · 2026-10-01-alpha · /);
  const r2 = run(method, ["--repeats", "--across", "--since", "2026-09-12"], env);
  assert.match(r2.stdout, /~\/Repos\/method: 1 retro, 1 since 2026-09-12/);
  assert.match(r2.stdout, / · 2026-10-01-alpha · /);
});

test("--repeats in a repo with no .cycle/work still fails loudly (exit 1)", () => {
  const bare = mkdtempSync(join(tmpdir(), "cycle-bare-")); dirs.push(bare);
  git(bare, "init", "-q", "-b", "main"); write(bare, "README.md", "# t\n"); commit(bare, "init", 0);
  const r = run(bare, ["--repeats"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no \.cycle\/work\/ directory/);
});

test("--across: cycles are listed in name order within a repo, repos in config order after the method repo", () => {
  const { method, product, env } = methodAndProduct();
  write(product, ".cycle/work/2026-09-30-aardvark/retro.md", "# Retro · aardvark\n\n## Findings\n- **Z first by name.** x\n");
  commit(product, "aardvark", 50);
  const r = run(method, ["--repeats", "--across"], env);
  const order = r.stdout.split("\n").filter((l) => / · \d{4}-\d{2}-\d{2}-/.test(l)).map((l) => l.split(" · ")[1]);
  assert.deepEqual(order, ["2026-10-01-alpha", "2026-09-30-aardvark", "2026-10-02-beta", "2026-10-02-beta"]);
});

// ─── fix pass after the final review (2026-10-16) ───────────────────────────────
test("--repeats alone: the `seen in:` line names cycles only, as before --across existed", () => {
  const { method, env } = methodAndProduct();
  write(method, ".cycle/work/2026-10-05-delta/retro.md", "# Retro · delta\n\n## Findings\n- **The gate read prose.** Three false blocks.\n");
  commit(method, "delta", 60);
  const r = run(method, ["--repeats"], env);
  assert.match(r.stdout, /seen in: 2026-10-01-alpha, 2026-10-05-delta$/m);
  assert.doesNotMatch(r.stdout, /Repos\/method\/2026-10-01-alpha/);
});

test("--since-last-report: the cutoff is the newest routine report (routine: weekly-evolve), never a stub, a suffixed file or an owner-triggered report", () => {
  const { method, env } = methodAndProduct();
  mkdirSync(join(method, ".cycle", "work", "evolve"), { recursive: true });
  write(method, ".cycle/work/evolve/2026-09-20.md", "---\nroutine: weekly-evolve\n---\n# weekly\n");
  write(method, ".cycle/work/evolve/2026-10-10.md", "---\nstatus: did not complete\nroutine: weekly-evolve\n---\n");
  write(method, ".cycle/work/evolve/2026-10-12.md", "# owner-triggered evolve, no routine key\n");
  write(method, ".cycle/work/evolve/2026-10-14-sources.md", "---\nroutine: weekly-evolve\n---\n");
  const r = run(method, ["--repeats", "--across", "--since-last-report"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /retros read since 2026-09-20:/);
});

test("--since-last-report with no routine report yet uses seven days ago", () => {
  const { method, env } = methodAndProduct();
  const r = run(method, ["--repeats", "--across", "--since-last-report"], env);
  const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  assert.match(r.stdout, new RegExp(`retros read since ${week}:`));
});
