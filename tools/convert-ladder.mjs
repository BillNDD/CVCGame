/* The ladder conversion — the generator that turns the ruled 100-level design
 * into the engine's own literals. Owner-ordered 2026-08-19: "please start the
 * engine conversion."
 *
 * WHY A GENERATOR AND NOT AN EDIT. The conversion replaces the two largest
 * literals in the reference build: LEVELS (21 entries -> 100) and SENTENCES
 * (210 texts -> 484). Hand-typing 990 seated words invites exactly the drift
 * class G27 was built to catch, and a hand edit cannot be re-run when the
 * ladder moves. This tool derives both literals from the same three sources
 * every gate already trusts:
 *
 *   tools/ladder/ladder-v4.json      the seated words, owner-ruled
 *   tools/ladder/shape-v3.json       what each level teaches + its heart words
 *   tools/pending-words/pending-words.json   every approved text, by id
 *
 * plus one authored file this tool REFUSES to invent:
 *
 *   tools/ladder/decade-names.json   name and emoji per DECADE of levels -
 *                                    owner-ruled 2026-08-19: "I think it's
 *                                    better to have numbered levels and names
 *                                    for each decade (levels 1-10, 11-20
 *                                    etc)". Ten entries, keyed "1".."10". A
 *                                    level's name and emoji are its decade's;
 *                                    its focus line is the shape's own
 *                                    `teaches` text, which is ruled teaching
 *                                    description rather than invented copy.
 *
 * HEART WORDS ARE SEATED INLINE, following the game's own precedent: the
 * shipped level 1 already carries "the", "a", "and" and "i" in its words
 * array. shape-v3's per-level heart arrays merge in ahead of the taught words,
 * so truly-random draws and WORD_LEVEL see them exactly as the 21-level game
 * always has. This is why "16 of 17 heart words undrawable" (G27) is a
 * conversion fact, not a redesign question.
 *
 * MODES. Dry-run (default) writes draft-levels.json and draft-sentences.json
 * beside this file's report and touches nothing. --write splices the literals
 * into reference/word-quest.jsx between their own anchors, proves the splice
 * reversible byte-for-byte the way tools/conversion-rehearsal.mjs does, and
 * regenerates src/engine.js via the real extractor. The test-literal
 * re-derivation that must follow a --write is deliberately manual (E4: every
 * expected value re-derived by hand, never read off the constant under test).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);
const R = (p) => JSON.parse(readFileSync(path.join(REPO, p), "utf8"));

const ladder = R("tools/ladder/ladder-v4.json");
const shapeRaw = R("tools/ladder/shape-v3.json");
const shape = Array.isArray(shapeRaw) ? shapeRaw : shapeRaw.levels;
const pend = R("tools/pending-words/pending-words.json");
const NAMES_PATH = "tools/ladder/decade-names.json";
const names = existsSync(path.join(REPO, NAMES_PATH)) ? R(NAMES_PATH) : null;
const decadeOf = (n) => String(Math.ceil(n / 10));

/* THE ONE SEAT-MERGE. Exported because tools/conversion-rehearsal.mjs must
   rehearse the exact levels this tool will write - the independent audit's B3
   found the rehearsal testing 990 seats while this file built 1,014, the
   two-models fault inside the gate built to stop it. Hearts first, then the
   taught words in the ladder's own order; a heart also seated as a taught
   word keeps its taught seat only. */
export function seatWords(lad, sh) {
  const heart = ((sh && sh.heart) || []).filter(Boolean);
  return [...heart.filter((h) => !lad.words.includes(h)), ...lad.words];
}

const IS_MAIN = process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href;

/* ---- LEVELS ---------------------------------------------------------- */
const problems = [];
const levels = [];
for (const lad of ladder) {
  const sh = shape.find((s) => s.n === lad.n);
  const words = seatWords(lad, sh);
  const nm = names && names[decadeOf(lad.n)];
  if (!nm) problems.push(`decade ${decadeOf(lad.n)} (level ${lad.n}) has no entry in ${NAMES_PATH}`);
  levels.push({
    n: lad.n,
    name: nm ? nm.name : `(unnamed decade ${decadeOf(lad.n)})`,
    emoji: nm ? nm.emoji : "?",
    focus: sh.teaches,
    words,
  });
}

/* ---- SENTENCES -------------------------------------------------------- */
const sentences = {};
let texts = 0;
for (const [id, row] of Object.entries(pend)) {
  const m = /^s:v3-l(\d+)-\d+$/.exec(id);
  if (!m) continue;
  const n = String(+m[1]);
  (sentences[n] = sentences[n] || []).push({ id, text: row.text });
  texts++;
}
for (const n of Object.keys(sentences)) sentences[n].sort((a, b) => a.id.localeCompare(b.id));

/* ---- the report ------------------------------------------------------- */
const seated = levels.reduce((a, l) => a + l.words.length, 0);
const emptyLv = levels.filter((l) => !l.words.length).map((l) => l.n);
const noText = levels.filter((l) => !sentences[String(l.n)]).map((l) => l.n);
console.log(`Conversion source: ${levels.length} levels, ${seated} seated words ` +
  `(hearts inline), ${texts} texts across ${Object.keys(sentences).length} levels`);
console.log(`  levels with no words: ${emptyLv.join(" ") || "none"}`);
console.log(`  levels with no text : ${noText.join(" ") || "none"}`);
console.log(`  decade names authored: ${names ? Object.keys(names).filter((k) => !k.startsWith("_")).length : 0} of 10` +
  (names ? "" : `  <- ${NAMES_PATH} does not exist yet`));
for (const p of problems.slice(0, 3)) console.log("  BLOCKS --write: " + p);
if (problems.length > 3) console.log(`  ... and ${problems.length - 3} more of the same`);

/* ---- the lexicon deltas (the blueprint's Q1) -------------------------- */
/* CSV parsing is imported from the rehearsal so the two tools cannot parse
   the same file two ways. */
import { csvCells, spanOf } from "./conversion-rehearsal.mjs";

export function lexiconRows(csvText) {
  const lines = csvText.trim().split(/\r?\n/).slice(1);
  const rows = [];
  for (const line of lines) {
    const [word, , tiles, sounds] = csvCells(line);
    if (!word || word === "-") continue;
    rows.push({ word, tiles: tiles.split("-"), sounds: sounds.split(" ").filter(Boolean) });
  }
  return rows;
}

/* The delta computation: what the lexicon says that the rules do not.
   read#past IS the game's word read (level 69's own sense, owner-adjudicated);
   read#present is provenance only. A hand WORD_SOUND row that disagrees with
   the lexicon is REFUSED, never silently outvoted - the hand rows are owner
   rulings and the CSV is the owner's canon; if they split, a person decides. */
export function lexiconDeltas(rows, E) {
  const wordTiles = {}, lexBends = {}, faults = [];
  for (const r of rows) {
    if (r.word === "read#present") continue;
    const w = r.word === "read#past" ? "read" : r.word;
    if (E.ruleTilesFor(w).join("-") !== r.tiles.join("-")) wordTiles[w] = r.tiles;
    const base = E.ruleSoundsFor(r.tiles);
    const hand = E.WORD_SOUND[w] || {};
    const bends = {};
    for (let i = 0; i < r.tiles.length; i++) {
      const want = "d:" + r.sounds[i];
      if (hand[i] !== undefined) {
        if ("d:" + hand[i] !== want)
          faults.push(`${w}: hand WORD_SOUND says ${hand[i]} at tile ${i}, the lexicon says ${r.sounds[i]} - a person decides`);
        continue;   // the hand row carries it; LEX_BENDS stays disjoint
      }
      if (base[i] !== want) bends[i] = r.sounds[i];
    }
    if (Object.keys(bends).length) lexBends[w] = bends;
  }
  return { wordTiles, lexBends, faults };
}

/* ---- the four-span splice (the blueprint's Q8) ------------------------- */
/* Reversibility is proved byte-for-byte like the rehearsal's two-span
   version; unlike the rehearsal, an UNCHANGED result is convergence rather
   than refusal, because a second --write must be idempotent. */
/* One line per level, per sentence-level, per map row - compact emission -
   because the generated engine carries its own 2,400-line ceiling (E6) and
   pretty-printed JSON for these literals alone measures 3,222 lines. */
function emitLevels(levels) {
  return "const LEVELS = [\n" + levels.map((l) => " " + JSON.stringify(l) + ",").join("\n") + "\n];\n";
}
function emitByKey(obj, name) {
  const keys = Object.keys(obj).sort((x, y) => (isNaN(+x) || isNaN(+y)) ? String(x).localeCompare(String(y)) : +x - +y);
  return "const " + name + " = {\n" + keys.map((k) => " " + JSON.stringify(k) + ": " + JSON.stringify(obj[k]) + ",").join("\n") + "\n};\n";
}
export function spliceAll(src, lit) {
  const spans = [
    ["LEVELS", "const LEVELS = [", "\n];\n", emitLevels(lit.levels)],
    ["SENTENCES", "const SENTENCES = {", "\n};\n", emitByKey(lit.sentences, "SENTENCES")],
    ["WORD_TILES", "const WORD_TILES = {", "\n};\n", emitByKey(lit.wordTiles, "WORD_TILES")],
    ["LEX_BENDS", "const LEX_BENDS = {", "\n};\n", emitByKey(lit.lexBends, "LEX_BENDS")],
  ];
  const cuts = spans.map(([label, open, close, repl]) => {
    const [a, b] = spanOf(src, open, close, label);
    return { label, a, b, repl };
  }).sort((x, y) => x.a - y.a);
  for (let i = 1; i < cuts.length; i++)
    if (cuts[i - 1].b > cuts[i].a) throw new Error(`the ${cuts[i - 1].label} and ${cuts[i].label} literals overlap; the splice would corrupt the reference`);
  let rebuilt = "", out = "", pos = 0;
  for (const c of cuts) {
    rebuilt += src.slice(pos, c.a) + src.slice(c.a, c.b);
    out += src.slice(pos, c.a) + c.repl;
    pos = c.b;
  }
  rebuilt += src.slice(pos); out += src.slice(pos);
  if (rebuilt !== src) throw new Error("the splice is not reversible: it would change the reference outside the four data literals");
  return out;
}

/* ---- --write ----------------------------------------------------------- */
/* Verify-before-write: the spliced source goes to a temp dir, through the
   REAL extractor, and the imported module must hold the ladder AND agree
   with every lexicon row - only then does a byte touch the reference. */
export async function verifySpliced(spliced, rows, wantLevels) {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const dir = mkdtempSync(path.join(tmpdir(), "wq-write-"));
  try {
    const refPath = path.join(dir, "word-quest.jsx"), engPath = path.join(dir, "engine.js");
    writeFileSync(refPath, spliced);
    execFileSync(process.execPath, [path.join(REPO, "tools/extract-engine.mjs"), refPath, engPath], { stdio: "pipe" });
    const E = await import(pathToFileURL(engPath).href);
    if (E.LEVELS.length !== wantLevels.length) throw new Error(`the spliced module holds ${E.LEVELS.length} levels, not ${wantLevels.length}`);
    for (let i = 0; i < wantLevels.length; i++)
      if (E.LEVELS[i].words.join(" ") !== wantLevels[i].words.join(" "))
        throw new Error(`level ${wantLevels[i].n} in the spliced module is not the ladder's`);
    const bad = [];
    for (const r of rows) {
      if (r.word === "read#present") continue;
      const w = r.word === "read#past" ? "read" : r.word;
      if (E.chunkWord(w).join("-") !== r.tiles.join("-")) bad.push(`${w}: tiles ${E.chunkWord(w).join("-")} != ${r.tiles.join("-")}`);
      const got = E.soundIdsFor(w).map((s) => s.slice(2)).join(" ");
      if (got !== r.sounds.join(" ")) bad.push(`${w}: sounds ${got} != ${r.sounds.join(" ")}`);
    }
    if (bad.length) throw new Error(`the spliced engine disagrees with ${bad.length} lexicon row(s):\n  ` + bad.slice(0, 5).join("\n  "));
    return { levels: E.LEVELS.length, bank: E.bankWords().length, sounds: E.soundInventory().length };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* ---- --self-test (E5): every refusal proved able to refuse ------------- */
async function selfTest() {
  const say = [], T = (n, ok) => { say.push([n, ok]); };
  const refSrc = readFileSync(path.join(REPO, "reference/word-quest.jsx"), "utf8");
  const E = await import(pathToFileURL(path.join(REPO, "src/engine.js")).href);

  /* 1+2: the spliced-map branches, through the REAL extractor - the proof
     commit 1's tests owed. laugh rides the owner's own ruling; come proves
     a hand WORD_SOUND row outranks a planted LEX_BENDS row. */
  const fixLevels = [{ n: 1, name: "F", emoji: "F", focus: "fixture", words: ["cat", "laugh"] }];
  const fixSent = { "1": [{ id: "s:fix-1", text: "It is a cat." }] };
  const spliced = spliceAll(refSrc, {
    levels: fixLevels, sentences: fixSent,
    wordTiles: { laugh: ["l", "a", "ugh"] },
    lexBends: { laugh: { 2: "f" }, come: { 1: "z" } },
  });
  {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { execFileSync } = await import("node:child_process");
    const dir = mkdtempSync(path.join(tmpdir(), "wq-selftest-"));
    try {
      writeFileSync(path.join(dir, "r.jsx"), spliced);
      execFileSync(process.execPath, [path.join(REPO, "tools/extract-engine.mjs"), path.join(dir, "r.jsx"), path.join(dir, "e.js")], { stdio: "pipe" });
      const S = await import(pathToFileURL(path.join(dir, "e.js")).href);
      T("a WORD_TILES row is honoured by the spliced engine's chunkWord",
        S.chunkWord("laugh").join("-") === "l-a-ugh");
      T("a LEX_BENDS row sounds through the spliced engine",
        S.soundIdsFor("laugh").join(" ") === "d:l d:short_a d:f");
      T("a hand WORD_SOUND row outranks a planted LEX_BENDS row",
        S.soundIdsFor("come")[1] === "d:short_u");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }

  /* 3: a hand-row / lexicon disagreement is REFUSED, never outvoted. */
  const conflict = lexiconDeltas([{ word: "come", tiles: ["c", "o", "m", "e"], sounds: ["k", "z", "m", "silent"] }], E);
  T("a hand-row conflict with the lexicon is a named fault", conflict.faults.length === 1 && conflict.faults[0].includes("come"));
  const agree = lexiconDeltas([{ word: "come", tiles: ["c", "o", "m", "e"], sounds: ["k", "short_u", "m", "silent"] }], E);
  T("the same row in agreement is silent and emits nothing", agree.faults.length === 0 && !agree.lexBends.come);

  /* 4: an irreversible splice refuses rather than corrupting. */
  let threw = false;
  try { spliceAll(refSrc.replace("const WORD_TILES = {", "const WORD_TILES = ["), { levels: fixLevels, sentences: fixSent, wordTiles: {}, lexBends: {} }); }
  catch { threw = true; }
  T("a broken anchor refuses the splice", threw);

  /* 5: verify-before-write catches a lexicon row the spliced engine cannot
     honour - the planted wrong sound never reaches the reference. */
  let refused = false;
  try {
    await verifySpliced(spliceAll(refSrc, { levels: fixLevels, sentences: fixSent, wordTiles: {}, lexBends: {} }),
      [{ word: "cat", tiles: ["c", "a", "t"], sounds: ["k", "long_a", "t"] }], fixLevels);
  } catch (e) { refused = String(e).includes("disagrees"); }
  T("a planted wrong lexicon row is refused before any byte is written", refused);

  let fails = 0;
  for (const [n, ok] of say) { console.log((ok ? "ok   " : "FAIL ") + n); if (!ok) fails++; }
  console.log(`convert-ladder controls: ${say.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}
if (IS_MAIN && process.argv.includes("--self-test")) await selfTest();

const DRY = !process.argv.includes("--write");
const OUT = process.env.CONVERT_OUT || HERE;
if (IS_MAIN) writeFileSync(path.join(OUT, "draft-levels.json"), JSON.stringify(levels, null, 1) + "\n");
if (IS_MAIN) writeFileSync(path.join(OUT, "draft-sentences.json"), JSON.stringify(sentences, null, 1) + "\n");

if (IS_MAIN && DRY) console.log(`Dry run: draft-levels.json and draft-sentences.json written to ${OUT}; the reference is untouched.`);

if (IS_MAIN && !DRY) {
  const { execFileSync } = await import("node:child_process");
  const REF = path.join(REPO, "reference/word-quest.jsx");
  try { execFileSync("git", ["diff", "--quiet", "--", "reference/word-quest.jsx"], { cwd: REPO }); }
  catch { problems.push("reference/word-quest.jsx has uncommitted changes; --write refuses so a revert stays clean"); }
  const E = await import(pathToFileURL(path.join(REPO, "src/engine.js")).href);
  const rows = lexiconRows(readFileSync(path.join(REPO, "tools/lexicon.csv"), "utf8"));
  const seatSet = new Set(levels.flatMap((l) => l.words.map((w) => w.toLowerCase())));
  const rowSet = new Set(rows.map((r) => (r.word === "read#past" ? "read" : r.word)));
  for (const w of seatSet) if (!rowSet.has(w)) problems.push(`seated word "${w}" has no lexicon row`);
  const { wordTiles, lexBends, faults } = lexiconDeltas(rows, E);
  problems.push(...faults);
  if (problems.length) {
    for (const p of problems.slice(0, 8)) console.log("  BLOCKS --write: " + p);
    console.log("REFUSED to write: the problems above must be closed first.");
    process.exit(1);
  }
  const src = readFileSync(REF, "utf8");
  const spliced = spliceAll(src, { levels, sentences, wordTiles, lexBends });
  const spliced2 = spliceAll(spliced, { levels, sentences, wordTiles, lexBends });
  if (spliced2 !== spliced) { console.log("REFUSED: a second splice is not idempotent"); process.exit(1); }
  const v = await verifySpliced(spliced, rows, levels);
  writeFileSync(REF, spliced);
  execFileSync(process.execPath, [path.join(REPO, "tools/extract-engine.mjs")], { cwd: REPO, stdio: "pipe" });
  console.log(`WROTE the reference: ${v.levels} levels, bank ${v.bank}, ${v.sounds} sounds; `
    + `${Object.keys(wordTiles).length} tile override(s), ${Object.keys(lexBends).length} bend row(s). `
    + "Now: the ship steps, then the hand literal re-derivation (E4).");
}
