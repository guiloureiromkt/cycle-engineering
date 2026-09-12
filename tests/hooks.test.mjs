// cycle-engineering · hook tests (node:test). Each case builds a throwaway git repo and runs the hook
// exactly as Claude Code would: a node process, the tool input on stdin, CLAUDE_PROJECT_DIR pointing at the repo.
// Every run also asserts the stderr hygiene rule from the contract (no "no such file", no "can't open").
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS = join(dirname(fileURLToPath(import.meta.url)), "..", "hooks");
const hook = (name) => join(HOOKS, name);
const NODE_DIR = dirname(process.execPath);
const dirs = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const gitEnv = {
  GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t",
};

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
}

/** Temp repo with one commit. `cycle` adds `.cycle/`; `plan` writes plans/x.md with that status. */
function repo({ cycle = true, plan = null, branch = "main" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cycle-hooks-"));
  dirs.push(dir);
  git(dir, "init", "-q", "-b", branch);
  writeFileSync(join(dir, "README.md"), "# t\n");
  git(dir, "add", "."); git(dir, "commit", "-q", "-m", "init");
  if (cycle) mkdirSync(join(dir, ".cycle", "work"), { recursive: true });
  if (plan) writePlan(dir, plan);
  return dir;
}
function writePlan(dir, status, name = "x.md") {
  mkdirSync(join(dir, "plans"), { recursive: true });
  writeFileSync(join(dir, "plans", name), `---\ntype: plan\nstatus: ${status}\n---\n# plan\n`);
}
function write(dir, rel, content = "x\n") {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
}
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/** Run one hook the way Claude Code does. Asserts stderr hygiene on every call. */
function runHook(name, input, dir, extraEnv = {}) {
  const env = { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir, CLAUDE_PLUGIN_ROOT: "/plugin/root", ...extraEnv };
  delete env.RELEASE_APPROVAL;
  Object.assign(env, extraEnv);
  const r = spawnSync(process.execPath, [hook(name)], { input: JSON.stringify(input), cwd: dir, encoding: "utf8", env });
  assert.doesNotMatch(r.stderr.toLowerCase(), /no such file|can't open/, `stderr hygiene broken: ${r.stderr}`);
  return r;
}
/** Run a hook through run.sh (sh wrapper), with node on PATH. */
function runViaSh(name, input, dir, extraEnv = {}) {
  const env = { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir, PATH: `${NODE_DIR}:${process.env.PATH}`, ...extraEnv };
  delete env.RELEASE_APPROVAL;
  const r = spawnSync("/bin/sh", [hook("run.sh"), name], { input: JSON.stringify(input), cwd: dir, encoding: "utf8", env });
  assert.doesNotMatch(r.stderr.toLowerCase(), /no such file|can't open/, `stderr hygiene broken: ${r.stderr}`);
  return r;
}
const gate = (cmd, dir, env) => runHook("production-gate.mjs", bash(cmd), dir, env).status;
const sync = (cmd, dir) => runHook("plan-sync.mjs", bash(cmd), dir).status;
const snap = (cmd, dir) => runHook("snapshot-guard.mjs", bash(cmd), dir).status;
const protect = (input, dir) => runHook("protect-cycle.mjs", input, dir).status;

// ───────────── session-start ─────────────
test("session-start without .cycle/: one line pointing at /cycle:init", () => {
  const r = runHook("session-start.mjs", {}, repo({ cycle: false }));
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(out.hookSpecificOutput.additionalContext, /\/cycle:init/);
  assert.match(out.hookSpecificOutput.additionalContext, /plugin root: \/plugin\/root/);
  assert.ok(out.hookSpecificOutput.additionalContext.split("\n").length === 1, "single line without .cycle/");
});
test("session-start with .cycle/: state with 'accepted plans: none' and the routing rule", () => {
  const r = runHook("session-start.mjs", {}, repo());
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /accepted plans: none/);
  assert.match(ctx, /cycle:using-cycle/);
  assert.match(ctx, /plugin root: \/plugin\/root/);
});

test("session-start with .cycle/: counts research/ files", () => {
  const d = repo();
  write(d, "research/x.md", "---\ntype: research\nstatus: done\n---\n# r\n");
  const ctx = JSON.parse(runHook("session-start.mjs", {}, d).stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /intents=0 · research=1 · specs=0/);
});

// ───────────── production-gate ─────────────
test("gate: `npm test` → 0", () => assert.equal(gate("npm test", repo()), 0));
test("gate: `vercel --prod` → 2 with the gate message", () => {
  const r = runHook("production-gate.mjs", bash("vercel --prod"), repo());
  assert.equal(r.status, 2);
  assert.match(r.stderr, /PRODUCTION GATE/);
  assert.match(r.stderr, /release-approval/);
});
test("gate: `gh run rerun 1` → 2", () => assert.equal(gate("gh run rerun 1", repo()), 2));
test("gate: `docker compose up -d` → 0 (not a default)", () => assert.equal(gate("docker compose up -d", repo()), 0));
test("gate: `git push origin main` with default config → 2", () => assert.equal(gate("git push origin main", repo()), 2));
test("gate: `git push origin main` with RELEASE_APPROVAL set → 0", () =>
  assert.equal(gate("git push origin main", repo(), { RELEASE_APPROVAL: "x" }), 0));
test("gate: release-approval dated today → 0", () => {
  const d = repo(); write(d, ".cycle/release-approval", `gui · ${today()} · v1\n`);
  assert.equal(gate("vercel --prod", d), 0);
});
test("gate: release-approval dated yesterday → 2", () => {
  const d = repo(); write(d, ".cycle/release-approval", `gui · ${daysAgo(1)} · v1\n`);
  assert.equal(gate("vercel --prod", d), 2);
});
test("gate: gate.json pattern `ssh root@1.2.3.4` blocks `ssh root@1.2.3.4 \"tar -x\"` → 2", () => {
  const d = repo(); write(d, ".cycle/gate.json", JSON.stringify({ patterns: ["ssh root@1.2.3.4"] }));
  const r = runHook("production-gate.mjs", bash('ssh root@1.2.3.4 "tar -x"'), d);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /gate\.json pattern/);
});
test("gate: `NODE_ENV=production npm run build` → 0", () => assert.equal(gate("NODE_ENV=production npm run build", repo()), 0));
test("gate: `git checkout production-fix` → 0", () => assert.equal(gate("git checkout production-fix", repo()), 0));
test("gate: `git push --tags` → 0", () => assert.equal(gate("git push --tags", repo()), 0));
test("gate: bare `git push` on branch main → 2 (resolves the current branch)", () =>
  assert.equal(gate("git push", repo({ branch: "main" })), 2));
test("gate: `git push origin fix-main-menu` → 0 (word boundaries)", () =>
  assert.equal(gate("git push origin fix-main-menu", repo()), 0));
test("gate: `vercel --target production` → 2", () => assert.equal(gate("vercel --target production", repo()), 2));
test("opt-out: repo without .cycle/ · `vercel --prod` → 0", () => assert.equal(gate("vercel --prod", repo({ cycle: false })), 0));
test("opt-out: repo without .cycle/ · plan-sync with accepted plan and staged code → 0", () => {
  const d = repo({ cycle: false, plan: "accepted" }); write(d, "src/a.js"); git(d, "add", "src/a.js");
  assert.equal(sync('git commit -m "feat"', d), 0);
});
test("opt-out: repo without .cycle/ · snapshot-guard on `git reset --hard` → 0", () =>
  assert.equal(snap("git reset --hard", repo({ cycle: false })), 0));

// ───────────── plan-sync ─────────────
test("plan-sync: no accepted plan → 0", () => {
  const d = repo({ plan: "draft" }); write(d, "src/a.js"); git(d, "add", "src/a.js");
  assert.equal(sync('git commit -m "feat"', d), 0);
});
test("plan-sync: accepted plan + staged code without plans/ → 2", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js"); git(d, "add", "src/a.js");
  const r = runHook("plan-sync.mjs", bash('git commit -m "feat"'), d);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /PLAN-SYNC/);
  assert.match(r.stderr, /src\/a\.js/);
});
test("plan-sync: message says `plan: unchanged` → 0", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js"); git(d, "add", "src/a.js");
  assert.equal(sync('git commit -m "feat (plan: unchanged)"', d), 0);
});
test("plan-sync: message says `[plan-ok]` → 0", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js"); git(d, "add", "src/a.js");
  assert.equal(sync('git commit -m "feat [plan-ok]"', d), 0);
});
test("plan-sync: plans/ file staged alongside code → 0", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js"); git(d, "add", "src/a.js", "plans/x.md");
  assert.equal(sync('git commit -m "feat"', d), 0);
});
test("plan-sync: only .md staged → 0", () => {
  const d = repo({ plan: "accepted" }); write(d, "docs/notes.md"); write(d, "CHANGELOG.md"); git(d, "add", "docs/notes.md", "CHANGELOG.md");
  assert.equal(sync('git commit -m "docs"', d), 0);
});

// ───────────── snapshot-guard ─────────────
test("snapshot-guard: `git reset --hard` without snapshot → 2", () => {
  const r = runHook("snapshot-guard.mjs", bash("git reset --hard"), repo());
  assert.equal(r.status, 2);
  assert.match(r.stderr, /SNAPSHOT GUARD/);
});
test("snapshot-guard: `git reset --hard` with a fresh snapshot → 0", () => {
  const d = repo(); write(d, ".cycle/work/my-intent/snapshot.md", "# stash@{0}\n");
  assert.equal(snap("git reset --hard", d), 0);
});
test("snapshot-guard: `rm -rf /tmp/x` → 0 (outside the repo)", () => assert.equal(snap("rm -rf /tmp/x", repo()), 0));
test("snapshot-guard: `rm -rf node_modules` → 0 (exempt)", () => assert.equal(snap("rm -rf node_modules", repo()), 0));
test("snapshot-guard: snapshot 2 hours old → 2", () => {
  const d = repo(); write(d, ".cycle/work/my-intent/snapshot.md", "# old\n");
  const t = new Date(Date.now() - 2 * 60 * 60 * 1000); utimesSync(join(d, ".cycle/work/my-intent/snapshot.md"), t, t);
  assert.equal(snap("git reset --hard", d), 2);
  assert.equal(snap("rm -rf src", d), 2);
});

// ───────────── stop-uncommitted ─────────────
test("stop: dirty tree + accepted plan → stdout contains SAVE RULE", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js");
  const r = runHook("stop-uncommitted.mjs", { stop_hook_active: false }, d);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SAVE RULE/);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "Stop");
  assert.ok(existsSync(join(d, ".cycle/work/.stop-warned")), "throttle marker written");
});
test("stop: stop_hook_active true → stdout empty", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js");
  const r = runHook("stop-uncommitted.mjs", { stop_hook_active: true }, d);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});
test("stop: second call within 30 minutes → stdout empty", () => {
  const d = repo({ plan: "accepted" }); write(d, "src/a.js");
  assert.match(runHook("stop-uncommitted.mjs", {}, d).stdout, /SAVE RULE/);
  assert.equal(runHook("stop-uncommitted.mjs", {}, d).stdout, "");
});

// ───────────── protect-cycle ─────────────
test("protect-cycle: Write to .cycle/release-approval → 2", () => {
  const d = repo();
  const r = runHook("protect-cycle.mjs", { tool_name: "Write", tool_input: { file_path: join(d, ".cycle/release-approval"), content: "x" } }, d);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /PROTECTED/);
});
test("protect-cycle: Bash `echo x > .cycle/release-approval` → 2", () =>
  assert.equal(protect(bash("echo x > .cycle/release-approval"), repo()), 2));
test("protect-cycle: Bash `rm -rf .cycle` → 2", () => {
  const d = repo();
  assert.equal(protect(bash("rm -rf .cycle"), d), 2);
  assert.equal(protect(bash("rm -rf ./.cycle/"), d), 2);
  assert.equal(protect(bash("rm .cycle/gate.json"), d), 2);
});
test("protect-cycle: Write to .cycle/work/x/snapshot.md → 0", () => {
  const d = repo();
  assert.equal(protect({ tool_name: "Write", tool_input: { file_path: join(d, ".cycle/work/x/snapshot.md"), content: "x" } }, d), 0);
  assert.equal(protect(bash("cat .cycle/release-approval"), d), 0);
});

// ───────────── dispatcher via run.sh ─────────────
test("dispatcher (run.sh pre-bash.mjs): `vercel --prod` → 2", () => {
  const r = runViaSh("pre-bash.mjs", bash("vercel --prod"), repo());
  assert.equal(r.status, 2);
  assert.match(r.stderr, /PRODUCTION GATE/);
});
test("dispatcher (run.sh pre-bash.mjs): `npm test` → 0", () => {
  const r = runViaSh("pre-bash.mjs", bash("npm test"), repo({ plan: "accepted" }));
  assert.equal(r.status, 0);
  assert.equal(r.stderr, "");
});

// ───────────── run.sh without node ─────────────
test("run.sh with PATH=/nonexistent → exit 1 and stderr says the gates are NOT active", () => {
  const r = spawnSync("/bin/sh", [hook("run.sh"), "pre-bash.mjs"], { input: "{}", encoding: "utf8", cwd: repo({ cycle: false }), env: { PATH: "/nonexistent" } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /NOT active/);
  assert.match(r.stderr, /node not found on PATH/);
  assert.doesNotMatch(r.stderr.toLowerCase(), /no such file|can't open/);
});
test("run.sh without node in a repo with .cycle/work → writes .cycle/work/GATES-INACTIVE.md (the -p mode hides stderr)", () => {
  const d = repo();
  const r = spawnSync("/bin/sh", [hook("run.sh"), "pre-bash.mjs"], { input: "{}", encoding: "utf8", cwd: d, env: { PATH: "/nonexistent", CLAUDE_PROJECT_DIR: d } });
  assert.equal(r.status, 1);
  assert.ok(existsSync(join(d, ".cycle/work/GATES-INACTIVE.md")), "marker written");
});
test("session-start with GATES-INACTIVE.md marker → warns that the gates were NOT active and removes the marker", () => {
  const d = repo(); write(d, ".cycle/work/GATES-INACTIVE.md", "node missing\n");
  const r = runHook("session-start.mjs", {}, d);
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /NOT active/);
  assert.match(ctx, /GATES-INACTIVE/);
  assert.ok(!existsSync(join(d, ".cycle/work/GATES-INACTIVE.md")), "marker consumed");
});

// ───────────── _lib · readJson ─────────────
test("_lib readJson: invalid .cycle/config.json → 2 (fail loud, not silent)", () => {
  const d = repo(); write(d, ".cycle/config.json", "{ not json");
  const r = runHook("production-gate.mjs", bash("npm test"), d);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not valid JSON/);
});
