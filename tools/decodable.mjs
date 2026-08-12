/* Is this sentence one the child can actually read?
 *
 * A decodable sentence is the whole promise of the mode: every word in it is a
 * word the child has been taught to sound out, or one of the heart words they
 * have been taught to know by sight. A single word outside that set turns the
 * sentence into a guessing exercise, which is the habit phonics teaching
 * exists to prevent — so this is checked mechanically, never by eye.
 *
 * The rule, owner-ruled 2026-08-11: taught words plus the heart-word roster.
 * "Taught" means every word up to and including the level the sentence belongs
 * to, so a Level 10 sentence may never lean on a Level 11 word.
 *
 * Usage:
 *   node tools/decodable.mjs <level> "sentence"     check one
 *   node tools/decodable.mjs --file sentences.json  check a set
 *   node tools/decodable.mjs --self-test            prove the checker catches
 */
import { readFileSync } from "node:fs";
import { LEVELS, TRICKY, HEART } from "../src/engine.js";

/* THE SHIPPED ROSTER COMES FROM THE ENGINE, and this file no longer keeps one
   of its own. It used to export a list of sixteen and treat every one of them
   as available from Level 1 — which meant this tool would happily call a
   sentence "Level 2" when it contained "he", a word no child has ever met in
   this game. Two rosters, one of them wishful, is the drift section F of the
   fault list is about, and an adversarial review found it on 2026-08-12.

   What is left here is the WAITING list, named for what it is. These words are
   ruled onto the roster and are not in the game: each needs a level seat, and
   several need a sound the owner has not heard. A sentence levelled against
   this list is levelled against a future, and `vocabularyUpTo` deliberately
   does not read it. */
export const HEART_WAITING = ["a", "be", "go", "he", "me", "my", "no", "of", "so", "we"];

/* Levels beyond the eleven that ship today, as proposed. A sentence for a level
   may use every word up to and including it. Levels 10 and 11 left this map on
   2026-08-12, when they were built; what remains is 12 to 15. */
export const PROPOSED = {
  12: "beds bugs cans cats cups dogs hats hens kids lids maps pens pigs pots tops".split(" "),
  13: "catnip laptop sunset".split(" "),
};

/* What a child at this level has actually been taught. HEART is the engine's
   own roster — the sight words that are really in the game — and never the
   waiting list above. */
export function vocabularyUpTo(level) {
  const v = new Set(HEART);
  for (const l of LEVELS) if (l.n <= level) for (const w of l.words) v.add(w);
  for (const n of Object.keys(PROPOSED)) if (Number(n) <= level) for (const w of PROPOSED[n]) v.add(w);
  return v;
}

/* A word as the child meets it: case and punctuation are the writer's, not the
   child's problem. An apostrophe is NOT stripped — "can't" is a different word
   from "can" and is not taught. */
export const words = (s) => s.toLowerCase().replace(/[.,!?;:"“”]/g, " ").split(/\s+/).filter(Boolean);

/* The words the level itself introduces. A built level owns them; a level still
   only proposed keeps them in PROPOSED until it is built. Reading only PROPOSED
   was right until 2026-08-12 and wrong the moment Levels 10 and 11 shipped —
   every Level 10 sentence was then refused as "uses no level 10 word", the
   checker's own controls included. */
export const newAt = (level) =>
  (LEVELS.find((l) => l.n === level)?.words) || PROPOSED[level] || [];

export function check(sentence, level, mustUse = []) {
  const v = vocabularyUpTo(level);
  const ws = words(sentence);
  const problems = [];
  const unknown = ws.filter((w) => !v.has(w));
  if (unknown.length) problems.push(`not taught by level ${level}: ${[...new Set(unknown)].join(", ")}`);
  /* The level's own new words are the point of the sentence. One is the rule
     the owner set; a sentence that happens to use none is practice for the
     level before it. */
  const fresh = ws.filter((w) => newAt(level).includes(w));
  if (mustUse.length === 0 && !fresh.length) problems.push(`uses no level ${level} word`);
  for (const m of mustUse) if (!ws.includes(m)) problems.push(`does not use "${m}"`);
  /* A sentence a four-year-old reads aloud in one breath. Eight words is the
     ceiling the shipped sentence batches settled on. */
  if (ws.length > 8) problems.push(`${ws.length} words is too long to hold`);
  if (!/[.!?]$/.test(sentence.trim())) problems.push("no end punctuation");
  if (!/^[A-Z]/.test(sentence.trim())) problems.push("does not start with a capital");
  return { sentence, level, words: ws.length, fresh, problems };
}

if (process.argv.includes("--self-test")) {
  /* Every way a sentence can fail the promise, and one control that must pass. */
  const cases = [
    ["The dog ran fast.", 10, true, "a real one: every word taught, and 'fast' is new at 10"],
    ["The dog ran quickly.", 10, false, "'quickly' is not taught anywhere — the fault the checker exists for"],
    ["The dog ran up the hill.", 10, false, "every word taught, but none of them is new at level 10"],
    ["The kid can stop.", 10, false, "'stop' is a level 11 word: a sentence must never arrive before its words"],
    ["The kid can stop.", 11, true, "control: the same sentence is fine at level 11"],
    ["The frog can jump.", 10, false, "'frog' is in no level at all — it caught this in my own fixture"],
    ["You said the dog can jump.", 10, true, "heart words 'you' and 'said' are allowed"],
    ["The dog ran fast", 10, false, "no end punctuation"],
    ["the dog ran fast.", 10, false, "no capital"],
    ["The big dog and the fat cat and the red hen ran fast.", 10, false, "too long to hold"],
    ["The dog can't jump.", 10, false, "\"can't\" is not \"can\" — a contraction is a word of its own"],
  ];
  let failed = 0;
  for (const [s, lvl, want, why] of cases) {
    const got = check(s, lvl).problems.length === 0;
    const ok = got === want;
    console.log((ok ? "ok   " : "FAIL ") + `${want ? "passes" : "refused"}: ${why}`);
    if (!ok) { failed += 1; console.log("       got: " + JSON.stringify(check(s, lvl).problems)); }
  }
  console.log(`\ndecodable controls: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const fileArg = process.argv.indexOf("--file");
if (fileArg > -1) {
  const set = JSON.parse(readFileSync(process.argv[fileArg + 1], "utf8"));
  let bad = 0;
  for (const [lvl, list] of Object.entries(set)) {
    console.log(`\nLevel ${lvl} — ${list.length} sentences`);
    for (const s of list) {
      const r = check(s, Number(lvl));
      if (r.problems.length) { bad += 1; console.log(`  REFUSED  ${s}\n           ${r.problems.join("; ")}`); }
      else console.log(`  ok  ${s.padEnd(42)} new: ${r.fresh.join(" ")}`);
    }
  }
  console.log(`\n${bad} refused`);
  process.exit(bad ? 1 : 0);
} else if (process.argv.length > 3 && !process.argv.includes("--self-test")) {
  const r = check(process.argv[3], Number(process.argv[2]));
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.problems.length ? 1 : 0);
}
