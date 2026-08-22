/* App-side mutation gate (G19). G5 mutates the engine; nothing mutated the
   half of the product the child actually touches. So the app's tests were
   known to PASS, and not known to BITE.
   Command: npm run test:app-mutants   Requirement: 0 survivors.

   Each mutant breaks one rule that a person would notice, in the files the
   engine never sees: the grade-once rule (one attempt, one result), the adult hold, the update
   comparison, the backup validator, the free-play write guard, and the
   advance arming (B17: nothing arms before a length is known). The
   transcript acceptance rule was a sixth family until 2026-08-12; see the note
   where its four mutants used to be.
   Three of these are blueprint mutant families that had no mutant at all:
   grading that trusts the wrong thing, persistence that accepts malformed
   state, and a privacy or update allowlist that accepts what it should not.

   Runner control (E5): the pristine suite must PASS before any mutant runs.
   Without it, a broken environment reads as "every mutant killed" while no
   mutation testing happened at all. Anchors that move are reported as
   skipped and fail the gate — they are re-pointed, never deleted (E3). */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const APP = "app/src/App.jsx";
const HOLD = "app/src/components/HoldButton.jsx";
const UPD = "app/src/updates.js";

/* [name, file, from, to] — one narrow rule broken per mutant. */
const MUTANTS = [
  /* FOUR MUTANTS RETIRED HERE on 2026-08-12, owner-ruled, and this note is
     the record of it. They were the transcript rule — what the app was allowed
     to call a reading: the two-word limit, the length guard, the contains-vs-
     equals matcher, and the one that made a failed match record a miss by
     itself. Every anchor was a line inside handleTranscripts(), and that
     function no longer exists.

     This file's own rule is that an anchor that moves is re-pointed, never
     deleted (E3), and that rule is right: a mutant deleted to make a gate go
     green is the exact fraud the gauntlet exists to prevent. It does not fit
     here, because there is nothing to re-point AT. The rule these four
     protected — that the app may never record a result by itself — did not
     weaken when the microphone went; it became absolute, and the mutant below
     is what now holds it.

     THE FAMILY IS EMPTY, AND SAYING OTHERWISE WOULD BE THE LIE. A first draft
     replaced the four with a grade-once mutant labelled "breaks S1". It does
     not: both of its writes come from an adult holding a control, so what it
     breaks is one attempt, one result. Review caught the mislabel. S1 has no
     app mutant now, for the plain reason that S1's subject is an automatic
     write and there is no automatic write left to mutate. A mutation gate
     cannot cover a rule by breaking code that does not exist, and dressing an
     S5 mutant in S1's name to keep a family non-empty is exactly the kind of
     paperwork this gate exists to refuse. S1 is held by tests/safety.test.js
     1, 2, 2a and 3, and by tools/mic-absence.mjs.

     The mutant below is kept on its own merits, under its own rule.

     The floor moves 13 -> 10. That is a retirement, not a lowering: the
     subject is gone from the product, the tests that covered it are gone from
     the suite, and no surviving rule lost its guard. */

  /* One attempt, one result. Two adult controls can mature together — the
     hold timer does not re-check `disabled` inside its own callback — and
     without this guard the same word is counted twice and the grown-up is
     offered "2 words have been read" for one word. */
  ["one attempt records two results", APP,
    "if (gradedRef.current === qi) return;",
    "if (false) return;"],

  /* The adult gesture. S5: a pointer must hold a result control for 450 ms. */
  ["the adult hold drops from 450 ms to 50 ms", HOLD,
    "const HOLD_MS = 450;", "const HOLD_MS = 50;"],
  ["the adult hold fires on press, with no wait", HOLD,
    "tRef.current = setTimeout(() => { clear(); fire(); }, HOLD_MS);",
    "clear(); fire();"],

  /* The update comparison. The build stamp exists because two different
     builds of the same version read as identical and the owner was told,
     wrongly, that they were up to date. */
  ["the update check ignores the build stamp", UPD,
    "state: data.version === current && sameBuild ? \"current\" : \"available\",",
    "state: data.version === current ? \"current\" : \"available\","],
  ["any build string counts as the same build", UPD,
    "const sameBuild = typeof data.build !== \"string\" || !currentBuild || data.build === currentBuild;",
    "const sameBuild = true;"],
  ["a failed version request reads as up to date", UPD,
    "if (!r.ok) return { state: \"error\" };",
    "if (!r.ok) return { state: \"current\" };"],

  /* The backup validator. A file must LOOK like a save before it may replace
     a family's history: {"application":"word-quest-backup"} alone once wiped
     real progress and answered "Backup loaded." */
  ["the backup validator stops checking for a words map", APP,
    "!!b.words && typeof b.words === \"object\" && !Array.isArray(b.words) &&",
    ""],
  ["the backup validator stops checking for settings", APP,
    "!!b.settings && typeof b.settings === \"object\" && !Array.isArray(b.settings);",
    "true;"],
  ["the backup validator accepts an array", APP,
    "!!b && typeof b === \"object\" && !Array.isArray(b) &&",
    "!!b && typeof b === \"object\" &&"],

  /* Free play's whole promise to the parent: nothing is ever written. */
  ["free play writes to the save", APP,
    "if (!freePlay) { setState(s); persist(s); }",
    "{ setState(s); persist(s); }"],

  /* B17, fixed 2026-08-15: nothing is armed at grade time — each path that
     learns the reveal's length is the thing that arms. This mutant restores
     the 400 ms starting gun that sat live and green in the middle of a real
     sound-out for ~590 measured milliseconds whenever six cold clips took
     longer than the guard to decode. Killed by reveal test 14, which replays
     the measured fault: clips at 900 ms, control asserted dead at +500. */
  ["the starting gun returns: the guard arms at grade time", APP,
    "if (!s.settings.sound) armAdvance(ADVANCE_GUARD_MS);",
    "armAdvance(ADVANCE_GUARD_MS); if (!s.settings.sound) armAdvance(ADVANCE_GUARD_MS);"],
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
   proof: a mutant that breaks the parse, crashes the runner, or kills the
   environment exits non-zero too, and scoring that as a kill claims
   protection the suite never demonstrated. Three outcomes, not two —
   killed, survived, and errored — and an error fails the gate rather than
   passing as a kill. */
const ANSI = /\[[0-9;]*[A-Za-z]/g;
/* Read the TESTS row, not the TEST FILES row. Vitest prints both, file first:
       Test Files  1 failed | 1 passed (2)
             Tests  2 passed (2)
   A file that throws at import fails as a FILE while zero tests fail, so a
   loose /(\d+) failed/ matched the file row and announced a crashed suite as
   "killed (1 test failed)" - the exact false kill this function exists to
   prevent. Caught by review and reproduced against vitest 2.1.9 on
   2026-08-10. "Tests" plus whitespace cannot match "Test Files": there is no
   "s" after "Test" there. The control below pins both shapes. */
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
    execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--reporter=dot"],
      { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" } });
    return { passed: true, failed: 0 };
  } catch (e) {
    const out = (String(e.stdout || "") + String(e.stderr || "")).replace(ANSI, "");
    return { passed: false, failed: testsFailed(out) };
  }
}
const originals = new Map();
for (const f of new Set(MUTANTS.map((m) => m[1]))) originals.set(f, readFileSync(f, "utf8"));
const restore = () => { for (const [f, src] of originals) writeFileSync(f, src); };

/* THIS TOOL EDITS TRACKED PRODUCTION FILES IN PLACE. If it dies between
   writing a mutant and restoring it - an exception, Ctrl-C, a killed
   container - it leaves app/src mutated in the working tree, where the next
   commit would sweep it up. Restore on every exit path, not only the happy
   one. */
let restored = false;
const restoreOnce = () => { if (!restored) { restored = true; restore(); } };
process.on("exit", restoreOnce);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(sig, () => { restoreOnce(); process.exit(130); });
process.on("uncaughtException", (e) => { restoreOnce(); console.error(e); process.exit(1); });

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

const survivors = [], errored = [];
let missing = 0;
for (const [name, file, from, to] of MUTANTS) {
  const src = originals.get(file);
  if (!src.includes(from)) { console.log("  SKIP (anchor moved): " + name); missing++; continue; }
  writeFileSync(file, src.replace(from, to));
  const r = runTests();
  restore();
  if (r.passed) survivors.push(name);
  else if (r.failed > 0) console.log(`  killed: ${name} (${r.failed} test${r.failed === 1 ? "" : "s"} failed)`);
  else errored.push(name);
}
restore();

const killed = MUTANTS.length - survivors.length - missing - errored.length;
console.log(`\nApp mutation gate: ${MUTANTS.length} mutants, ${killed} killed, ${survivors.length} survived, ${errored.length} errored, ${missing} skipped`);
survivors.forEach((s) => console.log("  SURVIVED: " + s));
errored.forEach((s) => console.log("  ERRORED (the run died without a test failure, so nothing was proven): " + s));
if (missing) console.log("  Anchors that moved must be re-pointed, not deleted.");
process.exit(survivors.length || missing || errored.length ? 1 : 0);
