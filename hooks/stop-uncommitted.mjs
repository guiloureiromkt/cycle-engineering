// cycle-engineering · Stop: save-rule reminder (never blocks).
// Speaks at most once per 30 minutes per repo, never when stop_hook_active is set (avoids the loop).
import { join } from "node:path";
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { root, cycleOn, hasAcceptedPlan, readStdinJson, isMain } from "./_lib.mjs";

const THROTTLE_MS = 30 * 60 * 1000;

/** Returns `{ context: string|null }` — the reminder to inject, or nothing. */
export function run(input) {
  if (input?.stop_hook_active) return { context: null };
  if (!cycleOn()) return { context: null };
  const marker = join(root(), ".cycle/work/.stop-warned");
  try {
    if (existsSync(marker) && Date.now() - statSync(marker).mtimeMs < THROTTLE_MS) return { context: null };
  } catch { /* unreadable marker → treat as absent */ }
  if (!hasAcceptedPlan()) return { context: null };

  let dirty = "";
  try { dirty = execSync("git status --porcelain", { cwd: root(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return { context: null }; }                 // git missing or not a repo → nothing to say
  if (!dirty) return { context: null };

  const n = dirty.split("\n").length;
  try { mkdirSync(join(root(), ".cycle/work"), { recursive: true }); writeFileSync(marker, String(Date.now())); }
  catch { /* could not write the throttle marker; still warn this once */ }
  return { context: `cycle · SAVE RULE: the session is stopping with an accepted plan and ${n} uncommitted change(s). Rule 3 of cycle:build: commit after every numbered task. Commit now, or tell the user what is uncommitted and why.` };
}

if (isMain(import.meta.url)) {
  let r = { context: null };
  try { r = run(readStdinJson()); } catch { r = { context: null }; }   // a reminder must never break the stop
  if (r.context) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: r.context } }));
  process.exit(0);
}
