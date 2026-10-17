// cycle-engineering · the release approval's rule (2026-10-17): the owner's day. A file passes when it carries today's date as
// a token, counted in the owner's timezone; the refusal says what it expected, where it looked and why each file in front of it
// fails. The use window, the record and the move aside the plan also proposed were cut by the plan's own cut line, after the final
// review found three new ways to revive or extend an approval through them (plans/2026-10-16-the-approval-keeps-local-time-and-follows-the-worktree.md).
import { join } from "node:path";
import { readJson, approvalFiles, readApproval, stateDir } from "./_lib.mjs";

const cfgOf = (repo) => readJson(join(repo, ".cycle", "config.json"), {}) || {};
const validZone = (z) => { try { new Intl.DateTimeFormat("sv-SE", { timeZone: z }); return true; } catch { return false; } };

/** True when the zone is at UTC+0 right now (the machine of a runner or a VPS usually is). */
function atUtc(tz, ms = Date.now()) {
  try { return (new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(ms).find(p => p.type === "timeZoneName")?.value ?? "").match(/^GMT(?:[+-]0(?::00)?)?$/) !== null; } catch { return false; }
}

/** The timezone the owner's day is counted in: the machine's own zone; the zone in .cycle/config.json only on a machine at UTC+0
 *  (a runner, a VPS), because that file is the agent's to write and must not move the owner's day on the owner's machine; UTC,
 *  said aloud, when neither is usable. `ignored` names a configured zone the machine did not take. */
export function resolveTimezone(repo) {
  const raw = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const machineOk = typeof raw === "string" && raw !== "Etc/Unknown" && validZone(raw);
  const machine = machineOk ? raw : "UTC";
  const machineAtUtc = !machineOk || atUtc(machine);
  const note = machineOk ? null : `the machine's timezone could not be determined${raw ? ` (${raw})` : ""}, so UTC is used`;
  const cfg = cfgOf(repo).timezone;
  const want = typeof cfg === "string" ? cfg.trim() : "";
  if (!want) return { tz: machine, source: "machine", invalid: null, ignored: null, note };
  if (!validZone(want)) return { tz: machine, source: "machine", invalid: want, ignored: null, note };
  if (!machineAtUtc) return { tz: machine, source: "machine", invalid: null, ignored: want === machine ? null : want, note };
  return { tz: want, source: "config", invalid: null, ignored: null, note: null };
}

/** YYYY-MM-DD of an instant in a zone, built from the numeric parts and padded here: the output of a locale's date format is
 *  a side effect of that locale, not a guarantee (an ICU update could change a separator or the order). Throws when the
 *  parts are not integers in range; the caller falls back to UTC and says so. The one helper every call site uses. */
export function localDate(tz, ms = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(ms).map(x => [x.type, x.value]));
  const [y, m, d] = [Number(p.year), Number(p.month), Number(p.day)];
  if (![y, m, d].every(Number.isInteger) || y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) throw new Error(`cannot read a date from ${JSON.stringify(p)}`);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The text carries `date` as a token: not part of a longer run of digits or hyphens. */
export function hasDateToken(text, date) {
  return new RegExp(`(?<![\\d-])${date}(?![\\d-])`).test(text);
}

/** Judge the approvals of `repo` in order. `accept(text)` lets a caller add a rule (the publish guard wants the word publish or
 *  the version). Returns { ok, file, today, tz, invalid, ignored, note, source, why[] }; `why` lists, per file, why it failed. */
export function checkApproval(repo, { now = Date.now(), accept = () => true } = {}) {
  const { tz, invalid, ignored, note: zoneNote, source } = resolveTimezone(repo);
  const utcDay = new Date(now).toISOString().slice(0, 10);
  let day, dateNote = null;
  try { day = localDate(tz, now); } catch { day = utcDay; dateNote = `the date could not be read in ${tz}, so the UTC date is used`; }
  const note = [zoneNote, dateNote].filter(Boolean).join("; ") || null;
  const base = { today: day, tz, invalid, ignored, note, source };
  const why = [];
  if (stateDir(repo).blocked) return { ok: false, ...base, why };                                              // the shared folder was swapped: refuse outright, explain() says why
  for (const file of approvalFiles(repo)) {
    const a = readApproval(file, repo);
    if (!a) continue;
    if (a.unsafe) { why.push({ kind: "unsafe", file, reason: a.unsafe }); continue; }
    if (!hasDateToken(a.text, day)) { why.push({ kind: "wrong-day", file, dates: [...new Set(a.text.match(/\d{4}-\d{2}-\d{2}/g) || [])], utcMatches: hasDateToken(a.text, utcDay) }); continue; }
    if (!accept(a.text)) { why.push({ kind: "not-for-this", file }); continue; }
    return { ok: true, file, ...base, why };
  }
  return { ok: false, ...base, why };
}

/** The refusal's account of an approval check, in the order the owner needs it: a problem with the place, or a file that was
 *  refused, comes first (with what to do); then what the gate expects, where it looked, and why each other file fails. It never
 *  tells the reader to edit .cycle/config.json: that file is the agent's to write, and a zone is the owner's to choose. */
export function explain(check, repo) {
  const lines = [];
  const problem = stateDir(repo).problem;
  if (problem) lines.push(`${problem}.`);
  for (const w of check.why) if (w.kind === "unsafe") lines.push(`${w.file} ${w.reason}; the gate does not read it. Remove it (or ask the owner to), then write a regular file.`);
  lines.push(`The gate expects a line dated ${check.today} (${check.tz}). It is valid through the end of that day in that zone.`);
  lines.push(`Looked in: ${approvalFiles(repo).join(", ")}.`);
  if (check.note) lines.push(`Note: ${check.note}.`);
  if (check.ignored) lines.push(`Note: .cycle/config.json asks for the zone ${check.ignored}, but this machine keeps its own zone (${check.tz}): the configured zone is used only on a machine at UTC+0.`);
  if (check.source === "machine" && atUtc(check.tz)) lines.push(`Note: this machine's zone is ${check.tz} (UTC+0). If the owner's day is another zone, ask the owner to set "timezone" in .cycle/config.json.`);
  if (check.invalid) lines.push(`The zone "${check.invalid}" in .cycle/config.json is not a valid zone, so ${check.tz} is used.`);
  for (const w of check.why) {
    if (w.kind === "wrong-day") lines.push(`${w.file} is dated ${w.dates.join(", ") || "(no date found)"}, not today${w.utcMatches ? "; it matches the UTC date, which this gate no longer counts" : ""}.`);
    else if (w.kind === "not-for-this") lines.push(`${w.file} is dated today but is not for this publish: it needs the word "publish" or the version being released, and a version it names must be the one being released.`);
  }
  return lines.join("\n");
}
