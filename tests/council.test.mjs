// cycle-engineering · council.json shape, and the resolver that turns a plan + council.json into the seat list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
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

test("council.json: seven default seats, always on, in the order they speak", () => {
  assert.ok(council, "templates/council.json exists");
  assert.deepEqual(council.seats.map(s => s.id), ["minimalist", "user", "maintainer", "payer", "security", "operator", "pollyana"]);
  for (const s of council.seats) assert.ok(s.brief && s.always === true, s.id);
});
test("council.json: the repo's own copy is identical to the template", () => {
  const own = JSON.parse(readFileSync(join(repo, ".cycle", "council.json"), "utf8"));
  assert.deepEqual(own, council, ".cycle/council.json drifted from templates/council.json");
});
/** Each phrase must appear, and after the previous one: the briefs are ordered instructions, not word bags. */
export function ordered(text, phrases) {
  let last = -1;
  const low = text.toLowerCase();
  for (const ph of phrases) {
    const i = low.indexOf(ph);
    assert.ok(i > last, `"${ph}" must appear after the previous phrase (found at ${i}, previous at ${last})`);
    last = i;
  }
}
test("council.json: pollyana and minimalist are bound to an output, in order, not to a mood", () => {
  const p = council.seats.find(s => s.id === "pollyana").brief;
  const m = council.seats.find(s => s.id === "minimalist").brief;
  ordered(p, ["already", "nobody has looked", "conflicting pair", "costs", "gives up", "smallest change", "bar change", "no demand"]);
  assert.ok(p.length > 700, "a shorter brief has lost a clause the owner corrected");
  assert.doesNotMatch(p, /will be fine|will work out|believe in/i, "not encouragement");
  ordered(m, ["already knows", "now possible", "instead of", "lost", "bar change", "no demand"]);
  assert.ok(m.length > 700, "a shorter brief has lost a clause the owner corrected");
  assert.doesNotMatch(m, /just a prompt/i, "the agent's jargon the owner did not understand stays out");
});
test("resolver: with seven seats the two pool slots go to precise triggers — the checkout fixture seats commercial and cx", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(council));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "x.md"), readFileSync(join(repo, "evals", "fixtures", "g", "plans", "discount-checkout.md")));
  const ids = resolve("plans/x.md", dir).seats.map(s => s.id);
  assert.equal(ids.length, 9, `cap: ${ids}`);
  assert.ok(ids.includes("commercial") && ids.includes("cx"), `the two that found real defects on 2026-09-12 must sit: ${ids}`);
  assert.ok(!ids.includes("content") && !ids.includes("brand-voice"), `the prose-matchers are the ones the cap drops: ${ids}`);
});
test("resolver: a repo council.json missing seats the template has warns on stderr AND in the JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  const old = { ...council, seats: council.seats.filter(s => !["pollyana", "minimalist"].includes(s.id)) };
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(old));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "t.md"), "---\ntype: plan\nstatus: draft\n---\n# x\n");
  const r = spawnSync(process.execPath, [join(repo, "scripts", "resolve-seats.mjs"), "plans/t.md", "--cwd", dir], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /minimalist/); assert.match(r.stderr, /pollyana/);
  assert.match(r.stderr, /cycle:init|templates\/council\.json/, "says how to fix it");
  const out = JSON.parse(r.stdout);
  assert.ok(Array.isArray(out.warnings) && out.warnings.some(w => /pollyana/.test(w)), "an unattended caller reads the JSON, not stderr");
});
test("resolver: cost_hint counts a seat's own lines, so the seven-seat file prices higher than the five-seat one", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle", ), { recursive: true }); mkdirSync(join(dir, "plans"));
  writeFileSync(join(dir, "plans", "t.md"), "---\ntype: plan\nstatus: draft\n---\n# x\n");
  const tokens = (hint) => Number(hint.match(/≈ (\d+) output tokens/)[1]);
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(council));
  const seven = tokens(resolve("plans/t.md", dir).cost_hint);
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify({ ...council, seats: council.seats.filter(s => !["pollyana", "minimalist"].includes(s.id)) }));
  const five = tokens(resolve("plans/t.md", dir).cost_hint);
  assert.ok(seven > five + 2 * 5 * 40, `two ten-line seats must add more than two five-line seats would: ${five} → ${seven}`);
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
// 2026-09-20: this case used to expect six lit seats including `ux`. Under subject matching `ux` no
// longer lights on this fixture — it fired on the word "page" in the fixture's prose, never in its Goal
// or its Proof. The expectation moves because the behaviour was the point of the change; no assertion is
// weakened: the seats are still named by id, the cap is still pinned, and so is the first seat it drops.
test("resolver: fixture g's plan lights five pool seats; the cap keeps nine and drops the last ones in pool order, with a reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(council));
  mkdirSync(join(dir, "plans")); writeFileSync(join(dir, "plans", "x.md"), readFileSync(join(repo, "evals", "fixtures", "g", "plans", "discount-checkout.md")));
  const out = resolve("plans/x.md", dir);
  assert.equal(out.source, "repo");
  for (const id of ["user", "maintainer", "payer", "security", "operator"]) assert.ok(out.seats.some(s => s.id === id), id);
  const lit = [...out.seats.map(s => s.id), ...out.dropped.map(d => d.id)];
  for (const id of ["marketing", "content", "cx", "brand-voice", "commercial"]) assert.ok(lit.includes(id), `lit: ${id}`);
  assert.ok(!lit.includes("ux"), "ux fired on 'page' in this fixture's prose, not in its subject");
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
  assert.equal(out.seats.length, 7); assert.equal(out.source, "template");
});

// ─── 2026-09-20 · a pool seat sits for a subject, not for a word ──────────────────────────────────
// intent/2026-09-20-pool-triggers-match-prose.md. Measured before the change, over 19 plan files:
// 102 pool seatings, almost none about the plan. `contract` was the filename docs/CONTRACT.md,
// `table` was "the risks table", `tracking` was a line the plan template gives every plan.

const fixture = (name) => readFileSync(join(repo, "tests", "fixtures", name), "utf8");

/** A throwaway repo with a council.json and one plan in it. */
const repoWith = (md, councilJson = council) => {
  const dir = mkdtempSync(join(tmpdir(), "cycle-council-"));
  mkdirSync(join(dir, ".cycle"), { recursive: true });
  writeFileSync(join(dir, ".cycle", "council.json"), JSON.stringify(councilJson));
  mkdirSync(join(dir, "plans"));
  writeFileSync(join(dir, "plans", "x.md"), md);
  return dir;
};
const runIn = (dir, ...extra) =>
  spawnSync(process.execPath, [join(repo, "scripts", "resolve-seats.mjs"), "plans/x.md", "--cwd", dir, ...extra], { encoding: "utf8" });
/** The text the matcher actually sees. */
const subjectOf = (md) => {
  const r = runIn(repoWith(md), "--print-subject");
  assert.equal(r.status, 0, r.stderr);
  // Without the flag the script prints its seat JSON, whose briefs contain "refund", "customer" and
  // most other trigger words: every assertion below would pass on it and prove nothing.
  assert.ok(!r.stdout.trimStart().startsWith("{"), "--print-subject must print the subject text, not the seat JSON");
  return r.stdout.trim();
};
/** Every pool seat the plan lights, whether or not the cap seated it. */
const litOn = (md) => {
  const out = resolve("plans/x.md", repoWith(md));
  return [...out.seats.map(s => s.id), ...out.dropped.map(d => d.id)];
};
const warningsOn = (md) => JSON.parse(runIn(repoWith(md)).stdout).warnings;

const GOAL = "**Goal:** rename an internal helper.";
const withSubject = (body) => `---\ntype: plan\n---\n\n# Plan: x\n\n${GOAL}\n\n## Files that change\n\n${body}\n\n## Proof\n\n- **Bar:** it still builds.\n`;

test("subject: the Goal line is captured, in every shape a plan writes it", () => {
  for (const line of ["**Goal:** the refund is issued once", "- **Goal:** the refund is issued once", "  **Goal:** the refund is issued once", "**Goal**: the refund is issued once"]) {
    const s = subjectOf(`---\ntype: plan\n---\n\n# Plan: x\n\n${line}\n\n## Proof\n\n- **Bar:** ok\n`);
    assert.match(s, /refund/, `Goal not captured from: ${line}`);
  }
});
test("subject: a sub-heading inside a kept section does not end it, and Proof last captures to EOF", () => {
  const s = subjectOf(`---\ntype: plan\n---\n\n# Plan: x\n\n${GOAL}\n\n## Proof\n\n### Task 1\n\n- **Bar:** the customer sees the refund\n`);
  assert.match(s, /refund/, "a ### sub-heading must not close the section");
  assert.match(s, /customer/, "Proof as the last heading captures to end of file");
});
test("subject: a fenced block is an example, not a subject — even when it contains a heading line", () => {
  const s = subjectOf(withSubject("- Modify: one helper\n\n```\n## Proof\nthe customer asks for a refund in a support ticket\n```"));
  assert.doesNotMatch(s, /refund|customer|ticket/, `a fenced example leaked into the subject: ${s}`);
});
test("subject: an indented fence is content; an unclosed fence at column zero is reported, not swallowed silently", () => {
  const s = subjectOf(fixture("plan-with-an-unclosed-fence.md"));
  assert.match(s, /refund/, "an indented fence must not swallow the Proof section");
  assert.ok(warningsOn(fixture("plan-with-an-unclosed-fence.md")).some(w => /fence/i.test(w)),
    "an unclosed fence at column zero is an authoring slip and must be named as one");
});
test("subject: a path is split into its segments, its file name dropped, and a URL removed whole", () => {
  const s = subjectOf(withSubject("- Modify: docs/CONTRACT.md and src/checkout/index.ts\n- See https://stripe.com/docs/billing/pricing for the rounding rule\n- It applies to orders and/or refunds"));
  assert.doesNotMatch(s, /\bcontract\b/, "a file name is not a subject");
  assert.match(s, /\bcheckout\b/, "a path segment IS a subject — that is how CODEOWNERS assigns reviewers");
  assert.doesNotMatch(s, /\bpricing\b/, "a vendor URL is a citation, not a subject");
  assert.match(s, /and or|and\/or/, "and/or is not a path and must survive");
});
test("resolver: the plan the 0008 run wrote seats no pool seat — words in prose are not subjects", () => {
  const ids = resolve("plans/x.md", repoWith(fixture("plan-written-by-the-0008-run-2026-09-20.md"))).seats.map(s => s.id);
  assert.deepEqual(ids, ["minimalist", "user", "maintainer", "payer", "security", "operator", "pollyana"],
    `a README typo must seat nobody from the pool: ${ids}`);
});
test("resolver: a plan with neither subject heading is matched whole AND says so", () => {
  const md = fixture("plan-old-template-no-sections.md");
  assert.ok(litOn(md).includes("commercial"), "an older template degrades to today's behaviour, never to silence");
  assert.ok(warningsOn(md).some(w => /whole text/.test(w)), "a silent fallback is the hole this cycle was opened to close");
});
test("council.json: every shipped multi-word trigger really matches, contiguous and wrapped", () => {
  for (const p of council.pool)
    for (const t of p.triggers.filter(x => x.includes(" "))) {
      const [a, b] = [t.slice(0, t.indexOf(" ")), t.slice(t.indexOf(" ") + 1)];
      assert.ok(litOn(`---\ntype: plan\n---\n\n# Plan: x\n\n**Goal:** we add ${t} to the product.\n\n## Proof\n\n- **Bar:** ok\n`).includes(p.id),
        `${p.id}: the trigger "${t}" never matches anything`);
      assert.ok(litOn(`---\ntype: plan\n---\n\n# Plan: x\n\n**Goal:** we add ${a}\n${b} to the product.\n\n## Proof\n\n- **Bar:** ok\n`).includes(p.id),
        `${p.id}: the trigger "${t}" dies when the line wraps between its words`);
    }
});
test("council.json: no bare method-vocabulary word survives as a trigger", () => {
  const banned = ["contract", "terms", "report", "tracking", "event", "quote", "table", "copy", "post", "message"];
  assert.deepEqual(council.pool.flatMap(p => p.triggers.filter(t => banned.includes(t)).map(t => `${p.id}: ${t}`)), [],
    "these words produced 102 seatings over 19 plan files on 2026-09-20; a trigger is a phrase about a product subject");
});
test("council.json: the repo copy and the template are byte-identical, not merely equal when parsed", () => {
  assert.equal(readFileSync(join(repo, ".cycle", "council.json"), "utf8"), readFileSync(councilPath, "utf8"),
    "the Proof bar runs `diff`; a test that only compares parsed objects passes on indentation drift");
});
test("resolver: a repo whose pool triggers differ from the template is told which seats differ", () => {
  const stale = JSON.parse(JSON.stringify(council));
  stale.pool.find(p => p.id === "data").triggers = ["metric", "report", "tracking", "event"];
  const r = runIn(repoWith(withSubject("- Modify: one helper"), stale));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /\bdata\b/, "the adopter must be told which seat drifted");
  assert.ok(JSON.parse(r.stdout).warnings.some(w => /differ/.test(w) && /data/.test(w)), "and an unattended caller reads stdout");
});
test("resolver: a repo that removed a pool seat, or emptied the pool, warns and exits 0 — never throws", () => {
  for (const pool of [council.pool.filter(p => p.id !== "legal"), []]) {
    const r = runIn(repoWith(withSubject("- Modify: one helper"), { ...council, pool }));
    assert.equal(r.status, 0, `an adopter who diverged must not lose gate 4: ${r.stderr}`);
    assert.ok(JSON.parse(r.stdout).warnings.some(w => /differ/.test(w)), "the divergence is reported, not dereferenced");
  }
});
test("resolver: three warnings can fire in one run, in the documented order, without clobbering each other", () => {
  const broken = JSON.parse(JSON.stringify(council));
  broken.seats = broken.seats.filter(s => s.id !== "pollyana");           // 1 · predates a seat
  broken.pool.find(p => p.id === "data").triggers = ["metric", "report"];  // 2 · stale triggers
  const w = JSON.parse(runIn(repoWith(fixture("plan-old-template-no-sections.md"), broken)).stdout).warnings;  // 3 · whole text
  const at = (re) => w.findIndex(x => re.test(x));
  assert.ok(at(/predates seats/) === 0, `missing seats first: ${JSON.stringify(w)}`);
  assert.ok(at(/differ/) === 1, `stale triggers second: ${JSON.stringify(w)}`);
  assert.ok(at(/whole text/) === 2, `whole-text last: ${JSON.stringify(w)}`);
});
test("resolver: a compliance subject named only in the Risks table does NOT seat legal — a stated choice", () => {
  // The narrowing cuts both ways. Prose no longer seats a seat wrongly, and prose no longer seats one
  // rightly. This case exists so the miss is on the record, with its escape beside it: --extra legal.
  const md = `---\ntype: plan\n---\n\n# Plan: x\n\n${GOAL}\n\n## Files that change\n\n- Modify: one helper\n\n## Risks\n\n| R1 | it touches personal data under lgpd | advocate | 🔴 | … |\n\n## Proof\n\n- **Bar:** it still builds.\n`;
  assert.ok(!litOn(md).includes("legal"), "a subject named only in the risks table is outside the subject, deliberately");
  const named = resolve("plans/x.md", repoWith(md), "legal");
  assert.ok(named.seats.some(s => s.id === "legal" && /owner/.test(s.why)), "the escape is the owner naming the seat");
});
test("plans written from 2026-09-20 on carry a Goal line and a subject heading", () => {
  const dir = join(repo, "plans");
  const bad = [];
  for (const f of readdirSync(dir)) {
    if (!/^20\d\d-\d\d-\d\d-/.test(f) || f < "2026-09-20") continue;
    const md = readFileSync(join(dir, f), "utf8");
    if (!/^\s*(?:[-*]\s+)?\*\*Goal\*?\*?:/m.test(md) || !/^## (Files that change|Proof)\b/m.test(md)) bad.push(f);
  }
  assert.deepEqual(bad, [], "a plan without a subject falls back to whole-text matching, which is what this fixed");
});
