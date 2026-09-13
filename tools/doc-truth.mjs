/* Doc-truth gate (G16). The documents are the master source, so a document
   that describes behaviour the code does not have is a defect — and one that
   no test could see before this gate existed.

   The fault this gate is built from: QA step 32 promised that a dead
   microphone "switches to grown-up grading for this visit". The code never
   did that. A person ran the step, read a promise, saw something else, and
   had no way to tell which was wrong. Counting steps (G12) cannot catch it;
   only binding the words to the code can.

   Fourteen rules, every expected value read from the document and checked
   against the source, never the other way round. THE RULES LIVE UNDER
   tools/doc-truth/, one function per rule (batch 1 of the refactor,
   2026-09-13: run() was one function of complexity 128 and 179 lines
   holding every rule). This file keeps the orchestration - the rule list in
   the order the rules run, the documents each is handed, and the tools an
   agent is told to run - and the controls.
     safety.mjs     1 S8 against the chunker and the pathway; 2 S9's count of G24's controls
     sentences.mjs  3 SPEC section 8's sentences; 4 the QA script's promises; 5 the hold
                    timer; 6 the voice recipe SPEC names; 7 the chooser's bank count
     floors.mjs     8 every floor the gate specification quotes
     refusals.mjs   9 every word SPEC rules out against NEVER_BUILD and the bank
     ledgers.mjs    10 the approved-and-unshipped heading; 11 SPEC's level table;
                    12 the orphan rule (owner-ruled 2026-08-13)
     art.mjs        13 the art bible's token table against C; 14 its state tables

   Negative control: --self-test corrupts each document in memory and
   requires every detector to fire.
   Run: node tools/doc-truth.mjs */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { sourcesFor } from "./app-sources.mjs";
import { finish } from "./lib/selftest.mjs";
import { printProblems, verdict } from "./lib/report.mjs";
import { checkS8, checkS9Count } from "./doc-truth/safety.mjs";
import { checkSpecSentences, checkQaSentences, checkHold, checkRecipe, checkChooser } from "./doc-truth/sentences.mjs";
import { checkFloors } from "./doc-truth/floors.mjs";
import { checkRefusals } from "./doc-truth/refusals.mjs";
import { unshipped, checkUnshipped, checkLevelTable, checkOrphans } from "./doc-truth/ledgers.mjs";
import { checkTokens, checkStates } from "./doc-truth/art.mjs";

const { C, LEVELS, NEVER_BUILD, chunkWord, WORD_TILES } = await import("../src/engine.js");
/* A refused word is reachable from a TRAY only if a build ever deals its
   number of slots: the bank's own words decide that, so a one-tile or a
   nine-tile refusal is not something a child could spell. */
const BUILD_SLOT_COUNTS = new Set(LEVELS.flatMap((l) => l.words).map((w) => chunkWord(w).length));
const spellableLength = (w) => BUILD_SLOT_COUNTS.has(chunkWord(w).length);

/* The haystack is every source a sentence could honestly live in: the app,
   its screens and components, and the generated engine that owns the
   feedback text. DERIVED (owner-ruled 2026-08-17): every app source except
   the ones tools/app-sources.mjs excludes with a reason, plus the generated
   engine. The hand-written list had lost three screens. */
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
  {
    file: "tools/shape.mjs",
    why: "G31: the code's shape, held at or under the ceilings measured on 2026-09-12",
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "check",
    command: "tools/shape.mjs --self-test",
  },
  {
    file: "tools/differential.mjs",
    why: "G32: the tree's engine beside the beta-32 engine, over the same inputs",
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "check",
    command: "tools/differential.mjs --self-test",
  },
  /* The tools' shared scaffold (batch 1 of the refactor, 2026-09-12): four
     helpers under tools/lib, mechanics only, each with its own controls. A
     helper forty tools lean on and nothing re-runs is the shape this rule
     exists for. */
  ...["selftest", "baseline", "report", "proc", "csv", "splice"].map((name) => ({
    file: `tools/lib/${name}.mjs`,
    why: `the tools' shared ${name} helper, and the controls that prove its mechanics`,
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "check",
    command: `tools/lib/${name}.mjs --self-test`,
  })),
  {
    file: "tests/ui/monkey.mjs",
    why: "G30's evidence writer, driven against a stub page: five files, the first failure kept, the next run beside",
    docs: { "docs/testing-gauntlet.md": "gauntletDoc" },
    script: "check",
    command: "tests/ui/monkey.mjs --self-test",
  },
];

/* Every document and every table a rule reads, loaded once; the controls
   corrupt copies of this bag in memory and expect each rule to fire. */
export const real = {
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
  pathway: readFileSync("tools/ladder/shape-v3.json", "utf8"),
  s9tool: readFileSync("tools/s9-names.mjs", "utf8"),
  baseline: readFileSync(".claude/gate-baseline.json", "utf8"),
  voiceDoc: readFileSync("docs/voice-pack.md", "utf8"),
  bible: readFileSync("docs/art-bible.md", "utf8"),
  css: readFileSync("app/src/wq-css.js", "utf8"),
  reference: readFileSync("reference/word-quest.jsx", "utf8"),
  ledger: readFileSync("tools/pending-words/pending-words.json", "utf8"),
  faults: readFileSync("docs/open-faults.md", "utf8"),
  tokens: C,
  /* the engine's own tables, so a rule module imports no engine of its own */
  levels: LEVELS,
  neverBuild: NEVER_BUILD,
  chunkWord,
  wordTiles: WORD_TILES,
  spellable: spellableLength,
};

/* The fourteen rules, in the order they have always run. */
const RULES = [
  checkS8, checkS9Count,
  checkSpecSentences, checkQaSentences, checkHold, checkRecipe, checkChooser,
  checkFloors,
  checkRefusals,
  checkUnshipped, checkLevelTable, (d) => checkOrphans(d, AGENT_TOOLS),
  checkTokens, checkStates,
];
export function run(d) {
  const found = [];
  for (const rule of RULES) found.push(...rule(d));
  return { found, rules: RULES.length };
}

/* The command half is guarded, so an import gets run() and runs nothing. */
const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;

if (RUN_AS_COMMAND && process.argv.includes("--self-test")) {
  const seen = {};
  /* S8 against the chunker and the pathway, three ways, and S9's count. */
  const s8Stale = { ...real, claude: real.claude.replace(/\n  Superseded 2026-08-17 by level 91[^\n]*\n[^\n]*from there \(owner-ruled 2026-09-02, when the note was found stale\)\. ai and/, "\n  ai and") };
  seen.s8LeftOut = run(s8Stale).found.some((p) => p.startsWith("S8 says ph was left out"));
  const s8Unit = { ...real, claude: real.claude.replace("(sh, ch, th, wh, ck,", "(sh, ch, th, wh, xq,") };
  seen.s8Unit = run(s8Unit).found.some((p) => p.startsWith("S8 names xq as a tiling unit"));
  const s8Untaught = { ...real, pathway: real.pathway.replace("tch=ch dge=j", "dge=j") };
  seen.s8Untaught = run(s8Untaught).found.some((p) => p.startsWith("the chunker tiles tch and neither S8"));
  /* and the unit S8 names by prose - "ere" rides ai's seat - must be read
     when its line wraps, which is the plant above proving the fold */
  const s9Count = { ...real, claude: real.claude.replace("rule and thirteen controls", "rule and seven controls") };
  seen.s9Count = run(s9Count).found.some((p) => p.startsWith("S9 says G24 carries seven controls"));

  /* Both ways a tool gets orphaned. The first is the one that actually
     happens: somebody tidies a governing document, the sentence naming the
     tool goes with the tidying, and every agent after that reads a repository
     where the tool does not exist. Planted in AGENTS.md since 2026-08-31: it
     is the controller, and the document an agent must be able to find these
     tools in. The control used to plant in CLAUDE.md, which now owns only the
     safety rules and names no engineering tool - so planting there would prove
     nothing. */
  const docOrphan = { ...real, agents: real.agents.split("tools/blast-radius.mjs").join("tools/nothing.mjs") };
  seen.orphanDoc = run(docOrphan).found.some((p) => p.startsWith("AGENTS.md no longer names tools/blast-radius.mjs"));
  /* The second is quieter: the tool is still named, still recommended, and
     nothing runs its controls any more, so it can go wrong and stay green. */
  const cmdOrphan = { ...real, pkg: real.pkg.split("tools/blast-radius.mjs --self-test").join("true") };
  seen.orphanCmd = run(cmdOrphan).found.some((p) => p.includes("no longer runs tools/blast-radius.mjs"));
  /* And the same rule against the batch-1 helpers, by the new names: a helper
     forty tools lean on, dropped from the check or from the gate document. */
  const libOrphanCmd = { ...real, pkg: real.pkg.split("tools/lib/selftest.mjs --self-test").join("true") };
  seen.orphanLibCmd = run(libOrphanCmd).found.some((p) => p.includes("no longer runs tools/lib/selftest.mjs"));
  const libOrphanDoc = { ...real, gauntletDoc: real.gauntletDoc.split("tools/lib/proc.mjs").join("tools/lib/nothing.mjs") };
  seen.orphanLibDoc = run(libOrphanDoc).found.some((p) => p.startsWith("docs/testing-gauntlet.md no longer names tools/lib/proc.mjs"));

  const specCorrupt = { ...real, spec: real.spec.replace(/^(\s{3}heading\s+)"[^"]+"$/m, '$1"A sentence the app never says."') };
  seen.spec = run(specCorrupt).found.some((p) => p.startsWith("SPEC sentence missing"));
  /* The vacuous-rule control, and the reason rule 3 refuses an empty list at
     all. Move the block's own anchor and the rule must SAY it is checking
     nothing — the failure mode that would otherwise read as a pass. */
  const blindCorrupt = { ...real, spec: real.spec.replace("2. Recorded voice:", "2. Something else entirely:") };
  seen.blind = run(blindCorrupt).found.some((p) => p.startsWith("SPEC section 8 pins no sentences"));
  /* Re-pointed 2026-08-12: this used to corrupt "Didn’t catch that — tap to try
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
     bank has outgrown. Re-planted at the cutover: the live chooser DERIVES its
     count, so the fault to plant is the derived form replaced by a typed stale
     number - exactly the regression the re-sourced rule refuses. */
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
  /* Rule 13's three plants: a drifted value, a key the table names that C
     lacks, and a table whose anchor moved (zero rows). */
  const driftedHex = { ...real, bible: real.bible.replace("| ink | #17356b |", "| ink | #17356c |") };
  seen.tokenDrift = run(driftedHex).found.some((p) => p.includes("the art bible says ink is #17356c"));
  const strangeKey = { ...real, bible: real.bible.replace("| ink | #17356b |", "| ink | #17356b |\n| zzqToken | #000000 |") };
  seen.tokenStranger = run(strangeKey).found.some((p) => p.includes('names "zzqToken", which C does not have'));
  const missingKey = { ...real, bible: real.bible.replace("| slot | #e6dccb |", "") };
  seen.tokenMissing = run(missingKey).found.some((p) => p.includes('C has "slot", which the art bible'));
  const noTable = { ...real, bible: real.bible.replace("### 9.3 ", "### 9.9 ") };
  seen.tokenBlind = run(noTable).found.some((p) => p.includes("parses to 0 rows"));
  /* Rule 14's four plants: a token the block lacks, a selector the sheet
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
     does not guard, and a word the engine guards that SPEC never ruled. */
  const dropped = { ...real, spec: real.spec.replace("crabs, ho, gun, fight", "crabs, gun, fight") };
  seen.guardDeclaredOnly = run(dropped).found.some((p) => p.includes('the engine guards "ho" and SPEC declares no such ruling'));
  const extra = { ...real, spec: real.spec.replace("crabs, ho, gun, fight", "crabs, ho, zzzguard, gun, fight") };
  seen.guardEngineMissing = run(extra).found.some((p) => p.includes('SPEC declares "zzzguard" build-guarded and the engine does not guard it'));
  const noDeclaration = { ...real, spec: real.spec.replace("**Build-guarded (a tray must never let a child spell these), as of 2026-08-23:**", "Once guarded:") };
  seen.guardBlind = run(noDeclaration).found.some((p) => p.includes("declared build-guard list could not be read"));
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

  const failed = finish("doc-truth", [
    ["a safety-rule unit the chunker never emits is caught", seen.s8Unit],
    ["a left-out unit the chunker emits with no supersession is caught", seen.s8LeftOut],
    ["a tiled unit neither S8 nor the pathway teaches is caught", seen.s8Untaught],
    ["a safety-rule control count the gate does not hold is caught", seen.s9Count],
    ["a reworded SPEC sentence is caught", seen.spec],
    ["a SPEC block whose anchor moved is caught as checking nothing", seen.blind],
    ["a reworded QA promise is caught", seen.qa],
    ["a changed hold constant is caught", seen.hold],
    ["a stale recipe number in the document is caught", seen.recipe],
    ["a stale bank count in the chooser is caught", seen.bank],
    ["a drifted gate floor is caught", seen.floor],
    ["a drifted gate floor written the other way is caught", seen.floorWrapped],
    ["an unshipped count that lags or runs ahead of the ledger is caught", seen.unshipped],
    ["a superseded ledger row is exempt and a planted one counts", seen.superseded],
    ["a level row that lost a word is caught", seen.table],
    ["a level row in the wrong order is caught", seen.tableOrder],
    ["a governing document that has stopped naming a tool agents are told to run is caught", seen.orphanDoc],
    ["a command that has stopped running that tool's controls is caught", seen.orphanCmd],
    ["the check dropping a batch-1 helper's controls is caught by the new name", seen.orphanLibCmd],
    ["the gate document dropping a batch-1 helper is caught by the new name", seen.orphanLibDoc],
    ["a drifted token value is caught", seen.tokenDrift],
    ["a token the table names that C lacks is caught", seen.tokenStranger],
    ["a token C has that the table lacks is caught", seen.tokenMissing],
    ["a token table whose anchor moved is caught", seen.tokenBlind],
    ["a tile state whose block lacks a token it claims is caught", seen.stateToken],
    ["a tile selector the stylesheet lacks is caught", seen.stateSelector],
    ["a tile table whose anchor moved is caught", seen.stateBlind],
    ["the Glowseed's own state table deleted whole is caught", seen.stateTableGone],
    ["a reference copy that drifted from the app's is caught", seen.stateReference],
    ["a refused word the engine does not guard, and a moved refusal sentence, are caught", seen.neverBuild],
    ["an appropriateness refusal made after 2026-08-07 and left out of the build guard is caught", seen.laterRefusal],
    ["a candidate refusal is not wrongly demanded of the build guard", seen.candidateNotGuarded],
    ["a taught exception naming the wrong word is caught", seen.taughtRefusal],
    ["a taught exception gone missing is caught", seen.taughtNoException],
    ["a guard the engine keeps that nobody declared is caught", seen.guardDeclaredOnly],
    ["a declared guard the engine lacks is caught", seen.guardEngineMissing],
    ["a declared list that cannot be read is caught as checking nothing", seen.guardBlind],
    ["a refusal hidden behind an \"and\" with no comma of its own is caught", seen.wordBehindAnd],
    ["a guarded word whose only source is the declared list is caught", seen.guardOneSourceOnly],
    ["an exception that tries to excuse the build guard is caught", seen.exceptionNotAGuardHole],
  ]);
  if (failed) process.exit(1);
  console.log("self-test OK: a safety-rule unit the chunker never emits, a left-out unit the chunker emits with no supersession, a tiled unit neither S8 nor the pathway teaches, a safety-rule control count the gate does not hold, a reworded SPEC sentence, a SPEC block whose anchor moved so the rule would check nothing, a reworded QA promise, a changed hold constant, a stale recipe number in the document, a stale bank count in the chooser, a drifted gate floor in either of the two forms it is written in, an unshipped count that lags or runs ahead of the ledger, a level row that lost a word, a level row in the wrong order, a governing document that has stopped naming a tool agents are told to run, a command that has stopped running that tool's controls, a drifted token value, a token the table names that C lacks, a token C has that the table lacks, a token table whose anchor moved, a tile state whose block lacks a token it claims, a tile selector the stylesheet lacks, a tile table whose anchor moved, the Glowseed's own state table deleted whole, an appropriateness refusal made after 2026-08-07 and left out of the build guard, a candidate refusal wrongly demanded of it, a refused word the engine still teaches, a taught exception naming the wrong word or missing, a declared guard the engine lacks, a guard the engine keeps that nobody declared, an exception that tries to excuse the build guard, a refusal hidden behind an \"and\" with no comma of its own, a guarded word whose only source is the declared list, and a reference copy that drifted from the app's are all caught");
  process.exit(0);
}

if (RUN_AS_COMMAND) {
  const { found, rules } = run(real);
  const problems = found.length ? ["documents and code agree — " + found.join("; ")] : [];
  if (!found.length) console.log("ok: documents and code agree");
  console.log(verdict("Doc-truth gate", `${rules} rules`, problems.length));
  printProblems(problems, { print: console.error });
  process.exit(problems.length ? 1 : 0);
}
