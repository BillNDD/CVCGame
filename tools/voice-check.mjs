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
  const APPROVED_TRIM = { cub: 130, hip: 130, dish: 120 };
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
  const APPROVED_PERIOD = ["cup", "jug", "pop", "rub"];
  const APPROVED_ONSET = ["tap"];
  const APPROVED_BRIGHT = { sip: 70 };
  /* Round 13, 2026-07-29, judged 2026-07-30. Two words are spoken inside a
     carrier sentence and cut back out of it — the isolation round 10 could not
     perform, because it searched for a gap the carrier never contains. Each
     entry is [carrier, margin ms, gap floor dB, gap length ms], and every one
     of those numbers is a thing a listener heard and chose between.
     "hop" moved here OUT of period_words: its full-stop rendering was offered
     blind as one of four candidates and came back "unacceptable, still saying
     hop + uh". "hen" ships untrimmed — trimming its tail by 60 ms lost it, and
     by 100 ms clipped the n. */
  const APPROVED_CARRIER = {
    hop: ["Here is the word, hop.", 150, -20, 20],
    hen: ["hen, hen.", 150, -30, 40],
  };
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
    const carrier = r.carrier_cut || {};
    for (const [w, want] of Object.entries(APPROVED_CARRIER)) {
      const got = carrier[w];
      if (JSON.stringify(got) !== JSON.stringify(want))
        problems.push(`recipe cuts ${w} from ${JSON.stringify(got)}, approved is ${JSON.stringify(want)}`);
    }
    for (const w of Object.keys(carrier))
      if (!(w in APPROVED_CARRIER)) problems.push(`recipe cuts a word out of a carrier nobody approved: ${w}`);
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
  const unheard = { ...manifest, __recipe: { ...manifest.__recipe, period_words: ["cup", "hop", "jug", "pop", "sun"], onset_trim_words: [], bright_head_ms: { sip: 200 } } };
  const up = check(unheard, false).problems;
  const sawRound9 = up.some((p) => p.startsWith("recipe period_words is")) &&
    up.some((p) => p.startsWith("recipe onset_trim_words is")) &&
    up.some((p) => p.startsWith("recipe brightens sip over 200"));
  /* Round 13's result, quietly altered: a margin a listener never heard, a
     tail trim they explicitly rejected for hen, and a word given the carrier
     treatment nobody offered them. Each is a way an approved cut could drift
     while every clip stayed present and the right length. */
  const recut = { ...manifest, __recipe: { ...manifest.__recipe, carrier_cut: {
    hop: ["Here is the word, hop.", 60, -20, 20],
    hen: ["hen, hen.", 150, -30, 40],
    sun: ["Here is the word, sun.", 150, -20, 20],
  } } };
  const cp = check(recut, false).problems;
  const sawCarrier = cp.some((p) => p.startsWith("recipe cuts hop from")) &&
    cp.some((p) => p.startsWith("recipe cuts a word out of a carrier nobody approved: sun"));
  const noRecipe = { ...manifest };
  delete noRecipe.__recipe;
  const sawNoRecipe = check(noRecipe, false).problems.some((p) => p.startsWith("the pack declares no recipe"));
  if (sawMissing && sawOrphan && sawLie && sawRecipe && sawSpelling && sawNoRecipe && sawTrim && sawReed && sawRound9 && sawCarrier && sawWordy && sentenceOk) {
    console.log("self-test OK: a removed word clip, a planted orphan, a lying duration, a drifted recipe, a two-letter word left to spelling, a pack with no recipe at all, a trim nobody heard, a sentence with 'read' left to spelling, a listening round's result quietly changed, an approved carrier cut re-cut at a margin nobody heard, and a word clip long enough to hold a sentence are caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMissing, sawOrphan, sawLie, sawRecipe, sawSpelling, sawNoRecipe, sawTrim, sawReed, sawRound9, sawCarrier, sawWordy, sentenceOk }));
  process.exit(1);
}

const { required, shipped, problems } = check(manifest, true);
console.log(`Voice pack: ${required} clips required, ${shipped} shipped, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
