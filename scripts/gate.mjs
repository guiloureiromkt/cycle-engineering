#!/usr/bin/env node
// The pre-publish gate. This repo has no pull requests to block, so the gate runs here, before a
// release leaves the machine: the unit tests, then the rule that no commit mixes a case with a
// method file, then a bounded eval run over the cases covering what actually changed.
//
//   node scripts/gate.mjs --threshold 1.0 --max-cost-usd 15 [--base <ref>] [--json <path>]
//
// The threshold and the ceiling are the owner's numbers: they are read from argv and printed,
// never computed, never adjusted by a failing run.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const threshold = Number(val('--threshold', '1.0'));
const maxCost = val('--max-cost-usd', '15');
const jsonOut = val('--json', null);
const cwd = process.cwd();
const METHOD = /^(skills|agents|hooks|scripts|templates)\//;
const CASE = /^evals\/\d{4}-/;

const sh = (cmd, opts = {}) => spawnSync('bash', ['-lc', cmd], { cwd, encoding: 'utf8', ...opts });
const git = (a) => sh(`git ${a}`).stdout.trim();
const fail = (msg, extra = {}) => { console.error(`\n✗ gate: ${msg}`); report({ ok: false, reason: msg, ...extra }); process.exit(1); };
let reported = false;
function report(o) { if (jsonOut && !reported) { reported = true; writeFileSync(jsonOut, JSON.stringify({ threshold, maxCost: Number(maxCost), ...o }, null, 2) + '\n'); } }

// 1 · Preflight: the runner must still speak the flags this gate uses.
const evalCmd = process.env.CYCLE_GATE_EVAL_CMD;   // set in unit tests; the real command otherwise
if (!evalCmd) {
  const help = sh('claude plugin eval --help').stdout;
  for (const flag of ['--scaffold', '--ablation', '--threshold', '--max-cost-usd', '--trust-plugin', '--case']) {
    if (!help.includes(flag)) fail(`claude plugin eval no longer offers ${flag} (CLI: ${sh('claude --version').stdout.trim()}). The gate's commands need updating.`);
  }
  console.log('gate: a case file from an untrusted source is never run with --trust-plugin or --scaffold before a human reads its scaffold_script.');
}

// 2 · The unit tests.
const testCmd = process.env.CYCLE_GATE_TEST_CMD ?? 'npm test';
const t = sh(testCmd, { stdio: ['ignore', 'inherit', 'inherit'] });
if (t.status !== 0) fail(`${testCmd} failed`);

// 3 · The base. Without one there is nothing to compare, and that is a failure, not a pass.
let base = val('--base', null);
if (!base) {
  const d = sh('git describe --tags --abbrev=0');
  base = d.status === 0 ? d.stdout.trim() : '';
}
if (!base) fail('no base to compare against (no --base and no tag reachable from HEAD). A gate with no base would score nothing and call it green.');

// 4 · The commit-shape rule: no commit may touch both a case and a method file.
const commits = git(`log --format=%h ${base}..HEAD`).split('\n').filter(Boolean);
const mixedCommits = [];
for (const c of commits) {
  const files = git(`show --name-only --format= ${c}`).split('\n').filter(Boolean);
  if (files.some(f => CASE.test(f)) && files.some(f => METHOD.test(f))) {
    mixedCommits.push({ commit: c, subject: git(`log -1 --format=%s ${c}`) });
  }
}
if (mixedCommits.length) {
  for (const m of mixedCommits) console.error(`  ${m.commit}  ${m.subject}`);
  fail(`${mixedCommits.length} commit(s) since ${base} mixes a case with a method file — a change may not be scored by the cases it edited. Split them.`, { base, mixedCommits });
}

// 5 · What changed, committed and working tree.
// --diff-filter=d drops deletions: a method file that no longer exists cannot be covered by
// anything, and demanding a coverage entry for it is how the gate failed its own 0.5.0 publish.
const changed = [...new Set([
  ...git(`diff --name-only --diff-filter=d ${base}..HEAD`).split('\n'),
  ...git('diff --name-only --diff-filter=d HEAD').split('\n'),
  ...git('ls-files --others --exclude-standard').split('\n'),
].filter(f => f && METHOD.test(f)))].sort();

if (!changed.length) {
  console.log(`\n✓ gate: no method file changed since ${base} (threshold ${threshold}) — nothing to score.`);
  report({ ok: true, base, changed: [], cases: [], mixedCommits, scored: false });
  process.exit(0);
}

// 6 · Coverage: which case covers which method file. An uncovered change is a failure, not a warning.
const covPath = join(cwd, 'evals', 'coverage.json');
if (!existsSync(covPath)) fail('evals/coverage.json is missing: the gate cannot know which case covers what.', { base, changed });
const coverage = JSON.parse(readFileSync(covPath, 'utf8'));
// A method file is covered three ways: by cases (an agent run), by unit tests (deterministic), or by
// declared debt — an entry that says out loud there is no case yet, and why. What is covered by
// nothing at all is a failure: the gate never goes green on a change it did not look at.
const unmapped = changed.filter(f => !coverage[f]);
if (unmapped.length) fail(`method file(s) mapped by nothing in evals/coverage.json — add a case, point at the test that covers it, or declare the debt with a reason:\n  ${unmapped.join('\n  ')}`, { base, changed, unmapped });
const debt = changed.filter(f => coverage[f]?.uncovered);
const byTests = changed.filter(f => coverage[f]?.tests);
const cases = [...new Set(changed.filter(f => Array.isArray(coverage[f])).flatMap(f => coverage[f]))].sort();
for (const f of debt) console.log(`gate: ${f} has no case — declared debt since ${coverage[f].since}: ${coverage[f].uncovered}`);
for (const f of byTests) console.log(`gate: ${f} covered deterministically by ${coverage[f].tests} (already run above)`);
if (!cases.length) {
  console.log(`\n✓ gate: ${changed.length} method file(s) changed, none of them covered by a case (${byTests.length} by tests, ${debt.length} declared debt); nothing to score at threshold ${threshold}.`);
  report({ ok: true, base, changed, cases: [], debt, byTests, mixedCommits, scored: false });
  process.exit(0);
}

// 7 · The eval run, bounded.
console.log(`\ngate: base ${base} · changed ${changed.length} method file(s) · cases ${cases.join(', ')} · threshold ${threshold} · ceiling $${maxCost}`);
const caseArgs = cases.map(c => `--case '${c}*'`).join(' ');
const cmd = evalCmd ?? `claude plugin eval . --scaffold --allow-tools Bash Write Edit --ablation none --runs 1 --trust-plugin --no-publish --threshold ${threshold} --max-cost-usd ${maxCost} ${caseArgs}`;
const e = sh(cmd, { stdio: ['ignore', 'inherit', 'inherit'] });
if (e.status === 2) fail(`the eval run hit the $${maxCost} budget ceiling and stopped: paid graders may have been skipped, so this is not a pass. Raise the ceiling deliberately or narrow the case selection.`, { base, changed, cases, evalExit: 2 });
if (e.status !== 0) fail(`a case scored below the threshold ${threshold} — a regression, not a budget problem.`, { base, changed, cases, evalExit: e.status });

console.log(`\n✓ gate: ${cases.length} case(s) at or above ${threshold}, base ${base}.`);
report({ ok: true, base, changed, cases, debt, byTests, mixedCommits, scored: true, evalExit: 0 });
