#!/usr/bin/env node
// cycle-engineering · prepares the publish of the method inside its own gated tree, and never pushes.
//
//   node scripts/publish.mjs <ref>      clone or refresh the public repo into .cycle/work/publish/pub/,
//                                       replace its tree with `git archive <ref>`, commit, tag v<version>,
//                                       and print the push commands to run FROM THAT DIRECTORY.
//
// Why there: the production gate's publish guard (hooks/production-gate.mjs) refuses a push to the method's
// public repository from anywhere outside a method repository, approval or not; inside one it needs the
// repository's own .cycle/release-approval, written by a human. A clone in /tmp escaped the older gate on
// 2026-10-16 (intent/2026-10-16-a-publish-from-a-scratch-clone-escapes-the-method-gate.md).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const fail = (msg) => { console.error(`✗ publish: ${msg}`); process.exit(1); };
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const json = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return {}; } };

const ref = process.argv[2];
if (!ref) fail("usage: publish.mjs <ref>");
let root;
try { root = git(process.cwd(), "rev-parse", "--show-toplevel"); } catch { fail("not inside a git repository"); }
const cfg = json(join(root, ".cycle", "config.json"));
if (cfg.method_repo !== ".") fail('this repository is not the method (.cycle/config.json → method_repo is not "."); the publish recipe belongs to the method repository');
const dirty = git(root, "status", "--porcelain").split("\n").filter(Boolean).filter(l => !/^.. \.cycle\/release-approval$/.test(l));
if (dirty.length) fail(`the tree is not clean (${dirty.length} path(s)): an uncommitted change has no date, and the package is git archive <ref>`);
let sha;
try { sha = git(root, "rev-parse", "--verify", `${ref}^{commit}`); } catch { fail(`ref not found: ${ref}`); }
const manifest = json(join(root, ".claude-plugin", "plugin.json"));
const version = manifest.version;
if (!version) fail(".claude-plugin/plugin.json has no version");
const remote = cfg.publish?.remote || manifest.homepage;
if (!remote) fail("no public repository: set .cycle/config.json → publish.remote or plugin.json → homepage");
const tag = `v${version}`;

const dir = join(root, ".cycle", "work", "publish");
const pub = join(dir, "pub");
mkdirSync(dir, { recursive: true });
if (!existsSync(join(pub, ".git"))) {
  try { git(dir, "clone", "-q", remote, "pub"); } catch (e) { fail(`clone of ${remote} failed: ${String(e.stderr || e).trim().split("\n")[0]}`); }
} else {
  git(pub, "remote", "set-url", "origin", remote);
  try { git(pub, "fetch", "-q", "--tags", "origin"); } catch (e) { fail(`fetch from ${remote} failed: ${String(e.stderr || e).trim().split("\n")[0]}`); }
  let def; try { def = git(pub, "symbolic-ref", "--short", "refs/remotes/origin/HEAD").replace(/^origin\//, ""); } catch { def = "main"; }
  git(pub, "checkout", "-q", "-B", def, `origin/${def}`);
}
if (git(pub, "ls-remote", "--tags", "origin", `refs/tags/${tag}`)) fail(`${tag} already exists on the public repository — bump .claude-plugin/plugin.json before publishing`);

// Empty the clone's tracked tree, then lay the package down. `git rm` runs through execFileSync, not the Bash
// tool, so no hook reads it as `rm -r` (intent/2026-10-16-git-rm-is-not-rm.md). The archive is piped by spawn.
if (git(pub, "ls-files")) git(pub, "rm", "-r", "-q", "--", ".");
const archive = spawnSync("git", ["-C", root, "archive", sha], { maxBuffer: 256 * 1024 * 1024 });
if (archive.status !== 0) fail(`git archive failed: ${archive.stderr}`);
const untar = spawnSync("tar", ["-x", "-C", pub], { input: archive.stdout });
if (untar.status !== 0) fail(`tar failed: ${untar.stderr}`);
git(pub, "add", "-A");
const subject = git(root, "log", "-1", "--format=%s", sha);
const body = `Built from the working repository at ${sha.slice(0, 7)} (ref ${ref}) by scripts/publish.mjs. The package is git archive of that commit; .gitattributes export-ignore decides what never leaves.`;
let committed = false;
try { git(pub, "commit", "-q", "-m", subject, "-m", body); committed = true; }
catch (e) { if (!/nothing to commit|nothing added/.test(String(e.stderr || e))) throw e; }
git(pub, "tag", "-f", "-a", tag, "-m", version);   // ls-remote proved the tag is not public: a stale local one from an earlier run is replaced
const tagged = true;
const branch = git(pub, "rev-parse", "--abbrev-ref", "HEAD");

const cred = /^https?:\/\//.test(remote) ? "git -c credential.helper= -c credential.helper='!gh auth git-credential'" : "git";
const cmds = [`${cred} push origin HEAD:${branch}`, `${cred} push origin ${tag}`];
const patterns = (json(join(root, ".cycle", "gate.json")).patterns || []).map(p => String(p).toLowerCase());
const covered = patterns.some(p => cmds.every(c => c.toLowerCase().includes(p)));
const lines = [
  `prepared ${committed ? "a new commit" : "no new commit (tree identical)"} in ${pub} on ${branch}; tag ${tag}${tagged ? "" : " (already in the clone)"}`,
  "Nothing was pushed. Run, from that directory, so the method repository's gate judges it:",
  "",
  `  cd ${pub} && ${cmds[0]} && ${cmds[1]}`,
  "",
  `The gate refuses until a human writes .cycle/release-approval first: "<name> · <today> · publish ${version}". Never set the variable or write the file from an agent.`,
];
if (!covered) lines.push(`⚠ publish: .cycle/gate.json has no pattern covering both push commands; the publish guard still applies (the remote is the method's), but add "git push origin" to patterns so every push to this remote is gated.`);
console.log(lines.join("\n"));
