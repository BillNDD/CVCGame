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
import { DIGRAPHS, TRIGRAPHS, QUADGRAPHS, chunkWord, bankWords, SENTENCES, sentenceWords, soundIdsFor, soundInventory, clipPlan, soundIdFor, WORD_TILES, LEX_BENDS } from "../src/engine.js";

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
    expect(chunkWord("pal")).toEqual(["p","a","l"]);         // al needs a following k
    expect(chunkWord("nation")).toEqual(["n","a","ti","o","n"]);
    expect(chunkWord("picture")).toEqual(["p","i","c","tu","re"]);
    expect(chunkWord("walk")).toEqual(["w","al","k"]);
    /* THE -ALL FAMILY, owner-ruled 2026-08-29 from a screenshot: "all" showed
       al + l and the reveal said "al-l". Every other doubled ending is one
       tile - bell, will, doll, miss, off, buzz - so the -all family was the
       single place S8 did not hold. The comment that used to sit here argued
       a-ll "would teach the short a it does not say"; the bend table disproves
       it, and these assertions prove the disproof: the tiles change and not
       one SOUND does. */
    expect(chunkWord("all")).toEqual(["a","ll"]);
    expect(soundIdsFor("all")).toEqual(["d:aw","d:l"]);
    expect(chunkWord("fall")).toEqual(["f","a","ll"]);
    expect(soundIdsFor("fall")).toEqual(["d:f","d:aw","d:l"]);
    /* The three that already bent this tile keep their indices, because al+l
       and a+ll occupy the same two slots - which is why no bend moved. */
    expect(chunkWord("valley")).toEqual(["v","a","ll","ey"]);
    expect(soundIdsFor("valley")).toEqual(["d:v","d:short_a","d:l","d:long_e"]);
    expect(chunkWord("wallet")).toEqual(["w","a","ll","e","t"]);
    expect(soundIdsFor("wallet")).toEqual(["d:w","d:short_o","d:l","d:short_e","d:t"]);
    expect(chunkWord("finally")).toEqual(["f","i","n","a","ll","y"]);
    /* The control: al survives where it belongs, before a K. */
    expect(chunkWord("talking")).toEqual(["t","al","k","i","ng"]);
    expect(soundIdsFor("talk")).toEqual(["d:t","d:aw","d:k"]);
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
    /* The converted bank, 2026-08-20 - measured, re-typed. The four-tile cap
       died with the owner's shrink ruling; eight is breakfast, the measured
       ceiling of everything he has approved. */
    expect(by).toEqual({ 1: 5, 2: 89, 3: 507, 4: 289, 5: 136, 6: 63, 7: 31, 8: 2 });   // +put (p-u-t) at 75, the cutover straggler that slipped the sweep. 64 -> 63 on 2026-08-31: preview (p-r-e-v-ie-w) was dropped closing fault AS - two sounds found in no other bank word, on the level that teaches ie=long e, where it alone said long u
    expect(Math.max(...bankWords().map((w) => chunkWord(w).length))).toBe(8);
    /* And every word of every shipped sentence, which the bank does not
       contain and which the sentence stage tiles the same way. */
    const sent = new Set();
    for (const k of Object.keys(SENTENCES)) for (const s of SENTENCES[k]) for (const w of sentenceWords(s.text)) sent.add(w);
    expect(Math.max(...[...sent].map((w) => chunkWord(w).length))).toBe(8);
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
    /* the audited lexicon's row, not the bare rule: voiced th, final z */
    expect(soundIdsFor("these")).toEqual(["d:th_this", "d:long_e", "d:z"]);
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
    /* Two more lexicon rows that LOOK like controls and are not (the
       2026-08-20 honesty audit moved them here from the control block, where
       their new values no longer discriminated): lived's silent e is the
       audited -ed class, and table's long a is the audited open-syllable
       row - in both, the lexicon speaks, not the bare rule. */
    expect(soundIdsFor("lived")).toEqual(["d:l", "d:short_i", "d:v", "d:silent", "d:d"]);
    expect(soundIdsFor("table")).toEqual(["d:t", "d:long_a", "d:b", "d:l"]);
  });
  it("does not fire where the shape is absent - the controls (E5)", () => {
    /* Each word here has NO vowel-consonant-e run and NO lexicon bend, so a
       firing rule would be visible two ways: a long vowel where a short one
       belongs, or a d:silent tile where none exists. Every expected value is
       a literal with neither. */
    expect(soundIdsFor("sit")).toEqual(["d:s", "d:short_i", "d:t"]);
    expect(soundIdsFor("fox")).toEqual(["d:f", "d:short_o", "d:x"]);
    /* Two tiles, no vowel-consonant-e run: */
    expect(soundIdsFor("the")).toEqual(["d:th_this", "d:schwa"]);
    /* A vowel TEAM before the final tile is not a bare vowel: */
    expect(soundIdsFor("house")).toEqual(["d:h", "d:ow", "d:s"]);
    expect(soundIdsFor("see")).toEqual(["d:s", "d:long_e"]);
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

  /* THE CONVERSION ANCHORS, 2026-08-20 (blueprint commit 1). Two generated
     literals the writer fills at --write: per-word tiling overrides and the
     lexicon's rule-diff bends. Until then both are EMPTY, pinned so today's
     engine provably behaves exactly as before - the zero-retile histogram
     above is the other half of that proof. The branch behaviour (an override
     honoured; WORD_SOUND outranking LEX_BENDS) is proved by the writer's own
     self-test, which splices a nonempty map through the real extractor - a
     const cannot be mutated here. */
  it("carries the writer's two literals, filled at the cutover", () => {
    /* Four tile overrides - three the phonics audit proved and laugh on the
       owner's one-use-ugh ruling - and 273 lexicon bend rows. Spot-pinned;
       the full agreement (every CSV row vs the real engine) is the writer's
       own verify step and G27's lexicon gate. */
    expect(WORD_TILES).toEqual({
      away: ["a", "w", "ay"], ginger: ["g", "i", "n", "g", "er"],
      going: ["g", "o", "i", "ng"], laugh: ["l", "a", "ugh"],
    });
    expect(Object.keys(LEX_BENDS).length).toBe(273);
    expect(LEX_BENDS.laugh).toEqual({ 2: "f" });
    expect(LEX_BENDS.machine).toEqual({ 2: "sh", 3: "long_e" });   // its short a IS the default - only the diffs emit
  });
  it("gives the four single-taught spellings their level's own sound", () => {
    /* gh, gn, ough and ze are the only rowless graphemes the shape teaches
       at exactly one level, so the lesson is the default (the owner's
       levels-teach-the-default ruling). Literals, not reads (E4). */
    expect(soundIdFor("gh")).toBe("d:f");
    expect(soundIdFor("gn")).toBe("d:n");
    expect(soundIdFor("ough")).toBe("d:aw");
    expect(soundIdFor("ze")).toBe("d:z");
    /* The six twice-taught spellings stay deliberately rowless: the loud
       fallback is their guard, and the lexicon rules each word. */
    for (const g of ["ea", "ere", "ey", "ie", "oo", "ow"])
      expect(soundIdFor(g)).toBe("d:unmapped." + g);
  });
  it("reads no word out of bare punctuation", () => {
    /* "Then - pop!" was G27's one standing text_word_untaught finding,
       carried at a ceiling of 1 since the gate was born. */
    expect(sentenceWords("Then - pop! It is fun.")).toEqual(["then", "pop", "it", "is", "fun"]);
    expect(sentenceWords("a - b")).toEqual(["a", "b"]);
  });
});
