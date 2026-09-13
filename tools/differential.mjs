/* THE DIFFERENTIAL HARNESS (G32) - batch 0 of the refactor, owner-ruled
 * 2026-09-12. The refactor's one promise is E8: nothing the game does changes.
 * This is the instrument that holds it: the engine the tree would ship is run
 * beside the engine beta 32 shipped, over the same inputs, and any output that
 * differs is a red gate.
 *
 * HOW THE TWO ENGINES ARE BUILT, without a file in the tree. The BASELINE is
 * `git show v1.0.0-beta.32:reference/word-quest.jsx` into a scratch directory
 * and THE TAG'S OWN tools/extract-engine.mjs - `git show` of that too - run
 * on it: since batch 2 of the refactor (2026-09-13) the tree's extractor
 * reads section markers the beta-32 reference does not carry and emits one
 * module per section, so the baseline is built by the extractor that built
 * beta 32, and the baseline never shares code with the extractor under test.
 * The CANDIDATE is the tree's own reference build through the tree's own
 * extractor into the same scratch directory, imported through the index it
 * writes - never src/engine.js, which G5 rewrites beside this gate in the
 * gauntlet's lane. Both are imported and driven; the scratch directory is
 * removed on the way out. The tag is pinned here and stays pinned for the
 * whole refactor: every batch is measured against what shipped before the
 * first one, never against the batch before it, so a drift cannot be
 * smuggled through in steps. A clone without the tag (a shallow checkout)
 * is refused with the fetch command in the message, never quietly passed.
 *
 * THE EXPORT LIST. The split exports every top-level declaration, so the
 * candidate exports more names than the 100 the hand-typed list gave beta
 * 32. Every name the baseline exports must be in the candidate - a missing
 * one is a difference named "(the export list)" - and the names beyond the
 * baseline's are counted in the summary line, never compared: they are the
 * split's own, and nothing the game did.
 *
 * WHAT IS DRIVEN. Every export that is a table is compared whole. Every
 * export that is a pure function of its arguments is driven over the inputs
 * below: the boxes (applyResult over every box, result and first-correct
 * state), the schedulers (buildSession, dueChunks, buildPreSession), the
 * promotions (checkPromotion, checkPrePromotion, isSecure, ladderComplete,
 * gardenState, workingOnWords), the saves (migrate and heal over the version
 * 2 to 7 fixtures the tests use and over hostile shapes), the chunker and
 * the sounds (chunkWord, soundIdsFor, soundIdFor, dashed, displayWord,
 * ttsSafeWord, ttsSafePraise) over every bank word, the reveal plans
 * (feedbackParts, clipPlan, sentencePlan, sentenceClosePlan, tileSlots,
 * sentenceLead, resolvePack, isSeam, seamMs), the sentences (sessionSentences,
 * sentencesUpTo, sentenceWords, revealWord, revealWordLongest), the trays
 * (trayPool, trayExtras, trayClash, trayForbidden, buildable, buildTray,
 * buildSoundTray, shuffle), the ladder (preItems, preLetters, chunkSeat,
 * chunkSeats), the export (buildMarkdown), and the zero-argument derivations
 * (newState, bankWords, soundInventory, voiceScript). Outputs are compared as
 * canonical JSON: keys sorted, NaN, undefined and functions spelled out, and a
 * throw recorded as the message it threw, so an engine that throws where the
 * other returns - or throws a different message - is a difference too.
 * Normalised fields: none.
 *
 * THE GENERATOR AND THE CLOCK ARE THE HARNESS'S. mulberry32 is the census's
 * own generator, its ten lines copied from tests/ui/monkey.mjs's source rather
 * than imported, because a tool imports no test. A function with a `rand`
 * parameter is handed the generator. buildSession, sessionSentences and the
 * tray builders reach for Math.random themselves, and buildMarkdown stamps
 * today's date, so for the length of EVERY call Math.random is the seeded
 * generator and Date is pinned to one instant - installed before the call,
 * restored after, the same seed for both engines. A refactor that adds a
 * second source of randomness or time shows up here as a difference.
 *
 * NOT COVERED, and why: speak, hush, buzz, feedbackSpeech and loadState and
 * saveState reach the browser's speech and storage, and alpha's colours are
 * pinned by tests/tokens.test.js already; the garden's render hash is not an
 * engine output - tools/art-render.mjs hashes the python renders pinned in
 * tools/art/provenance.json - so there is nothing of it to compare here.
 *
 * Run:      node tools/differential.mjs
 * Controls: node tools/differential.mjs --self-test
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { finish } from "./lib/selftest.mjs";
import { run, must, withScratch } from "./lib/proc.mjs";

const BASELINE_TAG = "v1.0.0-beta.32";
const REFERENCE = "reference/word-quest.jsx";
const EXTRACTOR = "tools/extract-engine.mjs";
const SEEDS = [1, 2, 20260912];
const CLOCK = Date.UTC(2026, 8, 12, 12, 0, 0);
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* The census's generator (tools/census-novelties.mjs, imported by the monkey),
   copied rather than imported. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------- engines -- */
function baselineFile(path, tag = BASELINE_TAG) {
  const r = run("git", ["show", `${tag}:${path}`]);
  if (r.status === 0) return r.stdout;
  const why = String(r.stderr || r.error || "").trim().split("\n")[0].slice(0, 120);
  throw new Error(`the baseline tag ${tag} is not in this clone (${why}). A shallow checkout carries no tags: run git fetch --tags, or clone with the whole history.`);
}
const baselineSource = (tag = BASELINE_TAG) => baselineFile(REFERENCE, tag);
/* The extractor that built beta 32, from the tag: it carries the hand-typed
   export list and reads no markers, and it is what builds the baseline. */
const baselineExtractor = (tag = BASELINE_TAG) => baselineFile(EXTRACTOR, tag);
async function buildEngine(source, box, name, extractor = EXTRACTOR) {
  const jsx = join(box, name + ".jsx"), out = join(box, name + "-engine.js");
  writeFileSync(jsx, source);
  must(run(process.execPath, [extractor, jsx, out]), "the extractor");
  return import(pathToFileURL(out).href);
}

/* ------------------------------------------------------------ canonical -- */
/* What JSON would drop or mangle, spelled out; null when the value is plain. */
function spelled(val) {
  if (typeof val === "function") return "[function]";
  if (typeof val === "number" && !Number.isFinite(val)) return `[${val}]`;   // NaN, Infinity, -Infinity
  if (val === undefined) return "[undefined]";
  if (val instanceof Set) return { "[Set]": [...val] };
  if (val instanceof Map) return { "[Map]": [...val] };
  return null;
}
function sorted(val) {
  const o = {};
  for (const key of Object.keys(val).sort()) o[key] = val[key];
  return o;
}
const plainObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
function canonical(v) {
  return JSON.stringify(v, (k, val) => {
    const special = spelled(val);
    if (special !== null) return special;
    return plainObject(val) ? sorted(val) : val;
  });
}

/* An argument is plain data, or one of two markers the case list uses for the
   things data cannot carry: a seeded generator, or a membership function for
   resolvePack built from a list of "tier:id" strings. */
function materialise(arg) {
  if (arg && typeof arg === "object" && !Array.isArray(arg)) {
    if (arg.__rand !== undefined) return mulberry32(arg.__rand);
    if (arg.__has !== undefined) { const set = new Set(arg.__has); return (tier, id) => set.has(`${tier}:${id}`); }
  }
  return structuredClone(arg);
}
/* One call, with the harness's generator and clock installed for its length. */
function call(engine, fn, args, seed) {
  const f = engine[fn];
  if (typeof f !== "function") return { missing: fn };
  const keepRandom = Math.random, RealDate = Date;
  Math.random = mulberry32(seed);
  /* A Date whose bare constructor is the pinned instant; TypeScript's
     DateConstructor type also carries the call signature Date() returns a
     string with, which a class cannot spell, hence the cast. */
  globalThis.Date = /** @type {DateConstructor} */ (/** @type {unknown} */ (class extends RealDate {
    /** @param {...any} a */
    constructor(...a) {
      if (a.length === 0) super(CLOCK);
      else if (a.length === 1) super(a[0]);
      else super(a[0], a[1], a[2] ?? 1, a[3] ?? 0, a[4] ?? 0, a[5] ?? 0, a[6] ?? 0);
    }
    static now() { return CLOCK; }
  }));
  try { return { value: f(...args.map(materialise)) }; }
  catch (e) { return { threw: String((e && e.message) || e) }; }
  finally { Math.random = keepRandom; globalThis.Date = RealDate; }
}

/* ------------------------------------------------------------- inputs --
   Built from the BASELINE's own tables, so both engines meet the same data
   whatever the candidate's tables say - and the tables themselves are
   compared whole, first. */
const WS = (over) => ({ box: 0, attempts: 0, correct: 0, close: 0, wrong: 0, dueAt: 1, lastSession: 0, ...over });
function seededWords(B, level, seed, share = 0.8) {
  const rnd = mulberry32(seed);
  const words = {};
  for (const l of B.LEVELS) {
    if (l.n > level + 1) break;
    for (const w of l.words) {
      if (rnd() > share || l.n === level + 1 && rnd() > 0.2) continue;
      const box = Math.floor(rnd() * 6), attempts = 1 + Math.floor(rnd() * 6);
      const correct = Math.min(attempts, Math.floor(rnd() * (attempts + 1)));
      const wrong = Math.floor(rnd() * (attempts - correct + 1));
      words[w] = WS({ box, attempts, correct, wrong, close: attempts - correct - wrong,
        dueAt: 1 + Math.floor(rnd() * 30), lastSession: Math.floor(rnd() * 20) });
    }
  }
  return words;
}
function seededStates(B) {
  const fresh = B.newState();
  const graduate = (level, seed, over = {}) => ({ ...fresh, preLevel: 0, level, sessionsCompleted: seed % 41,
    perfectStreak: seed % 3, words: seededWords(B, level, seed), ...over });
  const boxed = (keys, box) => Object.fromEntries(keys.map((k) => [k, WS({ box, attempts: 2, correct: 2 })]));
  const rung1 = B.preItems(1), rung2 = B.preItems(2);
  const chunks = (level, box) => Object.fromEntries(B.CHUNK_ROSTER.filter((c) => (B.chunkSeat(c) || 0) <= level && B.chunkSeat(c) > 0).slice(0, 12).map((c) => ["c:" + c, WS({ box, attempts: 1, correct: 1, dueAt: 2 })]));
  const list = [
    fresh,
    { ...fresh, preLevel: 1, pre: boxed(rung1.slice(0, 5), 3) },
    { ...fresh, preLevel: 1, pre: boxed(rung1.slice(0, 4), 3), prePerfectStreak: 1 },
    { ...fresh, preLevel: 2, sessionsCompleted: 3, pre: { ...boxed(rung1, 2), ...boxed(rung2.slice(0, 2), 1) } },
    { ...fresh, preLevel: 2, pre: boxed([...rung1, ...rung2], 3) },
    { ...fresh, preLevel: 0, level: 1 },
    graduate(1, 5), graduate(2, 6), graduate(5, 7), graduate(6, 8), graduate(14, 9), graduate(20, 10),
    graduate(40, 11, { pre: chunks(40, 3) }), graduate(57, 12, { pre: chunks(57, 5) }), graduate(77, 13, { bringForward: B.LEVELS[76].words.slice(0, 4) }),
    graduate(100, 14), graduate(100, 15, { words: Object.fromEntries(B.bankWords().map((w) => [w, WS({ box: 5, attempts: 6, correct: 6, dueAt: 99 })])) }),
    graduate(3, 16, { words: Object.fromEntries(B.LEVELS[2].words.map((w) => [w, WS({ box: 0, attempts: 9, wrong: 9, dueAt: 1 })])) }),
  ];
  return list;
}
/* The saves the tests migrate, as literals of the same shapes (tests/migrate.test.js,
   tests/pre.test.js, tests/faults.test.js), plus hostile documents. */
function migrateFixtures(B) {
  const fresh = B.newState();
  const boxed = (keys, box) => Object.fromEntries(keys.map((k) => [k, WS({ box, attempts: 2, correct: 2 })]));
  const v2 = { version: 2, level: 3, sessionsCompleted: 9, settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },
    words: { cat: WS({ box: 5, attempts: 9, correct: 8, close: 1, dueAt: 20, lastSession: 8 }) },
    log: [{ n: 1, level: 1, c: 18, k: 1, w: 1, acc: 90, items: [], partial: false }] };
  const everyWordBut = (skip) => Object.fromEntries(B.bankWords().filter((w) => !skip.includes(w)).map((w) => [w, WS({ box: 5, attempts: 6, dueAt: 99 })]));
  const save = (version, level, pre = {}) => ({ version, level, preLevel: 0, prePerfectStreak: 0, sessionsCompleted: 100, perfectStreak: 0, words: {}, log: [], pre, settings: { sound: true, childName: "", lang: "en-US" } });
  return [
    v2, { ...v2, level: 6 },
    { version: 3, level: 99 }, { version: 3, level: -5 }, { version: 3, level: 5, words: {} }, { version: 3, level: 8, words: {} },
    { version: 3, level: 2, words: boxed(B.LEVELS.slice(0, 6).flatMap((l) => l.words), 5) },
    { version: 3, words: boxed(B.LEVELS[0].words.slice(0, 7), 3) }, { version: 3, words: boxed(B.LEVELS[0].words.slice(0, 8), 3) },
    { version: 3, level: 3.7 }, { version: 3, level: "abc" }, { version: 3, level: {} },
    { version: 4, level: 99 }, { version: 4, level: 20.5 }, { version: 4, level: 20.4 }, { version: 4, level: -5 },
    { version: 4, level: 1, words: {}, log: [], settings: {} }, { version: 4, level: 1, words: boxed(["cat"], 3), log: [], settings: {} },
    { version: 4, level: 1, words: {}, log: [], sessionsCompleted: 2, settings: {} }, { version: 4, level: 8, words: {}, log: [], settings: {} },
    { ...fresh, version: 5, level: 21, preLevel: 0, words: everyWordBut(["cops", "spots"]) },
    { ...fresh, version: 5, level: 15, preLevel: 0, words: {} }, { ...fresh, version: 5, level: 14, preLevel: 0, words: { cat: WS({ box: 5, attempts: 4, dueAt: 99 }) } },
    { version: 5, level: 999 },
    { ...fresh, version: 6, preLevel: 2, pre: boxed(["s", "a", "t", "p"], 3) },
    { ...fresh, version: 6, preLevel: 3, pre: boxed(["s", "a", "t", "p", "i", "n"], 3) },
    { ...fresh, version: 6, preLevel: 2, pre: boxed(["an", "at", "sat"], 4) },
    { ...fresh, version: 6, preLevel: 1, pre: boxed(B.preItems(1), 3) },
    { ...fresh, version: 6, preLevel: 0, words: boxed(["cat"], 3) },
    save(6, 77), save(5, 77), save(7, 5), save(6, 1), save(6, 3),
    { ...fresh, level: 999 }, { ...fresh, level: -3 }, { ...fresh, preLevel: 99 }, { ...fresh, preLevel: NaN, pre: { s: WS({ box: 3, attempts: 2, correct: 2 }) } },
    { ...fresh, preLevel: "abc" }, { ...fresh, preLevel: "abc", words: { s: WS({ box: 3, attempts: 2, correct: 2 }) } },
    { ...fresh, preLevel: NaN, level: 5, pre: { s: WS({ box: 4, attempts: 3, correct: 3, lastSession: 1 }) }, words: { cat: WS({ box: 5, attempts: 4, correct: 4, lastSession: 2 }) } },
    {}, null, { version: "2" }, { log: null }, { words: [] }, [], 5, "a string", { version: 7, words: { cat: { box: 9.4, attempts: "x" } }, log: [null, 3, { items: [1, null] }], settings: { sound: "yes" }, perfectStreak: 9, prePerfectStreak: -2 },
  ];
}

/* The words and the sounds: every bank word and a few strangers. */
function wordCases(add, B, words, units) {
  for (const fn of ["newState", "bankWords", "soundInventory", "voiceScript", "chunkSeats"]) add(fn, []);
  for (const w of words) for (const fn of ["chunkWord", "soundIdsFor", "dashed", "displayWord", "ttsSafeWord", "buildable"]) add(fn, [w]);
  for (const g of units) add("soundIdFor", [g]);
  for (const w of words) for (const g of units.slice(0, 6)) add("displayChunk", [w, g]);
  for (let i = 0; i <= 20; i++) add("ttsSafePraise", [i]);
  for (const solid of [0, 3, 4, 5, 8, 10]) for (const total of [0, 5, 6, 10]) add("isSecure", [solid, total]);
}
/* The boxes: every box, result and first-correct state. */
function boxCases(add) {
  for (const box of [0, 1, 2, 3, 4, 5]) for (const correct of [0, 1]) for (const result of ["correct", "close", "wrong"]) for (const n of [1, 7])
    add("applyResult", [WS({ box, correct, attempts: correct }), result, n]);
}
/* The reveal plans and what reads them. */
function planCases(add, B, sample) {
  for (const result of ["correct", "close", "wrong"]) for (const w of sample) add("feedbackParts", [result, w]);
  for (const kind of ["correct", "close", "wrong", "replay", "levelup", "done"]) for (const w of sample.slice(0, 20)) for (const praise of [0, 3, 99]) add("clipPlan", [kind, w, praise]);
  for (const result of ["correct", "close", "wrong"]) for (const i of [0, 1, 2, 5, 13]) add("sentenceLead", [result, i]);
  for (const w of sample.slice(0, 20)) {
    add("sentencePlan", ["s:v3-l01-01", w, "s:soundout-1"]); add("sentencePlan", ["s:v3-l01-01", null, "s:soundout-2"]);
    add("tileSlots", [B.clipPlan("correct", w, 0), B.soundIdsFor(w)]); add("tileSlots", [B.clipPlan("wrong", w, 0)]);
    add("resolvePack", [B.clipPlan("correct", w, 0), { __has: B.clipPlan("correct", w, 0).map((id) => "default:" + id) }]);
    add("resolvePack", [B.clipPlan("correct", w, 0), { __has: ["family:w:" + w] }]);
  }
  add("sentenceClosePlan", ["s:v3-l02-01"]);
  for (const id of ["seam", "seam2", "d:s", "w:cat"]) { add("isSeam", [id]); add("seamMs", [id]); }
}
/* The sentences: every text, and the plan at every level. */
function sentenceCases(add, B) {
  const texts = Object.entries(B.SENTENCES).flatMap(([level, list]) => list.map((s) => [Number(level), s.text]));
  for (const [level, text] of texts) { add("sentenceWords", [text]); add("revealWord", [text, level]); add("revealWord", [text, level + 1]); add("revealWordLongest", [text]); }
  for (const level of [1, 2, 3, 5, 6, 14, 15, 20, 40, 57, 77, 100]) { add("sentencesUpTo", [level]); add("trayPool", [level]); add("trayExtras", [level]); }
  for (const seed of SEEDS) for (let level = 1; level <= B.LEVELS.length; level++) add("sessionSentences", [level], seed);
  for (const size of [5, 10, 20, 25]) add("sessionSentences", [5, size], 3);
}
/* The trays, seeded where they draw. */
function trayCases(add, B, sample) {
  for (const w of sample.slice(0, 15)) for (const c of ["b", "sh", "a", "ck"]) { add("trayClash", [w, c]); add("trayForbidden", [B.chunkWord(w).concat([c]), B.chunkWord(w).length]); }
  for (const seed of SEEDS) for (const n of [0, 1, 2, 5, 20]) add("shuffle", [Array.from({ length: n }, (_, i) => i), { __rand: seed }], seed);
  for (const seed of SEEDS) for (const pre of [0, 1, 2, 3]) add("buildSoundTray", [pre, { __rand: seed }], seed);
  for (const seed of SEEDS.slice(0, 2)) for (const w of sample) add("buildTray", [w, B.WORD_LEVEL[w], { __rand: seed }], seed);
}
/* The ladder's rungs and the roster's seats. */
function seatCases(add, B) {
  for (const n of [0, 1, 2, 3]) { add("preItems", [n]); add("preLetters", [n]); }
  for (const c of [...B.CHUNK_ROSTER, "zz", "he"]) add("chunkSeat", [c]);
}
/* The schedulers, the promotions, the export and the saves, over the seeded states. */
function stateCases(add, B) {
  for (const s of seededStates(B)) {
    for (const seed of SEEDS) add("buildSession", [s], seed);
    for (const fn of ["gardenState", "ladderComplete", "workingOnWords", "dueChunks", "buildPreSession", "buildMarkdown", "checkPromotion", "checkPrePromotion", "migrate", "heal"]) add(fn, [s]);
    add("dueChunks", [s, 1]);
    for (const session of [{ partial: true }, { perfect: true }, { perfect: false }]) { add("checkPromotion", [s, session]); add("checkPrePromotion", [s, session]); }
  }
  for (const fx of migrateFixtures(B)) { add("migrate", [fx]); add("heal", [fx]); }
}
function cases(B) {
  const list = [];
  const add = (fn, args, seed = 1) => list.push({ fn, args, seed });
  const words = [...new Set([...B.bankWords(), "laughs", "breakfast", "xyz", "a", "i", "queen", "thankful", "ax"])];
  const units = [...new Set(words.flatMap((w) => B.chunkWord(w))), "xq", "ai", "ou"];
  const sample = words.filter((w) => B.WORD_LEVEL[w]).slice(0, 40);
  wordCases(add, B, words, units);
  boxCases(add);
  planCases(add, B, sample);
  sentenceCases(add, B);
  trayCases(add, B, sample);
  seatCases(add, B);
  stateCases(add, B);
  return list;
}

/* --------------------------------------------------------------- compare -- */
function compare(B, C, list) {
  const differences = [];
  const tables = Object.keys(B).filter((k) => typeof B[k] !== "function").sort();
  for (const name of tables) {
    const b = canonical(B[name]), c = canonical(C[name]);
    if (b !== c) differences.push({ fn: name, input: "(the exported table itself)", baseline: b, candidate: c });
  }
  const functions = new Set();
  for (const { fn, args, seed } of list) {
    functions.add(fn);
    const b = canonical(call(B, fn, args, seed)), c = canonical(call(C, fn, args, seed));
    if (b !== c) differences.push({ fn, input: canonical(args), baseline: b, candidate: c });
  }
  const missing = Object.keys(B).filter((k) => !(k in C)).sort();
  if (missing.length) differences.push({ fn: "(the export list)", input: "(every name the baseline exports must be in the candidate)", baseline: canonical(missing), candidate: "(absent)" });
  const extra = Object.keys(C).filter((k) => !(k in B)).length;
  return { differences, functions: functions.size, cases: list.length, tables: tables.length, extra };
}
const clip = (s, n = 500) => (s.length > n ? s.slice(0, n) + `... (${s.length - n} more)` : s);
function printFirst(d) {
  console.log(`  first difference: ${d.fn}`);
  console.log(`    input:     ${clip(d.input)}`);
  console.log(`    baseline:  ${clip(d.baseline)}`);
  console.log(`    candidate: ${clip(d.candidate)}`);
}

function withEngines(candidateSource, fn) {
  return withScratch("differential-", async (box) => {
    const old = join(box, "baseline-extractor.mjs");
    writeFileSync(old, baselineExtractor());
    const B = await buildEngine(baselineSource(), box, "baseline", old);
    const C = await buildEngine(candidateSource, box, "candidate");
    return fn(B, C);
  });
}

/* -------------------------------------------------------------- controls --
   The G5 table's first entry, planted into a copy of the candidate: the
   harness must refuse it and name applyResult. A second plant moves a table
   the schedulers read. A pristine candidate must pass, one seed must repeat
   itself and two must differ, the clock must hold still, and a missing tag
   must be refused with the fetch command in the message. */
function formControls(T) {
  T("the canonical form ignores key order and sees a moved number",
    canonical({ a: 1, b: [1, { d: 2, c: 3 }] }) === canonical({ b: [1, { c: 3, d: 2 }], a: 1 }) && canonical({ a: 1 }) !== canonical({ a: 2 }));
  T("the canonical form spells out what JSON drops: NaN, undefined, a function",
    canonical([NaN, undefined, () => 1]) === '["[NaN]","[undefined]","[function]"]' && canonical({ x: undefined }) !== canonical({}));
  let refused = null;
  try { baselineSource("v0.0.0-no-such-tag"); } catch (e) { refused = String(e.message); }
  T("a clone without the baseline tag is refused, naming git fetch", refused !== null && refused.includes("git fetch --tags"));
  /* The baseline's builder is the tag's extractor, which still types its
     export list by hand; the tree's does not. An extractor shared between
     the two engines would be an oracle shared with the code it judges. */
  const list = "const EXPORTS" + " = [";
  T("the baseline is built by the tag's own extractor, which carries the hand-typed export list the tree's has lost",
    baselineExtractor().includes(list) && !readFileSync(EXTRACTOR, "utf8").includes(list));
}
async function plantControls(T, source) {
  const plants = [
    ["fast-track box 3 to 2 (the G5 table's first entry)", "ws.box = firstCorrect ? 3 :", "ws.box = firstCorrect ? 2 :", "applyResult"],
    ["SESSION_SIZE 20 to 19 (a table the schedulers read)", "const SESSION_SIZE = 20;", "const SESSION_SIZE = 19;", "SESSION_SIZE"],
  ];
  for (const [name, from, to, expectFn] of plants) {
    if (!source.includes(from)) { T(`the plant "${name}" has an anchor in the candidate`, false); continue; }
    const r = await withEngines(source.replace(from, to), (B, C) => compare(B, C, cases(B)));
    T(`a candidate with ${name} planted is refused, and the first difference names ${expectFn}`,
      r.differences.length > 0 && r.differences[0].fn === expectFn);
  }
  /* A name the baseline exports and the candidate has lost. LANGS is the
     plant because nothing under app/src, tests or tools imports it - the
     tree's extractor refuses an extraction that drops an imported name
     before this harness could see it - and the engine body never uses it. */
  const lost = await withEngines(source.replace("const LANGS = [", "const LANGS2 = ["), (B, C) => compare(B, C, cases(B)));
  const list = lost.differences.find((d) => d.fn === "(the export list)");
  T("a candidate missing a name the baseline exports is refused, and the export-list difference names it",
    !!list && list.baseline.includes("LANGS") && lost.differences.some((d) => d.fn === "LANGS"));
}
async function engineControls(T, source) {
  await withEngines(source, async (B, C) => {
    const r = compare(B, C, cases(B));
    T("the tree's own reference against the baseline: zero differences", r.differences.length === 0 && r.functions >= 40);
    const s = seededStates(B)[8];
    const one = canonical(call(B, "buildSession", [s], 7)), again = canonical(call(B, "buildSession", [s], 7)), other = canonical(call(B, "buildSession", [s], 8));
    T("one seed repeats a session exactly and another seed changes it - Math.random is the harness's for the call", one === again && one !== other);
    T("the clock holds still: two markdown exports agree to the day", canonical(call(B, "buildMarkdown", [s], 1)) === canonical(call(C, "buildMarkdown", [s], 1)) && call(B, "buildMarkdown", [s], 1).value.includes("2026-09-12"));
    T("the generator and the clock are put back after a call", Math.random !== undefined && Date.now() > CLOCK && String(Math.random).includes("native code"));
  });
}
async function selfTest() {
  const cases_ = [];
  const T = (label, pass) => cases_.push([label, pass]);
  const source = readFileSync(REFERENCE, "utf8");
  formControls(T);
  await plantControls(T, source);
  await engineControls(T, source);
  return finish("differential", cases_);
}

const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (RUN_AS_COMMAND) {
  if (process.argv.includes("--self-test")) process.exit((await selfTest()) ? 1 : 0);
  const candidate = readFileSync(REFERENCE, "utf8");
  const baseline = baselineSource();
  const r = await withEngines(candidate, (B, C) => compare(B, C, cases(B)));
  console.log(`Differential: baseline ${BASELINE_TAG} ${sha(baseline).slice(0, 12)}, candidate ${sha(candidate).slice(0, 12)}, ${r.tables} tables, ${r.functions} functions driven, ${r.cases} cases, ${r.differences.length} differences; the candidate exports ${r.extra} names beyond the baseline's`);
  if (r.differences.length) {
    printFirst(r.differences[0]);
    const rest = [...new Set(r.differences.slice(1).map((d) => d.fn))];
    if (rest.length) console.log(`  also differing: ${rest.join(", ")}`);
  }
  process.exit(r.differences.length ? 1 : 0);
}
