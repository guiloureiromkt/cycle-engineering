// tests/slices.test.mjs · the six slices of the keystone intent. Reads files only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => (existsSync(join(repo, p)) ? readFileSync(join(repo, p), "utf8") : "");
const has = (p, ...needles) => { const t = read(p); assert.ok(t, p + " exists"); for (const n of needles) assert.ok(t.includes(n), p + " names: " + n); };
const BRIEF = "skills/using-cycle/references/master-brief.md";
const STAGES = ["diagnosis", "intent", "research", "spec", "plan", "build", "test", "deploy", "maintain", "evolve"];

test("slice 2: the Master Brief template, the protocol, the config keys and the ten stages", () => {
  has("templates/master-brief.md", "type: master-brief", "## 0 · Where we are", "## 5 · Findings", "## 8 · History", "## 9 · Handoff", "[Fact]", "[Inference]", "[Opinion]", "🟢", "Audience:");
  has(BRIEF, "master_brief", ".cycle/master-brief.md", "never blocks", "skips what it already answers", "I don't know yet", "no second brief");
  has("templates/config.json", "master_brief", "audience");
  for (const s of STAGES) has(`skills/${s}/SKILL.md`, BRIEF);
});

const MENTOR = "skills/using-cycle/references/mentor-layer.md";
test("slice 3: the mentor layer, who turns it on, the acceptance rule and the scope that explains the mechanics", () => {
  has(MENTOR, "pact", "company + number + date", "who would know?", "three beats", "never ask the person to open a terminal", "one question", "verbatim", "mentor-layer.<lang>.md", "Audience");
  for (const s of ["intent", "plan", "deploy", "diagnosis"]) has(`skills/${s}/SKILL.md`, MENTOR);
  for (const s of ["intent", "plan"]) has(`skills/${s}/SKILL.md`, "the person's own word", "you decide");
  has("skills/deploy/SKILL.md", "the line to paste");
  has("skills/diagnosis/SKILL.md", "audience");
  has("skills/spec/SKILL.md", "How this solves the purpose");
  has("templates/spec.md", "## How this solves the purpose");
});

test("slice 4: research in rounds", () => {
  has("skills/research/SKILL.md", "## Rounds", "quick runs none", "one line", "third round");
  has("templates/research.md", "## Rounds");
});

test("slice 5: how we'll know, and proof by kind", () => {
  has("templates/plan.md", "## How we'll know");
  has("skills/plan/SKILL.md", "How we'll know");
  has("skills/maintain/SKILL.md", "How we'll know");
  has("skills/test/SKILL.md", "Proof by kind");
  has("skills/deploy/SKILL.md", "out to people");
});

test("slice 6: the forjas as paths and the route key", () => {
  has("skills/diagnosis/references/paths.md", "route:", "forja", "never blocks", "master_brief");
  has("skills/diagnosis/SKILL.md", "skills/diagnosis/references/paths.md", "route");
  has("templates/intent.md", "route:");
  has("docs/CONTRACT.md", "route", "audience", "master_brief");
});

test("slice 7: gates by size, the cost rule, and the legacy path intact", () => {
  has("skills/plan/SKILL.md", "## Gates by size", "A gate costs less than the change it reviews", "only at project", "no `size:`");
  has("skills/using-cycle/SKILL.md", "advocate only when", "keeps the old path");
});
