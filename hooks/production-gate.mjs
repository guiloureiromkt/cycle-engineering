// cycle-engineering · production gate (PreToolUse on Bash, dispatched by pre-bash.mjs).
// Blocks a command that looks like a production deploy unless a human left a release approval.
// The repo judged is the one each SEGMENT acts on, falling back to the session's own (see _lib.gateRepo).
// Since 2026-10-16 the gate judges what will RUN, segment by segment (hooks/_lib.mjs commandView + walk):
// prose in comments, quoted-tag heredocs and sink quotes is not a command; a match that lives only there is
// grey → ask (the host's own prompt). Everything else, quotes included, is judged exactly as before.
// CYCLE_GATE_LEGACY=1, set by a person, restores whole-string judgement.
import { join, resolve, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { root, today, readJson, gateRepo, repoFor, isMain, main, viewFor, walk, gateLog, remoteTail, approvalFiles, approvalWritePath, readApproval, stateDir } from "./_lib.mjs";
import { checkApproval, explain } from "./_approval.mjs";

export const DEFAULTS = [
  /--prod\b/, /--target production/, /--env production/,
  /deploy.*production|production.*deploy/,
  /gh run rerun/, /gh workflow run/,
  /wrangler deploy/, /fly deploy/, /railway up/,
];

const READ_ONLY = /^\s*(?:grep|rg|ag|cat|less|head|tail|wc|find|ls|tree|stat|file|diff|git\s+(?:log|show|diff|status|blame|ls-files|rev-parse|branch\s+--list)|echo|printf)\b/;
const NOT_READ_ONLY = /\$\(|`|<\(|>|-(?:exec|execdir|ok|okdir)\b|--pre\b/;

function currentBranch(repo) {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().toLowerCase() || null;
  } catch { return null; }   // git missing or not a repo → cannot resolve → allow
}

/** Legacy (whole-string) push target, kept for the fallback path: the branch at judgement time. */
export function pushTargetLegacy(cmd, repo) {
  const m = cmd.match(/\bgit\b[^&|;\n]*?\bpush\b([^&|;\n]*)/);
  if (!m) return null;
  const args = m[1].trim().split(/\s+/).filter(Boolean);
  const positional = args.filter(a => !a.startsWith("-"));
  if (args.includes("--tags") && positional.length < 2) return null;
  const refspec = positional[1];
  if (refspec) {
    const dst = refspec.split(":").pop().replace(/^\+/, "").replace(/^refs\/heads\//, "");
    return dst === "head" ? currentBranch(repo) : dst;
  }
  return currentBranch(repo);
}

/** Branch a `git push` segment lands on (lowercase); `unknown` when HEAD is pushed from an unknown branch. */
export function pushTarget(segText, branch) {
  const m = segText.match(/\bgit\b[^;&|\n]*?\bpush\b(.*)$/);
  if (!m) return { target: null };
  const args = m[1].trim().split(/\s+/).filter(Boolean);
  const positional = args.filter(a => !a.startsWith("-"));
  if (args.includes("--tags") && positional.length < 2) return { target: null };
  const refspec = positional[1];
  if (refspec) { const dst = refspec.split(":").pop().replace(/^\+/, "").replace(/^refs\/heads\//, ""); if (dst !== "head") return { target: dst }; }
  return branch ? { target: branch } : { target: null, unknown: true };
}

function rulesHit(text, patterns) {
  const hit = DEFAULTS.find(r => r.test(text))?.source ?? null;
  if (hit) return hit;
  const p = patterns.find(p => text.includes(p));
  return p ? `gate.json pattern "${p}"` : null;
}

/** The approval checks of this run, by repository: the refusal explains them. */
const lastCheck = new Map();

function approved(repo) {
  const sessionRepo = repoFor(root());
  if (process.env.RELEASE_APPROVAL && sessionRepo && sessionRepo === repo) return true;
  const c = checkApproval(repo); lastCheck.set(repo, c);
  return c.ok;
}

function configOf(repo) {
  const cfg = readJson(join(repo, ".cycle/config.json"), {});
  const gate = readJson(join(repo, ".cycle/gate.json"), {});
  return {
    protectedBranches: (Array.isArray(cfg?.protected_branches) ? cfg.protected_branches : ["main"]).map(b => String(b).toLowerCase()),
    patterns: (Array.isArray(gate?.patterns) ? gate.patterns : []).map(p => String(p).toLowerCase()).filter(Boolean),
  };
}

const cut = (raw) => (raw.length > 300 ? raw.slice(0, 300) + " […]" : raw);

function refusal(raw, repo, hit, where) {
  const f = approvalWritePath(repo); const st = stateDir(repo); const shared = st.shared;
  const c = lastCheck.get(repo) || checkApproval(repo);
  const sessionRepo = repoFor(root());
  const sameRepo = sessionRepo && sessionRepo === repo;
  const scopeMiss = process.env.RELEASE_APPROVAL && !sameRepo
    ? `\nRELEASE_APPROVAL is set, but it was approved elsewhere in this session, not here: it covers ${sessionRepo || "the session's own repo"}, and this command acts on ${repo}.`
    : "";
  const firstTime = !sameRepo ? `\nThis repository was not gated from this session before; it is now.` : "";
  return `cycle · PRODUCTION GATE: this command looks like a production deploy (matched: ${hit}${where}) and there is no release approval.
${explain(c, repo)}
Command: ${cut(raw)}
Repository judged: ${repo}${scopeMiss}${firstTime}
A human (not the agent) does ONE of:
  1. export RELEASE_APPROVAL="<name> <reason>" in a session rooted in that repository, or
  2. in a terminal of your own:
       ${shared ? `mkdir -p '${dirname(f)}' && ` : ""}printf '%s\\n' '<name> · ${c.today} · <what is being released>' > '${f}'${shared ? `\n     ${st.worktrees > 1 ? `Every one of the ${st.worktrees} registered worktrees of this repository sees it, on any branch; ` : ""}${join(repo, ".cycle/release-approval")} still works for that checkout alone.` : ""}
Then run the command again. The agent never creates this file or variable. Repo-specific deploy commands go in ${join(repo, ".cycle/gate.json")} "patterns". The host may still apply its own permission rules after this gate.`;
}

// ─── the method's own publish (2026-10-16, reworked after the final review) ─────────
// A push to the method's public repository is judged by a method repository, wherever the command runs from.
// The guard asks git what the command would act on instead of guessing from the text: for a push it collects every
// directory the command can point git at (the segment's cwd, -C, --git-dir, GIT_DIR=, "(cd X", "pushd X") and reads
// their remotes; a URL or --repo given on the line is read directly. If any of those is the method's public repo, the
// command publishes the method.
const UPSTREAM = "guiloureiromkt/cycle-engineering";      // this upstream; a fork sets .cycle/config.json → publish.remote
const GIT_PUSH_RE = /\bgit\b[^;&|\n]*?\bpush\b/;
const GH_WRITE_RE = /\bgh\s+(?:repo\s+sync|release\s+(?:create|upload|delete|edit)|pr\s+merge)\b|\bgh\s+api\b[^;&|\n]*?(?:\s-X\s*(?:POST|PUT|PATCH|DELETE)\b|\s--method\s+(?:POST|PUT|PATCH|DELETE)\b|\s-[fF]\s|\s--(?:field|raw-field|input)\b)/i;
const GIT_OPT_DIR_RE = /\bgit\b(?:\s+(?:-c\s+(?:"[^"]*"|'[^']*'|\S+)|--no-pager|--git-dir=(\S+)|--git-dir\s+(\S+)|-C\s+(?:"([^"]*)"|'([^']*)'|(\S+))))+/g;

function isMethodRepo(repo) { return !!repo && readJson(join(repo, ".cycle/config.json"), {})?.method_repo === "."; }
const gitOut = (cwd, args) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const unquote = (t) => String(t || "").replace(/^(["'])(.*)\1$/, "$2");

/** Every owner/repo tail that means "the method's public repository" (computed lazily, only for a publish-shaped segment). */
function methodTails(repos) {
  const tails = new Set([UPSTREAM]);
  const addManifest = (dir) => { try { const h = JSON.parse(readFileSync(join(dir, ".claude-plugin", "plugin.json"), "utf8")).homepage; if (h) tails.add(remoteTail(h)); } catch { /* none */ } };
  addManifest(join(fileURLToPath(import.meta.url), "..", ".."));
  if (process.env.CLAUDE_PLUGIN_ROOT) addManifest(process.env.CLAUDE_PLUGIN_ROOT);
  for (const r of repos) {
    const pub = readJson(join(r, ".cycle/config.json"), {})?.publish || {};
    for (const u of [pub.remote, ...(Array.isArray(pub.previous_remotes) ? pub.previous_remotes : [])]) if (u) tails.add(remoteTail(u));
    if (isMethodRepo(r)) { addManifest(r); const o = gitOut(r, ["remote", "get-url", "--push", "--", "origin"]); if (o) tails.add(remoteTail(o)); }
  }
  tails.delete("");
  return tails;
}

/** A method repository for the purpose of a publish: method_repo "." AND a manifest whose homepage is one of the tails
 *  (a product repo that merely sets the flag is not one). */
function isPublishingMethodRepo(repo, tails) {
  if (!isMethodRepo(repo)) return false;
  try { const h = JSON.parse(readFileSync(join(repo, ".claude-plugin", "plugin.json"), "utf8")).homepage; return !!h && tails.has(remoteTail(h)); } catch { return false; }
}

/** The approval for a publish names it: today's date, and the word publish/publica or the manifest's version. */
function approvedForPublish(repo) {
  let version = ""; try { version = JSON.parse(readFileSync(join(repo, ".claude-plugin", "plugin.json"), "utf8")).version || ""; } catch { /* none */ }
  const accept = (t) => {
    const named = [...t.matchAll(/(?<![\d.])v?(\d{1,3}\.\d+\.\d+)(?![\d.])/g)].map(m => m[1]);   // x.y.z with a short major: a date like 2026.10.17 is not a version
    if (named.length && !named.every(n => n === version)) return false;                     // a line that names a version is for that release only
    return /publi(?:sh|ca)/i.test(t) || (!!version && t.includes(version));
  };
  const c = checkApproval(repo, { accept }); lastCheck.set(repo, c);
  return c.ok;
}

/** Directories a segment can point git at: its cwd, every -C / --git-dir / GIT_DIR= / "(cd X" / "pushd X" it names. */
function gitDirsOf(segText, segRawText, cwd, raw) {
  const dirs = new Set([cwd]);
  const add = (t) => { if (!t) return; const d = unquote(t).replace(/^~(?=\/|$)/, process.env.HOME || "~"); const abs = resolve(cwd, d); dirs.add(abs.endsWith("/.git") ? abs.slice(0, -5) : abs); };
  for (const m of segRawText.matchAll(GIT_OPT_DIR_RE)) for (const g of m.slice(1)) add(g);
  for (const m of segRawText.matchAll(/(?:^|[\s;&|(])GIT_DIR=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) add(m[1] ?? m[2] ?? m[3]);
  for (const m of raw.matchAll(/(?:^|[\s;&|])\(?\s*(?:cd|pushd)\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|)]+))/g)) add(m[1] ?? m[2] ?? m[3]);
  return [...dirs].filter(d => existsSync(d));
}

/** The owner/repo tails a push segment can reach: a URL or --repo on the line, the named remote, else every remote of every directory it can act on. */
function pushTails(segText, segRawText, cwd, raw) {
  const out = new Set();
  const m = segText.match(/\bpush\b(.*)$/);
  const argsText = m ? m[1] : "";
  const repoFlag = argsText.match(/--repo(?:=|\s+)(\S+)/);
  const args = argsText.trim().split(/\s+/).filter(Boolean);
  let name = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^(?:-o|--push-option|--receive-pack|--exec|--repo)$/.test(a)) { i++; continue; }
    if (a.startsWith("-")) continue;
    name = unquote(a); break;
  }
  if (repoFlag) { const v = unquote(repoFlag[1]); if (/[:/]/.test(v)) out.add(remoteTail(v)); else name = v; }
  if (name && /[:/]/.test(name)) out.add(remoteTail(name));
  const dirs = gitDirsOf(segText, segRawText, cwd, raw);
  const computed = !!name && !/[:/]/.test(name) && !/^[\w.-]+$/.test(name);
  for (const d of dirs) {
    if (name && !computed && !/[:/]/.test(name)) { const u = gitOut(d, ["remote", "get-url", "--push", "--", name]); if (u) out.add(remoteTail(u)); }
    for (const line of gitOut(d, ["remote", "-v"]).split("\n")) { const u = line.split(/\s+/)[1]; if (u) out.add(remoteTail(u)); }   // any remote of a repo the command can act on
  }
  out.delete("");
  return { tails: out, computed, dirs };
}

/** Returns a {block} when the command publishes the method from outside a method repository, or from inside one without an
 *  approval that names the publish; null otherwise. Runs before everything else, and on the raw text when the view fell back. */
function publishGuard(raw, segs, sessionRepo) {
  const shaped = segs.filter(s => GIT_PUSH_RE.test(s.text) || GH_WRITE_RE.test(s.text));
  if (!shaped.length) return null;
  const repos = [...new Set([sessionRepo, ...segs.map(s => s.repo)].filter(Boolean))];
  const tails = methodTails(repos);
  const mention = (text) => [...tails].some(t => text.toLowerCase().includes(t));
  for (const seg of shaped) {
    const text = seg.text;
    let hit = mention(text);
    if (!hit && GIT_PUSH_RE.test(text)) {
      const pt = pushTails(text, seg.rawText || text, seg.cwd, raw);
      if (pt.computed && !pt.tails.size) return { block: `cycle · PRODUCTION GATE: the remote of this git push is computed at run time, so the gate cannot see where it goes. Name the remote or the URL literally.\nCommand: ${cut(raw)}` };
      hit = [...pt.tails].some(t => tails.has(t)) || (!pt.tails.size && mention(raw));
    }
    if (!hit && GH_WRITE_RE.test(text) && !/\s(?:--repo|-R)\s/.test(text)) {
      for (const d of gitDirsOf(text, seg.rawText || text, seg.cwd, raw)) for (const line of gitOut(d, ["remote", "-v"]).split("\n")) { const u = line.split(/\s+/)[1]; if (u && tails.has(remoteTail(u))) hit = true; }
    }
    if (!hit) continue;
    const here = isPublishingMethodRepo(seg.repo, tails) ? seg.repo : (isPublishingMethodRepo(sessionRepo, tails) && seg.repo === sessionRepo ? sessionRepo : null);
    const logTo = (r) => { if (r && existsSync(join(r, ".cycle"))) gateLog(r, "deny", "publish of the method", "segment"); };
    if (here) {
      if (approvedForPublish(here)) return null;
      logTo(here);
      return { block: `cycle · PRODUCTION GATE: this is a publish of the method (the remote is its public repository) and ${approvalWritePath(here)} does not approve it today. A human writes that file with today's date and the word "publish" or the version being released. The agent never creates it.\n${explain(lastCheck.get(here) || checkApproval(here), here)}\nCommand: ${cut(raw)}\nRepository judged: ${here}\n` };
    }
    const known = [sessionRepo, ...repos].find(r => isPublishingMethodRepo(r, tails)) || null;
    const script = known ? join(known, "scripts", "publish.mjs") : "<method repository>/scripts/publish.mjs";
    const pubDir = known ? join(known, ".cycle", "work", "publish", "pub") : "<method repository>/.cycle/work/publish/pub";
    logTo(known); if (sessionRepo !== known) logTo(sessionRepo);
    return { block: `cycle · PRODUCTION GATE: this is a publish of the method from outside its repository (the remote is the method's public repository). No approval opens this path.
Prepare the publish inside the method repository and push from the clone it creates:
  node ${script} <ref>
  then the commands it prints, from ${pubDir}
Command: ${cut(raw)}` };
  }
  return null;
}

export function run(input) {
  const raw = String(input?.tool_input?.command || "");
  if (!raw) return { block: null };
  const sessionRepo = gateRepo(input);
  const sessionCwd = typeof input?.cwd === "string" && existsSync(input.cwd) ? input.cwd : root();
  const legacy = process.env.CYCLE_GATE_LEGACY === "1";
  const view = legacy ? null : viewFor(raw);
  // The method's own publish is judged first, on every path, gated session or not (2026-10-16).
  const segsForGuard = (!view || view.fallback || !view.segments.length)
    ? [{ text: raw, cwd: sessionCwd, repo: repoFor(sessionCwd) ?? sessionRepo }]
    : walk(view, { cwd: sessionCwd });
  const guarded = publishGuard(raw, segsForGuard, sessionRepo);
  if (guarded) return guarded;
  if (!sessionRepo) return { block: null };

  if (legacy || !view || view.fallback || !view.segments.length) {                // today's behaviour, whole string
    const { protectedBranches, patterns } = configOf(sessionRepo);
    const cmd = raw.toLowerCase();
    let hit = rulesHit(cmd, patterns);
    if (!hit) { const t = pushTargetLegacy(cmd, sessionRepo); if (t && protectedBranches.includes(t)) hit = `push to protected branch ${t}`; }
    if (!hit) return { block: null };
    if (approved(sessionRepo)) return { block: null };
    gateLog(sessionRepo, "deny", hit, legacy ? "legacy" : "fallback");
    return { block: refusal(raw, sessionRepo, hit, legacy ? " (CYCLE_GATE_LEGACY=1: parsed as a whole)" : " (parsed as a whole: parser fallback)") };
  }

  const readOnlyCommand = view.segments.every(s => READ_ONLY.test(s.text.toLowerCase())) && !NOT_READ_ONLY.test(view.text);
  const segs = walk(view, { cwd: sessionCwd });
  const hits = [];           // { repo, hit, where }
  let grey = null;
  for (const [k, seg] of segs.entries()) {
    const repo = seg.repo ?? sessionRepo;                                       // the union rule: never nobody
    const { protectedBranches, patterns } = configOf(repo);
    const text = seg.text.toLowerCase();
    const where = ` in segment ${k + 1}: \`${seg.text.trim().slice(0, 120)}\``;
    const h = rulesHit(text, readOnlyCommand ? [] : patterns);
    if (h) { hits.push({ repo, hit: h, where }); continue; }
    const pt = pushTarget(text, seg.branch ? seg.branch.toLowerCase() : null);
    if (pt.target && protectedBranches.includes(pt.target)) { hits.push({ repo, hit: `push to protected branch ${pt.target}`, where }); continue; }
    if (pt.unknown) {
      if (seg.seed && protectedBranches.includes(seg.seed.toLowerCase())) hits.push({ repo, hit: `push from an unknown branch; the repository started on protected ${seg.seed}`, where });
      else if (!grey) grey = { repo, reason: `a git push whose branch cannot be known at this point${where}` };
    }
  }
  for (const h of hits) {
    if (approved(h.repo)) continue;
    gateLog(h.repo, "deny", h.hit, "segment");
    return { block: refusal(raw, h.repo, h.hit, h.where) };
  }
  if (hits.length) return { block: null };                                       // every hit approved
  if (!grey && !readOnlyCommand) {
    const removedText = view.removed.map(r => r.text).join("\n").toLowerCase();
    const { patterns } = configOf(sessionRepo);
    const h = rulesHit(removedText, patterns);
    if (h) grey = { repo: sessionRepo, reason: `the words that match ${h} are only inside text being written or recorded (${[...new Set(view.removed.map(r => r.kind))].join(", ")}); nothing in the command deploys` };
  }
  if (!grey) return { block: null };
  gateLog(grey.repo, "ask", grey.reason.slice(0, 60), "removed");
  return { ask: `${grey.reason}. Allow if that is right.\nCommand: ${cut(raw)}\nRepository judged: ${grey.repo}` };
}

if (isMain(import.meta.url)) main(run);
