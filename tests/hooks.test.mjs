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

import { commandDir, repoFor, gateRepo, commandView, walk, viewFor } from "../hooks/_lib.mjs";

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
  test(`gate-prose ${c.id}: ${c.before} → ${c.expect}`, () => {
    const { dir, command } = prepareCase({ ...c });
    const got = replay(dir, command);
    assert.equal(got, c.expect, `${c.id} (${c.class})`);
  });
}

test("never looser: a case that denied before may only stop denying with a declared loosening", () => {
  const undeclared = GATE_PROSE.cases.filter((c) => c.before === "deny" && c.expect !== "deny" && !c.loosening);
  assert.deepEqual(undeclared.map((c) => c.id), [], "a deny became something else without a declared reason");
  const toAllow = GATE_PROSE.cases.filter((c) => c.before === "deny" && c.expect === "allow");
  assert.ok(toAllow.length <= 5, "more deny→allow cases than the plan declared");
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
  const log = readFileSync(join(dir, ".cycle", "work", "gate", "gate.log"), "utf8").trim().split("\n");
  assert.equal(readFileSync(join(dir, ".cycle", "work", "gate", ".gitignore"), "utf8").trim(), "*", "the log folder ignores itself");
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
