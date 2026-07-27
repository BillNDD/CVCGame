/* Doc-truth gate (G16). The documents are the master source, so a document
   that describes behaviour the code does not have is a defect — and one that
   no test could see before this gate existed.

   The fault this gate is built from: QA step 32 promised that a dead
   microphone "switches to grown-up grading for this visit". The code never
   did that. A person ran the step, read a promise, saw something else, and
   had no way to tell which was wrong. Counting steps (G12) cannot catch it;
   only binding the words to the code can.

   Four rules, every expected value read from the document and checked
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

   Negative control: --self-test corrupts each document in memory and
   requires every detector to fire.
   Run: node tools/doc-truth.mjs */
import { readFileSync } from "node:fs";

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
  "app/src/components/HoldButton.jsx", "src/engine.js",
];
const real = {
  spec: readFileSync("SPEC.md", "utf8"),
  qa: readFileSync("docs/qa-procedure.md", "utf8"),
  pack: readFileSync("app/public/voice/manifest.json", "utf8"),
  app: readFileSync("app/src/App.jsx", "utf8"),
  engine: readFileSync("src/engine.js", "utf8"),
  hold: readFileSync("app/src/components/HoldButton.jsx", "utf8"),
  corpus: SOURCES.map((f) => readFileSync(f, "utf8")).join("\n"),
};

/* The sentences SPEC section 8 pins in its microphone block, as a fenced
   table of `name "sentence"` lines. Reading them out of the document means a
   sentence added there is checked from the moment it is written. */
function specSentences(spec) {
  const block = spec.slice(spec.indexOf("2. Microphone:"), spec.indexOf("3. Storage:"));
  return [...block.matchAll(/^\s{3}\w[\w ]*\s+"([^"]+)"$/gm)].map((m) => m[1]);
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
  for (const s of specSentences(d.spec)) {
    if (!d.app.includes(s)) found.push(`SPEC sentence missing from the app: "${s}"`);
  }

  rules += 1;
  for (const s of qaSentences(d.qa)) {
    if (!d.corpus.includes(s)) found.push(`QA sentence missing from the app: "${s}"`);
  }

  rules += 1;
  const watchdog = num(d.app, "WATCHDOG_MS");
  const grace = num(d.app, "GRACE_MS");
  const specWatchdog = /no sign of life for (\d+) seconds/.exec(d.spec);
  const specGrace = /(\d+)-second grace window/.exec(d.spec);
  const qaTotal = /Within about (\d+) seconds/.exec(d.qa);
  if (!specWatchdog || Number(specWatchdog[1]) * 1000 !== watchdog)
    found.push(`SPEC watchdog says ${specWatchdog ? specWatchdog[1] + " s" : "nothing"}, the code says ${watchdog} ms`);
  if (!specGrace || Number(specGrace[1]) * 1000 !== grace)
    found.push(`SPEC grace says ${specGrace ? specGrace[1] + " s" : "nothing"}, the code says ${grace} ms`);
  if (!qaTotal || Number(qaTotal[1]) * 1000 !== watchdog + grace)
    found.push(`QA says the rescue takes about ${qaTotal ? qaTotal[1] : "?"} s, the code takes ${(watchdog + grace) / 1000} s`);

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

  return { found, rules };
}

if (process.argv.includes("--self-test")) {
  const seen = { spec: false, qa: false, timing: false, hold: false, recipe: false };

  const specCorrupt = { ...real, spec: real.spec.replace(/^(\s{3}retry\s+)"[^"]+"$/m, '$1"A sentence the app never says."') };
  seen.spec = run(specCorrupt).found.some((p) => p.startsWith("SPEC sentence missing"));

  const qaCorrupt = { ...real, qa: real.qa.replace(/"Didn\u2019t catch that \u2014 tap to try again\."/, '"The microphone gave up completely."') };
  seen.qa = run(qaCorrupt).found.some((p) => p.startsWith("QA sentence missing"));

  const timingCorrupt = { ...real, qa: real.qa.replace(/Within about \d+ seconds/, "Within about 3 seconds") };
  seen.timing = run(timingCorrupt).found.some((p) => p.startsWith("QA says the rescue takes"));

  const holdCorrupt = { ...real, hold: real.hold.replace(/const HOLD_MS = \d+/, "const HOLD_MS = 120") };
  seen.hold = run(holdCorrupt).found.some((p) => p.startsWith("SPEC hold says"));

  /* Exactly the fault this rule was written from: the document keeps a number
     the pack no longer uses. */
  const recipeCorrupt = { ...real, spec: real.spec.replace(/word clips at speed [\d.]+/, "word clips at speed 0.7") };
  seen.recipe = run(recipeCorrupt).found.some((p) => p.startsWith("SPEC says word speed 0.7"));

  if (Object.values(seen).every(Boolean)) {
    console.log("self-test OK: a reworded SPEC sentence, a reworded QA promise, a wrong timing, a changed hold constant, and a stale recipe number in the document are all caught");
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
