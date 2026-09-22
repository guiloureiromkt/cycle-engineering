#!/usr/bin/env node
// The pre-publish gate. This repo has no pull requests to block, so the gate runs here, before a
// release leaves the machine — and since 2026-09-22 it is deterministic and free:
//
//   0 · a clean tree (an uncommitted change has no date, and the package is git archive HEAD)
//   1 · the unit tests
//   2 · a base to compare against (no base is a failure, never a pass)
//   3 · the commit-shape rule: no commit mixes a case with a method file
//   4 · the coverage map: every changed method file is mapped to cases, to a test, or to declared debt
//   5 · a RED→GREEN record for every changed method file a case covers, read from git: a commit to a
//       covering case's case.meta.md on or after the file's latest change (its prose says the run, or
//       says "no run, and why" — a declared waiver the cycle's verifier reads)
//   6 · npm test green inside the assembled package (git archive HEAD; .gitattributes export-ignore)
//   7 · no path of this machine's home inside the package
//
//   node scripts/gate.mjs [--base <ref>] [--json <path>]
//
// What it stopped doing: calling `claude plugin eval`. Five reds on one publish path, four of them a
// judge over a plan the run had grown, US$26.93 for a tag that never came. The paid suite is a monitor
// now (`npm run evals`, the weekly routine); a red there opens an intent, never blocks a tag.
import { readFileSync, existsSync, writeFileSync, rmSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const args = process.argv.slice(2);
const val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const jsonOut = val('--json', null);
const cwd = process.cwd();
const METHOD = /^(skills|agents|hooks|scripts|templates)\//;
const CASE = /^evals\/\d{4}-/;

const sh = (cmd, opts = {}) => spawnSync('bash', ['-lc', cmd], { cwd, encoding: 'utf8', ...opts });
const git = (a) => sh(`git ${a}`).stdout.trim();
const fail = (msg, extra = {}) => { console.error(`\n✗ gate: ${msg}`); report({ ok: false, reason: msg, ...extra }); process.exit(1); };
let reported = false;
function report(o) { if (jsonOut && !reported) { reported = true; writeFileSync(jsonOut, JSON.stringify(o, null, 2) + '\n'); } }

// 0 · A clean tree. The record rule reads commit dates and the package is the committed tree; an
// uncommitted change would have no date and would be tested by step 1 but shipped by nobody.
const dirty = git('status --porcelain').split('\n').filter(Boolean);
if (dirty.length) fail(`the tree is not clean (${dirty.length} uncommitted path(s)) — commit first; a clean tree is what the record rule dates and what the package contains:\n  ${dirty.slice(0, 10).join('\n  ')}`, { dirty });

// 1 · The unit tests.
const testCmd = process.env.CYCLE_GATE_TEST_CMD ?? 'npm test';
const t = sh(testCmd, { stdio: ['ignore', 'inherit', 'inherit'] });
if (t.status !== 0) fail(`${testCmd} failed`);

// 2 · The base. Without one there is nothing to compare, and that is a failure, not a pass.
let base = val('--base', null);
if (!base) {
  const d = sh('git describe --tags --abbrev=0');
  base = d.status === 0 ? d.stdout.trim() : '';
}
if (!base) fail('no base to compare against (no --base and no tag reachable from HEAD). A gate with no base would score nothing and call it green.');

// 3 · The commit-shape rule: no commit may touch both a case and a method file.
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

// 4 · What changed (committed; the tree is clean). --diff-filter=d drops deletions: a method file
// that no longer exists cannot be covered by anything, and demanding a coverage entry for it is
// how the gate failed its own 0.5.0 publish.
const changed = [...new Set(git(`diff --name-only --diff-filter=d ${base}..HEAD`).split('\n').filter(f => f && METHOD.test(f)))].sort();

let debt = [], byTests = [], cases = [], records = [];
if (!changed.length) {
  console.log(`\ngate: no method file changed since ${base} — nothing to score; the package is still checked.`);
} else {
  // Coverage: which case covers which method file. An uncovered change is a failure, not a warning.
  const covPath = join(cwd, 'evals', 'coverage.json');
  if (!existsSync(covPath)) fail('evals/coverage.json is missing: the gate cannot know which case covers what.', { base, changed });
  const coverage = JSON.parse(readFileSync(covPath, 'utf8'));
  // A method file is covered three ways: by cases (an agent run, recorded), by unit tests
  // (deterministic), or by declared debt — an entry that says out loud there is no case yet, and
  // why. What is covered by nothing at all is a failure: the gate never goes green on a change it
  // did not look at.
  const unmapped = changed.filter(f => !coverage[f]);
  if (unmapped.length) fail(`method file(s) mapped by nothing in evals/coverage.json — add a case, point at the test that covers it, or declare the debt with a reason:\n  ${unmapped.join('\n  ')}`, { base, changed, unmapped });
  debt = changed.filter(f => coverage[f]?.uncovered);
  byTests = changed.filter(f => coverage[f]?.tests);
  const byCases = changed.filter(f => Array.isArray(coverage[f]));
  cases = [...new Set(byCases.flatMap(f => coverage[f]))].sort();
  for (const f of debt) console.log(`gate: ${f} has no case — declared debt since ${coverage[f].since}: ${coverage[f].uncovered}`);
  for (const f of byTests) console.log(`gate: ${f} covered deterministically by ${coverage[f].tests} (already run above)`);
  if (!cases.length) console.log(`gate: ${changed.length} method file(s) changed, none of them covered by a case (${byTests.length} by tests, ${debt.length} declared debt); nothing to score.`);

  // 5 · The RED→GREEN record, read from git. For each method file a case covers: the latest commit
  // touching it in the range has an author date; at least one covering case's case.meta.md has a
  // commit in the range dated on or after it. Author dates, not committer dates: an amend or a rebase
  // moves the latter and would turn a green record red the next morning.
  for (const f of byCases) {
    const latest = git(`log --format=%as -1 ${base}..HEAD -- ${f}`);
    const found = coverage[f].map(c => ({ c, date: git(`log --format=%as -1 ${base}..HEAD -- evals/${c}/case.meta.md`) }))
      .filter(r => r.date && r.date >= latest)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!found) fail(`${f} changed on ${latest} and there is no RED→GREEN record on or after that date in ${coverage[f].map(c => `evals/${c}/case.meta.md`).join(', ')} — commit the record in the case that proved it (the run, or "no run, and why").`, { base, changed, file: f, latest, cases: coverage[f] });
    records.push({ file: f, changed: latest, case: found.c, record: found.date });
    console.log(`gate: ${f} (changed ${latest}) · record ${found.date} in ${found.c}`);
  }
}

// 6 · The package: git archive HEAD (.gitattributes export-ignore keeps the working copy's private
// folders out), extracted to a temp dir, tested there. 7 · No path of this machine's home in it.
const pkg = mkdtempSync(join(tmpdir(), 'cycle-gate-pkg-'));
try {
  const a = sh(`git archive HEAD | tar -x -C '${pkg}'`);
  if (a.status !== 0) fail(`could not assemble the package: ${a.stderr.trim()}`, { base, changed, cases });
  const pkgTest = process.env.CYCLE_GATE_PACKAGE_TEST_CMD ?? 'npm test';
  const p = spawnSync('bash', ['-lc', pkgTest], { cwd: pkg, encoding: 'utf8' });
  if (p.status !== 0) {
    const tail = (p.stdout + p.stderr).split('\n').filter(Boolean).slice(-20).join('\n  ');
    fail(`${pkgTest} is red inside the package (git archive HEAD) — the shipped suite must be green on its own:\n  ${tail}`, { base, changed, cases, records, package: { tests: 'red' } });
  }
  const home = homedir();
  const leaks = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const text = readFileSync(full, 'utf8');
      if (!text.includes(' ') && text.includes(home)) leaks.push(full.slice(pkg.length + 1));
    }
  };
  walk(pkg);
  if (leaks.length) fail(`machine path (${home}) inside the package — a plugin cannot point at its author's disk:\n  ${leaks.join('\n  ')}`, { base, changed, cases, records, package: { tests: 'green', paths: leaks } });
} finally {
  rmSync(pkg, { recursive: true, force: true });
}
console.log(`gate: package: tests green, paths clean (git archive HEAD).`);

console.log(`\n✓ gate: base ${base} · ${changed.length} method file(s) changed · ${records.length} record(s) · package green.`);
report({ ok: true, base, changed, cases, records, debt, byTests, mixedCommits, package: { tests: 'green', paths: 'clean' } });
