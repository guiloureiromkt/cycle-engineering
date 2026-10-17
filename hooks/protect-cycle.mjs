// cycle-engineering · protect-cycle (PreToolUse on Write|Edit|MultiEdit|Bash).
// The agent neither fabricates a release approval nor switches the gates off.
import { isMain, main, viewFor } from "./_lib.mjs";
import { posix, dirname, basename, join } from "node:path";
import { realpathSync } from "node:fs";

const APPROVAL_MSG = "cycle · PROTECTED: the release approval (.cycle/release-approval, or release-approval inside the repository's git directory under cycle/) and the shared folder beside it (where the gate log lives) are written, moved, linked or removed only by a human outside the agent. A command that touches that folder and is not plainly read-only is refused (a pipe through sort or uniq counts as not read-only): read it with cat, grep or tail. Ask the user to create the approval; do not write it.";
const GUARDED_PATH = /(^|\/)(?:\.?cycle\/release-approval|\.git\/cycle\/.+)$/;
const GIT_CYCLE_DIR = /\.git\/cycle(\/|\b)/;                  // the shared state folder: moving, linking or copying it is how an approval would be retargeted

/** The real path of the nearest existing ancestor of `p`, with the rest of `p` joined back: a symlink anywhere above a folder that
 *  does not exist yet still resolves (a link to .git, then cycle/ that is not there yet). */
function realOfNearest(p) {
  let head = p; const rest = [];
  for (let i = 0; i < 64; i++) {
    try { return join(realpathSync(head), ...rest); } catch { /* not there yet: one level up */ }
    const up = dirname(head); if (up === head) return null;
    rest.unshift(basename(head)); head = up;
  }
  return null;
}

/** The path as it is, as the file system resolves it, and with its parent folder followed through symlinks. */
function guardedWrite(filePath) {
  if (!filePath) return false;
  const p = posix.normalize(String(filePath).replace(/\\/g, "/"));
  if (GUARDED_PATH.test(p)) return true;
  const real = realOfNearest(p);                                     // the nearest folder that exists, followed through symlinks, plus the rest
  return !!real && GUARDED_PATH.test(real.replace(/\\/g, "/"));
}
const REMOVE_MSG = "cycle · PROTECTED: removing .cycle/ or its config disables the gates. Only the user does that, by hand, to opt out.";

// Since 2026-10-16 the approval rule reads what RUNS (hooks/_lib.mjs commandView): the bare name in any
// executable segment, with a writer program, a redirect or a subshell anywhere in the command, denies. A
// read-only command (grep, cat, git log …) or a mention inside a sink's quote (gh … --body "…") does not.
const NAME = /release-approval/;
const WRITE_ANYWHERE = /(>|\b(?:tee|cp|mv|touch|install|dd|rsync|ln)\b|\bsed\s+-i\b|\$\(|`|\s-(?:delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)\b)/;
const READ_ONLY = /^\s*(?:grep|rg|ag|cat|less|head|tail|wc|find|ls|stat|diff|git\s+(?:log|show|diff|status|blame|ls-files))\b/;

// These rules are pure string rules about `.cycle` paths: they never needed to know which repository they are
// in. Asking would hand the agent a one-token bypass (`cd /tmp && …`) for the one hook whose whole job is that
// the agent cannot switch the gates off. They run on every payload, gated session or not.
export function run(input) {
  const ti = input?.tool_input || {};
  const path = String(ti.file_path || "").replace(/\\/g, "/");
  const cmd = String(ti.command || "").toLowerCase();

  if (guardedWrite(ti.file_path)) return { block: APPROVAL_MSG };

  if (cmd) {
    const view = process.env.CYCLE_GATE_LEGACY === "1" ? null : viewFor(cmd);
    const segs = !view || view.fallback || !view.segments.length ? [{ text: cmd }] : view.segments;
    const exec = segs.map(s => s.text).join("\n");
    const inExec = NAME.test(exec);
    const inRemoved = !!view && view.removed.some(r => NAME.test(r.text));   // a quoted path is still a path
    const writes = WRITE_ANYWHERE.test(exec);
    const allReadOnly = segs.every(s => READ_ONLY.test(s.text)) && !writes;
    if (inExec && !allReadOnly) return { block: APPROVAL_MSG };             // the name runs, and something can write
    if (inRemoved && writes) return { block: APPROVAL_MSG };
    const execN = exec.replace(/\/{2,}/g, "/").replace(/\/\.(?=\/)/g, "");      // .git//cycle and .git/./cycle are .git/cycle
    if ((GIT_CYCLE_DIR.test(exec) || GIT_CYCLE_DIR.test(execN)) && !allReadOnly) return { block: APPROVAL_MSG };   // mv/ln/cp/rm of the shared folder, any spelling that names it                 // the name is quoted, but a redirect/writer/subshell is there
  }

  // rm -r … .cycle  ·  rm -rf ./.cycle/  ·  mv .cycle …  ·  rm .cycle/config.json | gate.json
  if (/\brm\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\b(mv|rmdir)\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\brm\b[^;&|]*\.cycle\/(gate|config)\.json/.test(cmd)) return { block: REMOVE_MSG };

  return { block: null };
}

if (isMain(import.meta.url)) main(run);
