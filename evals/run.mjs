#!/usr/bin/env node
// Assembles one eval fixture into a directory the native runner gives us.
// Called as a case's scaffold_script:
//   node evals/run.mjs --assemble <case-id> --out "$EVAL_SCAFFOLD_DIR"
// It copies the fixture and writes the three things that turn the plugin on in a user repo:
// .cycle/ (config, gate, optionally council), and the CLAUDE.md block /cycle:init writes.
// Assembly options per case live in evals/fixtures.json, so the case.yaml stays about the task.
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const id = val('--assemble');
const out = val('--out') ?? process.env.EVAL_SCAFFOLD_DIR;

if (!id || !out) {
  console.error('usage: run.mjs --assemble <case-id> --out <dir>   (or set EVAL_SCAFFOLD_DIR)');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(join(here, 'fixtures.json'), 'utf8'));
const c = spec[id];
if (!c) { console.error(`no assembly spec for case "${id}" in evals/fixtures.json`); process.exit(2); }

const src = join(here, 'fixtures', c.fixture);
if (!existsSync(src)) { console.error(`fixture ${c.fixture} not found at ${src}`); process.exit(2); }

mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true });

mkdirSync(join(out, '.cycle', 'work'), { recursive: true });
const cfg = JSON.parse(readFileSync(join(root, 'templates', 'config.json'), 'utf8'));
const merged = { ...cfg, ...(c.config ?? {}), models: { ...cfg.models, ...(c.config?.models ?? {}) } };
writeFileSync(join(out, '.cycle', 'config.json'), JSON.stringify(merged, null, 2) + '\n');
writeFileSync(join(out, '.cycle', 'gate.json'), readFileSync(join(root, 'templates', 'gate.json')));
if (c.council) cpSync(join(root, 'templates', 'council.json'), join(out, '.cycle', 'council.json'));

const block = readFileSync(join(root, 'templates', 'claude-md-block.md'), 'utf8');
const claudeMd = join(out, 'CLAUDE.md');
writeFileSync(claudeMd, (existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') + '\n' : '') + block);

console.log(`assembled ${id} from fixture ${c.fixture} into ${out}${c.council ? ' (with council.json)' : ''}`);
