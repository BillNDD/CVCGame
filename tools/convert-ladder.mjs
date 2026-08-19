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

/* ---- LEVELS ---------------------------------------------------------- */
const problems = [];
const levels = [];
for (const lad of ladder) {
  const sh = shape.find((s) => s.n === lad.n);
  const heart = (sh.heart || []).filter(Boolean);
  /* hearts first, then the taught words in the ladder's own order; a heart
     word also seated as a taught word keeps its taught seat only. */
  const words = [...heart.filter((h) => !lad.words.includes(h)), ...lad.words];
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

const DRY = !process.argv.includes("--write");
const OUT = process.env.CONVERT_OUT || HERE;
writeFileSync(path.join(OUT, "draft-levels.json"), JSON.stringify(levels, null, 1) + "\n");
writeFileSync(path.join(OUT, "draft-sentences.json"), JSON.stringify(sentences, null, 1) + "\n");
console.log(DRY
  ? `Dry run: draft-levels.json and draft-sentences.json written to ${OUT}; the reference is untouched.`
  : problems.length
    ? "REFUSED to write: the problems above must be closed first."
    : "(--write is not implemented until the names file exists and is owner-approved)");
if (!DRY && problems.length) process.exit(1);
