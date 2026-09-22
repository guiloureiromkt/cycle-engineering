// cycle-engineering · shared helpers for every hook.
// Rules that hold in all hooks (docs/CONTRACT.md):
//   - a gate acts when the repo the COMMAND acts on, or the session's own repo, has `.cycle/` (gateRepo);
//     neither one gated, no gate. Unresolved is never "allowed" — it falls back to the session (2026-09-04).
//   - exit 0 = allow · exit 1 = non-blocking error · exit 2 = block (stderr goes to Claude).
//   - git unavailable / not a repo → allow. Malformed JSON or unreadable config → block.
//   - stderr never contains "no such file" or "can't open" (Claude Code downgrades those to non-blocking).
import { readFileSync, existsSync, readdirSync, realpathSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const root = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const today = () => new Date().toISOString().slice(0, 10);
export const cycleOn = () => existsSync(join(root(), ".cycle"));

/** Where a Bash command acts: each `cd` folded left to right over the payload's cwd, else root(). */
export function commandDir(input) {
  try {
    const given = typeof input?.cwd === "string" ? input.cwd : "";
    let dir = given && existsSync(given) ? given : root();
    const cmd = String(input?.tool_input?.command || "");
    if (cmd && !given) noteMissingCwd(repoFor(dir));
    // Command position only: line start, or after && || ; — a path merely mentioned never moves the gate.
    for (const m of cmd.matchAll(/(?:^|&&|\|\||;)\s*cd\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/gm)) {
      const t = m[1] ?? m[2] ?? m[3] ?? "";
      if (!t || t === "-") continue;               // `cd -` is OLDPWD; untracked, so keep the last known dir
      dir = resolve(dir, t.startsWith("~") ? join(homedir(), t.slice(1)) : t);
    }
    // Flags whose whole meaning is "work in this directory" are as explicit as a cd.
    for (const m of cmd.matchAll(/(?:\bgit|\bmake|\benv)\s+(?:[^;&|]*?\s)?-C\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))|--prefix[= ](?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g)) {
      const t = m.slice(1).find(Boolean);
      if (t) dir = resolve(dir, t.startsWith("~") ? join(homedir(), t.slice(1)) : t);
    }
    // A nested shell hides its own cd: bash -c "cd /gated && …", ssh host "cd /gated && …".
    // One wrapper must not be an escape hatch out of the gates.
    const nested = cmd.match(/(?:\bbash|\bsh|\bzsh|\bssh)\s+[^;&|]*?(?:"([^"]+)"|'([^']+)')/);
    if (nested) {
      const inner = commandDir({ cwd: dir, tool_input: { command: nested[1] ?? nested[2] ?? "" } });
      if (inner) dir = inner;
    }
    return dir;
  } catch { return root(); }
}

/** Nearest ancestor carrying `.cycle/`. Stops BEFORE $HOME and at the filesystem root, so a marker in the
 *  home directory gates nothing. A nested `.git` does NOT stop the walk: a vendored repo, a submodule or a
 *  worktree inside a gated tree stays gated, which is the fail-closed direction. */
export function repoFor(from) {
  try {
    let dir = resolve(from || "/");
    const home = resolve(homedir());
    for (let i = 0; i < 64; i++) {
      if (dir === home) return null;
      if (existsSync(join(dir, ".cycle"))) return dir;
      const up = dirname(dir);
      if (up === dir) return null;
      dir = up;
    }
    return null;
  } catch { return null; }
}

/** The repo a gate judges: the command's when it resolves to a gated one, otherwise the session's when THAT
 *  is gated, otherwise null. Unresolved never means "allowed". */
export function gateRepo(input) {
  return repoFor(commandDir(input)) ?? repoFor(root());
}

/** One-shot marker: the host stopped sending a directory with the payload, so resolution is session-only.
 *  Reported and consumed by session-start, the same way hooks/run.sh's GATES-INACTIVE marker works. */
export function noteMissingCwd(repo) {
  if (!repo) return;
  try {
    const f = join(repo, ".cycle/work/NO-CWD-IN-PAYLOAD.md");
    if (existsSync(f)) return;
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, `${today()} · a Bash payload arrived with no usable \`cwd\` field.\nThe gates fell back to the session's own repository, which is the pre-2026-09 behaviour: a command sent into another repository is judged by this one, or not judged at all.\nIf this file keeps coming back, the host's hook payload changed shape and hooks/_lib.mjs needs updating.\n`);
  } catch { /* a marker that cannot be written must never break a gate */ }
}

/** Thrown by helpers when the hook must block; `runSafe` turns it into `{ block }`. */
export class HookBlock extends Error {}

/** Strip the two phrases Claude Code treats as "hook file missing" so a real block stays a block. */
export const safeMessage = (s) => String(s).replace(/no such file/gi, "missing path").replace(/can't open/gi, "cannot read");

export function block(msg) {
  process.stderr.write(safeMessage(msg) + "\n");
  process.exit(2);
}

export function readStdinJson() {
  let raw = "";
  try { raw = readFileSync(0, "utf8"); } catch { raw = ""; }
  try { return JSON.parse(raw.trim() || "{}"); }
  catch (e) { block(`cycle hook: could not parse tool input (${e.message})`); }
}

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw new HookBlock(`cycle hook: ${path} could not be read (${e.message})`); }
  try { return JSON.parse(raw); }
  catch (e) { throw new HookBlock(`cycle hook: ${path} is not valid JSON (${e.message})`); }
}

export function frontmatterStatus(file) {
  try {
    const m = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const s = m && m[1].match(/^status:\s*(\S+)/m);
    return s ? s[1] : null;
  } catch { return null; }
}

export function listMd(dir, base) {
  const p = join(base, dir);
  if (!existsSync(p)) return [];
  try {
    return readdirSync(p).filter(f => f.endsWith(".md") && !f.startsWith("_")).map(f => join(p, f));
  } catch { return []; }
}

export const hasAcceptedPlan = (base) => listMd("plans", base).some(f => frontmatterStatus(f) === "accepted");

/** Run a gate's `run(input)` and normalise the outcome to `{ block: string|null }`. */
export function runSafe(run, input) {
  try { return { block: run(input)?.block ?? null }; }
  catch (e) {
    if (e instanceof HookBlock) return { block: e.message };
    // Unexpected failure: fail loud rather than silently letting the action through.
    return { block: `cycle hook: internal error (${e && e.message ? e.message : e})` };
  }
}

/** True when `url` (import.meta.url) is the module node was started with, i.e. run directly. */
export function isMain(url) {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return realpathSync(p); } catch { return p; } };
  return real(resolve(process.argv[1])) === real(fileURLToPath(url));
}

/** Standard entry point for a gate executed on its own: read stdin, run, block or allow. */
export function main(run) {
  const r = runSafe(run, readStdinJson());
  if (r.block) block(r.block);
  process.exit(0);
}
