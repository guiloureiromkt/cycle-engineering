// cycle-engineering · protect-cycle (PreToolUse on Write|Edit|MultiEdit|Bash).
// The agent neither fabricates a release approval nor switches the gates off.
import { isMain, main, viewFor } from "./_lib.mjs";

const APPROVAL_MSG = "cycle · PROTECTED: .cycle/release-approval is written by a human outside the agent. Ask the user to create it; do not write it.";
const REMOVE_MSG = "cycle · PROTECTED: removing .cycle/ or its config disables the gates. Only the user does that, by hand, to opt out.";

// Since 2026-10-16 the approval rule reads what RUNS (hooks/_lib.mjs commandView): the bare name in any
// executable segment, with a writer program, a redirect or a subshell anywhere in the command, denies. A
// read-only command (grep, cat, git log …) or a mention inside a sink's quote (gh … --body "…") does not.
const NAME = /release-approval/;
const WRITE_ANYWHERE = /(>|\b(?:tee|cp|mv|touch|install|dd|rsync|ln)\b|\bsed\s+-i\b|\$\(|`)/;
const READ_ONLY = /^\s*(?:grep|rg|ag|cat|less|head|tail|wc|find|ls|stat|diff|git\s+(?:log|show|diff|status|blame|ls-files))\b/;

// These rules are pure string rules about `.cycle` paths: they never needed to know which repository they are
// in. Asking would hand the agent a one-token bypass (`cd /tmp && …`) for the one hook whose whole job is that
// the agent cannot switch the gates off. They run on every payload, gated session or not.
export function run(input) {
  const ti = input?.tool_input || {};
  const path = String(ti.file_path || "").replace(/\\/g, "/");
  const cmd = String(ti.command || "").toLowerCase();

  if (/(^|\/)\.cycle\/release-approval$/.test(path)) return { block: APPROVAL_MSG };

  if (cmd) {
    const view = process.env.CYCLE_GATE_LEGACY === "1" ? null : viewFor(cmd);
    const segs = !view || view.fallback || !view.segments.length ? [{ text: cmd }] : view.segments;
    const exec = segs.map(s => s.text).join("\n");
    const inExec = NAME.test(exec);
    const inRemoved = !!view && view.removed.some(r => NAME.test(r.text));   // a quoted path is still a path
    const writes = WRITE_ANYWHERE.test(exec);
    const allReadOnly = segs.every(s => READ_ONLY.test(s.text)) && !writes;
    if (inExec && !allReadOnly) return { block: APPROVAL_MSG };             // the name runs, and something can write
    if (inRemoved && writes) return { block: APPROVAL_MSG };                 // the name is quoted, but a redirect/writer/subshell is there
  }

  // rm -r … .cycle  ·  rm -rf ./.cycle/  ·  mv .cycle …  ·  rm .cycle/config.json | gate.json
  if (/\brm\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\b(mv|rmdir)\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\brm\b[^;&|]*\.cycle\/(gate|config)\.json/.test(cmd)) return { block: REMOVE_MSG };

  return { block: null };
}

if (isMain(import.meta.url)) main(run);
