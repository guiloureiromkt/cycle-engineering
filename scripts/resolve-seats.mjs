#!/usr/bin/env node
// Turns a plan + .cycle/council.json (or the plugin template) into the council's seat list. Prints JSON.
// Usage: node scripts/resolve-seats.mjs plans/<x>.md [--extra marketing,legal] [--cwd <repo>]
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flagVal = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const planPath = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
const cwd = flagVal('--cwd') ?? process.cwd();
const extra = (flagVal('--extra') ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (!planPath) { console.error('usage: resolve-seats.mjs plans/<x>.md [--extra a,b] [--cwd repo]'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const local = join(cwd, '.cycle', 'council.json');
const source = existsSync(local) ? 'repo' : 'template';
const templatePath = join(here, '..', 'templates', 'council.json');
const council = JSON.parse(readFileSync(source === 'repo' ? local : templatePath, 'utf8'));

/**
 * The plan's SUBJECT: what the work touches — the Goal line (with its wrapped continuation) and the
 * bodies of "Files that change" and "Proof". Everything else in a plan quotes the world: the risks table
 * says "table", the template says "tracking", a file path says "contract". Matching those seated 102
 * pool reviewers across 19 plan files on 2026-09-20, almost none of them about the plan.
 * Fenced blocks and code spans go (an example is not a subject); a URL goes whole (a citation is not a
 * subject); a path is split into its segments and its file name dropped, so `src/checkout/` contributes
 * `checkout` — a path segment IS a subject, which is how CODEOWNERS assigns reviewers; whitespace is
 * collapsed so a two-word trigger survives a line wrap.
 * Falling back is keyed on neither subject heading being FOUND, not on the extract being empty: a plan
 * with a Goal line and an older "## Bar for done" heading would otherwise resolve on one sentence,
 * silently. A fence opened at column zero and never closed skips the rest of the file, so it is reported.
 */
function subject(md) {
  const out = []; let keep = false, fence = false, goal = false, sawSection = false;
  for (const l of md.split('\n')) {
    if (/^(```|~~~)/.test(l)) { fence = !fence; continue; }       // column 0 only: an indented fence is content
    if (fence) continue;                                           // never interpret a heading inside an example
    if (/^## /.test(l)) { goal = false; keep = /^## (Files that change|Proof)\b/.test(l); if (keep) sawSection = true; continue; }
    if (/^\s*(?:[-*]\s+)?\*\*Goal\*?\*?:/.test(l)) { out.push(l); goal = true; continue; }
    if (goal) { if (l.trim()) out.push(l); else goal = false; continue; }   // a Goal that wrapped is still the Goal
    if (keep) out.push(l);
  }
  if (!sawSection) return { text: md.toLowerCase().replace(/\s+/g, ' '), whole: true, unclosedFence: fence };
  const text = out.join('\n')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\b\S+\.(md|json|mjs|js|ts|yaml|yml|sh|txt|py)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { text, whole: false, unclosedFence: fence };
}

const { text, whole, unclosedFence } = subject(readFileSync(join(cwd, planPath), 'utf8'));
if (args.includes('--print-subject')) { console.log(text); process.exit(0); }
const cap = council.cap ?? 9;

// /cycle:init never overwrites an existing council.json, so a repo that adopted the cycle before a seat was
// added keeps its old bench forever unless someone says so. Say so — on stderr for a person, in the JSON
// for an unattended caller that only reads stdout.
// Order is pinned and tested: what the repo is missing, then how it diverged, then how the plan was read.
// Three warnings written independently push to one array and one stream; without an order they compose
// by accident and a reader cannot tell which one changed.
const warnings = [];
const warn = (w) => { warnings.push(w); console.error(`resolve-seats: ${w}`); };
if (source === 'repo') {
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));
  const missing = template.seats.map(s => s.id).filter(id => !council.seats.some(s => s.id === id));
  if (missing.length) warn(`council.json in this repo predates seats: ${missing.join(', ')}. Copy them from templates/council.json or re-run /cycle:init (it never overwrites an existing council.json).`);
  // A repo that removed, renamed or re-tuned a pool seat is REPORTED, never dereferenced: an adopter who
  // diverged on purpose must not lose gate 4 to a crash. /cycle:init never overwrites council.json, so
  // shipping new triggers in the template reaches nobody who already adopted unless they are told.
  const drifted = new Set();
  for (const t of template.pool) {
    const mine = council.pool.find(p => p.id === t.id);
    if (!mine || JSON.stringify(mine.triggers) !== JSON.stringify(t.triggers)) drifted.add(t.id);
  }
  for (const p of council.pool) if (!template.pool.some(t => t.id === p.id)) drifted.add(p.id);
  if (drifted.size) warn(`council.json in this repo has pool triggers that differ from the template for: ${[...drifted].join(', ')}. If that is not deliberate, copy the pool from templates/council.json.`);
}
if (whole) {
  warn(unclosedFence
    ? `${planPath} opened a code fence at column zero and never closed it, so no subject heading was reached and triggers were matched against its whole text. Close the fence.`
    : `${planPath} has no "Files that change" and no "Proof" heading, so triggers were matched against its whole text — the noisy matching this replaced. Add the headings, or expect seats with nothing to say.`);
} else if (unclosedFence) {
  warn(`${planPath} opened a code fence at column zero and never closed it: everything after it was skipped, so the subject may be incomplete. Close the fence.`);
} else if (text.length < 80) {
  warn(`${planPath} has a subject of ${text.length} characters. Goal, "Files that change" and "Proof" are what the seats are matched against; a near-empty subject seats nobody for a reason nobody intended.`);
}

const seats = council.seats.filter(s => s.always).map(s => ({ ...s, why: 'always' }));
const lit = [];
for (const p of council.pool) {
  if (extra.includes(p.id)) { lit.unshift({ ...p, why: 'named by the owner' }); continue; }   // owner's seats go first
  const hit = p.triggers.find(t => new RegExp('\\b' + t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text));   // whole words: 'plan' must not match 'planning', 'form' must not match 'format'
  if (hit) lit.push({ ...p, why: `trigger "${hit}"` });
}
const dropped = [];
for (const p of lit) {
  if (seats.length < cap) seats.push(p);
  else dropped.push({ id: p.id, reason: `cap ${cap} reached (pool order); sits in a second dispatch only if the owner asks, or name it with --extra` });
}
const tokensPerLine = 40;
const seatLines = seats.reduce((n, s) => n + (Number(s.lines) || 5), 0);   // a seat may carry its own line budget (default 5)
const jokerOn = council.joker?.enabled !== false;
const cost_hint = `≈ ${seats.length} seats, ${seatLines} lines + scenario 25 lines${jokerOn ? ' + Mule 8 lines' : ''} ≈ ${(seatLines + 25 + (jokerOn ? 8 : 0)) * tokensPerLine} output tokens on models.council${jokerOn ? '/models.joker' : ''}`;
const out = {
  source, cap,
  seats: seats.map(({ id, brief, knowledge = null, skill = null, why, lines }) => ({ id, brief, knowledge, skill, why, ...(lines ? { lines } : {}) })),
  dropped, warnings, scenario: true, joker: jokerOn,
  horizons: council.scenarios?.horizons ?? [], futures_per_horizon: council.scenarios?.futures_per_horizon ?? '2-3, unweighted, each with driver, weak signal and inversion', domains: council.joker?.domains ?? [],
  summary: `council: ${seats.length} seats — ${seats.map(s => s.id).join(', ')}${dropped.length ? ` (dropped: ${dropped.map(d => d.id).join(', ')})` : ''}; scenario seat; Mule ${jokerOn ? 'on' : 'off'}`,
  cost_hint,
};
console.log(JSON.stringify(out, null, 2));
