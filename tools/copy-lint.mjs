/* Child-facing copy gate (G11). Five rules, every expected value a literal:
   1. The three feedback sentences equal SPEC section 5, character for
      character (checked through the live engine functions).
   2. Child-facing copy never contains a banned negative word. Adult-facing
      settings copy (ParentScreen) is out of scope.
   3. The two tricky-word notes are present and exact.
   4. Speech strings never contain a single-letter token, for every one of
      the 260 bank words: speech says full words, never letter names.
   5. No tracked file contains an email address, and the default child name
      is empty (safety rule S9: no personal data in the repository).
   The reported rule count is computed from the rule families that actually
   ran, so a deleted rule cannot keep reporting itself.
   Negative control: --self-test corrupts copies in memory and requires the
   detectors to fire.
   Run: npm run lint:copy */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { LEVELS, TRICKY, feedbackParts, feedbackSpeech, newState, PRAISE, VOICE_SENTENCES, ADULT_JUDGED, adultNote } from "../src/engine.js";

const problems = [];
const rule = (okay, name, detail) => {
  if (okay) console.log("ok: " + name);
  else problems.push(name + (detail ? " — " + detail : ""));
};

const BANNED = /\b(wrong|bad|fail|failure|incorrect|error|oops|try harder)\b/i;
const LETTER_NAME = /(^| )[a-z]([ .,!?]|$)/;

/* Child-facing copy corpus: JSX text and multi-word strings from the child
   screens, comments stripped. ParentScreen is adult-facing (out of scope). */
function childCopy() {
  const files = [
    "app/src/App.jsx",
    "app/src/screens/HomeScreen.jsx",
    "app/src/screens/SessionScreen.jsx",
    "app/src/screens/DoneScreen.jsx",
  ];
  const texts = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    // spans with code tokens are fragments the regex caught between two strings
    for (const m of src.matchAll(/"([^"\n]*[a-z] [a-z][^"\n]*)"/gi))
      if (!/[(){};|=]/.test(m[1])) texts.push({ f, t: m[1] });
    for (const m of src.matchAll(/>([^<>{}\n]*[a-z] [a-z][^<>{}\n]*)</gi)) texts.push({ f, t: m[1] });
  }
  return texts;
}

function run(d) {
  const { leads, notes, corpus, tracked, praise, voice } = d;
  const found = [];
  const rules = new Set();
  const check = (okay, name, detail) => { if (!okay) found.push(name + " — " + detail); };

  // 1. the exact SPEC section 5 sentences, through the live engine
  rules.add("sentences");
  check(leads.correct === "Great job! That is ", "feedback lead (correct)", leads.correct);
  check(leads.close === "Good try! The correct pronunciation is ", "feedback lead (close)", leads.close);
  check(leads.wrong === "Let’s try that again. The correct pronunciation is ", "feedback lead (wrong)", leads.wrong);
  check(leads.sCorrect === "Great job! The word was cat.", "speech (correct)", leads.sCorrect);
  check(leads.sClose === "Good try! The word is cat.", "speech (close)", leads.sClose);
  check(leads.sWrong === "Let’s try again. The word is cat.", "speech (wrong)", leads.sWrong);
  const PRAISE_EXPECTED = [
    "Great job!",
    "You did it!",
    "You knew just what to do with that word!",
    "How do you feel about saying that word correctly?",
    "You worked that out on your own!",
    "Your reading is getting stronger every day!",
    "You should feel proud of that one!",
    "That was tricky, and you got it!",
    "You sounded that one out beautifully!",
    "What careful reading that was!",
    "Sound by sound, you built the whole word!",
    "You took your time and got it just right!",
    "That word had no chance against you!",
    "You stuck with it, and it paid off!",
    "You made that look easy!",
    "High five! You earned that one!",
    "Every sound in its place — wonderful!",
  ];
  check(JSON.stringify(praise) === JSON.stringify(PRAISE_EXPECTED), "praise list", JSON.stringify(praise));
  const VOICE_EXPECTED = {
    "s:was": "The word was",
    "s:is": "The word is",
    "l:close": "Good try!",
    "l:wrong": "Let’s try again.",
    "e:done": "All done! Great reading today!",
    "e:levelup": "Amazing! Level up!",
  };
  check(JSON.stringify(voice) === JSON.stringify(VOICE_EXPECTED), "voice sentences", JSON.stringify(voice));

  // 2. no banned word in child-facing copy
  rules.add("banned-words");
  for (const { f, t } of corpus) check(!BANNED.test(t), "banned word in child copy", `${f}: "${t.trim()}"`);
  for (const p of praise) check(!BANNED.test(p), "banned word in praise", p);

  // 3. the tricky-word notes, exact
  rules.add("tricky-notes");
  check(notes.was === "Tricky word! The a sounds like “uh” — wuz.", "tricky note (was)", notes.was);
  check(notes.is === "Tricky word! The s sounds like “z” — iz.", "tricky note (is)", notes.is);
  check(notes.has === "Tricky word! The s sounds like “z” — haz.", "tricky note (has)", notes.has);
  check(notes.wash === "Tricky word! The a sounds like “o” — wosh.", "tricky note (wash)", notes.wash);
  check(notes.push === "Tricky word! The u sounds like “oo” — poosh.", "tricky note (push)", notes.push);
  check(notes.bush === "Tricky word! The u sounds like “oo” — boosh.", "tricky note (bush)", notes.bush);
  check(notes.she === "Tricky word! The e sounds like “ee” — shee.", "tricky note (she)", notes.she);
  check(notes.the === "Tricky word! The e sounds like “uh” — thuh.", "tricky note (the)", notes.the);
  check(notes.what === "Tricky word! The a sounds like “o” — wot.", "tricky note (what)", notes.what);
  check(Object.keys(notes).length === 9, "tricky note count", String(Object.keys(notes).length));

  // 3b. the adult's note for a word recognition cannot judge, exact
  rules.add("adult-notes");
  const NOTE_EXPECTED = {
    am: 'Parent: "am" and "m" are nearly indistinguishable, please act as judge here',
    an: 'Parent: "an" and "n" are nearly indistinguishable, please act as judge here',
    ax: 'Parent: "ax" and "x" are nearly indistinguishable, please act as judge here',
    if: 'Parent: "if" and "f" are nearly indistinguishable, please act as judge here',
    us: 'Parent: "us" and "s" are nearly indistinguishable, please act as judge here',
  };
  const notesGiven = Object.fromEntries(Object.keys(d.judged).map((w) => [w, d.note(w)]));
  check(JSON.stringify(notesGiven) === JSON.stringify(NOTE_EXPECTED), "adult notes", JSON.stringify(notesGiven));

  // 4. no letter names in speech, for every bank word
  rules.add("letter-names");
  let words = 0;
  for (const w of LEVELS.flatMap((l) => l.words)) {
    words += 1;
    for (const r of ["correct", "close", "wrong"])
      check(!LETTER_NAME.test(feedbackSpeech(r, w).map((p) => p.text).join(" ")), "letter name in speech", `${r}/${w}`);
  }
  for (const p of praise) check(!LETTER_NAME.test(p), "letter name in praise", p);

  // 5. no personal data in the repository (safety rule S9)
  rules.add("no-personal-data");
  const EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
  for (const { f, t } of tracked) {
    const hit = t.match(EMAIL);
    check(!hit || /noreply|example\.(com|org)/.test(hit[0]), "email address in a tracked file", `${f}: ${hit && hit[0]}`);
  }
  check(newState().settings.childName === "", "default child name is not empty", newState().settings.childName);

  return { found, rules: rules.size, words };
}

function trackedTextFiles() {
  const names = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => /\.(md|js|jsx|mjs|json|yml|html|css|webmanifest|feature|gitignore|gitattributes)$/.test(f) || !f.includes("."))
    // lockfiles carry npm package authors' public emails, not personal data
    .filter((f) => !f.endsWith("package-lock.json"));
  return names.map((f) => { try { return { f, t: readFileSync(f, "utf8") }; } catch { return { f, t: "" }; } });
}

const real = {
  leads: {
    correct: feedbackParts("correct", "cat").lead,
    close: feedbackParts("close", "cat").lead,
    wrong: feedbackParts("wrong", "cat").lead,
    sCorrect: feedbackSpeech("correct", "cat").map((p) => p.text).join(" "),
    sClose: feedbackSpeech("close", "cat").map((p) => p.text).join(" "),
    sWrong: feedbackSpeech("wrong", "cat").map((p) => p.text).join(" "),
  },
  notes: { ...TRICKY },
  corpus: childCopy(),
  tracked: trackedTextFiles(),
  praise: PRAISE,
  voice: VOICE_SENTENCES,
  judged: { ...ADULT_JUDGED },
  note: adultNote,
};

if (process.argv.includes("--self-test")) {
  /* structuredClone cannot carry a function, and the note composer is one. */
  const { note: realNote, ...cloneable } = real;
  const corrupted = { ...structuredClone(cloneable), note: realNote };
  corrupted.leads.correct = "Great job! That was ";
  corrupted.corpus = [...real.corpus, { f: "fixture", t: "You are wrong, try harder" }];
  corrupted.praise = [...real.praise];
  corrupted.praise[2] = "Not bad, you got it right!";
  corrupted.praise[5] = "Can you say b?";
  corrupted.voice = { ...real.voice, "s:was": "The word is" };
  // built at runtime so this file's own source never contains a matchable email
  corrupted.tracked = [...real.tracked, { f: "fixture.md", t: "Contact firstname.lastname" + "@" + "some-personal-mail.net for help" }];
  corrupted.judged = { ...real.judged };
  corrupted.note = (w) => (w === "am" ? "Parent: please judge this one" : realNote(w));
  const { found } = run(corrupted);
  const sawLead = found.some((p) => p.startsWith("feedback lead (correct)"));
  const sawBanned = found.some((p) => p.startsWith("banned word in child copy"));
  const sawEmail = found.some((p) => p.startsWith("email address"));
  const sawPraise = found.some((p) => p.startsWith("praise list")) && found.some((p) => p.startsWith("banned word in praise"));
  const sawLetter = found.some((p) => p.startsWith("letter name in praise"));
  const sawVoice = found.some((p) => p.startsWith("voice sentences"));
  const sawNote = found.some((p) => p.startsWith("adult notes"));
  if (sawLead && sawBanned && sawEmail && sawPraise && sawLetter && sawVoice && sawNote) {
    console.log("self-test OK: a changed sentence, a banned word, a planted email, a reworded praise, a letter-name praise, a swapped voice stem, and a reworded adult note are all caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawLead, sawBanned, sawEmail, sawPraise, sawLetter, sawVoice, sawNote }));
  process.exit(1);
}

const { found, rules: ruleCount, words } = run(real);
rule(found.length === 0, "child-facing copy clean", found.join("; "));
console.log(`Copy gate: ${ruleCount} rules over ${real.corpus.length} copy strings, ${real.tracked.length} tracked files, and ${words} words, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
