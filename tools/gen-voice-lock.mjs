/* tools/voice-words.csv is the permanent repository of the voice: one row per
   bank word, one column per knob and decision, every cell explicit. THIS is
   the file a person edits after a listening round; nothing else is.

   Run `node tools/gen-voice-lock.mjs` after editing it. From the CSV this
   generator derives, in order:
   - tools/keepers-treatments.json  the per-word pins the renderer and G13 read
   - tools/keeper-bytes.json        sha pins for words whose BYTES are the truth
   - tools/voice-lock.json          the machine-readable aggregate, gated by G13

   G13 verifies the whole chain - CSV -> derived pins -> shipped pack -> lock -
   so a hand-edit that was not re-generated, or a re-render that disagrees with
   the CSV, fails the build. An UNLOCKED row must sit entirely on the bank
   defaults: a knob nobody approved is exactly what this system exists to
   refuse, and derive() reports it as a problem rather than passing it on. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULTS = {
  voice: "af_heart", lang: "en-us", speed: 0.85, lead_ms: 80, tail_ms: 300,
  fade_ms: 10, phoneme: "", period: "no", onset_trim: "no", trim_ms: 0,
  bright_head_ms: 0, head_trim_ms: 0, skip_burst: "no",
  carrier_text: "", carrier_cut_mode: "none",
};

/* RFC 4180: quoted fields may hold commas, quotes double. Carrier sentences
   and ear notes need both. */
export function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const num = (v) => (v === "" ? 0 : Number(v));

/* One row -> is any knob off the bank default? */
function deviates(r) {
  return Object.entries(DEFAULTS).some(([k, d]) => String(r[k]) !== String(d))
    || r.byte_pin_sha256 !== "";
}

export function derive(csvText) {
  const rows = parseCsv(csvText);
  const problems = [];
  const treatments = {}, pins = {}, words = {};
  for (const r of rows) {
    const w = r.word;
    if (r.locked !== "yes") {
      if (deviates(r)) problems.push(`unlocked word ${w} deviates from the defaults: no round approved that`);
      continue;
    }
    words[w] = {
      verdict: r.verdict, ear_notes: r.ear_notes, round: r.round,
      listen_context: r.listen_context,
      ...(r.byte_pin_sha256 ? { byte_pin_sha256: r.byte_pin_sha256 } : {}),
    };
    if (r.byte_pin_sha256) pins[w] = r.byte_pin_sha256;
    if (!deviates(r)) continue;               // locked on the defaults: a verdict, no pins
    const t = {
      word: w, verdict: r.verdict, speed: Number(r.speed), lead_ms: num(r.lead_ms),
      period: r.period === "yes", onset_trim: r.onset_trim === "yes",
      trim_ms: num(r.trim_ms), bright_head_ms: num(r.bright_head_ms),
      head_trim_ms: num(r.head_trim_ms), skip_burst: r.skip_burst === "yes",
      carrier: null, carrier_cut_mode: r.carrier_cut_mode || "none",
      asr_start: null, asr_end: null,
    };
    if (r.phoneme) t.phoneme = r.phoneme;
    if (r.carrier_cut_mode === "asr") {
      t.carrier = [r.carrier_text];
      t.asr_start = Number(r.asr_start_s); t.asr_end = Number(r.asr_end_s);
      t.asr_guard_lead_ms = num(r.asr_guard_lead_ms); t.asr_guard_tail_ms = num(r.asr_guard_tail_ms);
    } else if (r.carrier_cut_mode === "energy") {
      t.carrier = [r.carrier_text, num(r.energy_margin_ms), num(r.energy_floor_db), num(r.energy_gap_ms)];
    }
    treatments[w] = t;
  }
  return { rows, treatments, pins, words, problems };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const csvText = readFileSync("tools/voice-words.csv", "utf8");
  const { rows, treatments, pins, words, problems } = derive(csvText);
  if (problems.length) {
    problems.forEach((p) => console.error("PROBLEM: " + p));
    process.exit(1);
  }
  const RULE = "GENERATED from tools/voice-words.csv - do not edit by hand; edit the word's row and run: node tools/gen-voice-lock.mjs";
  writeFileSync("tools/keepers-treatments.json", JSON.stringify({ _rule: RULE, ...treatments }, null, 2) + "\n");
  writeFileSync("tools/keeper-bytes.json", JSON.stringify({ _rule: RULE, ...pins }, null, 2) + "\n");

  const recipe = JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8")).__recipe;
  const rendererSrc = readFileSync("tools/render-voice-pack.py", "utf8");
  const pyDict = (name) => {
    const m = rendererSrc.match(new RegExp("^" + name + " = \\{([\\s\\S]*?)^\\}", "m"));
    const out = {};
    if (m) for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
    return out;
  };
  const q = rendererSrc.match(/enc\.set_quality\((\d+)\)/);
  let environment = { model: "kokoro-v1.0.onnx", voices: "voices-v1.0.bin", libs: "unknown" };
  try {
    const pip = execSync("kokoro-env/bin/pip freeze 2>/dev/null", { encoding: "utf8" });
    environment.libs = pip.split("\n").filter((l) => /kokoro|lameenc|onnxruntime|numpy/i.test(l)).join(", ");
  } catch { /* env absent: versions stay unknown */ }

  const lock = {
    rule: "Derived from tools/voice-words.csv - the permanent repository a person edits. Regenerate: node tools/gen-voice-lock.mjs. G13 fails the build if any gated section disagrees with the CSV or the shipped pack. 'What counts as finished work' (CLAUDE.md) governs every change.",
    generated_from: "tools/voice-words.csv + app/public/voice/manifest.json + tools/render-voice-pack.py",
    recipe,
    phoneme_strings: { words: pyDict("PHONEMES"), sentences: pyDict("SENTENCE_PHONEMES") },
    encoder: {
      library: "lameenc", quality: Number(q && q[1]), channels: 1, sample_rate_hz: 24000,
      note: "byte identity depends on these; 24000 is Kokoro's output rate",
    },
    byte_pins: pins,
    words,
    environment,
  };
  writeFileSync("tools/voice-lock.json", JSON.stringify(lock, null, 1) + "\n");
  const locked = rows.filter((r) => r.locked === "yes").length;
  console.log(`from voice-words.csv: ${rows.length} rows, ${locked} locked, ${Object.keys(treatments).length} treatments, ${Object.keys(pins).length} byte pins`);
}
