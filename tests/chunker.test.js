/* The extended code — the chunker's roster, its position rules, and the proof
   that widening it moved no tile a child can see.

   WHY THIS FILE EXISTS, twice over. On 2026-08-19 the chunker grew from
   nineteen multi-letter units to seventy-two, because it could not see the
   code the 100-level ladder teaches: "see" tiled as s-e-e and "night" as
   n-i-g-h-t, so every such word was seated at the level of its first letter
   and levels 57 to 100 could be filled by nothing (docs/redesign-plan.md).
   The tests belong beside the engine's other chunker tests in
   tests/engine.test.js and are NOT there for two reasons, both of them rules.
   That file is 1318 lines against the 1400-line G6 ceiling, and E6 says a file
   approaching a ceiling is split rather than grown into. And the g1_unit_tests
   floor is read from that file's own name in the gauntlet's output, so moving
   the four tests already there would have lowered a floor, which E6 forbids.
   New tests go in a new file; nothing already counted moves.

   Every expected value here is a literal, written from tools/ladder/shape-v3.json
   and from what the spelling says, never read back off the arrays under test
   (E4). Run: npm test */
import { describe, it, expect } from "vitest";
import { DIGRAPHS, TRIGRAPHS, QUADGRAPHS, chunkWord, bankWords, SENTENCES, sentenceWords, soundIdsFor, soundInventory, clipPlan } from "../src/engine.js";

describe("the extended code", () => {
  /* All three tiers are pinned as literals,
     and the literals are re-derived from tools/ladder/shape-v3.json — the
     owner's 100-level pathway — never read back off DIGRAPHS (E4). The point
     of writing them out is the B1 point: a unit that ARRIVES has to be typed
     into this file by a person, which is the moment somebody decides whether
     it is really a unit and what sound it makes. */
  it("holds the whole extended code, all three tiers pinned", () => {
    expect(DIGRAPHS).toEqual(["sh","ch","th","wh","ck","ng","qu","kn","wr","mb","ll","ss","ff","zz","ai","ou","ey","or",
      "al","ar","au","aw","ay","bb","cc","ce","ci","dd","ea","ee","er","ew","ge","gg","gh","gn","ie","ir","le",
      "mm","nn","oa","oe","oi","oo","ow","oy","ph","pp","re","rr","se","ti","tt","tu","ue","ur","ve","ze"]);
    expect(TRIGRAPHS).toEqual(["ere","air","are","dge","ear","eer","igh","ore","tch","tle"]);
    expect(QUADGRAPHS).toEqual(["augh","eigh","ough"]);
    /* Nineteen units before today, seventy-two after. Both halves counted, so
       a unit deleted and another added leaves the size unchanged and the list
       above still fails. */
    expect(DIGRAPHS.length + TRIGRAPHS.length + QUADGRAPHS.length).toBe(72);
    /* No unit is in two tiers, and every entry is the length its tier says. */
    for (const g of DIGRAPHS) expect(g.length).toBe(2);
    for (const g of TRIGRAPHS) expect(g.length).toBe(3);
    for (const g of QUADGRAPHS) expect(g.length).toBe(4);
    expect(new Set([...DIGRAPHS, ...TRIGRAPHS, ...QUADGRAPHS]).size).toBe(72);
  });

  it("fuses the vowel teams, the r-controlled units and the long tiers", () => {
    /* The words the blocker was written about (docs/redesign-plan.md): every
       one of these tiled letter by letter until today, so the ladder seated it
       at the level of its first letter. Literal expected values throughout. */
    expect(chunkWord("see")).toEqual(["s","ee"]);
    expect(chunkWord("boat")).toEqual(["b","oa","t"]);
    expect(chunkWord("moon")).toEqual(["m","oo","n"]);
    expect(chunkWord("day")).toEqual(["d","ay"]);
    expect(chunkWord("beat")).toEqual(["b","ea","t"]);
    expect(chunkWord("car")).toEqual(["c","ar"]);
    expect(chunkWord("her")).toEqual(["h","er"]);
    expect(chunkWord("bird")).toEqual(["b","ir","d"]);
    expect(chunkWord("burn")).toEqual(["b","ur","n"]);
    expect(chunkWord("saw")).toEqual(["s","aw"]);
    expect(chunkWord("coin")).toEqual(["c","oi","n"]);
    expect(chunkWord("boy")).toEqual(["b","oy"]);
    expect(chunkWord("cow")).toEqual(["c","ow"]);
    expect(chunkWord("phone")).toEqual(["ph","o","n","e"]);
    /* Longer than two letters. The four-letter tier exists for exactly three
       units and nothing else may reach it. */
    expect(chunkWord("night")).toEqual(["n","igh","t"]);
    expect(chunkWord("catch")).toEqual(["c","a","tch"]);
    expect(chunkWord("bridge")).toEqual(["b","r","i","dge"]);
    expect(chunkWord("chair")).toEqual(["ch","air"]);
    expect(chunkWord("more")).toEqual(["m","ore"]);
    expect(chunkWord("hear")).toEqual(["h","ear"]);
    expect(chunkWord("eight")).toEqual(["eigh","t"]);
    expect(chunkWord("caught")).toEqual(["c","augh","t"]);
    expect(chunkWord("thought")).toEqual(["th","ough","t"]);
    /* The doubled consonants of level 46, which are one sound across a
       syllable seam and were four separate letters until today. */
    expect(chunkWord("rabbit")).toEqual(["r","a","bb","i","t"]);
    expect(chunkWord("little")).toEqual(["l","i","tt","le"]);
  });

  /* THE POSITION RULES, PROVED BY THE WORDS THAT WOULD BREAK WITHOUT THEM
     (E5). Every control below is a word IN THE BANK TODAY, so this is not a
     hypothetical: unconstrained, "leg" reads le+g, "get" ge+t, "set" se+t,
     "vet" ve+t, "red" re+d, "tin" ti+n, "tub" tu+b and "pal" p+al — eighteen
     live words, every one of them a wrong tile row and a wrong sound-out. The
     rules are the same ones tools/ladder-fill.mjs carries, so the two models
     of the code agree by construction rather than by luck. */
  it("refuses a syllable-ending unit at the front of a word", () => {
    expect(chunkWord("leg")).toEqual(["l","e","g"]);         // le is FINAL only
    expect(chunkWord("sled")).toEqual(["s","l","e","d"]);
    expect(chunkWord("get")).toEqual(["g","e","t"]);         // ge is FINAL only
    expect(chunkWord("set")).toEqual(["s","e","t"]);         // se is FINAL only
    expect(chunkWord("vet")).toEqual(["v","e","t"]);         // ve is FINAL only
    expect(chunkWord("red")).toEqual(["r","e","d"]);         // re is FINAL only
    expect(chunkWord("rest")).toEqual(["r","e","s","t"]);
    /* And the same units DO fuse where they belong, or the rule would be a ban
       rather than a position rule. */
    expect(chunkWord("table")).toEqual(["t","a","b","le"]);
    expect(chunkWord("cage")).toEqual(["c","a","ge"]);
    expect(chunkWord("castle")).toEqual(["c","a","s","tle"]);
  });
  it("refuses ti, tu and al where the spelling does not say that sound", () => {
    expect(chunkWord("tin")).toEqual(["t","i","n"]);         // ti needs -on, -ous, -al, -ent, -en
    expect(chunkWord("tick")).toEqual(["t","i","ck"]);
    expect(chunkWord("tip")).toEqual(["t","i","p"]);
    expect(chunkWord("tub")).toEqual(["t","u","b"]);         // tu needs -re
    expect(chunkWord("tuck")).toEqual(["t","u","ck"]);
    expect(chunkWord("tug")).toEqual(["t","u","g"]);
    expect(chunkWord("pal")).toEqual(["p","a","l"]);         // al needs a following l or k
    /* Where they DO belong. "all" is two sounds, /aw/ and /l/, so al-l is the
       honest tiling and a-ll would teach the short a it does not say. */
    expect(chunkWord("nation")).toEqual(["n","a","ti","o","n"]);
    expect(chunkWord("picture")).toEqual(["p","i","c","tu","re"]);
    expect(chunkWord("walk")).toEqual(["w","al","k"]);
    expect(chunkWord("all")).toEqual(["al","l"]);
  });
  it("keeps the silent-letter pairs to the ends they belong to", () => {
    /* mb says /m/ only at the end of a word; kn, wr and gn only at an end.
       Narrowing these three moved no bank word — measured — and it stops
       "number" reading n-u-mb-er, where both letters are spoken. */
    expect(chunkWord("thumb")).toEqual(["th","u","mb"]);
    expect(chunkWord("number")).toEqual(["n","u","m","b","er"]);
    expect(chunkWord("knock")).toEqual(["kn","o","ck"]);
    expect(chunkWord("wren")).toEqual(["wr","e","n"]);
    expect(chunkWord("sign")).toEqual(["s","i","gn"]);
  });

  /* THE TILE-ROW LAW, MEASURED RATHER THAN ASSUMED (SPEC section 4: the
     feedback tile row does not wrap, so a fifth unit would push the word off a
     small screen). The extended roster can only ever make a word FEWER tiles,
     never more — but "can only" is a claim, and this is the measurement. The
     histogram is a literal, so a word that re-tiles under a future roster
     change fails here and names itself by moving a bucket. */
  it("no word in the bank re-tiles, and the row still caps at four", () => {
    const by = {};
    for (const w of bankWords()) { const n = chunkWord(w).length; by[n] = (by[n] || 0) + 1; }
    expect(by).toEqual({ 1: 3, 2: 37, 3: 349, 4: 109 }  /* 2026-08-20 evening, third rise: come and
       some (4 tiles), love and have (3 each - their ve fuses) joined with
       the magic-e rule - three tricky-marked per the owner, have as the
       rule's recorded exception. Re-counted from the bank. */  /* 2026-08-20 evening, second rise: anchor
       (a-n-ch-or), chorus (ch-or-u-s) and school (s-ch-oo-l) - four tiles
       each - joined by their Greek-ch bends. Re-counted from the bank. */  /* 2026-08-20 evening: rough, tough and
       cough (2 tiles each: r-ough, t-ough, c-ough) and enough (3: e-n-ough)
       joined bankWords() by their uf/off cluster bends - the four ough hearts
       of level 92. Re-counted from the bank. */  /* 2026-08-20 third rise: into, find, old
       and hold joined as tricky-marked bends under the hybrid ruling - old at
       3 tiles, the other three at 4. Re-counted from the bank. */  /* 2026-08-20 again: dough and though (2
       tiles), through (3) and month (4) joined bankWords() as ough-heart and
       tricky bends from the owner's phonics rulings. Re-counted from the bank. */  /* 2026-08-20: 2-tile rose by one - `as`
       joined bankWords() when its s was bent to /z/ (the is/his/has row it
       never got), and `as` tiles a-s. Re-counted from the bank. */  /* 2026-08-19: 1 and 2 each rose by one.
       `are` (1 tile) and `were` (2 tiles) joined bankWords() when the owner
       ruled them whole-word bends, and bankWords unions the WORD_SOUND keys.
       Re-counted from the bank, not from chunkWord. */);
    expect(Math.max(...bankWords().map((w) => chunkWord(w).length))).toBe(4);
    /* And every word of every shipped sentence, which the bank does not
       contain and which the sentence stage tiles the same way. */
    const sent = new Set();
    for (const k of Object.keys(SENTENCES)) for (const s of SENTENCES[k]) for (const w of sentenceWords(s.text)) sent.add(w);
    expect(Math.max(...[...sent].map((w) => chunkWord(w).length))).toBe(4);
  });

  /* Split vowels are NOT in this chunker, and that is a decision rather than
     an omission. The tile row spells the word (P1) and a discontinuous unit
     cannot: "cake" would print c-a_e-k to a child. Pinned so that adding one
     fails here and sends the question to the owner, where S8 puts it. */
  it("leaves a split vowel as letters, because a tile row must spell the word", () => {
    expect(chunkWord("cake")).toEqual(["c","a","k","e"]);
    expect(chunkWord("time")).toEqual(["t","i","m","e"]);
    expect(chunkWord("note")).toEqual(["n","o","t","e"]);
    expect(chunkWord("cake").join("")).toBe("cake");
    for (const g of [...DIGRAPHS, ...TRIGRAPHS, ...QUADGRAPHS]) expect(g.includes("_")).toBe(false);
  });

  /* THE MAGIC-E RULE, owner-stated 2026-08-20: "the vowel takes on its letter
     sound and the e is silent... bite. line." The tiles stay letters (the pin
     above), and the SOUNDS carry the rule: a bare final e after a consonant
     goes d:silent while its vowel says its name; a final ce/ge/se/ve/ze tile
     absorbs the e, so the vowel says its name with no silent tile at all.
     Every expected value a literal (E4); measured over all 49 candidates in
     the ladder, hearts and bank, 45 read right by rule and the four
     exceptions carry bends, which outrank the rule tile by tile. */
  it("sounds the magic e: the vowel says its name and the e says nothing", () => {
    expect(soundIdsFor("cake")).toEqual(["d:k", "d:long_a", "d:k", "d:silent"]);
    expect(soundIdsFor("time")).toEqual(["d:t", "d:long_i", "d:m", "d:silent"]);
    expect(soundIdsFor("home")).toEqual(["d:h", "d:long_o", "d:m", "d:silent"]);
    expect(soundIdsFor("cute")).toEqual(["d:k", "d:long_u", "d:t", "d:silent"]);
    /* The e-absorbed finals: no silent tile, the vowel still says its name. */
    expect(soundIdsFor("gave")).toEqual(["d:g", "d:long_a", "d:v"]);
    expect(soundIdsFor("these")).toEqual(["d:th_quiet", "d:long_e", "d:s"]);
    expect(soundIdsFor("use")).toEqual(["d:long_u", "d:s"]);
    /* live is the owner's own example of the pattern - no bend, no note,
       read by the rule alone. */
    expect(soundIdsFor("live")).toEqual(["d:l", "d:long_i", "d:v"]);
  });
  it("lets a bend outrank the rule, which is how come, some, love and have stay honest", () => {
    /* come's o bends to the u of up while its e STILL goes silent by rule -
       the bend wins tile by tile, not word by word. */
    expect(soundIdsFor("come")).toEqual(["d:k", "d:short_u", "d:m", "d:silent"]);
    expect(soundIdsFor("some")).toEqual(["d:s", "d:short_u", "d:m", "d:silent"]);
    expect(soundIdsFor("love")).toEqual(["d:l", "d:short_u", "d:v"]);
    /* have states the sound it already had; unbent, h-a-ve is exactly the
       shape that fires and it would say "haiv". */
    expect(soundIdsFor("have")).toEqual(["d:h", "d:short_a", "d:v"]);
  });
  it("does not fire where the shape is absent - the controls (E5)", () => {
    /* No final e tile: */
    expect(soundIdsFor("lived")).toEqual(["d:l", "d:short_i", "d:v", "d:short_e", "d:d"]);
    /* Two tiles, no vowel-consonant-e run: */
    expect(soundIdsFor("the")).toEqual(["d:th_this", "d:schwa"]);
    /* A vowel TEAM before the final tile is not a bare vowel: */
    expect(soundIdsFor("house")).toEqual(["d:h", "d:ow", "d:s"]);
    expect(soundIdsFor("see")).toEqual(["d:s", "d:long_e"]);
    /* A final le tile is the syllable unit, never the magic e: */
    expect(soundIdsFor("table")).toEqual(["d:t", "d:short_a", "d:b", "d:l"]);
  });
  it("keeps d:silent out of every audio path while S8 keeps its slot", () => {
    /* One tile, one sound - the slot survives (S8)... */
    expect(soundIdsFor("come").length).toBe(chunkWord("come").length);
    /* ...and no audio consumer ever asks for it: not the inventory, and not
       the reveal plan, which steps over the silent tile with no seam. */
    expect(soundInventory().includes("d:silent")).toBe(false);
    expect(clipPlan("correct", "come", 0)).toEqual(
      ["p:0", "seam2", "w:come", "seam2", "s:pronounced",
       "seam2", "d:k", "seam2", "d:short_u", "seam2", "d:m", "seam2", "w:come"]);
  });
});
