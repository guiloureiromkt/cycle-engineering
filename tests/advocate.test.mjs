// cycle-engineering · the advocate's gate: what gate 2 must do with the advocate's return.
// Deterministic: it reads files only. The agent definition itself is NOT changed by the calibration (see
// .cycle/work/2026-10-17-the-advocate-is-calibrated/green.md: neither edit of the agent body beat the original).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repo, p), "utf8");
const AGENT = "agents/devils-advocate.md";
const SKILL = "skills/plan/SKILL.md";
const gate = (n) => read(SKILL).split("\n").find(l => l.includes("**Gate " + n + " ·"));

test("advocate: the five questions and the 'no flaw found' closing are what the plan gate relies on", () => {
  const a = read(AGENT);
  for (const q of ["The premise that, if it falls", "What the plan pretends does not exist", "The riskiest step",
    "What the plan discarded without saying", "money, permission, schema, destructive data or a user screen"])
    assert.ok(a.includes(q), q);
  assert.match(a, /no flaw found/);
});

test("plan gate 2: the request carries paths and not the shape of the answer", () => {
  const g2 = gate(2);
  assert.ok(g2, "gate 2 line");
  assert.match(g2, /nothing about the shape of the answer/);
  assert.match(g2, /omit `model`/);
});

test("plan gate 2: the raw return is saved verbatim and inherits the plan's confidentiality", () => {
  const g2 = gate(2);
  assert.match(g2, /\.cycle\/work\/<intent>\/advocate-<round>\.md/);
  assert.match(g2, /verbatim/);
  assert.match(g2, /confidential/);
});

test("plan gate 2: one row per finding, the session names where the plan changes, a rewrite deletes no row, 'no flaw found' is kept", () => {
  const g2 = gate(2);
  assert.match(g2, /one row each/);
  assert.match(g2, /→ changes:/);
  assert.match(g2, /a rewrite does not delete one/);
  assert.match(g2, /"no flaw found"/);
  assert.doesNotMatch(g2, /Advocate noted/);
});

test("plan gate 2 and step 8: the ledger is written under the table and its last field is filled before acceptance", () => {
  assert.match(gate(2), /Advocate ledger \(raw-return measure\)/);
  assert.match(read(SKILL), /8\. \*\*Acceptance\.\*\*[^\n]*ledger/);
});

test("plan template: the ledger line sits under the Risks table", () => {
  assert.match(read("templates/plan.md"), /\n\|---[^\n]*\n\n?Advocate ledger[\s\S]*## Signposts/);
});
