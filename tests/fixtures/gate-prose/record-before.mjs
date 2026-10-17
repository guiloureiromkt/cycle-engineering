// cycle-engineering · replays every gate-prose case through the hooks AS THEY ARE in the working tree and
// writes `before` (allow | ask | deny) plus the sha it was recorded on. Run it ONCE on the commit before the
// gates change (Task 2 of plans/2026-10-16-the-gate-judges-commands-not-prose.md), commit the result, and
// never edit `before` by hand: it is the "never looser" baseline the suite checks the new gates against.
//   node tests/fixtures/gate-prose/record-before.mjs
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const hooks = process.env.GATE_PROSE_HOOKS || join(here, "..", "..", "..", "hooks");   // GATE_PROSE_HOOKS: record against another checkout's hooks (the old ones)
const file = join(here, "cases.json");
const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const dayIn = (tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(Date.now()).map(x => [x.type, x.value])); return `${p.year.padStart(4, "0")}-${p.month.padStart(2, "0")}-${p.day.padStart(2, "0")}`; };
const sh = (args, cwd) => spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });

/** A throwaway gated repo on `branch`, with the given gate.json patterns. */
export function gated(patterns = [], branch = "main") {
  const dir = mkdtempSync(join(tmpdir(), "gate-prose-"));
  sh(["git", "init", "-q", "-b", branch], dir);
  writeFileSync(join(dir, "README.md"), "# t\n");
  sh(["git", "add", "."], dir); sh(["git", "commit", "-q", "-m", "init"], dir);
  mkdirSync(join(dir, ".cycle", "work"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "gate.json"), JSON.stringify({ patterns }));
  return dir;
}

/** Outcome of `command` sent from `dir`, exactly as the host sends it (cwd + permission_mode in the payload). */
export function outcome(dir, command, extra = {}, extraEnv = {}) {
  const payload = JSON.stringify({ cwd: dir, permission_mode: "default", tool_input: { command }, ...extra });
  const env = { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir, ...extraEnv };
  delete env.RELEASE_APPROVAL; delete env.CYCLE_GATE_LEGACY; delete env.CYCLE_UNATTENDED;
  const a = spawnSync(process.execPath, [join(hooks, "pre-bash.mjs")], { cwd: dir, encoding: "utf8", input: payload, env });
  const b = spawnSync(process.execPath, [join(hooks, "protect-cycle.mjs")], { cwd: dir, encoding: "utf8", input: payload, env });
  for (const x of [a, b]) if (/no such file|can't open/i.test(x.stderr)) throw new Error(`stderr hygiene: ${x.stderr}`);
  if (a.status === 2 || b.status === 2) return "deny";
  if (/"permissionDecision":"ask"/.test(a.stdout)) return "ask";
  return "allow";
}

/** Prepare the directories a case names and return the command with placeholders filled. */
export async function prepare(c) {
  const dir = gated(c.patterns || [], c.branch || "main");
  mkdirSync("/tmp/other", { recursive: true });
  let command = c.command;
  if (/\/tmp\/gated-b\b/.test(command)) {                       // -b first: `/tmp/gated\b` would match inside it
    const b = gated([], c.branch_b || "master");
    command = command.replace(/\/tmp\/gated-b\b/g, b);
    c._b = b;
  }
  command = command.replace(/\/tmp\/gated\b/g, dir);
  if (c.snapshot_in_a) { mkdirSync(join(dir, ".cycle", "work", "x"), { recursive: true }); writeFileSync(join(dir, ".cycle", "work", "x", "snapshot.md"), "test snapshot\n"); }
  let env = {};
  if (c.clone_of_homepage) {                                   // a bare "public repo", a plugin manifest naming it, and a clone of it OUTSIDE any gated tree
    const base = mkdtempSync(join(tmpdir(), "gate-prose-home-"));
    const bare = join(base, "guiloureiromkt", "cycle-engineering.git"); mkdirSync(join(base, "guiloureiromkt"), { recursive: true });
    sh(["git", "init", "-q", "--bare", "-b", "main", bare], base);
    const plugin = join(base, "plugin"); mkdirSync(join(plugin, ".claude-plugin"), { recursive: true });
    writeFileSync(join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "cycle", version: "9.9.9", homepage: bare }));
    const clone = join(base, "scratch", "pub"); mkdirSync(clone, { recursive: true });
    sh(["git", "clone", "-q", bare, "."], clone); writeFileSync(join(clone, "x"), "x\n"); sh(["git", "add", "."], clone); sh(["git", "commit", "-q", "-m", "x"], clone); sh(["git", "tag", "v9.9.9"], clone);
    env = { CLAUDE_PLUGIN_ROOT: plugin };
    command = command.replace(/\/tmp\/homeclone\b/g, clone);
    c._dir = clone;
  }
  if (c.linked_worktree) {                                       // a committed .cycle/ so a sibling worktree has it; the command runs in main or in the sibling
    sh(["git", "add", "-f", ".cycle"], dir); sh(["git", "commit", "-q", "-m", "cycle"], dir);
    const sibling = `${dir}-wt`; sh(["git", "worktree", "add", "-q", "-b", "wt", sibling], dir);
    const day = new Date().toISOString().slice(0, 10);
    if (c.approval === "shared") { mkdirSync(join(dir, ".git", "cycle"), { recursive: true }); writeFileSync(join(dir, ".git", "cycle", "release-approval"), `t · ${day} · test fixture\n`); }
    if (c.approval === "sibling-local") writeFileSync(join(sibling, ".cycle", "release-approval"), `t · ${day} · test fixture\n`);
    if (c.run_in === "linked") c._dir = sibling;
  }
  if (c.approval_in_a) writeFileSync(join(dir, ".cycle", "release-approval"), `t · ${dayIn()} · test fixture\n`);
  const utcDay = new Date().toISOString().slice(0, 10);
  if (c.tz_pick === "differs-from-utc") {                        // a zone whose date is not UTC's right now (one of the two always is): v0.9.1 ignores TZ and counts UTC, the new gate counts the owner's day
    const tz = dayIn("Pacific/Kiritimati") !== utcDay ? "Pacific/Kiritimati" : "Pacific/Pago_Pago";
    writeFileSync(join(dir, ".cycle", "release-approval"), `t · ${dayIn(tz)} · test fixture\n`);
    env = { ...env, TZ: tz };
  }
  return { dir: c._dir || dir, command, env };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const sha = sh(["git", "rev-parse", "--short", "HEAD"], join(here, "..", "..", "..")).stdout.trim();
  for (const c of data.cases) {
    if (c.before !== undefined) continue;                       // the baseline of an old case is never re-recorded
    const { dir, command, env } = await prepare(c);
    c.before = outcome(dir, command, {}, env);
    c.before_recorded_on = `${sha} (hooks of ${process.env.GATE_PROSE_LABEL || "the working tree"})`;
  }
  for (const c of data.cases) { delete c._dir; delete c._b; }   // fixture paths are machine paths; the package carries none
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(data.cases.filter((c) => c.before_recorded_on).map((c) => `${c.before.padEnd(5)} → ${c.expect.padEnd(5)} ${c.id}`).join("\n"));
}
