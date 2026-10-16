// cycle-engineering · snapshot guard (PreToolUse on Bash, dispatched by pre-bash.mjs).
// A destructive command needs a snapshot recorded in .cycle/work/<intent>/snapshot.md less than 60 minutes old.
// Since 2026-10-16 the rules run per executable segment (hooks/_lib.mjs commandView + walk): a destructive
// phrase that lives only in a comment, a quoted-tag heredoc body or a sink quote is grey → ask.
import { join } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import { gateRepo, root, isMain, main, viewFor, walk, gateLog } from "./_lib.mjs";

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
export function destructiveMatch(cmd, repoRoot) {   // repoRoot is required: a default that resolved to the session is the bug this cycle fixes
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

function freshSnapshotExists(repo) {
  const work = join(repo, ".cycle/work");
  if (!existsSync(work)) return false;
  try {
    return readdirSync(work, { withFileTypes: true }).some(d => {
      if (!d.isDirectory()) return false;
      const f = join(work, d.name, "snapshot.md");
      return existsSync(f) && (Date.now() - statSync(f).mtimeMs) < SNAPSHOT_TTL_MS;
    });
  } catch { return false; }
}

const cut = (raw) => (raw.length > 300 ? raw.slice(0, 300) + " […]" : raw);

function refusal(raw, repo, hit, where) {
  return `cycle · SNAPSHOT GUARD: this command is destructive (matched: ${hit}${where}) and no snapshot newer than 60 minutes exists.
Command: ${cut(raw)}
Before running it, take a snapshot (git stash -u, a branch, a DB dump) and record it in ${join(repo, ".cycle/work")}/<intent>/snapshot.md with what was saved and how to restore (the file's modification time is the clock). Then run the command again.`;
}

export function run(input) {
  const raw = String(input?.tool_input?.command || "");
  const sessionRepo = gateRepo(input);
  if (!raw || !sessionRepo) return { block: null };
  const sessionCwd = typeof input?.cwd === "string" && existsSync(input.cwd) ? input.cwd : root();
  const legacy = process.env.CYCLE_GATE_LEGACY === "1";
  const view = legacy ? null : viewFor(raw);
  if (legacy || !view || view.fallback || !view.segments.length) {
    const hit = destructiveMatch(raw.toLowerCase(), sessionRepo);
    if (!hit) return { block: null };
    if (freshSnapshotExists(sessionRepo)) return { block: null };
    gateLog(sessionRepo, "deny", hit, legacy ? "legacy" : "fallback");
    return { block: refusal(raw, sessionRepo, hit, legacy ? " (CYCLE_GATE_LEGACY=1: parsed as a whole)" : " (parsed as a whole: parser fallback)") };
  }
  const segs = walk(view, { cwd: sessionCwd });
  let hitSeen = false;                                                        // every hit needs ITS repo's snapshot (C-2)
  for (const [k, seg] of segs.entries()) {
    const repo = seg.repo ?? sessionRepo;
    const hit = destructiveMatch(seg.text.toLowerCase(), repo);
    if (!hit) continue;
    hitSeen = true;
    if (freshSnapshotExists(repo)) continue;
    gateLog(repo, "deny", hit, "segment");
    return { block: refusal(raw, repo, hit, ` in segment ${k + 1}: \`${seg.text.trim().slice(0, 120)}\``) };
  }
  if (hitSeen) return { block: null };                                        // every hit had a fresh snapshot
  const h = destructiveMatch(view.removed.map(r => r.text).join("\n").toLowerCase(), sessionRepo);
  if (!h) return { block: null };
  gateLog(sessionRepo, "ask", h, "removed");
  return { ask: `the words that match ${h} are only inside text being written or recorded (${[...new Set(view.removed.map(r => r.kind))].join(", ")}); nothing destructive runs. Allow if that is right.\nCommand: ${cut(raw)}` };
}

if (isMain(import.meta.url)) main(run);
