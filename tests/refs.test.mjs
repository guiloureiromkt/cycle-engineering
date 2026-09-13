// cycle-engineering · every `cycle:<name>` referenced in skills/ agents/ commands/ templates/ must exist as skills/<name>/SKILL.md.
// Reads the directories at run time; nothing is hardcoded, so renames show up as soon as they land.
// Not counted as skill references: `/cycle:<x>` (slash commands) and the CLAUDE.md markers `<!-- cycle:start -->` / `<!-- cycle:end -->`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["skills", "agents", "commands", "templates"];
const TEXT = /\.(md|mdx|yaml|yml|json|txt)$/i;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = join(dir, d.name);
    return d.isDirectory() ? walk(p) : TEXT.test(d.name) ? [p] : [];
  });
}

function installedSkills() {
  const dir = join(repo, "skills");
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(dir, d.name, "SKILL.md")))
    .map(d => d.name));
}

test("every cycle:<name> reference resolves to skills/<name>/SKILL.md", () => {
  const refs = new Map();   // name → ["file:line", …]
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(repo, dir))) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        const cleaned = line.replace(/<!--\s*cycle:(start|end)\s*-->/g, "");
        for (const m of cleaned.matchAll(/(^|[^a-z0-9\/_-])cycle:([a-z][a-z0-9-]*)/gi)) {
          const name = m[2].toLowerCase();
          if (!refs.has(name)) refs.set(name, []);
          refs.get(name).push(`${relative(repo, file)}:${i + 1}`);
        }
      });
    }
  }
  const skills = installedSkills();
  const missing = [...refs].filter(([name]) => !skills.has(name));
  const report = missing.map(([name, where]) => `  cycle:${name}  ← ${where.slice(0, 3).join(", ")}${where.length > 3 ? ` (+${where.length - 3})` : ""}`).join("\n");
  console.log(`refs: ${refs.size} distinct cycle:<name> reference(s) across ${SCAN_DIRS.join(" ")}; ${skills.size} skill(s) installed`);
  assert.equal(missing.length, 0, `cycle:<name> references without skills/<name>/SKILL.md (bundle the skill or rewrite the line):\n${report}`);
});

test("evals/coverage.json: every key names an existing file and every case an existing case directory", () => {
  const covPath = join(repo, "evals", "coverage.json");
  if (!existsSync(covPath)) return;                       // the map is optional until the gate exists
  const cov = JSON.parse(readFileSync(covPath, "utf8"));
  const caseDirs = new Set(readdirSync(join(repo, "evals"), { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{4}-/.test(d.name)).map(d => d.name));
  const badKeys = Object.keys(cov).filter(k => !existsSync(join(repo, k)));
  assert.deepEqual(badKeys, [], "coverage.json keys that name no file (the map rots when a file is renamed)");
  const badCases = [...new Set(Object.values(cov).filter(Array.isArray).flat())].filter(c => !caseDirs.has(c));
  assert.deepEqual(badCases, [], "coverage.json names cases that do not exist");
  for (const [k, v] of Object.entries(cov)) {
    const shaped = Array.isArray(v) || (v && typeof v === "object" && (typeof v.tests === "string" || (typeof v.uncovered === "string" && typeof v.since === "string")));
    assert.ok(shaped, `coverage.json entry for ${k} must be a case list, {tests}, or {uncovered, since}`);
  }
  console.log(`coverage: ${Object.keys(cov).length} method file(s) mapped`);
});
