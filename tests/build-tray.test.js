/* Word Quest - the Build-it tray's tests, split out of engine.test.js on
   2026-08-23 when that file reached the G6 file-length ceiling (E6: a file at
   a ceiling is SPLIT, the ceiling is not raised - only the owner moves one).
   The same safety-split pattern as the 2026-08-21 migrate split: G1's floor
   covers the SUM of the files, so no test can vanish from either.
   Run: npm test  (vitest). Regenerate the module first: node tools/extract-engine.mjs
   Every assertion uses literal expected values, never the constant under test. */
import { describe, it, expect } from "vitest";
import {
  LEVELS, chunkWord,
  buildTray, trayPool, trayExtras, trayClash, trayForbidden, buildable, NEVER_BUILD,
} from "../src/engine.js";

/* ---------------- Build-it: the tray (SPEC section 12) ----------------
   Owner-ruled 2026-08-17. Practice-only: nothing here writes to a record, and
   these tests exist to keep the tray honest, not to grade anything. */
describe("Build-it tray", () => {
  /* A held rand, so a shuffle can be checked rather than hoped at. */
  const held = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

  it("gives the word its true number of slots, never a padded one", () => {
    expect(buildTray("ship", 2, held(0)).slots).toBe(3);
    expect(buildTray("cat", 2, held(0)).slots).toBe(3);
    expect(buildTray("black", 20, held(0)).slots).toBe(4);
    expect(buildTray("a", 1, held(0)).slots).toBe(1);
  });

  it("ramps the extra tiles: none, then one from Level 6, then two past 14", () => {
    expect(trayExtras(1)).toBe(0);
    expect(trayExtras(5)).toBe(0);
    expect(trayExtras(6)).toBe(1);
    expect(trayExtras(14)).toBe(1);
    expect(trayExtras(15)).toBe(2);
    expect(trayExtras(21)).toBe(2);
  });

  it("always offers every tile the answer needs", () => {
    for (const [w, l] of [["ship", 2], ["ship", 8], ["black", 20], ["think", 19]]) {
      const t = buildTray(w, l, held(0.1, 0.6, 0.3, 0.9));
      for (const c of t.answer) expect(t.tiles).toContain(c);
      expect(t.tiles.length).toBe(t.slots + trayExtras(l));
    }
  });

  it("never offers a distractor that is one of the word's own tiles", () => {
    for (let i = 0; i < 20; i++) {
      const t = buildTray("ship", 21, held((i % 9) / 10, ((i + 3) % 9) / 10, 0.5));
      const extra = t.tiles.filter((c) => !t.answer.includes(c));
      expect(extra.length).toBe(2);
      expect(new Set(extra).size).toBe(2);
    }
  });

  /* The safety of the pool. Only four units are barred outright - the ones
     with no ruled default sound, which alone can say nothing true. Everything
     else is admitted and then guarded per word, because the danger is not a
     grapheme that bends somewhere else; it is two tiles in ONE tray that say
     the same thing. Owner-ruled 2026-08-17, after the first version banned
     every vowel and still allowed ck beside cat. */
  it("keeps units with no ruled default out of the pool", () => {
    const pool = trayPool(21);
    for (const unit of ["ai", "ou", "ey", "ere"]) expect(pool).not.toContain(unit);
  });

  it("keeps the vowels, so a child can be offered i against a", () => {
    const pool = trayPool(21);
    for (const v of ["a", "e", "i", "o", "u"]) expect(pool).toContain(v);
    expect(pool).toContain("s");            // says /s/ alone; his bends it, his is not this word
    expect(pool).toContain("th");
    /* 34 at the converted level 21 - measured, re-typed; the six default-less
       spellings and the one-use ugh are barred by NO_TRAY_UNITS, so the pool
       can never deal a tile that plays nothing. */
    expect(pool.length).toBe(34);
  });

  it("refuses a distractor that would sound exactly like one of the word's own tiles", () => {
    expect(trayClash("cat", "ck")).toBe(true);    // ck and cat's c both say /k/
    expect(trayClash("his", "z")).toBe(true);     // his bends s to /z/
    expect(trayClash("want", "o")).toBe(true);    // want bends a to short o
    expect(trayClash("ship", "h")).toBe(false);   // /h/ is not in ship
    expect(trayClash("cat", "o")).toBe(false);
    for (let i = 0; i < 12; i++) {
      const t = buildTray("cat", 21, () => (i % 7) / 7);
      for (const c of t.tiles.filter((x) => !t.answer.includes(x)))
        expect(trayClash("cat", c)).toBe(false);
    }
  });

  it("only draws graphemes a child at that level has met", () => {
    /* The converted levels 1-2 teach only the letters their twenty words
       spell - measured, re-typed at the cutover. */
    expect(trayPool(1)).toEqual(["a", "i", "n", "p", "s", "t"]);
    expect(trayPool(2)).toEqual(["a", "i", "n", "p", "s", "t"]);
  });

  /* The two visual rulings of 2026-08-17 have engine-visible consequences and
     are pinned here, so a redesign that quietly drops them fails a test rather
     than only looking different: the SHAPE of a slot comes from the answer
     tile's letter count, and the help after two misses names the slot each
     sound belongs to, which needs the answer in position order. */
  it("gives every answer tile in the order the word is built", () => {
    expect(buildTray("ship", 2, held(0)).answer).toEqual(["sh", "i", "p"]);
    expect(buildTray("there", 19, held(0)).answer).toEqual(["th", "ere"]);
    expect(buildTray("black", 20, held(0)).answer).toEqual(["b", "l", "a", "ck"]);
  });

  /* The eleven words whose sounds repeat. The tray must offer a tile for EVERY
     slot, counting duplicates: the screen once held a letter in each slot and
     deduped by letter, so dad's second d could never be placed and the word
     could not be built at all. Found by an independent review, 2026-08-17. */
  it("offers a tile for every slot, even when a sound repeats", () => {
    for (const w of ["bib", "dad", "did", "mom", "nun", "pep", "pop", "pump", "pup", "tent", "tot"]) {
      const t = buildTray(w, 2, held(0.3));
      expect(t.answer.length).toBe(chunkWord(w).length);
      const pool = t.tiles.slice();
      for (const need of t.answer) {
        const at = pool.indexOf(need);
        expect(at).toBeGreaterThanOrEqual(0);   // a tile is consumed per slot, not per letter
        pool.splice(at, 1);
      }
    }
  });

  /* No tray may let a child SPELL a word the owner ruled out. Building "dog"
     with a b distractor spells gob, which SPEC says was removed from every file
     "so it cannot return by accident" - and the miss feedback prints and speaks
     what the child built. Found by an independent review, 2026-08-17. */
  it("refuses a distractor that would let a child spell a ruled-out word", () => {
    expect(trayForbidden(["d", "o", "g", "b"], 3)).toBe(true);    // gob
    expect(trayForbidden(["d", "o", "g", "m"], 3)).toBe(false);
    expect(trayForbidden(["m", "i", "l", "t"], 4)).toBe(true);    // milt (hunt came off the list 2026-08-17)
    /* The length rule: a forbidden word must FIT the slots. Four tiles cannot
       spell a three-sound word when all four must be placed. */
    expect(trayForbidden(["g", "o", "b", "d"], 4)).toBe(false);
    for (const r of [0.05, 0.3, 0.6, 0.9])
      for (const w of ["dog", "log", "big", "job", "melt", "milk"]) {
        const t = buildTray(w, 21, () => r);
        expect(trayForbidden(t.tiles, t.slots)).toBe(false);
      }
  });

  it("never offers a word whose own tiles spell a ruled-out one", () => {
    expect(buildable("sift")).toBe(false);      // an anagram of fist
    expect(buildable("dog")).toBe(true);
    expect(NEVER_BUILD).toContain("gob");
    expect(NEVER_BUILD).toContain("milt");
    /* Every word the owner refused for CHILD-APPROPRIATENESS, on any date, is
       here - not only the 2026-08-07 list this began as. The beta 27 readiness
       audit found a child could spell "ho" from a two-slot tray and "sam"
       from 184 three-tile words' trays, and that Build-it then prints and
       speaks what was built; "gun" (2026-08-16) and fight, hustle and grind
       (2026-08-18) were unguarded for the same reason - nothing had read a
       refusal list since the day this one was typed. Literal (E4). */
    for (const w of ["ho", "gun", "fight", "hustle", "grind"]) expect(NEVER_BUILD, w).toContain(w);
    expect(NEVER_BUILD.length).toBe(16);   // hunt came off 2026-08-17; five joined 2026-08-23, then nuts and cans
    /* nuts and cans were ruled OUT OF THE BANK and never added to the TRAY
       guard - two different rules, only the second with a gate. Measured over
       41,680 deals: nuts was reachable from seven target words and cans from
       five. Owner-ruled "guard both" on a decision page, 2026-08-23. */
    expect(NEVER_BUILD).toContain("nuts");
    expect(NEVER_BUILD).toContain("cans");
    /* and a book-artifact refusal is NOT here: a child spelling "blap" is no
       safety matter, and guarding it would take buildable words off the board.
       "sam" is not here either, owner-ruled 2026-08-23 ("Ho I want out. Sam is
       fine."): it was refused as a book character's name, a candidate turned
       down rather than a word a child must never spell. An absence nothing
       asserts is an absence a later audit re-adds. */
    expect(NEVER_BUILD).not.toContain("blap");
    expect(NEVER_BUILD).not.toContain("sam");
  });

  it("no dealt tray spells a forbidden word, however the distractors fall - the whole bank, many deals", () => {
    /* THE HOLE THIS CLOSES (2026-08-23, found by a measurement the owner
       asked for): the pool filter asks whether the word's own tiles plus ONE
       candidate spell something forbidden - the dog + b shape it was written
       for - and cannot see TWO distractors that complete a forbidden word
       between them. At least 44 distinct (word -> forbidden) pairs were
       reachable in 62,520 sampled deals, none through the word's own tiles;
       enumerating every allowed distractor pair puts the true reachable set at
       460. "ax" was dealt a, x, h and o - which is how a child spells "ho" in
       two slots - and slam reached milt, just reached fist, jump reached jugs,
       hop reached gob.

       THE SECOND HOLE, found the same night by the engineering seat's after
       pass: the guard compared the tray against chunkWord(forbidden), the one
       split the game uses to TEACH that word, so only builds of that many slots
       were ever checked. "fight" chunks f-igh-t, so five-slot builds were
       invisible - and a "gifts" tray carrying an h lays out f-i-g-h-t. Twenty-
       seven of five hundred dealt gifts trays carried that h. THE HELPER BELOW
       WAS PART OF THE FAULT: it asked the same canonical-split question, so it
       passed while the behaviour was broken. It now asks what a child can act
       on - can any split into exactly `slots` pieces be taken from these tiles.
       The child sees what they built printed, and hears it spoken.
       This sweep is the proof, and it is a sweep rather than an example
       because both faults were invisible to every example anyone had written. */
    const bank = [...new Set(LEVELS.flatMap((l) => l.words))].filter(buildable);
    const levelOf = (w) => LEVELS.findIndex((l) => l.words.includes(w)) + 1;
    const spells = (tiles, word, slots) => {
      const left = tiles.slice();
      const walk = (pos, used) => {
        if (pos === word.length) return used === slots;
        if (used === slots) return false;
        for (let n = 1; pos + n <= word.length; n += 1) {
          const i = left.indexOf(word.slice(pos, pos + n));
          if (i < 0) continue;
          const tile = left.splice(i, 1)[0];
          const ok = walk(pos + n, used + 1);
          left.splice(i, 0, tile);
          if (ok) return true;
        }
        return false;
      };
      return walk(0, 0);
    };
    /* a seeded rand, so a failure is reproducible and a held rand still ends */
    let seed = 20260823;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const bad = [];
    let deals = 0, shortfalls = 0;
    const wanted = (lv) => (lv <= 5 ? 0 : lv <= 14 ? 1 : 2);
    for (const w of bank) {
      const lv = levelOf(w), slots = chunkWord(w).length;
      for (let i = 0; i < 6; i += 1) {
        const tray = buildTray(w, lv, rand);
        deals += 1;
        if (tray.tiles.length - slots < wanted(lv)) shortfalls += 1;
        for (const f of NEVER_BUILD) if (spells(tray.tiles, f, slots)) bad.push(w + " -> " + f + " [" + tray.tiles.join(",") + "]");
      }
    }
    expect(deals).toBeGreaterThan(6000);
    expect(bad.slice(0, 5), bad.length + " trays spell a forbidden word").toEqual([]);
    /* and the guard must not starve a tray: every level still gets the
       distractors it asks for, or "no forbidden word" is bought by dealing
       the answer alone */
    expect(shortfalls, "trays with fewer distractors than the level asks").toBe(0);
  });

  it("a guarded word is unreachable at EVERY build size, not only the one its teaching split uses", () => {
    /* THE SWEEP ABOVE CANNOT SEE THIS ONE, and that is why this test exists
       beside it rather than inside it. The decomposition hole is reachable in
       about three deals in a hundred thousand, so six deals a word has no
       power against it: the sweep passes on a build with the fault put back.
       Enumerating every distractor pair the OLD guard allowed, over the whole
       bank, gives exactly THREE words that could be laid out as a guarded one,
       so those three are dealt hard instead of dealt rarely. */
    expect(chunkWord("fight")).toEqual(["f", "igh", "t"]);
    expect(chunkWord("hustle")).toEqual(["h", "u", "s", "tle"]);
    /* "fight" is three units to the game and five tiles to a child */
    expect(chunkWord("gifts").length).toBe(5);
    const at = [["sunset", 20, "hustle"], ["gifts", 32, "fight"], ["tigers", 72, "fight"]];
    for (const [w, lv] of at) expect(LEVELS[lv - 1].words, `${w} is level ${lv}`).toContain(w);
    const spells = (tiles, word, slots) => {
      const left = tiles.slice();
      const walk = (pos, used) => {
        if (pos === word.length) return used === slots;
        if (used === slots) return false;
        for (let n = 1; pos + n <= word.length; n += 1) {
          const i = left.indexOf(word.slice(pos, pos + n));
          if (i < 0) continue;
          const tile = left.splice(i, 1)[0];
          const ok = walk(pos + n, used + 1);
          left.splice(i, 0, tile);
          if (ok) return true;
        }
        return false;
      };
      return walk(0, 0);
    };
    let seed = 20260824;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const bad = [];
    for (const [w, lv, forbidden] of at) {
      const slots = chunkWord(w).length;
      for (let i = 0; i < 400; i += 1) {
        const tray = buildTray(w, lv, rand);
        if (spells(tray.tiles, forbidden, slots)) bad.push(w + " -> " + forbidden + " [" + tray.tiles.join(",") + "]");
      }
    }
    expect(bad.slice(0, 3), bad.length + " of 1,200 deals lay out a guarded word").toEqual([]);
  });

  it("is reproducible: the same rand builds the same tray", () => {
    const a = buildTray("ship", 8, held(0.42));
    const b = buildTray("ship", 8, held(0.42));
    expect(a.tiles).toEqual(b.tiles);
  });
});
