// cycle-engineering · snapshot guard (PreToolUse on Bash, dispatched by pre-bash.mjs).
// A destructive command needs a snapshot recorded in .cycle/work/<intent>/snapshot.md less than 60 minutes old.
import { join } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import { root, cycleOn, isMain, main } from "./_lib.mjs";

const SNAPSHOT_TTL_MS = 60 * 60 * 1000;
const RM_EXEMPT = /(^|\/)(node_modules|dist|build|\.next|coverage|\.cache|\.turbo)\/?$/;

/** Targets of a recursive `rm` that sit inside the repo (relative paths, or absolute under root). */
function rmTargetsInsideRepo(cmd, repoRoot) {
  const out = [];
  const lowRoot = repoRoot.toLowerCase().replace(/\/+$/, "");
  for (const m of cmd.matchAll(/(?:^|[\s;&|(])rm\s+([^;&|]*)/g)) {
    const tokens = m[1].trim().split(/\s+/).filter(Boolean);
    const flags = tokens.filter(t => t.startsWith("-"));
    const recursive = flags.some(f => f === "--recursive" || /^-[a-z]*r/.test(f));
    if (!recursive) continue;
    for (const t of tokens.filter(t => !t.startsWith("-"))) {
      const target = t.replace(/^["']|["']$/g, "").replace(/\/+$/, "");
      if (!target || RM_EXEMPT.test(target)) continue;
      if (target.startsWith("/") || target.startsWith("~")) {
        if (target !== lowRoot && !target.startsWith(lowRoot + "/")) continue;   // absolute path outside the repo
      }
      out.push(target);
    }
  }
  return out;
}

/** Name of the destructive pattern matched, or null. */
export function destructiveMatch(cmd, repoRoot = root()) {
  if (/\bgit\s+reset\s+--hard\b/.test(cmd)) return "git reset --hard";
  if (/\bgit\s+clean\s+(-[a-z]*f|--force)/.test(cmd)) return "git clean -f";
  if (/\bgit\s+checkout\s+--\s+\.(\s|$)/.test(cmd)) return "git checkout -- .";
  if (/\bdrop\s+(table|database|schema)\b/.test(cmd)) return "drop table|database|schema";
  if (/\bmigrate\s+(reset|down|fresh)\b/.test(cmd)) return "migrate reset|down|fresh";
  if (/\btruncate\s+table\b/.test(cmd)) return "truncate table";
  const rm = rmTargetsInsideRepo(cmd, repoRoot);
  if (rm.length) return `rm -rf ${rm[0]} (inside the repo)`;
  return null;
}

function freshSnapshotExists() {
  const work = join(root(), ".cycle/work");
  if (!existsSync(work)) return false;
  try {
    return readdirSync(work, { withFileTypes: true }).some(d => {
      if (!d.isDirectory()) return false;
      const f = join(work, d.name, "snapshot.md");
      return existsSync(f) && (Date.now() - statSync(f).mtimeMs) < SNAPSHOT_TTL_MS;
    });
  } catch { return false; }
}

export function run(input) {
  const raw = String(input?.tool_input?.command || "");
  const cmd = raw.toLowerCase();
  if (!cmd || !cycleOn()) return { block: null };
  const hit = destructiveMatch(cmd);
  if (!hit) return { block: null };
  if (freshSnapshotExists()) return { block: null };
  return { block: `cycle · SNAPSHOT GUARD: this command is destructive (matched: ${hit}) and no snapshot newer than 60 minutes exists.
Command: ${raw}
Before running it, take a snapshot (git stash -u, a branch, a DB dump) and record it in .cycle/work/<intent>/snapshot.md with what was saved and how to restore (the file's modification time is the clock). Then run the command again.` };
}

if (isMain(import.meta.url)) main(run);
