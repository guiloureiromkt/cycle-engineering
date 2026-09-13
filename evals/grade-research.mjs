#!/usr/bin/env node
// Machine checks on a research artifact (and on the spec → research link). Exit 0 = all pass; prints one line per check.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const file = process.argv[2];
if (!file || !existsSync(file)) { console.error('usage: node evals/grade-research.mjs research/<name>.md [specs/<name>.md]'); process.exit(2); }
const md = readFileSync(file, 'utf8');
const checks = [];
const ok = (name, cond) => checks.push([name, !!cond]);

const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
ok('frontmatter status: done', /^status:\s*done/m.test(fm));
ok('frontmatter depth is shallow|standard|deep', /^depth:\s*(shallow|standard|deep)\b/m.test(fm));
ok('first line says the depth and why', /^Depth:\s*(shallow|standard|deep)\s+because\s+\S/m.test(md));
for (const h of ['What we know', 'What the market does', 'What we assume', 'What we did not check', 'Recommendation for the spec']) ok(`heading: ${h}`, new RegExp(`^## ${h}`, 'm').test(md));

const section = (h) => md.split(new RegExp(`^## ${h}[^\n]*\n`, 'm'))[1]?.split(/^## /m)[0] ?? '';
const rows = (s) => s.split('\n').filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/^\|\s*(Finding|Product)/.test(l));
// What counts as evidence in both tables: a URL, a path, a filename, or a command run on this machine.
// `claude …` is here for the same reason `git log` is: a CLI invocation, named and dated, is a source.
const EVIDENCE = /(https?:\/\/|[\w.-]+\/[\w.-]+|\b[\w-]+\.(md|js|mjs|ts|json|py|txt|ya?ml|toml|lock|sh)\b|`(git|grep|ls|npm|node|cat|find|claude)\b[^`]*`)/;
const cells = (r) => r.split(/(?<!\\)\|/);  // an escaped pipe (\|) inside a cell is not a column separator
const know = rows(section('What we know'));
ok('what we know: at least 1 row', know.length >= 1);
ok('what we know: every row has a source with URL or path AND a date', know.every(r => { const c = cells(r)[2] ?? ''; return EVIDENCE.test(c) && /\d{4}-\d{2}-\d{2}/.test(c); }));  // a URL, a path, a filename, or a command run on the repo; never bare prose
ok('what we know: every row has a confidence', know.every(r => /🟢|🟡|🔴/.test(r)));
const depth = fm.match(/^depth:\s*(\w+)/m)?.[1];
const bench = rows(section('What the market does'));
if (depth !== 'shallow') {
  ok('benchmarks: 3 to 5 rows', bench.length >= 3 && bench.length <= 5);
  ok('benchmarks: every row has evidence (path or URL) with a date', bench.every(r => { const c = cells(r)[4] ?? ''; return EVIDENCE.test(c) && /\d{4}-\d{2}-\d{2}/.test(c); }));
  ok('benchmarks: direct and indirect both present', bench.some(r => /^\s*direct\b/i.test(cells(r)[2] ?? '')) && bench.some(r => /^\s*indirect\b/i.test(cells(r)[2] ?? '')));  // the cell may carry a qualifier: 'direct (settings page)'
}
const assumptions = section('What we assume').split('\n').filter(l => /^- /.test(l));
ok('assumptions: each has a cheap check', assumptions.length >= 1 && assumptions.every(l => /cheap check:/i.test(l)));
ok('recommendation: 1 to 5 lines', (() => { const s = section('Recommendation for the spec').trim().split('\n').filter(l => l.trim() && !l.startsWith('<!--')); return s.length >= 1 && s.length <= 5; })());

const spec = process.argv[3];
if (spec) {
  const sfm = readFileSync(spec, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const ref = sfm.match(/^research:\s*(\S+)/m)?.[1];
  const repoRoot = join(dirname(spec), '..');
  ok('spec frontmatter research: points at an existing done file', !!ref && existsSync(join(repoRoot, ref)) && /^status:\s*done/m.test((readFileSync(join(repoRoot, ref), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '')));
}

for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
process.exit(checks.every(c => c[1]) ? 0 : 1);
