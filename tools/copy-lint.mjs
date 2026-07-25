/* Child-facing copy gate (G11). Four rules, every expected value a literal:
   1. The three feedback sentences equal SPEC section 5, character for
      character (checked through the live engine functions).
   2. Child-facing copy never contains a banned negative word. Adult-facing
      settings copy (ParentScreen) is out of scope.
   3. The two tricky-word notes are present and exact.
   4. Speech strings never contain a single-letter token, for every one of
      the 132 bank words: speech says full words, never letter names.
   Negative control: --self-test corrupts copies in memory and requires both
   detectors to fire.
   Run: npm run lint:copy */
import { readFileSync } from "node:fs";
import { LEVELS, TRICKY, feedbackParts, feedbackSpeech } from "../src/engine.js";

const problems = [];
const rule = (okay, name, detail) => {
  if (okay) console.log("ok: " + name);
  else problems.push(name + (detail ? " — " + detail : ""));
};

const BANNED = /\b(wrong|bad|fail|failure|incorrect|error|oops|try harder)\b/i;
const LETTER_NAME = /(^| )[a-z]([ .!]|$)/;

/* Child-facing copy corpus: JSX text and multi-word strings from the child
   screens, comments stripped. ParentScreen is adult-facing (out of scope). */
function childCopy() {
  const files = [
    "app/src/screens/HomeScreen.jsx",
    "app/src/screens/SessionScreen.jsx",
    "app/src/screens/DoneScreen.jsx",
  ];
  const texts = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const m of src.matchAll(/"([^"\n]*[a-z] [a-z][^"\n]*)"/gi)) texts.push({ f, t: m[1] });
    for (const m of src.matchAll(/>([^<>{}\n]*[a-z] [a-z][^<>{}\n]*)</gi)) texts.push({ f, t: m[1] });
  }
  return texts;
}

function run({ leads, notes, corpus }) {
  const found = [];
  const check = (okay, name, detail) => { if (!okay) found.push(name + " — " + detail); };

  // 1. the exact SPEC section 5 sentences, through the live engine
  check(leads.correct === "Great job! That is ", "feedback lead (correct)", leads.correct);
  check(leads.close === "Good try! The correct pronunciation is ", "feedback lead (close)", leads.close);
  check(leads.wrong === "Let’s try that again. The correct pronunciation is ", "feedback lead (wrong)", leads.wrong);
  check(leads.sCorrect === "Great job! cat!", "speech (correct)", leads.sCorrect);
  check(leads.sClose === "Good try! The word is cat.", "speech (close)", leads.sClose);
  check(leads.sWrong === "Let’s try again. The word is cat.", "speech (wrong)", leads.sWrong);

  // 2. no banned word in child-facing copy
  for (const { f, t } of corpus) check(!BANNED.test(t), "banned word in child copy", `${f}: "${t.trim()}"`);

  // 3. the tricky-word notes, exact
  check(notes.was === "Tricky word! The a sounds like “uh” — wuz.", "tricky note (was)", notes.was);
  check(notes.is === "Tricky word! The s sounds like “z” — iz.", "tricky note (is)", notes.is);

  // 4. no letter names in speech, for every bank word
  for (const w of LEVELS.flatMap((l) => l.words))
    for (const r of ["correct", "close", "wrong"])
      check(!LETTER_NAME.test(feedbackSpeech(r, w)), "letter name in speech", `${r}/${w}`);

  return found;
}

const real = {
  leads: {
    correct: feedbackParts("correct", "cat").lead,
    close: feedbackParts("close", "cat").lead,
    wrong: feedbackParts("wrong", "cat").lead,
    sCorrect: feedbackSpeech("correct", "cat"),
    sClose: feedbackSpeech("close", "cat"),
    sWrong: feedbackSpeech("wrong", "cat"),
  },
  notes: { was: TRICKY.was, is: TRICKY.is },
  corpus: childCopy(),
};

if (process.argv.includes("--self-test")) {
  const corrupted = structuredClone(real);
  corrupted.leads.correct = "Great job! That was ";
  corrupted.corpus = [...real.corpus, { f: "fixture", t: "You are wrong, try harder" }];
  const found = run(corrupted);
  const sawLead = found.some((p) => p.startsWith("feedback lead (correct)"));
  const sawBanned = found.some((p) => p.startsWith("banned word"));
  if (sawLead && sawBanned) { console.log("self-test OK: a changed sentence and a banned word are both caught"); process.exit(0); }
  console.error("self-test FAILED: " + JSON.stringify({ sawLead, sawBanned }));
  process.exit(1);
}

const found = run(real);
rule(found.length === 0, "child-facing copy clean", found.join("; "));
console.log(`Copy gate: 4 rules over ${real.corpus.length} copy strings and 132 words, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
