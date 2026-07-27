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
import { voiceScript } from "../src/engine.js";

const DIR = "app/public/voice";

function check(manifest, verifyFiles) {
  const problems = [];
  const script = voiceScript();
  for (const clip of script) {
    const m = manifest[clip.id];
    if (!m) { problems.push(`missing clip: ${clip.id} ("${clip.text}")`); continue; }
    /* One floor for every clip now that nothing is stretched: the shortest
       real clip in the pack is 448 ms, so anything under 400 ms is a
       truncation, not a short word. */
    if (typeof m.ms !== "number" || m.ms < 400 || m.ms > 8000)
      problems.push(`duration out of range: ${clip.id} at ${m.ms} ms`);
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
  const APPROVED_TRIM = { cub: 130, hip: 130, dish: 120 };
  /* The blind round of 2026-07-27. Five words are rendered as a sentence,
     with a full stop, because standing alone they ended in a trailing vowel
     or a burst of noise. One has what precedes its first burst removed, and
     one has the low frequencies taken out of its first 70 ms so its s cannot
     read as a z. Each won a numbered, shuffled round in which today's build
     was one of the candidates. */
  const APPROVED_PERIOD = ["cup", "hop", "jug", "pop", "rub"];
  const APPROVED_ONSET = ["tap"];
  const APPROVED_BRIGHT = { sip: 70 };
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
    list("period_words", APPROVED_PERIOD, r.period_words);
    list("onset_trim_words", APPROVED_ONSET, r.onset_trim_words);
    const bright = r.bright_head_ms || {};
    for (const [w, want] of Object.entries(APPROVED_BRIGHT))
      if (bright[w] !== want) problems.push(`recipe brightens ${w} over ${JSON.stringify(bright[w])} ms, approved is ${want} ms`);
    for (const w of Object.keys(bright))
      if (!(w in APPROVED_BRIGHT)) problems.push(`recipe brightens a word nobody approved: ${w}`);
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
  const unheard = { ...manifest, __recipe: { ...manifest.__recipe, period_words: ["cup", "hop", "jug", "pop", "sun"], onset_trim_words: [], bright_head_ms: { sip: 200 } } };
  const up = check(unheard, false).problems;
  const sawRound9 = up.some((p) => p.startsWith("recipe period_words is")) &&
    up.some((p) => p.startsWith("recipe onset_trim_words is")) &&
    up.some((p) => p.startsWith("recipe brightens sip over 200"));
  const noRecipe = { ...manifest };
  delete noRecipe.__recipe;
  const sawNoRecipe = check(noRecipe, false).problems.some((p) => p.startsWith("the pack declares no recipe"));
  if (sawMissing && sawOrphan && sawLie && sawRecipe && sawSpelling && sawNoRecipe && sawTrim && sawReed && sawRound9) {
    console.log("self-test OK: a removed word clip, a planted orphan, a lying duration, a drifted recipe, a two-letter word left to spelling, a pack with no recipe at all, a trim nobody heard, a sentence with 'read' left to spelling, and a listening round's result quietly changed are caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMissing, sawOrphan, sawLie, sawRecipe, sawSpelling, sawNoRecipe, sawTrim, sawReed, sawRound9 }));
  process.exit(1);
}

const { required, shipped, problems } = check(manifest, true);
console.log(`Voice pack: ${required} clips required, ${shipped} shipped, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
