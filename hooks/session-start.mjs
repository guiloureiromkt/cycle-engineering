// cycle-engineering · SessionStart: speaks in every repo.
// Without `.cycle/`: one line pointing at /cycle:init. With it: the state and the routing rule.
import { existsSync, statSync, unlinkSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { root, cycleOn, listMd, frontmatterStatus, isMain, lastEvolveReport, stateDir } from "./_lib.mjs";

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

/** An unattended run left open in this repository (2026-09-23): the newest `.cycle/work/<plan>/run.md`
 *  whose header says `mode: unattended` and whose last line is neither `Stopped:` nor `Finished:`.
 *  Only this session's own repository is read; a run elsewhere is not seen, and that is the stated limit. */
function runInProgress() {
  try {
    const work = join(root(), ".cycle", "work");
    if (!existsSync(work)) return "";
    const ledgers = readdirSync(work, { withFileTypes: true }).filter(d => d.isDirectory())
      .map(d => join(work, d.name, "run.md")).filter(f => existsSync(f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    for (const f of ledgers) {
      const lines = readFileSync(f, "utf8").split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.some(l => l === "mode: unattended")) continue;
      const last = lines[lines.length - 1] || "";
      if (/^(Stopped|Finished):/.test(last)) continue;
      const plan = (lines[0].match(/plan:\s*(\S+)/) || [])[1] || "(plan not named)";
      const ids = ((lines.find(l => l.startsWith("tasks:")) || "").slice(6).trim().split(/\s+/)).filter(Boolean);
      const done = new Set(lines.map(l => (l.match(/^Task (\S+): complete\b/) || [])[1]).filter(Boolean));
      const next = ids.find(id => !done.has(id));
      const where = !ids.length ? "next task unknown (the header has no tasks: line; read the plan)"
        : next ? `next Task ${next}` : "every listed task complete (the final review and a Finished: line are left)";
      return ` An unattended run in progress: ${plan}, ${where}; resume from ${f.slice(root().length + 1)}, which is the record, not your memory.`;
    }
  } catch { /* an unreadable ledger never breaks session start */ }
  return "";
}

/** Age in days of the newest routine report (see lastEvolveReport in _lib.mjs), or null. */
function lastEvolveAgeDays() {
  const r = lastEvolveReport(root());
  if (!r) return null;
  return Math.floor((Date.now() - Date.parse(r.date + "T00:00:00Z")) / 86400000);
}

/** The line the method repository gets about its own weekly routine (2026-10-16): independent of any scheduler. */
function evolveStaleness() {
  let cfg = {};
  try { cfg = JSON.parse(readFileSync(join(root(), ".cycle", "config.json"), "utf8")); } catch { return ""; }
  if (cfg?.method_repo !== ".") return "";
  const age = lastEvolveAgeDays();
  if (age === null) return " last evolve report: none yet.";
  return ` last evolve report: ${age} day${age === 1 ? "" : "s"} ago${age > 9 ? " · WARNING: the weekly routine has not reported in over 9 days — run it by hand (docs/routines/weekly-evolve.md) or check the desktop task cycle-weekly-evolve" : ""}.`;
}

/** One line for a session in a linked worktree (2026-10-17): the approval and the gate log are not in this checkout's .cycle/. */
function sharedStateNotice() {
  try {
    const s = stateDir(root());
    if (s.problem) return ` WARNING: ${s.problem}.`;
    if (!s.shared || !s.linked) return "";
    return ` This is a linked worktree: the release approval and the gate log for this repository live in ${s.dir}, shared by ${s.worktrees} worktrees.`;
  } catch { return ""; }
}

export function run() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || "(unknown)";
  if (!cycleOn()) {
    return `cycle-engineering installed (plugin root: ${pluginRoot}). This repo is not on the cycle yet: run /cycle:init to start, or ignore this line.${gatedNeighbours()}`;
  }
  const count = d => listMd(d, root()).length;
  const accepted = listMd("plans", root()).filter(f => frontmatterStatus(f) === "accepted").map(f => f.split("/").pop());
  return `${gatesInactiveNotice()}${missingCwdNotice()}# cycle-engineering · this repository runs the cycle (plugin root: ${pluginRoot})
State: intents=${count("intent")} · research=${count("research")} · specs=${count("specs")} · plans=${count("plans")} · accepted plans: ${accepted.join(" ") || "none"}.${evolveStaleness()}${runInProgress()}${sharedStateNotice()}
RULE THAT CHANGES HOW YOU WORK HERE: before starting work that builds or changes something, code or not, invoke the skill cycle:using-cycle with the Skill tool. It tells you which stage the request is in, how big it is and which cycle skill runs next. A question that changes nothing needs no routing; a routine writing its own outputs skips it. This holds even when the user says "it's simple", "just do it", "no questions", "I know what I want" — routing takes a minute and its answer may be "go straight to build", only when an accepted plan exists.
Subagent dispatched with a specific task: ignore this and do the task.`;
}

if (isMain(import.meta.url)) {
  let ctx;
  try { ctx = run(); }
  catch (e) { ctx = `cycle-engineering: session-start could not read the repo state (${e.message}). Gates still run.`; }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ctx } }));
  process.exit(0);
}
