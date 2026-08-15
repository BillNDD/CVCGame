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
 * to, so a Level 19 sentence may never lean on a Level 20 word.
 *
 * Usage:
 *   node tools/decodable.mjs <level> "sentence"     check one
 *   node tools/decodable.mjs --file sentences.json  check a set
 *   node tools/decodable.mjs --self-test            prove the checker catches
 */
import { readFileSync } from "node:fs";
import { LEVELS, TRICKY, HEART, WORD_LEVEL } from "../src/engine.js";

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
   does not read it.

   IT WENT STALE ANYWAY, and that is why `waitingIsHonest` exists below. This
   list still named "a", "my" and "of" long after they were seated on
   2026-08-12, and "we" and "me" would have joined them on 2026-08-13: a word
   is seated in the engine and nothing makes anyone come back here. A stale
   entry is not harmless — this list is what a person reads to answer "which
   heart words are still missing?", and it was answering with five words that
   were already in the game.

   THE GUARD EARNED ITSELF THE SAME DAY. It was written on 2026-08-13 when
   "we" and "me" were seated, and it fired hours later on the very next
   seating: `he`, `be`, `go`, `no` and `so` joined them, and the test run
   refused with "a heart word is waiting or it is in the game, never both".
   Nobody had to remember this file existed.

   THE LIST IS NOW EMPTY, and that is a real state rather than an oversight:
   every heart word the owner has ruled onto the roster is seated and in the
   game — since 2026-08-15 at the seat the owner read and approved, Levels 1
   to 7. It stays here, exported and guarded, because the roster will grow
   again and the next word to be ruled on belongs in it. */
export const HEART_WAITING = [];

/* Levels beyond the twenty that ship today, as proposed. A sentence for a
   level may use every word up to and including it. Levels 10 and 11 left this
   map on 2026-08-12, when they were built. RE-KEYED 2026-08-15 with the
   10-and-10 build: these used to sit at 12 and 13, and the moment real Levels
   12 and 13 existed the map would have silently widened their vocabulary with
   words no level teaches — union by number, the exact trap E11 names. The
   plural-s level and the compound level now wait beyond the last real level. */
export const PROPOSED = {
  21: "beds bugs cans cats cups dogs hats hens kids lids maps pens pigs pots tops".split(" "),
  22: "catnip laptop sunset".split(" "),
};

/* What a child at this level has actually been taught — read from the LEVELS,
   and from nothing else.

   Owner-ruled 2026-08-12: a heart word's level is where the CHILD MEETS it,
   not where its spelling would fall. That ruling is what lets this function
   get simpler rather than cleverer. It used to add every HEART word on top of
   the levels, which meant it treated them all as available from Level 1 while
   the engine seated them at 6 and 7 — so it called 12 of the 32 levellable
   sentences a level or more below where a child could actually read them.
   "The cat sat on the mat." read as Level 2 and needed Level 7.

   Now the heart words sit at their owner-approved seats in the engine
   (Levels 1 to 7 since the 10-and-10 curriculum), this function reads the
   same seats every other part of the game reads, and the two answers cannot
   drift apart because there is only one of them. HEART stays imported for the
   assertion below, which is the guard that keeps it that way. */
export function vocabularyUpTo(level) {
  const v = new Set();
  for (const l of LEVELS) if (l.n <= level) for (const w of l.words) v.add(w);
  for (const n of Object.keys(PROPOSED)) if (Number(n) <= level) for (const w of PROPOSED[n]) v.add(w);
  /* The guard: every heart word must have a SEAT, and it must be one the
     owner ruled. A heart word that drifted late would make this function
     quietly correct and the game quietly wrong — the child would meet it long
     after a sentence claimed they could read it. Under the 10-and-10
     curriculum (owner-approved 2026-08-15, rounds one to three) the seats
     span Levels 1 to 7 — "Move of to 7" is the owner's own outer bound, so
     seven is the fence: an eighth-level heart is drift, not a ruling. */
  for (const w of HEART) {
    const seat = WORD_LEVEL[w];
    if (!seat) throw new Error(`heart word "${w}" has no level seat; buildSession can never serve it`);
    if (seat > 7) throw new Error(`heart word "${w}" is seated at level ${seat}; the owner's rulings end at 7 ("Move of to 7") and a heart word is met early or it is not a heart word`);
  }
  waitingIsHonest(HEART);
  return v;
}

/* The waiting list must not name a word that is already in the game.

   BOTH lists are parameters, and the second one is the lesson. The first
   version took only `seated` and read `HEART_WAITING` from the module, which
   worked exactly until the list emptied on 2026-08-13 — at which point no
   fixture could produce an overlap and the control could not fail for the
   reason it claimed. A guard whose negative control depends on today's data
   stops being a guard the day the data changes (E5). */
export function waitingIsHonest(seated, waiting = HEART_WAITING) {
  const both = waiting.filter((w) => seated.includes(w));
  if (both.length)
    throw new Error(`HEART_WAITING still names seated word(s): ${both.join(", ")} — a heart word is waiting or it is in the game, never both`);
  return true;
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
    ["The dog ran fast.", 19, true, "a real one: every word taught, and 'fast' is new at 19"],
    ["The dog ran quickly.", 19, false, "'quickly' is not taught anywhere — the fault the checker exists for"],
    ["The dog ran up the hill.", 19, false, "every word taught, but none of them is new at level 19"],
    ["The kid can stop.", 19, false, "'stop' is a level 20 word: a sentence must never arrive before its words"],
    ["The kid can stop.", 20, true, "control: the same sentence is fine at level 20"],
    ["The frog can jump.", 19, false, "'frog' is in no level at all — it caught this in my own fixture"],
    ["You said the dog can jump.", 19, true, "heart words 'you' and 'said' are allowed"],
    ["The dog ran fast", 19, false, "no end punctuation"],
    ["the dog ran fast.", 19, false, "no capital"],
    ["The big dog and the fat cat and the red hen ran fast.", 19, false, "too long to hold"],
    ["The dog can't jump.", 19, false, "\"can't\" is not \"can\" — a contraction is a word of its own"],
  ];
  let failed = 0;
  /* The waiting list's own control, and it runs FIRST because everything below
     levels against the roster it guards. Both directions: today's split must
     be honest, and a fixture where a waiting word has been seated must throw.
     Without the second half this passes on any implementation, including one
     that never compares the two lists at all. */
  const honest = (() => { try { return waitingIsHonest(HEART) === true; } catch { return false; } })();
  /* Fixtures, so the control fails for its own reason whatever the shipped
     list happens to hold — including nothing, which is what it holds today. */
  const caught = (() => { try { waitingIsHonest(["go", "cat"], ["go"]); return false; } catch { return true; } })();
  const clean = (() => { try { return waitingIsHonest(["cat"], ["go"]) === true; } catch { return false; } })();
  console.log((honest ? "ok   " : "FAIL ") + `the waiting list names no word that is already seated (${HEART_WAITING.length} waiting)`);
  console.log((caught ? "ok   " : "FAIL ") + "control: a fixture where a waiting word has been seated is caught");
  console.log((clean ? "ok   " : "FAIL ") + "control: a fixture with no overlap passes");
  if (!clean) failed += 1;
  if (!honest) failed += 1;
  if (!caught) failed += 1;
  for (const [s, lvl, want, why] of cases) {
    const got = check(s, lvl).problems.length === 0;
    const ok = got === want;
    console.log((ok ? "ok   " : "FAIL ") + `${want ? "passes" : "refused"}: ${why}`);
    if (!ok) { failed += 1; console.log("       got: " + JSON.stringify(check(s, lvl).problems)); }
  }
  const total = cases.length + 3;   // the sentence cases, plus the waiting list's three
  console.log(`\ndecodable controls: ${total - failed} passed, ${failed} failed`);
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
