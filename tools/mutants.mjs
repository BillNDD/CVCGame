/* Mutation gate. Applies each mutation to the reference build, regenerates the engine,
   and runs the test suite. A mutant that survives means the suite cannot see that bug.
   Run: npm run test:mutants   Requirement: 0 survivors. */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REF = "reference/word-quest.jsx";
const TMP = "reference/.mutant.jsx";
const original = readFileSync(REF, "utf8");

const MUTANTS = [
  ["fast-track box 3 to 2", "ws.box = firstEver ? 3 :", "ws.box = firstEver ? 2 :"],
  ["correct step +1 to +2", "Math.min(5, ws.box + 1)", "Math.min(5, ws.box + 2)"],
  ["box ceiling 5 to 4", "Math.min(5, ws.box + 1)", "Math.min(4, ws.box + 1)"],
  ["close floor 1 to 0", "ws.box = Math.max(1, ws.box);", "ws.box = Math.max(0, ws.box);"],
  ["wrong penalty -2 to -1", "Math.max(0, ws.box - 2)", "Math.max(0, ws.box - 1)"],
  ["attempts step +1 to +2", "ws.attempts += 1; ws.lastSession = sessionNumber;", "ws.attempts += 2; ws.lastSession = sessionNumber;"],
  ["INTERVALS[3] 4 to 5", "const INTERVALS = [1, 1, 2, 4, 7, 12];", "const INTERVALS = [1, 1, 2, 5, 7, 12];"],
  ["INTERVALS[0] 1 to 2", "const INTERVALS = [1, 1, 2, 4, 7, 12];", "const INTERVALS = [2, 1, 2, 4, 7, 12];"],
  ["dueAt plus to minus", "ws.dueAt = sessionNumber + INTERVALS[ws.box];", "ws.dueAt = sessionNumber - INTERVALS[ws.box];"],
  ["promotion >= to >", "words.length >= 0.8;", "words.length > 0.8;"],
  ["promotion 0.8 to 0.75", "words.length >= 0.8;", "words.length >= 0.75;"],
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
  ["reveal rate rushed", '{ text: "The word was " + w + ".", rate: 0.9 }', '{ text: "The word was " + w + ".", rate: 1.4 }'],
  ["reveal loses its sentence", '{ text: "The word was " + w + ".", rate: 0.9 }', '{ text: "" + w, rate: 0.9 }'],
  ["praise ignores its index", "{ text: PRAISE[praise] || PRAISE[0], rate: 0.9 }", "{ text: PRAISE[0], rate: 0.9 }"],
  ["praise option reworded", '"You sounded that one out beautifully!",', '"You sounded that one out!",'],
  ["hush does nothing", 'function hush() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }', "function hush() {}"],
  ["streak threshold 2 to 3", "(session && state.perfectStreak >= 2)", "(session && state.perfectStreak >= 3)"],
  ["streak reset after promotion dropped", "{ state.level += 1; state.perfectStreak = 0; return true; }", "{ state.level += 1; return true; }"],
  ["partial guard dropped", "if (session && session.partial) return false;", ""],
  ["imperfect session keeps the streak", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : prior;"],
  ["streak cap dropped", "state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;", "state.perfectStreak = session.perfect ? prior + 1 : 0;"],
  ["session-less call uses the stored streak", "(session && state.perfectStreak >= 2)", "state.perfectStreak >= 2"],
  ["heal streak cap dropped", "else s.perfectStreak = Math.min(2, Math.round(s.perfectStreak));", "else s.perfectStreak = Math.round(s.perfectStreak);"],
  ["pack order inverted", 'for (const tier of ["family", "default"])', 'for (const tier of ["default", "family"])'],
  ["seam 700 to 350", "const SEAM_MS = 700;", "const SEAM_MS = 350;"],
  /* The sound-out reveal (owner-ruled 2026-08-04, built 2026-08-11). The
     "seam dropped from the reveal plan" mutant used to sit here and anchored
     on the old three-clip plan; the plan was rewritten and the anchor went
     with it, so the mutant stopped testing anything while the gate stayed
     green. These replace it, one for each way the reveal can be quietly
     broken. */
  ["sound-out seam dropped", 'for (const id of soundIdsFor(word)) out.push("seam2", id);', 'for (const id of soundIdsFor(word)) out.push(id);'],
  ["sound-out loses its sounds", 'const out = [lead, "seam2", "w:" + word, "seam2", "s:pronounced"];\n    for (const id of soundIdsFor(word)) out.push("seam2", id);', 'const out = [lead, "seam2", "w:" + word];'],
  ["sound-out never says the word again", 'out.push("seam2", "w:" + word);\n    return out;', "return out;"],
  ["sound-out seam 500 to 900", "const SOUNDOUT_SEAM_MS = 500;", "const SOUNDOUT_SEAM_MS = 900;"],
  ["a seam is read as a clip", 'const isSeam = (id) => id === "seam" || id === "seam2";', 'const isSeam = (id) => id === "seam";'],
  ["tile slots lose their order", "if (String(plan[i]).startsWith(\"d:\")) slots.push({ index: i, tile: t++ });", "if (String(plan[i]).startsWith(\"d:\")) slots.push({ index: i, tile: 0 });"],
  ["tricky words lose their true sound", "const bent = WORD_SOUND[word] || {};", "const bent = {};"],
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
];

const run = (cmd, args) => { try { execFileSync(cmd, args, { stdio: "pipe" }); return true; } catch { return false; } };

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
    execFileSync("npx", ["vitest", "run", "--reporter=dot"],
      { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" } });
    return { passed: true, failed: 0 };
  } catch (e) {
    const out = (String(e.stdout || "") + String(e.stderr || "")).replace(ANSI, "");
    return { passed: false, failed: testsFailed(out) };
  }
}

const survivors = [], errored = [];
let missing = 0;

/* Negative control for the runner itself: the pristine suite must PASS before
   any mutant runs. Without this, a broken environment (a crashing vitest)
   reads as "every mutant killed" while no mutation testing happened. */
run("node", ["tools/extract-engine.mjs"]);
if (!run("npx", ["vitest", "run", "--reporter=dot"])) {
  console.error("Runner control FAILED: the pristine suite does not pass; mutation results would be meaningless.");
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
