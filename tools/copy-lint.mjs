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
import { sourcesFor, staleExclusions } from "./app-sources.mjs";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { LEVELS, TRICKY, feedbackParts, feedbackSpeech, newState, PRAISE, VOICE_SENTENCES } from "../src/engine.js";

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
  /* DERIVED, not listed (owner-ruled 2026-08-17). Every app source is scanned
     unless tools/app-sources.mjs excludes it with a written reason, so a new
     screen is covered from the moment it exists. Three gates each kept a
     hand-written list and all three had drifted the same way. */
  const files = sourcesFor("copy");

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
  /* The pre-ladder's three feedback lines (SPEC section 5, added 2026-08-15):
     the same sentences' openings, stopped where the word would begin, pinned
     against the screen that renders them. The auditor found them ungated. */
  const preScreen = readFileSync("app/src/screens/PreSessionScreen.jsx", "utf8");
  check(preScreen.includes('"🎉 Great job!"'), "pre feedback (correct)", "PreSessionScreen has lost its exact line");
  check(preScreen.includes('"💪 Good try!"'), "pre feedback (close)", "PreSessionScreen has lost its exact line");
  check(preScreen.includes('"🔁 Let’s try that again."'), "pre feedback (wrong)", "PreSessionScreen has lost its exact line");
  /* BUILD-IT's own sentences (SPEC section 12, owner-approved 2026-08-17).
     Pinned by exact text against the screens that render them, the same way
     the pre-ladder's three lines are, because the banned-word rule alone would
     accept any rewording: measured before this was added, all thirteen of the
     mode's strings passed a corpus that checks only for words like "wrong".
     A deliberate change to any of these is a one-line diff here; an accidental
     one is a red build. */
  const buildScreen = readFileSync("app/src/screens/BuildItScreen.jsx", "utf8");
  const homeScreen = readFileSync("app/src/screens/HomeScreen.jsx", "utf8");
  const pinned = [
    /* The chooser became a grid on 2026-08-21 (owner-ruled from a mock): the
       Build row reads "Build a level word" | "Build any word", the Sounds row
       "Find a Pre N sound" - the level number is rendered, so the pin holds
       the literal prefix the JSX carries. */
    [homeScreen, '🧱 Build a level word', "chooser cell (build, this level)"],
    [homeScreen, '🎲 Build any word', "chooser cell (build, any word)"],
    [homeScreen, '🔎 Find a Pre {preLevel} sound', "chooser cell (the ladder)"],
    [homeScreen, '🎲 Any word', "chooser cell (words, any)"],
    [homeScreen, '🎲 Any sentence', "chooser cell (sentences, any)"],
    [homeScreen, 'Building needs sound. Turn sound on in the Grown-ups corner.', "sound-off note"],
    [buildScreen, '🔊 Hear the word', "prompt control (words)"],
    [buildScreen, '🔊 Hear the sound', "prompt control (the ladder)"],
    [buildScreen, 'That says ', "miss lead (words)"],
    [buildScreen, '… listen again.', "miss tail"],
    [buildScreen, 'That is a different sound', "miss lead (the ladder)"],
    [buildScreen, 'Watch where each sound goes, then copy it.', "help after two misses (words)"],
    [buildScreen, 'Watch which tile it is, then tap it.', "help after two misses (the ladder)"],
    [buildScreen, '🎉 You built ', "win (words)"],
    [buildScreen, '🎉 You found it!', "win (the ladder)"],
    [buildScreen, 'practice only · nothing is saved here', "the grown-up strip"],
  ];
  for (const [src, text, name] of pinned)
    check(src.includes(text), "build-it copy: " + name, `the screen has lost "${text}"`);

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
  for (const s of staleExclusions()) check(false, "stale scan exclusion", s);
  for (const { f, t } of corpus) check(!BANNED.test(t), "banned word in child copy", `${f}: "${t.trim()}"`);
  for (const p of praise) check(!BANNED.test(p), "banned word in praise", p);

  // 3. the tricky-word notes, exact
  rules.add("tricky-notes");
  /* The screen and the sound-out must say the same vowel. They disagreed:
     this note read "wuz" while the reveal played short_o, "woz". The owner
     ruled on 2026-08-11 for AMERICAN pronunciation, since the voice itself is
     American, so the note stands and the SOUND moved to short_u to meet it.
     "wash" keeps the o-sound and its own note, which is standard American.
     "what" did NOT: it kept short_o by inheritance until 2026-08-12, when the
     agreement check found that every phonemisation of the word — including the
     carrier its shipped clip was cut from — says /wʌt/, and the owner, offered
     the whole sound-out both ways, refused w-o-t. The note moved with the
     sound, which is the only state this rule permits: the screen and the
     sound-out say the same vowel or one of them is lying to a child. */
  check(notes.was === "Tricky word! The a sounds like “uh” — wuz.", "tricky note (was)", notes.was);
  check(notes.is === "Tricky word! The s sounds like “z” — iz.", "tricky note (is)", notes.is);
  check(notes.has === "Tricky word! The s sounds like “z” — haz.", "tricky note (has)", notes.has);
  check(notes.wash === "Tricky word! The a sounds like “o” — wosh.", "tricky note (wash)", notes.wash);
  check(notes.push === "Tricky word! The u sounds like “oo” — poosh.", "tricky note (push)", notes.push);
  check(notes.bush === "Tricky word! The u sounds like “oo” — boosh.", "tricky note (bush)", notes.bush);
  check(notes.she === "Tricky word! The e sounds like “ee” — shee.", "tricky note (she)", notes.she);
  check(notes.the === "Tricky word! The e sounds like “uh” — thuh.", "tricky note (the)", notes.the);
  check(notes.what === "Tricky word! The a sounds like “uh” — wut.", "tricky note (what)", notes.what);
  /* The fourteen heart-word notes (J1), owner-approved 2026-08-15 from a
     decision page, pinned word for word like the nine above: this copy is
     read aloud by a grown-up to a child at the teaching moment, and a drifted
     note is a lesson mis-taught. */
  check(notes.to === "Tricky word! The o sounds like “oo” — too.", "tricky note (to)", notes.to);
  check(notes.do === "Tricky word! The o sounds like “oo” — doo.", "tricky note (do)", notes.do);
  check(notes.you === "Tricky word! The ou sounds like “oo” — yoo.", "tricky note (you)", notes.you);
  check(notes.said === "Tricky word! The ai sounds like “eh” — sed.", "tricky note (said)", notes.said);
  check(notes.my === "Tricky word! The y says a letter name — “eye”.", "tricky note (my)", notes.my);
  check(notes.of === "Tricky word! The o sounds like “uh” and the f sounds like “v” — uv.", "tricky note (of)", notes.of);
  check(notes.a === "Tricky word! On its own, a says a lazy “uh”.", "tricky note (a)", notes.a);
  check(notes.we === "Tricky word! The e says its name — wee.", "tricky note (we)", notes.we);
  check(notes.me === "Tricky word! The e says its name — mee.", "tricky note (me)", notes.me);
  check(notes.he === "Tricky word! The e says its name — hee.", "tricky note (he)", notes.he);
  check(notes.be === "Tricky word! The e says its name — bee.", "tricky note (be)", notes.be);
  check(notes.go === "Tricky word! The o says its name — go.", "tricky note (go)", notes.go);
  check(notes.no === "Tricky word! The o says its name — no.", "tricky note (no)", notes.no);
  check(notes.so === "Tricky word! The o says its name — so.", "tricky note (so)", notes.so);
  check(notes.i === "Tricky word! The i says its name — I.", "tricky note (i)", notes.i);
  check(Object.keys(notes).length === 35, "tricky note count", String(Object.keys(notes).length));  // 28 -> 32 on 2026-08-20: into, find, old, hold - the hybrid ruling's four; 32 -> 35 the same evening: come, some, love - the magic-e rule's tricky three ("come love some marked tricky", owner), re-typed by hand. have bends without a note: its sound never changes, the bend only shields it from the rule.

  /* Rule 3b lived here: the five adult notes, pinned word for word. It
     retired with the microphone on 2026-08-12 — the note existed to explain
     that recognition could not judge a word fairly, and there is no
     recognition. The rule count drops 6 -> 5 because a whole family of copy
     stopped existing, not because a family stopped being checked. */
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
};

if (process.argv.includes("--self-test")) {
  const corrupted = structuredClone(real);
  corrupted.leads.correct = "Great job! That was ";
  corrupted.corpus = [...real.corpus, { f: "fixture", t: "You are wrong, try harder" }];
  corrupted.praise = [...real.praise];
  corrupted.praise[2] = "Not bad, you got it right!";
  corrupted.praise[5] = "Can you say b?";
  corrupted.voice = { ...real.voice, "s:was": "The word is" };
  // built at runtime so this file's own source never contains a matchable email
  corrupted.tracked = [...real.tracked, { f: "fixture.md", t: "Contact firstname.lastname" + "@" + "some-personal-mail.net for help" }];
  const { found } = run(corrupted);
  const sawLead = found.some((p) => p.startsWith("feedback lead (correct)"));
  const sawBanned = found.some((p) => p.startsWith("banned word in child copy"));
  const sawEmail = found.some((p) => p.startsWith("email address"));
  const sawPraise = found.some((p) => p.startsWith("praise list")) && found.some((p) => p.startsWith("banned word in praise"));
  const sawLetter = found.some((p) => p.startsWith("letter name in praise"));
  const sawVoice = found.some((p) => p.startsWith("voice sentences"));
  if (sawLead && sawBanned && sawEmail && sawPraise && sawLetter && sawVoice) {
    console.log("self-test OK: a changed sentence, a banned word, a planted email, a reworded praise, a letter-name praise, and a swapped voice stem are all caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawLead, sawBanned, sawEmail, sawPraise, sawLetter, sawVoice }));
  process.exit(1);
}

const { found, rules: ruleCount, words } = run(real);
rule(found.length === 0, "child-facing copy clean", found.join("; "));
console.log(`Copy gate: ${ruleCount} rules over ${real.corpus.length} copy strings, ${real.tracked.length} tracked files, and ${words} words, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
