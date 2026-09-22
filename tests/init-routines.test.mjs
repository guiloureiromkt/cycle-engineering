// cycle-engineering · the block says whom Rules 1–3 govern, and /cycle:init warns before writing where routines run.
// Baseline (RED, 2026-09-20): two users pasted the block into a workspace whose CLAUDE.md every scheduled loop reads;
// the loops read "No code edit without an accepted plan", applied it to their own outputs and stopped.
// Prose is tested by regex, the shape init-gitignore.test.mjs already uses; eval case 0017 tests the behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const BLOCK = read("templates/claude-md-block.md");
const INIT = read("commands/init.md");
const README_EN = read("README.md");
const README_PT = read("README.pt-BR.md");

// The two lines the spec adds (R1, R2). The test pins the phrases, not the whole sentences.
const GOVERNS = /govern a session that changes this repository's source/;
const EXEMPT = /routine[^\n]*needs no plan[^\n]*protected branch/;
const OLD_LINE_COUNT = 42;   // templates/claude-md-block.md before this change: wc -l said 41, split("\n") gives 42 (trailing newline), 2026-09-21

// The block's opening as it was before this change (RED baseline). Kept verbatim so the bug stays documented.
const OLD_OPENING = `## Cycle (plugin \`cycle\` · Cycle Engineering)
This repo runs the cycle: intent → research → spec → plan → build → test → deploy → maintain (→ evolve). Before editing code, invoke \`cycle:using-cycle\` with the Skill tool.
- Artifacts: \`intent/\` · \`research/\` · \`specs/\` · \`plans/\` · \`evals/\` · \`.cycle/\`.`;

test("RED baseline: the old opening never said whom the rules govern nor exempted a routine", () => {
  assert.doesNotMatch(OLD_OPENING, GOVERNS);
  assert.doesNotMatch(OLD_OPENING, EXEMPT);
  assert.doesNotMatch(OLD_OPENING, /routine/i);
});

test("R1: the block names whom the rules govern, right under the opening sentence, and keeps Rule 4 for everyone", () => {
  const lines = BLOCK.split("\n");
  const opening = lines.findIndex((l) => l.startsWith("This repo runs the cycle"));
  assert.ok(opening >= 0, "opening sentence present");
  const next = lines[opening + 1];
  assert.match(next, GOVERNS, "the sentence naming the reader is the very next line");
  assert.match(next, /Rule 4 and the deploy gate hold for every session/, "the scope does not exempt the snapshot rule or the gate");
});

test("R2: the block exempts a routine in one line that also keeps the gates and skips the router", () => {
  assert.match(BLOCK, EXEMPT);
  const line = BLOCK.split("\n").find((l) => EXEMPT.test(l));
  assert.match(line, /cron|Actions|scheduled/, "names how a routine is invoked");
  assert.match(line, /deploy/, "keeps the production gate in the same line");
  assert.match(line, /skips `cycle:using-cycle`/, "a routine does not enter the router, whose table has no routine row");
  assert.match(line, /pull request/, "says what a routine that needs main does instead");
});

test("R3: the two lines are the only growth: block = old + 2 lines, at most 70 words added, Rules 1–4 untouched", () => {
  assert.equal(BLOCK.split("\n").length, OLD_LINE_COUNT + 2, "exactly two lines were added");
  const added = BLOCK.split("\n").filter((l) => GOVERNS.test(l) || EXEMPT.test(l));
  assert.equal(added.length, 2, "exactly two added lines match the new phrases");
  const words = added.join(" ").split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 70, `added lines have ${words} words, cap is 70`);
  assert.match(BLOCK, /^- Rule 1 · No code edit without `plans\/<x>\.md` with `status: accepted` and `accepted_by`\.$/m);
  assert.match(BLOCK, /^- Rule 4 · Before any destructive command/m);
});

test("R4: init looks for routine signs before any file is written", () => {
  const steps = INIT.split("\n").filter((l) => /^\d+\. /.test(l));
  const signs = steps.findIndex((l) => /schedule:/.test(l) && /loops\//.test(l) && /rotinas\//.test(l));
  const cycleDir = steps.findIndex((l) => /\*\*`\.cycle\/`\*\*/.test(l));
  assert.ok(signs >= 0, "a numbered step names schedule:, loops/ and rotinas/");
  assert.ok(cycleDir >= 0, "the .cycle/ step still exists");
  assert.ok(signs < cycleDir, "the routine-signs step comes before the .cycle/ step");
  const numbers = steps.map((l) => Number(l.match(/^(\d+)\. /)[1]));
  assert.deepEqual(numbers, numbers.map((_, i) => i + 1), "steps are numbered 1..N contiguously after the renumbering");
});

test("R5: when a sign is found, init says where .cycle/ belongs, asks before writing, and says what silence means", () => {
  const step = INIT.split("\n").find((l) => /schedule:/.test(l) && /loops\//.test(l));
  assert.match(step, /beside/);
  assert.match(step, /Ask before writing/);
  assert.match(step, /If no sign is found, say nothing and continue/);
  assert.match(step, /holds for this init only/, "the answer is per init, not forever");
  assert.match(step, /For example: `[^`]+\/` holds the `\.cycle\/`/, "one worked example path");
});

test("R6: both READMEs say the cycle governs construction, not operation, and what a routine does about main", () => {
  assert.match(README_EN, /routine[^\n]*needs no plan/i);
  assert.match(README_EN, /beside/);
  assert.match(README_EN, /pull request/);
  assert.match(README_PT, /rotina[^\n]*não precisa de plano/i);
  assert.match(README_PT, /ao lado/);
  assert.match(README_PT, /pull request/);
});
