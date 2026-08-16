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
  "slap", "whack", "smack", "grab", "pin", "tug", "lick", "kick", "bump", "shut"];
export const CHILD = ["me", "us"];

export function shape(text) {
  const ws = sentenceWords(text);
  const adult = ws.findIndex((w) => ADULTS.includes(w));
  if (adult < 0) return null;
  const verb = ws.findIndex((w, i) => i > adult && CONTACT.includes(w));
  if (verb < 0) return null;
  const child = ws.findIndex((w, i) => i > verb && CHILD.includes(w));
  if (child < 0) return null;
  return `an adult (${ws[adult]}) does something physical (${ws[verb]}) to the child (${ws[child]})`;
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
export const SCREENED = [
  "s:mode-b3-s01", "s:mode-b3-s02", "s:mode-b3-s03", "s:mode-b3-s04",
  "s:mode-b3-s05", "s:mode-s01", "s:mode-s06", "s:mode-b3-s06",
  "s:mode-b3-s07", "s:mode-b3-s08", "s:mode-b3-s09", "s:mode-wm-wm01",
  "s:mode-wm-wm03", "s:mode-wm-wm04", "s:mode-wm-wm11", "s:mode-wm-wm12",
  "s:mode-wm-wm14", "s:mode-wm-wm19", "s:mode-wm-wm21", "s:mode-wm-wm22",
  "s:mode-s08", "s:mode-b2-s04", "s:mode-b2-s13", "s:mode-b3-s10",
  "s:mode-b3-s11", "s:mode-b3-s12", "s:mode-wm-wm02", "s:mode-wm-wm06",
  "s:mode-wm-wm09", "s:mode-wm-wm10", "s:mode-wm-wm15", "s:mode-wm-wm20",
  "s:mode-s02", "s:mode-s03", "s:mode-s04", "s:mode-s05",
  "s:mode-s07", "s:mode-s12", "s:mode-b2-s02", "s:mode-b2-s07",
  "s:mode-b2-s14", "s:mode-b2-s18", "s:mode-wm-wm23", "s:mode-s10",
  "s:mode-s16", "s:mode-b3-s13", "s:mode-b3-s14", "s:mode-b3-s15",
  "s:mode-wm-wm07", "s:mode-wm-wm08", "s:mode-wm-wm17", "s:mode-s09",
  "s:mode-b2-s05", "s:mode-b2-s10", "s:mode-b3-s16", "s:mode-b3-s17",
  "s:mode-s11", "s:mode-s13", "s:mode-s14", "s:mode-s15",
  "s:mode-s17", "s:mode-s18", "s:mode-s19", "s:mode-b2-s06",
  "s:mode-b2-s11", "s:mode-b2-s12", "s:mode-b2-s17", "s:mode-b2-s19",
  "s:mode-s20", "s:mode-b2-s01", "s:mode-b2-s08", "s:mode-b2-s09",
  "s:mode-b3-s18", "s:mode-b3-s19", "s:mode-b2-s03", "s:mode-b2-s20",
  "s:mode-b3-s20", "s:mode-b3-s21", "s:mode-b3-s22", "s:mode-b3-s23",
  "s:mode-b3-s24", "s:mode-b3-s25", "s:mode-b3-s26", "s:mode-b3-s27",
  "s:mode-b3-s28", "s:mode-b3-s29", "s:mode-b3-s30", "s:mode-b3-s31",
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
  "s:cur-l1-01", "s:cur-l1-02", "s:cur-l2-01", "s:cur-l2-02",
  "s:cur-l2-03", "s:cur-l2-04", "s:cur-l2-05", "s:cur-l3-01",
  "s:cur-l3-02", "s:cur-l3-03", "s:cur-l4-01", "s:cur-l4-02",
  "s:cur-l4-04", "s:cur-l4-05", "s:cur-l5-01", "s:cur-l5-02",
  "s:cur-l5-03", "s:cur-l6-01", "s:cur-l6-02", "s:cur-l6-03",
  "s:cur-l6-04", "s:cur-l6-05", "s:cur-l7-01", "s:cur-l7-02",
  "s:cur-l7-03", "s:cur-l7-04", "s:cur-l7-05", "s:cur-l8-01",
  "s:cur-l8-02", "s:cur-l8-03", "s:cur-l8-04", "s:cur-l8-05",
  "s:cur-l9-01", "s:cur-l9-02", "s:cur-l9-03", "s:cur-l9-04",
  "s:cur-l9-05", "s:cur-l10-01", "s:cur-l10-02", "s:cur-l10-03",
  "s:cur-l10-04", "s:cur-l10-05", "s:cur-l11-01", "s:cur-l11-02",
  "s:cur-l11-03", "s:cur-l11-04", "s:cur-l11-05", "s:cur-l12-01",
  "s:cur-l12-02", "s:cur-l12-03", "s:cur-l12-04", "s:cur-l12-05",
  "s:cur-l12-06",
  /* Round five, read on its page the same day (the s:r5 ids carry no
     level on the build reviewer's advice - a seat is the arbiter's fact,
     not an id's). */
  "s:r5-01", "s:r5-02", "s:r5-03", "s:r5-04",
  "s:r5-05", "s:r5-06", "s:r5-07", "s:r5-08",
  "s:r5-09", "s:r5-10", "s:r5-11", "s:r5-12",
  "s:r5-13", "s:r5-14", "s:r5-15", "s:r5-16",
  "s:r5-17", "s:r5-18", "s:r5-19", "s:r5-20",
  "s:r5-21", "s:r5-22", "s:r5-23", "s:r5-24",
  "s:r5-25", "s:r5-26", "s:r5-27", "s:r5-28",
  "s:r5-29", "s:r5-30", "s:r5-31", "s:r5-32",
  "s:r5-33", "s:r5-34", "s:r5-35", "s:r5-36",
  "s:r5-37", "s:r5-38", "s:r5-39", "s:r5-40",
  "s:r5-41", "s:r5-42", "s:r5-43", "s:r5-44",
  "s:r5-45", "s:r5-46", "s:r5-47", "s:r5-48",
  "s:r5-49",
  /* Round six, read the same day. */
  "s:r6-01", "s:r6-02", "s:r6-03", "s:r6-04",
  "s:r6-05", "s:r6-06", "s:r6-07", "s:r6-08",
];

export function screen(sentences) {
  const problems = [];
  const known = new Set([...SCREENED, ...SCREENED_2026_08_15]);
  for (const { id, text } of sentences) {
    const s = shape(text);
    if (s) problems.push(`refused by shape: ${id} ("${text}") — ${s}`);
    const p = phrases(text);
    if (p) problems.push(`refused by banned phrase: ${id} ("${text}") — ${p}`);
    if (!known.has(id)) problems.push(`never screened by a person: ${id} ("${text}") — read it, then add it to SCREENED`);
  }
  /* The ledger must not outlive what it screens either. A name here for a
     sentence the game no longer shows is a record of a read that no longer
     protects anything, and it hides the next removal. */
  const shipped = new Set(sentences.map((s) => s.id));
  for (const id of [...SCREENED, ...SCREENED_2026_08_15]) if (!shipped.has(id)) problems.push(`screened but not shipped: ${id} — remove it, or ship it`);
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
  const total = cases.length + phraseCases.length + 3;
  console.log(`\nsentence-screen controls: ${total - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.length === 2) {
  const problems = screen(shippedSentences());
  problems.forEach((p) => console.log("  PROBLEM: " + p));
  console.log(`Sentence screen: ${shippedSentences().length} sentences, screened ${SCREENED_ON} and 2026-08-15, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
