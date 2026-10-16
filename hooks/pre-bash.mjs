// cycle-engineering · dispatcher (PreToolUse on Bash): one node process runs the three Bash gates in sequence.
// Three outcomes since 2026-10-16: a block wins and exits 2; otherwise the first ask is printed as the host's
// PreToolUse JSON (or becomes a deny when nobody is present, see _lib.ask); otherwise exit 0.
import { readStdinJson, runSafe, block, ask } from "./_lib.mjs";
import { run as productionGate } from "./production-gate.mjs";
import { run as planSync } from "./plan-sync.mjs";
import { run as snapshotGuard } from "./snapshot-guard.mjs";

const input = readStdinJson();
let firstAsk = null;
for (const gate of [productionGate, planSync, snapshotGuard]) {
  const r = await runSafe(gate, input);
  if (r.block) block(r.block);           // deny wins; exits
  if (r.ask && !firstAsk) firstAsk = r.ask;
}
if (firstAsk) ask(firstAsk, input); else process.exit(0);
