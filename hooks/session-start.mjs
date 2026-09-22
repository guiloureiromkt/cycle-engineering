// cycle-engineering · SessionStart: speaks in every repo.
// Without `.cycle/`: one line pointing at /cycle:init. With it: the state and the routing rule.
import { existsSync, statSync, unlinkSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { root, cycleOn, listMd, frontmatterStatus, isMain } from "./_lib.mjs";

/** Marker left by hooks/run.sh when node was missing: report it once, then remove it. */
function gatesInactiveNotice() {
  const f = join(root(), ".cycle/work/GATES-INACTIVE.md");
  if (!existsSync(f)) return "";
  let when = "an earlier session";
  try { when = statSync(f).mtime.toISOString().slice(0, 16).replace("T", " ") + " UTC"; } catch { /* keep the default wording */ }
  try { unlinkSync(f); } catch { /* unreadable marker still gets reported */ }
  return `WARNING: on ${when} node was missing from PATH and the cycle gates were NOT active (hooks/run.sh wrote .cycle/work/GATES-INACTIVE.md; this notice consumed it). Review what was committed or deployed in that window.\n`;
}

/** Gated repositories near the session, so the operator learns the gate's reach before it matters.
 *  Two levels: measured 2026-09-19 on one machine, `$HOME/*​/.cycle` found none and `$HOME/*​/*​/.cycle` found six —
 *  repositories live under a Repos/ directory, not beside the notes vault. */
function gatedNeighbours() {
  const names = [];
  try {
    const parent = dirname(root());
    for (const a of readdirSync(parent, { withFileTypes: true })) {
      if (!a.isDirectory() || a.name.startsWith(".")) continue;
      const lvl1 = join(parent, a.name);
      if (existsSync(join(lvl1, ".cycle"))) { names.push(a.name); continue; }
      try {
        for (const b of readdirSync(lvl1, { withFileTypes: true })) {
          if (b.isDirectory() && !b.name.startsWith(".") && existsSync(join(lvl1, b.name, ".cycle"))) names.push(`${a.name}/${b.name}`);
        }
      } catch { /* unreadable directory: skip it, never break the banner */ }
    }
  } catch { return ""; }
  if (!names.length) return "";
  names.sort();
  const shown = names.slice(0, 5).join(" · ");
  return ` Gated repositories nearby: ${shown}${names.length > 5 ? ` and ${names.length - 5} more` : ""}. Commands this session sends into them are gated there, even though this directory is not.`;
}

/** Marker left by _lib.noteMissingCwd when the host stopped sending a working directory with the payload. */
function missingCwdNotice() {
  const f = join(root(), ".cycle/work/NO-CWD-IN-PAYLOAD.md");
  if (!existsSync(f)) return "";
  try { unlinkSync(f); } catch { /* unreadable marker still gets reported */ }
  return `WARNING: a Bash payload arrived with no usable working directory, so the gates fell back to this repository alone — a command sent into another repository may not have been judged. If this repeats, the host's hook payload changed shape and hooks/_lib.mjs needs updating.\n`;
}

export function run() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || "(unknown)";
  if (!cycleOn()) {
    return `cycle-engineering installed (plugin root: ${pluginRoot}). This repo is not on the cycle yet: run /cycle:init to start, or ignore this line.${gatedNeighbours()}`;
  }
  const count = d => listMd(d, root()).length;
  const accepted = listMd("plans", root()).filter(f => frontmatterStatus(f) === "accepted").map(f => f.split("/").pop());
  return `${gatesInactiveNotice()}${missingCwdNotice()}# cycle-engineering · this repository runs the cycle (plugin root: ${pluginRoot})
State: intents=${count("intent")} · research=${count("research")} · specs=${count("specs")} · plans=${count("plans")} · accepted plans: ${accepted.join(" ") || "none"}.
RULE THAT CHANGES HOW YOU WORK HERE: before editing any code, invoke the skill cycle:using-cycle with the Skill tool. It tells you which stage the request is in and which cycle skill runs next. This holds even when the user says "it's simple", "just do it", "no questions", "I know what I want" — routing takes a minute and its answer may be "go straight to build".
Subagent dispatched with a specific task: ignore this and do the task.`;
}

if (isMain(import.meta.url)) {
  let ctx;
  try { ctx = run(); }
  catch (e) { ctx = `cycle-engineering: session-start could not read the repo state (${e.message}). Gates still run.`; }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ctx } }));
  process.exit(0);
}
