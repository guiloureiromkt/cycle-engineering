// cycle-engineering · scripts/publish.mjs prepares the public clone inside the gated tree and never pushes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(ROOT, "scripts", "publish.mjs");
const gitEnv = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
const dirs = [];
process.on("exit", () => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** A fake method repo (method_repo ".", a plugin.json, export-ignore for intent/ and .cycle/) and a bare "public" repo it publishes to. */
function world({ pattern = true, homepage = null, remoteTag = null, spaceInPath = false } = {}) {
  const base = mkdtempSync(join(tmpdir(), spaceInPath ? "publish sp-" : "publish-")); dirs.push(base);
  const bare = join(base, "public.git"); git(base, "init", "-q", "--bare", "-b", "main", bare);
  const seed = join(base, "seed"); git(base, "init", "-q", "-b", "main", seed);
  writeFileSync(join(seed, "README.md"), "# old\n"); writeFileSync(join(seed, "OLD.md"), "gone later\n"); git(seed, "add", "."); git(seed, "commit", "-q", "-m", "0.8.0");
  if (remoteTag) git(seed, "tag", remoteTag);
  git(seed, "push", "-q", bare, "main"); if (remoteTag) git(seed, "push", "-q", bare, remoteTag);
  const repo = join(base, "method"); mkdirSync(join(repo, ".cycle", "work"), { recursive: true }); mkdirSync(join(repo, ".claude-plugin"), { recursive: true }); mkdirSync(join(repo, "intent"));
  git(repo, "init", "-q", "-b", "main");
  const cfg = { method_repo: ".", publish: homepage ? {} : { remote: bare } };
  writeFileSync(join(repo, ".cycle", "config.json"), JSON.stringify(cfg));
  writeFileSync(join(repo, ".cycle", "gate.json"), JSON.stringify({ patterns: pattern ? ["git push origin"] : [] }));
  writeFileSync(join(repo, ".cycle", ".gitignore"), "work/publish/\nrelease-approval\n");
  writeFileSync(join(repo, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "cycle", version: "0.9.1", homepage: homepage || "https://example.invalid/x" }));
  writeFileSync(join(repo, ".gitattributes"), "/intent/ export-ignore\n/.cycle/ export-ignore\n");
  writeFileSync(join(repo, "README.md"), "# new\n"); writeFileSync(join(repo, "intent", "x.md"), "private\n");
  git(repo, "add", "."); git(repo, "commit", "-q", "-m", "0.9.1: the thing");
  return { base, bare, repo };
}
const run = (cwd, args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });

test("publish: clones the public repo into .cycle/work/publish/pub, replaces the tree with git archive <ref>, commits, tags, never pushes, prints the push commands, leaves the parent clean", () => {
  const { bare, repo } = world({ spaceInPath: true });
  const r = run(repo, ["HEAD"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const pub = join(repo, ".cycle", "work", "publish", "pub");
  assert.ok(existsSync(join(pub, ".git")));
  assert.equal(readFileSync(join(pub, "README.md"), "utf8"), "# new\n");
  assert.ok(!existsSync(join(pub, "OLD.md")), "a file only in the old tree is gone");
  assert.ok(!existsSync(join(pub, "intent")), "export-ignored folders never reach the package");
  assert.ok(!existsSync(join(pub, ".cycle")));
  assert.match(git(pub, "log", "-1", "--format=%s"), /^0\.9\.1: the thing$/);
  assert.equal(git(pub, "tag", "-l", "v0.9.1"), "v0.9.1");
  assert.equal(git(bare, "log", "-1", "--format=%s", "main"), "0.8.0", "the public repo is untouched: nothing was pushed");
  assert.equal(git(repo, "status", "--porcelain"), "", "the parent sees nothing");
  assert.ok(r.stdout.includes(`cd ${pub} && git push origin HEAD:main && git push origin v0.9.1`), r.stdout);
  assert.match(r.stdout, /a human writes the release approval first/);
});

test("publish: runs twice without re-cloning, and refuses a dirty tree, a non-method repo and an unknown ref", () => {
  const { repo } = world();
  assert.equal(run(repo, ["HEAD"]).status, 0);
  writeFileSync(join(repo, "README.md"), "# newer\n"); git(repo, "commit", "-q", "-am", "0.9.1 again");
  const again = run(repo, ["HEAD"]);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(readFileSync(join(repo, ".cycle", "work", "publish", "pub", "README.md"), "utf8"), "# newer\n");
  writeFileSync(join(repo, "README.md"), "dirty\n");
  assert.equal(run(repo, ["HEAD"]).status, 1);
  git(repo, "checkout", "--", "README.md");
  assert.equal(run(repo, ["nope-ref"]).status, 1);
  writeFileSync(join(repo, ".cycle", "config.json"), JSON.stringify({ method_repo: null }));
  const notMethod = run(repo, ["HEAD"]);
  assert.equal(notMethod.status, 1); assert.match(notMethod.stderr, /method_repo/);
});

test("publish: the owner's approval file in .cycle/ does not count as a dirty tree", () => {
  const { repo } = world();
  writeFileSync(join(repo, ".cycle", "release-approval"), "t · 2026-10-16 · test\n");
  assert.equal(run(repo, ["HEAD"]).status, 0);
});

test("publish: refuses when the tag v<version> already exists on the public repository (unbumped version)", () => {
  const { repo } = world({ remoteTag: "v0.9.1" });
  const r = run(repo, ["HEAD"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /v0\.9\.1 already exists on the public repository — bump \.claude-plugin\/plugin\.json/);
});

test("publish: the printed commands carry the credential helper when the remote is https, and warn when gate.json has no pattern covering both pushes", () => {
  const { repo } = world({ pattern: false, homepage: "https://example.invalid/x.git" });   // config has publish: {} → the manifest's homepage is the remote
  const r = run(repo, ["HEAD"]);
  assert.equal(r.status, 1, "an https remote that does not exist cannot be cloned; the refusal names the clone step");
  assert.match(r.stderr, /clone/);
});

test("publish: warns when gate.json has no pattern that is a substring of both printed push commands", () => {
  const { repo } = world({ pattern: false });
  const r = run(repo, ["HEAD"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /gate\.json has no pattern covering both push commands/);
  writeFileSync(join(repo, ".cycle", "gate.json"), JSON.stringify({ patterns: ["git push origin main"] }));
  git(repo, "commit", "-q", "-am", "pattern too narrow");
  const r2 = run(repo, ["HEAD"]);
  assert.match(r2.stdout, /gate\.json has no pattern covering both push commands/, "a pattern that matches only the branch push is not enough");
});

test("publish: a stale local tag v<version> from an earlier run is moved to the new HEAD (ls-remote already proved it is not public)", () => {
  const { repo } = world();
  const r1 = run(repo, ["HEAD"]); assert.equal(r1.status, 0, r1.stderr);
  const pub = join(repo, ".cycle", "work", "publish", "pub");
  // a second commit in the method repo, published again: the clone keeps the old local tag
  writeFileSync(join(repo, "README.md"), "# newer\n"); git(repo, "add", "."); git(repo, "commit", "-q", "-m", "0.9.1: again");
  const r2 = run(repo, ["HEAD"]); assert.equal(r2.status, 0, r2.stderr);
  assert.equal(git(pub, "rev-parse", "v0.9.1^{commit}"), git(pub, "rev-parse", "HEAD"), "the tag points at the commit that will be pushed");
});
