// cycle-engineering · hook tests (node:test). Each case builds a throwaway git repo and runs the hook
// exactly as Claude Code would: a node process, the tool input on stdin, CLAUDE_PROJECT_DIR pointing at the repo.
// Every run also asserts the stderr hygiene rule from the contract (no "no such file", no "can't open").
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync, readdirSync, realpathSync, symlinkSync, renameSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { commandDir, repoFor, gateRepo, commandView, walk, viewFor, remoteTail } from "../hooks/_lib.mjs";

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
const bash = (command, cwd) => ({ tool_name: "Bash", tool_input: { command }, ...(cwd ? { cwd } : {}) });
const _tzNow = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(ms).map(x => [x.type, x.value])); return `${p.year.padStart(4, "0")}-${p.month.padStart(2, "0")}-${p.day.padStart(2, "0")}`; };
const today = () => _tzNow(Date.now());
const daysAgo = (n) => _tzNow(Date.now() - n * 86400000);

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

// ───────────── repo resolution (task 1) ─────────────
test("repoFor: the directory itself, then the nearest ancestor", () => {
  const d = repo({ cycle: true });
  const deep = join(d, "src", "a"); mkdirSync(deep, { recursive: true });
  assert.equal(repoFor(d), d);
  assert.equal(repoFor(deep), d);
});

test("repoFor: a nested repo under a gated tree stays gated (fail closed)", () => {
  const d = repo({ cycle: true });
  const nested = join(d, "vendor", "thing"); mkdirSync(join(nested, ".git"), { recursive: true });
  assert.equal(repoFor(nested), d, "a .git below a gated root must not ungate it");
});

test("repoFor: never throws on hostile input", () => {
  for (const p of ["", "/", "~", "/nonexistent/".padEnd(300, "x/")]) assert.doesNotThrow(() => repoFor(p));
});

test("commandDir: the payload cwd, then cd prefixes folded left to right", () => {
  const a = repo({ cycle: false });
  const b = repo({ cycle: true });
  assert.equal(commandDir(bash("./deploy.sh", a)), a);
  assert.equal(commandDir(bash(`cd ${b} && ./deploy.sh`, a)), b);
  assert.equal(commandDir(bash(`cd ${b} && cd src`, a)), join(b, "src"), "sequential cds fold");
  assert.equal(commandDir(bash(`set -e\ncd ${b}\n./deploy.sh`, a)), b, "multiline needs the m flag");
});

test("commandDir: a cd hidden in a nested shell or a -C flag still moves the gate", () => {
  const a = repo({ cycle: false });
  const b = repo({ cycle: true });
  assert.equal(commandDir(bash(`bash -c "cd ${b} && ./deploy.sh --prod"`, a)), b);
  assert.equal(commandDir(bash(`ssh host "cd ${b} && ./deploy.sh"`, a)), b);
  assert.equal(commandDir(bash(`git -C ${b} push origin main`, a)), b);
  assert.equal(commandDir(bash(`make -C ${b} deploy`, a)), b);
});

test("commandDir: a path merely mentioned does not move the gate", () => {
  const a = repo({ cycle: false });
  const b = repo({ cycle: true });
  assert.equal(commandDir(bash(`cat ${b}/README.md`, a)), a);
});

test("gateRepo: session ungated, command inside a gated repo -> that repo", () => {
  const session = repo({ cycle: false });
  const gated = repo({ cycle: true });
  const prev = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = session;
  try { assert.equal(gateRepo(bash("./deploy.sh --prod", gated)), gated); }
  finally { process.env.CLAUDE_PROJECT_DIR = prev; }
});

test("gateRepo: THE UNION RULE — an unresolved command in a gated session still judges the session", () => {
  const gated = repo({ cycle: true });
  const prev = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = gated;
  try {
    const r = gateRepo(bash(`cd ${gated} && ./deploy.sh --prod && cd /tmp`, gated));
    assert.equal(r, gated, "unresolved must fall back to the session root, never to null");
  } finally { process.env.CLAUDE_PROJECT_DIR = prev; }
});

// ───────────── production gate · repo resolution (task 2) ─────────────
test("production gate: session outside, deploy into a gated repo → blocked, naming that repo's file", () => {
  const session = repo({ cycle: false });
  const target = repo({ cycle: true });
  const r = runHook("production-gate.mjs", bash("./deploy.sh --prod", target), session);
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes(join(target, ".cycle/release-approval")), "must print the absolute path it wants");
  assert.ok(r.stderr.includes(join(target, ".git", "cycle", "release-approval")), "and the shared path, first");
  assert.match(r.stderr, /not gated from this session before/, "the first block must not read as a regression");
});

test("production gate: DOES NOT LOOSEN — a trailing cd out of a gated session still blocks", () => {
  const gated = repo({ cycle: true });
  const r = runHook("production-gate.mjs", bash(`cd ${gated} && ./deploy.sh --prod && cd /tmp`, gated), gated);
  assert.equal(r.status, 2, "blocked today; the fix may not allow it");
});

test("production gate: the approval is read from the target repo, not the session root", () => {
  const session = repo({ cycle: true });
  write(session, ".cycle/release-approval", `x · ${today()} · wrong repo\n`);
  const target = repo({ cycle: true });
  assert.equal(runHook("production-gate.mjs", bash("./deploy.sh --prod", target), session).status, 2);
  write(target, ".cycle/release-approval", `x · ${today()} · right repo\n`);
  assert.equal(runHook("production-gate.mjs", bash("./deploy.sh --prod", target), session).status, 0);
});

test("production gate: RELEASE_APPROVAL does not travel to another repo", () => {
  const session = repo({ cycle: true });
  const other = repo({ cycle: true });
  const env = { RELEASE_APPROVAL: "gui release" };
  assert.equal(runHook("production-gate.mjs", bash("./deploy.sh --prod", session), session, env).status, 0);
  const r = runHook("production-gate.mjs", bash("./deploy.sh --prod", other), session, env);
  assert.equal(r.status, 2, "one session now spans repos; the env var approves only the one it was set in");
  assert.match(r.stderr, /approved elsewhere in this session/, "a scope miss must not read like no approval at all");
});

// ───────────── plan-sync / snapshot-guard · repo resolution (task 3) ─────────────
test("plan-sync: an accepted plan in the target repo blocks a code commit made from elsewhere", () => {
  const session = repo({ cycle: false });
  const target = repo({ cycle: true, plan: "accepted" });
  write(target, "src/a.js", "x\n");
  git(target, "add", "src/a.js");
  const r = runHook("plan-sync.mjs", bash("git commit -m 'x'", target), session);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /PLAN-SYNC/);
});

test("plan-sync: DOES NOT LOOSEN — a trailing cd out of a gated session still blocks", () => {
  const gated = repo({ cycle: true, plan: "accepted" });
  write(gated, "src/a.js", "x\n");
  git(gated, "add", "src/a.js");
  const r = runHook("plan-sync.mjs", bash(`cd ${gated} && git commit -m 'x' && cd /tmp`, gated), gated);
  assert.equal(r.status, 2);
});

test("snapshot-guard: a destructive command is judged against the target repo's snapshots", () => {
  const session = repo({ cycle: false });
  const target = repo({ cycle: true });
  assert.equal(runHook("snapshot-guard.mjs", bash("git reset --hard", target), session).status, 2);
  write(target, ".cycle/work/i/snapshot.md", "stash\n");
  assert.equal(runHook("snapshot-guard.mjs", bash("git reset --hard", target), session).status, 0);
});

test("snapshot-guard: DOES NOT LOOSEN — a trailing cd out of a gated session still blocks", () => {
  const gated = repo({ cycle: true });
  const r = runHook("snapshot-guard.mjs", bash(`cd ${gated} && git reset --hard && cd /tmp`, gated), gated);
  assert.equal(r.status, 2);
});

// ───────────── protect-cycle · no longer depends on resolution (task 4) ─────────────
test("protect-cycle: the string rules fire from any session, gated or not", () => {
  const session = repo({ cycle: false });
  const target = repo({ cycle: true });
  const app = join(target, ".cycle/release-approval");
  assert.equal(protect({ tool_name: "Write", tool_input: { file_path: app, content: "x" } }, session), 2, "write route");
  assert.equal(protect(bash(`echo "gui · ${today()} · x" > ${app}`), session), 2, "shell route, ungated session");
  assert.equal(protect(bash(`cd /tmp && rm -r${"f"} ${target}/.cycle`), session), 2, "cd out must not be a bypass");
});

// ───────────── session-start · the gate's reach (task 5) ─────────────
test("session-start: an ungated session names the gated repos two levels down", () => {
  const parent = mkdtempSync(join(tmpdir(), "cycle-tree-")); dirs.push(parent);
  const here = join(parent, "notes"); mkdirSync(here, { recursive: true });
  mkdirSync(join(parent, "Repos", "product", ".cycle"), { recursive: true });
  const out = JSON.parse(runHook("session-start.mjs", {}, here).stdout).hookSpecificOutput.additionalContext;
  assert.match(out, /product/, "must name the gated repo living at depth 2, which is the real layout");
});

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

// ───────────── session-start · a run in progress (2026-09-23) ─────────────
// The session that opens after a reboot has to learn there is a run to resume, without reading anything.
const ledger = (d, body) => write(d, ".cycle/work/x/run.md", body);
const HEADER = "# cycle run — plan: plans/x.md\nmode: unattended\nrequested_by: \"roda sem mim\"\ntasks: 1 2 3\nstarted: 2026-09-23T22:00:00Z\n";
const ctxOf = (d) => JSON.parse(runHook("session-start.mjs", {}, d).stdout).hookSpecificOutput.additionalContext;
test("session-start: an unattended run with open tasks is named, with its next task", () => {
  const d = repo({ plan: "accepted" });
  ledger(d, HEADER + "Task 1: complete (commits aaaaaaa..bbbbbbb, tests: npm test → ok)\n");
  const ctx = ctxOf(d);
  assert.match(ctx, /run in progress/i);
  assert.match(ctx, /plans\/x\.md/);
  assert.match(ctx, /Task 2/);
});
test("session-start: a run whose last line is Stopped: or Finished: is not in progress", () => {
  for (const last of ["Stopped: needs the owner's API key\n", "Finished: all tasks complete\n"]) {
    const d = repo({ plan: "accepted" });
    ledger(d, HEADER + "Task 1: complete (commits aaaaaaa..bbbbbbb, tests: npm test → ok)\n" + last);
    assert.doesNotMatch(ctxOf(d), /run in progress/i, last);
  }
});
test("session-start: a ledger without an unattended header says nothing about a run", () => {
  const d = repo({ plan: "accepted" });
  ledger(d, "# SDD ledger — plan: plans/x.md\nTask 1: complete (commits aaaaaaa..bbbbbbb, tests: t → ok)\n");
  assert.doesNotMatch(ctxOf(d), /run in progress/i);
});

test("session-start: an unattended ledger without a tasks: line says the tasks are unknown, never 'all complete'", () => {
  const d = repo({ plan: "accepted" });
  ledger(d, "# cycle run — plan: plans/x.md\nmode: unattended\nrequested_by: \"roda sem mim\"\nTask 1: complete (commits aaaaaaa..bbbbbbb, tests: t → ok)\n");
  const ctx = ctxOf(d);
  assert.match(ctx, /run in progress/i);
  assert.match(ctx, /no tasks: line/i);
  assert.doesNotMatch(ctx, /all complete/i);
});

test("session-start in the method repo prints the age of the last evolve report and warns past 9 days; stubs and suffixed files do not count", () => {
  const dir = repo();
  writeFileSync(join(dir, ".cycle", "config.json"), JSON.stringify({ method_repo: "." }));
  mkdirSync(join(dir, ".cycle", "work", "evolve"), { recursive: true });
  const old = new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(dir, ".cycle", "work", "evolve", `${old}.md`), "---\nroutine: weekly-evolve\n---\n# Evolve\n");
  writeFileSync(join(dir, ".cycle", "work", "evolve", `${today}-sources.md`), "# sources\n");
  writeFileSync(join(dir, ".cycle", "work", "evolve", `${today}.md`), "---\nstatus: did not complete\n---\n");
  const r = spawnSync(process.execPath, [hook("session-start.mjs")], { cwd: dir, encoding: "utf8", input: "{}", env: { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir } });
  assert.match(r.stdout, /last evolve report: 12 days ago · WARNING: the weekly routine has not reported in over 9 days/);
});

// ─── commandView / walk (2026-10-16 · the gate judges commands, not prose) ────────
test("commandView: removes only what is inert — comments, quoted-tag heredoc bodies, and quoted args of sink programs with no expansion", () => {
  const raw = [
    `cat > note.md <<'E'`, `deploy to production tomorrow`, `E`,
    `git commit -m "deploy to production notes" # not a push`,
    `gh pr create --body "does not touch .cycle/release-approval"`,
    `grep -rn "systemctl restart" docs/`,
    `ssh root@1.2.3.4 "cd /opt/command && tar -x" < /tmp/d.tar`,
    `bash -c "./deploy.sh --prod"`,
    `echo "$(fly deploy)"`,
    `psql -c "DROP TABLE x"`,
    `CMD="fly deploy"; $CMD`,
  ].join("\n");
  const v = commandView(raw);
  const text = v.segments.map((s) => s.text).join("\n");
  assert.doesNotMatch(text, /deploy to production/);
  assert.doesNotMatch(text, /release-approval/);
  assert.doesNotMatch(text, /systemctl restart/);
  assert.doesNotMatch(text, /not a push/);
  assert.match(text, /cd \/opt\/command && tar -x/, "quoted shell for ssh is NOT prose");
  assert.match(text, /\.\/deploy\.sh --prod/);
  assert.match(text, /echo "\$\(fly deploy\)"/, "a sink argument with $() is not inert");
  assert.match(text, /DROP TABLE x/, "psql is not a sink");
  assert.match(text, /CMD="fly deploy"/, "an assignment is not a sink");
  assert.deepEqual(v.removed.map((r) => r.kind).sort(), ["comment", "heredoc", "quoted", "quoted", "quoted"]);
});

test("commandView: an unquoted-tag heredoc body stays executable text (it expands), and is judged", () => {
  const v = commandView(`bash <<E\nfly deploy\nE`);
  assert.match(v.segments.map((s) => s.text).join("\n"), /fly deploy/);
  assert.equal(v.removed.length, 0);
});

test("commandView: splits on && || ; | and newline; $() and backticks stay; # inside $() or a backtick is not a comment; <<< is data; continuation joins", () => {
  const v = commandView("cd a && git log; echo $(rm -rf x # y) | tee out || true\ncat <<< \"a b\" \\\n  --flag\necho `true # `; fly deploy");
  assert.deepEqual(v.segments.map((s) => s.text.trim()), ["cd a", "git log", "echo $(rm -rf x # y)", "tee out", "true", 'cat <<< "…" --flag', "echo `true # `", "fly deploy"]);   // cat is a sink: the here-string text is inert
  assert.equal(v.fallback, false);
});

test("commandView: an unterminated heredoc or quote sets fallback", () => {
  assert.equal(commandView(`echo hi <<'E'\nnever closed`).fallback, true);
  assert.equal(commandView(`echo "never closed`).fallback, true);
});

test("commandView: keepQuotes keeps sink quotes but still removes comments and quoted-tag heredocs", () => {
  const v = commandView(`printf '%s' "fly deploy" | sh # x\ncat <<'E'\nprose\nE`, { keepQuotes: true });
  const text = v.segments.map((s) => s.text).join("\n");
  assert.match(text, /fly deploy/);
  assert.doesNotMatch(text, /prose/);
  assert.deepEqual(v.removed.map((r) => r.kind).sort(), ["comment", "heredoc"]);
});

test("walk: cwd follows cd (quoted too) and nested shells; branch is seeded per repo, carried only across &&, and `checkout <x>` counts only when refs/heads/x exists", () => {
  const a = repo({ branch: "main" }); const b = repo({ branch: "master" });
  mkdirSync(join(a, "s d"), { recursive: true });
  git(a, "branch", "feat");
  const v = commandView(`git checkout feat && git push origin HEAD && cd "s d" && git checkout README.md && git push; git push origin HEAD || git push && cd ${b} && git push`);
  const w = walk(v, { cwd: a });
  assert.equal(w[0].branch, "main"); assert.equal(w[0].branchAfter, "feat");
  assert.equal(w[1].branch, "feat");
  assert.equal(w[2].cwd, join(a, "s d"));
  assert.equal(w[3].branchAfter, "feat", "README.md is not a branch");
  assert.equal(w[4].branch, "feat");
  assert.equal(w[5].branch, null, "after ; the branch is unknown"); assert.equal(w[5].seed, "main");
  assert.equal(w[6].branch, null, "after || the branch is unknown");
  assert.equal(w[8].branch, "master", "a new repo seeds its own branch"); assert.equal(w[8].seed, "master");
});

test("session-start: an owner-triggered evolve report without routine: weekly-evolve does not count as the last routine report", () => {
  const dir = repo();
  writeFileSync(join(dir, ".cycle", "config.json"), JSON.stringify({ method_repo: "." }));
  mkdirSync(join(dir, ".cycle", "work", "evolve"), { recursive: true });
  const old = new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(dir, ".cycle", "work", "evolve", `${old}.md`), "---\nroutine: weekly-evolve\n---\n# weekly\n");
  writeFileSync(join(dir, ".cycle", "work", "evolve", `${today}.md`), "# owner-triggered review\n");
  const r = spawnSync(process.execPath, [hook("session-start.mjs")], { cwd: dir, encoding: "utf8", input: "{}", env: { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir } });
  assert.match(r.stdout, /last evolve report: 15 days ago · WARNING/);
});

// ─── gate-prose fixtures (2026-10-16): before recorded by replay, expect = after the change ───────
import { readFileSync } from "node:fs";
import { outcome as replay, prepare as prepareCase } from "./fixtures/gate-prose/record-before.mjs";
const GATE_PROSE = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "gate-prose", "cases.json"), "utf8"));

test("gate-prose: before values were recorded by the replay script at a known commit", () => {
  assert.ok(GATE_PROSE.recorded_on, "run node tests/fixtures/gate-prose/record-before.mjs first");
  for (const c of GATE_PROSE.cases) assert.ok(["allow", "ask", "deny"].includes(c.before), `${c.id} has no recorded before`);
});

for (const c of GATE_PROSE.cases) {
  test(`gate-prose ${c.id}: ${c.before} → ${c.expect}`, async () => {
    const { dir, command, env } = await prepareCase({ ...c });
    const got = replay(dir, command, {}, env);
    assert.equal(got, c.expect, `${c.id} (${c.class})`);
  });
}

test("never looser: a case that denied before may only stop denying with a declared loosening", () => {
  const undeclared = GATE_PROSE.cases.filter((c) => c.before === "deny" && c.expect !== "deny" && !c.loosening);
  assert.deepEqual(undeclared.map((c) => c.id), [], "a deny became something else without a declared reason");
  const toAllow = GATE_PROSE.cases.filter((c) => c.before === "deny" && c.expect === "allow");
  assert.ok(toAllow.length <= 6, "more deny→allow cases than the plans declared (6: the four of 0.9.0, the shared approval and the owner's evening of 0.9.2)");
});

// ─── pre-bash outcomes (2026-10-16 · Task 6) ─────────────────────────────────────
function preBashRaw(dir, command, payloadExtra = {}, env = {}) {
  const payload = { cwd: dir, permission_mode: "default", tool_input: { command }, ...payloadExtra };
  if (payloadExtra.permission_mode === undefined && "permission_mode" in payloadExtra) delete payload.permission_mode;
  return spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd: dir, encoding: "utf8", input: JSON.stringify(payload), env: { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir, ...env } });
}
const GREY = `cat > n.md <<'E'\ndeploy to production\nE`;

test("pre-bash: an ask is the host's PreToolUse JSON on stdout with exit 0, in plain words, with the command cut", () => {
  const dir = repo();
  const r = preBashRaw(dir, GREY);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout.trim());
  assert.equal(j.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(j.hookSpecificOutput.permissionDecision, "ask");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /only inside text being written or recorded/);
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /nothing in the command deploys/);
});

test("pre-bash: nobody present → the same grey case denies — permission_mode bypassPermissions, dontAsk, absent, non-string, or CYCLE_UNATTENDED=1; interactive modes ask", () => {
  const dir = repo();
  for (const [extra, env] of [[{ permission_mode: "bypassPermissions" }, {}], [{ permission_mode: undefined }, {}], [{ permission_mode: 7 }, {}], [{}, { CYCLE_UNATTENDED: "1" }]]) {
    const r = preBashRaw(dir, GREY, extra, env);
    assert.equal(r.status, 2, `expected deny for ${JSON.stringify(extra)} ${JSON.stringify(env)}`);
    assert.match(r.stderr, /nobody present/);
    assert.match(r.stderr, /only inside text being written/);
  }
  for (const mode of ["plan", "acceptEdits", "auto"]) assert.equal(preBashRaw(dir, GREY, { permission_mode: mode }).status, 0, `${mode} mode has a human`);
  assert.equal(preBashRaw(dir, GREY, { permission_mode: "dontAsk" }).status, 2, "dontAsk has nobody");
});

test("pre-bash: CYCLE_GATE_LEGACY=1 restores whole-string judgement — the grey case denies and says so", () => {
  const dir = repo();
  const r = preBashRaw(dir, GREY, {}, { CYCLE_GATE_LEGACY: "1" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /CYCLE_GATE_LEGACY=1: parsed as a whole/);
});

test("gate/gate.log: one line per ask/deny with decision, kind and rule — never the command text, never a URL's user:token", () => {
  const dir = repo();
  preBashRaw(dir, GREY);
  preBashRaw(dir, "git push https://u:tok@example.com/x.git main");
  preBashRaw(dir, "git status");
  const log = readFileSync(join(dir, ".git", "cycle", "gate", "gate.log"), "utf8").trim().split("\n");
  assert.equal(log.length, 2, log.join("\n"));
  assert.match(log[0], /^\d{4}-\d{2}-\d{2}T\S+ ask removed /);
  assert.match(log[1], /^\d{4}-\d{2}-\d{2}T\S+ deny segment push to protected branch main/);
  assert.doesNotMatch(log.join("\n"), /tok|cat > n\.md|example\.com/);
});

test("pre-bash: a 4 KB command with heredocs is judged in under 1 s without a backend", () => {
  const dir = repo();
  const big = `cat > a.md <<'E'\n${"line of prose about nothing\n".repeat(160)}E\ngit status && ls`;
  assert.ok(big.length > 4000);
  const t0 = performance.now(); const r = preBashRaw(dir, big); const ms = performance.now() - t0;
  assert.equal(r.status, 0, r.stderr);
  assert.ok(ms < 1000, `took ${ms.toFixed(0)} ms`);
});

// ─── fix pass after the final review (2026-10-16) ───────────────────────────────
test("pre-bash: a closed stdout on the ask path exits 2 (EPIPE is a deny, never an empty allow)", () => {
  const dir = repo();
  const payload = JSON.stringify({ cwd: dir, permission_mode: "default", tool_input: { command: GREY } });
  const r = spawnSync("bash", ["-o", "pipefail", "-c", `node "${hook("pre-bash.mjs")}" | head -c 0`], { cwd: dir, encoding: "utf8", input: payload, env: { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(r.status, 2, `status ${r.status}; stderr: ${r.stderr}`);
});

test("never looser: a deny that became an ask belongs to a prose, sink-quote or quoted-tag class", () => {
  const asks = GATE_PROSE.cases.filter((c) => c.before === "deny" && c.expect === "ask");
  for (const c of asks) assert.match(c.class, /prose|sink quote|quoted tag/, `${c.id}: ${c.class}`);
});

test("commandView: a line continuation inside a quoted-tag heredoc body is literal; $'…' sets the fallback; a sink with a redirect keeps its quote", () => {
  const v = commandView(`cat > n.md <<'E'\nnote \\\nE\ngit push origin main\nE`);
  assert.ok(v.segments.some((s) => /git push origin main/.test(s.text)), "the push after the terminator is a segment");
  assert.equal(commandView(`echo $'a\\' # '; git push origin main`).fallback, true);
  const w = commandView(`echo "fly deploy" > d.sh; ./d.sh`);
  assert.match(w.segments[0].text, /fly deploy/);
  assert.equal(w.removed.length, 0);
});

test("viewFor: a consumer anywhere keeps quoted-tag heredoc bodies and sink quotes executable", () => {
  const v = viewFor(`ssh root@vps <<'E'\ncd /opt/command && tar -x\nE`);
  assert.ok(v.segments.some((s) => /tar -x/.test(s.text)));
  const w = viewFor(`echo "DROP TABLE users" | psql`);
  assert.ok(w.segments.some((s) => /DROP TABLE users/.test(s.text)));
  const plain = viewFor(`cat > n.md <<'E'\nprose\nE`);
  assert.equal(plain.removed.length, 1, "no consumer: the body stays removed");
});

// ─── the method's publish is judged by the method (2026-10-16) ─────────────────
function cleanEnv(extra = {}) { const e = { ...process.env, ...gitEnv, ...extra }; delete e.RELEASE_APPROVAL; delete e.CYCLE_GATE_LEGACY; delete e.CYCLE_UNATTENDED; return e; }
function pushFrom(cwd, command, manifestDir, extraEnv = {}) {
  const payload = JSON.stringify({ cwd, permission_mode: "default", tool_input: { command } });
  return spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd, encoding: "utf8", input: payload, env: cleanEnv({ CLAUDE_PROJECT_DIR: cwd, CLAUDE_PLUGIN_ROOT: manifestDir, ...extraEnv }) });
}
/** A fake plugin root whose manifest names `homepage`, a bare remote at that URL, and a gated method repo. */
function methodWorld() {
  const base = mkdtempSync(join(tmpdir(), "method-")); dirs.push(base);
  const bare = join(base, "guiloureiromkt", "cycle-engineering.git"); mkdirSync(join(base, "guiloureiromkt"), { recursive: true }); git(base, "init", "-q", "--bare", "-b", "main", bare);
  const pluginRoot = join(base, "plugin"); mkdirSync(join(pluginRoot, ".claude-plugin"), { recursive: true });
  writeFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "cycle", version: "9.9.9", homepage: bare }));
  const method = repo();
  writeFileSync(join(method, ".cycle", "config.json"), JSON.stringify({ method_repo: ".", protected_branches: ["main"], publish: { remote: bare } }));
  writeFileSync(join(method, ".cycle", "gate.json"), JSON.stringify({ patterns: ["git push origin"] }));
  mkdirSync(join(method, ".claude-plugin"), { recursive: true });
  writeFileSync(join(method, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "cycle", version: "9.9.9", homepage: bare }));
  git(method, "add", "."); git(method, "commit", "-q", "-m", "manifest");
  const cloneAt = (where, from = bare) => { mkdirSync(where, { recursive: true }); git(where, "clone", "-q", from, "."); writeFileSync(join(where, "x"), "x\n"); git(where, "add", "."); git(where, "commit", "-q", "-m", "x"); git(where, "tag", "v9.9.9"); return where; };
  return { base, bare, pluginRoot, method, cloneAt };
}

test("publish rule: a push to the method's public repo from a clone OUTSIDE the method repo is denied outright, even with an approval next to it", () => {
  const { base, pluginRoot, method, cloneAt } = methodWorld();
  const tmpClone = cloneAt(join(base, "scratch", "pub"));
  const r = pushFrom(tmpClone, "git push origin v9.9.9", pluginRoot);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /publish of the method from outside its repository/);
  assert.match(r.stderr, /scripts\/publish\.mjs/);
  writeFileSync(join(method, ".cycle", "release-approval"), `t · ${today()} · publish 9.9.9\n`);
  assert.equal(pushFrom(tmpClone, "git push origin v9.9.9", pluginRoot).status, 2, "no approval anywhere lets an outside publish through");
});

test("publish rule: the same push from a clone nested under <method>/.cycle/work/publish/pub needs the method's approval — denied without, allowed with", () => {
  const { pluginRoot, method, cloneAt } = methodWorld();
  const nested = cloneAt(join(method, ".cycle", "work", "publish", "pub"));
  const a = pushFrom(nested, "git push origin v9.9.9", pluginRoot);            // a tag: not a protected branch
  assert.equal(a.status, 2, a.stderr);
  assert.match(a.stderr, /publish of the method/);
  assert.ok(a.stderr.includes(`Repository judged: ${method}\n`), a.stderr);
  writeFileSync(join(method, ".cycle", "release-approval"), `t · ${today()} · publish 9.9.9\n`);
  assert.equal(pushFrom(nested, "git push origin v9.9.9", pluginRoot).status, 0);
  assert.match(readFileSync(join(method, ".git", "cycle", "gate", "gate.log"), "utf8"), /deny segment publish of the method/);
});

test("publish rule: the routes the council listed all deny outside the method repo, and the remote-name injection never runs", () => {
  const { base, bare, pluginRoot, cloneAt } = methodWorld();
  const c = cloneAt(join(base, "scratch2", "pub"));
  git(c, "remote", "add", "upstream", bare);
  const deny = (cmd, env = {}) => { const r = pushFrom(c, cmd, pluginRoot, env); assert.equal(r.status, 2, `${cmd}: ${r.stderr}`); assert.match(r.stderr, /publish of the method/, cmd); };
  deny("git push upstream v9.9.9");
  deny(`git push ${bare} v9.9.9`);
  deny(`git push --repo=${bare} v9.9.9`);
  deny(`git push --repo ${bare} v9.9.9`);
  deny("git push -o ci.skip origin v9.9.9");
  deny("git --no-pager push origin v9.9.9");
  deny("git push origin v9.9.9", { CYCLE_GATE_LEGACY: "1" });
  deny("echo $'x'; git push origin v9.9.9");
  deny("gh repo sync guiloureiromkt/cycle-engineering");
  deny(`git clone ${bare} z && cd z && git push origin v9.9.9`);
  for (const spelled of ["https://github.com/guiloureiromkt/cycle-engineering.git", "git@github.com:guiloureiromkt/cycle-engineering", "ssh://git@github.com:22/guiloureiromkt/cycle-engineering", "gh-gui:guiloureiromkt/cycle-engineering.git", "https://github.com/GuiLoureiroMKT/Cycle-Engineering/"]) {
    git(c, "remote", "set-url", "upstream", spelled); deny("git push upstream v9.9.9");
  }
  const inj = pushFrom(c, "git push $(touch${IFS}canary) v9.9.9", pluginRoot);
  assert.ok(!existsSync(join(c, "canary")), "the remote token never reached a shell");
  assert.notEqual(inj.status, 0, "an unparseable remote token is not an allow");
});

test("publish rule: a renamed public repo is still guarded — the new tail comes from publish.previous_remotes of the session's method repo", () => {
  const { base, bare, pluginRoot, method, cloneAt } = methodWorld();
  const renamed = join(base, "org-new", "cycle-engineering.git"); mkdirSync(join(base, "org-new"), { recursive: true }); git(base, "init", "-q", "--bare", "-b", "main", renamed);
  writeFileSync(join(method, ".cycle", "config.json"), JSON.stringify({ method_repo: ".", protected_branches: ["main"], publish: { remote: bare, previous_remotes: [renamed] } }));
  const c = cloneAt(join(base, "scratch3", "pub"), renamed);
  const r = spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd: c, encoding: "utf8", input: JSON.stringify({ cwd: c, permission_mode: "default", tool_input: { command: "git push origin v9.9.9" } }), env: cleanEnv({ CLAUDE_PROJECT_DIR: method, CLAUDE_PLUGIN_ROOT: pluginRoot }) });
  assert.equal(r.status, 2, "new name, known through the session's method repo config: " + r.stderr);
});

test("publish rule: an ungated session and cwd are still guarded", () => {
  const { base, pluginRoot, cloneAt } = methodWorld();
  const c = cloneAt(join(base, "nowhere", "pub"));
  const r = spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd: c, encoding: "utf8", input: JSON.stringify({ cwd: c, permission_mode: "default", tool_input: { command: "git push origin v9.9.9" } }), env: cleanEnv({ CLAUDE_PROJECT_DIR: base, CLAUDE_PLUGIN_ROOT: pluginRoot }) });
  assert.equal(r.status, 2, r.stderr);
});

test("publish rule: inside the method repo a push to the public repo needs the method's approval directly, whatever the patterns say", () => {
  const { pluginRoot, method, cloneAt, bare } = methodWorld();
  writeFileSync(join(method, ".cycle", "gate.json"), JSON.stringify({ patterns: [] }));
  const nested = cloneAt(join(method, ".cycle", "work", "publish", "pub"));
  git(nested, "remote", "add", "upstream", bare);
  for (const cmd of ["git push --tags origin", "git push upstream v9.9.9"]) assert.equal(pushFrom(nested, cmd, pluginRoot).status, 2, cmd);
  writeFileSync(join(method, ".cycle", "release-approval"), `t · ${today()} · publish 9.9.9\n`);
  assert.equal(pushFrom(nested, "git push upstream v9.9.9", pluginRoot).status, 0);
});

test("publish rule: a push to some other remote from an ungated clone is untouched by the rule", () => {
  const { base, pluginRoot } = methodWorld();
  const other = join(base, "other.git"); git(base, "init", "-q", "--bare", "-b", "main", other);
  const c = join(base, "elsewhere"); mkdirSync(c); git(c, "clone", "-q", other, "."); writeFileSync(join(c, "y"), "y\n"); git(c, "add", "."); git(c, "commit", "-q", "-m", "y");
  const r = pushFrom(c, "git push origin HEAD:feat", pluginRoot);
  assert.equal(r.status, 0, r.stderr);
});

// ─── publish guard, reworked after the final review (2026-10-16) ────────────────
const methodWorld2 = methodWorld;
const approve = (dir, text) => writeFileSync(join(dir, ".cycle", "release-approval"), `${text} ${new Date().toISOString().slice(0, 10)}\n`);

test("publish guard: the reviewer's seven routes deny from outside the method repo", () => {
  const { base, bare, pluginRoot, cloneAt } = methodWorld2();
  const c = cloneAt(join(base, "r", "pub"));
  const from = (cwd, cmd, env = {}) => spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd, encoding: "utf8", input: JSON.stringify({ cwd, permission_mode: "default", tool_input: { command: cmd } }), env: cleanEnv({ CLAUDE_PROJECT_DIR: cwd, CLAUDE_PLUGIN_ROOT: pluginRoot, ...env }) });
  const deny = (cwd, cmd) => { const r = from(cwd, cmd); assert.equal(r.status, 2, `${cmd}: ${r.stderr}`); assert.match(r.stderr, /publish of the method/, cmd); };
  deny(c, "git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin v9.9.9");   // the script's own printed command
  deny(c, `git -c core.x="a b" push origin v9.9.9`);
  deny(base, `git -C ${c} push origin v9.9.9`);
  deny(base, `git --git-dir=${c}/.git push origin v9.9.9`);
  deny(base, `GIT_DIR=${c}/.git git push origin v9.9.9`);
  deny(base, `env GIT_DIR=${c}/.git git push origin v9.9.9`);
  deny(c, "git push --repo origin v9.9.9");
  deny(c, "git push --repo=origin v9.9.9");
  deny(base, `(cd ${c} && git push origin v9.9.9)`);
  deny(base, `pushd ${c} && git push origin v9.9.9`);
  deny(c, "git remote rename origin foo && git push foo v9.9.9");
  deny(c, "gh release create v9.9.9");
  deny(c, "gh pr merge 3");
  deny(c, "gh repo sync");
  const quoted = from(c, "git push 'origin' v9.9.9");
  assert.equal(quoted.status, 2); assert.match(quoted.stderr, /publish of the method/); assert.doesNotMatch(quoted.stderr, /computed/);
  const readOnly = from(c, "gh api repos/guiloureiromkt/cycle-engineering/releases");
  assert.equal(readOnly.status, 0, `a GET is read-only even when it names the tail: ${readOnly.stderr}`);
  deny(c, "gh api -X POST repos/guiloureiromkt/cycle-engineering/releases -f tag_name=v9.9.9");
  deny(c, "gh api repos/guiloureiromkt/cycle-engineering/releases -f tag_name=v9.9.9");
  const other = from(c, "gh api user");
  assert.equal(other.status, 0, other.stderr);
  void bare;
});

test("publish guard: the command publish.mjs prints is refused inside the gated clone without an approval that names the publish, and passes with one", () => {
  const { pluginRoot, method, cloneAt } = methodWorld2();
  const nested = cloneAt(join(method, ".cycle", "work", "publish", "pub"));
  const cmd = "git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin HEAD:main && git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin v9.9.9";
  const a = pushFrom(nested, cmd, pluginRoot);
  assert.equal(a.status, 2, a.stderr); assert.match(a.stderr, /does not approve it today/);
  approve(method, "t · x · just a deploy ·");                         // dated, but names neither publish nor the version
  const b = pushFrom(nested, cmd, pluginRoot);
  assert.equal(b.status, 2, "an approval that does not name the publish is not one");
  approve(method, "t · publish 9.9.9 ·");
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 0);
});

test("publish guard: a product repo that merely sets method_repo \".\" is not a method repository for the publish — denied outright, approval or not", () => {
  const { base, pluginRoot, cloneAt } = methodWorld2();
  const fake = repo(); writeFileSync(join(fake, ".cycle", "config.json"), JSON.stringify({ method_repo: "." }));
  approve(fake, "t · publish 9.9.9 ·");
  const nested = cloneAt(join(fake, ".cycle", "work", "publish", "pub"));
  const r = pushFrom(nested, "git push origin v9.9.9", pluginRoot);
  assert.equal(r.status, 2); assert.match(r.stderr, /from outside its repository/);
  void base;
});

test("publish guard: a deny in an ungated directory never creates a .cycle there", () => {
  const { base, pluginRoot, cloneAt } = methodWorld2();
  const c = cloneAt(join(base, "u", "pub"));
  const r = spawnSync(process.execPath, [hook("pre-bash.mjs")], { cwd: c, encoding: "utf8", input: JSON.stringify({ cwd: c, permission_mode: "default", tool_input: { command: "git push $(touch${IFS}canary) v9.9.9" } }), env: cleanEnv({ CLAUDE_PROJECT_DIR: c, CLAUDE_PLUGIN_ROOT: pluginRoot }) });
  assert.equal(r.status, 2);
  assert.ok(!existsSync(join(c, ".cycle")), "no .cycle was created in the ungated clone");
  assert.ok(!existsSync(join(c, "canary")));
});

test("publish guard: the manifest's homepage is pinned to the upstream tail", () => {
  const manifest = JSON.parse(readFileSync(join(HOOKS, "..", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(remoteTail(manifest.homepage), "guiloureiromkt/cycle-engineering");
});

// ───────────── shared state across worktrees (2026-10-17) ─────────────
/** A gated main checkout (`.cycle/config.json` and `gate.json` committed, so every worktree has them), a sibling
 *  worktree next to it and a nested one under .claude/worktrees, like the owner's tools make. */
function worktreeWorld() {
  const main = repo({ cycle: false });
  mkdirSync(join(main, ".cycle"), { recursive: true });
  writeFileSync(join(main, ".cycle", "config.json"), "{}");
  writeFileSync(join(main, ".cycle", "gate.json"), JSON.stringify({ patterns: ["deploy.sh"] }));
  git(main, "add", "-f", ".cycle"); git(main, "commit", "-q", "-m", "cycle");
  const sibling = join(dirname(main), basename(main) + "-wt"); dirs.push(sibling);
  git(main, "worktree", "add", "-q", "-b", "wt", sibling);
  const nested = join(main, ".claude", "worktrees", "n1");
  git(main, "worktree", "add", "-q", "-b", "n1", nested);
  return { main, sibling, nested, common: join(realpathSync(main), ".git") };
}
const plainDir = () => { const d = mkdtempSync(join(tmpdir(), "plain-")); dirs.push(d); mkdirSync(join(d, ".cycle")); return d; };

test("stateDir: the main checkout, a sibling worktree and a nested one share <common>/cycle; linked ones are flagged and counted", async () => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  const want = join(w.common, "cycle");
  for (const d of [w.main, w.sibling, w.nested]) { const s = L.stateDir(d); assert.equal(s.shared, true, d); assert.equal(s.dir, want, d); }
  assert.equal(L.stateDir(w.main).linked, false);
  assert.equal(L.stateDir(w.sibling).linked, true);
  assert.equal(L.stateDir(w.nested).linked, true);
  assert.equal(L.stateDir(w.main).worktrees, 3);
});

test("stateDir: a worktree made with relative back-links is shared too (git 2.48 --relative-paths)", async (t) => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  const rel = join(dirname(w.main), basename(w.main) + "-rel"); dirs.push(rel);
  try { git(w.main, "worktree", "add", "-q", "--relative-paths", "-b", "rel", rel); } catch { t.skip("this git has no --relative-paths"); return; }
  assert.equal(L.stateDir(rel).shared, true);
  assert.equal(L.stateDir(rel).dir, join(w.common, "cycle"));
});

test("stateDir: fallback to the checkout's own .cycle/ for a sub-folder, a plain directory, a separate git dir, a bare repository and every forged .git file", async () => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  const local = (d) => { const s = L.stateDir(d); assert.equal(s.shared, false, d); assert.equal(s.dir, join(d, ".cycle"), d); };
  mkdirSync(join(w.main, "sub", ".cycle"), { recursive: true });
  local(join(w.main, "sub"));                                       // spec R1: the repository itself, not a folder inside it
  local(plainDir());
  assert.equal(L.stateDir("").shared, false);
  const entry = readdirSync(join(w.common, "worktrees"))[0];
  const forgedEntry = plainDir(); writeFileSync(join(forgedEntry, ".git"), `gitdir: ${join(w.common, "worktrees", entry)}\n`);
  local(forgedEntry);                                                // a .git file pointing into a registered worktree's entry
  const forgedCommon = plainDir(); writeFileSync(join(forgedCommon, ".git"), `gitdir: ${w.common}\n`);
  local(forgedCommon);                                               // a .git file pointing at the common dir itself
  const sepBase = mkdtempSync(join(tmpdir(), "sep-")); dirs.push(sepBase);
  const sep = join(sepBase, "main"); mkdirSync(sep); git(sep, "init", "-q", "-b", "main", `--separate-git-dir=${join(sepBase, "main.git")}`);
  writeFileSync(join(sep, "a"), "a"); git(sep, "add", "."); git(sep, "commit", "-q", "-m", "a"); mkdirSync(join(sep, ".cycle"));
  const sepw = join(sepBase, "w"); git(sep, "worktree", "add", "-q", "-b", "w", sepw); mkdirSync(join(sepw, ".cycle"));
  local(sep); local(sepw);                                           // a common dir not named .git: nothing shared, for the main checkout and its worktrees alike
  const bare = join(sepBase, "bare.git"); git(sepBase, "init", "-q", "--bare", bare); mkdirSync(join(bare, ".cycle"));
  local(bare);
  const swapped = worktreeWorld();                                   // the shared directory replaced by a symlink
  const elsewhere = mkdtempSync(join(tmpdir(), "else-")); dirs.push(elsewhere);
  symlinkSync(elsewhere, join(swapped.common, "cycle"));
  local(swapped.main); local(swapped.sibling);
});

test("stateDir: a swapped folder, a plain file in its place and a worktree moved (or seen under another path, or pruned) each come back with a problem line", async () => {
  const L = await import("../hooks/_lib.mjs");
  const a = worktreeWorld(); const elsewhere = mkdtempSync(join(tmpdir(), "else-")); dirs.push(elsewhere);
  symlinkSync(elsewhere, join(a.common, "cycle"));
  assert.match(L.stateDir(a.main).problem, /is a symbolic link, so the shared place cannot be trusted/); assert.equal(L.stateDir(a.main).blocked, true);
  const b = worktreeWorld(); writeFileSync(join(b.common, "cycle"), "i am a file");
  assert.match(L.stateDir(b.main).problem, /is not a folder/);
  const c = worktreeWorld(); const moved = `${c.sibling}-moved`; dirs.push(moved); renameSync(c.sibling, moved);
  const s = L.stateDir(moved);
  assert.equal(s.shared, false); assert.match(s.problem, /records at another path/);
  assert.match(s.problem, /do NOT repair from here/, "a checkout seen through a mount must not be told to repair from there");
  const d = worktreeWorld(); const entry = readdirSync(join(d.common, "worktrees")).find(e => readFileSync(join(d.common, "worktrees", e, "gitdir"), "utf8").trim().startsWith(d.sibling));
  writeFileSync(join(d.common, "worktrees", entry, "gitdir"), "/workspace/elsewhere/.git\n");        // the repository records the worktree under another path view
  assert.match(L.stateDir(d.sibling).problem, /records at another path \(\/workspace\/elsewhere\/\.git\)/);
  const e = worktreeWorld(); rmSync(join(e.common, "worktrees", readdirSync(join(e.common, "worktrees")).find(x => readFileSync(join(e.common, "worktrees", x, "gitdir"), "utf8").trim().startsWith(e.sibling))), { recursive: true });
  assert.match(L.stateDir(e.sibling).problem, /has a \.git pointer that git cannot read/);
  assert.equal(L.stateDir(worktreeWorld().main).problem, undefined, "a healthy checkout has no problem");
});

test("readApproval: a regular file is read, an absent one is null, a symlink and a symlinked .cycle are refused with a reason", async () => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  const f = join(w.common, "cycle", "release-approval");
  assert.equal(L.readApproval(f, w.main), null);
  mkdirSync(join(w.common, "cycle"), { recursive: true }); writeFileSync(f, "t · x\n");
  assert.deepEqual(L.readApproval(f, w.main), { text: "t · x\n" });
  rmSync(f); const target = join(mkdtempSync(join(tmpdir(), "else-")), "x"); dirs.push(dirname(target)); writeFileSync(target, "forged\n");
  symlinkSync(target, f);
  assert.deepEqual(L.readApproval(f, w.main), { unsafe: "is a symbolic link" });
  const other = plainDir(); const real = mkdtempSync(join(tmpdir(), "else-")); dirs.push(real);
  rmSync(join(other, ".cycle"), { recursive: true }); mkdirSync(join(real, "c")); writeFileSync(join(real, "c", "release-approval"), "forged\n");
  symlinkSync(join(real, "c"), join(other, ".cycle"));
  assert.match(L.readApproval(join(other, ".cycle", "release-approval"), other).unsafe, /not where it claims/);
});

test("approvalFiles: the shared file first, then the checkout's own; the write path is the first", async () => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  assert.deepEqual(L.approvalFiles(w.sibling), [join(w.common, "cycle", "release-approval"), join(w.sibling, ".cycle", "release-approval")]);
  assert.equal(L.approvalWritePath(w.sibling), join(w.common, "cycle", "release-approval"));
  const plain = plainDir();
  assert.deepEqual(L.approvalFiles(plain), [join(plain, ".cycle", "release-approval")]);
});

test("gate log: a deny judged from a sibling worktree and one from the main checkout land in one shared file", async () => {
  const L = await import("../hooks/_lib.mjs");
  const w = worktreeWorld();
  L.gateLog(w.main, "deny", "rule-a", "segment");
  L.gateLog(w.sibling, "deny", "rule-b", "segment");
  const txt = readFileSync(join(w.common, "cycle", "gate", "gate.log"), "utf8");
  assert.match(txt, new RegExp(`rule-a @${basename(w.main)}$`, "m")); assert.match(txt, new RegExp(`rule-b @${basename(w.sibling)}$`, "m"), "each line names its checkout");
  assert.ok(!existsSync(join(w.main, ".cycle", "work", "gate", "gate.log")));
  assert.ok(!existsSync(join(w.sibling, ".cycle", "work", "gate", "gate.log")));
});

test("gate log: outside a git repository it still writes where it did (and the folder ignores itself)", async () => {
  const L = await import("../hooks/_lib.mjs");
  const plain = mkdtempSync(join(tmpdir(), "plain-")); dirs.push(plain); mkdirSync(join(plain, ".cycle"));
  L.gateLog(plain, "ask", "rule-c", "removed");
  assert.match(readFileSync(join(plain, ".cycle", "work", "gate", "gate.log"), "utf8"), /rule-c/);
  assert.equal(readFileSync(join(plain, ".cycle", "work", "gate", ".gitignore"), "utf8"), "*\n");
});

test("approval: one written in the shared place allows a gated command from the main checkout, a sibling and a nested worktree", () => {
  const w = worktreeWorld();
  mkdirSync(join(w.common, "cycle"), { recursive: true });
  writeFileSync(join(w.common, "cycle", "release-approval"), `t · ${today()} · v1\n`);
  for (const d of [w.main, w.sibling, w.nested]) assert.equal(gate("sh deploy.sh", d), 0, d);
});

test("approval: one in only a sibling worktree's own .cycle/ covers that checkout, not the main one; the refusal names the shared path and a mkdir", () => {
  const w = worktreeWorld();
  writeFileSync(join(w.sibling, ".cycle", "release-approval"), `t · ${today()} · v1\n`);
  assert.equal(gate("sh deploy.sh", w.sibling), 0, "its own checkout still honours the old place");
  const r = runHook("production-gate.mjs", bash("sh deploy.sh"), w.main);
  assert.equal(r.status, 2, r.stderr);
  assert.ok(r.stderr.includes(join(w.common, "cycle", "release-approval")), r.stderr);
  assert.match(r.stderr, /mkdir -p '.*' && printf '%s\\n' '<name> · \d{4}-\d{2}-\d{2} · <what is being released>' > '/);
  assert.match(r.stderr, /Every one of the 3 registered worktrees of this repository sees it, on any branch/);
  assert.match(r.stderr, /still works for that checkout alone/);
});

test("approval: a forged .git file does not borrow the owner's shared approval", () => {
  const w = worktreeWorld();
  mkdirSync(join(w.common, "cycle"), { recursive: true });
  writeFileSync(join(w.common, "cycle", "release-approval"), `t · ${today()} · v1\n`);
  for (const target of [join(w.common, "worktrees", readdirSync(join(w.common, "worktrees"))[0]), w.common]) {
    const forged = mkdtempSync(join(tmpdir(), "forged-")); dirs.push(forged);
    mkdirSync(join(forged, ".cycle"));
    writeFileSync(join(forged, ".cycle", "gate.json"), JSON.stringify({ patterns: ["deploy.sh"] }));
    writeFileSync(join(forged, ".git"), `gitdir: ${target}\n`);
    assert.equal(gate("sh deploy.sh", forged), 2, target);
  }
});

test("approval: a symlinked approval file or a swapped state directory is never read, and the refusal says so", () => {
  const w = worktreeWorld();
  const elsewhere = mkdtempSync(join(tmpdir(), "else-")); dirs.push(elsewhere);
  writeFileSync(join(elsewhere, "release-approval"), `t · ${today()} · forged\n`);
  mkdirSync(join(w.common, "cycle"), { recursive: true });
  symlinkSync(join(elsewhere, "release-approval"), join(w.common, "cycle", "release-approval"));       // (a) a symlinked file in a real folder
  let r = runHook("production-gate.mjs", bash("sh deploy.sh"), w.main);
  assert.equal(r.status, 2, r.stderr); assert.match(r.stderr, /is a symbolic link; the gate does not read it\. Remove it \(or ask the owner to\), then write a regular file/);
  assert.ok(r.stderr.indexOf("is a symbolic link") < r.stderr.indexOf("A human (not the agent)"), "the rejection comes first, before the instructions");
  rmSync(join(w.common, "cycle"), { recursive: true, force: true });
  symlinkSync(elsewhere, join(w.common, "cycle"));                                                      // (b) the whole folder swapped for a symlink
  r = runHook("production-gate.mjs", bash("sh deploy.sh"), w.main);
  assert.equal(r.status, 2); assert.match(r.stderr, /is a symbolic link, so the shared place cannot be trusted/);
  assert.equal(gate("sh deploy.sh", w.sibling), 2);
  writeFileSync(join(w.main, ".cycle", "release-approval"), `t · ${today()} · v1\n`);
  assert.equal(gate("sh deploy.sh", w.main), 2, "a swapped shared folder refuses outright: a local approval file does not take its place");
});

test("publish rule: an approval in the method repository's shared place allows the push from the nested clone", () => {
  const { pluginRoot, method, cloneAt } = methodWorld();
  const nested = cloneAt(join(method, ".cycle", "work", "publish", "pub"));
  const cmd = "git push origin HEAD:main";
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 2);
  const shared = join(method, ".git", "cycle"); mkdirSync(shared, { recursive: true });
  writeFileSync(join(shared, "release-approval"), `t · ${today()} · publish 9.9.9\n`);
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 0);
});

test("protect-cycle: the shared approval path is protected like the old one — straight, with ./ // .., through a symlinked folder, and the directory itself; reading stays allowed", () => {
  const w = worktreeWorld();
  const dir = join(w.common, "cycle"); mkdirSync(dir, { recursive: true });
  const p = join(dir, "release-approval");
  for (const tool of ["Write", "Edit", "MultiEdit"]) assert.equal(protect({ tool_name: tool, tool_input: { file_path: p, content: "x" } }, w.main), 2, tool);
  for (const odd of [`${dir}/./release-approval`, `${dir}//release-approval`, `${dir}/x/../release-approval`, `${w.common}/cycle/../cycle/release-approval`])
    assert.equal(protect({ tool_name: "Write", tool_input: { file_path: odd, content: "x" } }, w.main), 2, odd);
  assert.equal(protect({ tool_name: "Write", tool_input: { file_path: join(w.main, ".cycle", ".", "release-approval"), content: "x" } }, w.main), 2, "the old path too");
  const via = mkdtempSync(join(tmpdir(), "via-")); dirs.push(via); symlinkSync(dir, join(via, "l"));         // a symlink that reaches the folder
  assert.equal(protect({ tool_name: "Write", tool_input: { file_path: join(via, "l", "release-approval"), content: "x" } }, w.main), 2, "through a symlinked parent");
  assert.equal(protect(bash(`echo x > ${p}`), w.main), 2);
  assert.equal(protect(bash(`cp /tmp/x ${p}`), w.main), 2);
  assert.equal(protect(bash(`mv ${dir} ${dir}.old`), w.main), 2, "moving the folder away");
  assert.equal(protect(bash(`ln -s /tmp/x ${w.common}/cycle`), w.main), 2, "replacing it by a link");
  assert.equal(protect(bash(`cp -r ${dir} /tmp/y`), w.main), 2);
  assert.equal(protect(bash(`cat ${p}`), w.main), 0);
  assert.equal(protect(bash(`tail -n 5 ${dir}/gate/gate.log`), w.main), 0, "reading the log stays allowed");
  assert.equal(protect(bash(`ls ${dir}`), w.main), 0);
  assert.equal(protect({ tool_name: "Write", tool_input: { file_path: join(w.main, "docs", "release-approval.md"), content: "x" } }, w.main), 0, "a different file name is not the approval");
});

test("session-start: a linked worktree is told where the approval and the log live and how many share them; the main checkout is not", () => {
  const w = worktreeWorld();
  const say = (d) => JSON.parse(runHook("session-start.mjs", {}, d).stdout).hookSpecificOutput.additionalContext;
  const linked = say(w.sibling);
  assert.ok(linked.includes(join(w.common, "cycle")), linked);
  assert.match(linked, /shared by 3 worktrees/);
  assert.doesNotMatch(say(w.main), /shared by/);
  const plain = mkdtempSync(join(tmpdir(), "plain-")); dirs.push(plain); mkdirSync(join(plain, ".cycle"));
  assert.doesNotMatch(say(plain), /shared by/);
  symlinkSync(mkdtempSync(join(tmpdir(), "else-")), join(w.common, "cycle"));
  assert.match(say(w.main), /WARNING: .*is a symbolic link, so the shared place cannot be trusted/);
});

test("docs: every place that tells the owner where the approval goes names the shared place", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  for (const f of ["docs/CONTRACT.md", "skills/deploy/SKILL.md", "commands/cycle.md"]) {
    assert.match(readFileSync(join(root, f), "utf8"), /<git-common-dir>\/cycle\/release-approval/, f);
  }
  for (const f of ["README.md", "README.pt-BR.md", "templates/claude-md-block.md", "CLAUDE.md"]) {       // plain words for a newcomer: the folder is spelled out
    if (f === "CLAUDE.md" && !existsSync(join(root, f))) continue;                                      // a working-copy file (export-ignore): not in the shipped package
    assert.match(readFileSync(join(root, f), "utf8"), /\.git\/cycle\/release-approval/, f);
  }
  assert.doesNotMatch(readFileSync(join(root, "skills/maintain/SKILL.md"), "utf8"), /\.cycle\/work\/gate\.log/, "the log's reader looks where the log is");
});

// ───────────── the approval's date (2026-10-17) ─────────────
const tzDate = (tz, ms = Date.now()) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(ms).map(x => [x.type, x.value])); return `${p.year.padStart(4, "0")}-${p.month.padStart(2, "0")}-${p.day.padStart(2, "0")}`; };
const utcDate = () => new Date().toISOString().slice(0, 10);
/** A zone whose date differs from UTC's right now (Kiritimati is +14, Pago Pago -11: one of them always does). */
const farZone = () => tzDate("Pacific/Kiritimati") !== utcDate() ? "Pacific/Kiritimati" : "Pacific/Pago_Pago";
const deployRepo = () => { const d = repo(); write(d, ".cycle/gate.json", JSON.stringify({ patterns: ["deploy.sh"] })); return d; };

test("approval date: the day is the owner's, the machine's own zone (the configured one only at UTC+0); an invalid zone is reported, never ignored", async () => {
  const A = await import("../hooks/_approval.mjs");
  const d = repo();
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Pacific/Kiritimati" }));
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!/^(UTC|Etc\/UTC|Etc\/GMT|GMT)$/.test(own)) { assert.equal(A.resolveTimezone(d).tz, own); assert.equal(A.resolveTimezone(d).ignored, "Pacific/Kiritimati"); }   // a machine with its own zone keeps it
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Not/AZone" }));
  const r = A.resolveTimezone(d);
  assert.equal(r.invalid, "Not/AZone"); assert.equal(r.source, "machine");
  write(d, ".cycle/config.json", "{}");
  assert.equal(A.resolveTimezone(d).source, "machine");
  assert.notEqual(A.localDate("Pacific/Kiritimati"), A.localDate("Pacific/Pago_Pago"), "25 hours apart: their dates never coincide");
  assert.equal(A.localDate("Pacific/Kiritimati", Date.parse("2026-10-17T02:30:00Z")), "2026-10-17");
  assert.equal(A.localDate("America/Sao_Paulo", Date.parse("2026-10-17T02:30:00Z")), "2026-10-16");
  assert.equal(A.localDate("UTC", Date.parse("2026-01-05T12:00:00Z")), "2026-01-05", "a single-digit month and day are padded");
  assert.equal(A.localDate("Pacific/Kiritimati", Date.parse("2026-03-09T12:00:00Z")), "2026-03-10");
  for (const z of ["UTC", "America/Sao_Paulo", "Pacific/Kiritimati", "Pacific/Pago_Pago", "Asia/Kolkata"]) assert.match(A.localDate(z), /^\d{4}-\d{2}-\d{2}$/, z);
});

test("approval date: a date token counts, a longer digit or hyphen run does not", async () => {
  const A = await import("../hooks/_approval.mjs");
  assert.equal(A.hasDateToken("Gui · 2026-10-17 · release", "2026-10-17"), true);
  assert.equal(A.hasDateToken("2026-10-17", "2026-10-17"), true);
  for (const bad of ["2026-10-170", "12026-10-17", "x-2026-10-17", "2026-10-17-1"]) assert.equal(A.hasDateToken(bad, "2026-10-17"), false, bad);
});

test("approval date: a machine timezone that cannot be determined (TZ empty, unknown, POSIX-style) falls back to UTC and says so, never an internal error", () => {
  const d = deployRepo();
  for (const tz of ["", "Foo/Bar", "BRT3"]) {
    write(d, ".cycle/release-approval", `t · ${utcDate()} · v1\n`);
    const r = runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: tz });
    assert.doesNotMatch(r.stderr, /internal error/i, `TZ=${JSON.stringify(tz)}: ${r.stderr}`);
    if (r.status === 2) assert.match(r.stderr, /could not be determined/, `TZ=${JSON.stringify(tz)}`);
    else assert.equal(r.status, 0, `TZ=${JSON.stringify(tz)}: UTC date matches the file`);
  }
});

test("approval: a file dated the owner's day passes in his zone and fails in the one 25 hours away", () => {
  const d = deployRepo();
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Pacific/Kiritimati" }));
  write(d, ".cycle/release-approval", `t · ${tzDate("Pacific/Kiritimati")} · v1\n`);
  assert.equal(gate("sh deploy.sh", d, { TZ: "UTC" }), 0);
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Pacific/Pago_Pago" }));
  write(d, ".cycle/release-approval", `t · ${tzDate("Pacific/Kiritimati")} · v1 (new words, so not the used one)\n`);
  assert.equal(gate("sh deploy.sh", d, { TZ: "UTC" }), 2, "the same date is the wrong day in the other zone");
});

test("approval: with no config the machine's zone decides (TZ set for the hook process)", () => {
  const d = deployRepo();
  write(d, ".cycle/release-approval", `t · ${tzDate("Pacific/Kiritimati")} · v1\n`);
  assert.equal(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "Pacific/Kiritimati" }).status, 0);
  write(d, ".cycle/release-approval", `t · ${tzDate("Pacific/Kiritimati")} · v1 (again)\n`);
  assert.equal(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "Pacific/Pago_Pago" }).status, 2);
});

test("approval: a longer digit run is not today", () => {
  const d = deployRepo();
  write(d, ".cycle/release-approval", `t · ${today()}0 · v1\n`);
  assert.equal(gate("sh deploy.sh", d), 2);
});

test("approval refusal: it says the date and zone it expects, the end of that day, a ready command — and why the file in front of it fails, one reason at a time", () => {
  const d = deployRepo();
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Not/AZone" }));
  const none = runHook("production-gate.mjs", bash("sh deploy.sh"), d);
  assert.match(none.stderr, new RegExp(`expects a line dated ${today()}`));
  assert.match(none.stderr, /valid through the end of that day/);
  assert.doesNotMatch(none.stderr, /minutes|window/, "the window was cut");
  assert.match(none.stderr, /The zone "Not\/AZone" in \.cycle\/config\.json is not a valid zone/);
  assert.match(none.stderr, /mkdir -p '.*' && printf '%s\\n' '<name> · \d{4}-\d{2}-\d{2} · <what is being released>' > '/);
  assert.match(none.stderr, /Looked in: .*release-approval/);
  write(d, ".cycle/config.json", "{}");
  write(d, ".cycle/release-approval", `t · ${daysAgo(3)} · v1\n`);                                   // (a) another day
  const wrong = runHook("production-gate.mjs", bash("sh deploy.sh"), d);
  assert.match(wrong.stderr, new RegExp(`dated ${daysAgo(3)}, not today`));
  assert.doesNotMatch(wrong.stderr, /matches the UTC date/);
  write(d, ".cycle/config.json", JSON.stringify({ timezone: farZone() }));                          // (a') the UTC date, while the owner's day is another
  write(d, ".cycle/release-approval", `t · ${utcDate()} · v1\n`);
  assert.match(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "UTC" }).stderr, /matches the UTC date, which this gate no longer counts/);
  write(d, ".cycle/config.json", "{}");
  rmSync(join(d, ".cycle", "release-approval"));                                                    // (c) unreadable: a symlink the gate will not read
  const target = join(mkdtempSync(join(tmpdir(), "else-")), "x"); dirs.push(dirname(target)); writeFileSync(target, `t · ${today()} · forged\n`);
  symlinkSync(target, join(d, ".cycle", "release-approval"));
  const bad = runHook("production-gate.mjs", bash("sh deploy.sh"), d);
  assert.equal(bad.status, 2); assert.match(bad.stderr, /is a symbolic link; the gate does not read it\. Remove it \(or ask the owner to\), then write a regular file/);
  assert.ok(bad.stderr.indexOf("is a symbolic link") < bad.stderr.indexOf("Command:"), "the rejection comes first, before the command and the instructions");
});

function releaseWorld(day = today()) {
  const d = deployRepo();
  const f = join(d, ".cycle", "release-approval"); writeFileSync(f, `t · ${day} · v1\n`);
  return { d, f };
}

test("approval date: an approval dated yesterday does not cover", () => {
  const { d } = releaseWorld(daysAgo(1));
  assert.equal(gate("sh deploy.sh", d), 2, "unused and dated yesterday");
});

test("approval refusal: on a machine at UTC+0 the owner is asked to set the zone; elsewhere nothing is said", () => {
  const d = deployRepo();
  assert.match(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "UTC" }).stderr, /this machine's zone is UTC \(UTC\+0\)\. If the owner's day is another zone, ask the owner to set "timezone"/);
  assert.doesNotMatch(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "Pacific/Pago_Pago" }).stderr, /UTC\+0/);
});

test("protect-cycle: nothing under the shared folder can be written, moved, linked or removed by an agent (the approval, the log, anything), the routes that never name the approval are closed, and reading stays allowed", () => {
  const w = worktreeWorld();
  const s = join(w.common, "cycle"); mkdirSync(join(s, "gate"), { recursive: true });
  for (const p of [join(s, "gate", "gate.log"), join(s, "anything.json")]) for (const tool of ["Write", "Edit", "MultiEdit"]) assert.equal(protect({ tool_name: tool, tool_input: { file_path: p, content: "{}" } }, w.main), 2, `${tool} ${p}`);
  for (const cmd of [`rm -rf ${s}`, `mv ${s} ${s}.old`, `find ${s} -name 'gate*' -delete`, `rm ${s}/gate/*`, `touch ${s}`, `chmod a-w ${s}`, `cat /dev/null > ${s}/gate/gate.log`, `truncate -s 0 ${s}/gate/gate.log`, `ln -sfn /tmp/x ${s}`])
    assert.equal(protect(bash(cmd), w.main), 2, cmd);
  for (const cmd of [`cat ${s}/gate/gate.log`, `ls ${s}`, `tail -n 5 ${s}/gate/gate.log`]) assert.equal(protect(bash(cmd), w.main), 0, cmd);
});
test("config template: timezone is present, the cut window key is not, and the other keys survive", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const c = JSON.parse(readFileSync(join(root, "templates", "config.json"), "utf8"));
  assert.equal(c.timezone, null); assert.ok(!("approval_window_minutes" in c), "the window was cut");
  for (const k of ["gates", "stateful", "method_repo", "protected_branches", "models", "knowledge", "products"]) assert.ok(k in c, k);
});
test("docs: the contract names the owner's day and the zone rule, and not the cut window", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const t = readFileSync(join(root, "docs", "CONTRACT.md"), "utf8");
  for (const w of ["timezone", "end of that day", "UTC+0"]) assert.ok(t.includes(w), w);
  for (const w of ["approval_window_minutes", "approvals-used.json"]) assert.ok(!t.includes(w), `the cut window is not documented: ${w}`);
  assert.match(readFileSync(join(root, "skills", "deploy", "SKILL.md"), "utf8"), /the owner's local day/);
});

// ───────────── final review fix pass (2026-10-17): the configured zone, the refusal's advice, reading the shared log ─────────────
test("approval date: the configured zone applies only on a machine at UTC+0; a machine with its own zone keeps it (an edited config cannot move the owner's day)", () => {
  const d = deployRepo();
  write(d, ".cycle/config.json", JSON.stringify({ timezone: "Pacific/Kiritimati" }));
  write(d, ".cycle/release-approval", `t · ${tzDate("Pacific/Kiritimati")} · v1\n`);
  assert.equal(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "UTC" }).status, 0, "a UTC runner uses the configured zone");
  const r = runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "Pacific/Pago_Pago" });
  assert.equal(r.status, 2, "a machine with its own zone ignores the configured one");
  assert.match(r.stderr, /the configured zone is used only on a machine at UTC\+0/);
});

test("approval refusal: it never tells the reader to edit .cycle/config.json itself; a zone change is the owner's to make", () => {
  const d = deployRepo();
  for (const tz of ["UTC", "", "Foo/Bar", "America/Sao_Paulo"]) {
    const r = runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: tz });
    assert.doesNotMatch(r.stderr, /raise approval_window_minutes|(?<!ask the owner to )set "timezone" in \.cycle\/config\.json/, `TZ=${JSON.stringify(tz)}`);
  }
  assert.match(runHook("production-gate.mjs", bash("sh deploy.sh"), d, { TZ: "UTC" }).stderr, /ask the owner to set "timezone" in \.cycle\/config\.json/);
});

test("protect-cycle: a pipeline that reads the shared log is refused with a message that says how to read it", () => {
  const w = worktreeWorld();
  const log = join(w.common, "cycle", "gate", "gate.log"); mkdirSync(dirname(log), { recursive: true }); writeFileSync(log, "x ask segment r @a\n");
  const r = runHook("protect-cycle.mjs", bash(`grep ask ${log} | sort | uniq -c`), w.main);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /read it with cat, grep or tail/);
  assert.equal(protect(bash(`grep -c ' ask .*@a$' ${log}`), w.main), 0, "the way the maintain skill tells you to count stays allowed");
});

// ───────────── verifier findings (2026-10-17) ─────────────
test("protect-cycle: the shared folder spelled with doubled slashes or ./ is still the shared folder in a Bash command; a staged copy into it is refused", () => {
  const w = worktreeWorld();
  const stage = mkdtempSync(join(tmpdir(), "stage-")); dirs.push(stage);
  for (const cmd of [`rm -rf .git//cycle`, `rm -rf ./.git/./cycle`, `cp -r ${stage}/. ${w.common}//cycle/`, `mv ${w.main}/.git//cycle /tmp/x`, `ln -s /tmp/x ./.git/./cycle`])
    assert.equal(protect(bash(cmd), w.main), 2, cmd);
});

test("protect-cycle: a Write through a symlink to .git is refused even before the shared folder exists", () => {
  const w = worktreeWorld();
  const via = mkdtempSync(join(tmpdir(), "via-")); dirs.push(via); symlinkSync(w.common, join(via, "gl"));
  assert.ok(!existsSync(join(w.common, "cycle")));
  for (const p of [join(via, "gl", "cycle", "gate", "x"), join(via, "gl", "cycle", "release-approval")])
    assert.equal(protect({ tool_name: "Write", tool_input: { file_path: p, content: "x" } }, w.main), 2, p);
});

// ───────────── a named version is the published one (2026-10-17, found at the 0.9.2 publish gate) ─────────────
test("publish rule: an approval that names another version does not cover this publish, even with today's date and the word publish", () => {
  const { pluginRoot, method, cloneAt } = methodWorld();                     // the method's manifest says 9.9.9
  const nested = cloneAt(join(method, ".cycle", "work", "publish", "pub"));
  const shared = join(method, ".git", "cycle"); mkdirSync(shared, { recursive: true });
  const f = join(shared, "release-approval");
  const cmd = "git push origin HEAD:main";
  writeFileSync(f, `t · ${today()} · publish 9.9.8\n`);
  const r = pushFrom(nested, cmd, pluginRoot);
  assert.equal(r.status, 2, "the approval of another release does not cover this one");
  assert.match(r.stderr, /a version it names must be the one being released/);
  writeFileSync(f, `t · ${today()} · publish 9.9.9 (after 9.9.8)\n`);
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 2, "two versions named, one of them another release: refused");
  writeFileSync(f, `t · ${today()} · publish 10.0.0\n`);
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 2, "a later version is another release too");
  writeFileSync(f, `t · ${daysAgo(1)} · publish 9.9.9\n`);
  assert.equal(pushFrom(nested, cmd, pluginRoot).status, 2, "the right version on another day is still another day");
  for (const ok of [`t · ${today()} · publish 9.9.9`, `t · ${today()} · v9.9.9 publish`, `t · ${today()} · publish`, `t · ${today()} · release 9.9.9`, `t · ${today()} · publish (2026.10.17 build)`]) {
    writeFileSync(f, ok + "\n");
    assert.equal(pushFrom(nested, cmd, pluginRoot).status, 0, ok);
  }
});
