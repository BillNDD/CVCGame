import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================
   WORD QUEST v2 — CVC spaced-repetition phonics game
   Three fixed zones · grown-up strip · AA contrast · no page scroll in session
   ============================================================ */

const LEVELS = [
  { n: 1, name: "Hatchlings", emoji: "🐣", focus: "two sounds (VC)",
    words: ["at","an","am","ax","in","it","if","is","on","ox","up","us"] },
  /* Level 2 opens with the HEART WORDS, and they are first rather than last on
     purpose: a level's word order IS its introduction order, so appending
     would have made a word that exists to be met early the last thing a child
     meets. Owner-ruled 2026-08-12 — a heart word's level is where the CHILD
     MEETS it, not where its spelling would fall. "the" would otherwise sit at
     Level 7 for its th, "and" at Level 10 for its final blend, and "said" and
     "you" at 7 for units the child has not been taught; every one of them is a
     word on page one of every book. This is where sentence practice begins, so
     it is where the words a sentence cannot do without begin too. */
  { n: 2, name: "Sunny Start", emoji: "☀️", focus: "short a + heart words",
    words: ["the","and","to","do","you","said","my","of","a",
      "cat","hat","mat","sat","man","can","ran","bat","cap","map","tap","nap","bag","dad","jam","pan","rat","sad","wag","van",
      "fan","ham","lap","tag","had","tan","pad","rag","zap","yam","pal","cab","ram","dab","yap","mad","bad","rap","has","pat","dam","nag","sap","vat"] },
  { n: 3, name: "Busy Bees", emoji: "🐝", focus: "short i & o",
    words: ["sit","pig","big","dig","win","lip","hit","six","fin","bin","dog","hot","top","pot","mop","log","box","fox","hop","cot",
      "mom","pop","not","got","did","him","pin","tip","sip","dip","hip","rip","bit","fit","pit","bib","wig","fix","job","lot","nod","hog","tin","rig","rob","sob","mob","cop","dim"] },
  { n: 4, name: "Rocket Words", emoji: "🚀", focus: "short e & u",
    words: ["bed","red","hen","pen","ten","net","leg","wet","jet","men","bus","cup","sun","run","fun","mud","bug","hug","nut","tub",
      "pet","get","let","set","cut","pup","web","bun","rug","mug","vet","tug","jug","hum","rub","dug","bud","peg","met","yet","bet","keg","hem","nun","pun","jut","gut","hub"] },
  { n: 5, name: "Explorer", emoji: "🧭", focus: "all five vowels",
    words: ["yes","zip","gum","gas","kid","cub","den","dot","fed","fig","fog","gap","hid","hut","jog","kit","lid","mix","wax","yak",
      "jig","jab","jot","lab","lad","led","lit","lug","nab","pep","pod","rib","rim","rod","rot","sag","sub","sum","tab","tot","wed","wit","zig","zag","fax","nix","vex","sax","cod","gob"] },
  { n: 6, name: "Super Sounds", emoji: "🦸", focus: "sh & ch",
    words: ["ship","shop","shut","fish","dish","wish","cash","chat","chip","chop","rich","much","such","chin","shed","shin","mash","rash","chug","chum",
      "dash","sash","hush","rush","mush","chap","wash","push","bush","she","bash","gash","gush","lash","lush","posh","sham","shun"] },
  { n: 7, name: "Word Wizard", emoji: "🧙", focus: "th, wh, ck, ng + tricky words",
    words: ["thin","this","that","then","them","bath","math","with","when","whip","duck","sock","kick","back","ring","sing","king","long","song","was",
      "buck","sung","gong","lung","puck","wick","rung","muck","pack","path","sack","tack","neck","luck","tuck","peck","deck","thud",
      "rock","lock","pick","lick","wing","tick","dock","moth","hang","sang","rang","sick","fang","what","whim","wham","bang","hung","ding","ping"] },
  { n: 8, name: "Bells", emoji: "🔔", focus: "ll, ss, ff, zz + qu + silent letters",
    words: ["bell","tell","well","fell","hill","mill","doll","mess","boss","kiss","miss","loss","fuss","huff","puff","cuff","buzz","fuzz","jazz","fizz",
      "quiz","quit","quip","knit","knob","knot","lamb"] },
  { n: 9, name: "Chicks", emoji: "🐔", focus: "five-letter words",
    words: ["chick","check","chuck","chess","chill","shack","shock","shell","thick","whack","whiff","whizz",
      "quick","quack","quill","knock","wreck","wrong","thumb","wrap","wren","limb"] },
  /* Levels 10 and 11 are blends, and a blend introduces NO new grapheme: the
     child already knows every letter here and is learning to run two of them
     together. That is why these levels need no new sound, only new words —
     Letters and Sounds calls it a fluency step, not a new phase. Each cluster
     stays two tiles in the reveal, because it is two sounds blended, unlike the
     digraphs of S8 which are one sound and one tile. */
  { n: 10, name: "Tent Camp", emoji: "⛺", focus: "blends at the end",
    words: ["ant","ask","band","belt","bend","best","bolt","bond","bump","camp","cost","damp","dent","desk","dusk","end","fast",
      "fond","gift","gulf","gulp","hand","help","hint","jump","just","kept","lamp","land","last","left","lend","lift","list","mask",
      "melt","mend","milk","mint","must","nest","pond","pump","raft","rest","risk","sand","sift","silk","soft","task","tent","wilt"] },
  { n: 11, name: "Twin Drums", emoji: "🥁", focus: "blends at the start",
    words: ["brag","clap","drop","drum","flag","flat","glad","grab","grin","plan","plum","slam","sled","slid","slip","snap","snug",
      "spin","spot","stem","step","stop","swam","swim","trap","trim","trip","twig","twin"] },
];

const TRICKY = {
  was: "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wuz.",
  is: "Tricky word! The s sounds like \u201Cz\u201D \u2014 iz.",
  has: "Tricky word! The s sounds like \u201Cz\u201D \u2014 haz.",
  wash: "Tricky word! The a sounds like \u201Co\u201D \u2014 wosh.",
  push: "Tricky word! The u sounds like \u201Coo\u201D \u2014 poosh.",
  bush: "Tricky word! The u sounds like \u201Coo\u201D \u2014 boosh.",
  she: "Tricky word! The e sounds like \u201Cee\u201D \u2014 shee.",
  the: "Tricky word! The e sounds like \u201Cuh\u201D \u2014 thuh.",
  what: "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wut.",
};
/* One tile per unit (S8). Beyond the six spoken digraphs: qu says kw, the
   silent-letter pairs kn wr mb say their surviving letter, and the doubled
   endings ll ss ff zz say their single. Owner-approved 2026-08-04 with
   Levels 8 and 9; ph was considered and left out - no word obeys the bank's
   own rules. */
/* Safety rule S8: a multi-letter unit is ONE tile. "ai" and "ou" joined on
   2026-08-12, owner-approved by ear: they are what makes "said" and "you"
   readable as three tiles and two rather than four and three. The tiles have
   to tell the truth, and s-a-i-d says a word the child will never hear.
   Verified before the rule changed: NO word in the bank contains ai or ou, so
   nothing already shipped re-tiles underneath this. */
const DIGRAPHS = ["sh","ch","th","wh","ck","ng","qu","kn","wr","mb","ll","ss","ff","zz","ai","ou"];
/* The microphone is gone (owner-ruled 2026-08-11, safety; removed 2026-08-12), and
   three things went with it because it was the only reason each existed.
   HOMOPHONES was a 31-word near-miss table read by nothing but the transcript
   matcher. ADULT_JUDGED named five words a recogniser could not judge fairly,
   and adultNote() told a grown-up so. SPEC section 6 already ruled that the
   note 'belongs to microphone mode only' and is absent when the adult judges
   every word — which is now every word, always, so the SPEC's own rule deletes
   it. Kept only if a reason survived the recogniser; none did. */
const INTERVALS = [1, 1, 2, 4, 7, 12];
const SESSION_SIZE = 20;
const PROMPT_CAP = 26;
const ADVANCE_GUARD_MS = 400;   // P0-3
const SPLASH_TIMEOUT_MS = 3000; // P2-6
const STORE_KEY = "wordquest:progress:v2";

/* P0-5 — every value below measured against its background at ≥4.5:1 */
const C = {
  ink:     "#17356b",
  ink2:    "#3e5aa6",   // 6.53:1 on white
  muted:   "#5a6ba8",   // 5.12:1 on white
  strip:   "#455073",   // 7.93:1 on white
  action:  "#c9402f",   // 4.93:1 with white
  green:   "#0f7a4f",   // 5.36:1 with white
  amber:   "#8a5a00",   // amber text/fill, dark enough for white
  amberInk:"#6b4600",   // amber TEXT on the gradient: 4.9:1 on the worst stop
  red:     "#c8342f",   // 5.27:1 with white
  purple:  "#6b4bbf",   // 6.21:1 with white
  sun:     "#ffd166",   // navy on it = 8.28:1
  chip:    "#e8ecf7",
  line:    "#dfe5f3",
};

const LANGS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-CA", label: "English (CA)" },
  { code: "en-AU", label: "English (AU)" },
];

const WORD_LEVEL = {};
LEVELS.forEach(L => L.words.forEach(w => { WORD_LEVEL[w] = L.n; }));

/* ---------- phonics ---------- */
function chunkWord(word) {
  const out = []; let i = 0;
  while (i < word.length) {
    const two = word.slice(i, i + 2);
    if (DIGRAPHS.includes(two)) { out.push(two); i += 2; } else { out.push(word[i]); i += 1; }
  }
  return out;
}
const dashed = (w) => chunkWord(w).join("-");

/* ---------- SRS ---------- */
const freshWordState = () => ({ box: 0, attempts: 0, correct: 0, close: 0, wrong: 0, dueAt: 1, lastSession: 0 });

function applyResult(ws, result, sessionNumber) {
  const firstEver = ws.attempts === 0;
  ws.attempts += 1; ws.lastSession = sessionNumber;
  if (result === "correct") { ws.correct += 1; ws.box = firstEver ? 3 : Math.min(5, ws.box + 1); }
  else if (result === "close") { ws.close += 1; ws.box = Math.max(1, ws.box); }
  else { ws.wrong += 1; ws.box = Math.max(0, ws.box - 2); }
  ws.dueAt = sessionNumber + INTERVALS[ws.box];
  return ws;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildSession(state) {
  const sNum = state.sessionsCompleted + 1, level = state.level, picked = new Set();
  const take = (arr, k) => { const got = []; for (const w of arr) { if (got.length >= k) break; if (!picked.has(w)) { picked.add(w); got.push(w); } } return got; };
  const entries = Object.entries(state.words);
  const dueBelow = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] < level)
    .sort((a, b) => a[1].box - b[1].box || a[1].dueAt - b[1].dueAt).map(([w]) => w);
  const confidence = shuffle(entries.filter(([w, ws]) => ws.box >= 4 && WORD_LEVEL[w] <= level).map(([w]) => w));
  const curDue = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] === level)
    .sort((a, b) => a[1].box - b[1].box).map(([w]) => w);
  /* A3-002 — review is not capped by the child's level. A word the app has
     graded can come back whatever level it belongs to. A next-level word served
     by the peek below used to fall outside every selector here, so it was read
     once and then parked for good: a Level 1 child who read nothing correctly
     collected all 39 Level 2 words that way, and none of the 39 was ever served
     again. Two slots at most, so the child's own level still IS the session,
     and one level ahead at most, which the peek is the only source of: nothing
     further ahead is ever served, whatever a save happens to hold.
     Found by an audit of the running build, 2026-07-29. */
  const dueAbove = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] === level + 1)
    .sort((a, b) => a[1].box - b[1].box || a[1].dueAt - b[1].dueAt).map(([w]) => w);
  const freshCur = LEVELS[level - 1].words.filter(w => !state.words[w] || state.words[w].attempts === 0);
  /* A3-002 — the peek needs evidence of learning, not evidence of exposure.
     A box of 2 or more means the word has been read correctly at least once
     and not since forgotten twice: the box only ever rises on a correct
     reading, and a first correct reading sets it to 3. The share matches the
     promotion rule, one box lower. */
  const curLevelWords = LEVELS[level - 1].words;
  const learned = curLevelWords.filter(w => state.words[w] && state.words[w].box >= 2).length / curLevelWords.length >= 0.8;
  const list = [];
  list.push(...take(dueBelow, 5));
  if (state.sessionsCompleted >= 2) list.push(...take(confidence, 2));
  list.push(...take(dueAbove, 2));
  list.push(...take(curDue, SESSION_SIZE - list.length));
  list.push(...take(freshCur, SESSION_SIZE - list.length));
  if (list.length < SESSION_SIZE) {
    const anyLow = entries.filter(([w, ws]) => WORD_LEVEL[w] <= level).sort((a, b) => a[1].box - b[1].box).map(([w]) => w);
    list.push(...take(anyLow, SESSION_SIZE - list.length));
  }
  if (list.length < SESSION_SIZE && level < LEVELS.length && freshCur.length === 0 && learned) {
    // D2: next-level peek only after every current-level word has been seen
    // A3-002: and only once 80 percent of this level has been read correctly
    const peek = LEVELS[level].words.filter(w => !state.words[w] || state.words[w].attempts === 0);
    list.push(...take(peek, SESSION_SIZE - list.length));
  }
  const q = shuffle(list);
  let best = 0;
  q.forEach((w, i) => {
    const b = state.words[w] ? state.words[w].box : 0, bb = state.words[q[best]] ? state.words[q[best]].box : 0;
    if (b > bb) best = i;
  });
  if (best > 0) { const [w] = q.splice(best, 1); q.unshift(w); }
  return q;
}

/* Two paths to promotion (SPEC §"Promotion"): 80 percent of the level at
   box 3+, or a streak of two perfect completed sessions. `session` is
   { partial, perfect } from the session that just ended. Without a session
   the box rule alone decides — a stored streak never promotes on its own.
   A partial session never changes the streak; any promotion resets it; the
   stored streak caps at 2, so nothing banks up at the top level. */
function checkPromotion(state, session) {
  const prior = typeof state.perfectStreak === "number" && isFinite(state.perfectStreak) && state.perfectStreak > 0
    ? Math.min(2, Math.round(state.perfectStreak)) : 0;
  if (session && session.partial) return false;
  if (session) state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;
  if (state.level >= LEVELS.length) return false;
  const words = LEVELS[state.level - 1].words;
  const secure = words.filter(w => state.words[w] && state.words[w].box >= 3).length / words.length >= 0.8;
  if (secure || (session && state.perfectStreak >= 2)) { state.level += 1; state.perfectStreak = 0; return true; }
  return false;
}

/* ---------- storage ---------- */
const mem = {};
async function loadState() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(STORE_KEY);
      if (r && r.value) {
        try { return JSON.parse(r.value); }
        catch (e) {
          // F1 — keep the damaged blob for recovery instead of overwriting it
          try { await window.storage.set(STORE_KEY + ":corrupt", r.value); } catch (e2) {}
          return { __corrupt: true };
        }
      }
    }
  } catch (e) {}
  try { return mem[STORE_KEY] ? JSON.parse(mem[STORE_KEY]) : null; } catch (e) { return null; }
}
async function saveState(s) {
  const b = JSON.stringify(s); mem[STORE_KEY] = b;
  try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(STORE_KEY, b); return true; } } catch (e) {}
  return false;
}
/* F7 — guarantee the document shape. Valid JSON is not a valid save. */
function healWords(s) {
  if (!s.words || typeof s.words !== "object" || Array.isArray(s.words)) s.words = {};
  for (const [w, ws] of Object.entries(s.words)) {
    if (!ws || typeof ws !== "object" || typeof ws.box !== "number" || !isFinite(ws.box)) { delete s.words[w]; continue; }
    ws.box = Math.min(5, Math.max(0, Math.round(ws.box)));
    for (const k of ["attempts", "correct", "close", "wrong", "dueAt", "lastSession"])
      if (typeof ws[k] !== "number" || !isFinite(ws[k])) ws[k] = 0;
  }
}
function healLog(s) {
  if (!Array.isArray(s.log)) s.log = [];
  // repair the rows too — a hostile log row must not crash migrate or the export
  s.log = s.log.filter(r => r && typeof r === "object" && !Array.isArray(r));
  for (const r of s.log) {
    r.items = Array.isArray(r.items) ? r.items.filter(i => i && typeof i === "object") : [];
    if (typeof r.level !== "number" || !isFinite(r.level)) r.level = 0;
  }
}
function healSettings(s) {
  if (!s.settings || typeof s.settings !== "object" || Array.isArray(s.settings)) s.settings = {};
  const d = newState().settings;
  for (const k of Object.keys(d)) if (s.settings[k] === undefined) s.settings[k] = d[k];
  /* Types, not just presence. A hostile document once carried a NUMBER as the
     child's name; it survived migrate and crashed the settings screen on the
     first .trim(). Every setting is healed to the type the app expects. */
  if (typeof s.settings.childName !== "string") s.settings.childName = String(s.settings.childName ?? "").slice(0, 20);
  if (typeof s.settings.sound !== "boolean") s.settings.sound = d.sound;
  if (typeof s.settings.lang !== "string" || !s.settings.lang) s.settings.lang = d.lang;
}
function heal(s) {
  if (!s || typeof s !== "object") s = {};
  healWords(s); healLog(s); healSettings(s);
  if (typeof s.sessionsCompleted !== "number" || !isFinite(s.sessionsCompleted) || s.sessionsCompleted < 0) s.sessionsCompleted = 0;
  if (typeof s.perfectStreak !== "number" || !isFinite(s.perfectStreak) || s.perfectStreak < 0) s.perfectStreak = 0;
  else s.perfectStreak = Math.min(2, Math.round(s.perfectStreak));
  // a non-numeric level reads as absent; a fractional one is rounded — migrate clamps the range
  if (typeof s.level !== "number" || !isFinite(s.level)) delete s.level; else s.level = Math.round(s.level);
  // a version that is not a number reads as absent — a hostile value must not crash the migration check
  if (typeof s.version !== "number" || !isFinite(s.version)) delete s.version;
  return s;
}

/* v4 migration — version 2 saves shift up one level (VC level inserted at 1). Idempotent. */
function migrate(s) {
  s = heal(s);
  if (!s.version || s.version < 3) {
    s.level = (s.level || 1) + 1;
    (s.log || []).forEach(r => { r.level += 1; });
    s.version = 3;
  }
  s.level = Math.min(Math.max(1, s.level || 1), LEVELS.length);  // defensive clamp, always
  return s;
}

const newState = () => ({
  version: 3, level: 1, sessionsCompleted: 0, perfectStreak: 0,
  settings: { sound: true, childName: "", lang: "en-US" },
  words: {}, log: [],
});

/* ---------- speech ---------- */
/* speak takes one sentence or a list of { text, rate } parts. Parts queue as
   separate utterances, so a clear pause separates the praise from the reveal
   (SPEC §5). Every part speaks at one calm rate: stretching a word distorts
   the very sound the child is learning. */
function speak(input, enabled, lang) {
  if (!enabled) return;
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const parts = typeof input === "string" ? [{ text: input, rate: 0.9 }] : Array.isArray(input) ? input : [];
    for (const p of parts) {
      const u = new SpeechSynthesisUtterance(p.text);
      u.rate = p.rate; u.pitch = 1.1; if (lang) u.lang = lang;
      window.speechSynthesis.speak(u);
    }
  } catch (e) {}
}
/* S2 — the queued reveal must never bleed into the next attempt. */
function hush() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} } // P2-8

function feedbackParts(result, word) {
  const d = dashed(word);
  if (result === "correct") return { lead: "Great job! That is ", d, word, icon: "🎉" };
  if (result === "close") return { lead: "Good try! The correct pronunciation is ", d, word, icon: "💪" };
  return { lead: "Let\u2019s try that again. The correct pronunciation is ", d, word, icon: "🔁" };
}
/* Seventeen praise sentences for a correct reading (SPEC \u00a75). Most point to the
   child\u2019s own effort. The caller picks the index; 0 is the fallback. */
const PRAISE = [
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
/* Praise lines the SYSTEM voice must never be given. "You read that word all
   by yourself!" was spoken by the fallback voice with "read" as "reed",
   present tense, to a child who had just read the word - the fault beta.6
   was published for, returning whenever the pack could not play. The owner
   replaced that line entirely on 2026-08-03, so the list is empty today; the
   mechanism stays, because the next two-pronunciation praise line would
   bring the fault straight back. If you add one, add its index here. The
   pack path keeps the index it was given; only the fallback is remapped,
   and praise is spoken never shown, so nothing on screen disagrees. */
const TTS_UNSAFE_PRAISE = [];
const ttsSafePraise = (i) => (TTS_UNSAFE_PRAISE.includes(i) ? 0 : i);
/* THE ONE WORD SYSTEM SPEECH MUST NOT BE GIVEN RAW. Every clip in this game is
   recorded, and the app only reaches system speech when the pack fails to
   load. For 438 of the 439 words that fallback is merely worse. For "a" it
   would break safety rule S4: handed the string "a", every system voice says
   the LETTER'S NAME, which is the one thing this app must never say to a child
   learning that letters make sounds. So the fallback says "uh" — the sound the
   word actually makes, and the sound the recorded clip carries.

   This is the same shape as ttsSafePraise above: the recorded path is the real
   one, and the fallback is written down rather than left to a synthesiser's
   judgement. The copy gate (rule 4) reads feedbackSpeech for every bank word
   and refuses a letter name, which is exactly how this was caught. */
const TTS_UNSAFE_WORD = { a: "uh" };
const ttsSafeWord = (w) => TTS_UNSAFE_WORD[w] || w;
/* The reveal is its own utterance, so the pause before it does the work that
   slowing the word used to do badly. */
const feedbackSpeech = (r, w, praise = 0) =>
  r === "correct" ? [{ text: PRAISE[praise] || PRAISE[0], rate: 0.9 }, { text: "The word was " + ttsSafeWord(w) + ".", rate: 0.9 }]
  : r === "close" ? [{ text: "Good try!", rate: 0.9 }, { text: "The word is " + ttsSafeWord(w) + ".", rate: 0.9 }]
  : [{ text: "Let\u2019s try again.", rate: 0.9 }, { text: "The word is " + ttsSafeWord(w) + ".", rate: 0.9 }];

/* ---------- voice packs (SPEC §5a) ---------- */
const SEAM_MS = 700;   // the pause between clips in one utterance, so words never crush together
/* The sound-out reveal has its own, shorter seam. The owner heard four
   spacings on 2026-08-11 and chose 500 ms: 700 was set for whole words in a
   sentence, and a sound-out is a different rhythm. At 700 the whole reveal
   runs 8.2 seconds, which is a long wait between words for a four-year-old. */
const SOUNDOUT_SEAM_MS = 500;
/* How long a tile keeps its ring. It must outlast the sound it marks — the
   longest approved single sound runs 620 ms — or the mark would leave the
   screen while the child is still hearing it. It must also not outlast the
   whole gap to the next tile, which is at minimum the shortest sound (85 ms)
   plus one seam: 585 ms. Those two demands cross, so a brief overlap of two
   rings is unavoidable on the fastest pair, and 700 ms takes the side of the
   sound being fully marked. */
const SOUNDOUT_POP_MS = 700;
/* Which SOUND each tile speaks. A tile is one unit (safety rule S8), so a
   digraph gets one sound and one pop: ck says /k/, wh says /w/, kn says /n/.
   Every id here is a clip the owner has approved, and none of them is a
   recording of the owner's voice (owner-ruled 2026-08-11). */
const TILE_SOUND = {
  a: "short_a", e: "short_e", i: "short_i", o: "short_o", u: "short_u",
  c: "k", ck: "k", ff: "f", ll: "l", ss: "s", zz: "z",
  kn: "n", wr: "r", mb: "m", th: "th_quiet", wh: "w",
};
const soundIdFor = (g) => "d:" + (TILE_SOUND[g] || g);
/* A tricky word is tricky because one of its letters is not saying what the
   letter usually says. The owner ruled on 2026-08-06 that the sound-out tells
   the truth about it anyway — "the bent letter plays its TRUE sound... No
   tricky-word exemption" — so these words override the letter's usual sound
   at the tile that bends. Keyed by word, then by tile position, because it is
   one tile of the word that lies and not the letter everywhere it appears.
   Every id here is a clip the owner has approved in a listening round. */
const WORD_SOUND = {
  she: { 1: "long_e" },                    // e says its name
  the: { 0: "th_this", 1: "schwa" },       // the buzzy th, then the lazy uh
  push: { 1: "oo_book" }, bush: { 1: "oo_book" },
  was: { 1: "short_u", 2: "z" },           // "wuz"
  /* "wut", owner-ruled 2026-08-12 — and this reverses a ruling the owner made
     the same morning, which is worth recording rather than tidying away. The
     first ruling was made from the WORD clip alone and kept short_o. The
     agreement check (tools/sound_agreement.py) then reported that every
     phonemisation says /wʌt/, including the carrier this very clip was cut
     from. Offered the whole sound-out both ways, the owner refused w-o-t and
     chose w-u-t. The lesson is the one the ten-sound review taught the same
     day: a clip judged ALONE is not the same question as the same clip judged
     in the company it will keep. */
  what: { 1: "short_u" },
  /* The heart words, owner-heard 2026-08-12, every one graded perfect in the
     sound-out round. Each is a word whose letters do not say what they usually
     say, which is why it is taught by sight — and the reveal still tells the
     truth about it, per the 2026-08-06 ruling. */
  to: { 1: "oo_moon" }, do: { 1: "oo_moon" },   // o says oo
  you: { 1: "oo_moon" },                        // y-ou: the ou says oo
  said: { 1: "short_e" },                       // s-ai-d: the ai says e
  my: { 1: "long_i" },                          // y says the letter I's sound
  /* "of" took three rounds, and both of its letters lie: o says the u of "up"
     and f says /v/. Round 1 was graded "iterate on this"; the fault was
     measured rather than guessed — the shipped v sat 6.2 dB louder and 400 Hz
     brighter than the vowel beside it, having been graded alone and never in
     company. Round 2 settled the v (quieter, rounder), round 3 settled the
     vowel, and the owner graded the pair perfect on 2026-08-12.

     THE SOFTENED v IS THIS WORD'S ALONE (owner-ruled 2026-08-12). It first
     replaced d:v everywhere, and measurement showed what that cost: 3.3 dB
     below the vowel here, which the owner passed, but 6.5 dB below short_e in
     "vet", 6.7 below the x in "vex" and 9.6 below the n in "van" — three words
     nobody had heard. van, vet, vat and vex keep d:v, graded perfect for them
     in SND16. A clip tuned for one word's company is not tuned for another's. */
  of: { 0: "short_u", 1: "v_soft" },
  /* "a" is the commonest word in English and was the last one missing, because
     the only pronunciation the voice offered was /eɪ/ — the letter's NAME,
     which S4 forbids the app to say. The owner solved it outside this repo and
     handed over a complete package: an af_heart schwa, 363 ms, with its recipe,
     its inputs and a hash for every file. Shipped as the exact bytes they
     graded, turned down 4.8 dB to sit at the level of the schwa already in the
     game (owner verdict, 2026-08-12, arm 2·3).

     It gets its OWN sound id rather than reusing `schwa`, on the owner's
     ruling that "the schwa with the the should remain as we already have in
     game". The two are different recordings — 360 ms against 150 — so pointing
     "a" at the shipped schwa would make the word clip and the sound clip
     disagree inside one reveal, which is fault B15 by another route. */
  a: { 0: "schwa_a" },
  wash: { 1: "short_o" },
  is: { 1: "z" }, has: { 2: "z" },
  /* THE VOICED th. "th" spells two different sounds, and until 2026-08-11 the
     tile map sent both of them to th_quiet — the VOICELESS th of "thin", a
     puff of air with no voice in it. These five take the buzzing one, /ð/, and
     were being sounded out wrongly: a child reading "the" heard "th(in)-uh".
     The other eight — thin, thick, thumb, thud, bath, math, path and moth —
     really are the quiet one and keep it.
     "with" is the one word where the two accents disagree: /wɪð/ in British
     English, /wɪθ/ in most American. It was reasoned onto the quiet th on
     2026-08-11, under the ruling for AMERICAN pronunciation. That reasoning
     was sound and the answer was wrong: the af_heart clip this game actually
     ships says /wɪð/, which tools/sound_agreement.py found by comparing the
     tiles against the voice, and the owner chose the buzzy th on 2026-08-12
     after hearing both. An accent argued from is not the accent in the file. */
  this: { 0: "th_this" }, that: { 0: "th_this" },
  then: { 0: "th_this" }, them: { 0: "th_this" }, with: { 2: "th_this" },
};
/* What each sound is, said as a person would say it. Used by the clip script,
   so anything that renders or records a pack is told the sound and not a file
   name or a letter (safety rule S4). */
const SOUND_TEXT = {
  b: "the sound at the start of bat", ch: "the sound at the start of chip",
  d: "the sound at the start of dog", f: "the sound at the start of fan",
  g: "the sound at the start of got", h: "the sound at the start of hat",
  j: "the sound at the start of jam", k: "the sound at the start of cat",
  l: "the sound at the start of leg", m: "the sound at the start of map",
  n: "the sound at the start of net", ng: "the sound at the end of ring",
  p: "the sound at the start of pig", qu: "the sound at the start of quick",
  r: "the sound at the start of run", s: "the sound at the start of sun",
  sh: "the sound at the start of ship", t: "the sound at the start of top",
  th_quiet: "the quiet sound at the start of thin",
  th_this: "the buzzy sound at the start of this", v: "the sound at the start of van",
  w: "the sound at the start of win", x: "the sound at the end of box",
  y: "the sound at the start of yes", z: "the sound at the start of zip",
  short_a: "the sound in the middle of cat", short_e: "the sound in the middle of hen",
  short_i: "the sound in the middle of pig", short_o: "the sound in the middle of hot",
  short_u: "the sound in the middle of cup", long_e: "the sound at the end of she",
  schwa: "the lazy sound in the middle of the", oo_book: "the short oo sound in book",
  /* Never "the letter A's name" (S4). This is the article: the uh of "a cat". */
  schwa_a: "the lazy uh sound of the word a",
  /* The same sound as v, made quieter and rounder for the one word that needed
     it. The text is what a person is asked to say when the clip is made, so it
     names the sound and not the treatment. */
  v_soft: "the sound at the start of van",
  oo_moon: "the long oo sound in moon",
  /* Never "the letter I's name": this text is what a person is asked to
     say when the clip is recorded or rendered, and S4 bans letter names
     from speech. It names the sound by a word that carries it. */
  long_i: "the sound at the end of my",
};
/* The sound each of a word's tiles speaks, in order. */
function soundIdsFor(word) {
  const bent = WORD_SOUND[word] || {};
  return chunkWord(word).map((g, i) => (bent[i] ? "d:" + bent[i] : soundIdFor(g)));
}
/* Every sound the bank's tiles can ask for, derived from the bank rather than
   listed by hand, so a new word can never outrun its sounds. */
/* EVERY word the app has an opinion about, not every word in a level. The
   inventory below and the render script both used to walk LEVELS, which was
   safe only by coincidence: every tricky word and every bent-sound word also
   happened to sit in a level. A word reachable any other way would have had no
   sound clip and no word clip, `resolvePack` would have returned null, and the
   whole reveal would have dropped to system speech — for that word only, which
   is the hardest kind of fault to notice. The heart-word roster in SPEC
   section 12 is the next thing that will test this, and it must not be the
   thing that finds it.

   TRICKY and WORD_SOUND are keyed BY WORD, so they are the other two places a
   word can be named, and both are folded in here. A test pins that: a word
   named in either and in no level still appears in the inventory. */
/* THE HEART ROSTER — words taught by sight, ahead of the code that would
   decode them. This is the ONE list; tools/decodable.mjs used to carry a
   second, longer one that treated all sixteen as Level 1, which is how two
   rosters drift apart and how a sentence gets levelled against a word the
   child has never met.

   A heart word still needs a SEAT in a level, because that is the only place
   buildSession draws new words from — a roster entry alone would make a word
   invisible to the game forever. So this list does not place words; it records
   which of the placed words are sight words, for the sentence leveller and for
   anyone reading the bank.

   All eight sit at Level 2, owner-ruled 2026-08-12: a heart word's level is
   where the CHILD MEETS it. That ruling replaced the SPEC section 12
   placement, which had put them where their spelling falls — to and do at
   Level 6, you and said at Level 7, my at the open-syllable level that is not
   built. "a" joined them on 2026-08-12, from a schwa package the owner made
   outside this repo: until then no word clip existed, because the voice said
   the letter's name, which S4 forbids. */
const HEART = ["the", "and", "to", "do", "you", "said", "my", "of", "a"];

function bankWords() {
  const words = new Set();
  for (const l of LEVELS) for (const w of l.words) words.add(w);
  for (const w of Object.keys(TRICKY)) words.add(w);
  for (const w of Object.keys(WORD_SOUND)) words.add(w);
  return [...words].sort();
}
function soundInventory() {
  const ids = new Set();
  for (const w of bankWords()) for (const id of soundIdsFor(w)) ids.add(id);
  return [...ids].sort();
}
const VOICE_SENTENCES = {
  "s:was": "The word was",
  "s:is": "The word is",
  "l:close": "Good try!",
  "l:wrong": "Let’s try again.",
  "e:done": "All done! Great reading today!",
  "e:levelup": "Amazing! Level up!",
};
/* The canonical clip inventory: every id a pack must cover, with its text.
   Drives the renderer, the recorder, and the gate. Every clip is spoken at
   the voice's natural speed — a stretched word stops sounding like the word. */
function voiceScript() {
  const clips = [];
  for (const [id, text] of Object.entries(VOICE_SENTENCES)) clips.push({ id, text });
  PRAISE.forEach((text, i) => clips.push({ id: "p:" + i, text }));
  for (const w of bankWords()) clips.push({ id: "w:" + w, text: w });
  clips.push({ id: "s:pronounced", text: "Pronounced:" });
  /* A sound clip's text says what the sound IS, in words a grown-up can act
     on — "the sound at the start of ship". It is never the id and never the
     letter: a script that read "th_quiet" back would prompt whoever renders
     or records it to say a file name, and one that read "s" would invite the
     letter name, which the app must never speak (safety rule S4). */
  for (const id of soundInventory()) clips.push({ id, text: SOUND_TEXT[id.slice(2)] || id.slice(2) });
  return clips;
}
/* The play order for one utterance. "seam" is a SEAM_MS pause, "seam2" the
   shorter sound-out one.

   THE SOUND-OUT REVEAL, owner-ruled 2026-08-04 and unbuilt until now: praise,
   the word, "Pronounced:", each sound on its own tile's moment, then the word
   again — on every reveal outcome. The tile animation is driven by where each
   sound falls in this plan, so the order here IS the choreography. */
function clipPlan(kind, word, praise) {
  const soundOut = (lead) => {
    const out = [lead, "seam2", "w:" + word, "seam2", "s:pronounced"];
    for (const id of soundIdsFor(word)) out.push("seam2", id);
    out.push("seam2", "w:" + word);
    return out;
  };
  if (kind === "correct") return soundOut("p:" + (PRAISE[praise] ? praise : 0));
  if (kind === "close") return soundOut("l:close");
  if (kind === "wrong") return soundOut("l:wrong");
  if (kind === "replay") return ["w:" + word];
  if (kind === "levelup") return ["e:levelup"];
  return ["e:done"];
}
/* Which entries of a plan are tile sounds, and which tile each belongs to.
   The player reports the scheduled time of each, so a tile lights the moment
   ITS sound starts rather than on a guessed delay. */
function tileSlots(plan) {
  const slots = [];
  let t = 0;
  for (let i = 0; i < plan.length; i++) if (String(plan[i]).startsWith("d:")) slots.push({ index: i, tile: t++ });
  return slots;
}
/* A plan entry that is a pause rather than a clip. Both seams live here, so a
   pause can never be mistaken for a missing clip: reading "seam2" as a clip id
   made every sound-out reveal resolve to no pack at all and fall to system
   speech, silently, with the whole approved voice sitting unused on disk. */
const isSeam = (id) => id === "seam" || id === "seam2";
const seamMs = (id) => (id === "seam2" ? SOUNDOUT_SEAM_MS : SEAM_MS);
/* One source per utterance (SPEC §5a): family if it has every clip, else the
   default pack, else null and the caller uses system speech. */
function resolvePack(plan, has) {
  for (const tier of ["family", "default"]) {
    if (plan.every((id) => isSeam(id) || has(tier, id))) return tier;
  }
  return null;
}

/* ---------- export ---------- */
function buildMarkdown(state) {
  const today = new Date().toISOString().slice(0, 10);
  const total = Object.keys(WORD_LEVEL).length;
  const mastered = Object.values(state.words).filter(ws => ws.box >= 4).length;
  const who = state.settings.childName ? state.settings.childName + "\u2019s " : "";
  let md = "# " + who + "Word Quest \u2014 Reading Log\n\n";
  md += "_Exported " + today + "_ \u00B7 **Level " + state.level + " " + LEVELS[state.level - 1].emoji + "** \u00B7 Sessions: "
     + state.sessionsCompleted + " \u00B7 Mastered: " + mastered + "/" + total + "\n\n";
  md += "| # | Date | Level | \u2705 | \uD83D\uDFE1 | \uD83D\uDD01 | Accuracy | |\n|--:|---|--:|--:|--:|--:|--:|---|\n";
  state.log.forEach(s => {
    md += "| " + s.n + " | " + s.date + " | " + s.level + " | " + s.c + " | " + s.k + " | " + s.w + " | " + s.acc + "% | "
       + (s.partial ? "partial" : "") + " |\n";
  });
  const last = state.log[state.log.length - 1];
  if (last) {
    md += "\n## Latest session (#" + last.n + ", " + last.date + (last.partial ? ", ended early" : "") + ")\n\n";
    md += last.items.map(it => "- " + it.w + " " + (it.r === "correct" ? "\u2705" : it.r === "close" ? "\uD83D\uDFE1" : "\uD83D\uDD01")
       + (it.retries ? " (" + it.retries + " retry)" : "")).join("\n") + "\n";
  }
  md += "\n## Mastery snapshot\n\n_\u2705 mastered \u00B7 \uD83D\uDFE1 learning \u00B7 \u2B1C unseen_\n\n";
  LEVELS.forEach(L => {
    md += "**Level " + L.n + " " + L.emoji + " (" + L.focus + "):** " + L.words.map(w => {
      const ws = state.words[w];
      return w + " " + (!ws || ws.attempts === 0 ? "\u2B1C" : ws.box >= 4 ? "\u2705" : "\uD83D\uDFE1");
    }).join(" \u00B7 ") + "\n\n";
  });
  return md;
}

/* ============================================================ */

export default function WordQuest() {
  const [screen, setScreen] = useState("splash");
  const [state, setState] = useState(null);
  const [persistent, setPersistent] = useState(true);
  const [readOnly, setReadOnly] = useState(false);   // F3 — set when boot timed out; blocks all writes

  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [firstResults, setFirstResults] = useState({});
  const [order, setOrder] = useState([]);
  const [retries, setRetries] = useState({});
  const [seenTwice, setSeenTwice] = useState({});   // P2-11
  const [promptCount, setPromptCount] = useState(0);
  const [phase, setPhase] = useState("ready");
  const [lastGrade, setLastGrade] = useState(null);
  const [advanceReady, setAdvanceReady] = useState(true); // P0-3
  const [exitAsk, setExitAsk] = useState(false);          // P1-4
  const [doneStats, setDoneStats] = useState(null);
  const [toast, setToast] = useState("");
  const [copyBox, setCopyBox] = useState("");
  const [resetStage, setResetStage] = useState(0);
  const [openLevels, setOpenLevels] = useState({});       // P2-4
  const [nameDraft, setNameDraft] = useState("");

  const snapRef = useRef(null);            // N-3: word-state snapshot for lossless discard
  const liveRef = useRef(null);
  const advanceRef = useRef(null);
  const stateRef = useRef(null);
  stateRef.current = state;

  /* boot with timeout — P2-6 */
  useEffect(() => {
    let alive = true, settled = false;
    const finish = (s) => {
      if (!alive || settled) return; settled = true;
      if (!s.settings.lang) s.settings.lang = "en-US";
      if (s.settings.childName === undefined) s.settings.childName = "";
      setState(s); setNameDraft(s.settings.childName || ""); setScreen("home");
    };
    const timer = setTimeout(() => {
      setReadOnly(true);                       // F3 — never write over a save we could not read
      finish(newState());
      setToast("Couldn\u2019t read saved progress. Nothing will be saved this visit.");
    }, SPLASH_TIMEOUT_MS);
    (async () => {
      const d = await loadState();
      clearTimeout(timer);
      if (settled || !alive) {                 // F3 — late data must not render or write
        if (d && !d.__corrupt) setToast("Saved progress found. Reload to continue it.");
        return;
      }
      let s, changed = false;
      if (d && d.__corrupt) { s = newState(); setToast("Saved progress was damaged. A copy was kept; starting fresh."); }
      else if (d) { const before = d.version; s = migrate(d); changed = before !== s.version; }
      else s = newState();
      finish(s);
      if (!d || changed) setPersistent(await saveState(s));
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  const persist = useCallback(async (s) => {
    if (readOnly) return;                     // F3 — a timed-out boot never overwrites
    setPersistent(await saveState(s));
  }, [readOnly]);

  /* ---------- session ---------- */
  function beginSession() {
    const s = structuredClone(state);
    const q = buildSession(s);
    setState(s); setQueue(q); setQi(0);
    setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
    setPromptCount(0); setPhase("ready"); setLastGrade(null);
    setAdvanceReady(true); setExitAsk(false);
    snapRef.current = structuredClone(s.words);   // N-3
    setScreen("session");
  }

  const currentWord = queue[qi];
  const answered = order.length;
  const totalQ = queue.length || SESSION_SIZE;  // P1-5

  function grade(result) {
    const s = structuredClone(stateRef.current);
    const word = queue[qi];
    const isRetry = firstResults[word] !== undefined;
    if (!isRetry) {
      if (!s.words[word]) s.words[word] = freshWordState();
      applyResult(s.words[word], result, s.sessionsCompleted + 1);
      setFirstResults(fr => ({ ...fr, [word]: result }));
      setOrder(o => [...o, word]);
    } else {
      setRetries(r => ({ ...r, [word]: (r[word] || 0) + 1 }));
      if (result === "correct" && s.words[word]) s.words[word].dueAt = s.sessionsCompleted + 2;
    }
    setState(s); persist(s);
    setLastGrade(result); setPhase("feedback");
    setAdvanceReady(false);
    setTimeout(() => setAdvanceReady(true), ADVANCE_GUARD_MS);   // P0-3
    if (result === "correct") buzz(28);           // N-11: no error rumble
    speak(feedbackSpeech(result, word, Math.floor(Math.random() * PRAISE.length)), s.settings.sound, s.settings.lang);
    requestAnimationFrame(() => { if (advanceRef.current) advanceRef.current.focus(); }); // P1-7
  }

  function next() {
    hush();                                          // S2 — silence the last reveal before the next attempt
    const word = queue[qi];
    let q = queue;
    const isFirstPass = (retries[word] || 0) === 0 && firstResults[word] !== undefined;
    if (lastGrade === "wrong" && isFirstPass && promptCount + (queue.length - qi) < PROMPT_CAP) {
      q = queue.slice();
      q.splice(Math.min(qi + 3, q.length), 0, word);
      setQueue(q);
      setSeenTwice(s => ({ ...s, [word]: true }));   // P2-11
    }
    const np = promptCount + 1;
    setPromptCount(np); setLastGrade(null);
    if (qi + 1 >= q.length || np >= PROMPT_CAP) finishSession(false);
    else { setQi(qi + 1); setPhase("ready"); }
  }

  /* P1-4 — explicit, honest exit semantics */
  function commitSession(partial) {
    const s = structuredClone(stateRef.current);
    if (!partial) s.sessionsCompleted += 1;           // N-2: only full sessions move the clock
    else order.forEach(w => { if (s.words[w]) s.words[w].dueAt -= 1; }); // re-anchor partial grades
    const items = order.map(w => ({ w, r: firstResults[w], retries: retries[w] || 0 }));
    const c = items.filter(i => i.r === "correct").length;
    const k = items.filter(i => i.r === "close").length;
    const w = items.filter(i => i.r === "wrong").length;
    const acc = items.length ? Math.round((c / items.length) * 100) : 0;
    const promoted = checkPromotion(s, { partial, perfect: items.length > 0 && w === 0 && k === 0 });
    s.log.push({ n: s.log.length + 1, date: new Date().toISOString().slice(0, 10),
      level: promoted ? s.level - 1 : s.level, c, k, w, acc, items, partial });
    setState(s); persist(s);
    return { c, k, w, acc, total: items.length, promoted, newLevel: s.level, partial };
  }

  function discardSession() {
    const s = structuredClone(stateRef.current);
    if (snapRef.current) s.words = structuredClone(snapRef.current);  // N-3: verbatim restore
    setState(s); persist(s);
  }

  function finishSession(partial) {
    const stats = commitSession(partial);
    setDoneStats(stats); setScreen("done"); setExitAsk(false);
    if (stats.promoted) buzz([30, 60, 30]);
    speak(stats.promoted ? "Amazing! Level up!" : "All done! Great reading today!", stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  function handleExit(choice) {
    if (choice === "save") { finishSession(true); return; }
    if (choice === "discard") { hush(); discardSession(); setExitAsk(false); setScreen("home"); return; }
    setExitAsk(false);
  }

  /* P1-1 + N-1 — replay exists only AFTER feedback; the word is never spoken pre-attempt */
  function replay() {
    if (phase !== "feedback") return;
    speak([{ text: currentWord, rate: 0.9 }], stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  /* ---------- settings ---------- */
  const mutate = (fn) => { const s = structuredClone(stateRef.current); fn(s); setState(s); persist(s); };
  const setSound = (on) => mutate(s => { s.settings.sound = on; });
  const setLang = (code) => mutate(s => { s.settings.lang = code; });
  const jumpLevel = (n) => { mutate(s => { s.level = n; s.perfectStreak = 0; }); setToast("Level set to " + n + " " + LEVELS[n - 1].emoji); };
  function commitName() {
    const clean = Array.from(nameDraft.trim()).slice(0, 20).join("");   // P7 — never bisect a surrogate pair
    mutate(s => { s.settings.childName = clean; });
  }
  async function copyLog() {
    const md = buildMarkdown(state);
    try { await navigator.clipboard.writeText(md); setToast("Log copied \u2713"); } catch (e) { setCopyBox(md); }
  }
  function doReset() {
    const s = newState();
    setState(s); persist(s); setNameDraft(""); setResetStage(0); setToast("All progress cleared.");
  }

  const masteredCount = useMemo(() => state ? Object.values(state.words).filter(ws => ws.box >= 4).length : 0, [state]);

  /* ============================ RENDER ============================ */

  if (screen === "splash" || !state) {
    return <Frame><div className="wq-center"><div className="wq-float" style={{ fontSize: 56 }}>🚀</div>
      <p style={{ marginTop: 12, fontWeight: 800, color: C.ink }}>Loading Word Quest…</p></div></Frame>;
  }

  const L = LEVELS[state.level - 1];
  const kid = state.settings.childName;

  /* ---------------- HOME ---------------- */
  if (screen === "home") {
    return (
      <Frame>
        <Zone.Header>
          <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Word Quest</span>
          <button className="wq-btn-plain" onClick={() => setScreen("parent")} aria-label="Grown-ups corner">⚙️ Grown-ups</button>
        </Zone.Header>

        <Zone.Stage>
          <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
            <h1 className="wq-display" style={{ margin: 0, color: C.ink, fontSize: "clamp(2rem,7dvh,3rem)", lineHeight: 1.1 }}>
              Word Quest
            </h1>
            <p style={{ margin: "8px 0 0", color: C.ink, fontWeight: 700, fontSize: 16 }}>
              {kid ? "Hi " + kid + "! Ready to read? 📖" : "Ready to read? 📖"}
            </p>
            <div className="wq-card" style={{ marginTop: 18, padding: 16 }}>
              <div style={{ fontWeight: 800, color: C.ink, fontSize: 18 }}>Level {state.level} {L.emoji} {L.name}</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 18, color: C.ink2, fontSize: 13.5, fontWeight: 700 }}>
                <span>🗓️ {state.sessionsCompleted} sessions</span><span>🌟 {masteredCount} mastered</span>
              </div>
            </div>
            {/* #96261d: warning red dark enough for 4.5:1 on the gradient */}
            {(!persistent || readOnly) && <p style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#96261d" }}>
              ⚠️ {readOnly ? "Saved progress could not be read. Nothing is being saved." : "Saving unavailable — progress lasts this visit only."}</p>}
          </div>
        </Zone.Stage>

        <Zone.Rail>
          <button className="wq-cta" onClick={beginSession}>▶️ Begin Session</button>
        </Zone.Rail>
        {/* P2-7 — parent-facing copy lives in the grown-up strip, not under the child's button */}
        <Zone.Strip>
          <span className="wq-striplabel">grown-up</span>
          <span style={{ fontSize: 12, color: C.strip }}>~20 words · about 5 minutes · you judge</span>
        </Zone.Strip>
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- SESSION ---------------- */
  if (screen === "session" && currentWord) {
    const fb = lastGrade ? feedbackParts(lastGrade, currentWord) : null;
    const canReplay = phase === "feedback";   // N-1
    return (
      <Frame>
        <Zone.Header>
          <button className="wq-btn-plain" onClick={() => setExitAsk(true)} aria-label="Leave session">🏠</button>
          <div style={{ flex: 1, minWidth: 0, padding: "0 10px" }}>
            <ProgressBar order={order} firstResults={firstResults} total={totalQ} />
          </div>
          {/* P2-9 — precise count, promoted into the header at tabular mono */}
          <span className="wq-mono" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{answered}/{totalQ}</span>
          <span className="wq-chip" style={{ marginLeft: 8 }}>{state.level} {L.emoji}</span>
        </Zone.Header>

        <Zone.Stage>
          <div className="wq-stagegrid">
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
                textTransform: "uppercase", color: C.ink }}>Read this word</p>
              {/* P0-2 — word baseline is fixed; everything else lives in reserved slots below */}
              <div className="wq-display wq-word" aria-live="off">{currentWord}</div>

              <div className="wq-slot-tiles" aria-hidden={phase !== "feedback"}>
                {phase === "feedback" && chunkWord(currentWord).map((g, i) => (
                  <span key={i} className="wq-display wq-tile">{g}</span>
                ))}
              </div>

              {/* N-9: one announcement channel — TTS when sound is on, live region when muted */}
              <div className="wq-slot-msg" ref={liveRef} aria-live={state.settings.sound ? "off" : "polite"} role={state.settings.sound ? undefined : "status"}>
                {phase === "feedback" && fb && (
                  <>
                    <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
                      {fb.icon} {fb.lead}<strong>{fb.d}</strong>, {fb.word}.
                    </p>
                    {TRICKY[currentWord] && <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 800, color: C.amberInk }}>⭐ {TRICKY[currentWord]}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </Zone.Stage>

        <Zone.Rail>
          {phase === "feedback" ? (
            <button ref={advanceRef} className="wq-cta" onClick={next} disabled={!advanceReady}
              style={{ background: advanceReady ? C.green : "#9fb4c4" }}>
              {qi + 1 >= queue.length ? "🏁 Finish!" : "Next word ➡️"}
            </button>
          ) : (
            <div className="wq-prompt">{kid ? kid + ", say the word out loud! 📣" : "Say the word out loud! 📣"}</div>
          )}
        </Zone.Rail>

        {/* P0-4 / P1-2 / P2-10 — grown-up strip: muted, bottom edge, small */}
        <Zone.Strip>
          <span className="wq-striplabel">grown-up · hold to grade</span>
          <button className="wq-sbtn" onClick={replay} disabled={!canReplay} aria-label="Hear the word again">🔊</button>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <HoldButton onFire={() => grade("correct")} disabled={phase === "feedback"} color={C.green} label="✓ got it" />
            <HoldButton onFire={() => grade("close")} disabled={phase === "feedback"} color={C.amber} label="~ close" />
            <HoldButton onFire={() => grade("wrong")} disabled={phase === "feedback"} color={C.red} label="↻ not yet" />
          </div>
          {/* N-12 + P0-2: one reserved marker line, so the strip height never changes
              and the word never moves between phases */}
          <span className="wq-mark wq-mono">
            {seenTwice[currentWord] && phase !== "feedback" ? "second look at this word" : " "}
          </span>
        </Zone.Strip>

        {exitAsk && (
          <Modal title="Finish early?" onClose={() => handleExit("cancel")}>
            <p style={{ margin: "0 0 14px", fontSize: 14.5, color: C.ink2, lineHeight: 1.5 }}>
              {answered === 0
                ? "Nothing has been recorded yet."
                : answered + (answered === 1 ? " word has" : " words have") + " been read. Save them as a short session, or discard so the schedule stays clean?"}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {answered > 0 && <button className="wq-cta" style={{ background: C.green }} onClick={() => handleExit("save")}>Save {answered} as a short session</button>}
              <button className="wq-cta" style={{ background: "#fff", color: C.red, border: "2px solid " + C.red }} onClick={() => handleExit("discard")}>Discard and go home</button>
              <button className="wq-btn-plain" onClick={() => handleExit("cancel")} style={{ justifySelf: "center" }}>Keep reading</button>
            </div>
          </Modal>
        )}
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- DONE ---------------- */
  if (screen === "done" && doneStats) {
    const promoted = doneStats.promoted;
    return (
      <Frame>
        <Zone.Header><span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Session complete</span></Zone.Header>
        <Zone.Stage>
          <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
            {/* P2-12 — level-up folded into the trophy, not stacked beneath it */}
            <div className="wq-trophy" style={{ borderColor: promoted ? C.purple : "transparent" }}>
              <span style={{ fontSize: "clamp(2.5rem,8dvh,4rem)" }}>🏆</span>
            </div>
            <h2 className="wq-display" style={{ margin: "10px 0 0", color: promoted ? C.purple : C.ink, fontSize: "clamp(1.5rem,5dvh,2.2rem)" }}>
              {promoted ? "Level up!" : doneStats.partial ? "Good stop" : kid ? "All done, " + kid + "!" : "All done!"}
            </h2>
            {promoted && <p style={{ margin: "2px 0 0", fontWeight: 800, color: C.purple, fontSize: 14 }}>
              Welcome to Level {doneStats.newLevel} {LEVELS[doneStats.newLevel - 1].emoji}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              <Stat n={doneStats.c} label="Got it" emoji="✅" />
              <Stat n={doneStats.k} label="So close" emoji="🟡" />
              <Stat n={doneStats.w} label="Practised" emoji="🔁" />
            </div>
            <p style={{ margin: "12px 0 0", fontWeight: 800, color: C.ink, fontSize: 15 }}>
              {doneStats.acc >= 90 ? "Superstar reading! 🌟" : doneStats.acc >= 70 ? "Great work today! 💪" : "Every try makes you stronger! 🌱"}
            </p>
          </div>
        </Zone.Stage>
        <Zone.Rail><button className="wq-cta" onClick={() => setScreen("home")}>🏠 Back home</button></Zone.Rail>
        <Zone.Strip>
          <span className="wq-striplabel">grown-up</span>
          <span style={{ fontSize: 12, color: C.strip }}>
            {doneStats.total} words · {doneStats.acc}% first-try{doneStats.partial ? " · saved as a short session" : ""}
          </span>
        </Zone.Strip>
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- GROWN-UPS ---------------- */
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={() => { setResetStage(0); setCopyBox(""); setScreen("home"); }}>← Back</button>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15, marginLeft: 8 }}>Grown-ups corner</span>
      </Zone.Header>

      <Zone.Stage scroll>
        <div style={{ width: "100%", maxWidth: 560, display: "grid", gap: 12, paddingBottom: 8 }}>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Settings</H3>
            <label htmlFor="wq-name" className="wq-lbl">Reader’s first name (optional)</label>
            {/* P2-13 — blur commits; no redundant Save button */}
            <input id="wq-name" type="text" value={nameDraft} maxLength={20}
              onChange={e => setNameDraft(e.target.value)} onBlur={commitName}
              placeholder="Leave blank to stay anonymous" className="wq-input" />
            <p className="wq-help">Saves when you tap away. Used only for greetings; stored on this device.</p>

            <div className="wq-fieldrow">
              <span className="wq-lbl">Sounds</span>
              <Seg options={[[true, "🔊 On"], [false, "🔇 Off"]]} value={state.settings.sound} onChange={setSound} />
            </div>

            {/* P2-5 — native select for locale */}
            <div className="wq-fieldrow">
              <label className="wq-lbl" htmlFor="wq-lang">Voice &amp; accent</label>
              <select id="wq-lang" className="wq-input" value={state.settings.lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            {/* P2-5 — segmented level control; P2-14 — helper text */}
            <div className="wq-fieldrow">
              <span className="wq-lbl">Jump to level</span>
              <Seg options={LEVELS.map(l => [l.n, String(l.n)])} value={state.level} onChange={jumpLevel} />
            </div>
            <p className="wq-help">Changes only which words come up next. Mastery already earned is kept, and the engine still promotes on its own.</p>
          </section>

          {/* P2-4 — collapsed mastery map with summary rows */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Mastery map</H3>
            {LEVELS.map(l => {
              const done = l.words.filter(w => state.words[w] && state.words[w].box >= 4).length;
              const seen = l.words.filter(w => state.words[w] && state.words[w].attempts > 0).length;
              const isOpen = !!openLevels[l.n];
              return (
                <div key={l.n} style={{ borderTop: "1px solid " + C.line, paddingTop: 9, marginTop: 9 }}>
                  <button className="wq-rowbtn" onClick={() => setOpenLevels(o => ({ ...o, [l.n]: !isOpen }))} aria-expanded={isOpen}>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Level {l.n} {l.emoji}</span>
                    <span className="wq-mono" style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto" }}>{done}/{l.words.length} mastered</span>
                    <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  <div className="wq-meter"><div style={{ width: (done / l.words.length) * 100 + "%", background: C.green, height: "100%" }} />
                    <div style={{ width: ((seen - done) / l.words.length) * 100 + "%", background: C.sun, height: "100%" }} /></div>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {l.words.map(w => {
                        const ws = state.words[w];
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 4 ? "#c6f2dd" : ws.box >= 2 ? "#ffe9b3" : "#ffd4d0";
                        return <span key={w} style={{ background: bg, color: C.ink, borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 700 }}>{w}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Session log</H3>
            {state.log.length === 0
              ? <p className="wq-help">No sessions yet.</p>
              : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, color: C.ink, borderCollapse: "collapse" }}>
                    <thead><tr style={{ textAlign: "left" }}>
                      <th>#</th><th>Date</th><th>Lvl</th><th>✅</th><th>🟡</th><th>🔁</th><th>Acc</th></tr></thead>
                    <tbody>{state.log.slice().reverse().map(s => (
                      <tr key={s.n} style={{ borderTop: "1px solid " + C.line }}>
                        <td>{s.n}{s.partial ? "*" : ""}</td><td>{s.date}</td><td>{s.level}</td>
                        <td>{s.c}</td><td>{s.k}</td><td>{s.w}</td><td style={{ fontWeight: 700 }}>{s.acc}%</td>
                      </tr>))}</tbody>
                  </table>
                  {state.log.some(s => s.partial) && <p className="wq-help">* ended early</p>}
                </div>}
            <button className="wq-cta" style={{ marginTop: 12, background: C.ink, fontSize: 14, padding: "11px 14px" }} onClick={copyLog}>📋 Copy log (Markdown)</button>
            {/* P2-15 */}
            {copyBox && <>
              <p className="wq-lbl" style={{ marginTop: 10 }}>Clipboard blocked — select all and copy</p>
              <textarea readOnly value={copyBox} onFocus={e => e.target.select()} rows={6} className="wq-input wq-mono" style={{ fontSize: 11.5 }} />
            </>}
          </section>

          {/* P2-3 — confirm is a different, offset control; cancel is larger */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Danger zone</H3>
            {resetStage === 0
              ? <button className="wq-sbtn" style={{ borderColor: C.muted, color: C.muted }} onClick={() => setResetStage(1)}>🗑️ Reset all progress</button>
              : <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13.5, color: C.ink, fontWeight: 700 }}>Erase every session, word score and setting?</p>
                  <button className="wq-cta" style={{ background: C.ink2 }} onClick={() => setResetStage(0)}>Keep my progress</button>
                  <button className="wq-sbtn" style={{ borderColor: C.red, color: C.red, justifySelf: "start" }} onClick={doReset}>Yes, erase everything</button>
                </div>}
          </section>
        </div>
      </Zone.Stage>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}

/* ============================ layout primitives ============================ */

function Frame({ children }) {
  return (
    <div className="wq-root">
      <style>{CSS}</style>
      <div className="wq-shell">{children}</div>
    </div>
  );
}

const Zone = {
  Header: ({ children }) => <header className="wq-header">{children}</header>,
  Stage: ({ children, scroll }) => <main className={"wq-stage" + (scroll ? " wq-scroll" : "")}>{children}</main>,
  Rail: ({ children }) => <div className="wq-rail">{children}</div>,
  Strip: ({ children }) => <div className="wq-strip">{children}</div>,
};

/* P1-6 — segmented progress: colour AND fill pattern */
function ProgressBar({ order, firstResults, total }) {
  return (
    <div className="wq-prog" role="img" aria-label={order.length + " of " + total + " words read"}>
      {Array.from({ length: total }).map((_, i) => {
        const w = order[i], r = w ? firstResults[w] : null;
        const cls = r === "correct" ? "ok" : r === "close" ? "mid" : r === "wrong" ? "bad" : "todo";
        return <span key={i} className={"wq-seg wq-seg-" + cls} />;
      })}
    </div>
  );
}

function Toast({ children }) { return <div className="wq-toast" role="status">{children}</div>; }

function Modal({ title, children, onClose }) {
  const boxRef = useRef(null);
  const returnRef = useRef(null);
  useEffect(() => {
    returnRef.current = document.activeElement;
    const box = boxRef.current;
    const focusables = () => box.querySelectorAll("button, [href], input, select, textarea");
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const r = returnRef.current;
      if (r && r.focus) r.focus();
    };
  }, [onClose]);
  return (
    <div className="wq-modalwrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="wq-modal" ref={boxRef}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</h3>
        {children}
      </div>
      <button className="wq-scrim" onClick={onClose} aria-label="Close" tabIndex={-1} />
    </div>
  );
}

/* Carried-1 — deliberate adult gesture: pointer hold ~450ms; keyboard activates directly */
function HoldButton({ onFire, disabled, color, label }) {
  const [holding, setHolding] = useState(false);
  const tRef = useRef(null);
  const clear = () => { if (tRef.current) clearTimeout(tRef.current); tRef.current = null; setHolding(false); };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    setHolding(true);
    tRef.current = setTimeout(() => { clear(); onFire(); }, 450);
  };
  const key = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFire(); }
  };
  useEffect(() => clear, []);
  return (
    <button className={"wq-sbtn wq-hold" + (holding ? " holding" : "")} disabled={disabled}
      style={{ borderColor: color, color }}
      onPointerDown={down} onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear}
      onKeyDown={key} aria-label={label + " (hold)"}
    >
      <span className="wq-holdfill" style={{ background: color }} aria-hidden="true" />
      <span style={{ position: "relative" }}>{label}</span>
    </button>
  );
}

function Stat({ n, label, emoji }) {
  return <div className="wq-card" style={{ padding: 10 }}>
    <div style={{ fontSize: 20 }}>{emoji}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{n}</div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink2 }}>{label}</div>
  </div>;
}

function H3({ children }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em",
    textTransform: "uppercase", color: C.muted }}>{children}</h3>;
}

function Seg({ options, value, onChange, disabled = [] }) {
  return (
    <div className="wq-seggroup" role="group">
      {options.map(([v, label]) => {
        const on = value === v, off = disabled.includes(v);
        return <button key={String(v)} onClick={() => !off && onChange(v)} disabled={off} aria-pressed={on}
          className={"wq-segbtn" + (on ? " on" : "")}>{label}</button>;
      })}
    </div>
  );
}

/* ============================ styles ============================ */

const CSS = `
.wq-root{
  height:100vh; height:100dvh; width:100%; overflow:hidden;
  background:linear-gradient(160deg,#8fd0fa 0%,#b9c3fb 55%,#d9c6fb 100%);
  font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;
  color:${C.ink};
}
.wq-shell{height:100%;max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:0}
.wq-display{font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.02em}
.wq-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}

/* zones — P0-1 / P1-8: fixed three-zone shell, page never scrolls in a session */
.wq-header{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:6px;padding:8px 12px}
/* N-4: overflow-y auto never engages at default text sizes, but gives 200% text a way out */
.wq-stage{flex:1 1 auto;min-height:0;display:flex;justify-content:center;padding:6px 14px;
  overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.wq-stage>*{margin:auto}
.wq-stage.wq-scroll>*{margin:10px auto}
.wq-rail{flex:0 0 auto;padding:8px 14px 6px}
/* N-5: extra bottom padding keeps controls out of the home-indicator swipe band */
.wq-strip{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:8px 12px calc(18px + env(safe-area-inset-bottom));
  background:rgba(255,255,255,.72);border-top:1px solid ${C.line};backdrop-filter:blur(6px)}
.wq-center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}

/* stage content: fixed slots so nothing shifts (P0-2) */
.wq-stagegrid{width:100%;max-width:440px}
.wq-word{font-size:clamp(2.25rem,11vh,5.5rem);font-size:clamp(2.25rem,11dvh,5.5rem);
  font-weight:700;line-height:1.05;color:${C.ink};margin:4px 0 0;word-break:break-word}
.wq-slot-tiles{min-height:52px;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}
.wq-tile{background:${C.sun};color:${C.ink};border-radius:12px;padding:5px 12px;
  font-size:clamp(1.1rem,3.2dvh,1.6rem);font-weight:700;box-shadow:0 1px 3px rgba(23,53,107,.18)}
.wq-slot-msg{height:52px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:#fff;
  font:800 clamp(1rem,2.4dvh,1.25rem)/1.1 inherit;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px rgba(23,53,107,.18);min-height:56px}
.wq-cta:disabled{cursor:default;box-shadow:none}
.wq-prompt{text-align:center;font-weight:800;color:${C.ink};font-size:clamp(.95rem,2.2dvh,1.1rem);padding:16px 0;min-height:56px}
.wq-btn-plain{border:0;background:rgba(255,255,255,.85);color:${C.ink};font:700 13px/1 inherit;
  padding:11px 13px;border-radius:999px;cursor:pointer;min-height:40px}
.wq-chip{background:rgba(255,255,255,.85);color:${C.ink};font:800 12.5px/1 inherit;padding:7px 10px;border-radius:999px;display:inline-block}
.wq-striplabel{font:800 9.5px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:${C.strip};opacity:.85}
.wq-sbtn{background:#fff;border:1.5px solid ${C.line};border-radius:9px;color:${C.strip};
  font:700 12.5px/1 inherit;padding:0 12px;min-height:44px;min-width:44px;cursor:pointer} /* N-6 */
.wq-hold{position:relative;overflow:hidden;touch-action:none}
.wq-holdfill{position:absolute;inset:0;width:0;opacity:.22}
.wq-hold.holding .wq-holdfill{width:100%;transition:width .45s linear}
.wq-sbtn:disabled{opacity:.38;cursor:default}
.wq-mark{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

/* progress (P1-6: colour + pattern) */
.wq-prog{display:flex;gap:2px;width:100%}
.wq-seg{flex:1;height:9px;border-radius:2px;min-width:3px}
.wq-seg-todo{background:rgba(255,255,255,.55)}
.wq-seg-ok{background:${C.green}}
.wq-seg-mid{background:repeating-linear-gradient(135deg,${C.sun} 0 3px,#fff 3px 6px)}
.wq-seg-bad{background:repeating-linear-gradient(90deg,${C.red} 0 2px,#fff 2px 4px)}

/* cards / forms */
.wq-card{background:#fff;border-radius:18px;box-shadow:0 2px 10px rgba(23,53,107,.12);text-align:center}
.wq-lbl{display:block;font:800 11px/1.3 inherit;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:5px}
.wq-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:${C.muted}}
.wq-input{width:100%;border:1.5px solid ${C.line};border-radius:10px;padding:11px 12px;
  font:600 15px/1.3 inherit;color:${C.ink};background:#fff;min-height:44px}
.wq-fieldrow{margin-top:14px}
.wq-seggroup{display:flex;gap:4px;background:${C.chip};border-radius:11px;padding:3px;flex-wrap:wrap}
.wq-segbtn{flex:1 1 auto;min-width:44px;min-height:40px;border:0;background:transparent;border-radius:8px;
  color:${C.strip};font:800 13px/1 inherit;cursor:pointer}
.wq-segbtn.on{background:#fff;color:${C.ink};box-shadow:0 1px 3px rgba(23,53,107,.2)}
.wq-segbtn:disabled{opacity:.4;cursor:default}
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:40px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2: toast sits above the action rail, never over the header */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(112px + env(safe-area-inset-bottom));
  background:${C.ink};color:#fff;padding:10px 16px;border-radius:999px;font:700 13px/1.3 inherit;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:rgba(23,53,107,.42);border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:#fff;border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px rgba(23,53,107,.3)}

/* a11y + motion */
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid ${C.ink};outline-offset:2px}
.wq-float{animation:wqf 2s ease-in-out infinite}
@keyframes wqf{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* landscape: word left, controls right (P2-1) */
@media (orientation:landscape) and (min-width:640px) and (min-height:420px){ /* N-7 */
  .wq-shell{max-width:960px}
  .wq-stage{padding:6px 22px}
  .wq-stagegrid{max-width:820px;display:grid;grid-template-columns:1.1fr 1fr;gap:26px;align-items:center}
  .wq-stagegrid>div{text-align:left}
  .wq-word{font-size:clamp(3rem,17dvh,7rem)}
  .wq-slot-tiles,.wq-slot-msg{justify-content:flex-start;align-items:flex-start;text-align:left}
}
`;
