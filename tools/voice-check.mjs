/* Voice-pack gate (G13). The shipped default pack must cover the engine's
   whole clip inventory: every bank word and fixed sentence has a clip file
   with a sane duration, and the pack holds no orphan clips. The inventory
   comes from the live engine, so a bank that grows past its voice fails the
   build (SPEC section 5a).
   The pack also carries the RECIPE that produced it, and this gate pins it.
   Audio quality is the one thing no automated check can judge, so what a
   machine can do instead is refuse a pack rendered with settings no person
   ever heard.

   THE RULES LIVE UNDER tools/voice-check/, one function per rule (batch 1 of
   the refactor, 2026-09-13: check() was one function of complexity 154 and
   240 lines, holding the whole gate). This file keeps the orchestration -
   the order the rules run in and what each is handed - and the controls.
     inventory.mjs   every clip present, edged, inside its band, on disk; no orphan
     recipe.mjs      the approved tables against the recipe inside the pack
     records.mjs     the keeper bytes, the word table and the lock file
     sentences.mjs   two-letter words carried or pinned; ambiguous sentences settled

   Negative control: --self-test removes one word from a copy of the manifest,
   plants an orphan, alters the recipe, trims a word nobody heard, and puts the
   praise sentence containing "read" back to spelling; the detector must report
   all of them. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { voiceScript } from "../src/engine.js";
import { finish } from "./lib/selftest.mjs";
import { printProblems, verdict } from "./lib/report.mjs";
import { checkInventory, checkOrphans } from "./voice-check/inventory.mjs";
import { approvedTables, checkRecipe, checkGuards } from "./voice-check/recipe.mjs";
import { checkKeeperBytes, checkCsv, checkLock } from "./voice-check/records.mjs";
import { checkShortWords, checkAmbiguous } from "./voice-check/sentences.mjs";

const RENDER_SRC = readFileSync("tools/render-voice-pack.py", "utf8");
const LOCK = existsSync("tools/voice-lock.json")
  ? JSON.parse(readFileSync("tools/voice-lock.json", "utf8")) : null;
const CSV_TEXT = existsSync("tools/voice-words.csv")
  ? readFileSync("tools/voice-words.csv", "utf8") : null;

const DIR = "app/public/voice";
/* The sentence-take ledger (tools/pending-words/pending-words.json): for every
   shipped sentence take it records the text the child sees, the `say` text the
   voice was actually given when they differ (the SAY/SHOW split the owner's
   2026-08-19 "read" refusals forced - see tools/render_sbatch18.py), the round
   and verdict, and the sha256 of the exact bytes the listener heard. */
const SAY_LEDGER = existsSync("tools/pending-words/pending-words.json")
  ? JSON.parse(readFileSync("tools/pending-words/pending-words.json", "utf8")) : {};
const HERE = dirname(fileURLToPath(import.meta.url));
const TREAT_PATH = join(HERE, "keepers-treatments.json");
const TREATMENTS = existsSync(TREAT_PATH)
  ? JSON.parse(readFileSync(TREAT_PATH, "utf8"))
  : {};
/* the marker that tells a human the file is generated is not a word */
for (const k of Object.keys(TREATMENTS)) if (k.startsWith("_")) delete TREATMENTS[k];
const KEEPER_BYTES = JSON.parse(readFileSync("tools/keeper-bytes.json", "utf8"));
for (const k of Object.keys(KEEPER_BYTES)) if (k.startsWith("_")) delete KEEPER_BYTES[k];

/* The rules that need a recipe, in the order they have always run. */
function recipeRules(r, script, manifest, lock, csvText, ledger) {
  return [
    ...checkRecipe(r, approvedTables(TREATMENTS)),
    ...checkGuards(r, TREATMENTS),
    ...checkCsv(csvText, script, TREATMENTS, KEEPER_BYTES),
    ...checkLock(lock, r, KEEPER_BYTES, RENDER_SRC),
    ...checkShortWords(script, r, KEEPER_BYTES),
    ...checkAmbiguous(script, manifest, r, ledger, DIR),
  ];
}

export function check(manifest, verifyFiles, lock = LOCK, csvText = CSV_TEXT, scriptOverride = null, ledgerOverride = null) {
  /* scriptOverride exists for the self-test alone: since the praise line
     containing "read" was replaced (2026-08-03), no real sentence carries a
     two-pronunciation word, so the replay of that fault must plant one. */
  const script = scriptOverride || voiceScript();
  const problems = checkInventory(script, manifest, verifyFiles, DIR);
  if (verifyFiles) problems.push(...checkKeeperBytes(KEEPER_BYTES, DIR));
  const r = manifest.__recipe;
  if (!r) problems.push("the pack declares no recipe: it cannot be shown to be the approved render");
  else problems.push(...recipeRules(r, script, manifest, lock, csvText, ledgerOverride || SAY_LEDGER));
  problems.push(...checkOrphans(script, manifest));
  return { required: script.length, shipped: Object.keys(manifest).length - 1, problems };
}

/* The command half is guarded, so an import gets check() and runs nothing. */
const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;
const manifest = RUN_AS_COMMAND ? JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8")) : null;

if (RUN_AS_COMMAND && process.argv.includes("--self-test")) {
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
  /* The sound band, both ends. A whole word dropped into a sound slot reads
     as 900 ms and would have passed under the 8000 ms ceiling these clips
     used to share with sentences; a truncated sound reads as 40 ms. Both are
     faults a child would hear as a wrong sound-out, and neither shows up
     anywhere else in this gate. */
  const fatSound = check({ ...manifest, "d:k": { ...manifest["d:k"], ms: 900, lead: 0, tail: 0 } }, false)
    .problems.some((p) => p.startsWith("duration out of range: d:k"));
  const thinSound = check({ ...manifest, "d:k": { ...manifest["d:k"], ms: 30, lead: 0, tail: 0 } }, false)
    .problems.some((p) => p.startsWith("duration out of range: d:k"));
  /* Control, and the reason the word floor could not simply be reused: a real
     approved sound is SHORTER than any word - the shipped /k/ holds 70 ms of
     speech. Control also that the band reads SPEECH: /sh/ is a 792 ms file
     with 170 ms of sound in it, and a band on file length would reject it. */
  const shortSoundOk = check(manifest, false)
    .problems.every((p) => !p.startsWith("duration out of range: d:"));
  /* A pack that forgot to record its edges. Every sound-out gap is then a
     guess, and nothing else here would notice. */
  const noEdges = { ...manifest };
  noEdges["d:k"] = { file: manifest["d:k"].file, ms: manifest["d:k"].ms };
  const sawNoEdges = check(noEdges, false).problems.some((p) => p === "clip declares no speech edges: d:k");
  /* An unheard re-render: the settings drift, every file is still present and
     the right size, and nothing else in this gate would notice. */
  const drifted = { ...manifest, __recipe: { ...manifest.__recipe, lead_ms: 0, word_speed: 1.0 } };
  const dr = check(drifted, false).problems;
  const sawRecipe = dr.some((p) => p.startsWith("recipe lead_ms")) && dr.some((p) => p.startsWith("recipe word_speed"));
  /* Since the uplift every real two-letter word is carried or pinned, so the
     plant adds a NEW one with no pronunciation, no carrier and no pin -
     exactly the future fault this rule still guards. */
  const spelledScript = [...voiceScript(), { id: "w:qq", text: "qq" }];
  const spelledManifest = { ...manifest, "w:qq": { file: "w-qq.mp3", ms: 900 } };
  const sawSpelling = check(spelledManifest, false, LOCK, CSV_TEXT, spelledScript)
    .problems.some((p) => p.startsWith("two-letter word rendered from spelling: qq"));
  /* A trim nobody heard. Before the uplift pass cub, hip and dish carried
     approved trims and this plant checked a changed value; the uplift re-won
     all three without a trim, so the same plant is now an unapproved trim on
     each, and the changed-value detector is proven on the one surviving
     brighten (rat, in the round-9 plant below). */
  const trimmed = { ...manifest, __recipe: { ...manifest.__recipe, trim_ms: { cub: 260, sun: 90 } } };
  const tp = check(trimmed, false).problems;
  const sawTrim = tp.some((p) => p === "recipe trims a word nobody approved: cub") && tp.some((p) => p === "recipe trims a word nobody approved: sun");
  /* The praise sentence that once said "reed" for "read", left to spelling
     again: the exact fault, replayed. The line itself was replaced on
     2026-08-03, so the replay plants an ambiguous sentence into the script —
     the detector must still catch the next one the moment it is written. */
  const reedScript = [...voiceScript(), { id: "p:99", text: "You read that word!" }];
  const reedManifest = { ...manifest, "p:99": { file: "p99.mp3", ms: 1500 } };
  const sawReed = check(reedManifest, false, LOCK, CSV_TEXT, reedScript)
    .problems.some((p) => p.startsWith('sentence left to spelling though "read"'));
  /* The say path, both ways it can lie. A ledger row whose say leaves "read"
     as "read" settles nothing and must read as left-to-spelling; a row whose
     say is right but whose sha is not the shipped bytes is a take nobody
     heard wearing an approved row's clothes. */
  const gapLedger = { "p:99": { text: "You read that word!", say: "You read that word!", sha256: "0".repeat(64) } };
  const sawSayGap = check(reedManifest, false, LOCK, CSV_TEXT, reedScript, gapLedger)
    .problems.some((p) => p.startsWith('sentence left to spelling though "read"'));
  const driftLedger = { "p:99": { text: "You read that word!", say: "You red that word!", verdict: "perfect", sha256: "0".repeat(64) } };
  const driftManifest = { ...manifest, "p:99": { file: "s-v3-l69-02.mp3", ms: 3669 } };
  const sawSayDrift = check(driftManifest, false, LOCK, CSV_TEXT, reedScript, driftLedger)
    .problems.some((p) => p === "ambiguous take's shipped bytes are not the bytes the listener heard: p:99");
  /* The identity hole the audit found: "wind" is its own legal respelling in
     the renderer's table, so only the differ rule refuses an identity say. */
  const windScript = [...voiceScript(), { id: "p:98", text: "The wind was cold!" }];
  const windManifest = { ...manifest, "p:98": { file: "p98.mp3", ms: 1500 } };
  const identLedger = { "p:98": { text: "The wind was cold!", say: "The wind was cold!", verdict: "perfect", sha256: "0".repeat(64) } };
  const sawSayIdent = check(windManifest, false, LOCK, CSV_TEXT, windScript, identLedger)
    .problems.some((p) => p.startsWith('sentence left to spelling though "wind"'));
  /* The hyphen hole: "wind-up" trips the detector but slipped the whitespace
     tokenizer, so an equal-count say settled vacuously before the split. */
  const hyScript = [...voiceScript(), { id: "p:97", text: "It has a wind-up toy!" }];
  const hyManifest = { ...manifest, "p:97": { file: "p97.mp3", ms: 1500 } };
  const hyLedger = { "p:97": { text: "It has a wind-up toy!", say: "It has a wind-up toy!", verdict: "perfect", sha256: "0".repeat(64) } };
  const sawSayHyphen = check(hyManifest, false, LOCK, CSV_TEXT, hyScript, hyLedger)
    .problems.some((p) => p.startsWith('sentence left to spelling though "wind"'));
  /* A row the listener REFUSED, wearing a perfect say: the verdict rules. */
  const vetoLedger = { "p:99": { text: "You read that word!", say: "You red that word!", verdict: "no good", sha256: "0".repeat(64) } };
  const sawSayVeto = check(reedManifest, false, LOCK, CSV_TEXT, reedScript, vetoLedger)
    .problems.some((p) => p.startsWith('sentence left to spelling though "read"'));
  /* The byte pin: point the pinned id at a different real file and the hash
     no longer matches the take the owner heard. */
  const pinDrift = { ...manifest, "s:v3-l100-01": { ...manifest["s:v3-l100-01"], file: "s-v3-l69-02.mp3" } };
  const sawPinDrift = check(pinDrift, false)
    .problems.some((p) => p.startsWith("pinned ambiguous take changed bytes: s:v3-l100-01"));
  /* The pin's other axis: same bytes, drifted sentence text. */
  const pinTextScript = voiceScript().map((c) => c.id === "s:v3-l100-01" ? { ...c, text: "Look how far you got, and look how fast you read now." } : c);
  const sawPinText = check(manifest, false, LOCK, CSV_TEXT, pinTextScript)
    .problems.some((p) => p.startsWith("pinned ambiguous take's text drifted: s:v3-l100-01"));
  /* The blind round's winners, quietly dropped or quietly widened: a word
     that stops being rendered as a sentence, and a word nobody heard given
     the same treatment. */
  /* Re-pointed for the uplift landscape: the approved period list is now
     ["rich"], the approved onset list is empty (so the plant must be
     non-empty to drift), and rat carries the one surviving brighten - its
     changed value proves the detector arm the trim plant lost. */
  const unheard = { ...manifest, __recipe: { ...manifest.__recipe, period_words: ["cup", "hop", "jug", "pop", "sun"], onset_trim_words: ["sun"], bright_head_ms: { rat: 200, jam: 200 } } };
  const up = check(unheard, false).problems;
  const sawRound9 = up.some((p) => p.startsWith("recipe period_words is")) &&
    up.some((p) => p.startsWith("recipe onset_trim_words is")) &&
    up.some((p) => p.startsWith("recipe brightens rat over 200")) &&
    up.some((p) => p === "recipe brightens a word nobody approved: jam");
  /* Round 13 / remediation: alter hen's energy cut, plant an unheard energy
     carrier, and drift an ASR pin. */
  const recut = { ...manifest, __recipe: { ...manifest.__recipe, carrier_cut: {
    hen: ["hen, hen.", 60, -30, 40],
    /* "dad" is locked with no carrier - a carrier for it is by construction
       one nobody approved. (This fixture has been re-pointed three times as
       former anchors earned real approvals - "at" won a carrier in the
       uplift pass; if "dad" ever wins one, point this at another
       carrier-free word.) */
    dad: ["Here is the word, dad.", 150, -20, 20],
  }, asr_pinned: {
    ...(manifest.__recipe.asr_pinned || {}),
    /* pop's approved pin is ["Say pop.", 0.46, 0.9]: this is a drift.
       (Re-pointed from hop, whose ASR pin retired with the uplift.) */
    pop: ["Say pop.", 0.1, 0.2],
  } } };
  const cp = check(recut, false).problems;
  const sawCarrier = cp.some((p) => p.startsWith("recipe cuts hen from")) &&
    cp.some((p) => p === "recipe cuts a word out of a carrier nobody approved: dad");
  const sawAsr = Object.keys(TREATMENTS).length === 0
    || cp.some((p) => p.startsWith("recipe asr_pinned pop"));
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
  /* The sweep completed on 2026-08-05: every word row is locked, so there is
     no unlocked row left to tune. The same fault - an unlocked word carrying
     knobs nobody approved - is planted by UNLOCKING a tuned row instead. */
  const tuned = CSV_TEXT.replace(/^(cop,[^,]*,)yes,/m, "$1no,");
  if (tuned === CSV_TEXT) throw new Error("self-test fixture: could not unlock the tuned row for cop");
  const recut2 = CSV_TEXT.replace("40,40,", "45,40,");
  const sawCsv = check(manifest, false, LOCK, holed).problems.some((p) => p === "voice-words.csv has no row for bank word: hen") &&
    check(manifest, false, LOCK, tuned).problems.some((p) => p.startsWith("unlocked word cop deviates")) &&
    check(manifest, false, LOCK, recut2).problems.some((p) => p.startsWith("keepers-treatments.json disagrees with voice-words.csv")) &&
    check(manifest, false, LOCK, null).problems.some((p) => p.startsWith("tools/voice-words.csv is missing"));
  const noRecipe = { ...manifest };
  delete noRecipe.__recipe;
  const sawNoRecipe = check(noRecipe, false).problems.some((p) => p.startsWith("the pack declares no recipe"));
  const failed = finish("voice-check", [
    ["a removed word clip is caught", sawMissing],
    ["a planted orphan is caught", sawOrphan],
    ["a lying duration is caught", sawLie],
    ["a drifted recipe is caught", sawRecipe],
    ["a two-letter word left to spelling is caught", sawSpelling],
    ["a pack with no recipe at all is caught", sawNoRecipe],
    ["a trim nobody heard is caught", sawTrim],
    ["a sentence with 'read' left to spelling is caught", sawReed],
    ["a say row that settles nothing is caught", sawSayGap],
    ["an identity say behind the renderer's own table is caught", sawSayIdent],
    ["a hyphenated homograph the tokenizer slipped is caught", sawSayHyphen],
    ["a say row the listener refused is caught", sawSayVeto],
    ["an ambiguous take whose bytes are not the graded bytes is caught", sawSayDrift],
    ["a pinned ambiguous take whose bytes drifted is caught", sawPinDrift],
    ["a pinned ambiguous take whose text drifted is caught", sawPinText],
    ["a listening round's result quietly changed is caught", sawRound9],
    ["an approved carrier re-cut at values nobody heard is caught, and a carrier nobody approved", sawCarrier],
    ["an approved ASR pin re-cut at values nobody heard is caught", sawAsr],
    ["a guard changed or granted with no round behind it is caught", sawGuard],
    ["a lock file that drifts or loses a word is caught", sawLock],
    ["a word-table row lost or an unlocked word quietly tuned is caught", sawCsv],
    ["a word clip long enough to hold a sentence is caught", sawWordy],
    ["control: a sentence may be long", sentenceOk],
    ["a sound clip long enough to hold a word is caught", fatSound],
    ["a sound clip short enough to be a truncation is caught", thinSound],
    ["control: a real approved sound shorter than any word passes, measured on its speech", shortSoundOk],
    ["a pack that forgot to record its speech edges is caught", sawNoEdges],
  ]);
  if (failed) process.exit(1);
  console.log("self-test OK: a removed word clip, a planted orphan, a lying duration, a drifted recipe, a two-letter word left to spelling, a pack with no recipe at all, a trim nobody heard, a sentence with 'read' left to spelling, a say row that settles nothing, an identity say behind the renderer's own table, a hyphenated homograph the tokenizer slipped, a say row the listener refused, an ambiguous take whose bytes are not the graded bytes, a pinned ambiguous take whose bytes or text drifted, a listening round's result quietly changed, an approved carrier/ASR cut re-cut at values nobody heard, a guard changed or granted with no round behind it, a lock file that drifts or loses a word, a word-table row lost or an unlocked word quietly tuned, a word clip long enough to hold a sentence, a sound clip long enough to hold a word or short enough to be a truncation, and a pack that forgot to record its speech edges are caught");
  process.exit(0);
}

if (RUN_AS_COMMAND) {
  const { required, shipped, problems } = check(manifest, true);
  console.log(verdict("Voice pack", `${required} clips required, ${shipped} shipped`, problems.length));
  printProblems(problems, { print: console.error });
  process.exit(problems.length ? 1 : 0);
}
