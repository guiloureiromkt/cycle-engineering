// cycle-engineering · the diagnosis (0.10.0): one list of stakes, the kinds, sizes and paths the skill names, the intent's
// keys, and the router and downstream skills that read the size. Deterministic: it reads files only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repo, p), "utf8");
const row = (id) => new RegExp("^\\| `" + id + "` \\|", "m");
const STAKE_IDS = ["money", "outside", "permission", "irreversible"];
const STAKES = "skills/diagnosis/references/stakes.md";
const walk = (d) => readdirSync(join(repo, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".md") ? [join(d, e.name)] : []);

test("diagnosis: the skill exists and its description reaches requests that are not code", () => {
  const s = read("skills/diagnosis/SKILL.md");
  assert.match(s, /^---\nname: diagnosis\ndescription: .+\n---/);
  assert.match(s.split("\n")[2], /code or not/);
});

test("diagnosis: the stakes table exists once, in stakes.md, with its four ids and what it does not cover", () => {
  const f = read(STAKES);
  for (const id of STAKE_IDS) assert.match(f, row(id), id);
  assert.match(f, /gate\.json/);
  assert.match(f, /do not cover/);
  const elsewhere = walk("skills").filter(p => p !== STAKES && row("money").test(read(p)));
  assert.deepEqual(elsewhere, [], "the stakes table is written only in stakes.md");
});

test("diagnosis: it names the kinds, sizes and paths it writes, and its exits", () => {
  const s = read("skills/diagnosis/SKILL.md");
  for (const id of ["objective", "problem", "desire", "intention", "quick", "small", "project", "known", "someone-knows", "nobody-knows", "split"]) assert.match(s, row(id), id);
  assert.match(s, /changes nothing: answer it/);
  assert.match(s, /are never translated/);
  assert.match(s, /"Não sei" never stops the work/);
  assert.match(s, /A stake found during the work/);
});

test("diagnosis: it cites the one stakes file, and the file exists", () => {
  assert.ok(existsSync(join(repo, STAKES)));
  assert.match(read("skills/diagnosis/SKILL.md"), /references\/stakes\.md/);
});

test("diagnosis: the templates and the contract carry the keys, the sentence quoted", () => {
  const t = read("templates/intent.md").split("---")[1];
  const c = read("docs/CONTRACT.md");
  for (const k of ["request", "size", "path", "stakes", "size_sentence"]) {
    assert.match(t, new RegExp("^" + k + ":", "m"), `template: ${k}`);
    assert.match(c, new RegExp("`" + k + "`"), `contract: ${k}`);
  }
  assert.match(t, /^size_sentence: "/m);
  assert.match(t, /^stakes: \[\]/m);
  assert.match(read("templates/plan.md").split("---")[1], /^size:/m);
  assert.match(c, /Skills \(own, 11\): .*`cycle:diagnosis`/);
});

test("diagnosis: the intent opens with it through the Skill tool, asks less at small, closes with its sentence", () => {
  const i = read("skills/intent/SKILL.md");
  assert.match(i, /REQUIRED SUB-SKILL: `cycle:diagnosis`, with the Skill tool/);
  assert.match(i, /At `small`, one round/);
  assert.match(i, /size_sentence/);
  assert.match(i, /At `quick`/);
});

test("diagnosis: the router reaches work that is not code, lets questions and routines through, and carries the sizes", () => {
  const u = read("skills/using-cycle/SKILL.md");
  const desc = u.split("\n")[2];
  assert.doesNotMatch(desc, /about to edit code, add a feature, fix a bug/);
  assert.match(desc, /code or not/);
  assert.doesNotMatch(desc, /routine/);
  for (const z of ["quick", "small", "project"]) assert.match(u, new RegExp("^\\| \\*\\*" + z + "\\*\\* \\|", "m"), z);
  assert.match(u, /no `size:`/);
  assert.match(u, /defined in `cycle:diagnosis`/);
  assert.match(u, /diagnosis\/references\/stakes\.md/);
  const hook = read("hooks/session-start.mjs");
  assert.match(hook, /before starting work that builds or changes something, code or not/);
  assert.match(hook, /A question that changes nothing needs no routing/);
  const block = read("templates/claude-md-block.md");
  assert.match(block, /Before starting work that builds or changes something, code or not, invoke `cycle:using-cycle`/);
  assert.match(block, /skips `cycle:using-cycle`/);
  assert.match(read("commands/triage.md"), /quick, small or project/);
  assert.doesNotMatch(read("skills/build/SKILL.md"), /uses the shortcut in/);
});

test("diagnosis: research, spec and plan read the size; a stake brings the council; the shortcut sentences are gone", () => {
  const r = read("skills/research/SKILL.md");
  assert.match(r, /`quick` runs no research/);
  assert.doesNotMatch(r, /The shortcut of `cycle:using-cycle` is the only way/);
  const s = read("skills/spec/SKILL.md");
  assert.match(s, /^## By size/m);
  assert.doesNotMatch(s, /The only spec-less path is the router's shortcut/);
  const p = read("skills/plan/SKILL.md");
  assert.match(p, /At `size: quick`/);
  assert.match(p, /a stake .*brings the council, without asking/i);
  assert.match(p, /diagnosis\/references\/stakes\.md/);
  assert.match(p, /Never give a size to a plan whose intent has none/);
  assert.doesNotMatch(read("README.md"), /The only skip is the router's shortcut/);
});

test("diagnosis: the gates table exists since slice 7 (0.11.0); an artifact with no size keeps the five gates", () => {
  assert.match(read("skills/plan/SKILL.md"), /^## Gates by size/m);
  assert.match(read("skills/plan/SKILL.md"), /no `size:`, or with S, M, L, runs the five gates below, as before/);
});

test("diagnosis: the router never sizes, and a plan-looking file outside plans/ goes to the intent (0019 and 0002 GREEN runs, 2026-10-17)", () => {
  const u = read("skills/using-cycle/SKILL.md");
  assert.match(u, /\*\*The router never sizes\.\*\*/);
  assert.match(u, /^\| A plan-looking file outside `plans\/`.*\| `cycle:intent`/m);
  assert.match(u, /^\| "It's quick, I'll just do it" \|/m);
});

test("diagnosis: fix pass after the verifier — one council rule, honest skip sentences, quick runs no interview, build only with an accepted plan", () => {
  const p = read("skills/plan/SKILL.md");
  assert.match(p, /A diagnosis stake skips the question/);
  const u = read("skills/using-cycle/SKILL.md");
  assert.doesNotMatch(u, /`quick` is the only way to skip research and spec/);
  assert.doesNotMatch(read("skills/research/SKILL.md"), /is the only way to skip this stage entirely/);
  const i = read("skills/intent/SKILL.md");
  assert.match(i, /At `quick`, Steps 1, 2 and 4 do not run/);
  assert.match(i, /`spec: skipped · quick`/);
  assert.match(p, /a skipped spec or research is named as skipped/);
  for (const f of ["skills/using-cycle/SKILL.md", "hooks/session-start.mjs"]) {
    assert.doesNotMatch(read(f), /may be "go straight to build"(?!, only when)/, f);
  }
  assert.match(read("skills/diagnosis/SKILL.md"), /the method's own nouns/);
});

test("diagnosis: at quick the intent and the plan are saved as files before asking, and the message ends on a question (0019 rerun, 2026-10-17)", () => {
  const i = read("skills/intent/SKILL.md");
  assert.match(i, /save `intent\/<x>\.md` and the ten-line `plans\/<x>\.md` as files/);
  assert.match(i, /ends on one question that asks for the word/);
});

test("diagnosis: at quick the files are saved with the file-writing tool, not a shell command (0019 second rerun, 2026-10-17)", () => {
  assert.match(read("skills/intent/SKILL.md"), /with the file-writing tool \(Write\), not a shell command/);
});
