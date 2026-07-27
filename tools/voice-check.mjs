/* Voice-pack gate (G13). The shipped default pack must cover the engine's
   whole clip inventory: every bank word and fixed sentence has a clip file
   with a sane duration, and the pack holds no orphan clips. The inventory
   comes from the live engine, so a bank that grows past its voice fails the
   build (SPEC section 5a).
   The pack also carries the RECIPE that produced it, and this gate pins it.
   Audio quality is the one thing no automated check can judge, so what a
   machine can do instead is refuse a pack rendered with settings no person
   ever heard. Every number below was set by a listener on 2026-07-27 after
   clips were found saying "at" for "cat" and "n" for "an".
   Negative control: --self-test removes one word from a copy of the manifest,
   plants an orphan, and alters the recipe; the detector must report all. */
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
      /* The manifest must not lie about durations: at 48 kbps CBR the file
         holds 6.2-6.6 bytes per millisecond (measured across the whole pack).
         A fabricated ms or a truncated file lands outside 5-8. */
      const ratio = size / Math.max(m.ms, 1);
      if (ratio < 5 || ratio > 8) problems.push(`size does not match duration: ${clip.id} (${size} bytes for ${m.ms} ms)`);
    }
  }
  /* The approved recipe, as literal values (rule E4). A pack rendered with
     anything else has not been listened to. */
  const APPROVED = {
    voice: "af_heart", bitrate: 48, word_speed: 0.85, sentence_speed: 1,
    lead_ms: 80, tail_ms: 300, fade_ms: 10,
  };
  const r = manifest.__recipe;
  if (!r) problems.push("the pack declares no recipe: it cannot be shown to be the approved render");
  else {
    for (const [k, want] of Object.entries(APPROVED))
      if (r[k] !== want) problems.push(`recipe ${k} is ${JSON.stringify(r[k])}, approved is ${JSON.stringify(want)}`);
    /* Two-letter words are read wrongly from spelling. Every one of them must
       be rendered from an approved pronunciation instead. */
    const short = script.filter((c) => c.id.startsWith("w:") && c.id.length === 4).map((c) => c.id.slice(2));
    const covered = new Set(r.phoneme_words || []);
    for (const w of short) if (!covered.has(w)) problems.push(`two-letter word rendered from spelling: ${w}`);
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
  const noRecipe = { ...manifest };
  delete noRecipe.__recipe;
  const sawNoRecipe = check(noRecipe, false).problems.some((p) => p.startsWith("the pack declares no recipe"));
  if (sawMissing && sawOrphan && sawLie && sawRecipe && sawSpelling && sawNoRecipe) {
    console.log("self-test OK: a removed word clip, a planted orphan, a lying duration, a drifted recipe, a two-letter word left to spelling, and a pack with no recipe at all are caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMissing, sawOrphan, sawLie, sawRecipe, sawSpelling, sawNoRecipe }));
  process.exit(1);
}

const { required, shipped, problems } = check(manifest, true);
console.log(`Voice pack: ${required} clips required, ${shipped} shipped, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
