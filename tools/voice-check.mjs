/* Voice-pack gate (G13). The shipped default pack must cover the engine's
   whole clip inventory: every bank word and fixed sentence has a clip file
   with a sane duration, and the pack holds no orphan clips. The inventory
   comes from the live engine, so a bank that grows past its voice fails the
   build (SPEC section 5a).
   The pack also carries the RECIPE that produced it, and this gate pins it.
   Audio quality is the one thing no automated check can judge, so what a
   machine can do instead is refuse a pack rendered with settings no person
   ever heard. Every number below was set by a listener on 2026-07-27, first
   after clips were found saying "at" for "cat" and "n" for "an", then after a
   spot-check heard "hip-uh" for "hip" and a slurred sh in "dish".
   Negative control: --self-test removes one word from a copy of the manifest,
   plants an orphan, alters the recipe, trims a word nobody heard, and puts the
   praise sentence containing "read" back to spelling; the detector must report
   all of them. */
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { voiceScript } from "../src/engine.js";
import { derive } from "./gen-voice-lock.mjs";

const RENDER_SRC = readFileSync("tools/render-voice-pack.py", "utf8");
const LOCK = existsSync("tools/voice-lock.json")
  ? JSON.parse(readFileSync("tools/voice-lock.json", "utf8")) : null;
const CSV_TEXT = existsSync("tools/voice-words.csv")
  ? readFileSync("tools/voice-words.csv", "utf8") : null;

/* Order-independent deep equality, so two honest serialisations never differ. */
const stable = (v) => Array.isArray(v) ? "[" + v.map(stable).join(",") + "]"
  : v && typeof v === "object" ? "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}"
  : JSON.stringify(v);
const pyDict = (name) => {
  const m = RENDER_SRC.match(new RegExp("^" + name + " = \\{([\\s\\S]*?)^\\}", "m"));
  const out = {};
  if (m) for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  return out;
};

const DIR = "app/public/voice";
const HERE = dirname(fileURLToPath(import.meta.url));
const TREAT_PATH = join(HERE, "keepers-treatments.json");
const TREATMENTS = existsSync(TREAT_PATH)
  ? JSON.parse(readFileSync(TREAT_PATH, "utf8"))
  : {};
/* the marker that tells a human the file is generated is not a word */
for (const k of Object.keys(TREATMENTS)) if (k.startsWith("_")) delete TREATMENTS[k];

function check(manifest, verifyFiles, lock = LOCK, csvText = CSV_TEXT) {
  const problems = [];
  const script = voiceScript();
  for (const clip of script) {
    const m = manifest[clip.id];
    if (!m) { problems.push(`missing clip: ${clip.id} ("${clip.text}")`); continue; }
    /* One floor for every clip now that nothing is stretched: the shortest
       real clip in the pack is 448 ms, so anything under 400 ms is a
       truncation, not a short word. */
    /* A WORD clip has a word in it and nothing else. The longest word in the
       pack runs 1318 ms with its silences, so 1500 is a generous ceiling and a
       clip beyond it is carrying something that is not the word. This comes
       from a real defect: an attempt to give six words the prosody of a
       sentence shipped the whole sentence - "Here is the word cup." - at
       1640 to 1800 ms, and no other check would have noticed.
       Sentences and praise keep the wide ceiling. */
    const ceiling = clip.id.startsWith("w:") ? 1500 : 8000;
    if (typeof m.ms !== "number" || m.ms < 400 || m.ms > ceiling)
      problems.push(`duration out of range: ${clip.id} at ${m.ms} ms (limit ${ceiling})`);
    if (verifyFiles) {
      const p = `${DIR}/${m.file}`;
      if (!existsSync(p)) { problems.push(`missing file: ${p}`); continue; }
      const size = statSync(p).size;
      if (size < 1000) problems.push(`suspiciously small file: ${p}`);
      /* The manifest must not lie about durations: at 96 kbps CBR the file
         holds 12.3-12.9 bytes per millisecond (measured across the whole pack).
         A fabricated ms or a truncated file lands outside 10-15. */
      const ratio = size / Math.max(m.ms, 1);
      if (ratio < 10 || ratio > 15) problems.push(`size does not match duration: ${clip.id} (${size} bytes for ${m.ms} ms)`);
    }
  }
  /* The approved recipe, as literal values (rule E4). A pack rendered with
     anything else has not been listened to. */
  const APPROVED = {
    voice: "af_heart", bitrate: 96, word_speed: 0.85, sentence_speed: 1,
    lead_ms: 80, tail_ms: 300, fade_ms: 10,
  };
  /* Three words end with an extra syllable the synthesiser adds after a final
     plosive, and one has a fricative that runs too long. The listener chose
     how much to cut from each. A pack that trims a different amount, or trims
     a word nobody listened to, has not been approved. */
  let APPROVED_TRIM = { cub: 130, hip: 130, dish: 120 };
  /* Two blind rounds, 2026-07-27 and 2026-07-28. Four words are spoken with a
     full stop after them, because a word standing alone gets no sentence shape
     and the voice never finishes its last consonant. One has what precedes its
     first burst removed, and one has the low frequencies taken out of its first
     70 ms so its s cannot read as a z. Each won a numbered, shuffled round in
     which the build of the day was one of the candidates — and the same
     treatment was REFUSED for the bank at large, because four of five words
     already judged perfect came back worse.
     This is NOT the carrier cut below: a full stop is appended to the word and
     the whole utterance ships. "hop" left this list for that treatment when a
     listener failed its full-stop rendering outright. */
  const APPROVED_PERIOD = new Set(["cup", "had", "jug", "pop", "rub"]);
  const APPROVED_ONSET = new Set(["ham", "tap"]);
  const APPROVED_BRIGHT = { sip: 70, jam: 40 };
  const APPROVED_LEAD_OVERRIDE = { am: 150, an: 150, had: 150 };
  const APPROVED_WORD_SPEED_OVERRIDE = { hat: 0.82 };
  const APPROVED_HEAD_TRIM = {};
  /* Round 13 bank: hen stays energy-gap. Remediation hop moved to ASR+head_trim
     (packs 2–3). Energy carriers and ASR pins merge from keepers-treatments.json. */
  const APPROVED_CARRIER = {
    hen: ["hen, hen.", 150, -30, 40],
    /* man is NOT one of the 57 keepers. The handoff grades its own man
       "marginal pass, accept if best of 6"; this clip was heard the same day
       as "almost perfect" in round 14 and stands. 250 ms was tried in that
       round and reaches into the carrier - "word man". */
    man: ["Here is the word, man.", 150, -20, 20],
  };
  const APPROVED_ASR = {};
  for (const [w, t] of Object.entries(TREATMENTS)) {
    if (Math.abs((t.speed ?? 0.85) - 0.85) > 1e-9) APPROVED_WORD_SPEED_OVERRIDE[w] = t.speed;
    if ((t.lead_ms ?? 80) !== 80) APPROVED_LEAD_OVERRIDE[w] = t.lead_ms;
    if (t.period) APPROVED_PERIOD.add(w);
    if (t.onset_trim) APPROVED_ONSET.add(w);
    if ((t.bright_head_ms ?? 0) > 0) APPROVED_BRIGHT[w] = t.bright_head_ms;
    if ((t.head_trim_ms ?? 0) > 0) APPROVED_HEAD_TRIM[w] = t.head_trim_ms;
    /* and a treatment REMOVES what it does not ask for, so the gate and the
       renderer read the pins the same way: sip's 70 ms brighten, tap's onset
       trim and hip's 130 ms trim all predate these keepers. */
    if (!t.period) APPROVED_PERIOD.delete(w);
    if (!t.onset_trim) APPROVED_ONSET.delete(w);
    if (!(t.bright_head_ms ?? 0)) delete APPROVED_BRIGHT[w];
    if (!(t.head_trim_ms ?? 0)) delete APPROVED_HEAD_TRIM[w];
    if ((t.trim_ms ?? 0) > 0) APPROVED_TRIM[w] = t.trim_ms;
    else delete APPROVED_TRIM[w];
    const mode = (t.carrier_cut_mode || "energy").toLowerCase();
    const carrier = t.carrier;
    if (carrier && (mode === "asr" || mode === "asr_pinned") && t.asr_start != null) {
      APPROVED_ASR[w] = [String(carrier[0]).replaceAll("{w}", w), t.asr_start, t.asr_end];
    } else if (carrier && mode === "energy") {
      APPROVED_CARRIER[w] = [
        String(carrier[0]).replaceAll("{w}", w),
        carrier[1], carrier[2], carrier[3],
      ];
    }
  }
  const APPROVED_PERIOD_LIST = [...APPROVED_PERIOD].sort();
  const APPROVED_ONSET_LIST = [...APPROVED_ONSET].sort();
  /* Two keepers cannot be reproduced from their pins: sad and sat come from a
     carrier family ("asr_carrier_1") whose sentence the handoff never records.
     For those the approved BYTES are the source of truth, pinned here by hash,
     so a routine re-render cannot silently replace audio a person accepted. */
  const KEEPER_BYTES = JSON.parse(readFileSync("tools/keeper-bytes.json", "utf8"));
  for (const k of Object.keys(KEEPER_BYTES)) if (k.startsWith("_")) delete KEEPER_BYTES[k];
  if (verifyFiles) {
    for (const [w, want] of Object.entries(KEEPER_BYTES)) {
      const f = `${DIR}/w-${w}.mp3`;
      if (!existsSync(f)) { problems.push(`keeper clip missing: ${f}`); continue; }
      const got = createHash("sha256").update(readFileSync(f)).digest("hex");
      if (got !== want) problems.push(`keeper ${w} is not the accepted audio (sha ${got.slice(0,12)}, approved ${want.slice(0,12)})`);
    }
  }
  const r = manifest.__recipe;
  if (!r) problems.push("the pack declares no recipe: it cannot be shown to be the approved render");
  else {
    for (const [k, want] of Object.entries(APPROVED))
      if (r[k] !== want) problems.push(`recipe ${k} is ${JSON.stringify(r[k])}, approved is ${JSON.stringify(want)}`);
    const trim = r.trim_ms || {};
    for (const [w, want] of Object.entries(APPROVED_TRIM))
      if (trim[w] !== want) problems.push(`recipe trims ${w} by ${JSON.stringify(trim[w])} ms, approved is ${want} ms`);
    for (const w of Object.keys(trim))
      if (!(w in APPROVED_TRIM)) problems.push(`recipe trims a word nobody approved: ${w}`);
    const list = (name, want, got) => {
      const have = [...(got || [])].sort().join(" ");
      if (have !== want.join(" ")) problems.push(`recipe ${name} is [${have}], approved is [${want.join(" ")}]`);
    };
    list("period_words", APPROVED_PERIOD_LIST, r.period_words);
    list("onset_trim_words", APPROVED_ONSET_LIST, r.onset_trim_words);
    const bright = r.bright_head_ms || {};
    for (const [w, want] of Object.entries(APPROVED_BRIGHT))
      if (bright[w] !== want) problems.push(`recipe brightens ${w} over ${JSON.stringify(bright[w])} ms, approved is ${want} ms`);
    for (const w of Object.keys(bright))
      if (!(w in APPROVED_BRIGHT)) problems.push(`recipe brightens a word nobody approved: ${w}`);
    const leadOv = r.lead_override || {};
    for (const [w, want] of Object.entries(APPROVED_LEAD_OVERRIDE))
      if (leadOv[w] !== want) problems.push(`recipe lead_override ${w} is ${JSON.stringify(leadOv[w])}, approved is ${want}`);
    for (const w of Object.keys(leadOv))
      if (!(w in APPROVED_LEAD_OVERRIDE)) problems.push(`recipe lead_override for a word nobody approved: ${w}`);
    const speedOv = r.word_speed_override || {};
    for (const [w, want] of Object.entries(APPROVED_WORD_SPEED_OVERRIDE))
      if (speedOv[w] !== want) problems.push(`recipe word_speed_override ${w} is ${JSON.stringify(speedOv[w])}, approved is ${want}`);
    for (const w of Object.keys(speedOv))
      if (!(w in APPROVED_WORD_SPEED_OVERRIDE)) problems.push(`recipe word_speed_override for a word nobody approved: ${w}`);
    const headTrim = r.head_trim_ms || {};
    for (const [w, want] of Object.entries(APPROVED_HEAD_TRIM))
      if (headTrim[w] !== want) problems.push(`recipe head_trim ${w} is ${JSON.stringify(headTrim[w])}, approved is ${want}`);
    for (const w of Object.keys(headTrim))
      if (!(w in APPROVED_HEAD_TRIM)) problems.push(`recipe head_trim for a word nobody approved: ${w}`);
    const carrier = r.carrier_cut || {};
    for (const [w, want] of Object.entries(APPROVED_CARRIER)) {
      const got = carrier[w];
      if (JSON.stringify(got) !== JSON.stringify(want))
        problems.push(`recipe cuts ${w} from ${JSON.stringify(got)}, approved is ${JSON.stringify(want)}`);
    }
    for (const w of Object.keys(carrier))
      if (!(w in APPROVED_CARRIER)) problems.push(`recipe cuts a word out of a carrier nobody approved: ${w}`);
    const asr = r.asr_pinned || {};
    for (const [w, want] of Object.entries(APPROVED_ASR)) {
      if (JSON.stringify(asr[w]) !== JSON.stringify(want))
        problems.push(`recipe asr_pinned ${w} is ${JSON.stringify(asr[w])}, approved is ${JSON.stringify(want)}`);
    }
    for (const w of Object.keys(asr))
      if (!(w in APPROVED_ASR)) problems.push(`recipe asr_pinned a word nobody approved: ${w}`);
    /* The guard is part of the cut. [asr_start, asr_end] alone reproduces
       nothing - learned by sweeping 31 accepted clips to byte identity - so a
       pack that declares different guards, or none, was not rendered from the
       accepted recipe. */
    const guards = r.asr_guard_ms || {};
    for (const [w, t] of Object.entries(TREATMENTS)) {
      if (t.asr_guard_lead_ms == null) continue;
      const want = [t.asr_guard_lead_ms, t.asr_guard_tail_ms];
      if (JSON.stringify(guards[w]) !== JSON.stringify(want))
        problems.push(`recipe asr guard for ${w} is ${JSON.stringify(guards[w])}, approved is ${JSON.stringify(want)}`);
    }
    for (const w of Object.keys(guards))
      if (!(TREATMENTS[w] && TREATMENTS[w].asr_guard_lead_ms != null))
        problems.push(`recipe declares an asr guard nobody approved: ${w}`);
    /* The lock file (tools/voice-lock.json): the ONE document that states
       every knob behind every locked word. It is only trustworthy if it
       cannot drift from the pack, so every gated section is compared here. */
    /* The word table (tools/voice-words.csv): the permanent repository a
       person edits. Everything else derives from it, so the gate re-derives
       and compares - a hand edit that skipped regeneration, a missing row, or
       an unlocked word quietly tuned all fail here. */
    if (!csvText) problems.push("tools/voice-words.csv is missing: the repository of record is gone");
    else {
      const d = derive(csvText);
      problems.push(...d.problems);
      const bank = new Set(script.filter((c) => c.id.startsWith("w:")).map((c) => c.id.slice(2)));
      const rowWords = new Set(d.rows.map((x) => x.word));
      for (const w of bank) if (!rowWords.has(w)) problems.push(`voice-words.csv has no row for bank word: ${w}`);
      for (const w of rowWords) if (!bank.has(w)) problems.push(`voice-words.csv has a row for a word not in the bank: ${w}`);
      if (stable(d.treatments) !== stable(TREATMENTS))
        problems.push("keepers-treatments.json disagrees with voice-words.csv - regenerate: node tools/gen-voice-lock.mjs");
      if (stable(d.pins) !== stable(KEEPER_BYTES))
        problems.push("keeper-bytes.json disagrees with voice-words.csv - regenerate: node tools/gen-voice-lock.mjs");
    }
    if (!lock) problems.push("tools/voice-lock.json is missing: the locked words are not captured");
    else {
      if (stable(lock.recipe) !== stable(r))
        problems.push("voice-lock recipe disagrees with the shipped pack - regenerate: node tools/gen-voice-lock.mjs");
      if (stable(lock.byte_pins || {}) !== stable(KEEPER_BYTES))
        problems.push("voice-lock byte pins disagree with tools/keeper-bytes.json");
      const ph = lock.phoneme_strings || {};
      if (stable(ph.words || {}) !== stable(pyDict("PHONEMES")))
        problems.push("voice-lock phoneme strings disagree with the renderer");
      if (stable(ph.sentences || {}) !== stable(pyDict("SENTENCE_PHONEMES")))
        problems.push("voice-lock sentence phonemes disagree with the renderer");
      const q = RENDER_SRC.match(/enc\.set_quality\((\d+)\)/);
      if (!lock.encoder || lock.encoder.quality !== Number(q && q[1]))
        problems.push("voice-lock encoder settings disagree with the renderer");
      const treatedWords = new Set([
        ...(r.phoneme_words || []), ...(r.period_words || []), ...(r.onset_trim_words || []),
        ...Object.keys(r.trim_ms || {}), ...Object.keys(r.bright_head_ms || {}),
        ...Object.keys(r.lead_override || {}), ...Object.keys(r.word_speed_override || {}),
        ...Object.keys(r.head_trim_ms || {}), ...Object.keys(r.carrier_cut || {}),
        ...Object.keys(r.asr_pinned || {}), ...Object.keys(KEEPER_BYTES),
      ]);
      for (const w of treatedWords)
        if (!(lock.words && lock.words[w])) problems.push(`voice-lock is missing word: ${w}`);
    }
    /* Two-letter words are read wrongly from spelling. Every one of them must
       be rendered from an approved pronunciation instead. */
    const short = script.filter((c) => c.id.startsWith("w:") && c.id.length === 4).map((c) => c.id.slice(2));
    const covered = new Set(r.phoneme_words || []);
    for (const w of short) if (!covered.has(w)) problems.push(`two-letter word rendered from spelling: ${w}`);
    /* A sentence can teach the wrong sound too. "You read that word all by
       yourself!" was spoken with "read" in the present tense, to a child who
       had just read the word. Any sentence containing a word whose spelling
       carries two pronunciations must be given as sounds, never left to the
       synthesiser. The list of such words is read from the sentences
       themselves, so a new sentence is covered from the moment it is added. */
    const AMBIGUOUS = ["read", "live", "wind", "tear", "lead", "bow", "row", "close"];
    const spoken = new Set(r.phoneme_sentences || []);
    for (const c of script) {
      if (c.id.startsWith("w:")) continue;
      const word = AMBIGUOUS.find((a) => new RegExp(`\\b${a}\\b`, "i").test(c.text));
      if (word && !spoken.has(c.id))
        problems.push(`sentence left to spelling though "${word}" has two pronunciations: ${c.id} ("${c.text}")`);
    }
  }

  const ids = new Set(script.map((c) => c.id));
  for (const id of Object.keys(manifest))
    if (id !== "__recipe" && !ids.has(id)) problems.push(`orphan clip: ${id}`);
  return { required: script.length, shipped: Object.keys(manifest).length - 1, problems };
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8"));

if (process.argv.includes("--self-test")) {
  const corrupted = { ...manifest, "x:orphan": { file: "x-orphan.mp3", ms: 900 } };
  delete corrupted["w:cat"];
  corrupted["w:sun"] = { ...manifest["w:sun"], ms: manifest["w:sun"].ms * 2 }; // a manifest that lies
  const r = check(corrupted, true);
  const sawMissing = r.problems.some((p) => p.startsWith("missing clip: w:cat"));
  const sawOrphan = r.problems.some((p) => p.startsWith("orphan clip: x:orphan"));
  const sawLie = r.problems.some((p) => p.startsWith("size does not match duration: w:sun"));
  /* A word clip carrying a whole sentence, the exact fault: 1700 ms is inside
     the old limit and outside a word's. */
  const wordy = { ...manifest, "w:cup": { ...manifest["w:cup"], ms: 1700 } };
  const sawWordy = check(wordy, false).problems.some((p) => p.startsWith("duration out of range: w:cup"));
  const sentenceOk = check({ ...manifest, "p:3": { ...manifest["p:3"], ms: 2900 } }, false)
    .problems.every((p) => !p.startsWith("duration out of range: p:3"));   // control: a sentence may be long
  /* An unheard re-render: the settings drift, every file is still present and
     the right size, and nothing else in this gate would notice. */
  const drifted = { ...manifest, __recipe: { ...manifest.__recipe, lead_ms: 0, word_speed: 1.0 } };
  const dr = check(drifted, false).problems;
  const sawRecipe = dr.some((p) => p.startsWith("recipe lead_ms")) && dr.some((p) => p.startsWith("recipe word_speed"));
  const spelled = { ...manifest, __recipe: { ...manifest.__recipe, phoneme_words: [] } };
  const sawSpelling = check(spelled, false).problems.some((p) => p.startsWith("two-letter word rendered from spelling: an"));
  /* A trim nobody heard: one approved word cut by a different amount, and one
     word cut that was never in front of a listener. */
  const trimmed = { ...manifest, __recipe: { ...manifest.__recipe, trim_ms: { cub: 260, hip: 130, dish: 120, sun: 90 } } };
  const tp = check(trimmed, false).problems;
  const sawTrim = tp.some((p) => p.startsWith("recipe trims cub by 260")) && tp.some((p) => p.startsWith("recipe trims a word nobody approved: sun"));
  /* The praise sentence that once said "reed" for "read", left to spelling
     again: the exact fault, replayed. */
  const reed = { ...manifest, __recipe: { ...manifest.__recipe, phoneme_sentences: [] } };
  const sawReed = check(reed, false).problems.some((p) => p.startsWith('sentence left to spelling though "read"'));
  /* The blind round's winners, quietly dropped or quietly widened: a word
     that stops being rendered as a sentence, and a word nobody heard given
     the same treatment. */
  const unheard = { ...manifest, __recipe: { ...manifest.__recipe, period_words: ["cup", "hop", "jug", "pop", "sun"], onset_trim_words: [], bright_head_ms: { jam: 200 } } };
  const up = check(unheard, false).problems;
  const sawRound9 = up.some((p) => p.startsWith("recipe period_words is")) &&
    up.some((p) => p.startsWith("recipe onset_trim_words is")) &&
    up.some((p) => p.startsWith("recipe brightens jam over 200"));
  /* Round 13 / remediation: alter hen's energy cut, plant an unheard energy
     carrier, and drift an ASR pin. */
  const recut = { ...manifest, __recipe: { ...manifest.__recipe, carrier_cut: {
    hen: ["hen, hen.", 60, -30, 40],
    sun: ["Here is the word, sun.", 150, -20, 20],
  }, asr_pinned: {
    ...(manifest.__recipe.asr_pinned || {}),
    ...(manifest.__recipe.asr_pinned?.hop
      ? { hop: ["Say hop.", 0.1, 0.2] }
      : { hop: ["Say hop.", 0.1, 0.2] }),
  } } };
  const cp = check(recut, false).problems;
  const sawCarrier = cp.some((p) => p.startsWith("recipe cuts hen from")) &&
    cp.some((p) => p.startsWith("recipe cuts a word out of a carrier nobody approved: sun"));
  const sawAsr = Object.keys(TREATMENTS).length === 0
    || cp.some((p) => p.startsWith("recipe asr_pinned hop"));
  /* The guard quietly changed, or handed to a word with no round behind it. */
  const gdrift = { ...manifest, __recipe: { ...manifest.__recipe,
    asr_guard_ms: { ...manifest.__recipe.asr_guard_ms, bib: [10, 10], sun: [40, 40] } } };
  const gp2 = check(gdrift, false).problems;
  const sawGuard = gp2.some((p) => p.startsWith("recipe asr guard for bib is [10,10]")) &&
    gp2.some((p) => p.startsWith("recipe declares an asr guard nobody approved: sun"));
  /* The lock file drifts from the pack, or quietly loses a word. */
  const driftedLock = structuredClone(LOCK);
  driftedLock.recipe.word_speed = 1.0;
  const holedLock = structuredClone(LOCK);
  delete holedLock.words.hen;
  const sawLock = check(manifest, false, driftedLock).problems.some((p) => p.startsWith("voice-lock recipe disagrees")) &&
    check(manifest, false, holedLock).problems.some((p) => p === "voice-lock is missing word: hen") &&
    check(manifest, false, null).problems.some((p) => p.startsWith("tools/voice-lock.json is missing"));
  /* The word table loses a row, an unlocked word gets quietly tuned, and a
     derived file that no longer matches the table. */
  const holed = CSV_TEXT.split("\n").filter((l) => !l.startsWith("hen,")).join("\n");
  const tuned = CSV_TEXT.replace(/^(zig,[^,]*,no,[^,]*,[^,]*,[^,]*,[^,]*,af_heart,en-us,)0\.85,/m, "$10.7,");
  if (tuned === CSV_TEXT) throw new Error("self-test fixture: could not tune the unlocked row for zig");
  const recut2 = CSV_TEXT.replace("40,40,", "45,40,");
  const sawCsv = check(manifest, false, LOCK, holed).problems.some((p) => p === "voice-words.csv has no row for bank word: hen") &&
    check(manifest, false, LOCK, tuned).problems.some((p) => p.startsWith("unlocked word zig deviates")) &&
    check(manifest, false, LOCK, recut2).problems.some((p) => p.startsWith("keepers-treatments.json disagrees with voice-words.csv")) &&
    check(manifest, false, LOCK, null).problems.some((p) => p.startsWith("tools/voice-words.csv is missing"));
  const noRecipe = { ...manifest };
  delete noRecipe.__recipe;
  const sawNoRecipe = check(noRecipe, false).problems.some((p) => p.startsWith("the pack declares no recipe"));
  if (sawMissing && sawOrphan && sawLie && sawRecipe && sawSpelling && sawNoRecipe && sawTrim && sawReed && sawRound9 && sawCarrier && sawAsr && sawGuard && sawLock && sawCsv && sawWordy && sentenceOk) {
    console.log("self-test OK: a removed word clip, a planted orphan, a lying duration, a drifted recipe, a two-letter word left to spelling, a pack with no recipe at all, a trim nobody heard, a sentence with 'read' left to spelling, a listening round's result quietly changed, an approved carrier/ASR cut re-cut at values nobody heard, a guard changed or granted with no round behind it, a lock file that drifts or loses a word, a word-table row lost or an unlocked word quietly tuned, and a word clip long enough to hold a sentence are caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMissing, sawOrphan, sawLie, sawRecipe, sawSpelling, sawNoRecipe, sawTrim, sawReed, sawRound9, sawCarrier, sawAsr, sawGuard, sawLock, sawCsv, sawWordy, sentenceOk }));
  process.exit(1);
}

const { required, shipped, problems } = check(manifest, true);
console.log(`Voice pack: ${required} clips required, ${shipped} shipped, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
