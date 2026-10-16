// cycle-engineering · production gate (PreToolUse on Bash, dispatched by pre-bash.mjs).
// Blocks a command that looks like a production deploy unless a human left a release approval.
// The repo judged is the one each SEGMENT acts on, falling back to the session's own (see _lib.gateRepo).
// Since 2026-10-16 the gate judges what will RUN, segment by segment (hooks/_lib.mjs commandView + walk):
// prose in comments, quoted-tag heredocs and sink quotes is not a command; a match that lives only there is
// grey → ask (the host's own prompt). Everything else, quotes included, is judged exactly as before.
// CYCLE_GATE_LEGACY=1, set by a person, restores whole-string judgement.
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { root, today, readJson, gateRepo, repoFor, isMain, main, viewFor, walk, gateLog } from "./_lib.mjs";

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
  const m = cmd.match(/\bgit\s+push\b([^&|;]*)/);
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
  const m = segText.match(/\bgit\s+(?:-c\s+\S+\s+)*push\b(.*)$/);
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

function approved(repo) {
  const sessionRepo = repoFor(root());
  if (process.env.RELEASE_APPROVAL && sessionRepo && sessionRepo === repo) return true;
  const f = join(repo, ".cycle/release-approval");
  if (!existsSync(f)) return false;
  try { return readFileSync(f, "utf8").includes(today()); } catch { return false; }
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
  const f = join(repo, ".cycle/release-approval");
  const sessionRepo = repoFor(root());
  const sameRepo = sessionRepo && sessionRepo === repo;
  const scopeMiss = process.env.RELEASE_APPROVAL && !sameRepo
    ? `\nRELEASE_APPROVAL is set, but it was approved elsewhere in this session, not here: it covers ${sessionRepo || "the session's own repo"}, and this command acts on ${repo}.`
    : "";
  const firstTime = !sameRepo ? `\nThis repository was not gated from this session before; it is now.` : "";
  return `cycle · PRODUCTION GATE: this command looks like a production deploy (matched: ${hit}${where}) and there is no release approval.
Command: ${cut(raw)}
Repository judged: ${repo}${scopeMiss}${firstTime}
A human (not the agent) does ONE of:
  1. export RELEASE_APPROVAL="<name> <reason>" in a session rooted in that repository, or
  2. write ${f} with "<name> · ${today()} · <what is being released>".
Then run the command again. The agent never creates this file or variable. Repo-specific deploy commands go in ${join(repo, ".cycle/gate.json")} "patterns". The host may still apply its own permission rules after this gate.`;
}

export function run(input) {
  const raw = String(input?.tool_input?.command || "");
  const sessionRepo = gateRepo(input);
  if (!raw || !sessionRepo) return { block: null };
  const sessionCwd = typeof input?.cwd === "string" && existsSync(input.cwd) ? input.cwd : root();
  const legacy = process.env.CYCLE_GATE_LEGACY === "1";
  const view = legacy ? null : viewFor(raw);

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
