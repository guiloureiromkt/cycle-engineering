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
const council = JSON.parse(readFileSync(source === 'repo' ? local : join(here, '..', 'templates', 'council.json'), 'utf8'));
const text = readFileSync(join(cwd, planPath), 'utf8').toLowerCase();
const cap = council.cap ?? 9;

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
const linesPerSeat = 5, tokensPerLine = 40;
const jokerOn = council.joker?.enabled !== false;
const cost_hint = `≈ ${seats.length} seats × ${linesPerSeat} lines + scenario 25 lines${jokerOn ? ' + Mule 8 lines' : ''} ≈ ${(seats.length * linesPerSeat + 25 + (jokerOn ? 8 : 0)) * tokensPerLine} output tokens on models.council${jokerOn ? '/models.joker' : ''}`;
const out = {
  source, cap,
  seats: seats.map(({ id, brief, knowledge = null, skill = null, why }) => ({ id, brief, knowledge, skill, why })),
  dropped, scenario: true, joker: jokerOn,
  horizons: council.scenarios?.horizons ?? [], futures_per_horizon: council.scenarios?.futures_per_horizon ?? '2-3, unweighted, each with driver, weak signal and inversion', domains: council.joker?.domains ?? [],
  summary: `council: ${seats.length} seats — ${seats.map(s => s.id).join(', ')}${dropped.length ? ` (dropped: ${dropped.map(d => d.id).join(', ')})` : ''}; scenario seat; Mule ${jokerOn ? 'on' : 'off'}`,
  cost_hint,
};
console.log(JSON.stringify(out, null, 2));
