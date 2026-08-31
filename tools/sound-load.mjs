/* How many NEW sounds may one word ask a child to learn at once?
 *
 * The engine knows every word's sounds, so nothing about this question ever
 * needed a human to check it — and yet on 2026-08-31 it was checked by hand,
 * because no gate asked. That is the fault this file closes.
 *
 * The rule. A word may introduce at most ONE grapheme-sound pair the child has
 * not met at an earlier level. Two at once is a word that teaches nothing
 * cleanly: a child who reads it wrong has been given no way to know which half
 * they missed, and a child who reads it right may have guessed. Words that
 * genuinely need two are not banned — they are DECLARED, in
 * tools/sound-load-ledger.json, one line each with the reason. The ledger is
 * the whole point: a fault that is written down stops being a surprise, and a
 * new one cannot arrive quietly.
 *
 * Counted against STRICTLY EARLIER levels, never against the level's own other
 * words. Within a level the words are shuffled, so a child may meet "picture"
 * before "adventure"; counting them as helping each other would be measuring a
 * teaching order no child is promised.
 *
 * A repeated pair is one pair. "mom" spells m twice and teaches m once.
 *
 * The ledger is checked in BOTH directions. A declared word that no longer
 * needs its declaration is as red as an undeclared one, because a ledger that
 * keeps entries after they stop being true decays into a blanket permission —
 * which is how a list of exceptions becomes a list of nothing.
 *
 * Usage:
 *   node tools/sound-load.mjs              check the shipped ladder
 *   node tools/sound-load.mjs --list       print every word and its new sounds
 *   node tools/sound-load.mjs --self-test  prove the checker catches (E5)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LEVELS, PRE_LEVELS, HEART, TRICKY, chunkWord, soundIdsFor,
         isChunkItem, chunkText, SENTENCES, sentenceWords } from "../src/engine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const LEDGER_PATH = join(HERE, "..", "tools/sound-load-ledger.json");

/* A grapheme-sound pair is the tile a child sees joined to the sound it makes.
   Both come from the engine and they are the same length for every bank word;
   a word where they are not is itself the fault, and is reported. */
export function pairsOf(word) {
  const tiles = chunkWord(word);
  const sounds = soundIdsFor(word);
  if (tiles.length !== sounds.length) return null;
  return tiles.map((g, i) => `${g}=${sounds[i]}`);
}

/* The sounds the pre-levels teach before Level 1 — letters as themselves, and
   the chunks decomposed into the pairs their letters make. */
/** @param {any[]} [pre] */
export function preTaught(pre = PRE_LEVELS) {
  const known = new Set();
  for (const P of pre) {
    for (const it of P.items) {
      const ps = pairsOf(isChunkItem(it) ? chunkText(it) : it);
      for (const p of ps || []) known.add(p);
    }
  }
  return known;
}

/* Walk the ladder and report every word carrying two or more new pairs. */
/** @param {any[]} [levels] @param {any[]} [pre] */
export function heavyWords(levels = LEVELS, pre = PRE_LEVELS) {
  const known = preTaught(pre);
  const heart = new Set([...HEART, ...Object.keys(TRICKY)]);
  const heavy = [];
  const broken = [];
  for (const L of levels) {
    const arriving = new Set();
    for (const w of L.words) {
      const ps = pairsOf(w);
      if (!ps) { broken.push({ level: L.n, word: w }); continue; }
      const fresh = [...new Set(ps.filter((p) => !known.has(p)))];
      if (fresh.length >= 2) {
        heavy.push({ level: L.n, word: w, pairs: fresh.sort(), heart: heart.has(w) });
      }
      for (const p of ps) arriving.add(p);
    }
    for (const p of arriving) known.add(p);
  }
  return { heavy, broken };
}

/* Every sound a sentence needs must be introduced by the sentence's own level.
   tools/decodable.mjs already proves every sentence WORD is taught in time, and
   a taught word's sounds arrive with it — so this agrees with that check by
   construction TODAY. It is asserted anyway, because the two run off different
   engine data: the day the word list and the sound decomposition stop agreeing,
   this is the check that says so instead of a child meeting the difference. */
/** @param {any[]} [levels] @param {any[]} [pre] @param {any} [sentences] */
export function sentenceSounds(levels = LEVELS, pre = PRE_LEVELS, sentences = SENTENCES) {
  const known = preTaught(pre);
  const problems = [];
  for (const L of levels) {
    for (const w of L.words) for (const p of pairsOf(w) || []) known.add(p);
    for (const s of sentences[L.n] || []) {
      for (const raw of sentenceWords(s.text)) {
        const w = raw.replace(/[^a-z]/g, "");
        if (!w) continue;
        for (const p of pairsOf(w) || []) {
          if (!known.has(p)) problems.push(`L${L.n} ${s.id}: "${w}" needs ${p}, not yet taught`);
        }
      }
    }
  }
  return problems;
}

const key = (e) => `${e.level}:${e.word}`;

/* The audit. Takes its data so the self-test can hand it planted faults.
   The JSDoc is load-bearing: the type checker (E7) infers a parameter's shape
   from its defaults, so a field with no default - and a planted `sentences`
   holding one level instead of a hundred - reads as an error without it. */
/**
 * @param {{ levels?: any[], pre?: any[], ledger?: any[], sentences?: any }} [opts]
 * @returns {{ problems: string[], heavy: any[] }}
 */
export function audit({ levels = LEVELS, pre = PRE_LEVELS, ledger = [], sentences = SENTENCES } = {}) {
  const problems = [];
  const { heavy, broken } = heavyWords(levels, pre);
  for (const b of broken) problems.push(`L${b.level} "${b.word}": tiles and sounds are different lengths`);

  const declared = new Map((ledger || []).map((e) => [key(e), e]));
  const found = new Map(heavy.map((e) => [key(e), e]));

  for (const [k, e] of found) {
    const d = declared.get(k);
    if (!d) {
      problems.push(`UNDECLARED: L${e.level} "${e.word}" introduces ${e.pairs.length} new sounds at once (${e.pairs.join(", ")})`);
    } else if (d.pairs.slice().sort().join(",") !== e.pairs.join(",")) {
      problems.push(`DRIFTED: L${e.level} "${e.word}" declares ${d.pairs.join(", ")} but now needs ${e.pairs.join(", ")}`);
    }
  }
  for (const [k, d] of declared) {
    if (!found.has(k)) {
      problems.push(`STALE: L${d.level} "${d.word}" is declared but no longer introduces two new sounds — delete the entry`);
    }
  }
  problems.push(...sentenceSounds(levels, pre, sentences));
  return { problems, heavy };
}

export function readLedger(path = LEDGER_PATH) {
  return JSON.parse(readFileSync(path, "utf8")).words;
}

/* ---- negative controls (E5) -------------------------------------------
   Each plants the exact fault this gate exists to catch and fails if the
   gate stays quiet. A detector nobody has seen catch anything is a comment. */
function selfTest() {
  const ledger = readLedger();
  const fails = [];
  const expect = (name, cond, got) => { if (!cond) fails.push(`${name}: ${got}`); };
  const hits = (r, needle) => r.problems.some((p) => p.includes(needle));

  /* 1. POSITIVE CONTROL. The shipped ladder and its ledger agree. */
  const real = audit({ ledger });
  expect("real ladder is clean", real.problems.length === 0, real.problems.join(" | "));

  /* 2. An undeclared double must be caught. "machine" needs six pairs the
        child has not met at Level 2, and is on no ledger line for Level 2. */
  const planted = structuredClone(LEVELS);
  planted[1].words = [...planted[1].words, "machine"];
  expect("catches an undeclared double",
    hits(audit({ levels: planted, ledger }), 'UNDECLARED: L2 "machine"'), "stayed quiet");

  /* 3. A stale entry must be caught. "cat" teaches nothing new by Level 90. */
  const stale = [...ledger, { level: 90, word: "cat", pairs: ["c=d:k", "a=d:short_a"] }];
  expect("catches a stale ledger entry",
    hits(audit({ ledger: stale }), 'STALE: L90 "cat"'), "stayed quiet");

  /* 4. A drifted entry must be caught — declared pairs that no longer match. */
  const drifted = structuredClone(ledger);
  drifted.find((e) => e.word === "machine").pairs = ["ch=d:sh", "z=d:z"];
  expect("catches a drifted ledger entry",
    hits(audit({ ledger: drifted }), 'DRIFTED: L94 "machine"'), "stayed quiet");

  /* 5. A missing entry must be caught — the ledger cannot shrink in silence. */
  const short = ledger.filter((e) => e.word !== "could");
  expect("catches a deleted ledger entry",
    hits(audit({ ledger: short }), 'UNDECLARED: L77 "could"'), "stayed quiet");

  /* 6. The pre-levels are load-bearing. Ignore them and MORE words look heavy,
        which proves the eight pairs they teach are really being counted. */
  const withPre = heavyWords(LEVELS, PRE_LEVELS).heavy.length;
  const without = heavyWords(LEVELS, []).heavy.length;
  expect("pre-level sounds are counted", without > withPre, `${without} is not more than ${withPre}`);

  /* 7. A repeated pair is ONE pair. "mom" spells m twice and teaches m once;
        counting it twice was a real artifact of the first hand count. */
  expect("a repeated letter is not two new sounds",
    !real.heavy.some((h) => h.word === "mom"), '"mom" was counted as a double');

  /* 8. Level-mates do not teach each other. All six -ture words are flagged,
        not just whichever the array happens to list first — the child meets
        them shuffled, so none may be credited with another's sound. */
  const ture = real.heavy.filter((h) => h.level === 96 && h.word.endsWith("ture"));
  expect("level-mates cannot cover for each other", ture.length === 6, `only ${ture.length} of 6 flagged`);

  /* 9. A sentence may not need a sound its level has not taught. */
  const badSentence = { 1: [{ id: "s:control", text: "the machine", level: 1 }] };
  expect("catches a sentence needing an untaught sound",
    hits(audit({ ledger, sentences: badSentence }), "not yet taught"), "stayed quiet");

  for (const f of fails) console.error("  FAIL " + f);
  console.log(fails.length === 0
    ? "sound-load self-test: 9 controls, all caught"
    : `sound-load self-test: ${fails.length} of 9 controls FAILED`);
  return fails.length === 0 ? 0 : 1;
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const arg = process.argv[2];
  if (arg === "--self-test") {
    process.exit(selfTest());
  } else if (arg === "--list") {
    const { heavy } = heavyWords();
    for (const h of heavy) {
      console.log(`L${String(h.level).padStart(3)} ${h.word.padEnd(11)} ${h.heart ? "HEART" : "     "} ${h.pairs.join("  ")}`);
    }
    console.log(`\n${heavy.length} words introduce two new sounds at once.`);
  } else {
    const { problems } = audit({ ledger: readLedger() });
    for (const p of problems) console.error("  " + p);
    if (problems.length) {
      console.error(`\nsound-load: ${problems.length} problem(s).`);
      console.error("A word introducing two new sounds needs a line in tools/sound-load-ledger.json,");
      console.error("with the reason. A word that no longer needs its line must lose it.");
      process.exit(1);
    }
    console.log("sound-load: every word introduces at most one new sound, or is declared.");
  }
}
