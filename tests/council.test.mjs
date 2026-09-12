// cycle-engineering · council.json shape, and the resolver that turns a plan + council.json into the seat list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const councilPath = join(repo, "templates", "council.json");
const council = existsSync(councilPath) ? JSON.parse(readFileSync(councilPath, "utf8")) : null;
const config = JSON.parse(readFileSync(join(repo, "templates", "config.json"), "utf8"));
const STRATEGIES = /enumerat|adversar|backward|simulat|walk|trace|count|compare|inspect|replay/i;
const resolve = (planPath, cwd, extra = "") => {
  const args = [join(repo, "scripts", "resolve-seats.mjs"), planPath, "--cwd", cwd];
  if (extra) args.push("--extra", extra);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout);
};

test("council.json: five default seats, always on", () => {
  assert.ok(council, "templates/council.json exists");
  assert.deepEqual(council.seats.map(s => s.id), ["user", "maintainer", "payer", "security", "operator"]);
  for (const s of council.seats) assert.ok(s.brief && s.always === true, s.id);
});
test("council.json: pool seats have briefs that name a reasoning strategy, concrete trigger tokens, knowledge and skill keys", () => {
  assert.ok(council);
  for (const s of council.pool) {
    assert.match(s.brief, STRATEGIES, s.id);
    assert.ok(s.triggers.length >= 1 && s.triggers.every(t => /^[a-z][a-z -]{1,30}$/.test(t)), `${s.id}: triggers are short lowercase tokens`);
    assert.ok("knowledge" in s && "skill" in s, s.id);
    if (s.skill) assert.match(s.skill, /^[a-z-]+:[a-z-]+$/, s.id);
  }
  for (const id of ["marketing", "content", "ux", "ui", "cx", "brand-voice", "commercial", "legal", "data"]) assert.ok(council.pool.some(s => s.id === id), id);
  assert.notEqual(council.pool.find(s => s.id === "marketing").skill, council.pool.find(s => s.id === "brand-voice").skill, "marketing and brand-voice must not share a lens");
});
test("council.json: joker domains ≥ 4 and enabled; scenarios three horizons and a futures rule, no paths; config.models.joker = sonnet", () => {
  assert.ok(council);
  assert.ok(council.joker.domains.length >= 4 && council.joker.enabled === true);
  assert.equal(council.scenarios.horizons.length, 3); assert.ok(!('paths' in council.scenarios), 'no paths: the seat writes futures, not narratives per path'); assert.match(council.scenarios.futures_per_horizon, /inversion/);
  assert.equal(config.models.joker, "sonnet");
});
test("resolver: fixture g's plan lights six pool seats; the cap keeps nine and drops the last two in pool order, with a reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(council));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "x.md"), readFileSync(join(repo, "evals", "fixtures", "g", "plans", "discount-checkout.md")));
  const out = resolve("plans/x.md", dir);
  assert.equal(out.source, "repo");
  for (const id of ["user", "maintainer", "payer", "security", "operator"]) assert.ok(out.seats.some(s => s.id === id), id);
  const lit = [...out.seats.map(s => s.id), ...out.dropped.map(d => d.id)];
  for (const id of ["marketing", "content", "ux", "cx", "brand-voice", "commercial"]) assert.ok(lit.includes(id), `lit: ${id}`);
  assert.ok(out.dropped.some(d => d.id === "brand-voice"), "brand-voice is the first seat the cap drops (pool order)");
  assert.ok(out.seats.length <= 9, "cap");
  assert.ok(out.dropped.length >= 1 && out.dropped.every(d => d.reason), "dropped seats carry a reason");
  assert.equal(out.scenario, true); assert.equal(out.joker, true);
  assert.match(out.summary, /council: \d+ seats/);
  assert.ok(out.cost_hint);
});
test("resolver: --extra re-sits a seat the owner names, ahead of the cap", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(council));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "x.md"), readFileSync(join(repo, "evals", "fixtures", "g", "plans", "discount-checkout.md")));
  const out = resolve("plans/x.md", dir, "legal");
  assert.ok(out.seats.some(s => s.id === "legal" && /owner/.test(s.why)), "legal sits because the owner named it");
});
test("resolver: no .cycle/council.json → the template's defaults; a typo plan lights no pool seat", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "t.md"), "---\ntype: plan\nstatus: draft\n---\n# Fix the typo 'recieve' in README.md\n## Risks\nnone\n");
  const out = resolve("plans/t.md", dir);
  assert.equal(out.seats.length, 5); assert.equal(out.source, "template");
});
