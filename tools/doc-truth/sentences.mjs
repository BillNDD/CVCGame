/* G16, rules 3 to 7: the sentences, timings, recipe numbers and the chooser
   count the documents state, against the code. Every expected value is read
   out of a document, never typed here; the anchors are this gate's oracle. */

/* The sentences SPEC section 8 pins in its recorded-voice block, as a fenced
   table of `name "sentence"` lines. Reading them out of the document means a
   sentence added there is checked from the moment it is written.

   THE ANCHORS ARE THE FAULT TO WATCH. This used to slice between
   "2. Microphone:" and "3. Storage:". When the microphone was removed on
   2026-08-12 the first anchor would have vanished, indexOf would have returned
   -1, slice(-1, n) would have yielded nonsense, and this function would have
   returned an empty list - so the rule below would have checked ZERO sentences
   and still reported itself as one of the passing rules. A gate that keeps
   counting itself while measuring nothing is worse than no gate. The caller
   refuses an empty list outright, and that refusal has its own control. */
function specSentences(spec) {
  const a = spec.indexOf("2. Recorded voice:"), b = spec.indexOf("3. Storage:");
  if (a < 0 || b < 0 || b <= a) return [];
  return [...spec.slice(a, b).matchAll(/^\s{3}\w[\w ]*\s+"([^"]+)"$/gm)].map((m) => m[1]);
}
/* A rule that checks nothing must SAY so, not pass. */
export function checkSpecSentences(d) {
  const pinned = specSentences(d.spec);
  const found = [];
  if (pinned.length === 0) found.push("SPEC section 8 pins no sentences — the block or its anchors moved, and this rule is checking nothing");
  for (const s of pinned) if (!d.corpus.includes(s)) found.push(`SPEC sentence missing from the app: "${s}"`);
  return found;
}

/* Every double-quoted run on ONE line of the QA script that is long enough to
   be a sentence the app must say. Three exclusions, all named: a quotation
   carrying an ellipsis is a shape, not a literal; the platform's own controls
   belong to iOS and Windows, not to this app; and short labels are control
   names, not copy. Take every quoted run in order, so quotes pair 1-2 and 3-4
   as written. A length filter applied inside the pattern would instead pair
   the CLOSING quote of one string with the OPENING quote of the next, and
   check the prose between them. */
const PLATFORM_CONTROLS = ["Add to Home Screen", "Don't Allow", "Allow", "Add"];
function qaSentences(qa) {
  return [...qa.matchAll(/"([^"\n]*)"/g)]
    .map((m) => m[1])
    .filter((s) => s.length >= 25)
    .filter((s) => !s.includes("...") && !s.includes("…"))
    .filter((s) => !PLATFORM_CONTROLS.includes(s));
}
export function checkQaSentences(d) {
  return qaSentences(d.qa).filter((s) => !d.corpus.includes(s)).map((s) => `QA sentence missing from the app: "${s}"`);
}

const num = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = (\\d+)`));
  return m ? Number(m[1]) : NaN;
};
/* Rule 3 lived here: the 8-second watchdog and the 2-second grace window,
   read out of App.jsx and held against SPEC's prose and QA step 32's "within
   about 10 seconds". All four artefacts - the two constants, the SPEC
   sentences and the QA step - went with the microphone on 2026-08-12. The
   rule count dropped 8 -> 7 because its subject was gone, not because a rule
   was dropped to make a build pass. */
export function checkHold(d) {
  const holdCode = num(d.hold, "HOLD_MS");
  const specHold = /hold an adult result control for\s*\n?\s*(\d+) ms/.exec(d.spec);
  if (!specHold || Number(specHold[1]) !== holdCode) return [`SPEC hold says ${specHold ? specHold[1] : "nothing"} ms, the control waits ${holdCode} ms`];
  return [];
}

/* The recipe SPEC names for the voice pack - the voice, the word speed and
   the bitrate - against the recipe inside the shipped pack. SPEC claimed
   speed 0.7 for months after the pack moved to 0.85, and nothing noticed: a
   reader cannot hear a manifest, and the pack gate cannot read prose. */
function voiceFinding(spec, recipe) {
  const m = /voice `([a-z_]+)`/.exec(spec);
  if (!m || m[1] !== recipe.voice) return `SPEC names voice ${m ? m[1] : "nothing"}, the pack was rendered with ${recipe.voice}`;
  return null;
}
function speedFinding(spec, recipe) {
  const m = /word clips at speed ([\d.]+)/.exec(spec);
  if (!m || Number(m[1]) !== recipe.word_speed) return `SPEC says word speed ${m ? m[1] : "nothing"}, the pack says ${recipe.word_speed}`;
  return null;
}
function bitrateFinding(spec, recipe) {
  const m = /encoded\s*\n?\s*at (\d+) kbps/.exec(spec);
  if (!m || Number(m[1]) !== recipe.bitrate) return `SPEC says ${m ? m[1] : "no"} kbps, the pack says ${recipe.bitrate}`;
  return null;
}
export function checkRecipe(d) {
  const recipe = JSON.parse(d.pack).__recipe || {};
  return [voiceFinding(d.spec, recipe), speedFinding(d.spec, recipe), bitrateFinding(d.spec, recipe)].filter(Boolean);
}

/* Re-sourced at the 2026-08-20 cutover: the chooser DERIVES its count from
   bankWords().length (the owner's ruling), so the derived form passes and a
   TYPED number - even one that happens to equal the bank today - is the
   stale-tomorrow fault this rule was born from. */
export function checkChooser(d) {
  const homeDerived = d.home.includes("any word from all {bankWords().length}");
  const homeCount = /any word from all (\d+)/.exec(d.home);
  if (!homeDerived && (!homeCount || Number(homeCount[1]) !== d.bankSize))
    return [`the chooser copy says all ${homeCount ? homeCount[1] : "?"} words, the bank holds ${d.bankSize}`];
  return [];
}
