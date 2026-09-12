#!/usr/bin/env node
// Assembles each eval fixture into a scratch directory and prints what to run
// and what to check. It does not drive the agent: one subagent per eval, with a
// clean context, is the run. See evals/README.md.
import { readdirSync, readFileSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const only = process.argv.find(a => a.startsWith('--case='))?.slice(7);

const cases = readdirSync(here)
  .filter(f => /^\d{4}-.*\.json$/.test(f))
  .sort()
  .map(f => JSON.parse(readFileSync(join(here, f), 'utf8')))
  .filter(c => !only || c.id.includes(only));

if (cases.length === 0) {
  console.error(only ? `no eval matches --case=${only}` : 'no eval case files under evals/');
  process.exit(1);
}

const out = mkdtempSync(join(tmpdir(), 'cycle-evals-'));
const configTemplate = join(root, 'templates', 'config.json');

for (const c of cases) {
  const src = join(here, 'fixtures', c.fixture);
  if (!existsSync(src)) {
    console.error(`eval ${c.id}: fixture ${c.fixture} not found at ${src}`);
    process.exit(1);
  }
  const dest = join(out, c.id);
  cpSync(src, dest, { recursive: true });

  // .cycle/ is what turns the plugin on. It is assembled here rather than
  // committed, so the fixtures stay plain sample repos in the tree.
  mkdirSync(join(dest, '.cycle', 'work'), { recursive: true });
  cpSync(configTemplate, join(dest, '.cycle', 'config.json'));
  writeFileSync(join(dest, '.cycle', 'gate.json'), readFileSync(join(root, 'templates', 'gate.json')));

  // A user repo carries the block /cycle:init writes; a subagent in a scratch dir gets no SessionStart,
  // so the block is the only thing that tells it to route. Same text as templates/claude-md-block.md.
  const block = readFileSync(join(root, 'templates', 'claude-md-block.md'), 'utf8');
  const claudeMd = join(dest, 'CLAUDE.md');
  writeFileSync(claudeMd, (existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') + '\n' : '') + block);

  console.log(`\n${'='.repeat(72)}\n${c.id}`);
  console.log(`origin   ${c.origin}`);
  console.log(`cwd      ${dest}`);
  console.log(`tools    ${c.tools}`);
  console.log(`prompt   ${c.prompt}`);
  console.log('accepted_if:');
  for (const check of c.accepted_if) console.log(`  [ ] ${check}`);
}

console.log(`\n${'='.repeat(72)}`);
console.log(`${cases.length} fixture(s) assembled under ${out}`);
console.log('Run each one with a fresh subagent whose cwd is the path above, then');
console.log('check the boxes by hand and record the result in evals/results/<date>.md.');
