/* Is this sentence one a child SHOULD meet?
 *
 * `tools/decodable.mjs` asks whether a child CAN read a sentence. Nothing
 * asked the other question until 2026-08-13, when the owner refused
 * "My dad can pat me." with two words — *not appropriate* — and every
 * mechanical gate had passed it: every word taught, the level right, the
 * audio clean. A sentence carries a meaning that none of its words does.
 *
 * CLAUDE.md has held this rule for WORDS since "milt" reached a listening
 * round: before any beta, the whole bank is re-screened for sexual, crude or
 * violent meaning, plurals and near-misspellings included. Sentences were
 * never brought under it. This file is that rule for sentences, and CLAUDE.md
 * now says so.
 *
 * TWO HALVES, AND NEITHER IS ENOUGH ALONE.
 *
 * 1. A SHAPE CHECK, mechanical. It refuses the shape the owner refused: an
 *    adult subject, a verb of physical contact, and the child as the object.
 *    A machine cannot judge meaning, so this catches one known shape and
 *    claims nothing more.
 *
 * 2. A SCREENED LEDGER, human. Every sentence the game can show must be named
 *    below, and being named means a person READ it on the date in the header
 *    and judged it fit for a four-year-old. A new sentence fails this gate
 *    until someone adds it, and the only way to add it honestly is to read it.
 *    An absence of red flags is not a screen; a positive record is.
 *
 * Usage:
 *   node tools/sentence-screen.mjs              screen every shipped sentence
 *   node tools/sentence-screen.mjs --self-test  prove the checker catches
 */
import { SENTENCES, REVEAL_LINES, REVEAL_LINE_TEXT, sentenceWords } from "../src/engine.js";

/* THE SHAPE. Adults, contact verbs, and the child as object.

   The lists are deliberately narrow. A wide list would refuse "The cat sat on
   me." and "My pal can zap me!" — both approved by the owner, both fine,
   because an animal or a peer in a game is not an adult laying hands on a
   child. Widening these lists to catch more is not obviously safer: a screen
   that cries wolf gets switched off, and this one must survive being useful.
   ADULTS holds every adult noun the bank teaches; add to it when the bank
   does. */
export const ADULTS = ["dad", "mom", "man", "men", "gran", "nan", "pop"];
export const CONTACT = ["pat", "tap", "hit", "rub", "hug", "kiss", "zap", "nip", "jab",
  "slap", "whack", "smack", "grab", "pin", "tug", "lick", "kick", "bump", "shut",
  /* Widened 2026-08-21, owner-ruled on the cutover morning page: the audit
     found "Dad lifted me up" wearing the refused shape through a verb this
     list could not see. The first widening took every verb an adult uses on
     a child's body PLUS take and pick - and promptly refused "Mom took me
     to the shop", "It took us all day" and "he picked me" (a rabbit,
     choosing): the cries-wolf trap this header warns about, caught by the
     gate's own run before it shipped. So take and pick stay out (motion and
     idiom, not contact), the body verbs below joined with their sentence
     inflections, and shape() gained the adjacency window that makes broad
     verbs precise. */
  "lift", "lifted", "lifts", "hold", "held", "holds",
  "carry", "carried", "carries", "pull", "pulled",
  "pulls", "push", "pushed", "pushes", "touch", "touched", "touches"];
export const CHILD = ["me", "us"];

export function shape(text) {
  /* EVERY contact verb after an adult is examined (the old first-match could
     look at an innocent early verb and miss a guilty later one), and the
     child must sit within THREE words after the verb - "lifted me up" and
     "pat me" are the shape; "held the map for us" and a "me" three
     sentences downstream are not. The window is what lets the 2026-08-21
     verb widening exist without refusing half the corpus (measured: the
     unbounded span swept four innocent paragraphs on its first run). */
  const ws = sentenceWords(text);
  const adult = ws.findIndex((w) => ADULTS.includes(w));
  if (adult < 0) return null;
  for (let v = adult + 1; v < ws.length; v += 1) {
    if (!CONTACT.includes(ws[v])) continue;
    for (let c = v + 1; c <= Math.min(v + 3, ws.length - 1); c += 1)
      if (CHILD.includes(ws[c]))
        return `an adult (${ws[adult]}) does something physical (${ws[v]}) to the child (${ws[c]})`;
  }
  return null;
}

/* PHRASES THE OWNER BANNED BY NAME. A sentence can be innocent word by word
   and still carry a euphemism whole. The owner banned two in the Levels 1-6
   listening round on 2026-08-15 — both had passed every mechanical gate, and
   one of them ("pat" beside "cat") had passed this file's shape check too,
   because no adult and no child appears in it. Like ADULTS and CONTACT above,
   this list is deliberately narrow: it holds exactly what the owner has
   refused, covers the plural a child could produce, and claims nothing more.
   The words themselves stay teachable; it is the pairing that is banned. */
export function phrases(text) {
  const ws = sentenceWords(text);
  const has = (...forms) => ws.some((w) => forms.includes(w));
  if (has("pat", "pats") && has("cat", "cats"))
    return `"pat" beside "cat" — a euphemism the owner banned on 2026-08-15, in any order, any distance`;
  if (ws.some((w, i) => ["tap", "taps"].includes(w) && ws[i + 1] === "it"))
    return `"tap it" — a euphemism the owner banned on 2026-08-15`;
  return null;
}

/* THE SCREENED LEDGER — read by a person on 2026-08-13, all 91 of them, one
   by one, against CLAUDE.md's word rule: nothing with a sexual, crude,
   violent or otherwise adult meaning or slang, and nothing whose SHAPE
   teaches a child something they should not be taught.

   Two sentences were looked at twice and kept, and saying which is part of
   the record: "My pal can zap me!" and "Can my pal tag me?" put a contact
   verb on the child, and both were kept because the subject is a peer in a
   game — the same reason "The cat sat on me." is fine. If either ever reads
   wrongly to the owner, it comes out; that is a verdict, not a calculation.

   One sentence was REFUSED and is not in the game: "My dad can pat me."
   (owner, 2026-08-13). It is the control in --self-test. */
export const SCREENED_ON = "2026-08-13";
/* PRUNED at the 2026-08-20 cutover: the 100-level conversion retired 210 of
   the old world's texts, and this ledger must not outlive what it screens -
   its own rule. The reads stay in git history; what remains here is every
   old-world id that still ships (the reveal lines and nothing else). */
export const SCREENED = [
  "s:soundout-1", "s:soundout-2", "s:soundout-3",
];

/* THE SECOND READ — the 10-and-10 curriculum rounds, 2026-08-15. Every id
   below is a sentence the owner heard whole AND read on the round pages that
   same night; the round-one page said it in as many words: "Reading this page
   IS the screening." docs/settled.md holds the four rounds. A second dated
   list rather than a merge, because SCREENED_ON above is the 2026-08-13 read
   and one constant cannot carry two dates honestly. The ids spell the level
   each sentence was DRAFTED at, which is history, not a seat — the arbiter
   (tools/decodable.mjs) owns seats, and two drafts landed elsewhere. */
export const SCREENED_2026_08_15 = [

];

/* Level 21's twelve, owner-read on the Cats and Dogs decision pages of
   2026-08-16: seven kept by name on round one, one the owner WROTE
   (s:r7-08, "The maps rest on the desk." — writing outranks reading), and
   four kept by name on round two. Every clip then graded perfect in
   listening round seven the same day. */
export const SCREENED_2026_08_16 = [

];

/* THE READ SCREEN OF THE V3 TEXTS - owner-ruled 2026-08-20 on the audit page,
   and SHIPPED at the cutover the same day: the seats these ids were awaiting
   arrived when the 100-level conversion wrote the engine, so this list is now
   the shipped screened ledger for the v3 world and the stale rule sweeps it
   like the others. The name keeps its history. His ruling was "read them on
   screening pages"; the listening rounds graded AUDIO, and the
   independent audit refused to let those stand as reads; these pages were
   text-only, one question per text - should a child meet this - which is the
   question CLAUDE.md's before-any-beta rule asks. These ids are AWAITING
   SEATS: screened and approved for reading, not yet shipped, because the
   engine is still the 21-level one. The stale rule below exempts exactly this
   list and nothing else, and a control proves the exemption is not a blanket:
   a v3 id NOT in this list is still refused as never screened.
   Batch 4 (levels 77-100, 67 read): 66 ok, one REFUSED - s:v3-l78-02,
   "incredibly sad" - despite an earlier ear-approval; the read outranks, and
   its row and clip left the waiting room the way gob left the pack, so it
   cannot return by accident; its REPLACEMENT - a warmer scene under the same
   id, drafted, validated and rendered the same day - was approved "good" on a
   single-text page whose whole subject was the refused text's meaning, which
   is why its read stands recorded here beside the batch reads. A second
   batch-4 submission later said "ok" for the old id; the owner then approved
   the replacement, which settles that the refusal stood. Batch 2 (levels
   25-50, 69 read): 69 ok. Batch 3 (levels 50-77, 69 read): 69 ok. Batch 1
   (levels 1-25, 69 read): 69 ok - THE READ SCREEN IS COMPLETE: every text in
   the waiting room has been read by the owner.
   2026-08-20, the move-bill repairs: eleven of these ids were REWORDED when
   the early-seated words moved to their code levels (l13-01, l13-02, l41-01,
   l42-02, l46-02, l48-01, l52-02, l67-01, l71-01, l94-01, l94-02), and the
   owner read every repaired wording on the sound14+eleven page the same day,
   all eleven "perfect". Their entries below therefore name reads of the
   CURRENT texts. One of them took a detour the round log keeps in full:
   l67-01's first repaired wording used "for", which the ladder teaches at
   L81; the rehearsal caught it before the commit, the row and clip left the
   room on the l78-02 pattern, the two-word fix ("hot all day", validates at
   67) went back on its own card, and the owner ruled it perfect in round 15
   the same evening - so its entry here names a read of the text now in the
   room. This ledger binds a read to an
   ID, not to the bytes read, so
   a reworded text inherits its id's read silently - a recorded gap in
   docs/open-faults.md until the drift refactor gives these entries structure.
   2026-08-20, later the same evening: l30-02 was reworded once more when the
   owner ruled sold and told up to level 68 ("told" became "said"), and he
   read and heard the repaired text on the pit-and-ow page, "perfect" - its
   entry below names a read of the current text. */
export const SCREENED_2026_08_20_V3_AWAITING_SEAT = [
  "s:v3-l01-01", "s:v3-l02-01", "s:v3-l02-02", "s:v3-l03-01",
  "s:v3-l03-02", "s:v3-l04-01", "s:v3-l04-02", "s:v3-l05-01",
  "s:v3-l05-02", "s:v3-l05-51", "s:v3-l05-52", "s:v3-l05-53",
  "s:v3-l05-54", "s:v3-l06-01", "s:v3-l06-02", "s:v3-l06-03",
  "s:v3-l06-04", "s:v3-l07-01", "s:v3-l07-02", "s:v3-l08-01",
  "s:v3-l08-02", "s:v3-l09-01", "s:v3-l09-02", "s:v3-l10-01",
  "s:v3-l10-02", "s:v3-l10-51", "s:v3-l10-52", "s:v3-l10-53",
  "s:v3-l10-54", "s:v3-l10-55", "s:v3-l10-56", "s:v3-l11-01",
  "s:v3-l11-02", "s:v3-l11-51", "s:v3-l12-01", "s:v3-l12-02",
  "s:v3-l13-01", "s:v3-l13-02", "s:v3-l13-51", "s:v3-l14-01",
  "s:v3-l14-02", "s:v3-l15-01", "s:v3-l15-02", "s:v3-l16-01",
  "s:v3-l16-02", "s:v3-l17-02", "s:v3-l17-03", "s:v3-l17-51",
  "s:v3-l17-52", "s:v3-l17-53", "s:v3-l18-01", "s:v3-l18-02",
  "s:v3-l18-51", "s:v3-l19-01", "s:v3-l19-02", "s:v3-l20-01",
  "s:v3-l20-02", "s:v3-l20-51", "s:v3-l21-01", "s:v3-l21-02",
  "s:v3-l22-01", "s:v3-l22-02", "s:v3-l23-01", "s:v3-l23-02",
  "s:v3-l23-03", "s:v3-l23-51", "s:v3-l24-01", "s:v3-l24-02",
  "s:v3-l25-01",
  "s:v3-l25-02", "s:v3-l25-51", "s:v3-l25-52", "s:v3-l26-01",
  "s:v3-l26-02", "s:v3-l26-51", "s:v3-l27-01", "s:v3-l27-02",
  "s:v3-l27-51", "s:v3-l27-52", "s:v3-l27-53", "s:v3-l28-01",
  "s:v3-l28-02", "s:v3-l29-01", "s:v3-l29-02", "s:v3-l30-01",
  "s:v3-l30-02", "s:v3-l31-01", "s:v3-l31-02", "s:v3-l31-51",
  "s:v3-l32-01", "s:v3-l32-02", "s:v3-l33-01", "s:v3-l33-02",
  "s:v3-l33-51", "s:v3-l34-01", "s:v3-l34-02", "s:v3-l35-01",
  "s:v3-l35-02", "s:v3-l36-01", "s:v3-l36-02", "s:v3-l37-01",
  "s:v3-l37-02", "s:v3-l38-01", "s:v3-l38-02", "s:v3-l39-01",
  "s:v3-l39-02", "s:v3-l40-01", "s:v3-l40-02", "s:v3-l40-51",
  "s:v3-l40-52", "s:v3-l40-53", "s:v3-l40-54", "s:v3-l40-55",
  "s:v3-l40-56", "s:v3-l40-57", "s:v3-l40-58", "s:v3-l40-59",
  "s:v3-l40-60", "s:v3-l41-01", "s:v3-l41-02", "s:v3-l42-01",
  "s:v3-l42-02", "s:v3-l43-01", "s:v3-l43-02", "s:v3-l44-01",
  "s:v3-l44-02", "s:v3-l45-01", "s:v3-l45-02", "s:v3-l46-01",
  "s:v3-l46-02", "s:v3-l46-51", "s:v3-l47-01", "s:v3-l47-02",
  "s:v3-l48-01", "s:v3-l48-02", "s:v3-l49-01", "s:v3-l49-02",
  "s:v3-l50-01",
  "s:v3-l50-02", "s:v3-l51-01", "s:v3-l51-02", "s:v3-l52-01",
  "s:v3-l52-02", "s:v3-l53-01", "s:v3-l53-02", "s:v3-l54-01",
  "s:v3-l54-02", "s:v3-l55-01", "s:v3-l55-02", "s:v3-l55-51",
  "s:v3-l56-01", "s:v3-l56-02", "s:v3-l56-51", "s:v3-l57-01",
  "s:v3-l57-02", "s:v3-l58-01", "s:v3-l58-02", "s:v3-l59-01",
  "s:v3-l59-02", "s:v3-l60-01", "s:v3-l60-02", "s:v3-l60-51",
  "s:v3-l60-52", "s:v3-l61-01", "s:v3-l61-02", "s:v3-l61-03",
  "s:v3-l61-51", "s:v3-l61-52", "s:v3-l61-53", "s:v3-l62-02",
  "s:v3-l62-03", "s:v3-l63-01", "s:v3-l63-02", "s:v3-l64-01",
  "s:v3-l64-02", "s:v3-l65-02", "s:v3-l65-03", "s:v3-l66-01",
  "s:v3-l66-02", "s:v3-l66-03", "s:v3-l66-51", "s:v3-l67-01",
  "s:v3-l67-02", "s:v3-l68-01", "s:v3-l68-02", "s:v3-l69-01",
  "s:v3-l69-02", "s:v3-l70-01", "s:v3-l70-02", "s:v3-l71-01",
  "s:v3-l71-02", "s:v3-l72-01", "s:v3-l72-02", "s:v3-l73-01",
  "s:v3-l73-02", "s:v3-l74-02", "s:v3-l74-03", "s:v3-l75-01",
  "s:v3-l75-02", "s:v3-l75-51", "s:v3-l76-01", "s:v3-l76-02",
  "s:v3-l76-51", "s:v3-l77-01", "s:v3-l77-02", "s:v3-l77-51",
  "s:v3-l77-52",
  "s:v3-l77-53", "s:v3-l77-54", "s:v3-l77-55", "s:v3-l78-01",
  "s:v3-l78-02",
  "s:v3-l79-01", "s:v3-l79-02", "s:v3-l80-01", "s:v3-l80-02",
  "s:v3-l80-51", "s:v3-l80-52", "s:v3-l81-01", "s:v3-l81-02",
  "s:v3-l81-51", "s:v3-l81-52", "s:v3-l82-01", "s:v3-l82-02",
  "s:v3-l83-01", "s:v3-l83-02", "s:v3-l83-51", "s:v3-l83-52",
  "s:v3-l84-01", "s:v3-l84-02", "s:v3-l85-01", "s:v3-l85-02",
  "s:v3-l85-51", "s:v3-l85-52", "s:v3-l85-53", "s:v3-l86-01",
  "s:v3-l86-02", "s:v3-l87-01", "s:v3-l87-02", "s:v3-l88-01",
  "s:v3-l88-02", "s:v3-l88-51", "s:v3-l89-01", "s:v3-l89-02",
  "s:v3-l90-01", "s:v3-l90-02", "s:v3-l91-01", "s:v3-l91-02",
  "s:v3-l92-01", "s:v3-l92-02", "s:v3-l93-01", "s:v3-l93-02",
  "s:v3-l94-01", "s:v3-l94-02", "s:v3-l95-01", "s:v3-l95-02",
  "s:v3-l95-51", "s:v3-l96-01", "s:v3-l96-02", "s:v3-l97-01",
  "s:v3-l97-02", "s:v3-l97-51", "s:v3-l97-52", "s:v3-l97-53",
  "s:v3-l97-54", "s:v3-l98-01", "s:v3-l98-02", "s:v3-l99-01",
  "s:v3-l99-02", "s:v3-l100-01", "s:v3-l100-02", "s:v3-l100-51",
  "s:v3-l100-52", "s:v3-l100-53",
];

/* SHAPE CLEARANCES. The shape heuristic scans the whole text for an
   adult, then a contact verb, then the child - across sentence boundaries -
   and two owner-read texts trip it on words that are not what it thinks:
   each entry names the misread and cites the read that outranks it. A
   clearance clears the SHAPE rule only; the banned-phrase rule still runs,
   and an id not named here is refused exactly as before (both proved by
   controls). Like every list here it binds by id (open-faults F4). */
export const SHAPE_CLEARED = {
  "s:v3-l44-02": "the kick is the BROTHER kicking a sand hill ('my brother ran up and did kick it'), no adult touches anyone; owner-read in screen batch 2, 2026-08-20, 69 ok",
  "s:v3-l58-02": "the tap is a FAUCET ('fill it at the tap'), a noun the verb list misreads; owner-read in screen batch 3, 2026-08-20, 69 ok",
  "s:v3-l45-01": "'Dad lifted me up on the hill' - a sled lift, first-reader warmth; owner ruled 'keep both; widen the verb list; clear both ids by name', cutover morning page, 2026-08-21",
  "s:v3-l42-01": "'Dad held my hand and we sat and had a plum' - hand-holding; same ruling, same page, 2026-08-21",
};

export function screen(sentences) {
  const problems = [];
  const known = new Set([...SCREENED, ...SCREENED_2026_08_15, ...SCREENED_2026_08_16, ...SCREENED_2026_08_20_V3_AWAITING_SEAT]);
  for (const { id, text } of sentences) {
    const s = shape(text);
    if (s && !SHAPE_CLEARED[id]) problems.push(`refused by shape: ${id} ("${text}") — ${s}`);
    const p = phrases(text);
    if (p) problems.push(`refused by banned phrase: ${id} ("${text}") — ${p}`);
    if (!known.has(id)) problems.push(`never screened by a person: ${id} ("${text}") — read it, then add it to SCREENED`);
  }
  /* The ledger must not outlive what it screens either. A name here for a
     sentence the game no longer shows is a record of a read that no longer
     protects anything, and it hides the next removal. */
  const shipped = new Set(sentences.map((s) => s.id));
  for (const id of [...SCREENED, ...SCREENED_2026_08_15, ...SCREENED_2026_08_16, ...SCREENED_2026_08_20_V3_AWAITING_SEAT]) if (!shipped.has(id)) problems.push(`screened but not shipped: ${id} — remove it, or ship it`);
  return problems;
}

export const shippedSentences = () => [
  ...Object.values(SENTENCES).flat(),
  ...REVEAL_LINES.map((id) => ({ id, text: REVEAL_LINE_TEXT[id] })),
];

if (process.argv.includes("--self-test")) {
  const cases = [
    ["My dad can pat me.", true, "the sentence the owner refused, and the shape this exists for"],
    ["My mom can hug me.", true, "the same shape with a different adult and a kinder verb — still an adult on a child"],
    ["The man can tap me.", true, "no possessive needed: an adult is an adult"],
    ["The cat sat on me.", false, "an animal is not an adult — and the owner approved this one"],
    ["My pal can zap me!", false, "a peer in a game is not an adult — the owner approved this one too"],
    ["My dad had a nap.", false, "an adult with no contact verb and no child"],
    ["Can my pal tag me?", false, "control: approved, and must not be swept up"],
    ["My dad can pat the dog.", false, "an adult and a contact verb, but the object is not the child"],
    ["Dad lifted me up on the hill.", true, "the 2026-08-21 widening's own proof: the verb the cutover audit found this screen blind to (the shipped sentence itself passes only through its SHAPE_CLEARED entry)"],
    ["Mom held me in the den.", true, "the widening's second verb, inflected as a sentence would carry it"],
    ["Dad held the map for us.", false, "held with no child object - the widened verbs keep the old shape's precision"],
    ["Pat me and my dad can run.", false, "the order is the shape: the child comes before the adult here"],
  ];
  const phraseCases = [
    ["Pat my cat.", true, "the sentence the owner banned on 2026-08-15, word for word"],
    ["Can you tap it?", true, "the other sentence the owner banned on 2026-08-15, word for word"],
    ["My cat can pat.", true, "the same pair reversed — the ban is the pairing, not the order"],
    ["He taps it.", true, "the plural a child could produce is covered, as the word rule requires"],
    ["The cat sat.", false, "cat without pat is the bank's oldest friend and must survive"],
    ["Tap, tap, tap!", false, "tap without it is innocent drumming and must survive"],
    ["We tap at it.", false, "tap and it apart: the euphemism is the adjacent pair, not the words"],
  ];
  let failed = 0;
  for (const [text, want, why] of cases) {
    const got = shape(text) !== null;
    const ok = got === want;
    console.log((ok ? "ok   " : "FAIL ") + `${want ? "refused" : "passes "}: ${why}`);
    if (!ok) failed += 1;
  }
  for (const [text, want, why] of phraseCases) {
    const got = phrases(text) !== null;
    const ok = got === want;
    console.log((ok ? "ok   " : "FAIL ") + `${want ? "refused" : "passes "}: ${why}`);
    if (!ok) failed += 1;
  }
  /* The ledger's own controls, both directions. Without the second, "every
     sentence is screened" passes on an implementation that checks nothing. */
  const real = screen(shippedSentences());
  console.log((real.length === 0 ? "ok   " : "FAIL ") + `every shipped sentence is screened and clean (${shippedSentences().length} of them)`);
  if (real.length) { failed += 1; real.slice(0, 5).forEach((p) => console.log("       " + p)); }
  const planted = screen([...shippedSentences(), { id: "s:mode-planted", text: "The dog can run." }]);
  const caught = planted.some((p) => p.startsWith("never screened by a person: s:mode-planted"));
  console.log((caught ? "ok   " : "FAIL ") + "control: a brand-new sentence nobody has read is refused");
  if (!caught) failed += 1;
  const stale = screen(shippedSentences().slice(1));
  const sawStale = stale.some((p) => p.startsWith("screened but not shipped:"));
  console.log((sawStale ? "ok   " : "FAIL ") + "control: a screened sentence the game no longer shows is reported");
  if (!sawStale) failed += 1;
  /* The awaiting-seat exemption, both ways. A v3 id IN the read ledger ships
     without a "never screened" refusal; a v3 id NOT in it is refused exactly
     like any stranger. Without the second half, the ledger would be a blanket
     amnesty for anything spelled s:v3-. The planted id was s:v3-l78-02 until
     its replacement was read and approved on 2026-08-20 and the id joined the
     ledger - at which point this control went red, which is the control
     working; the plant is now an id no text will ever hold. */
  const seated = screen([...shippedSentences(), { id: "s:v3-l100-01", text: "Look how far you got, and look how fast you can read now." }]);
  const seatedOk = !seated.some((p) => p.includes("s:v3-l100-01"));
  console.log((seatedOk ? "ok   " : "FAIL ") + "control: a v3 id the owner read ships without a never-screened refusal");
  if (!seatedOk) failed += 1;
  {
    const clearedText = "Dad ran to the hill. My brother did kick me."; // adult..kick..child, inside the adjacency window (re-pointed 2026-08-21 when the window landed)
    const hit = screen([{ id: "s:v3-l44-02", text: clearedText }]);
    const strange = screen([{ id: "s:v3-l00-98", text: clearedText }]);
    const clearedOk = !hit.some((p) => p.startsWith("refused by shape")) && strange.some((p) => p.startsWith("refused by shape"));
    console.log((clearedOk ? "ok   " : "FAIL ") + "control: a shape clearance clears its own id and no stranger");
    if (!clearedOk) failed += 1;
    const phraseStillRuns = screen([{ id: "s:v3-l44-02", text: "I pat the cat." }]).some((p) => p.includes("banned phrase"));
    console.log((phraseStillRuns ? "ok   " : "FAIL ") + "control: a clearance clears the SHAPE rule only - the banned phrases still refuse");
    if (!phraseStillRuns) failed += 1;
  }
  const refused = screen([...shippedSentences(), { id: "s:v3-l00-99", text: "planted" }]);
  const refusedCaught = refused.some((p) => p.startsWith("never screened by a person: s:v3-l00-99"));
  console.log((refusedCaught ? "ok   " : "FAIL ") + "control: a v3 id OUTSIDE the read ledger is refused - the exemption is a list, not a spelling");
  if (!refusedCaught) failed += 1;
  const total = cases.length + phraseCases.length + 7;
  console.log(`\nsentence-screen controls: ${total - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.length === 2) {
  const problems = screen(shippedSentences());
  problems.forEach((p) => console.log("  PROBLEM: " + p));
  console.log(`Sentence screen: ${shippedSentences().length} sentences, screened ${SCREENED_ON}, 2026-08-15 and 2026-08-16, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
