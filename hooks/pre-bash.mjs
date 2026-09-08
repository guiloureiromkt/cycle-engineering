// cycle-engineering · dispatcher (PreToolUse on Bash): one node process runs the three Bash gates in sequence.
import { readStdinJson, runSafe, block } from "./_lib.mjs";
import { run as productionGate } from "./production-gate.mjs";
import { run as planSync } from "./plan-sync.mjs";
import { run as snapshotGuard } from "./snapshot-guard.mjs";

const input = readStdinJson();
for (const gate of [productionGate, planSync, snapshotGuard]) {
  const r = runSafe(gate, input);
  if (r.block) block(r.block);
}
process.exit(0);
