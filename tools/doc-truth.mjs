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

const { LEVELS, NEVER_BUILD } = await import("../src/engine.js");

const problems = [];
const rule = (okay, name, detail) => {
  if (okay) console.log("ok: " + name);
  else problems.push(name + (detail ? " — " + detail : ""));
};

/* The haystack is every source a sentence could honestly live in: the app,
   its screens and components, and the generated engine that owns the
   feedback text. */
const SOURCES = [
  "app/src/App.jsx", "app/src/storage.js", "app/src/voicepacks.js", "app/src/swrefresh.js",
  "app/src/updates.js", "app/src/screens/HomeScreen.jsx", "app/src/screens/SessionScreen.jsx",
  "app/src/screens/DoneScreen.jsx", "app/src/screens/ParentScreen.jsx",
  "app/src/components/HoldButton.jsx", "app/src/components/UpdateRow.jsx", "src/engine.js",
];
/* The tools an agent is TOLD to run, and the sentences that tell them. A tool
   nobody is pointed at is a tool nobody runs: blast-radius was built on
   2026-08-13 to make E11's second step a command, and the owner asked the same
   day what stops it being quietly orphaned by a later edit or forgotten across
   a context compaction. This is that stop. Add a tool here when a governing
   document starts telling agents to run it. */
const AGENT_TOOLS = [
  {
    file: "tools/blast-radius.mjs",
    why: "the E11 lookup: what does this change break",
    docs: { "CLAUDE.md": "claude", "AGENTS.md": "agents", "README.md": "readme" },
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
    file: "tools/mutants.mjs",
    why: "the mutation gate, and its --anchors dry run that E11 asks for first",
    docs: { "CLAUDE.md": "claude", "AGENTS.md": "agents" },
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
  ledger: readFileSync("tools/pending-words/pending-words.json", "utf8"),
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
  const homeCount = /any word from all (\d+)/.exec(d.home);
  if (!homeCount || Number(homeCount[1]) !== d.bankSize)
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
  for (const m of d.gauntletDoc.matchAll(/`(g\d+[a-z0-9_]*)`\s*\((\d+)\)/g)) {
    const [, key, stated] = m;
    if (key in retired) {
      if (Number(stated) !== retired[key].was)
        found.push(`the gate specification says ${key} retired at ${stated}, the baseline records ${retired[key].was}`);
      continue;
    }
    if (!(key in baseline)) found.push(`the gate specification quotes ${key}, which is neither a live floor nor a retired one`);
    else if (Number(stated) !== baseline[key])
      found.push(`the gate specification says ${key} is ${stated}, the baseline enforces ${baseline[key]}`);
  }

  /* Every word SPEC rules out for child-appropriateness must be a word the
     engine refuses to let a child BUILD. The two lists lived apart for a day
     and a tray handed gob back - the word SPEC says was removed "so it cannot
     return by accident". A subset check, not equality: the engine may be
     stricter (it also refuses the ruled-out plurals), never looser. */
  rules += 1;
  {
    const said = /Words ruled out for child-appropriateness \(2026-08-07\): ([^;]+);/.exec(d.spec);
    /* "hunt, fist, limp, bone, buns, dump, and milt" - the Oxford comma
       leaves "and milt" on the last item, so the word is stripped per ITEM
       rather than from the sentence. The first version reported that the
       engine would let a child build "and milt". */
    const ruled = said
      ? said[1].split(",").map((w) => w.replace(/^\s*and\s+/, "").trim()).filter(Boolean)
      : [];
    if (!ruled.length) found.push("SPEC's child-appropriateness sentence could not be read, so this rule is checking nothing");
    for (const w of ruled.concat(["gob"]))
      if (!NEVER_BUILD.includes(w))
        found.push(`SPEC rules out "${w}" but the engine would let a child build it: add it to NEVER_BUILD in reference/word-quest.jsx`);
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
     documents say — so a tool dropped from CLAUDE.md is a tool that has
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

  return { found, rules };
}

if (process.argv.includes("--self-test")) {
  const seen = { spec: false, blind: false, qa: false, hold: false, recipe: false, bank: false, floor: false, unshipped: false, superseded: false, table: false, tableOrder: false, orphanDoc: false, orphanCmd: false };

  /* Both ways a tool gets orphaned. The first is the one that actually
     happens: somebody tidies a governing document, the sentence naming the
     tool goes with the tidying, and every agent after that reads a repository
     where the tool does not exist. */
  const docOrphan = { ...real, claude: real.claude.split("tools/blast-radius.mjs").join("tools/nothing.mjs") };
  seen.orphanDoc = run(docOrphan).found.some((p) => p.startsWith("CLAUDE.md no longer names tools/blast-radius.mjs"));

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
  const bankCorrupt = { ...real, home: real.home.replace(/any word from all \d+/, "any word from all 250") };
  seen.bank = run(bankCorrupt).found.some((p) => p.startsWith("the chooser copy says all 250"));

  /* A floor quoted in the gate specification that no longer matches the
     baseline: the exact drift found on 2026-08-10. */
  const floorCorrupt = { ...real, gauntletDoc: real.gauntletDoc.replace(/`g20_tests_mapped` \(\d+\)/, "`g20_tests_mapped` (1)") };
  seen.floor = run(floorCorrupt).found.some((p) => p.includes("g20_tests_mapped"));

  /* A word the owner rules out must be a word no tray can spell. Both halves
     are planted: a SPEC that names a word the engine does not refuse must be
     reported, and a SPEC whose sentence has moved must report that it is
     checking nothing rather than passing on an empty list. */
  const looseSpec = { ...real, spec: real.spec.replace(
    /Words ruled out for child-appropriateness \(2026-08-07\): [^;]+;/,
    "Words ruled out for child-appropriateness (2026-08-07): hunt, fist, and zzztest;") };
  const blindSpec = { ...real, spec: real.spec.replace(
    /Words ruled out for child-appropriateness \(2026-08-07\):/, "Words once ruled out:") };
  seen.neverBuild = run(looseSpec).found.some((p) => p.includes('rules out "zzztest"'))
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

  if (Object.values(seen).every(Boolean)) {
    console.log("self-test OK: a reworded SPEC sentence, a SPEC block whose anchor moved so the rule would check nothing, a reworded QA promise, a changed hold constant, a stale recipe number in the document, a stale bank count in the chooser, a drifted gate floor, an unshipped count that lags or runs ahead of the ledger, a level row that lost a word, a level row in the wrong order, a governing document that has stopped naming a tool agents are told to run, and a command that has stopped running that tool's controls are all caught");
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
