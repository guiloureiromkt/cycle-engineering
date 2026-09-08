// cycle-engineering · protect-cycle (PreToolUse on Write|Edit|MultiEdit|Bash).
// The agent neither fabricates a release approval nor switches the gates off.
import { cycleOn, isMain, main } from "./_lib.mjs";

const APPROVAL_MSG = "cycle · PROTECTED: .cycle/release-approval is written by a human outside the agent. Ask the user to create it; do not write it.";
const REMOVE_MSG = "cycle · PROTECTED: removing .cycle/ or its config disables the gates. Only the user does that, by hand, to opt out.";

export function run(input) {
  if (!cycleOn()) return { block: null };
  const ti = input?.tool_input || {};
  const path = String(ti.file_path || "").replace(/\\/g, "/");
  const cmd = String(ti.command || "").toLowerCase();

  if (/(^|\/)\.cycle\/release-approval$/.test(path)) return { block: APPROVAL_MSG };
  if (/release-approval/.test(cmd) && /(>|>>|\b(tee|cp|mv|echo|printf|touch)\b)/.test(cmd)) return { block: APPROVAL_MSG };

  // rm -r … .cycle  ·  rm -rf ./.cycle/  ·  mv .cycle …  ·  rm .cycle/config.json | gate.json
  if (/\brm\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\b(mv|rmdir)\s+(-\S+\s+)*(\S*\/)?\.cycle\/?(\s|$|[;&|)])/.test(cmd)) return { block: REMOVE_MSG };
  if (/\brm\b[^;&|]*\.cycle\/(gate|config)\.json/.test(cmd)) return { block: REMOVE_MSG };

  return { block: null };
}

if (isMain(import.meta.url)) main(run);
