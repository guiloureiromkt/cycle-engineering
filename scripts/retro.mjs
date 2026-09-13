#!/usr/bin/env node
// cycle-engineering · the retro a closed cycle writes about itself.
//
// Every number here comes from git and from the cycle's own artifacts — never from the session's
// account of what it did, which is the whole point (a session grading its own work grades it kindly).
// The definitions were measured by hand on this repo's two closed cycles before this file existed:
// evals/results/2026-09-13-retro-metrics.md. Three of them failed the obvious definition there.
//
//   node scripts/retro.mjs <intent>     writes .cycle/work/<intent>/retro.md and prints the numbers
//   node scripts/retro.mjs <intent> --print   prints without writing
//   node scripts/retro.mjs --repeats    findings that appear in two or more retros (R11)

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MACHINE = "<!-- cycle:retro:machine -->";
const PROSE = "<!-- cycle:retro:prose -->";
const CODE = ["skills", "agents", "hooks", "scripts", "templates", "commands", "evals", "tests"];
const STAGES = [["intent", "intent"], ["research", "research"], ["spec", "specs"], ["plan", "plans"]];

const git = (...args) => {
  try { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
  catch { return ""; }
};
const fail = (msg) => { console.error(`✗ retro: ${msg}`); process.exit(1); };

// ─── artifacts ──────────────────────────────────────────────────────────────────
// A stage names its file its own way: the intent is intent/2026-09-12-<name>.md while the plan is
// plans/<name>.md. Match on the name, not on a path the author had to guess.
function artifact(dir, name) {
  const find = (n) => git("ls-files", `${dir}/*${n}*.md`).split("\n").filter(Boolean);
  let files = find(name);
  // The same cycle is dated differently per stage: the intent written on the 12th, the plan on the
  // 13th. A leading date is a filing convention, not part of the name — drop it and look again.
  if (!files.length && /^\d{4}-\d{2}-\d{2}-/.test(name)) files = find(name.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
  return files.length === 1 ? files[0] : files.sort((a, b) => a.length - b.length)[0] || null;
}

/** The commit that created the file, and the one that first set its status to accepted/approved/done. */
function history(path) {
  const first = git("log", "--reverse", "--format=%h %at", "--", path).split("\n").filter(Boolean)[0];
  if (!first) return null;
  const [created, at] = first.split(" ");
  let accepted = null;
  const log = git("log", "--reverse", "--format=%x00%h %at", "-p", "--", path);
  for (const chunk of log.split("\0").slice(1)) {
    const [head, ...rest] = chunk.split("\n");
    if (rest.some((l) => /^\+status:\s*(accepted|approved|done)\b/.test(l))) {
      const [h, t] = head.split(" ");
      accepted = { commit: h, at: +t };
      break;
    }
  }
  return { path, created, at: +at, accepted };
}

// ─── sections of the plan ───────────────────────────────────────────────────────
/**
 * Lines of EVERY section whose heading matches, each stopping at the next ## or ### (never only ##).
 * Plans written months apart carry the same heading more than once — one per release, in this repo's
 * own plan — and taking only the first reported "not computable" over 17 recorded deviations.
 */
function sections(body, re) {
  const lines = body.split("\n");
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^#{2,3} /.test(lines[i]) || !re.test(lines[i])) continue;
    const rest = lines.slice(i + 1);
    const end = rest.findIndex((l) => /^#{2,3} /.test(l));
    found.push(end === -1 ? rest : rest.slice(0, end));
  }
  return found.length ? found : null;
}
/** The first matching section, for readers that want one block (the findings scan). */
function section(body, re) {
  const all = sections(body, re);
  return all ? all[0] : null;
}

const isItem = (l) => /^\s*(\d+\.|[-*])\s+/.test(l) && !/^\s*[-*]\s+\[[ xX]\]/.test(l);

/** Count list items; a section that is prose, or missing, says so instead of counting 0. */
function countItems(body, re, what) {
  const all = sections(body, re);
  if (!all) return { value: null, why: `no ${what} section in the plan` };
  const items = all.reduce((n, lines) => n + lines.filter(isItem).length, 0);
  if (items === 0 && all.some((lines) => lines.some((l) => l.trim() && !/^[|#]/.test(l)))) {
    return { value: null, why: "the section is prose, not a list" };
  }
  return { value: items, note: all.length > 1 ? `${all.length} sections` : undefined };
}

/** Table rows that are findings: not the header, not the |---| separator. */
function countRows(body, re, what) {
  const lines = section(body, re);
  if (!lines) return { value: null, why: `no ${what} section in the plan` };
  const rows = lines.filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]*\|?\s*$/.test(l));
  return { value: Math.max(rows.length - 1, 0) }; // the first row is the header
}

const show = (m) => (m.value === null ? `not computable (${m.why})` : m.note ? `${m.value} (${m.note})` : String(m.value));

// ─── the cycle ──────────────────────────────────────────────────────────────────
function measure(name) {
  const found = {};
  for (const [stage, dir] of STAGES) {
    const p = artifact(dir, name);
    found[stage] = p ? history(p) : null;
  }
  if (!Object.values(found).some(Boolean)) fail(`no artifact matches "${name}" in intent/, research/, specs/ or plans/.`);

  // Build starts at the first commit touching code after the plan was accepted — code cannot
  // legitimately precede acceptance, and without that anchor the first code commit of the whole
  // repository wins, which is what the hand measurement caught.
  const planAccepted = found.plan?.accepted?.commit;
  let build = null;
  if (planAccepted) {
    const line = git("log", "--reverse", "--format=%h %at", `${planAccepted}..HEAD`, "--", ...CODE).split("\n").filter(Boolean)[0];
    if (line) build = { created: line.split(" ")[0], at: +line.split(" ")[1], accepted: null };
  }

  const seq = [["intent", found.intent], ["research", found.research], ["spec", found.spec], ["plan", found.plan], ["build", build]];
  const gaps = [];
  for (let i = 0; i < seq.length - 1; i++) {
    const [aName, a] = seq[i], [bName, b] = seq[i + 1];
    if (!a || !b) { gaps.push(`${aName} → ${bName}: not computable (no ${!a ? aName : bName} artifact)`); continue; }
    // The handoff is the previous stage's acceptance when it has one: an intent created in a batch
    // of three does not start its cycle when it is written, but when its turn comes.
    const from = a.accepted?.at ?? a.at;
    const minutes = Math.round((b.at - from) / 60);
    if (a.created === b.created || minutes <= 0) gaps.push(`${aName} → ${bName}: overlap (${b.created})`);
    else gaps.push(`${aName} → ${bName}: ${minutes} min`);
  }

  const planBody = found.plan ? readFileSync(found.plan.path, "utf8") : "";
  const deviations = found.plan ? countItems(planBody, /deviations/i, "deviations") : { value: null, why: "no plan artifact" };
  const council = found.plan ? countItems(planBody, /council demands/i, "council demands") : { value: null, why: "no plan artifact" };
  const risks = found.plan ? countRows(planBody, /^#{2,3} Risks\b/i, "risks") : { value: null, why: "no plan artifact" };
  const verifier = found.plan ? countItems(planBody, /verifier/i, "verifier") : { value: null, why: "no plan artifact" };

  let amendments;
  if (!found.spec) amendments = { value: null, why: `no specs/ artifact matching "${name}"` };
  else if (!planAccepted) amendments = { value: null, why: "the plan has no acceptance commit" };
  else {
    const n = git("log", "--format=%h", `${planAccepted}..HEAD`, "--", found.spec.path).split("\n").filter(Boolean).length;
    amendments = { value: n };
  }

  return { name, gaps, deviations, council, risks, verifier, amendments, found, build };
}

function render(m) {
  const lines = [
    `cycle: ${m.name}`,
    `stages:      ${m.gaps.join(" · ")}`,
    `deviations:  ${show(m.deviations)}`,
    `spec amendments after acceptance: ${show(m.amendments)}`,
    `council demands: ${show(m.council)} · risks: ${show(m.risks)} · verifier findings: ${show(m.verifier)}`,
  ];
  return lines.join("\n");
}

// ─── findings across retros (R11) ───────────────────────────────────────────────
function repeats(root) {
  const base = join(root, ".cycle", "work");
  if (!existsSync(base)) fail("no .cycle/work/ directory: no retro has been written in this repository.");
  const seen = new Map();
  for (const dir of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const file = join(base, dir.name, "retro.md");
    if (!existsSync(file)) continue;
    const body = readFileSync(file, "utf8");
    const lines = section(body, /findings/i) || [];
    for (const l of lines.filter(isItem)) {
      const text = l.replace(/^\s*(\d+\.|[-*])\s+/, "").trim();
      const key = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, { text, where: [] });
      seen.get(key).where.push(dir.name);
    }
  }
  const twice = [...seen.values()].filter((f) => new Set(f.where).size >= 2);
  if (!twice.length) { console.log("no finding appears in two or more retros yet."); return; }
  console.log("Findings seen in two or more retros — candidates for the method repo's CLAUDE.md,\nas a branch, never committed to main by an agent (R11):\n");
  for (const f of twice) console.log(`- ${f.text}\n    seen in: ${[...new Set(f.where)].join(", ")}`);
}

// ─── main ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const root = git("rev-parse", "--show-toplevel") || process.cwd();
if (args.includes("--repeats")) { repeats(root); process.exit(0); }

const name = args.find((a) => !a.startsWith("--"));
if (!name) fail("usage: retro.mjs <intent> [--print] | --repeats");

const m = measure(name);
const numbers = render(m);
console.log(numbers);

if (!args.includes("--print")) {
  const dir = join(root, ".cycle", "work", name);
  const file = join(dir, "retro.md");
  let prose = `\n## What the numbers say\n(one paragraph, written by whoever closed the cycle)\n\n## Findings\n- \n`;
  if (existsSync(file)) {
    const old = readFileSync(file, "utf8");
    const i = old.indexOf(PROSE);
    if (i !== -1) prose = old.slice(i + PROSE.length);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `# Retro · ${name}\n\n${MACHINE}\n\`\`\`\n${numbers}\n\`\`\`\nThe numbers above come from git and the artifacts, not from the session. Everything below is written by a person or by the session, and is labelled as such.\n\n${PROSE}${prose}`);
  console.log(`\n→ ${file.replace(root + "/", "")}`);
}
