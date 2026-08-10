/* App-side mutation gate (G19). G5 mutates the engine; nothing mutated the
   half of the product the child actually touches. So the app's tests were
   known to PASS, and not known to BITE.
   Command: npm run test:app-mutants   Requirement: 0 survivors.

   Each mutant breaks one rule that a person would notice, in the files the
   engine never sees: the transcript acceptance rule, the adult hold, the
   update comparison, the backup validator, and the free-play write guard.
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
  /* The transcript rule: what the app is allowed to call a reading. S1 says
     speech recognition may only ever CONFIRM a correct reading. */
  ["a sentence counts as a reading (2 words to 3)", APP,
    "const MAX_HEARD_WORDS = 2;", "const MAX_HEARD_WORDS = 3;"],
  ["the length guard on a heard phrase is dropped", APP,
    "return m(clean) || (toks.length <= MAX_HEARD_WORDS && toks.some(m));",
    "return m(clean) || toks.some(m);"],
  ["a word merely CONTAINED in the transcript is accepted", APP,
    "const m = t => t === word || (HOMOPHONES[word] || []).includes(t);",
    "const m = t => t.includes(word) || (HOMOPHONES[word] || []).includes(t);"],
  ["a failed match records a miss by itself (breaks S1)", APP,
    'if (ok) grade("correct"); else setPhase("heard");',
    'if (ok) grade("correct"); else grade("wrong");'],

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
];

const run = (cmd, args) => { try { execFileSync(cmd, args, { stdio: "pipe" }); return true; } catch { return false; } };
const originals = new Map();
for (const f of new Set(MUTANTS.map((m) => m[1]))) originals.set(f, readFileSync(f, "utf8"));
const restore = () => { for (const [f, src] of originals) writeFileSync(f, src); };

run("node", ["tools/extract-engine.mjs"]);
if (!run("npx", ["vitest", "run", "--reporter=dot"])) {
  console.error("Runner control FAILED: the pristine suite does not pass; mutation results would be meaningless.");
  process.exit(1);
}

const survivors = [];
let missing = 0;
for (const [name, file, from, to] of MUTANTS) {
  const src = originals.get(file);
  if (!src.includes(from)) { console.log("  SKIP (anchor moved): " + name); missing++; continue; }
  writeFileSync(file, src.replace(from, to));
  const passed = run("npx", ["vitest", "run", "--reporter=dot"]);
  restore();
  if (passed) survivors.push(name);
  else console.log("  killed: " + name);
}
restore();

const killed = MUTANTS.length - survivors.length - missing;
console.log(`\nApp mutation gate: ${MUTANTS.length} mutants, ${killed} killed, ${survivors.length} survived, ${missing} skipped`);
survivors.forEach((s) => console.log("  SURVIVED: " + s));
if (missing) console.log("  Anchors that moved must be re-pointed, not deleted.");
process.exit(survivors.length || missing ? 1 : 0);
