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
export function outcome(dir, command, extra = {}) {
  const payload = JSON.stringify({ cwd: dir, permission_mode: "default", tool_input: { command }, ...extra });
  const env = { ...process.env, ...gitEnv, CLAUDE_PROJECT_DIR: dir };
  const a = spawnSync(process.execPath, [join(hooks, "pre-bash.mjs")], { cwd: dir, encoding: "utf8", input: payload, env });
  const b = spawnSync(process.execPath, [join(hooks, "protect-cycle.mjs")], { cwd: dir, encoding: "utf8", input: payload, env });
  for (const x of [a, b]) if (/no such file|can't open/i.test(x.stderr)) throw new Error(`stderr hygiene: ${x.stderr}`);
  if (a.status === 2 || b.status === 2) return "deny";
  if (/"permissionDecision":"ask"/.test(a.stdout)) return "ask";
  return "allow";
}

/** Prepare the directories a case names and return the command with placeholders filled. */
export function prepare(c) {
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
  if (c.approval_in_a) writeFileSync(join(dir, ".cycle", "release-approval"), `t · ${new Date().toISOString().slice(0, 10)} · test fixture\n`);
  return { dir, command };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  for (const c of data.cases) {
    const { dir, command } = prepare(c);
    c.before = outcome(dir, command);
  }
  data.recorded_on = sh(["git", "rev-parse", "--short", "HEAD"], join(here, "..", "..", "..")).stdout.trim();
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`recorded_on ${data.recorded_on}`);
  console.log(data.cases.map((c) => `${c.before.padEnd(5)} → ${c.expect.padEnd(5)} ${c.id}`).join("\n"));
}
