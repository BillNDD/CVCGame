/* Generates tools/voice-lock.json — the ONE file that captures every knob
   behind every locked-in word, so "what did we approve?" never again needs a
   spelunk through Python constants, a treatments file, a manifest and a chat
   log. G13 verifies the lock agrees with the shipped pack on every gated
   section, so it cannot drift from reality; regenerate it with
   `node tools/gen-voice-lock.mjs` after any approved change.

   Sections and where each is mirrored from:
   - recipe           app/public/voice/manifest.json __recipe, verbatim
   - phoneme_strings  the PHONEMES / SENTENCE_PHONEMES tables in
                      tools/render-voice-pack.py (the IPA lived only there)
   - encoder          the lameenc settings byte-identity depends on
   - byte_pins        tools/keeper-bytes.json, verbatim
   - words            one entry per treated word: full treatment + who
                      approved it, when, and what they said
   - environment      model files and library versions, best effort, ungated */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const recipe = JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8")).__recipe;
const treatments = JSON.parse(readFileSync("tools/keepers-treatments.json", "utf8"));
const bytePins = existsSync("tools/keeper-bytes.json")
  ? JSON.parse(readFileSync("tools/keeper-bytes.json", "utf8")) : {};
const goldens = JSON.parse(readFileSync("docs/voice-goldens-packs1-3.json", "utf8"));
const rendererSrc = readFileSync("tools/render-voice-pack.py", "utf8");

/* The IPA tables, read out of the renderer source the same way doc-truth
   reads constants out of the app: the document is checked against the code,
   never retyped beside it. */
function pyDict(name) {
  const m = rendererSrc.match(new RegExp(`^${name} = \\{([\\s\\S]*?)^\\}`, "m"));
  if (!m) throw new Error(`${name} not found in render-voice-pack.py`);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  return out;
}
const num = (re, what) => {
  const m = rendererSrc.match(re);
  if (!m) throw new Error(`${what} not found in render-voice-pack.py`);
  return Number(m[1]);
};

/* Every word the recipe treats specially, from the recipe itself. */
const treated = new Set([
  ...(recipe.phoneme_words || []),
  ...(recipe.period_words || []),
  ...(recipe.onset_trim_words || []),
  ...Object.keys(recipe.trim_ms || {}),
  ...Object.keys(recipe.bright_head_ms || {}),
  ...Object.keys(recipe.lead_override || {}),
  ...Object.keys(recipe.word_speed_override || {}),
  ...Object.keys(recipe.head_trim_ms || {}),
  ...Object.keys(recipe.carrier_cut || {}),
  ...Object.keys(recipe.asr_pinned || {}),
  ...Object.keys(bytePins),
]);

const goldenByWord = {};
const gw = Array.isArray(goldens.words) ? goldens.words : Object.values(goldens.words);
for (const g of gw) goldenByWord[g.word] = g;

/* Words approved before the keeper handoff, with the round that closed each.
   Details in docs/voice-pack.md and docs/settled.md. */
const PRIOR = {
  am: { round: "phoneme + lead rebuild, 2026-07-27", verdict: "accepted", note: "spelling read it as the letter M; explicit pronunciation and 150 ms lead" },
  an: { round: "phoneme + lead rebuild, 2026-07-27", verdict: "accepted", note: "same fault and fix as am" },
  cub: { round: "spot-check trims, 2026-07-27", verdict: "accepted", note: "tail trim 130 ms removes an added syllable after the final plosive" },
  dish: { round: "spot-check trims, 2026-07-27", verdict: "accepted", note: "tail trim 120 ms; the sh ran longer than in mush" },
  cup: { round: "blind rounds 8-9, 2026-07-27/28", verdict: "accepted", note: "full stop appended; round-12 comma-carrier result is approved and unshipped (margin ambiguity, see docs/voice-pack.md)" },
  rub: { round: "blind rounds 8-9, 2026-07-27/28", verdict: "very good (beta.8)", note: "full stop appended" },
  jug: { round: "blind rounds 8-9, 2026-07-27/28", verdict: "very good (beta.8)", note: "full stop appended" },
  hen: { round: "rounds 12-13, judged 2026-07-30", verdict: "almost perfect", note: "carrier 'hen, hen.', 150 ms, floor -30 dB, gap 40 ms, NO tail trim - trims were rejected by ear" },
  man: { round: "round 14, judged 2026-08-01", verdict: "almost perfect", note: "carrier at 150 ms; keeper man ('marginal') deliberately not adopted; 250 ms reaches into the carrier" },
  hop: { round: "keeper recipe, owner-amended 2026-08-01", verdict: "perfect (version 2)", note: "keeper's head_trim 40 removed the /h/; owner chose the same recipe with head_trim 0, later adopted upstream as the corrected golden" },
};

const words = {};
for (const w of [...treated].sort()) {
  if (["at","ax","if","in","is","it","on","ox","up","us"].includes(w) && !treatments[w]) {
    words[w] = { treatment: { phoneme: true }, source: "phoneme rebuild, 2026-07-27", verdict: "accepted" };
    continue;
  }
  const t = treatments[w];
  const g = goldenByWord[w];
  const p = PRIOR[w];
  words[w] = {
    ...(t ? { treatment: t } : {}),
    ...(bytePins[w] ? { byte_pin_sha256: bytePins[w] } : {}),
    source: t && !p ? "keeper handoff, packs 1-3, accepted 2026-08-01" : p ? p.round : "recipe",
    verdict: (p && p.verdict) || (g && g.verdict) || "accepted",
    ...(g && g.ear_notes ? { ear_notes: g.ear_notes } : {}),
    ...(p && p.note ? { note: p.note } : {}),
  };
}

let environment = { model: "kokoro-v1.0.onnx", voices: "voices-v1.0.bin", libs: "unknown" };
try {
  const pip = execSync("kokoro-env/bin/pip freeze 2>/dev/null", { encoding: "utf8" });
  environment.libs = pip.split("\n").filter((l) => /kokoro|lameenc|onnxruntime|numpy/i.test(l)).join(", ");
} catch { /* env absent: versions stay unknown */ }

const lock = {
  rule: "Every knob behind every locked-in word. G13 fails the build if this file disagrees with the shipped pack. Regenerate: node tools/gen-voice-lock.mjs. Never edit by hand.",
  generated_from: "app/public/voice/manifest.json + tools/keepers-treatments.json + tools/keeper-bytes.json + docs/voice-goldens-packs1-3.json + tools/render-voice-pack.py",
  recipe,
  phoneme_strings: { words: pyDict("PHONEMES"), sentences: pyDict("SENTENCE_PHONEMES") },
  encoder: {
    library: "lameenc",
    quality: num(/enc\.set_quality\((\d+)\)/, "encoder quality"),
    channels: num(/enc\.set_channels\((\d+)\)/, "encoder channels"),
    sample_rate_hz: 24000,
    note: "byte identity depends on these; 24000 is Kokoro's output rate",
  },
  byte_pins: bytePins,
  words,
  environment,
};
writeFileSync("tools/voice-lock.json", JSON.stringify(lock, null, 1) + "\n");
console.log(`voice-lock.json: ${Object.keys(words).length} locked words, ${Object.keys(bytePins).length} byte pins`);
