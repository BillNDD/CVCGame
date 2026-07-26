import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================
   WORD QUEST v2 — CVC spaced-repetition phonics game
   Three fixed zones · grown-up strip · AA contrast · no page scroll in session
   ============================================================ */

const LEVELS = [
  { n: 1, name: "Hatchlings", emoji: "🐣", focus: "two sounds (VC)",
    words: ["at","an","am","ax","in","it","if","is","on","ox","up","us"] },
  { n: 2, name: "Sunny Start", emoji: "☀️", focus: "short a",
    words: ["cat","hat","mat","sat","man","can","ran","bat","cap","map","tap","nap","bag","dad","jam","pan","rat","sad","wag","van"] },
  { n: 3, name: "Busy Bees", emoji: "🐝", focus: "short i & o",
    words: ["sit","pig","big","dig","win","lip","hit","six","fin","bin","dog","hot","top","pot","mop","log","box","fox","hop","cot"] },
  { n: 4, name: "Rocket Words", emoji: "🚀", focus: "short e & u",
    words: ["bed","red","hen","pen","ten","net","leg","wet","jet","men","bus","cup","sun","run","fun","mud","bug","hug","nut","tub"] },
  { n: 5, name: "Explorer", emoji: "🧭", focus: "all five vowels",
    words: ["yes","zip","gum","gas","kid","cub","den","dot","fed","fig","fog","gap","hid","hut","jog","kit","lid","mix","wax","yak"] },
  { n: 6, name: "Super Sounds", emoji: "🦸", focus: "sh & ch",
    words: ["ship","shop","shut","fish","dish","wish","cash","chat","chip","chop","rich","much","such","chin","shed","shin","mash","rash","chug","chum"] },
  { n: 7, name: "Word Wizard", emoji: "🧙", focus: "th, wh, ck, ng + tricky words",
    words: ["thin","this","that","then","them","bath","math","with","when","whip","duck","sock","kick","back","ring","sing","king","long","song","was"] },
];

const TRICKY = {
  was: "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wuz.",
  is: "Tricky word! The s sounds like \u201Cz\u201D \u2014 iz.",
};
const DIGRAPHS = ["sh","ch","th","wh","ck","ng"];
const HOMOPHONES = { sun: ["son"], red: ["read"], mat: ["matt"], in: ["inn"], an: ["ann","anne"], ax: ["axe"] };
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
  const freshCur = LEVELS[level - 1].words.filter(w => !state.words[w] || state.words[w].attempts === 0);
  const list = [];
  list.push(...take(dueBelow, 5));
  if (state.sessionsCompleted >= 2) list.push(...take(confidence, 2));
  list.push(...take(curDue, SESSION_SIZE - list.length));
  list.push(...take(freshCur, SESSION_SIZE - list.length));
  if (list.length < SESSION_SIZE) {
    const anyLow = entries.filter(([w, ws]) => WORD_LEVEL[w] <= level).sort((a, b) => a[1].box - b[1].box).map(([w]) => w);
    list.push(...take(anyLow, SESSION_SIZE - list.length));
  }
  if (list.length < SESSION_SIZE && level < LEVELS.length && freshCur.length === 0) {
    // D2: next-level peek only after every current-level word has been seen
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

function checkPromotion(state) {
  if (state.level >= LEVELS.length) return false;
  const words = LEVELS[state.level - 1].words;
  if (words.filter(w => state.words[w] && state.words[w].box >= 3).length / words.length >= 0.8) { state.level += 1; return true; }
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
  if (!s.settings || typeof s.settings !== "object") s.settings = {};
  const d = newState().settings;
  for (const k of Object.keys(d)) if (s.settings[k] === undefined) s.settings[k] = d[k];
}
function heal(s) {
  if (!s || typeof s !== "object") s = {};
  healWords(s); healLog(s); healSettings(s);
  if (typeof s.sessionsCompleted !== "number" || !isFinite(s.sessionsCompleted) || s.sessionsCompleted < 0) s.sessionsCompleted = 0;
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
  version: 3, level: 1, sessionsCompleted: 0,
  settings: { mode: "mic", sound: true, childName: "", lang: "en-US" },
  words: {}, log: [],
});

/* ---------- speech ---------- */
function speak(text, enabled, lang) {
  if (!enabled) return;
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.1; if (lang) u.lang = lang;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} } // P2-8
const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function feedbackParts(result, word) {
  const d = dashed(word);
  if (result === "correct") return { lead: "Great job! That is ", d, word, icon: "🎉" };
  if (result === "close") return { lead: "Good try! The correct pronunciation is ", d, word, icon: "💪" };
  return { lead: "Let\u2019s try that again. The correct pronunciation is ", d, word, icon: "🔁" };
}
const feedbackSpeech = (r, w) =>
  r === "correct" ? "Great job! " + w + "!" : r === "close" ? "Good try! The word is " + w + "." : "Let\u2019s try again. The word is " + w + ".";

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
  const [heard, setHeard] = useState("");
  const [lastGrade, setLastGrade] = useState(null);
  const [advanceReady, setAdvanceReady] = useState(true); // P0-3
  const [micTried, setMicTried] = useState(false);        // N-8: label only — never gates replay
  const [exitAsk, setExitAsk] = useState(false);          // P1-4
  const [doneStats, setDoneStats] = useState(null);
  const [toast, setToast] = useState("");
  const [copyBox, setCopyBox] = useState("");
  const [resetStage, setResetStage] = useState(0);
  const [openLevels, setOpenLevels] = useState({});       // P2-4
  const [nameDraft, setNameDraft] = useState("");

  const recRef = useRef(null);
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
      if (!SR) s.settings.mode = "parent";
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
    setPromptCount(0); setPhase("ready"); setHeard(""); setLastGrade(null);
    setMicTried(false); setAdvanceReady(true); setExitAsk(false);
    snapRef.current = structuredClone(s.words);   // N-3
    setScreen("session");
  }

  const currentWord = queue[qi];
  const answered = order.length;
  const totalQ = queue.length || SESSION_SIZE;  // P1-5

  function grade(result) {
    hardStopRec();
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
    speak(feedbackSpeech(result, word), s.settings.sound, s.settings.lang);
    requestAnimationFrame(() => { if (advanceRef.current) advanceRef.current.focus(); }); // P1-7
  }

  function next() {
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
    setPromptCount(np); setHeard(""); setLastGrade(null); setMicTried(false);
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
    const promoted = partial ? false : checkPromotion(s);
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
    hardStopRec();
    const stats = commitSession(partial);
    setDoneStats(stats); setScreen("done"); setExitAsk(false);
    if (stats.promoted) buzz([30, 60, 30]);
    speak(stats.promoted ? "Amazing! Level up!" : "All done! Great reading today!", stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  function handleExit(choice) {
    hardStopRec();
    if (choice === "save") { finishSession(true); return; }
    if (choice === "discard") { discardSession(); setExitAsk(false); setScreen("home"); return; }
    setExitAsk(false);
  }

  /* ---------- microphone (P1-3 honest state) ---------- */
  function startRec() {
    if (!SR) { fallbackToParent("This browser can\u2019t listen \u2014 switched to grown-up mode."); return; }
    try {
      const rec = new SR();
      rec.lang = (stateRef.current && stateRef.current.settings.lang) || "en-US";
      rec.interimResults = false; rec.maxAlternatives = 5;
      rec.onresult = (ev) => {
        const alts = []; const res = ev.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript.toLowerCase().trim());
        handleTranscripts(alts);
      };
      rec.onerror = (ev) => {
        if (["not-allowed", "service-not-allowed", "audio-capture"].includes(ev.error)) fallbackToParent("Microphone isn\u2019t available \u2014 switched to grown-up mode.");
        else if (ev.error === "no-speech") { setPhase("ready"); setMicTried(true); setToast("Didn\u2019t catch that \u2014 tap to try again."); }
        else { setPhase("ready"); setMicTried(true); }
      };
      rec.onend = () => { recRef.current = null; setPhase(p => (p === "listening" ? "ready" : p)); setMicTried(true); };
      recRef.current = rec; rec.start(); setPhase("listening");
    } catch (e) { fallbackToParent("Microphone isn\u2019t available \u2014 switched to grown-up mode."); }
  }
  const listening = phase === "listening" && !!recRef.current;
  function softStop() { try { if (recRef.current) recRef.current.stop(); else setPhase("ready"); } catch (e) { setPhase("ready"); } }
  function hardStopRec() { try { if (recRef.current) { recRef.current.onend = null; recRef.current.stop(); } } catch (e) {} recRef.current = null; }
  function fallbackToParent(msg) {
    const s = structuredClone(stateRef.current); s.settings.mode = "parent";
    setState(s); persist(s); setPhase("ready"); setToast(msg);
  }
  function handleTranscripts(alts) {
    const word = queue[qi];
    const ok = alts.some(a => {
      const clean = a.replace(/[^a-z\s]/g, ""); const toks = clean.split(/\s+/).filter(Boolean);
      const m = t => t === word || (HOMOPHONES[word] || []).includes(t);
      return m(clean) || toks.some(m);
    });
    setHeard(alts[0] || "");
    if (ok) grade("correct"); else setPhase("heard");
  }

  /* P1-1 + N-1 — replay exists only AFTER feedback; the word is never spoken pre-attempt */
  function replay() {
    if (phase !== "feedback") return;
    speak(currentWord, stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  /* ---------- settings ---------- */
  const mutate = (fn) => { const s = structuredClone(stateRef.current); fn(s); setState(s); persist(s); };
  const setMode = (mode) => mutate(s => { s.settings.mode = mode; });
  const setSound = (on) => mutate(s => { s.settings.sound = on; });
  const setLang = (code) => mutate(s => { s.settings.lang = code; });
  const jumpLevel = (n) => { mutate(s => { s.level = n; }); setToast("Level set to " + n + " " + LEVELS[n - 1].emoji); };
  function commitName() {
    const clean = Array.from(nameDraft.trim()).slice(0, 20).join("");   // P7 — never bisect a surrogate pair
    mutate(s => { s.settings.childName = clean; });
  }
  async function copyLog() {
    const md = buildMarkdown(state);
    try { await navigator.clipboard.writeText(md); setToast("Log copied \u2713"); } catch (e) { setCopyBox(md); }
  }
  function doReset() {
    const s = newState(); if (!SR) s.settings.mode = "parent";
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
          <span style={{ fontSize: 12, color: C.strip }}>~20 words · about 5 minutes · {state.settings.mode === "mic" ? "microphone" : "you judge"}</span>
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
                    {TRICKY[currentWord] && <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 800, color: C.amber }}>⭐ {TRICKY[currentWord]}</p>}
                  </>
                )}
                {phase === "listening" && <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.action }}>🎙️ Listening…</p>}
                {phase === "heard" && <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink2 }}>Nice try! Grown-up will check. 👇</p>}
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
          ) : state.settings.mode === "mic" ? (
            listening
              ? <button className="wq-cta" onClick={softStop} style={{ background: C.ink }}>⏹️ Stop</button>
              : <button className="wq-cta" onClick={startRec}>🎙️ {micTried ? "Record again" : "Start Recording"}</button>
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
          <span className="wq-heard wq-mono">
            {phase === "heard" && heard ? "heard “" + heard + "”"
              : seenTwice[currentWord] && phase !== "feedback" ? "second look at this word" : " "}
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
              <span className="wq-lbl">Answer mode</span>
              <Seg options={[["mic", "🎙️ Mic"], ["parent", "👍 You judge"]]} value={state.settings.mode}
                onChange={setMode} disabled={!SR ? ["mic"] : []} />
            </div>
            <p className="wq-help">The app only ever auto-confirms a <em>correct</em> reading. Anything else comes to you — recognition is unreliable for small voices.</p>

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
.wq-heard{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

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
