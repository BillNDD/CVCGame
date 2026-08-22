/* Mutation gate. Applies each mutation to the reference build, regenerates the engine,
   and runs the test suite. A mutant that survives means the suite cannot see that bug.
   Run: npm run test:mutants   Requirement: 0 survivors. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REF = "reference/word-quest.jsx";
const TMP = "reference/.mutant.jsx";
const original = readFileSync(REF, "utf8");

const MUTANTS = [
  ["fast-track box 3 to 2", "ws.box = firstCorrect ? 3 :", "ws.box = firstCorrect ? 2 :"],
  ["correct step +1 to +2", "Math.min(5, ws.box + 1)", "Math.min(5, ws.box + 2)"],
  ["box ceiling 5 to 4", "Math.min(5, ws.box + 1)", "Math.min(4, ws.box + 1)"],
  ["close floor 1 to 0", "ws.box = Math.max(1, ws.box);", "ws.box = Math.max(0, ws.box);"],
  ["wrong penalty -2 to -1", "Math.max(0, ws.box - 2)", "Math.max(0, ws.box - 1)"],
  ["attempts step +1 to +2", "ws.attempts += 1; ws.lastSession = sessionNumber;", "ws.attempts += 2; ws.lastSession = sessionNumber;"],
  ["INTERVALS[3] 4 to 5", "const INTERVALS = [1, 1, 2, 4, 7, 12];", "const INTERVALS = [1, 1, 2, 5, 7, 12];"],
  ["INTERVALS[0] 1 to 2", "const INTERVALS = [1, 1, 2, 4, 7, 12];", "const INTERVALS = [2, 1, 2, 4, 7, 12];"],
  ["dueAt plus to minus", "ws.dueAt = sessionNumber + INTERVALS[ws.box];", "ws.dueAt = sessionNumber - INTERVALS[ws.box];"],
  /* Re-pointed 2026-08-13 when the threshold moved into isSecure(). The anchor
     it used to have - "words.length >= 0.8;" - stopped existing, and an anchor
     that no longer matches is a mutant that silently skips. */
  ["promotion >= to >", "solid / total >= 0.8;", "solid / total > 0.8;"],
  ["promotion 0.8 to 0.75", "solid / total >= 0.8;", "solid / total >= 0.75;"],
  ["promotion box >=3 to >=2", "state.words[w] && state.words[w].box >= 3).length", "state.words[w] && state.words[w].box >= 2).length"],
  ["lower-level cap 5 to 4", "list.push(...take(dueBelow, 5));", "list.push(...take(dueBelow, 4));"],
  ["confidence cap 2 to 3", "list.push(...take(confidence, 2));", "list.push(...take(confidence, 3));"],
  ["confidence gate 2 to 1", "if (state.sessionsCompleted >= 2)", "if (state.sessionsCompleted >= 1)"],
  /* Re-pointed 2026-07-29, when the peek gained its learning condition: the
     old anchor no longer exists, so the mutant now removes the fresh-words
     guard alone and leaves the learning one in place. */
  ["peek guard removed", "&& freshCur.length === 0 && learned) {", "&& learned) {"],
  /* A3-002 — the peek and above-level review. */
  ["peek ignores whether the level was learned", "&& freshCur.length === 0 && learned) {", "&& freshCur.length === 0) {"],
  ["peek learning bar box 2 to box 1", "state.words[w].box >= 2).length / curLevelWords.length", "state.words[w].box >= 1).length / curLevelWords.length"],
  ["peek learning bar box 2 to box 3", "state.words[w].box >= 2).length / curLevelWords.length", "state.words[w].box >= 3).length / curLevelWords.length"],
  ["peek learning share 0.8 to 0.75", "curLevelWords.length >= 0.8", "curLevelWords.length >= 0.75"],
  ["above-level review dropped", "  list.push(...take(dueAbove, 2));\n", ""],
  ["above-level review cap 2 to 5", "list.push(...take(dueAbove, 2));", "list.push(...take(dueAbove, 5));"],
  ["above-level review looks below instead", "ws.box < 5 && WORD_LEVEL[w] === level + 1)", "ws.box < 5 && WORD_LEVEL[w] === level - 1)"],
  ["above-level review reaches two levels up", "ws.box < 5 && WORD_LEVEL[w] === level + 1)", "ws.box < 5 && WORD_LEVEL[w] >= level + 1)"],
  ["SESSION_SIZE 20 to 19", "const SESSION_SIZE = 20;", "const SESSION_SIZE = 19;"],
  ["friendliest-first inverted", "if (b > bb) best = i;", "if (b < bb) best = i;"],
  ["take() off by one", "if (got.length >= k) break;", "if (got.length > k) break;"],
  ["PROMPT_CAP 26 to 25", "const PROMPT_CAP = 26;", "const PROMPT_CAP = 25;"],
  ["dashed join removed", 'const dashed = (w) => chunkWord(w).join("-");', 'const dashed = (w) => chunkWord(w).join("");'],
  ["digraph ck dropped", '"wh","ck","ng","qu"', '"wh","ng","qu"'],
  /* THE CHUNKER'S POSITION RULES, one mutant per rule, added 2026-08-19 with
     the extended code. Each of these four protects words that are in the bank
     TODAY, so a survivor here is not a theoretical gap: without the final-only
     rule "leg" reads le+g, "get" ge+t, "set" se+t, "vet" ve+t and "red" re+d;
     without the ti rule "tin", "tick" and "tip" read ti+n, ti+ck, ti+p;
     without the tu rule "tub", "tuck" and "tug" read tu+b, tu+ck, tu+g; and
     without the al rule "pal" reads p+al. Eighteen live words across the four,
     every one of them a wrong tile row and a wrong sound-out. Verified against
     an out-of-tree mutation before they were written: neutering unitOk turns
     nine of tests/chunker.test.js's assertions red. */
  ["chunker final-only rule dropped", "if (FINAL_ONLY.includes(g)) return end === w.length;",
    "if (FINAL_ONLY.includes(g)) return true;"],
  ["chunker tu rule dropped", 'if (g === "tu") return rest === "re";', 'if (g === "tu") return true;'],
  ["chunker ti rule dropped", 'if (g === "ti" || g === "ci") return TI_FOLLOWERS.some((t) => rest.startsWith(t));',
    'if (g === "ti" || g === "ci") return true;'],
  ["chunker al rule dropped", 'if (g === "al") return rest.startsWith("l") || rest.startsWith("k");',
    'if (g === "al") return true;'],
  ["migrate +1 to +2", "s.level = (s.level || 1) + 1;", "s.level = (s.level || 1) + 2;"],
  ["migrate log shift dropped", "(s.log || []).forEach(r => { r.level += 1; });", ""],
  ["migrate clamp removed", "Math.min(Math.max(1, s.level || 1), LEVELS.length)", "Math.max(1, s.level || 1)"],
  ["mastered >=4 to >=3", "filter(ws => ws.box >= 4).length;", "filter(ws => ws.box >= 3).length;"],
  ["heal box clamp removed", "ws.box = Math.min(5, Math.max(0, Math.round(ws.box)));", ""],
  ["heal words guard removed", 'if (!s.words || typeof s.words !== "object" || Array.isArray(s.words)) s.words = {};', ""],
  ["heal log row guard removed", 's.log = s.log.filter(r => r && typeof r === "object" && !Array.isArray(r));', ""],
  ["heal items filter removed", 'r.items = Array.isArray(r.items) ? r.items.filter(i => i && typeof i === "object") : [];', "r.items = Array.isArray(r.items) ? r.items : [];"],
  ["heal level guard removed", 'if (typeof s.level !== "number" || !isFinite(s.level)) delete s.level; else s.level = Math.round(s.level);', ""],
  ["heal log level guard removed", 'if (typeof r.level !== "number" || !isFinite(r.level)) r.level = 0;', ""],
  ["heal version guard removed", 'if (typeof s.version !== "number" || !isFinite(s.version)) delete s.version;', ""],
  /* Re-pointed 2026-07-27, when the owner had the 0.7 slow-down removed: the
     old "not slow" mutant now describes the shipped behaviour, so it hunts
     the opposite fault — a reveal rushed past the calm rate. */
  /* Re-pointed 2026-08-12: the anchor moved when the word "a" joined the bank
     and system speech had to be handed its SOUND instead of the letter's name.
     Both of these are the same line, and both anchors broke silently — the
     gate reported "2 skipped" and a skipped mutant proves nothing. Use
     `node tools/mutants.mjs --anchors` to find that in milliseconds. */
  ["reveal rate rushed", '{ text: "The word was " + ttsSafeWord(w) + ".", rate: 0.9 }', '{ text: "The word was " + ttsSafeWord(w) + ".", rate: 1.4 }'],
  ["reveal loses its sentence", '{ text: "The word was " + ttsSafeWord(w) + ".", rate: 0.9 }', '{ text: "" + ttsSafeWord(w), rate: 0.9 }'],
  /* S4, on the one word where the fallback breaks it: handed the string "a",
     every system voice says the LETTER'S NAME to a child being taught that
     letters make sounds. The guard is one function call, and a guard with no
     mutant is a guard nobody has tested. */
  ["system speech says the letter name for “a”", 'const TTS_UNSAFE_WORD = { a: "uh", i: "I" };', 'const TTS_UNSAFE_WORD = {};'],
  /* The i entry alone: deleting the whole object above cannot tell whether
     the i substitution is load-bearing by itself. The bare-letter sweep in
     the engine tests refuses "The word is i." — this proves that sweep reads
     the entry, not the whole map (build reviewer, 2026-08-15). */
  ["system speech hands the bare letter i to the synthesiser", 'const TTS_UNSAFE_WORD = { a: "uh", i: "I" };', 'const TTS_UNSAFE_WORD = { a: "uh" };'],
  ["praise ignores its index", "{ text: PRAISE[praise] || PRAISE[0], rate: 0.9 }", "{ text: PRAISE[0], rate: 0.9 }"],
  ["praise option reworded", '"You sounded that one out beautifully!",', '"You sounded that one out!",'],
  ["hush does nothing", 'function hush() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }', "function hush() {}"],
  ["streak threshold 2 to 3", "(session && state.perfectStreak >= 2)", "(session && state.perfectStreak >= 3)"],
  ["streak reset after promotion dropped", "{ state.level += 1; state.perfectStreak = 0; return true; }", "{ state.level += 1; return true; }"],
  ["partial guard dropped", "if (session && session.partial) return false;", ""],
  ["imperfect session keeps the streak", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : prior;"],
  ["streak cap dropped", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;", "state.perfectStreak = session.perfect ? prior + 1 : 0;"],
  ["session-less call uses the stored streak", "(session && state.perfectStreak >= 2)", "state.perfectStreak >= 2"],
  ["heal streak cap dropped", "else s[key] = Math.min(2, Math.round(v));", "else s[key] = Math.round(v);"],
  ["pack order inverted", 'for (const tier of ["family", "default"])', 'for (const tier of ["default", "family"])'],
  ["seam 700 to 350", "const SEAM_MS = 700;", "const SEAM_MS = 350;"],
  /* The sound-out reveal (owner-ruled 2026-08-04, built 2026-08-11). The
     "seam dropped from the reveal plan" mutant used to sit here and anchored
     on the old three-clip plan; the plan was rewritten and the anchor went
     with it, so the mutant stopped testing anything while the gate stayed
     green. These replace it, one for each way the reveal can be quietly
     broken. */
  ["sound-out seam dropped", 'for (const id of soundIdsFor(word)) if (id !== "d:silent") out.push("seam2", id);', 'for (const id of soundIdsFor(word)) if (id !== "d:silent") out.push(id);'],
  /* Beta 22 shipped the ring one tile late after every silent tile. */
  ["ring forgets the silent tile", 'if (tileSounds) while (t < tileSounds.length && tileSounds[t] === "d:silent") t++;', ''],
  /* Re-pointed 2026-08-20 when the magic-e rule taught the loop to step over
     d:silent - the anchor moved, the fault it plants is the same one. */
  ["sound-out loses its sounds", 'for (const id of soundIdsFor(word)) if (id !== "d:silent") out.push("seam2", id);', '/* sounds dropped by mutant */'],
  ["sound-out never says the word again", 'out.push("seam2", "w:" + word);\n    return out;', "return out;"],
  ["sound-out seam 500 to 900", "const SOUNDOUT_SEAM_MS = 500;", "const SOUNDOUT_SEAM_MS = 900;"],
  ["a seam is read as a clip", 'const isSeam = (id) => id === "seam" || id === "seam2";', 'const isSeam = (id) => id === "seam";'],
  ["tile slots lose their order", 'slots.push({ index: i, tile: t++ });', 'slots.push({ index: i, tile: t });'],
  /* Re-pointed 2026-08-20 when LEX_BENDS joined the merge - the fault it
     plants (every bend lost) is the same one. */
  ["tricky words lose their true sound", "const bent = { ...(LEX_BENDS[word] || {}), ...(WORD_SOUND[word] || {}) };", "const bent = {};"],
  /* The voiced th, collapsed back into the quiet one. "th" spells two sounds
     and the map sent both to th_quiet until 2026-08-11, so this is the exact
     fault replayed: it costs six bank words their sound and nothing else in
     the build would notice, because th_quiet is a clip that exists. */
  ["the voiced th collapses into the quiet one", 'this: { 0: "th_this" }, that: { 0: "th_this" },', 'this: { 0: "th_quiet" }, that: { 0: "th_quiet" },'],
  /* Re-pointed TWICE, and the second time is the interesting one. On
     2026-08-11 "with" moved to the quiet th under the ruling for American
     pronunciation, so this mutant hunted the opposite fault: "with" wrongly
     joining the voiced set. On 2026-08-12 the owner heard both and chose the
     BUZZY th — so the mutant was planting a mapping the bank already had. An
     equivalent mutant plants no fault, kills nothing, and survives forever;
     G5 caught it the same evening. It now hunts the fault that exists today:
     "with" losing the voiced th the owner chose. */
  ["with loses the voiced th the owner chose", 'them: { 0: "th_this" }, with: { 2: "th_this" },', 'them: { 0: "th_this" }, with: { 2: "th_quiet" },'],
  ["was loses its American vowel", 'was: { 1: "short_u", 2: "z" },', 'was: { 1: "short_o", 2: "z" },'],
  ["a digraph loses its single sound", 'ck: "k", ff: "f", ll: "l", ss: "s", zz: "z",', 'ff: "f", ll: "l", ss: "s", zz: "z",'],
  /* The garden (art project step 0e, 2026-08-22): the ladder completes only
     when the last level's words are secure. A mutant that completes it
     regardless lights the sanctuary on arrival at level 100. */
  ["the ladder completes without its words being secure",
    "  return isSecure(words.filter(w => state.words && state.words[w] && state.words[w].box >= 3).length, words.length);",
    "  return true;"],
];

/* The last failure this helper swallowed, so the pristine control can SAY
   what went wrong instead of only that something did. Beta 25's gauntlet
   spent a run on "the pristine suite does not pass" with no name attached,
   and the suite passed three times in a row afterwards - a report that
   cannot name the failure cannot be diagnosed (the owner's deflaking rule,
   2026-08-21). */
let lastRunOutput = "";
const run = (cmd, args) => {
  try { execFileSync(cmd, args, { stdio: "pipe" }); lastRunOutput = ""; return true; }
  catch (e) { lastRunOutput = String(e.stdout || "") + String(e.stderr || ""); return false; }
};

/* A mutant is KILLED only when a TEST FAILED. A non-zero exit alone is not
   proof: a mutant that crashes the runner or breaks the environment exits
   non-zero too, and scoring that as a kill claims protection the suite never
   demonstrated. Three outcomes — killed, survived, errored — and an error
   fails the gate rather than passing as a kill. */
const ANSI = /\[[0-9;]*[A-Za-z]/g;
/* Read the TESTS row, not the TEST FILES row. Vitest prints both, file first:
       Test Files  1 failed | 1 passed (2)
             Tests  2 passed (2)
   A file that throws at import fails as a FILE while zero tests fail, so a
   loose /(\d+) failed/ read the file row and announced a crashed suite as a
   kill - the exact false kill this distinction exists to prevent. Caught by
   review, reproduced against vitest 2.1.9 on 2026-08-10. */
const testsFailed = (out) => {
  const m = out.match(/\bTests\s+(\d+) failed/);
  return m ? Number(m[1]) : 0;
};
{
  const crashed = "Test Files  1 failed | 1 passed (2)\n      Tests  2 passed (2)\n";
  const real = "Test Files  1 failed (13)\n      Tests  3 failed | 327 passed (330)\n";
  if (testsFailed(crashed) !== 0 || testsFailed(real) !== 3) {
    console.error("control FAILED: the failure parser must read the Tests row, not Test Files");
    process.exit(1);
  }
}

function runTests() {
  try {
    /* Through Node's own binary, never "npx": execFileSync takes no shell, so
       on Windows the npx.cmd shim cannot be resolved (and newer Node refuses
       .cmd without a shell outright). Every mutant run then "failed", and the
       pristine-suite control - doing exactly its job - refused the gate.
       Found 2026-08-15, the fourth Windows-only gate fault of the move. */
    /* --bail 1 (P1 of the speed plan, 2026-08-21): a mutant is killed by ONE
       failing test, and the suite used to run all 380 to find it. vitest
       stops at the first failure and still prints the "Tests N failed" row
       this runner reads, so the verdict is unchanged and only the time moves.
       The pristine control above runs WITHOUT bail: a clean suite has nothing
       to stop at, and that run must prove every file green. */
    execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--reporter=dot", "--bail", "1"],
      { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" } });
    return { passed: true, failed: 0 };
  } catch (e) {
    const out = (String(e.stdout || "") + String(e.stderr || "")).replace(ANSI, "");
    return { passed: false, failed: testsFailed(out) };
  }
}

/* --anchors: check every anchor against the source and print the ones that
   have moved, WITHOUT running a single test. A skipped mutant proves nothing,
   and finding out which one used to mean running the whole gate - twelve
   minutes to learn a fact that takes milliseconds to check. Added 2026-08-12,
   when two anchors moved on the evening of a release. */
if (process.argv.includes("--anchors")) {
  const moved = MUTANTS.filter(([, from]) => !original.includes(from));
  for (const [name] of moved) console.log("ANCHOR MOVED: " + name);
  console.log(`${MUTANTS.length} mutants, ${moved.length} anchor(s) no longer in the source`);
  process.exit(moved.length ? 1 : 0);
}

const survivors = [], errored = [];
let missing = 0;

/* Negative control for the runner itself: the pristine suite must PASS before
   any mutant runs. Without this, a broken environment (a crashing vitest)
   reads as "every mutant killed" while no mutation testing happened. */
run("node", ["tools/extract-engine.mjs"]);
if (!run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--reporter=dot"])) {
  /* TWO different failures, told apart (2026-08-21). A non-zero exit alone
     does not mean a test failed: the runner can crash, run out of a handle,
     or be starved of the machine, and calling that "the pristine suite does
     not pass" sent a whole gauntlet chasing a suite that then passed eleven
     times in a row. The mutant loop below has always made this distinction -
     killed, survived, ERRORED - and the control that guards it did not.
     Both still FAIL the gate, closed; they now fail by different names, and
     the failing lines are printed either way. */
  const out = lastRunOutput.replace(ANSI, "");
  const failed = testsFailed(out);
  console.error(failed > 0
    ? `Runner control FAILED: ${failed} test(s) fail on the pristine tree; mutation results would be meaningless.`
    : "Runner control ERRORED: the runner exited non-zero with NO failing test - the environment, not the suite. Re-run; if it repeats, it is a real fault.");
  const lines = out.split(String.fromCharCode(10));
  for (const l of lines) if (/(FAIL|×|✕|AssertionError|Error:)/.test(l)) console.error("  " + l.trim().slice(0, 200));
  console.error("  ---- tail ----" + String.fromCharCode(10) + lines.slice(-25).join(String.fromCharCode(10)));
  process.exit(1);
}

for (const [name, from, to] of MUTANTS) {
  if (!original.includes(from)) { console.log("  SKIP (anchor moved): " + name); missing++; continue; }
  writeFileSync(TMP, original.replace(from, to));
  const built = run("node", ["tools/extract-engine.mjs", TMP, "src/engine.js"]);
  // a mutant that breaks extraction is caught by the build; never test stale code
  if (!built) { console.log("  killed: " + name + " (the mutated build does not extract)"); continue; }
  const r = runTests();
  if (r.passed) survivors.push(name);
  else if (r.failed > 0) console.log(`  killed: ${name} (${r.failed} test${r.failed === 1 ? "" : "s"} failed)`);
  else errored.push(name);
}
run("node", ["tools/extract-engine.mjs"]);
if (existsSync(TMP)) copyFileSync(REF, TMP);

const killed = MUTANTS.length - survivors.length - missing - errored.length;
console.log(`\nMutation gate: ${MUTANTS.length} mutants, ${killed} killed, ${survivors.length} survived, ${errored.length} errored, ${missing} skipped`);
survivors.forEach(s => console.log("  SURVIVED: " + s));
errored.forEach(s => console.log("  ERRORED (the run died without a test failure, so nothing was proven): " + s));
if (missing) console.log("  Anchors that moved must be re-pointed, not deleted.");
process.exit(survivors.length || missing || errored.length ? 1 : 0);
