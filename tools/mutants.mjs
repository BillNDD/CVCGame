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
  ["peek guard removed", "&& freshCur.length === 0) {", ") {"],
  ["SESSION_SIZE 20 to 19", "const SESSION_SIZE = 20;", "const SESSION_SIZE = 19;"],
  ["friendliest-first inverted", "if (b > bb) best = i;", "if (b < bb) best = i;"],
  ["take() off by one", "if (got.length >= k) break;", "if (got.length > k) break;"],
  ["PROMPT_CAP 26 to 25", "const PROMPT_CAP = 26;", "const PROMPT_CAP = 25;"],
  ["dashed join removed", 'const dashed = (w) => chunkWord(w).join("-");', 'const dashed = (w) => chunkWord(w).join("");'],
  ["digraph ck dropped", '"wh","ck","ng"]', '"wh","ng"]'],
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
  ["reveal rate not slow", '{ text: "The word was " + w + ".", rate: 0.7 }', '{ text: "The word was " + w + ".", rate: 0.9 }'],
  ["reveal loses its sentence", '{ text: "The word was " + w + ".", rate: 0.7 }', '{ text: "" + w, rate: 0.7 }'],
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
  ["seam dropped from the reveal plan", '["p:" + (PRAISE[praise] ? praise : 0), "seam", "s:was", "seam", "w:" + word]', '["p:" + (PRAISE[praise] ? praise : 0), "s:was", "w:" + word]'],
  ["pack order inverted", 'for (const tier of ["family", "default"])', 'for (const tier of ["default", "family"])'],
  ["seam 700 to 350", "const SEAM_MS = 700;", "const SEAM_MS = 350;"],
];

const run = (cmd, args) => { try { execFileSync(cmd, args, { stdio: "pipe" }); return true; } catch { return false; } };
const survivors = [];
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
  const passed = built && run("npx", ["vitest", "run", "--reporter=dot"]);
  if (passed) survivors.push(name);
}
run("node", ["tools/extract-engine.mjs"]);
if (existsSync(TMP)) copyFileSync(REF, TMP);

const killed = MUTANTS.length - survivors.length - missing;
console.log(`\nMutation gate: ${MUTANTS.length} mutants, ${killed} killed, ${survivors.length} survived, ${missing} skipped`);
survivors.forEach(s => console.log("  SURVIVED: " + s));
if (missing) console.log("  Anchors that moved must be re-pointed, not deleted.");
process.exit(survivors.length || missing ? 1 : 0);
