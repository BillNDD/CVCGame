/* THE CONVERSION REHEARSAL (G27). Owner-ruled 2026-08-19: "Build a conversion
   rehearsal, and gate it."

   WHY IT EXISTS. Six faults were found in one week, every one of them by a
   person going looking and NOT ONE by a gate. They share a shape, and it is
   the shape that makes them invisible: code that is CORRECT for a 21-level
   world and WRONG for a 100-level one. Nothing fails until the data changes.
   Every gate in this repository measures the ladder that ships today, so the
   day the redesign converts, all six fire at once inside a release.

   WHAT IT DOES. It substitutes the 100-level ladder into the engine's own
   structures and runs the REAL functions over every level: buildSession,
   trayPool, buildTray, chunkWord, soundIdFor, soundIdsFor, sentencesUpTo,
   revealWord, revealWordLongest, voiceScript, bankWords, and the app's own
   buildRandomBlock. It reports what would break. It fixes nothing and it
   changes nothing - not the ladder, not the engine, not the app.

   HOW THE REAL CODE IS DRIVEN, because this is the whole design constraint.
   A rehearsal that RE-DERIVES what the engine does would pass while the
   engine fails, and it would be worse than no rehearsal at all. So:

     1. The reference build is read, and the two data literals - LEVELS and
        SENTENCES - are spliced out and replaced with the ladder's. Nothing
        else in the file is touched, and that is VERIFIED byte-for-byte: put
        the original spans back and the file must equal what was read.
     2. The substituted reference is handed to tools/extract-engine.mjs - the
        REAL extractor, run as itself - which produces a module whose every
        function body is the reference's own source.
     3. app/src/App.jsx's truly-random block builder is sliced out at its own
        anchors and re-exported against that module. It is the app's own
        characters, not a paraphrase of them.
     4. After import the substitution is CHECKED: if LEVELS did not become the
        ladder, the run is refused. A rehearsal that quietly re-tested today's
        world would print a clean sheet and mean nothing, which is the exact
        failure mode this file exists to refuse.

   WHAT IT CANNOT DO, stated so nobody quotes it for more than it is:

   - It cannot call anything INSIDE the React component. beginFreePlay,
     showSentence and the endless deal are closures over component state and
     need a renderer. Where a finding's consequence lives there, this tool
     reports the DRIVEN cause (sentencesUpTo returns an empty pool, and the
     real revealWordLongest throws on what that pool yields) and names the
     rest in prose: showSentence dereferences pool[0].text, and the deal
     computes (qi + 1) % 0. It never claims to have run them.
   - It cannot say whether the ladder is RIGHT. Every word could be wrong for
     its level and this file would be silent. tools/ladder-status.mjs measures
     what the ladder holds; the literacy seat judges whether it teaches.
   - It cannot see a fault whose class nobody has thought of. That is why an
     UNKNOWN class is red rather than ignored: the day a probe finds something
     the ledger does not name, the build stops.
   - Split vowels are not in the chunker (S8, the owner's ruling), so a_e i_e
     o_e u_e e_e tile letter by letter here exactly as they would in the game.
     That is the game's behaviour, faithfully rehearsed, and not this tool's
     approximation of it.

   Run: node tools/conversion-rehearsal.mjs             the report
        node tools/conversion-rehearsal.mjs --check     the gate
        node tools/conversion-rehearsal.mjs --self-test its controls */
import { execFileSync } from "node:child_process";
import { seatWords } from "./convert-ladder.mjs";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { TRICKY, WORD_SOUND, chunkWord, soundIdFor, soundIdsFor } from "../src/engine.js";

const EXTRACTOR = "tools/extract-engine.mjs";
const BASELINE = ".claude/gate-baseline.json";

/* ------------------------------------------------------------- classes --
   One entry per way the conversion can break. `key` is the ceiling in
   .claude/gate-baseline.json; `act` is what a person does about it. The
   ledger is here rather than in a second data file for the reason
   tools/file-map.mjs gives: two ledgers over one set of facts need a third
   gate to keep them in step. */
export const CLASSES = [
  { id: "throws", key: "g27_throws_max", tier: "BREAKS",
    what: "a real function threw when handed what the ladder produces",
    act: "fix the function or the data it is handed; this is a crash a child would meet" },
  { id: "no_value", key: "g27_no_value_max", tier: "BREAKS",
    what: "a real function returned nothing where its caller requires a value",
    act: "the caller has no guard, or the level has no content; both are the same red" },
  { id: "sound_no_clip", key: "g27_sound_no_clip_max", tier: "BREAKS",
    what: "a tile unit resolves to a sound id that exists in no pack and no waiting room",
    act: "give the unit a TILE_SOUND row, or record the sound; open-faults section B is this shape" },
  { id: "tray_no_clip", key: "g27_tray_no_clip_max", tier: "BREAKS",
    what: "Build-it would deal a tile whose sound has no clip anywhere",
    act: "same root as sound_no_clip; counted separately because a child taps this one" },
  { id: "word_no_clip", key: "g27_word_no_clip_max", tier: "BREAKS",
    partOf: "word_clips_missing",
    what: "a bank word has no word clip in the pack and none waiting",
    act: "record it, or take the word out of the ladder" },
  { id: "sentence_no_clip", key: "g27_sentence_no_clip_max", tier: "BREAKS",
    what: "a placed sentence has no clip in the pack and none waiting",
    act: "record it; a sentence has no system-speech fallback (SPEC section 12)" },
  { id: "clip_unshipped", key: "g27_clip_unshipped_max", tier: "BILL",
    partOf: "word_clips_missing",
    what: "the clip is approved and in the waiting room, and has not shipped into the pack",
    act: "a ship step, not a recording session: the pack build, then the ledger row" },
  /* THE AGGREGATE, owner-ruled 2026-08-20 after an audit found the build red for
     the best possible reason. word_no_clip and clip_unshipped are the same debt in
     two rooms: a word with no voice at all, and a word whose voice is recorded and
     approved but not yet in the pack. Approving a listening round MOVES words from
     the first room to the second - which is the work succeeding - and under two
     separate ceilings that success reddened the build while the total had not
     moved by one (95 + 822 = 917 before, 2 + 915 = 917 after).
     Gating the SUM is the honest measure, and it cannot be satisfied by shuffling a
     word between the rooms. Both parts still REPORT at their own tiers, because a
     word with no recording at all is a different job from a word awaiting a ship
     step, and the owner needs to see which is which.
     The ceiling is 1050 rather than the measured 917 at the owner's explicit
     instruction, to leave headroom while the remaining recording rounds land. His
     words: "After we are done and run a full gauntlet return it to 917 or whatever
     it needs to be to catch drift." That tightening is open-faults section X. */
  { id: "word_clips_missing", key: "g27_word_clips_missing_max", tier: "BREAKS",
    sumOf: ["word_no_clip", "clip_unshipped"],
    what: "bank words whose clip is missing or not yet shipped, counted together",
    act: "record the missing ones, then ship the waiting ones; moving a word between the two does not help" },
  { id: "empty_sentence_pool", key: "g27_empty_sentence_pool_max", tier: "DEGRADED",
    what: "sentencesUpTo returns an empty pool, so sentence free play has nothing to deal",
    act: "place a text at or below that level; until then the caller needs a guard" },
  /* THE SEVENTH FAULT, and it fired three times in one day (2026-08-19).
     A text the owner approved by ear is validated against the ladder AS IT
     WAS. Nothing re-checks it when the ladder moves under it, so removing
     `hustle`, removing `catfish` and moving `butterfly` from L51 to L52 each
     left a verdict-`perfect` text asking a child to read a word they have not
     been taught. All three passed every gate. The third is the shape a naive
     membership test misses: the word is still IN the ladder, one level too
     late, and a child at 51 reads "butterflee". */
  { id: "text_word_untaught", key: "g27_text_word_untaught_max", tier: "BREAKS",
    what: "a placed text uses a word the ladder does not teach at or before that text's own level",
    act: "move the text up, move the word down, or withdraw the text; the approval was against a ladder that has moved" },
  { id: "session_reveal_silent", key: "g27_session_reveal_silent_max", tier: "DEGRADED",
    what: "revealWord finds no word the level teaches, so the session shows the text and skips the sound-out",
    act: "move the text to the level that teaches one of its words" },
  { id: "unseated_bank_word", key: "g27_unseated_bank_word_max", tier: "DEGRADED",
    what: "a bank word truly-random can never draw, because ALL_WORDS is built from LEVELS and not from bankWords()",
    act: "seat the word in a level, or draw the block from the bank" },
  { id: "short_session", key: "g27_short_session_max", tier: "DEGRADED",
    what: "a first session at that level is shorter than SESSION_SIZE",
    act: "expected while a level holds ten words; here so nobody is surprised by a nine-word session" },
  { id: "no_block_building", key: "g27_no_block_building_max", tier: "DEGRADED",
    what: "the level does not exceed SESSION_SIZE, so the block IS the level and block-building never engages",
    act: "decide whether SESSION_SIZE still means anything at this scale" },
  { id: "paragraph_reveal", key: "g27_paragraph_reveal_max", tier: "DEGRADED",
    what: "a placed text holds more than one sentence, and revealWordLongest names ONE word for the whole paragraph",
    act: "the paragraph presentation needs its own reveal rule (SPEC section 12, the WHISPER)" },
  { id: "stale_chooser_copy", key: "g27_stale_chooser_copy_max", tier: "DEGRADED",
    what: "the free-play chooser tells a grown-up a bank size the bank does not have",
    act: "hold the copy against bankWords() rather than against a number somebody typed" },
];

const empty = () => Object.fromEntries(CLASSES.map((c) => [c.id, []]));
const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };

/* ------------------------------------------------------------- the data --
   A ladder level becomes an engine level. `name` and `emoji` are placeholders
   and are declared as such: this rehearsal asks whether the CODE survives the
   ladder, and no probe here reads either field. The conversion itself will
   need owner-ruled names, which is a different job (open-faults R). */
export function levelsFrom(ladder, shape) {
  const by = new Map((shape || []).map((s) => [s.n, s]));
  /* seatWords is the CONVERTER'S OWN merge, imported rather than re-modelled:
     the audit's B3 found this function building 990 seats while the converter
     built 1,014 with hearts inline, so 24 heart words were never rehearsed by
     the only gate guarding the conversion. One function, one literal. */
  return ladder.map((l) => ({
    n: l.n,
    name: "L" + l.n,
    emoji: "⭐",
    focus: (by.get(l.n) || {}).teaches || l.teaches || "",
    words: seatWords({ words: l.words || [] }, by.get(l.n)),
  }));
}

/* A banked text's level is the one its own id names. `s:v3-l24-01` is level
   24 of shape v3 and says so; nothing else in the waiting room names a v3
   level, so nothing else is placed. Guessing a level for a text that does not
   declare one is how a sentence gets levelled against a word the child has
   never met. */
export function sentencesFrom(pending) {
  const out = {};
  for (const [id, row] of Object.entries(pending)) {
    const m = /^s:v3-l(\d+)-\d+$/.exec(id);
    if (!m || !row || typeof row.text !== "string") continue;
    const n = Number(m[1]);
    (out[n] = out[n] || []).push({ id, text: row.text });
  }
  for (const n of Object.keys(out)) out[n].sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

/* --------------------------------------------------------- substitution --
   Splice, never rewrite. Each span is found by its opening line and the first
   line-start terminator after it, and the splice is proved reversible before
   it is used. */
function spanOf(src, open, close, label) {
  const a = src.indexOf(open);
  if (a < 0) throw new Error(`the reference has no ${label} literal to substitute (looked for ${JSON.stringify(open)})`);
  const b = src.indexOf(close, a);
  if (b < 0) throw new Error(`the reference's ${label} literal never ends (looked for ${JSON.stringify(close)})`);
  return [a, b + close.length];
}

export function substitute(referenceSrc, levels, sentences) {
  const [la, lb] = spanOf(referenceSrc, "const LEVELS = [", "\n];\n", "LEVELS");
  const [sa, sb] = spanOf(referenceSrc, "const SENTENCES = {", "\n};\n", "SENTENCES");
  if (lb > sa) throw new Error("the LEVELS and SENTENCES literals overlap or run backwards; the splice would corrupt the reference");
  const head = referenceSrc.slice(0, la), mid = referenceSrc.slice(lb, sa), tail = referenceSrc.slice(sb);
  /* The reversibility proof. Anything but the two spans changing means an
     anchor caught the wrong thing, and a rehearsal on a corrupted reference
     is worse than none. */
  if (head + referenceSrc.slice(la, lb) + mid + referenceSrc.slice(sa, sb) + tail !== referenceSrc)
    throw new Error("the splice is not reversible: it would change the reference outside the two data literals");
  const out = head + "const LEVELS = " + JSON.stringify(levels, null, 1) + ";\n"
    + mid + "const SENTENCES = " + JSON.stringify(sentences, null, 1) + ";\n" + tail;
  if (out === referenceSrc) throw new Error("the substitution changed nothing; the rehearsal would re-test today's ladder and call it clean");
  return out;
}

/* app/src/App.jsx's truly-random block builder, verbatim, re-exported against
   the substituted engine. Sliced at its own anchors: if either moves, this
   throws rather than checking nothing. A rule this repository has paid for -
   a detector whose anchor moved looks exactly like a detector finding
   nothing (doc-truth's vacuous-rule control). */
export function randomBlockModule(appSrc, engineUrl) {
  const a = appSrc.indexOf("const ALL_WORDS =");
  const f = appSrc.indexOf("function buildRandomBlock(", a < 0 ? 0 : a);
  if (a < 0 || f < 0) throw new Error("app/src/App.jsx no longer declares ALL_WORDS and buildRandomBlock where this tool looks; the truly-random probe would be checking nothing");
  const end = appSrc.indexOf("\n}\n", f);
  if (end < 0) throw new Error("app/src/App.jsx's buildRandomBlock has no line-start close; the slice would run past the function");
  const slice = appSrc.slice(a, end + 3);
  if (slice.length > 2000 || slice.includes("export default function App"))
    throw new Error("the buildRandomBlock slice over-reached into the component; refusing to evaluate it");
  return `import { LEVELS, SESSION_SIZE } from ${JSON.stringify(engineUrl)};\n`
    + slice + "\nexport { ALL_WORDS, buildRandomBlock };\n";
}

/* THE CHECK THAT MAKES EVERY OTHER FINDING MEAN SOMETHING. If the splice
   silently failed, the module would hold the 21-level bank, every probe would
   pass, and the report would say the conversion is clean. */
function assertSubstituted(E, levels) {
  if (E.LEVELS.length !== levels.length)
    throw new Error(`the substitution did not take: the module holds ${E.LEVELS.length} levels, the ladder has ${levels.length}`);
  for (let i = 0; i < levels.length; i++)
    if (E.LEVELS[i].n !== levels[i].n || E.LEVELS[i].words.join(" ") !== levels[i].words.join(" "))
      throw new Error(`the substitution did not take: level ${levels[i].n} in the module is not the ladder's`);
}

/* Build the substituted engine and import it. The extractor is run as
   ITSELF, so the module under test is produced by the same generator that
   produces src/engine.js. */
export async function loadSubstituted(input, dir) {
  const refPath = join(dir, "word-quest.jsx"), engPath = join(dir, "engine.js"), appPath = join(dir, "random-block.mjs");
  writeFileSync(refPath, substitute(input.referenceSrc, input.levels, input.sentences));
  /* `extractor` is a parameter with the real tool as its default, for the one
     control that cannot be planted in data: a generator that ignores the
     source it was handed. Every ordinary caller gets the real extractor. */
  execFileSync(process.execPath, [resolve(input.extractor || EXTRACTOR), refPath, engPath], { stdio: "pipe" });
  const E = await import(pathToFileURL(engPath).href);
  assertSubstituted(E, input.levels);
  writeFileSync(appPath, randomBlockModule(input.appSrc, pathToFileURL(engPath).href));
  const A = await import(pathToFileURL(appPath).href);
  if (typeof A.buildRandomBlock !== "function" || !Array.isArray(A.ALL_WORDS))
    throw new Error("the extracted truly-random builder is not a function over an array; refusing to report on it");
  return { E, A };
}

/* ----------------------------------------------------------- the probes --
   Every one drives a real function. `call` records a throw against the
   function that threw, never against this file's own dereference. */
function call(found, where, fn) {
  try { return { ok: true, value: fn() }; } catch (e) {
    found.throws.push(`${where}: ${e.constructor.name}: ${e.message}`);
    return { ok: false, value: undefined };
  }
}

function clipWhere(manifest, pending) {
  return (id) => {
    if (Object.prototype.hasOwnProperty.call(manifest, id)) return "pack";
    const row = id.startsWith("w:") ? id.slice(2) : id;
    return Object.prototype.hasOwnProperty.call(pending, row) ? "waiting" : "nowhere";
  };
}

function probeClips(E, found, where) {
  const seen = new Map();
  for (const w of E.bankWords()) for (const g of E.chunkWord(w)) if (!seen.has(g)) seen.set(g, w);
  for (const [g, w] of [...seen].sort()) {
    const id = E.soundIdFor(g);
    if (where(id) === "nowhere") found.sound_no_clip.push(`${g} -> ${id} (first met in "${w}")`);
  }
  const script = call(found, "voiceScript()", () => E.voiceScript());
  if (!script.ok) return;
  for (const c of script.value) {
    if (c.text === undefined || c.text === null) found.no_value.push(`voiceScript() gave clip ${c.id} no text`);
    const at = where(c.id);
    if (at === "pack" || c.id.startsWith("d:")) continue;   // d: ids are named by sound_no_clip above
    if (at === "waiting") found.clip_unshipped.push(c.id);
    else if (c.id.startsWith("s:")) found.sentence_no_clip.push(c.id);
    else found.word_no_clip.push(c.id);
  }
}

function probeSessions(E, found) {
  for (const l of E.LEVELS) {
    const st = E.newState();
    st.level = l.n;
    const q = call(found, `buildSession(level ${l.n})`, () => E.buildSession(st));
    if (l.words.length <= E.SESSION_SIZE) found.no_block_building.push(`level ${l.n} (${l.words.length} words)`);
    if (!q.ok) continue;
    if (!Array.isArray(q.value)) { found.no_value.push(`buildSession(level ${l.n}) did not return a queue`); continue; }
    if (q.value.some((w) => typeof w !== "string")) found.no_value.push(`buildSession(level ${l.n}) put a non-word in the queue`);
    if (!q.value.length) found.no_value.push(`buildSession(level ${l.n}) returned an empty session`);
    else if (q.value.length < E.SESSION_SIZE) found.short_session.push(`level ${l.n}: ${q.value.length} of ${E.SESSION_SIZE}`);
  }
}

function probeTrays(E, found, where) {
  for (const l of E.LEVELS) {
    const pool = call(found, `trayPool(${l.n})`, () => E.trayPool(l.n));
    if (!pool.ok) continue;
    if (l.words.length && !pool.value.length) found.no_value.push(`trayPool(${l.n}) is empty at a level that holds words`);
    for (const w of l.words) {
      /* rand is held still so the rehearsal is reproducible; buildTray takes
         it as a parameter for exactly this reason. */
      const t = call(found, `buildTray("${w}", ${l.n})`, () => E.buildTray(w, l.n, () => 0.5));
      if (!t.ok) continue;
      if (t.value.tiles.some((x) => x === undefined) || t.value.sounds.some((x) => x === undefined))
        found.no_value.push(`buildTray("${w}", ${l.n}) dealt a tile with no letter or no sound`);
      for (const s of new Set(t.value.sounds)) if (where(s) === "nowhere") found.tray_no_clip.push(`${w}@${l.n} -> ${s}`);
    }
  }
}

/* Sentence free play and the session reveal, driven as far as they can be
   driven outside a renderer. sentencesUpTo, revealWordLongest, revealWord and
   sentenceWords are real; showSentence is a closure over component state and
   is named in prose, not called. */
function probeSentences(E, found) {
  for (const l of E.LEVELS) {
    const pool = call(found, `sentencesUpTo(${l.n})`, () => E.sentencesUpTo(l.n));
    if (!pool.ok) continue;
    if (!pool.value.length) {
      found.empty_sentence_pool.push(`level ${l.n}`);
      found.no_value.push(`sentencesUpTo(${l.n}) is empty; sentence free play deals pool[0] and then (qi + 1) % pool.length`);
    }
    /* The value the ladder actually produces, handed to the real function
       showSentence hands it to. An empty pool yields undefined, and the throw
       that follows comes from inside revealWordLongest. */
    const first = E.shuffle(pool.value)[0];
    call(found, `revealWordLongest(the free-play pick at level ${l.n})`, () => E.revealWordLongest(first && first.text));
  }
  for (const l of E.LEVELS) for (const s of E.SENTENCES[l.n] || []) {
    const longest = call(found, `revealWordLongest(${s.id})`, () => E.revealWordLongest(s.text));
    if (longest.ok && !longest.value) found.no_value.push(`revealWordLongest(${s.id}) named no word to sound out`);
    const own = call(found, `revealWord(${s.id}, ${l.n})`, () => E.revealWord(s.text, l.n));
    if (own.ok && !own.value) found.session_reveal_silent.push(`${s.id} @L${l.n}`);
    if ((s.text.match(/[.!?]+(?=\s|$)/g) || []).length > 1)
      found.paragraph_reveal.push(`${s.id} @L${l.n}: ${E.sentenceWords(s.text).length} words, one reveal word "${longest.value}"`);
  }
}

/* EVERY PLACED TEXT AGAINST THE LADDER AS IT STANDS, which is the check
   nothing performs today. A text is re-validated, never re-approved: an ear
   said the recording is right, and this asks the separate question of whether
   a child at that level has met every word in it.

   WORD_LEVEL is the ENGINE'S OWN map - built by the engine from LEVELS, not
   re-derived here - so the seat this reads is the seat the game will use.
   sentenceWords is the engine's tokeniser for the same reason: two answers to
   "how many words is this" is a fault this project has already paid for. */
function probeTexts(E, found, heartLevels) {
  for (const l of E.LEVELS) for (const s of E.SENTENCES[l.n] || []) {
    const words = call(found, `sentenceWords(${s.id})`, () => E.sentenceWords(s.text));
    if (!words.ok) continue;
    for (const w of new Set(words.value)) {
      const seat = E.WORD_LEVEL[w], heart = heartLevels[w];
      if ((seat !== undefined && seat <= l.n) || (heart !== undefined && heart <= l.n)) continue;
      const why = seat !== undefined ? `taught at L${seat}, after this text`
        : heart !== undefined ? `a heart word at L${heart}, after this text`
          : "seated at no level and in no heart list";
      found.text_word_untaught.push(`${s.id} @L${l.n}: "${w}" is ${why}`);
    }
  }
}

function probeRandom(E, A, found) {
  const seats = new Set(A.ALL_WORDS);
  for (const w of E.bankWords()) if (!seats.has(w)) found.unseated_bank_word.push(w);
  const block = call(found, 'buildRandomBlock("")', () => A.buildRandomBlock(""));
  if (!block.ok) return;
  if (!Array.isArray(block.value) || block.value.some((w) => typeof w !== "string"))
    found.no_value.push('buildRandomBlock("") dealt a block holding something that is not a word');
  else if (block.value.length !== E.SESSION_SIZE)
    found.no_value.push(`buildRandomBlock("") dealt ${block.value.length} words, not ${E.SESSION_SIZE}`);
}

function probeCopy(E, found, homeSrc) {
  const m = /any word from all (\d+)/.exec(homeSrc);
  if (!m) { found.no_value.push("the free-play chooser copy no longer states a bank size where this tool looks"); return; }
  const bank = E.bankWords().length;
  if (Number(m[1]) !== bank) found.stale_chooser_copy.push(`the chooser says all ${m[1]}, the bank holds ${bank}`);
}

/* --------------------------------------------------------- the rehearsal --
   Everything above, over every level, on injected inputs so the controls can
   plant a fault and watch this same function go red. */
export async function rehearse(input) {
  const dir = mkdtempSync(join(tmpdir(), "wq-rehearsal-"));
  try {
    const { E, A } = await loadSubstituted(input, dir);
    const found = empty();
    const where = clipWhere(input.manifest, input.pending);
    probeClips(E, found, where);
    probeSessions(E, found);
    probeTrays(E, found, where);
    probeSentences(E, found);
    probeTexts(E, found, input.heartLevels || {});
    probeRandom(E, A, found);
    probeCopy(E, found, input.homeSrc);
    const counts = Object.fromEntries(CLASSES.map((c) => [c.id, found[c.id].length]));
    return { found, counts, levels: E.LEVELS.length, bank: E.bankWords().length, seats: A.ALL_WORDS.length };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* The heart words the shape hands a child by sight, and the earliest level
   that does. A heart word has no seat in the ladder's word lists, so without
   this every text using "the" would read as untaught. */
export function heartLevelsFrom(shape) {
  const out = {};
  for (const lv of shape) for (const w of lv.heart || []) {
    const k = String(w).toLowerCase();
    if (out[k] === undefined || lv.n < out[k]) out[k] = lv.n;
  }
  return out;
}

export function realInput(read = readFileSync) {
  const j = (f) => JSON.parse(read(f, "utf8"));
  const pending = j("tools/pending-words/pending-words.json");
  const shape = j("tools/ladder/shape-v3.json");
  return {
    referenceSrc: read("reference/word-quest.jsx", "utf8"),
    appSrc: read("app/src/App.jsx", "utf8"),
    homeSrc: read("app/src/screens/HomeScreen.jsx", "utf8"),
    manifest: j("app/public/voice/manifest.json"),
    pending,
    levels: levelsFrom(j("tools/ladder/ladder-v4.json"), shape),
    sentences: sentencesFrom(pending),
    heartLevels: heartLevelsFrom(shape),
  };
}

/* ------------------------------------------------------------- the gate --
   A count ABOVE its ceiling is red: the conversion got worse. A count below
   prints the number to lower the ceiling to (E6 - a ceiling comes down when
   quality improves and never goes up). A class with no ceiling at all is red,
   because `count > undefined` is false and that is how a ceiling silently
   stops existing (the fault tools/file-map.mjs rule 4 records). */
export function gate(counts, baseline) {
  const problems = [], nudges = [];
  /* The class list is a FLOOR. A fault class is added when somebody finds a
     new way the conversion breaks and is never taken away, so a shrinking
     list means a probe was deleted rather than a fault fixed. */
  if (CLASSES.length < baseline.g27_classes)
    problems.push(`${CLASSES.length} finding classes against a floor of ${baseline.g27_classes} (g27_classes): a probe was removed`);
  for (const c of CLASSES) {
    /* A class that is PART of an aggregate is not ceilinged on its own - the
       aggregate holds it. But it is only safe to skip the check if the aggregate
       actually exists and actually gates, or the part would be silently
       unguarded, which is the shape of every fault this file exists to catch. */
    if (c.partOf) {
      const agg = CLASSES.find((x) => x.id === c.partOf);
      if (!agg) { problems.push(`${c.id} names aggregate ${c.partOf}, which is not a class: the part is unguarded`); continue; }
      if (!(agg.key in baseline)) { problems.push(`${c.id} is held by ${agg.id}, which has no ceiling in ${BASELINE}: the part is unguarded`); continue; }
      if (!(agg.sumOf || []).includes(c.id)) { problems.push(`${c.id} names aggregate ${agg.id}, which does not sum it: the part is unguarded`); continue; }
      continue;
    }
    if (!(c.key in baseline)) { problems.push(`${c.id} has no ceiling: add ${c.key} to ${BASELINE} or the class is unguarded`); continue; }
    const max = baseline[c.key];
    const n = c.sumOf ? c.sumOf.reduce((a, id) => a + (counts[id] || 0), 0) : counts[c.id];
    if (n > max) problems.push(`${c.id}: ${n} findings against a ceiling of ${max} (${c.key}) - ${c.what}`);
    else if (n < max) nudges.push(`${c.id}: ${n} findings, ceiling ${max} - lower ${c.key} to ${n}`);
  }
  for (const id of Object.keys(counts))
    if (!CLASSES.some((c) => c.id === id)) problems.push(`${id} is a finding class with no entry in CLASSES; the ledger does not know it`);
  /* And the mirror: an aggregate that sums a class nobody produces is measuring air. */
  for (const c of CLASSES)
    for (const part of c.sumOf || [])
      if (!CLASSES.some((x) => x.id === part)) problems.push(`${c.id} sums ${part}, which is not a class`);
  return { problems, nudges };
}

function print(r) {
  console.log(`Conversion rehearsal: ${r.levels} levels, ${r.bank} bank words, ${r.seats} level seats\n`);
  for (const tier of ["BREAKS", "BILL", "DEGRADED"]) {
    console.log(`--- ${tier} ---`);
    for (const c of CLASSES.filter((x) => x.tier === tier)) {
      const list = r.found[c.id];
      console.log(`  ${c.id}: ${list.length}${list.length ? "" : "  (clean)"}`);
      if (!list.length) continue;
      console.log(`      ${c.what}`);
      console.log(`      -> ${c.act}`);
      for (const line of list.slice(0, 8)) console.log(`      ${line}`);
      if (list.length > 8) console.log(`      ... and ${list.length - 8} more`);
    }
  }
  console.log("\nA REPORT, not a verdict. It says what the conversion would break, never whether the ladder teaches.");
}

/* --------------------------------------------------------------- controls --
   EVERY CONTROL IS A PAIR. The fault is planted, the REAL rehearse() runs and
   must go red; without the fault, that same real run must be silent on that
   class. A detector that always cries wolf fails the green half and one that
   never fires fails the red half, so neither can pass by accident. This
   repository already owns a control that cannot fail - a hand-written literal
   compared against a hand-written expectation, with the function under test
   never called - and it is not repeated here.

   The fixture uses the REAL reference and the REAL app source, so the code
   under test is the code that ships. Only the DATA is small. */
const FIX_WORDS = ["is", "it", "in", "on", "at", "an", "up", "us", "am", "ax",
  "cat", "sat", "ran", "can", "man", "dad", "hat", "mat", "fat", "my", "we"];
/* The ids are real clips, because "does a clip exist" is one of the things
   under test; the TEXTS are fixture data built from fixture words, because
   every other probe reads the text and not the recording. Each text holds a
   word its own level teaches, so the clean fixture is silent on the session
   reveal as well. */
const FIX_SENTENCES = {
  1: [{ id: "s:mode-b3-s03", text: "It is an ax." }],
  2: [{ id: "s:mode-b3-s04", text: "Was it my cat?" }],
};

function fixtureInput(real) {
  /* Every word TRICKY or WORD_SOUND names is seated, because a word named
     there and seated nowhere IS a finding - it is the heart-word control
     below, and the fixture must not fire it by accident.

     Seated ONCE, though. WORD_LEVEL is `LEVELS.forEach(L => L.words.forEach(
     w => WORD_LEVEL[w] = L.n))`, so a word in two levels takes its LAST seat
     and reads as taught later than it is. Today's ladder holds no duplicate,
     so this is a fixture concern rather than a finding - but it is the
     engine's real behaviour and the fixture must not trip over it. */
  const named = [...new Set([...Object.keys(TRICKY), ...Object.keys(WORD_SOUND)])]
    .filter((w) => !FIX_WORDS.includes(w));
  if (named.length < 10) throw new Error("the engine's by-word tables came back nearly empty; the fixture would be checking nothing");
  const bank = new Set([...FIX_WORDS, ...named]);
  return {
    ...real,
    manifest: fixtureManifest(real.manifest, bank),
    levels: [
      { n: 1, name: "L1", emoji: "⭐", focus: "fixture", words: [...FIX_WORDS] },
      { n: 2, name: "L2", emoji: "⭐", focus: "fixture", words: named },
    ],
    sentences: structuredClone(FIX_SENTENCES),
    /* No heart words, so the fixture's seats are the whole answer and a
       control cannot pass because some real heart list happened to cover it.
       The heart branch has its own control below. */
    heartLevels: {},
    homeSrc: `serves any word from all ${bank.size} — easy and hard alike.`,
  };
}

/* A pack that covers every clip the fixture asks for, so the clean fixture
   starts silent and a planted gap is the only thing that shows. Four of the
   engine's by-word tables use units the shipped pack has no DEFAULT clip for
   - said's ai, there's ere, they's ey, out's ou - because each is bent per
   word (S8: neither ai nor ou has a ruled default sound). Those are real and
   are named in the report against the real ladder; here they would drown the
   planted one. */
function fixtureManifest(manifest, bank) {
  const out = { ...manifest };
  for (const w of bank) {
    for (const g of chunkWord(w)) out[soundIdFor(g)] ||= { file: "fixture" };
    for (const id of soundIdsFor(w)) out[id] ||= { file: "fixture" };
    out["w:" + w] ||= { file: "fixture" };
  }
  return out;
}

const CONTROLS = [
  { name: "a level with no sentences", cls: "empty_sentence_pool",
    plant: (i) => ({ ...i, sentences: { 2: i.sentences[2] } }) },
  { name: "a level with no sentences makes the real revealWordLongest throw", cls: "throws",
    plant: (i) => ({ ...i, sentences: { 2: i.sentences[2] } }) },
  { name: "an empty pool is also reported as a value the caller cannot use", cls: "no_value",
    plant: (i) => ({ ...i, sentences: { 2: i.sentences[2] } }) },
  { name: "a tile unit whose sound has no clip", cls: "sound_no_clip",
    plant: (i) => ({ ...i, manifest: without(i.manifest, "d:short_a"), pending: without(i.pending, "d:short_a") }) },
  { name: "Build-it would deal a tile whose sound has no clip", cls: "tray_no_clip",
    plant: (i) => ({ ...i, manifest: without(i.manifest, "d:short_a"), pending: without(i.pending, "d:short_a") }) },
  { name: "a bank word with no word clip anywhere", cls: "word_no_clip",
    plant: (i) => ({ ...i, manifest: without(i.manifest, "w:sat"), pending: without(i.pending, "sat") }) },
  { name: "a placed sentence with no clip anywhere", cls: "sentence_no_clip",
    plant: (i) => ({ ...i, sentences: { ...i.sentences, 1: [{ id: "s:no-such-take", text: "It is an ax." }] } }) },
  { name: "a clip that is approved and waiting rather than shipped", cls: "clip_unshipped",
    plant: (i) => ({ ...i, manifest: without(i.manifest, "w:sat"), pending: { ...i.pending, sat: { arm: "planted" } } }) },
  { name: "a word named only in WORD_SOUND and seated at no level", cls: "unseated_bank_word",
    plant: (i) => ({ ...i, levels: [i.levels[0], { ...i.levels[1], words: i.levels[1].words.slice(1) }] }) },
  /* The seventh fault, both shapes. The first is the one a membership test
     finds; the second is `butterfly` - the word IS in the ladder, one level
     too late - and it is the one that gets missed. */
  { name: "a banked text using a word the ladder does not hold at all", cls: "text_word_untaught",
    plant: (i) => ({ ...i, sentences: { ...i.sentences, 1: [{ id: "s:mode-b3-s03", text: "It is an ox." }] } }) },
  { name: "a banked text using a word the ladder teaches at a LATER level (the butterfly shape)", cls: "text_word_untaught",
    plant: (i) => ({ ...i, sentences: { ...i.sentences, 1: [{ id: "s:mode-b3-s03", text: "The cat sat." }] } }) },
  { name: "a text whose level teaches none of its words", cls: "session_reveal_silent",
    plant: (i) => ({ ...i, sentences: { ...i.sentences, 1: [{ id: "s:mode-b3-s03", text: "Push the bush." }] } }) },
  { name: "a level too small to fill a session", cls: "short_session",
    plant: (i) => ({ ...i, levels: [{ ...i.levels[0], words: FIX_WORDS.slice(0, 3) }, i.levels[1]] }) },
  { name: "a level that never exceeds SESSION_SIZE, so the block IS the level", cls: "no_block_building",
    plant: (i) => ({ ...i, levels: [{ ...i.levels[0], words: FIX_WORDS.slice(0, 3) }, i.levels[1]] }) },
  { name: "a placed text holding two sentences", cls: "paragraph_reveal",
    plant: (i) => ({ ...i, sentences: { ...i.sentences, 1: [{ id: "s:mode-b3-s03", text: "It is an ax. It is up." }] } }) },
  { name: "chooser copy against a bank size the bank does not have", cls: "stale_chooser_copy",
    plant: (i) => ({ ...i, homeSrc: "serves any word from all 5 — easy and hard alike." }) },
  { name: "chooser copy that has stopped stating a bank size at all", cls: "no_value",
    plant: (i) => ({ ...i, homeSrc: "serves whatever it likes." }) },
];

async function refuses(real, plant, needle) {
  try { await rehearse(plant(fixtureInput(real))); return false; } catch (e) { return e.message.includes(needle); }
}

/* A generator that ignores its input: it extracts reference/word-quest.jsx
   however it is called, so the module holds the 21-level bank while the
   rehearsal believes it holds the ladder. */
function decoyExtractor() {
  const dir = mkdtempSync(join(tmpdir(), "wq-decoy-"));
  const path = join(dir, "decoy-extractor.mjs");
  writeFileSync(path, 'import { execFileSync } from "node:child_process";\n'
    + `execFileSync(process.execPath, [${JSON.stringify(resolve(EXTRACTOR))}, `
    + `${JSON.stringify(resolve("reference/word-quest.jsx"))}, process.argv[3]], { stdio: "pipe" });\n`);
  return path;
}

async function selfTest() {
  const say = [], T = (n, p) => say.push([n, p]);
  const real = realInput();

  /* The clean half, run once. Every control's green side is measured against
     it, so a rehearsal that reported everything would fail here - all
     fourteen at once. */
  const clean = await rehearse(fixtureInput(real));
  for (const c of CLASSES) T(`clean fixture: ${c.id} is silent`, clean.counts[c.id] === 0);

  for (const ctl of CONTROLS) {
    const red = await rehearse(ctl.plant(fixtureInput(real)));
    T(`RED   ${ctl.name} -> ${ctl.cls} fires`, red.counts[ctl.cls] > 0);
    T(`GREEN ${ctl.name} -> ${ctl.cls} is silent without it`, clean.counts[ctl.cls] === 0);
  }

  /* THE AGGREGATE CEILING, owner-ruled 2026-08-20. Its whole value is that a
     word moving between the two rooms cannot change the verdict, so every
     control below tests that property rather than the arithmetic. A gate that
     only proved 917 <= 917 would pass on an implementation that read one class
     and ignored the other. */
  {
    const zero = Object.fromEntries(CLASSES.filter((c) => !c.sumOf).map((c) => [c.id, 0]));
    const wide = Object.fromEntries(CLASSES.map((c) => [c.key, 9999]));
    const base = { ...wide, g27_classes: CLASSES.length, g27_word_clips_missing_max: 100 };
    const at = (a, b) => gate({ ...zero, word_no_clip: a, clip_unshipped: b }, base).problems
      .filter((x) => x.startsWith("word_clips_missing:"));
    T("GREEN the sum at the ceiling passes", at(40, 60).length === 0);
    T("RED   the sum one over the ceiling fails", at(40, 61).length === 1);
    /* The property that made the owner choose this design over raising a
       ceiling: approving a listening round moves a word from no-clip to
       waiting, and that must be invisible to the gate. */
    T("SHUFFLE moving every word between the two rooms changes nothing",
      at(100, 0).length === at(0, 100).length && at(50, 50).length === at(0, 100).length);
    /* And the mirror: the parts must NOT be individually ceilinged any more, or
       the aggregate is decoration over the fault it was built to remove. */
    T("a part over its own old ceiling does not fail on its own",
      gate({ ...zero, word_no_clip: 0, clip_unshipped: 95 },
        { ...base, g27_clip_unshipped_max: 1 }).problems.filter((x) => x.startsWith("clip_unshipped:")).length === 0);
    /* Unguarded-part controls: each way a part could silently lose its cover. */
    T("a part whose aggregate has no ceiling is reported as unguarded",
      gate({ ...zero, word_no_clip: 1, clip_unshipped: 1 },
        Object.fromEntries(Object.entries(base).filter(([k]) => k !== "g27_word_clips_missing_max")))
        .problems.some((x) => x.includes("has no ceiling") && x.includes("unguarded")));
    /* Control on the control: with everything present, none of those fire. */
    T("control: a whole and healthy ledger reports no unguarded part",
      gate({ ...zero, word_no_clip: 1, clip_unshipped: 1 }, base)
        .problems.filter((x) => x.includes("unguarded")).length === 0);
  }

  /* The substitution controls. A rehearsal that quietly tested today's ladder
     would print a clean sheet, so every anchor must fail loudly. */
  T("a renamed LEVELS anchor is refused, not ignored",
    await refuses(real, (i) => ({ ...i, referenceSrc: i.referenceSrc.replace("const LEVELS = [", "const LADDER = [") }), "no LEVELS literal"));
  T("a renamed SENTENCES anchor is refused, not ignored",
    await refuses(real, (i) => ({ ...i, referenceSrc: i.referenceSrc.replace("const SENTENCES = {", "const TEXTS = {") }), "no SENTENCES literal"));
  T("a moved buildRandomBlock anchor is refused, not ignored",
    await refuses(real, (i) => ({ ...i, appSrc: i.appSrc.replace("function buildRandomBlock(", "function makeRandomBlock(") }), "no longer declares"));
  /* The heart branch of the seventh check, both ways. A heart word at or
     below the text's level is taught by sight and passes; the same word given
     to a LATER level does not, so the branch cannot be a blanket amnesty. */
  {
    const word = await rehearse({ ...fixtureInput(real), heartLevels: { ox: 1 },
      sentences: { 1: [{ id: "s:mode-b3-s03", text: "It is an ox." }] } });
    T("GREEN a heart word at or below the text's level is taught, not untaught", word.counts.text_word_untaught === 0);
    const late = await rehearse({ ...fixtureInput(real), heartLevels: { ox: 9 },
      sentences: { 1: [{ id: "s:mode-b3-s03", text: "It is an ox." }] } });
    T("RED   a heart word first given at a LATER level is still untaught", late.counts.text_word_untaught === 1);
  }

  /* THE CONTROL THIS WHOLE FILE STANDS ON. A generator that ignores the
     source it was handed produces the 21-level engine, every probe passes,
     and the report says the conversion is clean. It cannot be planted in
     data, so it is planted in the generator: a decoy extractor that extracts
     the ORIGINAL reference whatever it is given. */
  T("a generator that ignored the substitution is refused rather than reported as clean",
    await refuses(real, (i) => ({ ...i, extractor: decoyExtractor() }), "did not take"));
  T("an over-reaching buildRandomBlock slice is refused", (() => {
    try { randomBlockModule("const ALL_WORDS = 1;\nfunction buildRandomBlock(){\n" + "x;\n".repeat(900) + "}\n", "u"); return false; }
    catch (e) { return e.message.includes("over-reached"); }
  })());
  T("a splice that would change the reference outside the two literals is refused", (() => {
    try { substitute("const SENTENCES = {\n};\nconst LEVELS = [\n];\n", [], {}); return false; }
    catch (e) { return e.message.includes("overlap or run backwards"); }
  })());

  /* The ledger controls. A class with no ceiling is the fault where a ceiling
     silently stops existing; a finding class the ledger does not know is the
     fault this whole gate exists to catch. */
  const base = JSON.parse(readFileSync(BASELINE, "utf8"));
  T("every class has a ceiling in the baseline",
    !gate(clean.counts, base).problems.some((p) => p.includes("has no ceiling")));
  T("a class whose ceiling was deleted is refused",
    gate(clean.counts, without(base, "g27_throws_max")).problems.some((p) => p.includes("g27_throws_max")));
  T("a finding class the ledger does not know is refused",
    gate({ ...clean.counts, invented: 1 }, base).problems.some((p) => p.includes("invented")));
  T("a count over its ceiling is refused",
    gate({ ...clean.counts, throws: 99 }, { ...base, g27_throws_max: 0 }).problems.some((p) => p.startsWith("throws: 99")));
  T("a count under its ceiling is a nudge and not a refusal",
    gate({ ...clean.counts, throws: 0 }, { ...base, g27_throws_max: 7 }).nudges.some((p) => p.includes("lower g27_throws_max to 0")));

  /* The real ladder, once: the proof that the rehearsal completes on the data
     it exists for, and that its own report is not vacuous. */
  const live = await rehearse(realInput());
  T("the real ladder rehearses over all 100 levels", live.levels === 100);
  T("the real ladder is not silently reported as clean",
    Object.values(live.counts).reduce((a, b) => a + b, 0) > 0);
  T("a shrinking class list is refused",
    gate(clean.counts, { ...base, g27_classes: CLASSES.length + 1 }).problems.some((p) => p.includes("g27_classes")));

  /* The control count is a floor of its own (E6): controls are added and
     never removed, so a suite that has shrunk is a suite somebody trimmed. */
  T(`the control count has not shrunk below ${base.g27_controls}`, say.length + 1 >= base.g27_controls);

  const failed = say.filter(([, p]) => !p).length;
  for (const [n, p] of say) console.log((p ? "ok   " : "FAIL ") + n);
  console.log(`\nconversion-rehearsal controls: ${say.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

/* ------------------------------------------------------------------- main --
   The main-module guard. A Windows path needs pathToFileURL, not string
   surgery, and without the guard at all an `import` of this file RUNS the
   rehearsal - which is how a helper import printed a full report in the
   middle of another tool's output while this file was being built. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--self-test")) await selfTest();
  else {
    const r = await rehearse(realInput());
    if (process.argv.includes("--check")) {
      const { problems, nudges } = gate(r.counts, JSON.parse(readFileSync(BASELINE, "utf8")));
      for (const n of nudges) console.log("nudge: " + n);
      for (const p of problems) console.log("PROBLEM: " + p);
      console.log(`Conversion rehearsal: ${CLASSES.length} classes, ${Object.values(r.counts).reduce((a, b) => a + b, 0)} findings, ${problems.length} problems`);
      process.exit(problems.length ? 1 : 0);
    } else print(r);
  }
}
