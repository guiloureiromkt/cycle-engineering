// cycle-engineering · shared helpers for every hook.
// Rules that hold in all hooks (docs/CONTRACT.md):
//   - a gate acts when the repo the COMMAND acts on, or the session's own repo, has `.cycle/` (gateRepo);
//     neither one gated, no gate. Unresolved is never "allowed" — it falls back to the session (2026-09-04).
//   - exit 0 = allow · exit 1 = non-blocking error · exit 2 = block (stderr goes to Claude).
//   - git unavailable / not a repo → allow. Malformed JSON or unreadable config → block.
//   - stderr never contains "no such file" or "can't open" (Claude Code downgrades those to non-blocking).
import { readFileSync, existsSync, readdirSync, realpathSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

export const root = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const today = () => new Date().toISOString().slice(0, 10);
export const cycleOn = () => existsSync(join(root(), ".cycle"));

/** Where a Bash command acts: each `cd` folded left to right over the payload's cwd, else root(). */
export function commandDir(input) {
  try {
    const given = typeof input?.cwd === "string" ? input.cwd : "";
    let dir = given && existsSync(given) ? given : root();
    const cmd = String(input?.tool_input?.command || "");
    if (cmd && !given) noteMissingCwd(repoFor(dir));
    // Command position only: line start, or after && || ; — a path merely mentioned never moves the gate.
    for (const m of cmd.matchAll(/(?:^|&&|\|\||;)\s*cd\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/gm)) {
      const t = m[1] ?? m[2] ?? m[3] ?? "";
      if (!t || t === "-") continue;               // `cd -` is OLDPWD; untracked, so keep the last known dir
      dir = resolve(dir, t.startsWith("~") ? join(homedir(), t.slice(1)) : t);
    }
    // Flags whose whole meaning is "work in this directory" are as explicit as a cd.
    for (const m of cmd.matchAll(/(?:\bgit|\bmake|\benv)\s+(?:[^;&|]*?\s)?-C\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))|--prefix[= ](?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g)) {
      const t = m.slice(1).find(Boolean);
      if (t) dir = resolve(dir, t.startsWith("~") ? join(homedir(), t.slice(1)) : t);
    }
    // A nested shell hides its own cd: bash -c "cd /gated && …", ssh host "cd /gated && …".
    // One wrapper must not be an escape hatch out of the gates.
    const nested = cmd.match(/(?:\bbash|\bsh|\bzsh|\bssh)\s+[^;&|]*?(?:"([^"]+)"|'([^']+)')/);
    if (nested) {
      const inner = commandDir({ cwd: dir, tool_input: { command: nested[1] ?? nested[2] ?? "" } });
      if (inner) dir = inner;
    }
    return dir;
  } catch { return root(); }
}

/** Nearest ancestor carrying `.cycle/`. Stops BEFORE $HOME and at the filesystem root, so a marker in the
 *  home directory gates nothing. A nested `.git` does NOT stop the walk: a vendored repo, a submodule or a
 *  worktree inside a gated tree stays gated, which is the fail-closed direction. */
export function repoFor(from) {
  try {
    let dir = resolve(from || "/");
    const home = resolve(homedir());
    for (let i = 0; i < 64; i++) {
      if (dir === home) return null;
      if (existsSync(join(dir, ".cycle"))) return dir;
      const up = dirname(dir);
      if (up === dir) return null;
      dir = up;
    }
    return null;
  } catch { return null; }
}

/** The repo a gate judges: the command's when it resolves to a gated one, otherwise the session's when THAT
 *  is gated, otherwise null. Unresolved never means "allowed". */
export function gateRepo(input) {
  return repoFor(commandDir(input)) ?? repoFor(root());
}

/** One-shot marker: the host stopped sending a directory with the payload, so resolution is session-only.
 *  Reported and consumed by session-start, the same way hooks/run.sh's GATES-INACTIVE marker works. */
export function noteMissingCwd(repo) {
  if (!repo) return;
  try {
    const f = join(repo, ".cycle/work/NO-CWD-IN-PAYLOAD.md");
    if (existsSync(f)) return;
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, `${today()} · a Bash payload arrived with no usable \`cwd\` field.\nThe gates fell back to the session's own repository, which is the pre-2026-09 behaviour: a command sent into another repository is judged by this one, or not judged at all.\nIf this file keeps coming back, the host's hook payload changed shape and hooks/_lib.mjs needs updating.\n`);
  } catch { /* a marker that cannot be written must never break a gate */ }
}

/** Thrown by helpers when the hook must block; `runSafe` turns it into `{ block }`. */
export class HookBlock extends Error {}

/** Strip the two phrases Claude Code treats as "hook file missing" so a real block stays a block. */
export const safeMessage = (s) => String(s).replace(/no such file/gi, "missing path").replace(/can't open/gi, "cannot read");

export function block(msg) {
  process.stderr.write(safeMessage(msg) + "\n");
  process.exit(2);
}

const PRESENT = new Set(["default", "plan", "acceptEdits", "auto"]);   // interactive modes: a person sees the prompt
/** An `ask` outcome (2026-10-16): the host's own permission prompt. It needs positive evidence of a present
 *  human — a literal interactive permission_mode (default, plan, acceptEdits, auto) in the payload; the owner's
 *  desktop sessions run in `auto` (the host's default since v2.1.283), where the prompt is still shown. A missing, renamed, non-string or
 *  unknown value, or CYCLE_UNATTENDED=1, is "nobody present" → deny with the same reason, so a headless run
 *  never auto-allows a grey case. The JSON is flushed before exit; a closed pipe denies (never reads as allow). */
export function ask(msg, input) {
  const mode = typeof input?.permission_mode === "string" ? input.permission_mode : "(absent)";
  if (process.env.CYCLE_UNATTENDED === "1" || !PRESENT.has(mode)) block(`${msg}\n(nobody present to answer — permission mode ${JSON.stringify(mode)}: ask became deny; a person answers this one later)`);
  const out = JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: safeMessage(msg) } }) + "\n";
  process.stdout.on("error", () => process.exit(2));
  process.stdout.write(out, (e) => process.exit(e ? 2 : 0));   // a closed pipe (EPIPE) reaches the callback first: deny, never an empty allow
}

export function readStdinJson() {
  let raw = "";
  try { raw = readFileSync(0, "utf8"); } catch { raw = ""; }
  try { return JSON.parse(raw.trim() || "{}"); }
  catch (e) { block(`cycle hook: could not parse tool input (${e.message})`); }
}

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw new HookBlock(`cycle hook: ${path} could not be read (${e.message})`); }
  try { return JSON.parse(raw); }
  catch (e) { throw new HookBlock(`cycle hook: ${path} is not valid JSON (${e.message})`); }
}

export function frontmatterStatus(file) {
  try {
    const m = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const s = m && m[1].match(/^status:\s*(\S+)/m);
    return s ? s[1] : null;
  } catch { return null; }
}

export function listMd(dir, base) {
  const p = join(base, dir);
  if (!existsSync(p)) return [];
  try {
    return readdirSync(p).filter(f => f.endsWith(".md") && !f.startsWith("_")).map(f => join(p, f));
  } catch { return []; }
}

export const hasAcceptedPlan = (base) => listMd("plans", base).some(f => frontmatterStatus(f) === "accepted");

/** Run a gate's `run(input)` (sync or async) and normalise the outcome to `{ block, ask }` (each string|null). */
export async function runSafe(run, input) {
  try { const r = await run(input); return { block: r?.block ?? null, ask: r?.ask ?? null }; }
  catch (e) {
    if (e instanceof HookBlock) return { block: e.message, ask: null };
    // Unexpected failure: fail loud rather than silently letting the action through.
    return { block: `cycle hook: internal error (${e && e.message ? e.message : e})`, ask: null };
  }
}

/** True when `url` (import.meta.url) is the module node was started with, i.e. run directly. */
export function isMain(url) {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return realpathSync(p); } catch { return p; } };
  return real(resolve(process.argv[1])) === real(fileURLToPath(url));
}

/** Standard entry point for a gate executed on its own: read stdin, run, block, ask or allow. */
export function main(run) {
  const input = readStdinJson();
  runSafe(run, input).then((r) => {
    if (r.block) block(r.block);
    if (r.ask) ask(r.ask, input); else process.exit(0);
  }).catch((e) => block(`cycle hook: internal error (${e && e.message ? e.message : e})`));
}

// ─── a git remote as an owner/repo tail (2026-10-16) ───────────────────────────
/** The `owner/repo` tail of a git remote spelled any way: https://github.com/a/b.git, git@github.com:a/b,
 *  ssh://git@host:22/a/b, an ssh alias host:a/b, a local path /x/y/a/b.git/ — compared case-insensitively; the host is
 *  ignored on purpose (a mirror of the same owner/repo is treated as the same target, the tighter reading). */
export function remoteTail(url) {
  let u = String(url || "").trim().replace(/[/\\]+$/, "").replace(/\.git$/i, "").replace(/[/\\]+$/, "");
  u = u.replace(/^[a-z+]+:\/\//i, "").replace(/^[^@/:]+@/, "").replace(/^[^/:]+(?::\d+)?[:/]/, "");
  const parts = u.split(/[/\\]+/).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join("/").toLowerCase() : "";
}

// ─── the last routine report (2026-10-16) ─────────────────────────────────────────
/** The newest weekly-evolve report in <repo>/.cycle/work/evolve/: a dated file (`YYYY-MM-DD.md` or `YYYY-MM-DD-N.md`)
 *  whose frontmatter says `routine: weekly-evolve` and not `status: did not complete`. Owner-triggered evolve reports,
 *  stubs and suffixed companions (`-sources.md`) never move the date. One function, read by the routine's script
 *  (`--since-last-report`) and by session-start, so the two cannot drift. Returns { date, file } or null. */
export function lastEvolveReport(repo) {
  const dir = join(repo, ".cycle", "work", "evolve");
  let names = [];
  try { names = readdirSync(dir); } catch { return null; }
  const ok = names.filter((f) => /^\d{4}-\d{2}-\d{2}(-\d+)?\.md$/.test(f)).filter((f) => {
    let head = "";
    try { head = readFileSync(join(dir, f), "utf8").slice(0, 600); } catch { return false; }
    const fm = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return false;
    return /^routine:\s*weekly-evolve\s*$/m.test(fm[1]) && !/^status:\s*did not complete/m.test(fm[1]);
  }).sort();
  if (!ok.length) return null;
  const file = ok[ok.length - 1];
  return { date: file.slice(0, 10), file: join(dir, file) };
}

// ─── the shell-aware view of a command (2026-10-16, v3) ──────────────────────────
// A gate judges what will RUN. Three things are inert and leave `text` for `removed`:
//   1. a comment (# after whitespace, outside $() and backticks);
//   2. the body of a heredoc whose tag is quoted (<<'E' / <<"E"): no expansion happens in it;
//   3. a quoted argument of a SINK program (one that only prints, records or searches the text) that
//      contains no $(, backtick or $ — git commit -m "…", gh … --body "…", grep "…", echo "…".
// Everything else, quotes included, stays as today: ssh host "cd … && tar -x", bash -c "…",
// psql -c "DROP …", CMD="fly deploy"; $CMD, an unquoted-tag heredoc body (judged line by line).
// `keepQuotes` skips rule 3 (the caller saw a shell consumer in the command). A tokenizer failure sets
// `fallback: true` and the caller judges the raw string as before.
const SINK = /^\s*(?:env\s+\S+=\S+\s+)*(?:sudo\s+)?(?:echo|printf|cat|tee|grep|rg|ag|git\s+(?:commit|tag|notes)|gh\s+(?:pr|issue|release)\b[^|;&]*)\b/;
const INERT = (body) => !/[$`]/.test(body);

export function commandView(raw, { keepQuotes = false, keepHeredocs = false } = {}) {
  const s0 = String(raw ?? "");
  const s = s0;   // continuations are handled in the loop, outside quotes and heredoc bodies (C-1, 2026-10-16)
  const out = { raw: s0, text: "", segments: [], removed: [], fallback: false };
  let segStart = 0, segText = "", depth = 0, tick = false;
  const pending = [];
  const flush = (end) => {
    const rawText = s.slice(segStart, end);
    if (segText.trim()) out.segments.push({ text: segText, rawText });
    out.text += segText; segText = ""; segStart = end;
  };
  let i = 0; const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "\\" && (s[i + 1] === "\n" || (s[i + 1] === "\r" && s[i + 2] === "\n"))) {   // line continuation: one separator
      segText = segText.replace(/[ \t]+$/, "") + " ";
      i += s[i + 1] === "\r" ? 3 : 2;
      while (i < n && (s[i] === " " || s[i] === "\t")) i++;
      continue;
    }
    if (c === "\\" && i + 1 < n) { segText += c + s[i + 1]; i += 2; continue; }
    if (c === "$" && s[i + 1] === "'") { out.fallback = true; break; }   // $'…' honours \' : not a plain quote; judge the raw string
    if (c === "`") { tick = !tick; segText += c; i++; continue; }
    if (c === "$" && s[i + 1] === "(") { depth++; segText += "$("; i += 2; continue; }
    if (c === ")" && depth > 0) { depth--; segText += c; i++; continue; }
    if ((c === "'" || c === '"') && !tick && depth === 0) {
      let j = i + 1;
      while (j < n && s[j] !== c) { if (c === '"' && s[j] === "\\") j++; j++; }
      if (j >= n) { out.fallback = true; segText += s.slice(i); i = n; break; }
      const body = s.slice(i + 1, j);
      const restOfSegment = s.slice(j + 1).match(/^[^\n;&|]*/)?.[0] ?? "";
      const writes = />/.test(segText) || />/.test(restOfSegment);          // a sink with a redirect is a writer, not a recorder (I-3)
      if (!keepQuotes && !writes && SINK.test(segText) && INERT(body)) { out.removed.push({ kind: "quoted", text: body }); segText += `${c}…${c}`; }
      else segText += s.slice(i, j + 1);
      i = j + 1; continue;
    }
    if (c === "#" && depth === 0 && !tick && (i === 0 || /\s/.test(s[i - 1]))) {
      const j = s.indexOf("\n", i); const end = j === -1 ? n : j;
      out.removed.push({ kind: "comment", text: s.slice(i + 1, end) }); i = end; continue;
    }
    if (c === "<" && s[i + 1] === "<" && s[i + 2] === "<") { segText += "<<<"; i += 3; continue; }   // here-string: data follows
    if (c === "<" && s[i + 1] === "<" && s[i + 2] !== "<") {
      const m = s.slice(i).match(/^<<-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][\w-]*))/);
      if (m) { const tag = m[1] ?? m[2] ?? m[3]; pending.push({ tag, quoted: m[3] === undefined }); segText += `<<${tag}`; i += m[0].length; continue; }
    }
    if (c === "\n" && pending.length) {
      flush(i); i++; segStart = i; out.text += "\n";
      while (pending.length) {
        const { tag, quoted } = pending.shift(); const body = []; let closed = false;
        while (i < n) {
          const j = s.indexOf("\n", i); const line = s.slice(i, j === -1 ? n : j); i = j === -1 ? n : j + 1;
          if (line.replace(/^\t+/, "") === tag) { closed = true; break; }
          body.push(line);
        }
        if (!closed) out.fallback = true;
        if (quoted && !keepHeredocs) out.removed.push({ kind: "heredoc", tag, text: body.join("\n") });
        else for (const line of body) { segText = line; segStart = i; flush(i); out.text += "\n"; }   // an expanding body is judged line by line
      }
      segStart = i; continue;
    }
    const sep = depth === 0 && !tick ? s.slice(i).match(/^(\|\||&&|;|\n|\|)/) : null;
    if (sep && !(sep[0] === "|" && (s[i - 1] === "|" || s[i - 1] === "<" || s[i - 1] === ">"))) {
      flush(i);
      if (out.segments.length) out.segments[out.segments.length - 1].sepAfter = sep[0];
      i += sep[0].length; segStart = i; out.text += sep[0]; continue;
    }
    segText += c; i++;
  }
  flush(n);
  if (pending.length || tick || depth > 0) out.fallback = true;
  return out;
}

/** Programs that RUN the text they receive: a quote or a quoted-tag heredoc fed to one of these is executable. */
export const CONSUMER = /(?:^|[\s;&|(])(?:(?:sh|bash|zsh|eval|source|xargs|ssh|sudo|psql|mysql|sqlite3|redis-cli|mongo|mongosh|docker\s+exec)\b|\.(?=\s))/;   // `.` only as `source` (followed by a space), never `.cycle/…`

/** The view a gate judges: a first pass, then a second one that keeps sink quotes and quoted-tag heredoc bodies
 *  when a consumer appears anywhere in the command (C-3, 2026-10-16). */
export function viewFor(raw) {
  const v = commandView(raw);
  if (v.fallback) return v;
  const lower = v.text.toLowerCase();
  if (CONSUMER.test(lower) || v.segments.some(seg => CONSUMER.test(seg.text.toLowerCase()))) return commandView(raw, { keepQuotes: true, keepHeredocs: true });
  return v;
}

const BRANCH_NEW = /\bgit\s+(?:checkout|switch)\s+(?:-b|-c)\s+(\S+)/;
const BRANCH_TO = /\bgit\s+(?:checkout|switch)\s+(?!-)(\S+)\s*$/;
const BRANCH_ANY = /\bgit\s+(?:checkout|switch)\b/;

function branchExists(repo, name) {
  try { execSync(`git show-ref --verify --quiet refs/heads/${name}`, { cwd: repo, stdio: "ignore" }); return true; } catch { return false; }
}
function currentBranchOf(repo) {
  try { return execSync("git rev-parse --abbrev-ref HEAD", { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null; } catch { return null; }
}

/** Per-segment state: `cwd` (cd/-C walked on rawText), `repo` (nearest .cycle, or null), `seed` (the branch the
 *  repo was on when the command started), `branch` (before the segment runs; null = unknown), `branchAfter`.
 *  The branch carries only across `&&`; after `;` or `||` it is unknown (the previous step may have failed). */
export function walk(view, start) {
  const out = [];
  let prefix = "", repo = null, seed = null, branch = null, prevSep = "&&", first = true;
  for (const seg of view.segments) {
    prefix = prefix ? `${prefix} && ${seg.rawText}` : seg.rawText;
    const cwd = commandDir({ cwd: start.cwd, tool_input: { command: prefix } });
    const r = repoFor(cwd);
    if (first || r !== repo) { repo = r; seed = r ? currentBranchOf(r) : null; branch = seed; first = false; }
    else if (prevSep !== "&&") branch = null;
    const entry = { ...seg, cwd, repo, seed, branch };
    let m;
    if ((m = seg.text.match(BRANCH_NEW))) branch = m[1];
    else if ((m = seg.text.match(BRANCH_TO))) { if (repo && branchExists(repo, m[1])) branch = m[1]; }
    else if (BRANCH_ANY.test(seg.text)) branch = null;
    entry.branchAfter = branch;
    out.push(entry);
    prevSep = seg.sepAfter || "&&";
  }
  return out;
}

// ─── the gate's outcome log (2026-10-16) ──────────────────────────────────────────
/** One line per ask / deny / fallback in <repo>/.cycle/work/gate/gate.log: decision, kind, rule — never the command
 *  text, and never a URL's user:token part. A log that cannot be written never changes a decision. */
export function gateLog(repo, decision, rule, kind) {
  try {
    const dir = join(repo, ".cycle", "work", "gate");
    mkdirSync(dir, { recursive: true });
    const ig = join(dir, ".gitignore");
    if (!existsSync(ig)) writeFileSync(ig, "*\n");                     // the folder ignores itself, whatever the repo-level ignore says
    appendFileSync(join(dir, "gate.log"), `${new Date().toISOString()} ${decision} ${kind} ${String(rule).replace(/https?:\/\/[^\s@/]+@/g, "https://…@").slice(0, 80)}\n`);
  } catch { /* see above */ }
}
