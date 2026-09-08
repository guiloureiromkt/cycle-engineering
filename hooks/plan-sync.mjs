// cycle-engineering · plan-sync (PreToolUse on Bash, only for `git commit`; dispatched by pre-bash.mjs).
// Rule 2 of cycle:build: if the implementation left the plan, the plan changes in the same commit.
import { execSync } from "node:child_process";
import { root, hasAcceptedPlan, cycleOn, isMain, main } from "./_lib.mjs";

export function run(input) {
  const cmd = String(input?.tool_input?.command || "");
  if (!/\bgit\s+commit\b/.test(cmd) || !cycleOn()) return { block: null };
  if (!hasAcceptedPlan()) return { block: null };
  if (/plan: unchanged|\[plan-ok\]/i.test(cmd)) return { block: null };

  let staged = "";
  try { staged = execSync("git diff --cached --name-only", { cwd: root(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return { block: null }; }                   // git missing or not a repo → allow
  const files = staged.split("\n").filter(Boolean);
  if (!files.length || files.some(f => f.startsWith("plans/"))) return { block: null };
  const code = files.filter(f => !/^(intent|specs|plans|evals|docs)\/|\.md$|^\.cycle\//.test(f));
  if (!code.length) return { block: null };

  return { block: `cycle · PLAN-SYNC: this commit changes code (${code.slice(0, 3).join(", ")}${code.length > 3 ? "…" : ""}) and an accepted plan exists, but no plans/ file is staged.
If the implementation departed from the plan, edit plans/<x>.md and stage it.
If the plan is still exact, say so in the commit message: "... (plan: unchanged)".` };
}

if (isMain(import.meta.url)) main(run);
