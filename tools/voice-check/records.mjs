/* G13, rules 4 to 6: the chain of record. The keeper bytes a person accepted
   are still the bytes on disk; the word table (tools/voice-words.csv) covers
   the bank and its derived files match a fresh derivation; and the lock file
   (tools/voice-lock.json) agrees with the pack, the pins and the renderer.
   What each record must say is this gate's oracle. */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { derive } from "../gen-voice-lock.mjs";

/* Order-independent deep equality, so two honest serialisations never differ. */
const stable = (v) => Array.isArray(v) ? "[" + v.map(stable).join(",") + "]"
  : v && typeof v === "object" ? "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}"
  : JSON.stringify(v);

/* A python dict literal read out of the renderer's own source. */
function pyDict(renderSrc, name) {
  const m = renderSrc.match(new RegExp("^" + name + " = \\{([\\s\\S]*?)^\\}", "m"));
  const out = {};
  if (m) for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  return out;
}

/* Two keepers cannot be reproduced from their pins: sad and sat come from a
   carrier family ("asr_carrier_1") whose sentence the handoff never records.
   For those the approved BYTES are the source of truth, pinned by hash, so a
   routine re-render cannot silently replace audio a person accepted. */
export function checkKeeperBytes(keeperBytes, dir) {
  const problems = [];
  for (const [w, want] of Object.entries(keeperBytes)) {
    const f = `${dir}/w-${w}.mp3`;
    if (!existsSync(f)) { problems.push(`keeper clip missing: ${f}`); continue; }
    const got = createHash("sha256").update(readFileSync(f)).digest("hex");
    if (got !== want) problems.push(`keeper ${w} is not the accepted audio (sha ${got.slice(0, 12)}, approved ${want.slice(0, 12)})`);
  }
  return problems;
}

/* The word table (tools/voice-words.csv): the permanent repository a person
   edits. Everything else derives from it, so the gate re-derives and
   compares - a hand edit that skipped regeneration, a missing row, or an
   unlocked word quietly tuned all fail here. */
export function checkCsv(csvText, script, treatments, keeperBytes) {
  if (!csvText) return ["tools/voice-words.csv is missing: the repository of record is gone"];
  const d = derive(csvText);
  const problems = [...d.problems];
  const bank = new Set(script.filter((c) => c.id.startsWith("w:")).map((c) => c.id.slice(2)));
  const rowWords = new Set(d.rows.map((x) => x.word));
  for (const w of bank) if (!rowWords.has(w)) problems.push(`voice-words.csv has no row for bank word: ${w}`);
  for (const w of rowWords) if (!bank.has(w)) problems.push(`voice-words.csv has a row for a word not in the bank: ${w}`);
  if (stable(d.treatments) !== stable(treatments))
    problems.push("keepers-treatments.json disagrees with voice-words.csv - regenerate: node tools/gen-voice-lock.mjs");
  if (stable(d.pins) !== stable(keeperBytes))
    problems.push("keeper-bytes.json disagrees with voice-words.csv - regenerate: node tools/gen-voice-lock.mjs");
  return problems;
}

/* Every word the recipe treats, and every keeper, must have its row in the lock. */
const RECIPE_LISTS = ["phoneme_words", "period_words", "onset_trim_words"];
const RECIPE_MAPS = ["trim_ms", "bright_head_ms", "lead_override", "word_speed_override", "head_trim_ms", "carrier_cut", "asr_pinned"];
function treatedWords(r, keeperBytes) {
  const listed = RECIPE_LISTS.flatMap((k) => r[k] || []);
  const mapped = RECIPE_MAPS.flatMap((k) => Object.keys(r[k] || {}));
  return new Set([...listed, ...mapped, ...Object.keys(keeperBytes)]);
}

/* The renderer's own tables and encoder setting, against the lock's copy. */
function lockAgainstRenderer(lock, renderSrc) {
  const problems = [];
  const ph = lock.phoneme_strings || {};
  if (stable(ph.words || {}) !== stable(pyDict(renderSrc, "PHONEMES")))
    problems.push("voice-lock phoneme strings disagree with the renderer");
  if (stable(ph.sentences || {}) !== stable(pyDict(renderSrc, "SENTENCE_PHONEMES")))
    problems.push("voice-lock sentence phonemes disagree with the renderer");
  const q = renderSrc.match(/enc\.set_quality\((\d+)\)/);
  if (!lock.encoder || lock.encoder.quality !== Number(q && q[1]))
    problems.push("voice-lock encoder settings disagree with the renderer");
  return problems;
}

/* The lock file (tools/voice-lock.json): the ONE document that states every
   knob behind every locked word. It is only trustworthy if it cannot drift
   from the pack, so every gated section is compared here. */
export function checkLock(lock, r, keeperBytes, renderSrc) {
  if (!lock) return ["tools/voice-lock.json is missing: the locked words are not captured"];
  const problems = [];
  if (stable(lock.recipe) !== stable(r))
    problems.push("voice-lock recipe disagrees with the shipped pack - regenerate: node tools/gen-voice-lock.mjs");
  if (stable(lock.byte_pins || {}) !== stable(keeperBytes))
    problems.push("voice-lock byte pins disagree with tools/keeper-bytes.json");
  problems.push(...lockAgainstRenderer(lock, renderSrc));
  const words = lock.words || {};
  for (const w of treatedWords(r, keeperBytes))
    if (!words[w]) problems.push(`voice-lock is missing word: ${w}`);
  return problems;
}
