/* G16, rule 9: every word SPEC rules out must be a word the engine refuses to
   let a child BUILD, and must not be a word the engine TEACHES. The two lists
   lived apart for a day and a tray handed gob back - the word SPEC says was
   removed "so it cannot return by accident". A subset check, not equality:
   the engine may be stricter (it also refuses the ruled-out plurals), never
   looser.

   IT READS EVERY DATED REFUSAL, NOT ONE SENTENCE (the beta 27 readiness
   audit, 2026-08-23). The first version read only the 2026-08-07 sentence,
   so every refusal the owner has made since - the thirteen book-artifacts
   and character names of 2026-08-16, gun with them, the four of 2026-08-18 -
   was guarded by nothing, and a child could build two of them while this
   rule ran green. SPEC draws the line this rule reads: a refusal for
   APPROPRIATENESS (the 2026-08-07 list, gun, and 2026-08-18's fight, hustle
   and grind) must also be in NEVER_BUILD, because a tray must never let a
   child spell it; a refusal that merely turns a CANDIDATE down (a book
   artifact like blap, a character name, neighbor) must not be taught, and
   needs no build guard - a child spelling "blap" is not a safety matter, and
   guarding it would take buildable words off the board for nothing. Two of
   the 2026-08-16 artifacts are on both sides, by SPEC's own words: ho carries
   adult slang and sam "is also a given name the S9 gate refuses".
   A contradiction the owner has not yet settled is named in
   docs/open-faults.md and skipped here BY NAME while that entry is open -
   never silently.

   TWO DERIVATIONS THAT MUST AGREE, and NO WORD TYPED IN THIS FILE (the
   engineering seat's before pass, 2026-08-23). The first is SPEC's DECLARED
   build-guard list, which NEVER_BUILD must equal in BOTH directions - a word
   declared and unguarded is a hole, a word guarded and undeclared is a guard
   nobody ruled. The second is the prose the refusals are written in, kept as
   an independent subset check: two derivations that must agree is strictly
   stronger than one, and dropping the prose half would be weakening a gate
   (E3). Until 2026-08-23 this rule typed "gob", "ho" and "ding" into itself -
   the same defect it exists to catch, one layer up. The anchors below are
   this gate's oracle. */

/* AN ITEM CAN HOLD TWO WORDS. "**hustle** and **grind**" is a single
   comma-item, so splitting on commas alone produced "hustle and grind",
   which fails the word test and was DISCARDED - the rule's own comment said
   it read 2026-08-18's fight, hustle and grind, and it read fight. Found by
   the engineering seat's after pass, 2026-08-23. And "hunt, fist, limp,
   bone, buns, dump, and milt" - the Oxford comma leaves "and milt" on the
   last item, so the word is stripped per ITEM rather than from the sentence:
   the first version reported that the engine would let a child build
   "and milt". */
const items = (text) => text.split(",").flatMap((part) => part.split(/\s+and\s+/))
  .map((w) => w.replace(/^\s*and\s+/, "").replace(/\*\*/g, "").trim().toLowerCase())
  .map((w) => (/^[a-z']+$/.test(w) ? w : "")).filter(Boolean);

/* The dated refusal lists. SPEC wraps; every anchor reads a whitespace-
   flattened copy, or a sentence that runs over a line end reads as missing. */
function readDatedLists(flat) {
  const said = /Words ruled out for child-appropriateness \(2026-08-07\): ([^;]+);/.exec(flat);
  /* the 2026-08-16 bill: thirteen book-artifacts and character names, and gun */
  const bill = /refused fifteen on a decision page: thirteen book-artifacts and character names \(([^)]+)\)[^.]*?, and (gun)/.exec(flat);
  /* the 2026-08-18 bill */
  const later = /Refused by the owner on 2026-08-18[^:]*: (.*?)\. A later screen/.exec(flat);
  return {
    ruled: said ? items(said[1]) : [],
    bill, billed: bill ? items(bill[1].replace(/ - .*$/s, "")).concat([bill[2]]) : [],
    later, laterWords: later ? items(later[1].replace(/\([^)]*\)/g, " ").replace(/,\s*which[\s\S]*$/, "")) : [],
  };
}
/* The declared guard list, the taught exception, and the sentences that say
   WHY each guard is there, which are the SECOND source for every guarded word
   (the engineering seat's after pass, 2026-08-23): the equality reads ONE
   sentence, so delete a word from it AND from NEVER_BUILD in the same change
   and the rule stays green - WEAKER than the typed literals it replaced, on
   the very night the owner ruled one of those words in ("Ho I want out"). So
   every guarded word must also be NAMED in SPEC's reasoning about the guard,
   written in different sentences by different hands on different dates. */
function readGuards(flat) {
  const declared = /Build-guarded \(a tray must never let a child spell these\), as of \d{4}-\d{2}-\d{2}:\*\* ([^.]+)\./.exec(flat);
  /* the prose half: the 2026-08-18 sentence's appropriateness words are
     everything before ", and **neighbor**, which is not an appropriateness
     refusal at all" */
  const slangy = /Refused by the owner on 2026-08-18[^:]*: (.*?), and \*\*neighbor\*\*, which is not an appropriateness refusal/.exec(flat);
  const rationale = /The 2026-08-07 sentence, (.*?) are here because they are appropriateness refusals; \*\*([a-z]+)\*\* is here because/.exec(flat);
  const plurals = /The ruled plural exclusions \W+([a-z, ]+?)\W+were re-verified absent/.exec(flat);
  /* THE PLURAL RULING'S OWN SENTENCE (owner-ruled 2026-08-23, "guard both").
     jug, nut and can are taught and their plurals are not; the sentence that
     says so is a SECOND source for those four. */
  const pluralGuard = /Build-guarded plurals, owner-ruled \d{4}-\d{2}-\d{2}:\*\* ([^.]+?) are$/m.exec(flat) || /Build-guarded plurals, owner-ruled \d{4}-\d{2}-\d{2}:\*\* ([a-z, ]+?) are build-guarded/.exec(flat);
  /* THE ONE WORD THE ENGINE MAY TEACH THOUGH A LIST REFUSED IT, read from
     SPEC's own dated sentence. It excuses the TAUGHT check only: an exception
     must never disarm the build guard, or a later one silently would. */
  const exception = /Taught despite the refusal, owner-ruled \d{4}-\d{2}-\d{2}: ([^.]+)\.\*\*/.exec(flat);
  return {
    declared, guardList: declared ? items(declared[1]) : [],
    slangy, laterAppropriate: slangy ? items(slangy[1].replace(/\([^)]*\)/g, " ")) : [],
    rationale, rationaleWords: rationale ? items(rationale[1]).concat([rationale[2]]) : [],
    plurals, pluralGuard, pluralWords: pluralGuard ? items(pluralGuard[1]) : [],
    taughtException: new Set(exception ? items(exception[1]) : []),
  };
}

function listAnchors(B, G) {
  const found = [];
  if (!B.ruled.length) found.push("SPEC's child-appropriateness sentence could not be read, so this rule is checking nothing");
  if (!B.bill) found.push("SPEC's 2026-08-16 refusal list could not be read, so this rule is checking less than it claims");
  if (!B.later) found.push("SPEC's 2026-08-18 refusal list could not be read, so this rule is checking less than it claims");
  if (!G.declared) found.push("SPEC's declared build-guard list could not be read, so this rule is checking nothing about what a tray may spell");
  return found;
}
function reasoningAnchors(G) {
  const found = [];
  if (!G.slangy) found.push("SPEC's 2026-08-18 appropriateness sentence could not be read, so this rule guards fewer words than it claims");
  if (!G.rationale) found.push("SPEC's paragraph saying why each word is build-guarded could not be read, so every guard rests on one sentence alone");
  if (!G.pluralGuard) found.push("SPEC's build-guarded plurals sentence could not be read, so those guards rest on the declared list alone");
  if (!G.plurals) found.push("SPEC's ruled-plural sentence could not be read, so the plural guards rest on one sentence alone");
  return found;
}
/* The declared list against the engine, both directions. */
function guardAgainstEngine(guardList, neverBuild) {
  const found = [];
  for (const w of guardList) if (!neverBuild.includes(w)) found.push(`SPEC declares "${w}" build-guarded and the engine does not guard it: add it to NEVER_BUILD in reference/word-quest.jsx`);
  for (const w of neverBuild) if (guardList.length && !guardList.includes(w)) found.push(`the engine guards "${w}" and SPEC declares no such ruling: add it to the build-guarded sentence or take it out of NEVER_BUILD`);
  return found;
}
/* Every guarded word named in SPEC's reasoning. This set is deliberately
   WIDER than the prose refusals - it holds "buns" from the plural sentence by
   a different route than the 2026-08-07 list, and it once held "nuts" before
   the owner ruled it into the guard - so it is used for this direction only,
   never to demand a guard nobody ruled. */
function justifiedFindings(B, G, fromProse, neverBuild) {
  if (!G.rationale || !G.plurals) return [];
  const justified = new Set([...G.pluralWords, ...fromProse, ...G.rationaleWords, ...items(G.plurals[1]), ...B.laterWords, ...B.billed]);
  return neverBuild.filter((w) => !justified.has(w))
    .map((w) => `the engine guards "${w}" and SPEC's reasoning about the guard never names it - the declared list is its only source, so dropping it from both files would pass unnoticed`);
}
/* AND THE DEMAND MUST RUN THE OTHER WAY TOO (the release sweep, 2026-08-23).
   A loop over NEVER_BUILD stops looking for a word the moment it LEAVES
   NEVER_BUILD - which is exactly the coordinated deletion the check was
   written to catch. This iterates SPEC's own reasoning instead: a word the
   document says is build-guarded must be in the declared list AND in the
   engine's, so removing it from both files still leaves the sentence that
   names it, and the gate goes red. */
function demandedFindings(G, fromProse, d) {
  const demanded = new Set([...fromProse, ...G.pluralWords, ...G.rationaleWords]);
  const found = [];
  for (const w of demanded) {
    if (!d.spellable(w)) continue;
    if (!G.guardList.includes(w)) found.push(`SPEC's reasoning says "${w}" is build-guarded and the declared list does not carry it: the sentence and the list disagree`);
    if (!d.neverBuild.includes(w)) found.push(`SPEC's reasoning says "${w}" is build-guarded and the engine does not guard it: add it to NEVER_BUILD in reference/word-quest.jsx`);
  }
  for (const w of fromProse) if (d.spellable(w) && !G.guardList.includes(w))
    found.push(`SPEC's prose refuses "${w}" for child-appropriateness and a tray could spell it, but the declared build-guard list does not carry it`);
  return found;
}
function taughtFindings(every, d, taughtException) {
  const taught = new Set(d.levels.flatMap((l) => l.words));
  return every.filter((w) => taught.has(w) && !taughtException.has(w)).map((w) => `SPEC records "${w}" as refused, and the engine teaches it as a bank word`);
}

export function checkRefusals(d) {
  const flat = d.spec.replace(/\s+/g, " ");
  const B = readDatedLists(flat), G = readGuards(flat);
  const found = listAnchors(B, G);
  found.push(...guardAgainstEngine(G.guardList, d.neverBuild));
  const every = [...new Set(B.ruled.concat(G.guardList, B.billed, B.laterWords))];
  if (every.length < 20) found.push(`the refusal lists parse to ${every.length} words, fewer than the twenty SPEC records - an anchor moved, and this rule is checking less than it claims`);
  found.push(...reasoningAnchors(G));
  const fromProse = new Set(B.ruled.concat(B.bill ? [B.bill[2]] : [], G.laterAppropriate));
  found.push(...justifiedFindings(B, G, fromProse, d.neverBuild));
  found.push(...demandedFindings(G, fromProse, d));
  found.push(...taughtFindings(every, d, G.taughtException));
  return found;
}
