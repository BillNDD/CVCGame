/* The ladder's placement pass: every word of the owner's target vocabulary
   reaches a level, or the build says which ones did not.

   WHY IT EXISTS. tools/ladder/ladder-v4.json places 725 words across 100
   levels and leaves 162 of the 697 target words placed at NO level, while
   eight levels seat zero words and twenty-two seat fewer than six. The
   generator that produced it is not in this repository - it lived in a
   session scratchpad and went with it - so the ladder cannot be regenerated
   and this pass is now the only reproducible way a word gets a seat. The
   generator's own fields say how it lost them: `cands` is the level's
   on-topic candidates and `words` is what it kept, and at 98 of 100 levels
   words.length === min(cands, 10). A word that lost a ten-word cut at the
   one level it was on-topic for was never offered again.

   WHAT IT OWNS. The rule for WHERE a word may sit: at or after the level
   where every grapheme of its greedy longest-match segmentation is taught.
   It does not own the shape (tools/ladder/shape-v3.json), the target
   vocabulary (tools/target-vocab.txt), or whether a word belongs in the
   game at all (SPEC section 12, and the appropriateness screen).

   HOW FAR TO TRUST IT. The segmentation is a heuristic over spellings, not
   a pronunciation dictionary. It cannot know that "read" has two sounds or
   that "buses" is bus+es rather than bu+se. Its errors run one way on
   purpose: a word waits for a later level rather than arriving before the
   child can read it. Every placement it makes still wants a person's eye,
   and a level it leaves under six is a real gap, reported and never padded
   with a word that teaches nothing about that level - the silent fill was
   deleted from the generator once already.

   Run: node tools/ladder-fill.mjs              the plan, written nowhere
        node tools/ladder-fill.mjs --write      apply it to ladder-v4.json
        node tools/ladder-fill.mjs --check      fail if a target word has no seat
        node tools/ladder-fill.mjs --sounds     the word bill of unproved sounds
        node tools/ladder-fill.mjs --self-test  prove the checks catch their faults */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LADDER_DIR = "tools/ladder";
/* THE BAND, and where each number comes from.
   min 6  - the owner's floor, "six is fine for one level". A level below it is
            reported as a gap, never padded.
   soft 12 - the preferred ceiling. The generator capped every level at ten, so
            twelve leaves a full level two free seats. Passing it is allowed but
            never silent.
   hard 20 - the enforced ceiling. SPEC section 6 says "Level sizes can differ;
            the session builder serves 20 words at a time regardless", so twenty
            is one session's serving and the point past which a level stops
            being one sitting's worth of practice.
   All three are arguments, so a fixture can exercise every path with small
   numbers and a caller can ask what a different band would cost. */
export const BAND = { min: 6, soft: 12, hard: 20 };

/* ---------------------------------------------------------- the schedule -- */

/* Graphemes are written grapheme=sound_id in the shape, and a suffix carries a
   leading dash. This pass needs the SPELLING, the earliest level that teaches
   it, and - for the fourteen spellings the shape teaches more than once - which
   level teaches which sound. */
export function inventory(shape) {
  const levels = Array.isArray(shape) ? shape : Object.values(shape);
  const inv = new Map();
  levels.forEach((lv, i) => {
    const raw = String(lv.new || "").trim();
    if (!raw) return;
    for (const tok of raw.split(/[\s,]+/).filter(Boolean)) {
      const [head, sound] = tok.split("=");
      const g = head.replace(/^-+/, "");
      /* A malformed token costs its own place and nothing else. This was
         `return`, which exits the forEach callback and so threw away every
         REMAINING token of that level - one stray "-" or "=long_a" would have
         left the letters written after it taught nowhere, and the words that
         need them unspellable rather than merely late. No level in
         shape-v3.json has an empty head today, so the fix moves no word; the
         control below plants the stray token the real file does not have. */
      if (!g) continue;
      if (!inv.has(g)) inv.set(g, { first: i + 1, sounds: new Map() });
      const e = inv.get(g);
      if (sound && !e.sounds.has(sound)) e.sounds.set(sound, i + 1);
    }
  });
  return inv;
}

/* WHICH LEVEL A UNIT BELONGS TO. Fourteen spellings are taught more than once
   and the default is the earliest, because a child who has met a spelling can
   at least try it. One of them is decided by position rather than by guess:
   a y that starts a word is the consonant of "yes", and a y anywhere else is a
   vowel - the long e of "sandy" when a vowel came before it in the word, the
   long i of "fly" when none did. Without this rule "sandy" is ready at the
   level that teaches /y/, and a child would read it s-a-n-d-yuh.
   The other thirteen - th, ch, ea, ie, ow, oo, ey, ear, ere, c, g, a, s - are
   NOT resolved here. Nothing in this repository records which sound a given
   word uses, so the earliest level stands and a few words are ready a level or
   two before their sound is taught. That is a real limit, written down rather
   than hidden. */
export function levelOf(g, word, p, inv) {
  const e = inv.get(g);
  if (!e) return null;
  if (g === "y" && p > 0) {
    const want = /[aeiou]/.test(word.slice(0, p)) ? "long_e" : "long_i";
    return e.sounds.get(want) || e.first;
  }
  return e.first;
}

/* WHERE A GRAPHEME MAY MATCH. Greedy longest-match is the right instinct - it
   prefers ch to c+h - but a handful of the shape's units are syllable endings
   or fixed pairs, and unconstrained they swallow the front of ordinary words:
   "leg" reads as le+g, "tree" as t+re+e, "time" as ti+me, "animal" as
   a-n-i-m-al, "umbrella" as u-mb-r-e-ll-a. Each rule below is an orthographic
   fact - mb says /m/ only at the end of a word, kn and wr only at the start -
   each is proved by a control, and each can be switched off so the control can
   show it biting. */
const FINAL_ONLY = new Set(["ce", "ge", "se", "ve", "ze", "le", "tle", "re", "mb"]);
const START_ONLY = new Set(["kn", "wr", "gn"]);
const TI_FOLLOWERS = ["on", "ous", "al", "ent", "en"];
/* A split vowel spans three letters - vowel, one consonant, silent e. The
   consonant is never y, w or x (player, boxes), and the e either ends the word
   or carries one of the endings that keep it silent. */
const SPLIT_TAILS = new Set(["", "s", "d", "r", "rs", "st"]);
const SPLIT_MIDS = /^[bcdfghjklmnpqrstvz]$/;

function positionOk(g, w, p, strict) {
  if (!strict) return true;
  const end = p + g.length;
  const rest = w.slice(end);
  if (FINAL_ONLY.has(g)) return end === w.length;
  if (START_ONLY.has(g)) return p === 0 || end === w.length;
  if (g === "tu") return rest === "re";
  if (g === "ti" || g === "ci") return TI_FOLLOWERS.some((t) => rest.startsWith(t));
  if (g === "al") return rest.startsWith("l") || rest.startsWith("k");
  return true;
}

function splitAt(w, p, inv, strict) {
  const g = `${w[p]}_e`;
  if (!inv.has(g) || w[p + 2] !== "e") return null;
  const mid = w[p + 1];
  if (!mid || !inv.has(mid)) return null;
  if (strict && (!SPLIT_MIDS.test(mid) || !SPLIT_TAILS.has(w.slice(p + 3)))) return null;
  return g;
}

/* Greedy longest-match. Returns the units, or null when a letter of the word is
   taught nowhere - which is a fact worth reporting, never worth skipping. */
export function segment(word, inv, opts = {}) {
  const strict = opts.strict !== false;
  const maxLen = opts.maxLen || 4;
  const w = String(word).toLowerCase();
  const units = [];
  let p = 0;
  while (p < w.length) {
    let best = 0;
    let unit = null;
    for (let len = Math.min(maxLen, w.length - p); len >= 1; len -= 1) {
      const g = w.slice(p, p + len);
      if (inv.has(g) && positionOk(g, w, p, strict)) { best = len; unit = g; break; }
    }
    const sp = splitAt(w, p, inv, strict);
    if (sp && best < 3) { best = 3; unit = sp; }
    if (!best) return null;
    units.push(unit);
    p += best;
  }
  return units;
}

/* The units of a word WITH the position of each, which every rule below needs
   and which the unit list alone throws away. A split vowel spans three letters
   and reports as one unit, so the arithmetic is not the string length. */
export function unitsOf(word, inv, opts = {}) {
  const units = segment(word, inv, opts);
  if (!units) return null;
  const out = [];
  let p = 0;
  for (const g of units) {
    out.push({ g, p });
    p += /_e$/.test(g) ? 3 : g.length;
  }
  return out;
}

/* The earliest level at which every grapheme of the word has been taught. */
export function readyLevel(word, inv, opts = {}) {
  const units = unitsOf(word, inv, opts);
  if (!units) return null;
  const w = String(word).toLowerCase();
  let max = 1;
  for (const u of units) max = Math.max(max, levelOf(u.g, w, u.p, inv));
  return max;
}

/* --------------------------------------------- which SOUND, not which spelling -- */

/* THE FAULT THIS LAYER IS FOR, and it is open-faults section U. Everything
   above asks whether every GRAPHEME of a word is taught by a level. Nothing
   above asks WHICH SOUND the word needs from a grapheme that has more than
   one, and `levelOf` resolves all thirteen of them to the EARLIEST level - the
   permissive direction. `town` was seated at 65, which teaches `ow` as the long
   o of throw; the word needs the /au/ of out, taught at 77. A child reads
   "tone". That is the dangerous shape, because "tone" is a real word, so
   nothing signals the error and the child cannot self-correct. Four more were
   found the same way, by a human reader, and by no gate.

   THE MODEL, AND WHY THIS ONE. Section U offered two. A word DECLARES which
   sound it needs, which is precise and needs per-word data this repository does
   not have for the 887 placed words. Or the model DECLINES to place any word
   using a multi-sound spelling until every sound of it is taught, which needs
   no data at all - and, measured rather than guessed, would hold back 281 of
   the 887, `at`, `an`, `cat` and `sat` among them, because the letter `a` is
   taught twice. A report nobody can read is a report nobody reads, and that
   one would have been dismissed at its first line.

   So: a third. Each multi-sound spelling gets a RESOLVER, and a resolver only
   ever answers where English leaves no choice. `c` before a, o, u or a
   consonant is /k/ and there is no exception; before e, i or y it refuses,
   because gem and get are both real. Four spellings have such a rule, nine do
   not, and a spelling with no rule is judged against ALL of its sounds. The
   errors run the same way the segmentation's do: a refusal costs a line in a
   report a person reads, and never a wrong sound in a child's ear. That takes
   326 raw hits to 88, over 79 words, which is a word bill somebody can hold.

   IT REPORTS. IT NEVER MOVES A WORD. `readyLevel`, `levelOf`, `plan` and
   `check` answer exactly what they answered before this layer existed. All
   sixty-one controls that pinned them are unchanged and still pass, the
   `seatedEarly` lookup still reads 23, and the 162 seats in ladder-v4.json are
   untouched. The only edit above this comment is `readyLevel` calling
   `unitsOf` for the position arithmetic it used to do inline, so the two
   layers cannot drift apart on where a unit sits. Placement is the owner's
   call and he has already ruled on several of these one at a time. The reasons
   `check()` does not FAIL on this are with `soundBill` below.

   WHAT IT STILL CANNOT SEE, and this is the larger fault of the two. It only
   asks about a spelling the shape teaches TWICE. A word needing a sound the
   shape teaches NOWHERE for its spelling is invisible to it, and section U
   names three such words itself: `come`, `love` and `some` sit at 64 because
   `o_e` is taught there as the long o of nose, and the /u/ they say is taught
   at no level for any spelling. `finally` needs a long i in an open syllable
   and `child` needs one before ld, and `i` is short-i-only everywhere in the
   shape. So do `want`, `wash`, `what`, `watch`, `swan`, `swap` and `squash`,
   whose `a` after a w says the short o of pot. Nothing here catches one of
   them, and nothing can without per-word sound data, which is section U's
   first option and still has no source. Their absence from this bill is not
   evidence they are safe. */

/* Consonant clusters an English word can BEGIN with. Used for one thing: the
   maximal onset principle, which decides which syllable the consonants before
   a final y belong to. Doubled letters are absent on purpose - no word starts
   pp - and so are nd, ck and lt, which is what makes sandy, lucky and salty
   long e while butterfly is long i. */
const ONSET_BLENDS = new Set(["bl", "br", "ch", "cl", "cr", "dr", "fl", "fr",
  "gl", "gr", "ph", "pl", "pr", "qu", "sc", "sh", "sk", "sl", "sm", "sn", "sp",
  "st", "sw", "th", "tr", "tw", "wh", "wr"]);

/* Does this unit carry the vowel of a syllable? `qu` is the one the letters
   alone get wrong: it holds a u and spells /kw/, two consonants. */
function vowelUnit(g) {
  return g !== "qu" && (/_e$/.test(g) || /[aeiouy]/.test(g));
}

/* THE RESOLVERS. Each takes the lower-cased word, the position of the unit,
   the whole unit list and the unit's index, and returns a sound id or null.
   Null means "this model cannot tell", which is an answer and not a failure:
   it is what sends the word to a person. Nine of the thirteen multi-sound
   spellings - ch, th, ea, ie, ow, oo, ey, ear, ere - are absent from this
   table because no rule over the spelling decides them. bear and hear, book
   and moon, throw and town differ by which word it is, and nothing here knows
   that. Naming a rule for them would be inventing one. */
export const SOUND_RULES = {
  /* c is /s/ before e, i or y and /k/ everywhere else. The hard direction has
     no exception in English (cat, cop, cup, clap, picnic, act); the soft one
     has several, so it refuses and the word is reported. */
  c: (w, p) => (/[eiy]/.test(w[p + 1] || "") ? null : "k"),
  /* g is /g/ before a, o, u, a consonant or the end of a word (gap, got, gum,
     glad, bag). Before e, i or y it is usually /j/ - gem, giant - and
     sometimes not - get, give, girl, gift - so it refuses. That costs five
     words in today's ladder, and five reported words is cheaper and more
     honest than a hand-written list of exceptions. */
  g: (w, p) => (/[eiy]/.test(w[p + 1] || "") ? null : "g"),
  /* The shape teaches a=long_a at exactly one level, and that level's own rule
     is `open_multi`: the long a of an OPEN syllable in a longer word - ta-ble,
     na-tion, an-cient. So an a whose syllable is CLOSED, meaning two consonant
     units follow it or consonants run to the end of the word, is the short a
     and nothing else: cat, hand, catnip, lamb, backpack. Everything else
     refuses. One consonant then a vowel may be either (table, nation), and a
     word-final a is the schwa of banana, which the shape teaches nowhere. */
  a: (w, p, units, i) => {
    const after = units.slice(i + 1);
    if (!after.length) return null;
    let cons = 0;
    while (cons < after.length && !vowelUnit(after[cons].g)) cons += 1;
    return cons >= 2 || cons === after.length ? "short_a" : null;
  },
  /* y is the consonant of yes at the start of a word and a vowel anywhere
     else. WHICH vowel is the maximal onset principle: the consonants between
     the last vowel and the y begin the y's own syllable when they can, and end
     the syllable before it when they cannot. but-ter-fly has fl, which words
     do begin with, so the y is the long i of a stressed final syllable;
     san-dy has nd, which no English word begins with, so the split falls
     before the d and the y is the long e of sandy.
     `levelOf` has its own y rule and it is the WHOLE-WORD test - any vowel
     anywhere earlier makes it long e - which reads butterfly as long e and
     seats it at 51 when the sound it needs arrives at 52. That rule is left
     exactly as it was, because correcting it would MOVE a word, and this layer
     reports. A control below pins the disagreement as deliberate rather than
     leaving two rules to drift apart unnoticed.
     Its own limit, stated: -fy words (satisfy, occupy) put a single consonant
     before a long i, so this rule reads them as long e and misses them. None
     is in the ladder today. */
  y: (w, p) => {
    if (p === 0) return "y";
    const before = w.slice(0, p);
    const run = before.replace(/^.*[aeiou]/, "");
    if (run.length === before.length) return "long_i";
    return run.length >= 2 && ONSET_BLENDS.has(run.slice(-2)) ? "long_i" : "long_e";
  },
};

/* The sounds a unit could need, and where each is taught. A resolved unit
   offers the one sound its rule names; an unresolved one offers all of them,
   because any could be the one the word needs. A rule that names a sound the
   shape does not teach for that spelling is treated as no answer at all - the
   alternative is an undefined level, which compares false against every
   number and would hide the unit in silence. */
function candidates(g, w, units, i, inv, rules) {
  const e = inv.get(g);
  if (!e || e.sounds.size < 2) return null;
  const rule = rules[g];
  const got = rule ? rule(w, units[i].p, units, i) : null;
  const at = got ? e.sounds.get(got) : undefined;
  return at ? [[got, at]] : [...e.sounds];
}

/* Every unit of a word whose spelling the shape teaches with more than one
   sound, and which of those sounds a child sitting at `seat` has not met. */
export function unprovedSounds(word, seat, inv, opts = {}) {
  const rules = opts.rules || SOUND_RULES;
  const units = unitsOf(word, inv, opts);
  if (!units) return [];
  const w = String(word).toLowerCase();
  const out = [];
  units.forEach((u, i) => {
    const need = candidates(u.g, w, units, i, inv, rules);
    if (!need) return;
    const late = need.filter(([, n]) => n > seat);
    if (late.length) {
      out.push({ g: u.g, pos: u.p, resolved: need.length === 1 ? need[0][0] : null,
        late: late.map(([s, n]) => `${s}@L${n}`) });
    }
  });
  return out;
}

/* The level at which a word is safe under EVERY reading this model cannot rule
   out. It is section U's second option - decline until every sound is taught -
   computed and REPORTED rather than enforced, so the owner can see where a
   word would have to go if it turns out to need the later sound. For `town` it
   is 77, which is where the owner moved it. */
export function safeLevel(word, inv, opts = {}) {
  const rules = opts.rules || SOUND_RULES;
  const units = unitsOf(word, inv, opts);
  if (!units) return null;
  const w = String(word).toLowerCase();
  let max = 1;
  units.forEach((u, i) => {
    if (!inv.has(u.g)) return;
    const need = candidates(u.g, w, units, i, inv, rules);
    max = Math.max(max, need ? Math.max(...need.map(([, n]) => n)) : levelOf(u.g, w, u.p, inv));
  });
  return max;
}

/* The word bill. Every placed word this model cannot show is safe where it
   sits, sorted by level and then by the alphabet, because it is read by a
   person level by level.

   WHY IT IS A LOOKUP AND NOT A GATE, decided rather than defaulted. It reads
   79 words today and this change cannot drive that to zero, because zeroing it
   means MOVING words - the owner's call, and he has already ruled on several
   one at a time. Fifty-eight of the 79 are this pass's own `filled` words, so
   even a rule scoped to what this pass placed would be red from the moment it
   shipped. A gate that is red on arrival, over a fault it was not built to
   fix, teaches everyone to skip it: that is this file's own reasoning for
   `seatedEarly` and open-faults T1 says it again.
   The teeth are in the controls instead, which is the honest place for them.
   `--self-test` FAILS the moment this detector stops catching `town` seated at
   65, and fails per spelling besides. So the detector is proved by planting,
   not by the ladder happening to be clean. */
export function soundBill(state, opts = {}) {
  const inv = inventory(state.shape);
  const out = [];
  for (const lv of state.ladder) {
    const own = new Set(lv.filled || []);
    for (const w of [...new Set(lv.words || [])]) {
      const h = unprovedSounds(w, lv.n, inv, opts);
      if (!h.length) continue;
      out.push({
        word: w, level: lv.n, safe: safeLevel(w, inv, opts),
        source: own.has(w) ? "fill" : "generator",
        units: [...new Set(h.map((x) => x.g))],
        late: [...new Set(h.flatMap((x) => x.late))],
      });
    }
  }
  return out.sort((a, b) => a.level - b.level || (a.word < b.word ? -1 : 1));
}

/* ------------------------------------------------------------- the state -- */

export function load(read = readFileSync) {
  const j = (f) => JSON.parse(read(`${LADDER_DIR}/${f}`, "utf8"));
  return {
    shape: j("shape-v3.json"),
    ladder: j("ladder-v4.json"),
    target: read("tools/target-vocab.txt", "utf8").split("\n")
      .map((l) => l.trim()).filter((l) => l && !l.startsWith("#")),
  };
}

/* Everything a child is taught: the words placed at each level PLUS the heart
   words the shape carries. An analysis that misses the heart track overstates
   the gap by the 24 words on it. */
export function taughtSet(state) {
  const levels = Array.isArray(state.shape) ? state.shape : Object.values(state.shape);
  const seen = new Set();
  for (const lv of state.ladder) {
    for (const w of lv.words || []) seen.add(w.toLowerCase());
    for (const w of lv.filled || []) seen.add(w.toLowerCase());
  }
  for (const lv of levels) for (const h of lv.heart || []) seen.add(String(h).toLowerCase());
  return seen;
}

export function orphansOf(state) {
  const taught = taughtSet(state);
  return state.target.filter((w) => !taught.has(w.toLowerCase()));
}

/* ---------------------------------------------------------------- the pass -- */

/* The levels whose declared job is breadth rather than a new sound. A word
   that arrives at one of these is not off topic - revisiting anything already
   taught IS the subject, and level 100 says so in the shape: "any word in the
   game". They are the only levels this pass will move a word to. */
export function reviewLevels(shape) {
  const levels = Array.isArray(shape) ? shape : Object.values(shape);
  const out = new Set();
  levels.forEach((lv, i) => {
    if (lv.rule === "review" || lv.rule === "ending") out.add(lv.n || i + 1);
  });
  return out;
}

/* Deterministic by construction: the only orderings are the ready level, the
   level number and the alphabet. No clock, no randomness, and the result does
   not depend on the order the orphans arrive in.

   THE ONE RULE THAT SHAPES IT. A word is on topic for the level that made it
   readable, and nowhere else. So a word that will not fit its own level is
   moved only to a review level, never to the next teaching level that happens
   to have room - that is how a forward scan fills the ear level with ar words
   and calls the ladder fixed. What will not fit either way stays home and the
   level is named as over the soft band. */
export function plan(state, opts = {}) {
  const band = { ...BAND, ...(opts.band || {}) };
  const inv = inventory(state.shape);
  const review = reviewLevels(state.shape);
  const sizes = state.ladder.map((lv) => (lv.words || []).length + (lv.filled || []).length);
  const levels = state.ladder.length;
  const ready = new Map();
  const unreadable = [];
  for (const w of orphansOf(state)) {
    const r = readyLevel(w, inv, opts);
    if (r === null || r > levels) unreadable.push(w);
    else ready.set(w, r);
  }
  const queue = [...ready.keys()].sort((a, b) => (ready.get(a) - ready.get(b)) || (a < b ? -1 : 1));
  const placed = new Map();
  const moved = new Map();
  const overSoft = new Set();
  const unplaceable = [];
  const seat = (w, n) => { placed.set(w, n); sizes[n - 1] += 1; };

  /* One - at home, inside the soft band. */
  for (const w of queue) if (sizes[ready.get(w) - 1] < band.soft) seat(w, ready.get(w));
  /* Two - the overflow, to the earliest review level that can still take it.
     Owner-ruled 2026-08-20 on the adjudication page: the overflow may pass
     the SOFT cap - a review level absorbs up to the hard ceiling, because
     nineteen shipped words had home levels at 20 and every review level sat
     at exactly 12, and "passing soft is allowed but never silent" is the
     band's own definition. The hard ceiling still refuses (its control is
     below); over-soft levels still print, so nothing passes silently. */
  for (const w of queue) {
    if (placed.has(w)) continue;
    for (let n = ready.get(w); n <= levels; n += 1) {
      if (review.has(n) && sizes[n - 1] < band.hard) { seat(w, n); moved.set(w, n); break; }
    }
  }
  /* Three - home anyway, over the soft band, up to the hard ceiling. */
  for (const w of queue) {
    if (placed.has(w)) continue;
    const r = ready.get(w);
    if (sizes[r - 1] >= band.hard) { unplaceable.push(w); continue; }
    seat(w, r);
    overSoft.add(r);
  }
  return { placed, ready, sizes, moved, overSoft, unreadable, unplaceable, inv, band, review };
}

/* Apply a plan to a copy of the ladder. `words` stays the whole answer to
   "what is taught here"; `filled` names the subset this pass added, so a
   reader can see the provenance without git archaeology. */
export function applyPlan(ladder, p) {
  const byLevel = new Map();
  for (const [w, n] of p.placed) {
    if (!byLevel.has(n)) byLevel.set(n, []);
    byLevel.get(n).push(w);
  }
  return ladder.map((lv) => {
    const add = (byLevel.get(lv.n) || []).slice().sort();
    if (!add.length) return { ...lv };
    return { ...lv, words: [...(lv.words || []), ...add], filled: [...(lv.filled || []), ...add].sort() };
  });
}

/* ------------------------------------------------------------- the check -- */

/* Four faults, each one a way this pass could look finished and not be:
   a target word with no seat, a word seated before a child can read it, a
   level grown past the band, and a word the schedule cannot spell at all.

   WHAT IT DOES NOT JUDGE, and why. The "seated early" rule reads only the
   words THIS pass placed. The generator's own 725 are left alone: measured
   against this segmentation, dozens of them sit before their level - "comes"
   at level 7, "lived" at 16 - because the generator scored a word by the
   letters it contains rather than by the units it is read in. That is a real
   fault and a separate one; failing this check on it would leave the gate
   permanently red and teach everyone to skip it. `seatedEarly` counts them so
   the number is on the page instead of in somebody's memory. */
export function check(state, opts = {}) {
  const band = { ...BAND, ...(opts.band || {}) };
  const inv = inventory(state.shape);
  const taught = taughtSet(state);
  const faults = [];
  const missing = state.target.filter((w) => !taught.has(w.toLowerCase()));
  if (missing.length) faults.push({ rule: "unplaced", n: missing.length, items: missing });
  const early = [];
  const unreadable = [];
  for (const lv of state.ladder) {
    for (const w of lv.filled || []) {
      const r = readyLevel(w, inv, opts);
      if (r === null) unreadable.push(w);
      else if (r > lv.n) early.push(`${w}@L${lv.n} readable L${r}`);
    }
  }
  if (early.length) faults.push({ rule: "seated early", n: early.length, items: early });
  if (unreadable.length) faults.push({ rule: "unspellable", n: unreadable.length, items: unreadable });
  const over = state.ladder
    .filter((lv) => ((lv.words || []).length) > band.hard)
    .map((lv) => `L${lv.n}(${lv.words.length})`);
  if (over.length) faults.push({ rule: "over the band", n: over.length, items: over });
  return faults;
}

/* The generator's placements measured against this pass's readiness model. A
   lookup, never a gate: it reports, it does not fail. */
export function seatedEarly(state, opts = {}) {
  const inv = inventory(state.shape);
  const out = [];
  for (const lv of state.ladder) {
    const own = new Set(lv.filled || []);
    for (const w of lv.words || []) {
      if (own.has(w)) continue;
      const r = readyLevel(w, inv, opts);
      if (r !== null && r > lv.n) out.push(`${w}@L${lv.n} readable L${r}`);
    }
  }
  return out;
}

/* --------------------------------------------------------------- reports -- */

function describe(state, p) {
  const out = [];
  const levels = Array.isArray(state.shape) ? state.shape : Object.values(state.shape);
  const before = state.ladder.map((lv) => (lv.words || []).length);
  out.push(`orphans: ${p.placed.size + p.unreadable.length + p.unplaceable.length}`);
  out.push(`placed  : ${p.placed.size}`);
  if (p.unreadable.length) out.push(`NOT SPELLABLE by the schedule: ${p.unreadable.join(" ")}`);
  if (p.unplaceable.length) out.push(`NO LEVEL WITH ROOM: ${p.unplaceable.join(" ")}`);
  const byLevel = new Map();
  for (const [w, n] of p.placed) {
    if (!byLevel.has(n)) byLevel.set(n, []);
    byLevel.get(n).push(w);
  }
  out.push("");
  out.push("level  was  now  teaches                    words added");
  for (const n of [...byLevel.keys()].sort((a, b) => a - b)) {
    const add = byLevel.get(n).slice().sort().map((w) => (p.moved.has(w) ? `${w}*` : w));
    const teach = String(levels[n - 1] && levels[n - 1].teaches || "").slice(0, 26);
    out.push(`L${String(n).padStart(3)}  ${String(before[n - 1]).padStart(3)}  ${String(p.sizes[n - 1]).padStart(3)}  ${teach.padEnd(26)} ${add.join(" ")}`);
  }
  out.push(`* ${p.moved.size} word(s) would not fit their own level and went to a review level,`);
  out.push("  whose subject is anything already taught. No word was moved anywhere else.");
  const stillEmpty = [];
  const stillThin = [];
  state.ladder.forEach((lv, i) => {
    if (!p.sizes[i]) stillEmpty.push(lv.n);
    else if (p.sizes[i] < p.band.min) stillThin.push(`${lv.n}(${p.sizes[i]})`);
  });
  const over = [...p.overSoft].sort((a, b) => a - b).map((n) => `${n}(${p.sizes[n - 1]})`);
  const wasEmpty = before.filter((n) => !n).length;
  const wasThin = before.filter((n) => n && n < p.band.min).length;
  out.push("");
  out.push(`empty levels: was ${wasEmpty} -> now ${stillEmpty.length}${stillEmpty.length ? " (" + stillEmpty.join(" ") + ")" : ""}`);
  out.push(`under six   : was ${wasThin} -> now ${stillThin.length}${stillThin.length ? " (" + stillThin.join(" ") + ")" : ""}`);
  out.push(`under six INCLUDING empty: was ${wasEmpty + wasThin} -> now ${stillEmpty.length + stillThin.length}`);
  out.push(`over ${p.band.soft} (soft): ${over.length}${over.length ? " -> " + over.join(" ") : ""}, hard ceiling ${p.band.hard}, worst ${Math.max(...p.sizes)}`);
  out.push("A level still under six has no more on-topic target words. It is a gap to");
  out.push("take to the owner as a word bill, never a level to pad.");
  return out.join("\n");
}

/* The word bill, written out. One line per word, level order, so it can be
   read down and ruled on. `safe` is where the word would go if it needs the
   later sound; `late` names the sounds the seat has not taught. */
function describeSounds(state, bill) {
  const out = [];
  const byG = new Map();
  for (const r of bill) for (const g of r.units) byG.set(g, (byG.get(g) || 0) + 1);
  const fill = bill.filter((r) => r.source === "fill").length;
  out.push(`${bill.length} placed word(s) sit at a level that has not taught the sound`);
  out.push(`they need from a spelling the shape teaches twice: ${fill} seated by this pass,`);
  out.push(`${bill.length - fill} by the generator. Words per spelling, and a word using two `
    + `is counted\nunder both: `
    + `${[...byG].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(", ")}.`);
  out.push("");
  out.push("level  word          safe  spelling  sound not yet taught       placed by");
  for (const r of bill) {
    out.push(`L${String(r.level).padStart(3)}   ${r.word.padEnd(13)} L${String(r.safe).padStart(3)}  `
      + `${r.units.join(" ").padEnd(9)} ${r.late.join(" ").padEnd(26)} ${r.source}`);
  }
  out.push("");
  out.push("A LOOKUP, never a gate. Nothing here is moved by this tool: which level a");
  out.push("word belongs at is the owner's ruling, and this is the bill to rule on.");
  return out.join("\n");
}

/* --------------------------------------------------------------- controls -- */

/* The fixture: seven levels, a real empty one, and words a person can read.
   Every expected value below is a literal (E4). */
function fixture() {
  return {
    shape: [
      { n: 1, teaches: "three sounds", new: "s=s a=short_a t", heart: [] },
      { n: 2, teaches: "two more", new: "p i=short_i", heart: ["I"] },
      { n: 3, teaches: "sh", new: "sh", heart: [] },
      { n: 4, teaches: "ch", new: "ch=ch", heart: [] },
      { n: 5, teaches: "review", new: "", rule: "review", heart: [] },
      { n: 6, teaches: "eight more letters", new: "l e m b tt n r w k o", heart: [] },
      { n: 7, teaches: "the le ending", new: "le=l", heart: [] },
      { n: 8, teaches: "the y sound", new: "y=y", heart: [] },
      { n: 9, teaches: "y saying long e", new: "y=long_e", heart: [] },
      { n: 10, teaches: "the quiet b", new: "mb=m", heart: [] },
      { n: 11, teaches: "y saying long i", new: "y=long_i", heart: [] },
      { n: 12, teaches: "the quiet k", new: "kn=n", heart: [] },
    ],
    ladder: [
      { n: 1, words: ["at", "sat"] }, { n: 2, words: ["tap", "tip"] },
      { n: 3, words: ["ship"] }, { n: 4, words: [] }, { n: 5, words: [] },
      { n: 6, words: [] }, { n: 7, words: [] }, { n: 8, words: [] },
      { n: 9, words: [] }, { n: 10, words: [] }, { n: 11, words: [] },
      { n: 12, words: [] },
    ],
    target: ["at", "sat", "tap", "tip", "ship", "I", "chip", "chat", "let",
      "settle", "yap", "tipsy", "spy", "limb", "limbs", "knit", "banknote"],
  };
}

function controlChecks(say) {
  const f = fixture();
  const inv = inventory(f.shape);
  const T = (n, p) => say.push([n, p]);

  T("the heart track counts as taught - I is not an orphan", !orphansOf(f).includes("I"));
  T("the eleven unplaced target words are the orphans",
    orphansOf(f).join(" ")
    === "chip chat let settle yap tipsy spy limb limbs knit banknote");
  T("a digraph word waits for its digraph", readyLevel("chip", inv) === 4);
  T("a word of early letters is ready early", readyLevel("let", inv) === 6);
  T("a final-le word waits for the le level", readyLevel("settle", inv) === 7);
  T("mb says m only at the end of a word",
    readyLevel("limb", inv) === 10 && readyLevel("limbs", inv) === 6);
  T("kn says n only at the start of a word",
    readyLevel("knit", inv) === 12 && readyLevel("banknote", inv) === 6);

  /* E5. The positional rules must BITE: switch them off and "let" is read as
     le+t and "limbs" as l-i-mb-s, and both wait for a later level. A rule that
     changes nothing is not a rule, and this control fails the moment one stops
     applying. */
  T("control: without the position rules, let reads as le+t and lands later",
    readyLevel("let", inv, { strict: false }) === 7 && readyLevel("let", inv) === 6);
  T("control: without them, limbs waits for the silent-letter level",
    readyLevel("limbs", inv, { strict: false }) === 10);
  T("control: without them, banknote waits for the quiet-k level",
    readyLevel("banknote", inv, { strict: false }) === 12);

  /* The one spelling whose level is decided by where it sits. */
  T("a y that starts a word is the consonant of yes", readyLevel("yap", inv) === 8);
  T("a y after a vowel is the long e of sandy", readyLevel("tipsy", inv) === 9);
  T("a y with no vowel before it is the long i of fly", readyLevel("spy", inv) === 11);
  T("control: the position is doing that work - the spelling y itself arrives at 8",
    inv.get("y").first === 8 && readyLevel("tipsy", inv) === 9 && readyLevel("spy", inv) === 11);

  const p = plan(f);
  T("every orphan is placed", p.placed.size === 11 && !p.unplaceable.length);
  T("the empty level gets its on-topic words",
    p.placed.get("chip") === 4 && p.placed.get("chat") === 4);
  T("a word lands at the level that made it readable",
    p.placed.get("let") === 6 && p.placed.get("settle") === 7
    && p.placed.get("tipsy") === 9 && p.placed.get("limb") === 10);
  T("no word is seated before it can be read",
    [...p.placed].every(([w, n]) => n >= readyLevel(w, inv)));
  T("level five is the fixture's review level", reviewLevels(f.shape).has(5));

  /* THE RULE THAT MATTERS. Squeeze the soft band to one seat: chat takes level
     four, and chip - which no longer fits - must go to the REVIEW level five,
     not to level six, which is nearer, has room, and teaches something else.
     A forward scan would put it at six; this control is the difference. */
  const tight = plan(f, { band: { soft: 1 } });
  T("an overflowing word goes to a review level, not to the next level with room",
    tight.placed.get("chat") === 4 && tight.placed.get("chip") === 5);
  /* E5. The same squeeze with the review levels taken away: the word has
     nowhere on topic to go, so it stays home and its level is named as over
     the soft band. If this ever silently drifted to level six the control
     would go red. */
  const noReview = { ...f, shape: f.shape.map((lv) => ({ ...lv, rule: undefined })) };
  const homed = plan(noReview, { band: { soft: 1 } });
  T("control: with no review level, the word stays home and the level is named over-band",
    homed.placed.get("chip") === 4 && homed.overSoft.has(4));
  T("control: the hard ceiling refuses rather than overfills",
    plan(noReview, { band: { soft: 1, hard: 1 } }).unplaceable.join(" ") === "chip let limbs");
  /* Owner-ruled 2026-08-20 (adjudication page, "absorb at review levels past
     the soft cap"): the overflow may fill a review level BEYOND soft, up to
     the hard ceiling. Under the old rule the review level held at most soft
     seats and this assertion goes red - that is the control's teeth. The
     hard edge keeps its own control above. */
  const absorb = plan(f, { band: { soft: 0, hard: 3 } });
  T("owner 2026-08-20: the review level absorbs past the soft cap",
    absorb.sizes[4] >= 2 && [...absorb.moved.values()].every((n) => absorb.review.has(n)));

  /* The same input must give the same output, and a control below proves the
     comparison can tell two runs apart rather than always agreeing. */
  const shuffled = { ...f, target: [...f.target].reverse() };
  const a = [...plan(f).placed].sort().join("|");
  const b = [...plan(shuffled).placed].sort().join("|");
  T("same input, same output, whatever order the words arrive in", a === b);
  T("control: the comparison is not blind - a tighter band gives a different plan",
    a !== [...tight.placed].sort().join("|"));
  return f;
}

function controlFaults(say, f) {
  const T = (n, p) => say.push([n, p]);
  const filled = applyPlan(f.ladder, plan(f));
  const rules = (st) => check(st).map((x) => x.rule).join(",");

  T("the check passes a ladder where every target word has a seat",
    rules({ ...f, ladder: filled }) === "");
  /* Provenance is load-bearing, not decoration: the seated-early rule reads
     `filled`, so a fill that stops naming what it added would take that guard
     with it and nothing else would notice. */
  T("the fill names exactly the words it added",
    filled.flatMap((lv) => lv.filled || []).sort().join(" ")
    === "banknote chat chip knit let limb limbs settle spy tipsy yap");
  T("every named word is also in that level's words",
    filled.every((lv) => (lv.filled || []).every((w) => lv.words.includes(w))));
  /* E5. Five planted faults, each one caught by the real check. */
  T("control: an unplaced target word FAILS the check",
    rules(f).includes("unplaced"));
  const crippled = applyPlan(f.ladder, plan(f, { band: { soft: 0, hard: 0 } }));
  T("control: a fill that silently places nothing FAILS the check",
    rules({ ...f, ladder: crippled }).includes("unplaced"));
  const early = filled.map((lv) => (lv.n === 1
    ? { ...lv, words: [...lv.words, "settle"], filled: ["settle"] } : lv));
  T("control: a word seated before a child can read it FAILS the check",
    rules({ ...f, ladder: early }).includes("seated early"));
  const pad = "abcdefghijklmnopqrst".split("");
  const fat = filled.map((lv) => (lv.n === 1 ? { ...lv, words: [...lv.words, ...pad] } : lv));
  T("control: a level grown past the hard ceiling FAILS the check",
    rules({ ...f, ladder: fat }).includes("over the band"));
  const snug = filled.map((lv) => (lv.n === 1
    ? { ...lv, words: [...lv.words, ...pad.slice(0, 13)] } : lv));
  T("control: a level of fifteen, over the soft band and under the hard one, does NOT fail",
    !rules({ ...f, ladder: snug }).includes("over the band"));
  const alien = { ...f, target: [...f.target, "qzzq"], ladder: filled.map((lv) => (lv.n === 1
    ? { ...lv, words: [...lv.words, "qzzq"], filled: [...(lv.filled || []), "qzzq"] } : lv)) };
  T("control: a word the schedule cannot spell FAILS the check",
    rules(alien).includes("unspellable"));
  T("control: none of those five faults is reported when it is absent",
    rules({ ...f, ladder: filled }) === "");
}

/* A SECOND fixture, for the four paths the first one cannot reach. It is
   separate on purpose. The fixture above has its orphan list and its placement
   counts written out as literals, and widening it to carry split vowels would
   have meant rewriting every one of those expected values - which is the edit
   E3 forbids, done for the most sympathetic reason there is. So the new paths
   get their own small schedule instead, and the thirty-four controls above
   still assert exactly what their author wrote.

   WHAT IT TEACHES, AND WHY EACH PIECE IS THERE.
   - Four split vowels (a_e o_e i_e e_e at levels 6 to 9), because the real
     shape has five - a_e L57, e_e L63, o_e L64, i_e L66, u_e L76 - and
     EIGHTEEN of the 162 words this pass seated are read through them: gave
     made come love nose note some those live mile nine shine side smile time
     white use outside. Until this fixture existed, splitAt, SPLIT_MIDS and
     SPLIT_TAILS had no control at all.
   - `ere` at level 11, a three-letter team that must OUTRANK a split vowel.
     The real shape has ten such units, `ere` at L84 among them, and "there"
     is the word that tells th+ere from th+e_e.
   - `-s=s` at level 1 and nowhere else, so the leading-dash strip has a
     consequence. In the real shape `-s=s` sits at L6 and plain `s` is already
     taught at L1, so the strip is load-bearing and invisible; here it is the
     only way `s` is taught at all.
   - An `ending` level at 12, after the last review level. The real shape has
     one - L100, "MILESTONE - Reader" - and `teach` and `teacher` reached it.
   Two absences are deliberate and load-bearing. `z` is taught NOWHERE, so a
   split vowel whose middle letter is untaught has somewhere to fail. And
   level four opens with a stray "-" token, so a malformed head has six real
   letters behind it to swallow. */
function splitFixture() {
  return {
    shape: [
      { n: 1, teaches: "s, written as the plural", new: "-s=s", heart: [] },
      { n: 2, teaches: "two more", new: "t n", heart: [] },
      { n: 3, teaches: "the short vowels", new: "a=short_a e=short_e i=short_i o=short_o", heart: [] },
      { n: 4, teaches: "six more, behind a stray token", new: "- b h m r v x", heart: [] },
      { n: 5, teaches: "review", new: "", rule: "review", heart: [] },
      { n: 6, teaches: "long a: a_e", new: "a_e=long_a", heart: [] },
      { n: 7, teaches: "long o: o_e", new: "o_e=long_o", heart: [] },
      { n: 8, teaches: "long i: i_e", new: "i_e=long_i", heart: [] },
      { n: 9, teaches: "long e: e_e", new: "e_e=long_e", heart: [] },
      { n: 10, teaches: "th", new: "th=th", heart: [] },
      { n: 11, teaches: "the ere team", new: "ere=air", heart: [] },
      { n: 12, teaches: "MILESTONE - Reader", new: "", rule: "ending", heart: [] },
    ],
    ladder: [
      { n: 1, words: [] }, { n: 2, words: [] }, { n: 3, words: [] },
      { n: 4, words: [] }, { n: 5, words: [] }, { n: 6, words: [] },
      { n: 7, words: [] }, { n: 8, words: [] }, { n: 9, words: [] },
      { n: 10, words: [] }, { n: 11, words: [] }, { n: 12, words: [] },
    ],
    target: ["hats", "boxes", "oven", "notes", "time", "here", "there"],
  };
}

/* Read a level out of an inventory without throwing when the spelling is
   missing. A control that crashes takes the whole run down with it and reports
   nothing about the twenty after it; a control that returns null says which
   assertion went red. */
function firstOf(inv, g) {
  return inv.has(g) ? inv.get(g).first : null;
}

function controlSplitVowels(say, f, inv) {
  const T = (n, p) => say.push([n, p]);

  /* THE UNITS THEMSELVES, before any level arithmetic. readyLevel takes a max
     over the units, and a max hides things: a split vowel that swallowed two
     letters instead of three leaves a stray "e" behind, and because "e" is
     taught long before any split vowel the max never moves. The segmentation
     is the honest place to see it, and it is what a person would read down. */
  T("a split vowel is one unit of exactly three letters",
    (segment("time", inv) || []).join("-") === "t-i_e"
    && (segment("notes", inv) || []).join("-") === "n-o_e-s");
  T("the words the split vowel must NOT take are segmented letter by letter",
    (segment("boxes", inv) || []).join("-") === "b-o-x-e-s"
    && (segment("oven", inv) || []).join("-") === "o-v-e-n"
    && (segment("hats", inv) || []).join("-") === "h-a-t-s");
  T("a three-letter team is one unit, and an unspellable word is null",
    (segment("there", inv) || []).join("-") === "th-ere" && segment("maze", inv) === null);

  /* THE SPLIT VOWEL ITSELF. "time" is t + i_e, so it waits for level eight.
     Read letter by letter it is t-i-m-e and would arrive at four - which is
     the level a child could not yet read it at. */
  T("a split-vowel word waits for its split vowel", readyLevel("time", inv) === 8);
  /* E5. Take the split vowels out of the schedule and the same word drops to
     level four, read t-i-m-e. That four-versus-eight gap is the whole value of
     the path, and it proves the control above is not agreeing by accident. */
  const bare = inventory(f.shape.map((lv) => (lv.n >= 6 && lv.n <= 9 ? { ...lv, new: "" } : lv)));
  T("control: with no split vowel taught, time reads t-i-m-e and arrives at four",
    readyLevel("time", bare) === 4 && readyLevel("notes", bare) === 3);
  T("a split vowel carries its silent-e endings: notes is n + o_e + s",
    readyLevel("notes", inv) === 7);

  /* SPLIT_MIDS. The middle letter is never y, w or x: "boxes" is b-o-x-e-s,
     not b + o_e + s, which would say "bose". */
  T("the middle of a split vowel is never x: boxes is not b-o_e-s",
    readyLevel("boxes", inv) === 4);
  T("control: without the rule, boxes waits for the long-o level",
    readyLevel("boxes", inv, { strict: false }) === 7);

  /* SPLIT_TAILS. The e must end the word or carry an ending that keeps it
     silent: "oven" is o-v-e-n, not o_e + n, which would say "own". */
  T("a split vowel needs a silent-e ending: oven is not o_e-n",
    readyLevel("oven", inv) === 4);
  T("control: without the rule, oven waits for the long-o level",
    readyLevel("oven", inv, { strict: false }) === 7);

  /* The third letter must actually BE an e. Without that test every ordinary
     three-letter word becomes a split vowel: "hats" would read h + a_e. */
  T("an ordinary word is not a split vowel: hats is h-a-t-s",
    readyLevel("hats", inv) === 4);

  /* A taught three-letter unit outranks a split vowel at the same place.
     "there" is th + ere, not th + e_e. */
  T("a three-letter team outranks a split vowel: there is th + ere",
    readyLevel("there", inv) === 11);
  T("control: take ere away and the same word falls back to th + e_e",
    readyLevel("there", inventory(f.shape.map((lv) => (lv.n === 11 ? { ...lv, new: "" } : lv)))) === 10);

  /* A split vowel still needs its middle letter taught. z is taught nowhere in
     this fixture, so "maze" is not readable at any level - and saying so is
     the point, because the alternative is calling it ready at six. */
  T("a split vowel still needs its middle letter: maze is spellable nowhere",
    readyLevel("maze", inv) === null);
  T("control: teach the z and maze becomes readable at the long-a level",
    readyLevel("maze", inventory([...f.shape, { n: 13, new: "z=z" }])) === 6);

  /* The consequence a child would feel: the pass SEATS the word at eight. */
  const p = plan(f);
  T("the pass seats a split-vowel word at its split-vowel level",
    p.placed.get("time") === 8 && p.placed.get("notes") === 7
    && p.placed.get("there") === 11 && p.placed.size === 7);
}

function controlShapeTokens(say, f, inv) {
  const T = (n, p) => say.push([n, p]);

  /* THE LEADING DASH. The shape writes a suffix as `-s=s`, and the strip is
     what turns that into the spelling `s`. Here it is the only place s is
     taught, so without the strip "hats" and "notes" are spellable nowhere. */
  T("a suffix written with a leading dash is taught as its bare spelling",
    firstOf(inv, "s") === 1 && !inv.has("-s"));
  T("control: the dashed form and the plain form give the same inventory",
    firstOf(inventory([{ n: 1, new: "-s=s" }]), "s") === 1
    && firstOf(inventory([{ n: 1, new: "s=s" }]), "s") === 1);
  T("a word needing the dashed suffix is readable", readyLevel("hats", inv) === 4);

  /* THE STRAY TOKEN. Level four is written "- b h m r v x". The dash teaches
     nothing, and the six letters behind it must still be taught - the fault
     this catches skipped the whole rest of the level. */
  T("a stray token costs its own place and not the rest of the level",
    ["b", "h", "m", "r", "v", "x"].every((g) => firstOf(inv, g) === 4)
    && !inv.has("-") && !inv.has(""));
  T("control: the stray token is the difference - the same level without it teaches the same six",
    ["b", "h", "m", "r", "v", "x"].every((g) =>
      firstOf(inventory([{ n: 1, new: "b h m r v x" }]), g) === 1));
  T("control: an empty head from a lone sound mark is skipped, not taught",
    inventory([{ n: 1, new: "=long_a t" }]).has("t")
    && !inventory([{ n: 1, new: "=long_a t" }]).has(""));
}

function controlEndingLevel(say, f) {
  const T = (n, p) => say.push([n, p]);

  /* THE ENDING LEVEL. Level 12's job is breadth, like a review level, and it
     says so with rule "ending" rather than rule "review" - which is exactly
     how the real shape writes level 100. Two words, `teach` and `teacher`,
     reached L100 through this clause and nothing tested it. */
  T("an ending level is a level this pass may move a word to",
    [...reviewLevels(f.shape)].sort((a, b) => a - b).join(" ") === "5 12"
    && f.shape[11].rule === "ending" && f.shape[4].rule === "review");

  /* Squeeze the band to one seat and give the pass two words that are both
     ready at eleven. The first takes eleven; the second has no review level
     left after it, and must go on to the ending level at twelve. */
  const late = { ...f, target: ["here", "there"] };
  const tight = plan(late, { band: { soft: 1 } });
  T("a word that will not fit its own level goes on to the ending level",
    tight.placed.get("here") === 11 && tight.placed.get("there") === 12
    && tight.moved.has("there"));
  /* E5. Take the ending rule off that level and the word has nowhere on topic
     to go: it stays home and its level is named as over the soft band. If the
     clause were dropped, the control above would read 11 and this one would
     still read 11 - so the pair, not either alone, is the proof. */
  const noEnding = { ...late, shape: f.shape.map((lv) => ({ ...lv, rule: lv.rule === "ending" ? undefined : lv.rule })) };
  const homed = plan(noEnding, { band: { soft: 1 } });
  T("control: strip the ending rule and the word stays home, named over-band",
    homed.placed.get("there") === 11 && homed.overSoft.has(11));

  /* The check must still refuse a split-vowel word seated before its level. */
  const filled = applyPlan(f.ladder, plan(f));
  const rules = (st) => check(st).map((x) => x.rule).join(",");
  T("the check passes the split-vowel fixture once it is filled",
    rules({ ...f, ladder: filled }) === "");
  const early = filled.map((lv) => (lv.n === 4
    ? { ...lv, words: [...lv.words, "time"], filled: [...(lv.filled || []), "time"] } : lv));
  T("control: a split-vowel word seated before its split vowel FAILS the check",
    rules({ ...f, ladder: early }).includes("seated early"));
}

/* A THIRD fixture, for the sound layer. Its levels are the REAL ones: these
   are the twenty-three levels of `shape-v3.json` that teach one of the
   thirteen multi-sound spellings, copied on 2026-08-19 with their numbers, so
   that "seat `town` at 65 and it must be caught" is open-faults section U's
   own example and not an analogy to it. Every other level teaches nothing.
   The numbers are a snapshot for a fixture, never a claim about the shape:
   `--check` prints the levels it reads from the real file, so a shape that
   moves one shows the move in the real output.
   Level 1 also teaches the plain letters these control words are built from,
   because a word with one untaught letter is unspellable and would report
   nothing at all - the quietest way this fixture could go vacuous. */
const SOUND_LEVELS = {
  1: "s=s a=short_a t p i=short_i n o e u l d m r b h w f k v z le=l",
  4: "c=k", 9: "g=g", 19: "y=y", 23: "ch=ch", 24: "th=th_quiet", 25: "th=th_this",
  51: "y=long_e", 52: "y=long_i", 59: "ey=long_a", 62: "ea=long_e",
  63: "ie=long_e ey=long_e", 65: "ow=long_o", 67: "ie=long_i", 69: "ea=short_e",
  72: "a=long_a", 74: "oo=oo_moon", 75: "oo=oo_book", 77: "ow=ow",
  84: "ear=ear ere=ear", 85: "ear=air ere=air", 87: "c=s g=j", 94: "ch=k",
};

function soundFixture() {
  const shape = [];
  for (let n = 1; n <= 100; n += 1) {
    shape.push({ n, teaches: "", new: SOUND_LEVELS[n] || "", heart: [] });
  }
  return { shape, ladder: shape.map((lv) => ({ n: lv.n, words: [] })), target: [] };
}

/* Seat one word at one level and ask the real bill about it. Every control
   below goes through this, so every one of them calls soundBill, unprovedSounds,
   safeLevel, unitsOf, segment and inventory for real. `tools/ladder-status.mjs`
   has a control that builds its expected answer by hand and never calls the
   function it names, so it cannot fail; not one of these can do that. */
function billFor(f, word, level, opts) {
  const state = {
    ...f,
    ladder: f.ladder.map((lv) => (lv.n === level ? { ...lv, words: [word] } : lv)),
  };
  return soundBill(state, opts).map((r) => `${r.word}@L${r.level} ${r.units.join("+")} `
    + `${r.late.join(" ")} safe L${r.safe}`).join("; ");
}

/* The nine spellings with no rule, each seated at the level that teaches its
   FIRST sound and then at the level that teaches its last. Read down the
   second column: that is the sound a child at that seat has not been taught,
   and the word they would say if they needed it. */
const UNRULED_CASES = [
  ["ow", "town", 65, "ow@L77", 77],
  ["ch", "chop", 23, "k@L94", 94],
  ["th", "thin", 24, "th_this@L25", 25],
  ["ea", "eat", 62, "short_e@L69", 69],
  ["ie", "field", 63, "long_i@L67", 67],
  ["oo", "moon", 74, "oo_book@L75", 75],
  ["ey", "hey", 59, "long_e@L63", 63],
  ["ear", "hear", 84, "air@L85", 85],
  ["ere", "here", 84, "air@L85", 85],
];

function controlUnruledSounds(say, f) {
  const T = (n, p) => say.push([n, p]);

  /* THE NEGATIVE CONTROL open-faults section U names by name. `town` at 65 is
     the seat the fill gave it and the seat the literacy reader refused: the
     level teaches ow as the long o of throw, the word needs the /au/ of out at
     77, and a child reads "tone". The detector must catch it, and the same
     word at 77 must raise nothing - a detector that reports either way is a
     detector nobody can act on. */
  T("control: town seated at 65, where ow says the long o of throw, IS caught",
    billFor(f, "town", 65) === "town@L65 ow ow@L77 safe L77");
  T("town at 77, where the ow of out is taught, raises nothing",
    billFor(f, "town", 77) === "");
  /* E5 twice over. Strip the sounds off level 77 and the spelling has one
     sound, so nothing is multi-sound and nothing is reported - which proves
     the report comes from the SECOND sound and not from the spelling being on
     some list. And the blunt model of section U's option two, every rule
     removed, still catches it: the rules narrow the report, they never create
     it. */
  const oneSound = { ...f, shape: f.shape.map((lv) => (lv.n === 77 ? { ...lv, new: "" } : lv)) };
  T("control: with ow taught once, the same seat raises nothing",
    billFor(oneSound, "town", 65) === "");
  T("control: with every rule removed, town at 65 is still caught",
    billFor(f, "town", 65, { rules: {} }) === "town@L65 ow ow@L77 safe L77");

  for (const [g, word, early, late, safe] of UNRULED_CASES) {
    T(`${g}: ${word} at ${early} is caught, and names the sound it has not been taught`,
      billFor(f, word, early) === `${word}@L${early} ${g} ${late} safe L${safe}`);
    T(`control: ${word} at ${safe}, where every sound of ${g} is taught, raises nothing`,
      billFor(f, word, safe) === "");
  }
}

function controlRuledSounds(say, f) {
  const T = (n, p) => say.push([n, p]);

  /* SOFT c. Before a, o, u or a consonant there is no other reading, so the
     word is clean at the level that teaches c. Before e, i or y there is, so
     it is reported. */
  T("c before a is the k of cat, and cat at the c level is clean",
    billFor(f, "cat", 4) === "");
  T("c before e may be the s of cent, so cent at the c level is caught",
    billFor(f, "cent", 4) === "cent@L4 c s@L87 safe L87");
  T("control: with no c rule, cat at the c level is caught too - the rule is what clears it",
    billFor(f, "cat", 4, { rules: {} }) === "cat@L4 c+a s@L87 long_a@L72 safe L87");

  /* SOFT g. Same shape, and its refusal costs get, gets, getting, gift and
     girl in the real ladder - named here so the price is on the page. */
  T("g before a is the g of gap, and gap at the g level is clean",
    billFor(f, "gap", 9) === "");
  T("g before e may be the j of gem, so gem at the g level is caught",
    billFor(f, "gem", 9) === "gem@L9 g j@L87 safe L87");
  T("control: with no g rule, gap at the g level is caught too",
    billFor(f, "gap", 9, { rules: { a: SOUND_RULES.a } }) === "gap@L9 g j@L87 safe L87");

  /* THE CLOSED SYLLABLE. The long a of level 72 is an open syllable's, so an a
     with two consonant units after it, or consonants to the end of the word,
     is the short a and clean from level one. table is t-a-b-le: one consonant
     unit and then a vowel-bearing one, an open syllable, so it is reported. */
  T("a closed syllable's a is the short a, and cat is clean at level one",
    billFor(f, "cat", 4) === "" && billFor(f, "hand", 4) === "");
  T("an open syllable's a may be the long a, so table is caught",
    billFor(f, "table", 48) === "table@L48 a long_a@L72 safe L72");
  T("a word-final a is a schwa this shape teaches nowhere, so it is caught",
    billFor(f, "banana", 54) === "banana@L54 a long_a@L72 safe L72");
  T("control: with no a rule, cat is caught at the c level - the rule is what clears it",
    billFor(f, "cat", 4, { rules: { c: SOUND_RULES.c } })
    === "cat@L4 a long_a@L72 safe L72");
  T("control: qu counts as consonants, not as the vowel its u looks like",
    vowelUnit("qu") === false && vowelUnit("ea") === true && vowelUnit("a_e") === true);

  /* THE y, AND THE ONE PLACE TWO RULES IN THIS FILE DISAGREE ON PURPOSE. */
  T("a y that starts a word is the consonant of yes and is clean at its level",
    billFor(f, "yes", 19) === "");
  T("sandy is san-dy: nd begins no English word, so the y is the long e of 51",
    billFor(f, "sandy", 51) === ""
    && billFor(f, "sandy", 19) === "sandy@L19 y long_e@L51 safe L51");
  T("spy has no vowel before its y, so it is the long i of 52 and caught at 51",
    billFor(f, "spy", 52) === "" && billFor(f, "spy", 51) === "spy@L51 y long_i@L52 safe L52");
  /* butterfly is but-ter-fly: fl DOES begin English words, so the split falls
     before the f and the y is the long i taught at 52. It sits at 51. */
  T("butterfly is but-ter-fly, so its y is the long i of 52 and its seat at 51 is caught",
    billFor(f, "butterfly", 51) === "butterfly@L51 y long_i@L52 safe L52");
  T("control: levelOf's whole-word y rule reads the same word as long e - the two "
    + "rules disagree by design, and readyLevel is left alone so no word moves",
    levelOf("y", "butterfly", 8, inventory(f.shape)) === 51
    && readyLevel("butterfly", inventory(f.shape)) === 51
    && SOUND_RULES.y("butterfly", 8) === "long_i");
  T("control: fl is an onset and nd, pp and ck are not - that IS the rule",
    SOUND_RULES.y("butterfly", 8) === "long_i" && SOUND_RULES.y("sandy", 4) === "long_e"
    && SOUND_RULES.y("puppy", 4) === "long_e" && SOUND_RULES.y("lucky", 4) === "long_e");
}

function controlSoundModel(say, f) {
  const T = (n, p) => say.push([n, p]);
  const inv = inventory(f.shape);

  T("the shape teaches thirteen spellings with more than one sound",
    [...inv].filter(([, e]) => e.sounds.size > 1).map(([g]) => g).sort().join(" ")
    === "a c ch ea ear ere ey g ie oo ow th y");
  T("four of them have a rule and nine are answered by refusing",
    Object.keys(SOUND_RULES).sort().join(" ") === "a c g y");

  /* A word with no multi-sound spelling raises nothing, at any seat. Without
     this the bill could be reporting every word it is handed. */
  T("a word of single-sound spellings raises nothing wherever it sits",
    billFor(f, "pot", 1) === "" && billFor(f, "pot", 94) === "");
  /* And a word the schedule cannot spell at all raises nothing rather than
     throwing - the unreadable word is `check`'s business, not this layer's. */
  T("an unspellable word raises nothing and does not throw",
    unprovedSounds("qzzq", 1, inv).length === 0 && safeLevel("qzzq", inv) === null);

  /* THE SILENT-HIDE PATH. A rule that names a sound the shape does not teach
     for that spelling used to give an undefined level, and undefined compares
     false against every number - so the unit would vanish from the report
     without a word. It now falls back to every sound, the conservative
     direction. Planted here because no shape in the repository triggers it. */
  const wrongRule = { rules: { ...SOUND_RULES, ow: () => "long_u" } };
  T("control: a rule naming a sound the shape does not teach falls back to all of them",
    billFor(f, "town", 65, wrongRule) === "town@L65 ow ow@L77 safe L77");
  T("control: a rule naming a sound the shape DOES teach is obeyed",
    billFor(f, "town", 65, { rules: { ...SOUND_RULES, ow: () => "long_o" } }) === "");

  /* safeLevel is section U's option two, computed. It is what the bill's last
     column means and what a mover would need. */
  T("safe level is where every sound the model cannot rule out has been taught",
    safeLevel("town", inv) === 77 && safeLevel("cat", inv) === 4
    && safeLevel("hear", inv) === 85 && safeLevel("pot", inv) === 1);

  /* Each reported unit says whether a rule named its sound or nothing could.
     A caller that acts on the bill needs to tell "the rule says long e and it
     arrives later" from "nobody knows which of these it is", and a field
     nothing asserts is a field that can quietly stop being true. */
  T("a reported unit says whether a rule named its sound or nothing could",
    unprovedSounds("town", 65, inv).map((h) => `${h.g}:${h.resolved}`).join(" ")
    === "ow:null"
    && unprovedSounds("sandy", 19, inv).map((h) => `${h.g}:${h.resolved}`).join(" ")
    === "y:long_e");

  /* Only the ladder is read. Heart words are taught whole, never sounded out,
     so a heart word in the shape must never reach this bill. */
  const hearty = {
    ...f,
    shape: f.shape.map((lv) => (lv.n === 65 ? { ...lv, heart: ["town"] } : lv)),
  };
  T("a heart word is taught whole and never reaches the bill",
    soundBill(hearty).length === 0);

  /* THE MEASUREMENT THAT CHOSE THE MODEL, on the fixture rather than on the
     ladder, so it cannot drift with the data. Under section U's option two -
     no rules at all - the first word a child ever meets is held back, because
     the letter a is taught twice. That is why the resolvers exist. */
  const blunt = { rules: {} };
  T("control: option two, with no rules, holds back the word `at` itself",
    billFor(f, "at", 1, blunt) === "at@L1 a long_a@L72 safe L72" && billFor(f, "at", 1) === "");

  /* Sorted by level, then by the alphabet: it is read down by a person. */
  const many = {
    ...f,
    ladder: f.ladder.map((lv) => {
      if (lv.n === 65) return { ...lv, words: ["town"] };
      if (lv.n === 62) return { ...lv, words: ["seat", "eat"], filled: ["eat"] };
      return lv;
    }),
  };
  T("the bill is sorted by level and then by the alphabet",
    soundBill(many).map((r) => `${r.level}:${r.word}:${r.source}`).join(" ")
    === "62:eat:fill 62:seat:generator 65:town:generator");

  /* And the printed page carries every row. A renderer that counts three and
     prints two is a lookup that has quietly stopped being one, and the count
     line would still read three. */
  const page = describeSounds(many, soundBill(many));
  T("every row of the bill reaches the printed page, with its safe level",
    page.includes("3 placed word(s)") && page.includes("1 seated by this pass")
    && page.includes("L 62   eat") && page.includes("L 62   seat")
    && page.includes("L 65   town") && page.includes("ow@L77"));
  T("control: an empty bill prints no rows and says so as a zero",
    describeSounds(f, []).includes("0 placed word(s)")
    && !describeSounds(f, []).includes("town"));
}

function selfTest() {
  const say = [];
  const sf = splitFixture();
  const sinv = inventory(sf.shape);
  controlSplitVowels(say, sf, sinv);
  controlShapeTokens(say, sf, sinv);
  controlEndingLevel(say, sf);
  const df = soundFixture();
  controlUnruledSounds(say, df);
  controlRuledSounds(say, df);
  controlSoundModel(say, df);
  controlFaults(say, controlChecks(say));
  const failed = say.filter(([, p]) => !p).length;
  for (const [n, p] of say) console.log((p ? "ok   " : "FAIL ") + n);
  console.log(`\nladder-fill controls: ${say.length - failed} passed, ${failed} failed`);
  return failed;
}

/* ------------------------------------------------------------------- main -- */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);
  const state = load();
  if (argv.includes("--sounds")) {
    console.log(describeSounds(state, soundBill(state)));
    process.exit(0);
  }
  if (argv.includes("--check")) {
    const faults = check(state);
    for (const f of faults) {
      console.log(`FAIL ${f.rule}: ${f.n}`);
      console.log(`     ${f.items.slice(0, 30).join(" ")}${f.items.length > 30 ? " …" : ""}`);
    }
    const early = seatedEarly(state);
    console.log(faults.length
      ? `\nladder-fill --check: ${faults.length} rule(s) broken. Run node tools/ladder-fill.mjs --write.`
      : "\nladder-fill --check: every target word has a seat, none seated early, none over the band.");
    console.log(`Lookup, not a rule: ${early.length} of the generator's own placements sit before`);
    console.log("this model would read them. That is the generator's fault, not this pass's.");
    /* The second lookup, and its reasons are with soundBill. The spellings are
       named with the levels read from the real shape, so a shape that moves one
       shows the move here rather than only in a fixture. */
    const bill = soundBill(state);
    const inv = inventory(state.shape);
    const twice = [...inv].filter(([, e]) => e.sounds.size > 1)
      .map(([g, e]) => `${g}(${[...e.sounds.values()].join("/")})`);
    console.log(`Lookup, not a rule: ${bill.length} placed word(s) sit where this model cannot`);
    console.log(`show the sound they need has been taught. ${twice.length} spellings are taught twice:`);
    console.log(`  ${twice.join(" ")}`);
    console.log("Run node tools/ladder-fill.mjs --sounds for the bill. open-faults section U.");
    process.exit(faults.length ? 1 : 0);
  }
  const p = plan(state);
  console.log(describe(state, p));
  if (argv.includes("--write")) {
    const next = applyPlan(state.ladder, p);
    writeFileSync(`${LADDER_DIR}/ladder-v4.json`, `${JSON.stringify(next, null, 1)}\n`);
    console.log(`\nwritten: ${LADDER_DIR}/ladder-v4.json`);
  } else {
    console.log("\nA PLAN, written nowhere. Add --write to apply it, --check to gate it.");
  }
}
