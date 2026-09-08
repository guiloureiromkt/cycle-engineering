// cycle-engineering · production gate (PreToolUse on Bash, dispatched by pre-bash.mjs).
// Blocks a command that looks like a production deploy unless a human left a release approval.
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { root, today, readJson, cycleOn, isMain, main } from "./_lib.mjs";

// Conservative defaults: only explicit production markers (contract). Matched on the lowercased command.
export const DEFAULTS = [
  /--prod\b/, /--target production/, /--env production/,
  /deploy.*production|production.*deploy/,
  /gh run rerun/, /gh workflow run/,
  /wrangler deploy/, /fly deploy/, /railway up/,
];

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: root(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().toLowerCase() || null;
  } catch { return null; }   // git missing or not a repo → cannot resolve → allow
}

/** Branch a `git push` lands on (lowercase), or null when it is not a push or pushes only tags. */
export function pushTarget(cmd) {
  const m = cmd.match(/\bgit\s+push\b([^&|;]*)/);
  if (!m) return null;
  const args = m[1].trim().split(/\s+/).filter(Boolean);
  const positional = args.filter(a => !a.startsWith("-"));
  if (args.includes("--tags") && positional.length < 2) return null;
  const refspec = positional[1];                       // positional[0] is the remote
  if (refspec) {
    const dst = refspec.split(":").pop().replace(/^\+/, "").replace(/^refs\/heads\//, "");
    return dst === "head" ? currentBranch() : dst;     // cmd is lowercased, so HEAD arrives as head
  }
  return currentBranch();                              // bare `git push` → the current branch
}

export function run(input) {
  const raw = String(input?.tool_input?.command || "");
  const cmd = raw.toLowerCase();
  if (!cmd || !cycleOn()) return { block: null };

  const cfg = readJson(join(root(), ".cycle/config.json"), {});
  const gate = readJson(join(root(), ".cycle/gate.json"), {});
  const protectedBranches = (Array.isArray(cfg?.protected_branches) ? cfg.protected_branches : ["main"]).map(b => String(b).toLowerCase());
  const patterns = (Array.isArray(gate?.patterns) ? gate.patterns : []).map(p => String(p).toLowerCase()).filter(Boolean);

  let hit = DEFAULTS.find(r => r.test(cmd))?.source ?? null;
  if (!hit) { const p = patterns.find(p => cmd.includes(p)); if (p) hit = `gate.json pattern "${p}"`; }
  if (!hit) { const t = pushTarget(cmd); if (t && protectedBranches.includes(t)) hit = `push to protected branch ${t}`; }
  if (!hit) return { block: null };

  if (process.env.RELEASE_APPROVAL) return { block: null };
  const f = join(root(), ".cycle/release-approval");
  if (existsSync(f)) {
    try { if (readFileSync(f, "utf8").includes(today())) return { block: null }; } catch { /* unreadable → treated as absent */ }
  }
  return { block: `cycle · PRODUCTION GATE: this command looks like a production deploy (matched: ${hit}) and there is no release approval.
Command: ${raw}
A human (not the agent) does ONE of:
  1. export RELEASE_APPROVAL="<name> <reason>" in the session, or
  2. write .cycle/release-approval with "<name> · ${today()} · <what is being released>".
Then run the command again. The agent never creates this file or variable. Repo-specific deploy commands go in .cycle/gate.json "patterns".` };
}

if (isMain(import.meta.url)) main(run);
