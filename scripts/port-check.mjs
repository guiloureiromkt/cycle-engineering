#!/usr/bin/env node
// Nothing may be lost when a JSON case retires: every accepted_if line must land either as a grader
// or as a named hand-check in case.meta.md. Counts both sides and fails on a mismatch.
//
// The JSON cases are gone from the working tree, so they are read from the last commit that had them
// (v0.4.0 by default). Reading the tree instead would make this check vacuous the moment it passed.
// Usage: node scripts/port-check.mjs [--ref v0.4.0] [--json <path>]
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const evals = join(repo, 'evals');
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : 'v0.4.0';
const sh = (cmd) => spawnSync('bash', ['-lc', cmd], { cwd: repo, encoding: 'utf8' });
const listed = sh(`git ls-tree --name-only ${ref} evals/`).stdout.split('\n').filter(f => /^evals\/\d{4}-.*\.json$/.test(f));
if (!listed.length) { console.error(`no JSON cases at ${ref}: nothing to check against (pass --ref <tag>)`); process.exit(2); }
const jsonCases = listed.map(f => f.replace('evals/', ''));
const rows = [];
let bad = 0;

for (const f of jsonCases) {
  const c = JSON.parse(sh(`git show ${ref}:evals/${f}`).stdout);
  const dir = join(evals, c.id);
  const yaml = join(dir, 'case.yaml');
  const meta = join(dir, 'case.meta.md');
  if (!existsSync(yaml) || !existsSync(meta)) {
    rows.push({ id: c.id, in: c.accepted_if.length, out: 0, note: 'case.yaml or case.meta.md missing' });
    bad++; continue;
  }
  // A ported check is one row of case.meta.md's mapping table whose left cell is not the "—" filler.
  const mapped = readFileSync(meta, 'utf8')
    .split('\n')
    .filter(l => /^\| /.test(l) && !/^\| *old check/.test(l) && !/^\|[ -]*\|/.test(l))
    .filter(l => !/^\| *— *\|/.test(l));
  const graders = (readFileSync(yaml, 'utf8').match(/^\s*- type: /gm) ?? []).length;
  const note = mapped.length === c.accepted_if.length ? '' : `MISMATCH: ${c.accepted_if.length} accepted_if vs ${mapped.length} mapped`;
  if (note) bad++;
  rows.push({ id: c.id, in: c.accepted_if.length, out: mapped.length, graders, note });
}

const w = Math.max(...rows.map(r => r.id.length), 4);
console.log(`comparing the ported cases against the JSON suite at ${ref}\n`);
console.log(`${'CASE'.padEnd(w)}  IN  MAPPED  GRADERS  NOTE`);
for (const r of rows) console.log(`${r.id.padEnd(w)}  ${String(r.in).padStart(2)}  ${String(r.out).padStart(6)}  ${String(r.graders ?? 0).padStart(7)}  ${r.note}`);
console.log(`\n${rows.length} case(s); ${bad} problem(s).`);
const out = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
if (out) writeFileSync(out, JSON.stringify(rows, null, 2));
process.exit(bad ? 1 : 0);
