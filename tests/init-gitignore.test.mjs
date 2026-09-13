// cycle-engineering · the .cycle/.gitignore that /cycle:init copies must actually ignore what it names.
// Baseline (RED, 2026-09-04): init wrote `work/**/*.{png,jpg,mp4,zip,sql.gz}`; gitignore does not expand
// braces, so screenshots under .cycle/work/ showed up as untracked in a product repo. Proven with git itself.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "templates", "cycle-gitignore");
const dirs = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

function repoWithIgnore(content) {
  const dir = mkdtempSync(join(tmpdir(), "cycle-ignore-"));
  dirs.push(dir);
  spawnSync("git", ["init", "-q"], { cwd: dir });
  mkdirSync(join(dir, ".cycle", "work", "x"), { recursive: true });
  writeFileSync(join(dir, ".cycle", ".gitignore"), content);
  return dir;
}
const ignored = (dir, rel) => spawnSync("git", ["check-ignore", "-q", rel], { cwd: dir }).status === 0;

test("template exists and has no brace pattern", () => {
  const t = readFileSync(TEMPLATE, "utf8");
  assert.doesNotMatch(t, /\{[^}]*,[^}]*\}/, "brace pattern in template");
  assert.match(t, /^release-approval$/m);
});

test("template ignores every binary it names, and release-approval", () => {
  const dir = repoWithIgnore(readFileSync(TEMPLATE, "utf8"));
  for (const f of ["a.png", "b.jpg", "c.jpeg", "d.gif", "e.mp4", "f.zip", "g.sql.gz", "h.dump"]) {
    assert.ok(ignored(dir, `.cycle/work/x/${f}`), `${f} should be ignored`);
  }
  assert.ok(ignored(dir, ".cycle/release-approval"), "release-approval should be ignored");
});

test("template keeps the text artifacts tracked", () => {
  const dir = repoWithIgnore(readFileSync(TEMPLATE, "utf8"));
  for (const rel of [".cycle/work/x/snapshot.md", ".cycle/work/x/restore-test.md", ".cycle/config.json", ".cycle/gate.json", ".cycle/work/.gitkeep"]) {
    assert.ok(!ignored(dir, rel), `${rel} must stay tracked`);
  }
});

test("the old brace form is the RED baseline: it ignores nothing under work/", () => {
  const dir = repoWithIgnore("work/**/*.{png,jpg,mp4,zip,sql.gz}\nrelease-approval\n");
  assert.ok(!ignored(dir, ".cycle/work/x/a.png"), "brace pattern must not match (documents the bug)");
});

test("commands/init.md points at the template and no longer spells a brace pattern", () => {
  const init = readFileSync(join(ROOT, "commands", "init.md"), "utf8");
  assert.match(init, /templates\/cycle-gitignore/);
  assert.doesNotMatch(init, /\*\.\{png/);
});
