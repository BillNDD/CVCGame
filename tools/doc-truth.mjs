/* Doc-truth gate (G16). The documents are the master source, so a document
   that describes behaviour the code does not have is a defect — and one that
   no test could see before this gate existed.

   The fault this gate is built from: QA step 32 promised that a dead
   microphone "switches to grown-up grading for this visit". The code never
   did that. A person ran the step, read a promise, saw something else, and
   had no way to tell which was wrong. Counting steps (G12) cannot catch it;
   only binding the words to the code can.

   Eight rules, every expected value read from the document and checked
   against the source, never the other way round:
   1. Every child-facing sentence quoted in SPEC section 8 exists verbatim in
      the app source.
   2. Every quoted sentence in the manual QA script exists verbatim in the
      app source, so a tester never reads a promise the app cannot keep.
   3. The timings the documents name in words match the constants: SPEC's
      8-second watchdog and 2-second grace, and the QA script's "about 10
      seconds" total.
   4. The hold gesture the documents name matches the hold control's timer.
   5. The recipe SPEC names for the voice pack — the voice, the word speed and
      the bitrate — matches the recipe inside the shipped pack. SPEC claimed
      speed 0.7 for months after the pack moved to 0.85, and nothing noticed:
      a reader cannot hear a manifest, and the pack gate cannot read prose.
   6. The bank count the free-play chooser tells the grown-up ("any word from
      all 300") matches the bank. The bank grew from 260 to 300 in one
      commit; the next growth must not leave a parent-facing sentence lying.
   7. Every gate floor the gate specification quotes is the floor the gauntlet
      enforces. Seven had drifted by 2026-08-10, so the document told a reader
      the suite was weaker than it is.
   9. SPEC's level table lists exactly the words each level holds, in order.
      The table said Level 2 had 51 words for as long as it took a reviewer to
      count them: "of" had shipped that morning and the row was never touched.
      A parent or a teacher reading the master source would have seen a level
      that no longer exists. Rules 6 and 8 count things; this one compares the
      words themselves, which is the only way a wrong ROW is caught.
   8. The "Approved and unshipped" count in the voice-pack document matches the
      pending ledger. That heading said 60 while the ledger held 156 — fourteen
      listening rounds of the owner's own time, undercounted by a document
      nobody had reason to re-read. An approved result that a document
      understates is an approved result this project loses, which is the trap
      `docs/settled.md` was written to close.

   Negative control: --self-test corrupts each document in memory and
   requires every detector to fire.
   Run: node tools/doc-truth.mjs */
import { readFileSync } from "node:fs";
import { sourcesFor } from "./app-sources.mjs";

const { C, LEVELS, NEVER_BUILD, chunkWord } = await import("../src/engine.js");
/* A refused word is reachable from a TRAY only if a build ever deals its
   number of slots: the bank's own words decide that, so a one-tile or a
   nine-tile refusal is not something a child could spell. */
const BUILD_SLOT_COUNTS = new Set(LEVELS.flatMap((l) => l.words).map((w) => chunkWord(w).length));
const spellableLength = (w) => BUILD_SLOT_COUNTS.has(chunkWord(w).length);

const problems = [];
const rule = (okay, name, detail) => {
  if (okay) console.log("ok: " + name);
  else problems.push(name + (detail ? " — " + detail : ""));
};

/* The haystack is every source a sentence could honestly live in: the app,
   its screens and components, and the generated engine that owns the
   feedback text. */
/* DERIVED (owner-ruled 2026-08-17): every app source except the ones
   tools/app-sources.mjs excludes with a reason, plus the generated engine.
   The hand-written list had lost three screens. */
const SOURCES = [...sourcesFor("docs"), "src/engine.js"];
/* The tools an agent is TOLD to run, and the sentences that tell them. A tool
   nobody is pointed at is a tool nobody runs: blast-radius was built on
   2026-08-13 to make E11's second step a command, and the owner asked the same
   day what stops it being quietly orphaned by a later edit or forgotten across
   a context compaction. This is that stop. Add a tool here when a governing
   document starts telling agents to run it. */
/* CLAUDE.md was dropped from every map below on 2026-08-31, when the owner made
   AGENTS.md the controller and cut CLAUDE.md down to the child-facing safety
   rules S1-S9. E11 - the rule that asks for these tools - moved with everything
   else, so requiring CLAUDE.md to name them would demand that a file which owns
   only the safety rules name an engineering tool. The orphan rule itself is
   unchanged and still bites: AGENTS.md is now the document an agent must be
   able to find these tools in, and tools/claude-md-shape.mjs is what keeps
   CLAUDE.md from quietly growing the rules back. */
const AGENT_TOOLS = [
  {
    file: "tools/blast-radius.mjs",
    why: "the E11 lookup: what does this change break",
    docs: { "AGENTS.md": "agents", "README.md": "readme" },
    script: "check",
    command: "tools/blast-radius.mjs --self-test",
  },
  {
    file: "tools/blast-radius-mutants.mjs",
    why: "the faults planted against the E11 lookup's own controls",
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "gauntlet",
    wiredIn: "gauntletJs",
    command: "tools/blast-radius-mutants.mjs",
  },
  {
    file: "tools/conversion-rehearsal.mjs",
    why: "G27: what the 100-level ladder would break in the real engine",
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "check",
    command: "tools/conversion-rehearsal.mjs --self-test",
  },
  {
    file: "tools/mutants.mjs",
    why: "the mutation gate, and its --anchors dry run that E11 asks for first",
    docs: { "AGENTS.md": "agents" },
    script: null,
    command: null,
  },
];

const real = {
  spec: readFileSync("SPEC.md", "utf8"),
  claude: readFileSync("CLAUDE.md", "utf8"),
  agents: readFileSync("AGENTS.md", "utf8"),
  readme: readFileSync("README.md", "utf8"),
  pkg: readFileSync("package.json", "utf8"),
  qa: readFileSync("docs/qa-procedure.md", "utf8"),
  pack: readFileSync("app/public/voice/manifest.json", "utf8"),
  app: readFileSync("app/src/App.jsx", "utf8"),
  engine: readFileSync("src/engine.js", "utf8"),
  hold: readFileSync("app/src/components/HoldButton.jsx", "utf8"),
  home: readFileSync("app/src/screens/HomeScreen.jsx", "utf8"),
  bankSize: LEVELS.flatMap((l) => l.words).length,
  corpus: SOURCES.map((f) => readFileSync(f, "utf8")).join("\n"),
  gauntletDoc: readFileSync("docs/testing-gauntlet.md", "utf8"),
  gauntletJs: readFileSync("tools/gauntlet.mjs", "utf8"),
  baseline: readFileSync(".claude/gate-baseline.json", "utf8"),
  voiceDoc: readFileSync("docs/voice-pack.md", "utf8"),
  bible: readFileSync("docs/art-bible.md", "utf8"),
  css: readFileSync("app/src/wq-css.js", "utf8"),
  reference: readFileSync("reference/word-quest.jsx", "utf8"),
  ledger: readFileSync("tools/pending-words/pending-words.json", "utf8"),
  faults: readFileSync("docs/open-faults.md", "utf8"),
  tokens: C,
};

/* How many approved items are still waiting for a level. Every key in the
   ledger except its own comment, minus anything the shipped pack already
   carries — an item that has shipped is no longer unshipped, and the ledger
   keeps its row as provenance. A word key is bare ("jump"), a sentence key
   carries the "s:" prefix, and the pack names words "w:jump".
   An entry with `superseded_by` is neither shipped nor waiting: its text
   ships under another id whose clip the owner also approved, so the row is
   provenance for a render that will never ship (two rounds offered the same
   sentence twice on 2026-08-15, and the accepted clip is the authority — the
   word-a rule). Counting one as waiting would keep the heading wrong forever. */
function unshipped(ledgerText, packText) {
  const pack = JSON.parse(packText);
  return Object.keys(JSON.parse(ledgerText))
    .filter((k) => k !== "_comment")
    .filter((k) => !JSON.parse(ledgerText)[k].superseded_by)
    .filter((k) => !(k.startsWith("s:") ? k in pack : "w:" + k in pack)).length;
}

/* The sentences SPEC section 8 pins in its recorded-voice block, as a fenced
   table of `name "sentence"` lines. Reading them out of the document means a
   sentence added there is checked from the moment it is written.

   THE ANCHORS ARE THE FAULT TO WATCH. This used to slice between
   "2. Microphone:" and "3. Storage:". When the microphone was removed on
   2026-08-12 the first anchor would have vanished, indexOf would have returned
   -1, slice(-1, n) would have yielded nonsense, and this function would have
   returned an empty list — so the rule below would have checked ZERO sentences
   and still reported itself as one of the passing rules. A gate that keeps
   counting itself while measuring nothing is worse than no gate. The caller
   now refuses an empty list outright, and that refusal has its own control. */
function specSentences(spec) {
  const a = spec.indexOf("2. Recorded voice:"), b = spec.indexOf("3. Storage:");
  if (a < 0 || b < 0 || b <= a) return [];
  return [...spec.slice(a, b).matchAll(/^\s{3}\w[\w ]*\s+"([^"]+)"$/gm)].map((m) => m[1]);
}

/* Every double-quoted run on ONE line of the QA script that is long enough to
   be a sentence the app must say. Three exclusions, all named: a quotation
   carrying an ellipsis is a shape, not a literal; the platform's own controls
   belong to iOS and Windows, not to this app; and short labels are control
   names, not copy. */
const PLATFORM_CONTROLS = ["Add to Home Screen", "Don't Allow", "Allow", "Add"];
function qaSentences(qa) {
  /* Take every quoted run in order, so quotes pair 1-2 and 3-4 as written. A
     length filter applied inside the pattern would instead pair the CLOSING
     quote of one string with the OPENING quote of the next, and check the
     prose between them. */
  return [...qa.matchAll(/"([^"\n]*)"/g)]
    .map((m) => m[1])
    .filter((s) => s.length >= 25)
    .filter((s) => !s.includes("...") && !s.includes("\u2026"))
    .filter((s) => !PLATFORM_CONTROLS.includes(s));
}

const num = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = (\\d+)`));
  return m ? Number(m[1]) : NaN;
};

function run(d) {
  const found = [];
  let rules = 0;

  rules += 1;
  /* A rule that checks nothing must SAY so, not pass. See specSentences. */
  const pinned = specSentences(d.spec);
  if (pinned.length === 0) found.push("SPEC section 8 pins no sentences — the block or its anchors moved, and this rule is checking nothing");
  for (const s of pinned) {
    if (!d.corpus.includes(s)) found.push(`SPEC sentence missing from the app: "${s}"`);
  }

  rules += 1;
  for (const s of qaSentences(d.qa)) {
    if (!d.corpus.includes(s)) found.push(`QA sentence missing from the app: "${s}"`);
  }

  /* Rule 3 lived here: the 8-second watchdog and the 2-second grace window,
     read out of App.jsx and held against SPEC's prose and QA step 32's "within
     about 10 seconds". All four artefacts — the two constants, the SPEC
     sentences and the QA step — went with the microphone on 2026-08-12. The
     rule count drops 8 -> 7 because its subject is gone, not because a rule
     was dropped to make a build pass. */
  rules += 1;
  const holdCode = num(d.hold, "HOLD_MS");
  const specHold = /hold an adult result control for\s*\n?\s*(\d+) ms/.exec(d.spec);
  if (!specHold || Number(specHold[1]) !== holdCode)
    found.push(`SPEC hold says ${specHold ? specHold[1] : "nothing"} ms, the control waits ${holdCode} ms`);

  rules += 1;
  const recipe = JSON.parse(d.pack).__recipe || {};
  const specVoice = /voice `([a-z_]+)`/.exec(d.spec);
  const specSpeed = /word clips at speed ([\d.]+)/.exec(d.spec);
  const specBitrate = /encoded\s*\n?\s*at (\d+) kbps/.exec(d.spec);
  if (!specVoice || specVoice[1] !== recipe.voice)
    found.push(`SPEC names voice ${specVoice ? specVoice[1] : "nothing"}, the pack was rendered with ${recipe.voice}`);
  if (!specSpeed || Number(specSpeed[1]) !== recipe.word_speed)
    found.push(`SPEC says word speed ${specSpeed ? specSpeed[1] : "nothing"}, the pack says ${recipe.word_speed}`);
  if (!specBitrate || Number(specBitrate[1]) !== recipe.bitrate)
    found.push(`SPEC says ${specBitrate ? specBitrate[1] : "no"} kbps, the pack says ${recipe.bitrate}`);

  rules += 1;
  /* Re-sourced at the 2026-08-20 cutover: the chooser DERIVES its count from
     bankWords().length (the owner's ruling), so the derived form passes and a
     TYPED number - even one that happens to equal the bank today - is the
     stale-tomorrow fault this rule was born from. */
  const homeDerived = d.home.includes("any word from all {bankWords().length}");
  const homeCount = /any word from all (\d+)/.exec(d.home);
  if (!homeDerived && (!homeCount || Number(homeCount[1]) !== d.bankSize))
    found.push(`the chooser copy says all ${homeCount ? homeCount[1] : "?"} words, the bank holds ${d.bankSize}`);

  /* Every floor the gate specification quotes must be the floor the gauntlet
     actually enforces. Seven of them had drifted by 2026-08-10 - the numbers
     were written once and never moved when the floors rose - so the document
     told a reader the suite was smaller and weaker than it is. A review found
     it; this rule means no one has to find it again. */
  rules += 1;
  const baseline = JSON.parse(d.baseline);
  /* A RETIRED floor may still be quoted, and should be: the document explains
     why a gate went, and the number it went with is part of the explanation.
     It is checked against the retirement record, so the record cannot drift
     from the prose either. What is refused is a key that is neither live nor
     retired — a floor quoted from nowhere. */
  const retired = baseline._retired || {};
  /* TWO BLIND SPOTS, both found by the release sweep on 2026-08-23 and one of
     them hiding a LIVE drift. The first: the closing backtick had to sit
     BETWEEN the key and the number, so a line writing the whole thing inside
     one pair - `g25_proofs (25)` - was invisible, and that line said 25 while
     the baseline enforced 28. The second: the key had to begin g<digits> or
     census, so seven keys quoted in this document were never checked at all.
     Both forms are read now, and every key the baseline holds is in scope. */
  for (const m of d.gauntletDoc.matchAll(/`([a-z][a-z0-9_]*)`\s*\((\d+)\)|`([a-z][a-z0-9_]*)\s*\((\d+)\)`/g)) {
    const key = m[1] || m[3];
    const stated = m[2] || m[4];
    if (!(key in baseline) && !(key in (baseline._retired || {}))) continue;   /* a number beside a word that is not a floor is not this rule's business */
    if (key in retired) {
      if (Number(stated) !== retired[key].was)
        found.push(`the gate specification says ${key} retired at ${stated}, the baseline records ${retired[key].was}`);
      continue;
    }
    if (!(key in baseline)) found.push(`the gate specification quotes ${key}, which is neither a live floor nor a retired one`);
    else if (Number(stated) !== baseline[key])
      found.push(`the gate specification says ${key} is ${stated}, the baseline enforces ${baseline[key]}`);
  }

  /* Every word SPEC rules out must be a word the engine refuses to let a
     child BUILD, and must not be a word the engine TEACHES. The two lists
     lived apart for a day and a tray handed gob back - the word SPEC says was
     removed "so it cannot return by accident". A subset check, not equality:
     the engine may be stricter (it also refuses the ruled-out plurals),
     never looser.

     IT READS EVERY DATED REFUSAL, NOT ONE SENTENCE (the beta 27 readiness
     audit, 2026-08-23). The first version read only the 2026-08-07 sentence,
     so every refusal the owner has made since - the thirteen book-artifacts
     and character names of 2026-08-16, gun with them, the four of 2026-08-18
     - was guarded by nothing, and a child could build two of them while this
     rule ran green. SPEC draws the line this rule reads: a refusal for
     APPROPRIATENESS (the 2026-08-07 list, gun, and 2026-08-18's fight,
     hustle and grind) must also be in NEVER_BUILD, because a tray must
     never let a child spell it; a refusal that merely turns a CANDIDATE
     down (a book artifact like blap, a character name, neighbor) must not
     be taught, and needs no build guard - a child spelling "blap" is not a
     safety matter, and guarding it would take buildable words off the
     board for nothing. Two of the 2026-08-16 artifacts are on both sides,
     by SPEC's own words: ho carries adult slang and sam "is also a given
     name the S9 gate refuses".
     A contradiction the owner has not yet settled is named in
     docs/open-faults.md and skipped here BY NAME while that entry is open -
     never silently. */
  rules += 1;
  {
    /* AND AN ITEM CAN HOLD TWO WORDS. "**hustle** and **grind**" is a single
       comma-item, so splitting on commas alone produced "hustle and grind",
       which fails the word test and was DISCARDED - the rule's own comment
       said it read 2026-08-18's fight, hustle and grind, and it read fight.
       Found by the engineering seat's after pass, 2026-08-23. */
    const items = (text) => text.split(",").flatMap((part) => part.split(/\s+and\s+/))
      .map((w) => w.replace(/^\s*and\s+/, "").replace(/\*\*/g, "").trim().toLowerCase())
      .map((w) => (/^[a-z']+$/.test(w) ? w : "")).filter(Boolean);
    /* "hunt, fist, limp, bone, buns, dump, and milt" - the Oxford comma
       leaves "and milt" on the last item, so the word is stripped per ITEM
       rather than from the sentence. The first version reported that the
       engine would let a child build "and milt". */
    /* SPEC wraps; every anchor below reads a whitespace-flattened copy, or a
       sentence that runs over a line end reads as missing. */
    const flat = d.spec.replace(/\s+/g, " ");
    const said = /Words ruled out for child-appropriateness \(2026-08-07\): ([^;]+);/.exec(flat);
    const ruled = said ? items(said[1]) : [];
    if (!ruled.length) found.push("SPEC's child-appropriateness sentence could not be read, so this rule is checking nothing");
    /* the 2026-08-16 bill: thirteen book-artifacts and character names, and gun */
    const bill = /refused fifteen on a decision page: thirteen book-artifacts and character names \(([^)]+)\)[^.]*?, and (gun)/.exec(flat);
    if (!bill) found.push("SPEC's 2026-08-16 refusal list could not be read, so this rule is checking less than it claims");
    const billed = bill ? items(bill[1].replace(/ - .*$/s, "")).concat([bill[2]]) : [];
    /* the 2026-08-18 bill */
    const later = /Refused by the owner on 2026-08-18[^:]*: (.*?)\. A later screen/.exec(flat);
    const laterWords = later ? items(later[1].replace(/\([^)]*\)/g, " ").replace(/,\s*which[\s\S]*$/, "")) : [];
    if (!later) found.push("SPEC's 2026-08-18 refusal list could not be read, so this rule is checking less than it claims");
    const taught = new Set(LEVELS.flatMap((l) => l.words));
    /* TWO DERIVATIONS THAT MUST AGREE, and NO WORD TYPED IN THIS FILE (the
       engineering seat's before pass, 2026-08-23). The first is SPEC's
       DECLARED build-guard list, which `NEVER_BUILD` must equal in BOTH
       directions - a word declared and unguarded is a hole, a word guarded
       and undeclared is a guard nobody ruled. The second is the prose the
       refusals are written in, kept as an independent subset check: two
       derivations that must agree is strictly stronger than one, and
       dropping the prose half would be weakening a gate (E3).
       Until tonight this rule typed "gob", "ho" and "ding" into itself -
       the same defect it exists to catch, one layer up: a fact about which
       words the owner refused, held in a tool instead of read from the
       document that owns it. */
    const declared = /Build-guarded \(a tray must never let a child spell these\), as of \d{4}-\d{2}-\d{2}:\*\* ([^.]+)\./.exec(flat);
    if (!declared) found.push("SPEC's declared build-guard list could not be read, so this rule is checking nothing about what a tray may spell");
    const guardList = declared ? items(declared[1]) : [];
    for (const w of guardList) if (!NEVER_BUILD.includes(w)) found.push(`SPEC declares "${w}" build-guarded and the engine does not guard it: add it to NEVER_BUILD in reference/word-quest.jsx`);
    for (const w of NEVER_BUILD) if (guardList.length && !guardList.includes(w)) found.push(`the engine guards "${w}" and SPEC declares no such ruling: add it to the build-guarded sentence or take it out of NEVER_BUILD`);
    /* "gob" was TYPED here until 2026-08-23, three lines under a comment
       saying no word is typed in this file. It is in the declared list the
       rule has just parsed, so it is read from there like every other. */
    const every = [...new Set(ruled.concat(guardList, billed, laterWords))];
    if (every.length < 20) found.push(`the refusal lists parse to ${every.length} words, fewer than the twenty SPEC records - an anchor moved, and this rule is checking less than it claims`);
    /* the prose half: the 2026-08-18 sentence's appropriateness words are
       everything before ", and **neighbor**, which is not an appropriateness
       refusal at all" */
    const slangy = /Refused by the owner on 2026-08-18[^:]*: (.*?), and \*\*neighbor\*\*, which is not an appropriateness refusal/.exec(flat);
    if (!slangy) found.push("SPEC's 2026-08-18 appropriateness sentence could not be read, so this rule guards fewer words than it claims");
    const laterAppropriate = slangy ? items(slangy[1].replace(/\([^)]*\)/g, " ")) : [];
    const fromProse = new Set(ruled.concat(bill ? [bill[2]] : [], laterAppropriate));
    /* THE SECOND SOURCE FOR EVERY GUARDED WORD (the engineering seat's after
       pass, 2026-08-23). The equality above reads ONE sentence: delete a word
       from it AND from NEVER_BUILD in the same change and this rule stays
       green - which is WEAKER than the typed literals it replaced, on the very
       night the owner ruled one of those words in ("Ho I want out"). So every
       guarded word must also be NAMED in SPEC's reasoning about the guard,
       which is written in different sentences by different hands on different
       dates: the 2026-08-07 refusal list, the 2026-08-16 bill, the 2026-08-18
       appropriateness sentence, the paragraph that says WHY each guard is
       there, and the plural-exclusion sentence. This set is deliberately WIDER
       than fromProse - it holds "buns" from the plural sentence by a different
       route than the 2026-08-07 list, and it once held "nuts" before the owner
       ruled it into the guard - so it is used for this direction only, never to demand a
       guard nobody ruled. */
    const rationale = /The 2026-08-07 sentence, (.*?) are here because they are appropriateness refusals; \*\*([a-z]+)\*\* is here because/.exec(flat);
    if (!rationale) found.push("SPEC's paragraph saying why each word is build-guarded could not be read, so every guard rests on one sentence alone");
    const plurals = /The ruled plural exclusions \W+([a-z, ]+?)\W+were re-verified absent/.exec(flat);
    /* THE PLURAL RULING'S OWN SENTENCE (owner-ruled 2026-08-23, "guard both").
       jug, nut and can are taught and their plurals are not; the sentence that
       says so is a SECOND source for those four, so dropping one from the
       declared list and from NEVER_BUILD together still leaves it named here
       and the gate goes red. */
    const pluralGuard = /Build-guarded plurals, owner-ruled \d{4}-\d{2}-\d{2}:\*\* ([^.]+?) are$/m.exec(flat) || /Build-guarded plurals, owner-ruled \d{4}-\d{2}-\d{2}:\*\* ([a-z, ]+?) are build-guarded/.exec(flat);
    if (!pluralGuard) found.push("SPEC's build-guarded plurals sentence could not be read, so those guards rest on the declared list alone");
    if (!plurals) found.push("SPEC's ruled-plural sentence could not be read, so the plural guards rest on one sentence alone");
    const pluralWords = pluralGuard ? items(pluralGuard[1]) : [];
    const justified = new Set([...pluralWords, ...fromProse,
      ...(rationale ? items(rationale[1]).concat([rationale[2]]) : []),
      ...(plurals ? items(plurals[1]) : []),
      ...laterWords, ...billed]);
    if (rationale && plurals) for (const w of NEVER_BUILD) if (!justified.has(w))
      found.push(`the engine guards "${w}" and SPEC's reasoning about the guard never names it - the declared list is its only source, so dropping it from both files would pass unnoticed`);
    /* AND THE DEMAND MUST RUN THE OTHER WAY TOO (the release sweep,
       2026-08-23). The loop above iterates NEVER_BUILD, so the moment a word
       LEAVES NEVER_BUILD the loop stops looking for it - which is exactly the
       coordinated deletion the check was written to catch, and my first
       version of it did not catch at all. This loop iterates SPEC's own
       reasoning instead: a word the document says is build-guarded must be in
       the declared list AND in the engine's, so removing it from both files
       still leaves the sentence that names it, and the gate goes red. */
    const demanded = new Set([...fromProse, ...pluralWords, ...(rationale ? items(rationale[1]).concat([rationale[2]]) : [])]);
    for (const w of demanded) {
      if (!spellableLength(w)) continue;
      if (!guardList.includes(w)) found.push(`SPEC's reasoning says "${w}" is build-guarded and the declared list does not carry it: the sentence and the list disagree`);
      if (!NEVER_BUILD.includes(w)) found.push(`SPEC's reasoning says "${w}" is build-guarded and the engine does not guard it: add it to NEVER_BUILD in reference/word-quest.jsx`);
    }
    for (const w of fromProse) if (spellableLength(w) && !guardList.includes(w))
      found.push(`SPEC's prose refuses "${w}" for child-appropriateness and a tray could spell it, but the declared build-guard list does not carry it`);
    /* THE ONE WORD THE ENGINE MAY TEACH THOUGH A LIST REFUSED IT, read from
       SPEC's own dated sentence. It excuses the TAUGHT check only: an
       exception must never disarm the build guard, or a later one silently
       would. */
    const exception = /Taught despite the refusal, owner-ruled \d{4}-\d{2}-\d{2}: ([^.]+)\.\*\*/.exec(flat);
    const taughtException = new Set(exception ? items(exception[1]) : []);
    for (const w of every) {
      if (taught.has(w) && !taughtException.has(w)) found.push(`SPEC records "${w}" as refused, and the engine teaches it as a bank word`);
    }
  }

  /* The approved backlog the voice-pack document reports must be the backlog
     the ledger holds. Owner time is the scarcest thing this project spends,
     and a heading that undercounts it hides the debt rather than paying it. */
  rules += 1;
  const stated = /## Approved and unshipped: (\d+) items/.exec(d.voiceDoc);
  const waiting = unshipped(d.ledger, d.pack);
  if (!stated || Number(stated[1]) !== waiting)
    found.push(`the voice-pack document says ${stated ? stated[1] : "no"} items are approved and unshipped, the ledger holds ${waiting}`);

  /* SPEC's level table, word for word against the engine. The table is the
     only place a reader can see what a level actually contains, so a row that
     drifts is a document telling a grown-up about a level the game does not
     have. Order matters: a level's word order IS its introduction order. */
  rules += 1;
  for (const l of LEVELS) {
    const row = new RegExp(`^\\| ${l.n} \\|[^|]*\\|[^|]*\\| ([^|]*)\\|`, "m").exec(d.spec);
    if (!row) { found.push(`SPEC's level table has no row for Level ${l.n}`); continue; }
    const listed = row[1].trim().split(/\s+/).join(" ");
    const actual = l.words.join(" ");
    if (listed !== actual) {
      const missing = l.words.filter((w) => !row[1].split(/\s+/).includes(w));
      found.push(`SPEC's Level ${l.n} row lists ${listed.split(" ").length} words, the level holds ${l.words.length}`
        + (missing.length ? ` (missing: ${missing.join(", ")})` : " (same words, different order)"));
    }
  }

  /* THE ORPHAN RULE (owner-ruled 2026-08-13). A tool an agent is told to run
     is only as real as the sentence that tells them. Nothing in this
     repository used to notice if that sentence was edited away, and an agent
     resuming after a context compaction knows only what the governing
     documents say — so a tool dropped from AGENTS.md is a tool that has
     stopped existing, however green its own controls are.

     Both halves are checked, because a tool can be orphaned in two
     directions: the documents stop naming it, or the command stops running
     it and it rots unnoticed. */
  rules += 1;
  for (const t of AGENT_TOOLS) {
    for (const [doc, text] of Object.entries(t.docs)) {
      if (!d[text].includes(t.file))
        found.push(`${doc} no longer names ${t.file} (${t.why}) — an agent reading only the governing documents would never run it`);
    }
    if (t.command && !d[t.wiredIn || "pkg"].includes(t.command))
      found.push(`npm run ${t.script} no longer runs ${t.file} (${t.why}) — it can now rot without anything going red`);
  }

  rules += 1;
  /* Rule 11 (art project step 0b, 2026-08-22): the palette's one prose
     statement is the token table in docs/art-bible.md section 9.3, bound to
     C in the engine by name and value, BOTH directions, case-insensitive. A
     table that parses to fewer than 29 rows is a moved anchor, and a rule
     reading nothing must say so (the G25 lesson) rather than pass. */
  const table = tokenTable(d.bible);
  if (table.length < 29) found.push(`the art bible's section 9.3 token table parses to ${table.length} rows - the anchor moved, and this rule is checking nothing`);
  for (const [k, v] of table) {
    if (!(k in d.tokens)) found.push(`the art bible's token table names "${k}", which C does not have`);
    else if (String(d.tokens[k]).toLowerCase() !== v.toLowerCase()) found.push(`the art bible says ${k} is ${v}; C says ${d.tokens[k]}`);
  }
  for (const k of Object.keys(d.tokens)) if (!table.some(([t]) => t === k)) found.push(`C has "${k}", which the art bible's token table does not name`);

  rules += 1;
  /* Rule 12 (art step 1, 2026-08-22): bible 11's state table is the
     repository's - each row's selector must exist in the app's stylesheet
     AND in the reference's copy, and the block must name every token the
     row lists as ${C.token}. Prose cells ("3 px") are not bound. Fewer than
     8 rows is a moved anchor. Two selectors live only in the app and are
     exempt from the reference check by name: .wq-sword-open (the reference
     has no sentence stage) and @keyframes wqpop (no sound-out animation);
     the bible's sentence under the table names the same two. */
  /* Since art step 2 the bible carries TWO such tables - section 7's
     (the Glowseed, three looks and its core) and section 11's (the tiles) -
     and this rule reads every one; the Glowseed's selectors are app-only
     too, since the reference build has no Glowseed. */
  /* PER TABLE, not in total: the first anchor was `< 12`, which is exactly
     section 11's own row count, so section 7's four Glowseed rows could be
     deleted whole and the rule stayed green - a guard that could not detect
     the removal of its own subject (the after pass, 2026-08-23). */
  const tables = stateTables(d.bible);
  const states = tables.flat();
  if (tables.length < 2) found.push(`the art bible has ${tables.length} state table(s), not the two this rule reads (section 7's Glowseed and section 11's tiles) - an anchor moved`);
  else {
    if (tables[0].length < 4) found.push(`the art bible's section 7 state table parses to ${tables[0].length} rows, fewer than the 4 the Glowseed has - an anchor moved, and this rule is checking less than it claims`);
    if (tables[1].length < 12) found.push(`the art bible's section 11 state table parses to ${tables[1].length} rows, fewer than the 12 the tiles have - an anchor moved, and this rule is checking less than it claims`);
  }
  const APP_ONLY = new Set([".wq-sword-open", "@keyframes wqpop", ".wq-glowseed", ".wq-glowseed-lit", ".wq-glowseed-lit::after", ".wq-glowseed-muted"]);   // the reference build has no sentence stage, no sound-out animation and no Glowseed
  for (const [state, selector, tokens] of states) {
    for (const [name, src] of [["app/src/wq-css.js", d.css], ["the reference", d.reference]]) {
      if (name === "the reference" && APP_ONLY.has(selector)) continue;
      const block = cssBlock(src, selector);
      if (block === null) { found.push(`the art bible's tile table names "${selector}" (${state}), which ${name} does not have`); continue; }
      for (const t of tokens) if (!block.includes("${C." + t + "}") && !block.includes("${alpha(C." + t + ",")) found.push(`the art bible says ${state} (${selector}) paints ${t}; ${name}'s block does not name it`);
    }
  }

  return { found, rules };
}

/* Every state table, in document order, each as its own array of rows:
   `| state | \`selector\` | a, b, c |`, read from its header to the next
   section heading. Section 7's (the Glowseed) comes first, section 11's
   (the tiles) second. */
function stateTables(bible) {
  const tables = [];
  let from = 0;
  for (;;) {
    const start = bible.indexOf("| state | selector | tokens |", from);
    if (start < 0) break;
    const end = bible.indexOf("\n## ", start);
    const body = bible.slice(start, end < 0 ? undefined : end);
    const rows = [];
    for (const m of body.matchAll(/^\| ([^|`]+?) \| `([^`]+)` \| ([^|]+) \|/gm)) rows.push([m[1].trim(), m[2].trim(), m[3].split(",").map((t) => t.trim()).filter((t) => t && t !== "none")]);
    tables.push(rows);
    from = end < 0 ? bible.length : end;
  }
  return tables;
}
/* The text of `selector{...}` - the first block whose rule starts with the
   selector followed by `{`, or the keyframes block for an @keyframes name;
   null when absent. */
function cssBlock(src, selector) {
  const i = src.indexOf(selector + "{");
  if (i < 0) return null;
  /* brace-aware, because the sheet is a template: `${C.ink}` carries a
     brace of its own, so "the first }" ends a block mid-declaration */
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}

/* The rows of the section 9.3 table: `| key | #hex | note |`, from the
   heading to the next one. */
function tokenTable(bible) {
  const start = bible.indexOf("### 9.3 ");
  if (start < 0) return [];
  const end = bible.indexOf("\n## ", start);
  const body = bible.slice(start, end < 0 ? undefined : end);
  return [...body.matchAll(/^\| ([A-Za-z][A-Za-z0-9]*) \| (#[0-9a-fA-F]{6}) \|/gm)].map((m) => [m[1], m[2]]);
}

if (process.argv.includes("--self-test")) {
  const seen = { spec: false, blind: false, qa: false, hold: false, recipe: false, bank: false, floor: false, unshipped: false, superseded: false, table: false, tableOrder: false, orphanDoc: false, orphanCmd: false, stateTableGone: false, laterRefusal: false, candidateNotGuarded: false, taughtRefusal: false,
    taughtNoException: false, floorWrapped: false, wordBehindAnd: false, guardOneSourceOnly: false, guardDeclaredOnly: false, guardEngineMissing: false, guardBlind: false, exceptionNotAGuardHole: false, tokenDrift: false, tokenStranger: false, tokenMissing: false, tokenBlind: false, stateToken: false, stateSelector: false, stateBlind: false, stateReference: false };

  /* Both ways a tool gets orphaned. The first is the one that actually
     happens: somebody tidies a governing document, the sentence naming the
     tool goes with the tidying, and every agent after that reads a repository
     where the tool does not exist. */
  /* Planted in AGENTS.md since 2026-08-31: it is the controller, and the
     document an agent must be able to find these tools in. The control used to
     plant in CLAUDE.md, which now owns only the safety rules and names no
     engineering tool - so planting there would prove nothing. */
  const docOrphan = { ...real, agents: real.agents.split("tools/blast-radius.mjs").join("tools/nothing.mjs") };
  seen.orphanDoc = run(docOrphan).found.some((p) => p.startsWith("AGENTS.md no longer names tools/blast-radius.mjs"));

  /* The second is quieter: the tool is still named, still recommended, and
     nothing runs its controls any more, so it can go wrong and stay green. */
  const cmdOrphan = { ...real, pkg: real.pkg.split("tools/blast-radius.mjs --self-test").join("true") };
  seen.orphanCmd = run(cmdOrphan).found.some((p) => p.includes("no longer runs tools/blast-radius.mjs"));

  const specCorrupt = { ...real, spec: real.spec.replace(/^(\s{3}heading\s+)"[^"]+"$/m, '$1"A sentence the app never says."') };
  seen.spec = run(specCorrupt).found.some((p) => p.startsWith("SPEC sentence missing"));

  /* The vacuous-rule control, and the reason rule 1 refuses an empty list at
     all. Move the block's own anchor and the rule must SAY it is checking
     nothing — the failure mode that would otherwise read as a pass. */
  const blindCorrupt = { ...real, spec: real.spec.replace("2. Recorded voice:", "2. Something else entirely:") };
  seen.blind = run(blindCorrupt).found.some((p) => p.startsWith("SPEC section 8 pins no sentences"));

  /* Re-pointed 2026-08-12: this used to corrupt "Didn\u2019t catch that \u2014 tap to try
     again.", a microphone message. The QA script's longest quoted promises are
     now the child's own prompt and the two update answers; the prompt is the
     one a child meets, so it is the one the control breaks. */
  const qaCorrupt = { ...real, qa: real.qa.replace(/"Say the word out loud! \u{1F4E3}"/u, '"Read the word to your grown-up now."') };
  seen.qa = run(qaCorrupt).found.some((p) => p.startsWith("QA sentence missing"));

  const holdCorrupt = { ...real, hold: real.hold.replace(/const HOLD_MS = \d+/, "const HOLD_MS = 120") };
  seen.hold = run(holdCorrupt).found.some((p) => p.startsWith("SPEC hold says"));

  /* Exactly the fault this rule was written from: the document keeps a number
     the pack no longer uses. */
  const recipeCorrupt = { ...real, spec: real.spec.replace(/word clips at speed [\d.]+/, "word clips at speed 0.7") };
  seen.recipe = run(recipeCorrupt).found.some((p) => p.startsWith("SPEC says word speed 0.7"));

  /* The stale-count fault: the chooser keeps telling parents a bank size the
     bank has outgrown. */
  /* Re-planted at the cutover: the live chooser DERIVES its count, so the
     fault to plant is the derived form replaced by a typed stale number -
     exactly the regression the re-sourced rule refuses. */
  const bankCorrupt = { ...real, home: real.home.replace("any word from all {bankWords().length}", "any word from all 250") };
  seen.bank = run(bankCorrupt).found.some((p) => p.startsWith("the chooser copy says all 250"));

  /* A floor quoted in the gate specification that no longer matches the
     baseline: the exact drift found on 2026-08-10. */
  const floorCorrupt = { ...real, gauntletDoc: real.gauntletDoc.replace(/`g20_tests_mapped` \(\d+\)/, "`g20_tests_mapped` (1)") };
  seen.floor = run(floorCorrupt).found.some((p) => p.includes("g20_tests_mapped"));
  /* AND THE SAME DRIFT WRITTEN THE OTHER WAY (the release sweep, 2026-08-23).
     This rule needed the closing backtick BETWEEN the key and the number, so a
     line that wrapped the whole thing - `g25_proofs (25)` - was invisible to
     it, and one such line had been wrong by three for long enough that nobody
     knew. A control for each form now, or the rule can go half-blind again
     without anything saying so. */
  const wrappedCorrupt = { ...real, gauntletDoc: real.gauntletDoc.replace(/`g25_proofs \(\d+\)`/, "`g25_proofs (1)`") };
  seen.floorWrapped = run(wrappedCorrupt).found.some((p) => p.includes("g25_proofs"));

  /* A word the owner rules out must be a word no tray can spell. Both halves
     are planted: a SPEC that names a word the engine does not refuse must be
     reported, and a SPEC whose sentence has moved must report that it is
     checking nothing rather than passing on an empty list. */
  const looseSpec = { ...real, spec: real.spec.replace(
    /Words ruled out for child-appropriateness \(2026-08-07\): [^;]+;/,
    "Words ruled out for child-appropriateness (2026-08-07): hunt, fist, and zzztest;") };
  const blindSpec = { ...real, spec: real.spec.replace(
    /Words ruled out for child-appropriateness \(2026-08-07\):/, "Words once ruled out:") };
  seen.neverBuild = run(looseSpec).found.some((p) => p.includes('refuses "zzztest" for child-appropriateness'))
    && run(blindSpec).found.some((p) => p.includes("checking nothing"))
    && !run(real).found.some((p) => p.includes("rules out"));

  /* The exact fault this rule was written from: the heading kept the count of
     an earlier batch while the owner went on approving. Both directions are
     checked — a heading that lags the ledger hides work already paid for, and
     one that runs ahead of it claims approvals that never happened. */
  const behindDoc = { ...real, voiceDoc: real.voiceDoc.replace(/## Approved and unshipped: \d+ items/, "## Approved and unshipped: 60 items") };
  const aheadDoc = { ...real, voiceDoc: real.voiceDoc.replace(/## Approved and unshipped: \d+ items/, "## Approved and unshipped: 900 items") };
  seen.unshipped = run(behindDoc).found.some((p) => p.includes("says 60 items are approved and unshipped")) &&
    run(aheadDoc).found.some((p) => p.includes("says 900 items are approved and unshipped"));

  /* The superseded exemption, both directions: a planted waiting entry moves
     the count (the heading check fires), and the SAME entry marked
     superseded_by does not — otherwise a row that can never ship would keep
     the heading wrong forever, or the exemption would quietly eat real debt. */
  const baseLedger = JSON.parse(real.ledger);
  const planted = { ...baseLedger, "zz-planted-word": { verdict: "perfect" } };
  const marked = { ...baseLedger, "zz-planted-word": { verdict: "perfect", superseded_by: "w:cat" } };
  const countsIt = unshipped(JSON.stringify(planted), real.pack) === unshipped(real.ledger, real.pack) + 1;
  const exemptsIt = unshipped(JSON.stringify(marked), real.pack) === unshipped(real.ledger, real.pack);
  seen.superseded = countsIt && exemptsIt;

  /* Exactly the fault this rule was written from: a level grows and its row in
     the table does not. Dropping the last word of the Level 2 row is the same
     shape as "of" never being added to it. */
  const lvl2 = LEVELS[1].words;
  const tableCorrupt = { ...real, spec: real.spec.replace(` ${lvl2.join(" ")} |`, ` ${lvl2.slice(0, -1).join(" ")} |`) };
  seen.table = run(tableCorrupt).found.some((p) => p.includes("SPEC's Level 2 row lists") && p.includes(lvl2[lvl2.length - 1]));

  /* And the quieter half of the same fault: the right words in the wrong
     order. A level's word order is its introduction order, so a row that
     reshuffles it tells a reader the child meets the words in an order the
     game never uses - and a length check alone would call that clean. */
  const swapped = [lvl2[1], lvl2[0], ...lvl2.slice(2)];
  const orderCorrupt = { ...real, spec: real.spec.replace(` ${lvl2.join(" ")} |`, ` ${swapped.join(" ")} |`) };
  seen.tableOrder = run(orderCorrupt).found.some((p) => p.includes("same words, different order"));

  /* Rule 11's three plants: a drifted value, a key the table names that C
     lacks, and a table whose anchor moved (zero rows). */
  const driftedHex = { ...real, bible: real.bible.replace("| ink | #17356b |", "| ink | #17356c |") };
  seen.tokenDrift = run(driftedHex).found.some((p) => p.includes("the art bible says ink is #17356c"));
  const strangeKey = { ...real, bible: real.bible.replace("| ink | #17356b |", "| ink | #17356b |\n| zzqToken | #000000 |") };
  seen.tokenStranger = run(strangeKey).found.some((p) => p.includes('names "zzqToken", which C does not have'));
  const missingKey = { ...real, bible: real.bible.replace("| slot | #e6dccb |", "") };
  seen.tokenMissing = run(missingKey).found.some((p) => p.includes('C has "slot", which the art bible'));
  const noTable = { ...real, bible: real.bible.replace("### 9.3 ", "### 9.9 ") };
  seen.tokenBlind = run(noTable).found.some((p) => p.includes("parses to 0 rows"));

  /* Rule 12's four plants: a token the block lacks, a selector the sheet
     lacks, a moved anchor, and the reference's copy drifting from the app's. */
  const lackingToken = { ...real, bible: real.bible.replace("| used | `.wq-tilebtn.wq-used` | slot, boundary |", "| used | `.wq-tilebtn.wq-used` | slot, boundary, cyanElectric |") };
  seen.stateToken = run(lackingToken).found.some((p) => p.includes("says used (.wq-tilebtn.wq-used) paints cyanElectric"));
  const lackingSelector = { ...real, bible: real.bible.replace("| used | `.wq-tilebtn.wq-used` |", "| used | `.wq-tilebtn.wq-gone` |") };
  seen.stateSelector = run(lackingSelector).found.some((p) => p.includes('names ".wq-tilebtn.wq-gone" (used), which app/src/wq-css.js does not have'));
  const noStates = { ...real, bible: real.bible.replaceAll("| state | selector | tokens |", "| kind | rule | colours |") };
  seen.stateBlind = run(noStates).found.some((p) => p.includes("state table(s), not the two this rule reads"));
  /* and the removal of ONE table: section 7's Glowseed rows deleted whole,
     which the first anchor (a total of 12, exactly section 11's own count)
     could not see */
  const seedTableHeading = "| state | selector | tokens |";
  const seedAt = real.bible.indexOf(seedTableHeading), seedEnd = real.bible.indexOf("## ", seedAt);
  const seedTableGone = { ...real, bible: real.bible.slice(0, seedAt) + [seedTableHeading, "|---|---|---|", "", ""].join(String.fromCharCode(10)) + real.bible.slice(seedEnd) };
  /* THE LATER REFUSALS: a word the owner refused after 2026-08-07 and left
     out of NEVER_BUILD is caught - the hole the beta 27 readiness audit
     found, where the rule read one sentence and every refusal since was
     guarded by nothing. Planted on the 2026-08-18 list, whose three are
     appropriateness refusals. */
  const laterUnguarded = { ...real, engineNeverBuild: null };
  seen.laterRefusal = (() => {
    const noFight = real.spec.replace("**fight** (violence), **hustle** and **grind** (adult slang", "**zzzfight** (violence), **hustle** and **grind** (adult slang");
    return run({ ...real, spec: noFight }).found.some((p) => p.includes('refuses "zzzfight" for child-appropriateness'));
  })();
  /* and a refusal that is a CANDIDATE turned down, not an appropriateness
     one, is NOT demanded of the build guard - the rule would otherwise take
     buildable words off the board for nothing */
  seen.candidateNotGuarded = !run(real).found.some((p) => p.includes('"blap"'));
  /* THE TAUGHT EXCEPTION, read from SPEC and never from a name in this file:
     an exception that names some other word must leave the real one reported,
     and an exception sentence that goes missing must report every taught
     refusal again. */
  const wrongException = { ...real, spec: real.spec.replace("owner-ruled 2026-08-23: ding.**", "owner-ruled 2026-08-23: zzzding.**") };
  seen.taughtRefusal = run(wrongException).found.some((p) => p.includes('records "ding" as refused, and the engine teaches it'));
  const noException = { ...real, spec: real.spec.replace("**Taught despite the refusal, owner-ruled 2026-08-23: ding.**", "") };
  seen.taughtNoException = run(noException).found.some((p) => p.includes('records "ding" as refused, and the engine teaches it'));
  /* THE DECLARED GUARD, both directions: a word SPEC declares that the engine
     does not guard, and a word the engine guards that SPEC never ruled. The
     second direction has never existed before tonight. */
  const dropped = { ...real, spec: real.spec.replace("crabs, ho, gun, fight", "crabs, gun, fight") };
  seen.guardDeclaredOnly = run(dropped).found.some((p) => p.includes('the engine guards "ho" and SPEC declares no such ruling'));
  const extra = { ...real, spec: real.spec.replace("crabs, ho, gun, fight", "crabs, ho, zzzguard, gun, fight") };
  seen.guardEngineMissing = run(extra).found.some((p) => p.includes('SPEC declares "zzzguard" build-guarded and the engine does not guard it'));
  const noDeclaration = { ...real, spec: real.spec.replace("**Build-guarded (a tray must never let a child spell these), as of 2026-08-23:**", "Once guarded:") };
  seen.guardBlind = run(noDeclaration).found.some((p) => p.includes("declared build-guard list could not be read"));
  /* and the exception must not excuse the BUILD guard: a word that is both a
     declared guard and the taught exception, dropped from the engine's list,
     must still be reported as unguarded */
  /* THE AND-SPLIT: a word joined to the last item by "and" with no comma of
     its own was silently discarded, so the rule read fewer refusals than its
     own comment claimed. Planted here as a word the prose refuses and the
     guard list does not: without the split it is swallowed and nothing is
     found. */
  const behindAnd = { ...real, spec: real.spec.replace("**hustle** and **grind** (adult slang", "**hustle** and **zzzand** (adult slang") };
  seen.wordBehindAnd = run(behindAnd).found.some((p) => p.includes("prose refuses") && p.includes("zzzand"));
  /* THE ONE-SOURCE GUARD: a word whose only mention is the declared list can
     be dropped from that sentence and from NEVER_BUILD in one change with the
     gate green. Planted by taking a real guard out of SPEC's reasoning while
     leaving the declaration alone. */
  const oneSource = { ...real, spec: real.spec.replace("The 2026-08-07 sentence, gob, gun and", "The 2026-08-07 sentence, gun and") };
  seen.guardOneSourceOnly = run(oneSource).found.some((p) => p.includes("gob") && p.includes("reasoning about the guard never names it"));
  /* THE SAME WORD ON BOTH SIDES (the release sweep, 2026-08-23). The first
     version of this control put "ho" in the taught exception and "zzzguard"
     in the declared list, then required the finding about ZZZGUARD - which the
     guardList loop produces whether or not the exception disarms anything, so
     the assertion was independent of the mutation it planted and was really
     guardEngineMissing wearing a second name. Now the planted word is the
     exception, so only a rule that refuses to let an exception excuse the
     build guard can produce the finding. */
  seen.exceptionNotAGuardHole = (() => {
    const both = real.spec.replace("owner-ruled 2026-08-23: ding.**", "owner-ruled 2026-08-23: ding, zzzguard.**");
    return run({ ...real, spec: both.replace("crabs, ho, gun, fight", "crabs, ho, zzzguard, gun, fight") }).found.some((p) => p.includes('SPEC declares "zzzguard" build-guarded'));
  })();
  seen.stateTableGone = run(seedTableGone).found.some((p) => p.includes("section 7 state table parses to 0 rows"));
  const driftedReference = { ...real, reference: real.reference.replace(".wq-tilebtn.wq-used{background:${C.slot};", ".wq-tilebtn.wq-used{background:${C.paper};") };
  seen.stateReference = run(driftedReference).found.some((p) => p.includes("paints slot; the reference's block does not name it"));

  if (Object.values(seen).every(Boolean)) {
    console.log("self-test OK: a reworded SPEC sentence, a SPEC block whose anchor moved so the rule would check nothing, a reworded QA promise, a changed hold constant, a stale recipe number in the document, a stale bank count in the chooser, a drifted gate floor in either of the two forms it is written in, an unshipped count that lags or runs ahead of the ledger, a level row that lost a word, a level row in the wrong order, a governing document that has stopped naming a tool agents are told to run, a command that has stopped running that tool's controls, a drifted token value, a token the table names that C lacks, a token C has that the table lacks, a token table whose anchor moved, a tile state whose block lacks a token it claims, a tile selector the stylesheet lacks, a tile table whose anchor moved, the Glowseed's own state table deleted whole, an appropriateness refusal made after 2026-08-07 and left out of the build guard, a candidate refusal wrongly demanded of it, a refused word the engine still teaches, a taught exception naming the wrong word or missing, a declared guard the engine lacks, a guard the engine keeps that nobody declared, an exception that tries to excuse the build guard, a refusal hidden behind an \"and\" with no comma of its own, a guarded word whose only source is the declared list, and a reference copy that drifted from the app's are all caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify(seen));
  process.exit(1);
}

const { found, rules } = run(real);
rule(found.length === 0, "documents and code agree", found.join("; "));
console.log(`Doc-truth gate: ${rules} rules, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
