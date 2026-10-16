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
//   node scripts/retro.mjs --repeats                              findings that appear in two or more retros (R11), this repo only
//   node scripts/retro.mjs --repeats --across [--since YYYY-MM-DD | --since-last-report]
//                                        the same over this repo AND every `products` path of .cycle/config.json,
//                                                                 with a header per repository; --since keeps retros whose last commit is on or after the date

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { lastEvolveReport } from "../hooks/_lib.mjs";

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
const tilde = (p) => p.replace(homedir(), "~");

/** Absolute path of a products entry: `~` expands, a relative path resolves against the method repo. */
function expandProduct(p, root) {
  const s = String(p);
  if (s.startsWith("~")) return join(homedir(), s.slice(1));
  return s.startsWith("/") ? s : join(root, s);
}

/** Every retro.md under <repo>/.cycle/work/<cycle>/, sorted by cycle name. */
function retrosOf(repo) {
  const base = join(repo, ".cycle", "work");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort()
    .map((cycle) => ({ repo, cycle, file: join(base, cycle, "retro.md") }))
    .filter((r) => existsSync(r.file));
}

/** The repos to read: the one we run in, plus `products` from its .cycle/config.json when --across. */
function reposToRead(root, across) {
  const repos = [root];
  const missing = [];
  if (!across) return { repos, missing };
  let cfg = {};
  try { cfg = JSON.parse(readFileSync(join(root, ".cycle", "config.json"), "utf8")); } catch { cfg = {}; }
  for (const p of Array.isArray(cfg.products) ? cfg.products : []) {
    const abs = expandProduct(p, root);
    if (!existsSync(join(abs, ".cycle", "work"))) { missing.push(abs); continue; }
    if (!repos.includes(abs)) repos.push(abs);
  }
  return { repos, missing };
}

/** YYYY-MM-DD (UTC) of the last commit touching `file` in `repo`; an uncommitted retro counts as today. */
function lastCommitDate(repo, file) {
  let at = "";
  try { at = execFileSync("git", ["-C", repo, "log", "-1", "--format=%cI", "--", file], { encoding: "utf8" }).trim(); } catch { at = ""; }
  return (at || new Date().toISOString()).slice(0, 10);
}

/** Worktrees of `repo` other than itself (`git worktree list --porcelain`); 0 when git says nothing. */
function worktreesNotRead(repo) {
  try {
    const out = execFileSync("git", ["-C", repo, "worktree", "list", "--porcelain"], { encoding: "utf8" });
    return Math.max((out.match(/^worktree /gm) || []).length - 1, 0);
  } catch { return 0; }
}

/** Sibling directories of the listed repos that have a .cycle/work/ and are not listed (counted, never read). */
function unlistedRepos(repos) {
  const parents = [...new Set(repos.map((r) => join(r, "..")))];
  const listed = new Set(repos.map((r) => r.replace(/\/+$/, "")));
  const out = [];
  for (const p of parents) {
    let names = [];
    try { names = readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(p, d.name)); } catch { continue; }
    for (const d of names) if (!listed.has(d) && existsSync(join(d, ".cycle", "work"))) out.push(d);
  }
  return out.sort();
}

function repeats(root, { across = false, since = null } = {}) {
  if (!existsSync(join(root, ".cycle", "work")) && !across) fail("no .cycle/work/ directory: no retro has been written in this repository.");
  const { repos, missing } = reposToRead(root, across);
  const seenCopy = new Map();   // `${cycle}#${hash}` → first label
  const collapsed = [];
  const seen = new Map();       // normalised finding → { text, where: [] }
  const list = [];
  const header = [];
  for (const repo of repos) {
    const label = tilde(repo);
    let read = 0, kept = 0;
    for (const r of retrosOf(repo)) {
      const body = readFileSync(r.file, "utf8");
      read++;
      if (since && lastCommitDate(repo, r.file) < since) continue;
      const key2 = `${r.cycle}#${createHash("sha256").update(body).digest("hex")}`;
      if (seenCopy.has(key2)) { collapsed.push({ dup: `${label}/${r.cycle}`, first: seenCopy.get(key2) }); continue; }
      seenCopy.set(key2, `${label}/${r.cycle}`);
      kept++;
      const lines = section(body, /findings/i) || [];
      for (const l of lines.filter(isItem)) {
        const text = l.replace(/^\s*(\d+\.|[-*])\s+/, "").trim();
        const key = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
        if (!key) continue;
        list.push({ label, cycle: r.cycle, text, key });
        if (!seen.has(key)) seen.set(key, { text, where: [] });
        seen.get(key).where.push(across ? `${label}/${r.cycle}` : r.cycle);   // --repeats alone prints cycles only, as before
      }
    }
    const findings = list.filter((f) => f.label === label).length;
    header.push({ label, read, kept, findings, worktrees: worktreesNotRead(repo) });
  }
  if (across) {
    console.log(`retros read${since ? ` since ${since}` : ""}:`);
    for (const h of header) console.log(`  ${h.label}: ${h.read} retro${h.read === 1 ? "" : "s"}${since ? `, ${h.kept} since ${since}` : ""}, ${h.findings} finding${h.findings === 1 ? "" : "s"}${h.worktrees ? `, worktrees not read: ${h.worktrees}` : ""}`);
    for (const m of missing) console.log(`  not found: ${tilde(m)} (no .cycle/work/ there; check products in .cycle/config.json)`);
    const unlisted = unlistedRepos(repos);
    if (unlisted.length) console.log(`  repos with .cycle/work not in products: ${unlisted.length} (${unlisted.map(tilde).join(", ")})`);
    if (collapsed.length) {
      console.log(`  collapsed ${collapsed.length} duplicate retro${collapsed.length > 1 ? "s" : ""} (same cycle and content, read once):`);
      for (const c of collapsed) console.log(`    ${c.dup} = ${c.first}`);
    }
    console.log("");
    for (const f of list) {
      const times = new Set(seen.get(f.key).where).size;
      console.log(`${f.label} · ${f.cycle} · ${f.text.replace(/^\*\*(.+?)\*\*/, "$1")}${times >= 2 ? `   [repeats ×${times}]` : ""}`);
    }
    console.log("");
  }
  const twice = [...seen.values()].filter((f) => new Set(f.where).size >= 2);
  if (!twice.length) { console.log("no finding appears in two or more retros yet."); return; }
  console.log("Findings seen in two or more retros — candidates for the method repo's CLAUDE.md,\nas a branch, never committed to main by an agent (R11):\n");
  for (const f of twice) console.log(`- ${f.text}\n    seen in: ${[...new Set(f.where)].join(", ")}`);
}

// ─── main ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const root = git("rev-parse", "--show-toplevel") || process.cwd();
if (args.includes("--repeats")) {
  const i = args.indexOf("--since");
  let since = i !== -1 ? args[i + 1] || null : null;
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) fail(`--since expects YYYY-MM-DD, got "${since}"`);
  if (args.includes("--since-last-report")) {
    const last = lastEvolveReport(root);
    since = last ? last.date : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  }
  repeats(root, { across: args.includes("--across"), since });
  process.exit(0);
}

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
