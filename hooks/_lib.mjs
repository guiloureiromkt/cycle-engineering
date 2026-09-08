// cycle-engineering · shared helpers for every hook.
// Rules that hold in all hooks (docs/CONTRACT.md):
//   - a gate only acts when the repo has `.cycle/` (cycleOn); no `.cycle/`, no gate.
//   - exit 0 = allow · exit 1 = non-blocking error · exit 2 = block (stderr goes to Claude).
//   - git unavailable / not a repo → allow. Malformed JSON or unreadable config → block.
//   - stderr never contains "no such file" or "can't open" (Claude Code downgrades those to non-blocking).
import { readFileSync, existsSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const today = () => new Date().toISOString().slice(0, 10);
export const cycleOn = () => existsSync(join(root(), ".cycle"));

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

export function listMd(dir) {
  const p = join(root(), dir);
  if (!existsSync(p)) return [];
  try {
    return readdirSync(p).filter(f => f.endsWith(".md") && !f.startsWith("_")).map(f => join(p, f));
  } catch { return []; }
}

export const hasAcceptedPlan = () => listMd("plans").some(f => frontmatterStatus(f) === "accepted");

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
