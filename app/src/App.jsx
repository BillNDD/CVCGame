import { useState, useEffect, useRef, useMemo, useCallback } from "react";
/* All game logic comes from the generated engine module. The components in
   this app never re-implement it (work item W1). */
import {
  LEVELS, PRE_LEVELS, SESSION_SIZE, PROMPT_CAP, ADVANCE_GUARD_MS, SPLASH_TIMEOUT_MS,
  C, SEAM_MS, freshWordState, applyResult, buildSession, checkPromotion,
  migrate, newState, buildMarkdown, feedbackSpeech, PRAISE, speak, hush, buzz, ttsSafePraise, ttsSafeWord,
  sessionSentences, sentencePlan, sentenceClosePlan, revealWord, revealWordLongest,
  sentencesUpTo, shuffle, REVEAL_LINES, SENTENCE_PRAISE, sentenceLead,
} from "@engine";
/* W3 — the storage adapter is IndexedDB in the standalone app. */
import { loadState, saveState } from "./storage.js";

/* B17's backstop, in milliseconds. Above the longest legitimate reveal ever
   measured (~8.7 s on a cold start), so it can only fire on a path where the
   reveal is genuinely wedged — never into a slow-but-working sound-out. */
const ADVANCE_BACKSTOP_MS = 10000;
import { installForegroundCheck } from "./updates.js";
import { initVoicePacks, speakVoice, playClips, stopClips, unlockVoice } from "./voicepacks.js";
import Frame from "./components/Frame.jsx";
import Zone from "./components/Zone.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import SessionScreen from "./screens/SessionScreen.jsx";
import DoneScreen from "./screens/DoneScreen.jsx";
import ParentScreen from "./screens/ParentScreen.jsx";
import PreSessionScreen from "./screens/PreSessionScreen.jsx";
import PreDoneScreen from "./screens/PreDoneScreen.jsx";
import usePreSession from "./usePre.js";

/* The microphone left three device-local markers behind on every install that
   ever ran a version carrying it: which mode an adult chose, whether
   permission was denied, and whether the one-time mode heal had been spent.
   Nothing reads them now. They are cleared rather than left to rot, because
   the owner's ruling was to REMOVE the microphone, not to stop looking at it,
   and a family's browser should not go on storing the answer to a question the
   app no longer asks. Wrapped, because a private-mode browser refuses the API
   outright. */
const MIC_MARKERS = ["wq-mode-chosen", "wq-mode-denied", "wq-mic-heal-1"];
const clearMicMarkers = () => {
  try { for (const k of MIC_MARKERS) localStorage.removeItem(k); } catch { /* private mode */ }
};

/* What a Word Quest backup must look like before it may replace progress.
   Files written from this version carry a marker; older backups are still
   accepted on their shape, so a family's existing file keeps working. */
/* Every file must LOOK like a save before anything is replaced. The marker is
   an extra signal, never a substitute for the shape: a file whose entire
   content was {"application":"word-quest-backup"} used to be accepted, and the
   app answered "Backup loaded." while replacing a family's whole history with
   an empty state. An adult reaches for a backup exactly when something has
   already gone wrong, so a truncated or hand-edited file is the likely one. */
/* Exported for the app-mutation gate (G19): a JSON file can never be an array
   that also carries named properties, so the Array.isArray clause cannot be
   reached through the import path and its mutant could not be killed there.
   The clause still guards a real shape — an array with properties is trivial
   to build in JavaScript — so the predicate is tested directly rather than
   the guard being dropped as unreachable. */
export const isBackup = (b) =>
  !!b && typeof b === "object" && !Array.isArray(b) &&
  typeof b.level === "number" && isFinite(b.level) &&
  !!b.words && typeof b.words === "object" && !Array.isArray(b.words) &&
  !!b.settings && typeof b.settings === "object" && !Array.isArray(b.settings);

/* A2-003 — the two facts the advance control turns on, decided in one place so
   its label and the press it triggers can never disagree: is a second look
   coming, and does this press end the session? The retry rule is SPEC section 4:
   a first-attempt miss goes back in the queue once, if the prompt cap allows.
   The control used to read "Finish!" straight off the queue as it stands, so a
   miss on the last slot promised an ending and then served a thirteenth prompt.
   Pure, and reads only what the rule needs. */
function advanceDecision({ lastGrade, retries, firstResults, word, promptCount, queue, qi }) {
  const retry = lastGrade === "wrong"
    && (retries[word] || 0) === 0 && firstResults[word] !== undefined
    && promptCount + (queue.length - qi) < PROMPT_CAP;
  return { retry, finishes: !retry && (qi + 1 >= queue.length || promptCount + 1 >= PROMPT_CAP) };
}

/* Free play never finishes and has no prompt cap, so only the retry rule
   survives the fork. Decided out here so the App body stays under the G6
   complexity ceiling. */
function advanceFork(freePlay, args) {
  if (!freePlay) return advanceDecision(args);
  return {
    retry: args.lastGrade === "wrong" && (args.retries[args.word] || 0) === 0
      && args.firstResults[args.word] !== undefined,
    finishes: false,
  };
}

/* Truly random free play (SPEC section 6): every block is a uniform draw from
   the WHOLE bank, all levels at once. Draws inside a block are without
   replacement — a natural repeat would collide with its own first result and
   be graded as a retry, silently skipping the count-up — and the first draw
   never equals the word the child just read, so a block boundary can never
   show the same word twice in a row. */
const ALL_WORDS = LEVELS.flatMap((l) => l.words);
function buildRandomBlock(prevWord) {
  const pool = ALL_WORDS.filter((w) => w !== prevWord);
  const block = [pool.splice(Math.floor(Math.random() * pool.length), 1)[0]];
  if (prevWord) pool.push(prevWord);
  while (block.length < SESSION_SIZE) {
    block.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return block;
}

export default function App() {
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
  /* How long the child is being asked to wait, so the control can show it
     (A1-004). Zero means NOT YET KNOWN — no arm has happened since the grade
     — and the rail shows no fill at all rather than a bar sweeping a length
     nobody has measured (B17: the length arrives when the clips schedule, and
     nothing is armed before it). */
  const [waitMs, setWaitMs] = useState(0);
  /* Where the fill already stands, as a percent, when the wait is re-armed —
     so the sweep continues from its own position instead of restarting. */
  const [waitFrom, setWaitFrom] = useState(0);
  /* One entry per tile: how many times that tile has been marked this reveal.
     Empty whenever no sound-out is playing — sound off, or system speech took
     the utterance and its timings cannot be known, in which case the tiles
     stay plain rather than ringing against the wrong sound. */
  const [pops, setPops] = useState([]);
  /* THE SENTENCE INTERLUDE (SPEC section 12 points 2 and 6). `plan` is where
     the sentences fall in this session, computed once when the session is
     built; `sentence` is the one showing now, or null; `openWord` is the one
     word whose pieces are visible — exactly one, ever (point 4).

     None of this touches the queue, the boxes or the streak. A sentence is
     never scheduled and never gates promotion (points 3 and 4), so it is held
     beside the session rather than inside it: a sentence in `queue` would be a
     sentence in `order`, in `firstResults` and in the promotion arithmetic,
     which is three rules broken by one convenience. */
  const sentencePlanRef = useRef([]);
  const closeTimer = useRef(null);
  const fpSentences = useRef([]);
  const [sentence, setSentence] = useState(null);
  /* "attempt" while the child reads and the grown-up's controls are live;
     "reveal" once the mark lands (or at once in free play, where nothing is
     graded). The attempt phase is what open-faults N was opened about. */
  const [sentencePhase, setSentencePhase] = useState(null);
  const sentenceGraded = useRef(false);
  const [shownSentences, setShownSentences] = useState([]);
  const [openWord, setOpenWord] = useState(null);
  const popTimers = useRef([]);
  const [exitAsk, setExitAsk] = useState(false);          // P1-4
  const [doneStats, setDoneStats] = useState(null);
  const [toast, setToast] = useState("");
  const [copyBox, setCopyBox] = useState("");
  const [resetStage, setResetStage] = useState(0);
  const [openLevels, setOpenLevels] = useState({});       // P2-4
  const [nameDraft, setNameDraft] = useState("");
  /* Free play (SPEC section 6): the same loop against a THROWAWAY clone.
     Results land in fpState.current so the mix keeps evolving, and the real
     save is never written - not the boxes, the schedule, the log, or the
     session count. Promotion is pinned off for the visit: a level-up that is
     not real must never be celebrated. */
  const [freePlay, setFreePlay] = useState(false);
  const [fpCount, setFpCount] = useState(0);
  const fpState = useRef(null);
  /* The chooser between the tap and the game: truly random, or the child's
     level. The mode lives in a ref because only begin and next read it. */
  const [fpChooser, setFpChooser] = useState(false);
  const fpMode = useRef("level");
  /* Stable, because Modal re-takes focus whenever its onClose identity
     changes: an inline closure here would snap the grown-up's focus back to
     the first choice every time a toast expired behind the dialog. */
  const cancelFpChooser = useCallback(() => setFpChooser(false), []);

  const snapRef = useRef(null);            // N-3: word-state snapshot for lossless discard
  const advanceRef = useRef(null);
  const gradedRef = useRef(null);          // the queue position this attempt has already graded
  const advanceTimer = useRef(null);       // P0-3: when the advance control comes alive
  /* B17's last line of defence: armed at the grade, cleared by ANY real arm.
     It exists for the path nobody has met — a decode that hangs forever with
     sound on — because a control that never comes alive traps the grown-up in
     the session. Longer than the longest legitimate reveal, so it can never
     fire into a slow-but-working sound-out; the measured worst reveal arms
     for good at ~8.7 s and this sits above it. */
  const advanceBackstop = useRef(null);
  const fillTrack = useRef(null);          // the fill's live segment {from, ms, t0}, so a re-arm continues it
  const advanceLive = useRef(true);        // the same fact, readable inside a handler
  const stateRef = useRef(null);
  stateRef.current = state;

  /* boot with timeout — P2-6 */
  useEffect(() => {
    let alive = true, settled = false;
    clearMicMarkers();
    const finish = (s) => {
      if (!alive || settled) return; settled = true;
      if (!s.settings.lang) s.settings.lang = "en-US";
      if (s.settings.childName === undefined) s.settings.childName = "";
      /* S6's second call (owner-approved 2026-08-03) defaults on; the corner
         holds the off switch, and old saves heal to the default here. */
      if (s.settings.updateCheck === undefined) s.settings.updateCheck = true;
      setState(s); setNameDraft(s.settings.childName || ""); setScreen("home");
    };
    const timer = setTimeout(() => {
      setReadOnly(true);                       // F3 — never write over a save we could not read
      finish(newState());
      setToast("Couldn’t read saved progress. Nothing will be saved this visit.");
    }, SPLASH_TIMEOUT_MS);
    (async () => {
      initVoicePacks();                        // SPEC §5a — never blocks the boot
      const d = await loadState();
      clearTimeout(timer);
      if (settled || !alive) {                 // F3 — late data must not render or write
        if (d && !d.__corrupt) setToast("Saved progress found. Reload to continue it.");
        return;
      }
      let s, changed = false;
      /* An unreadable save is not an absent one. Play this visit, write
         nothing, and leave the save on disk for the next attempt. */
      if (d && d.__unreadable) {
        setReadOnly(true);                     // exactly like a timed-out boot: play, never write
        finish(newState());
        setToast("Couldn’t read saved progress. Nothing will be saved this visit.");
        return;
      }
      if (d && d.__corrupt) { s = newState(); setToast("Saved progress was damaged. A copy was kept; starting fresh."); }
      else if (d) {
        const before = d.version; s = migrate(d); changed = before !== s.version;
      }
      else s = newState();
      finish(s);
      if (!d || changed) {
        setPersistent(await saveState(s));
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  /* SPEC section 7a - the foreground check, S6's second permitted call
     (owner-approved 2026-08-03). The setting is read per event through the
     ref, so the corner's off switch applies at once. */
  useEffect(() => installForegroundCheck({
    doc: document,
    getRegistration: () => ("serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistration()
      : Promise.resolve(null)),
    isOn: () => !!(stateRef.current && stateRef.current.settings.updateCheck),
  }), []);

  /* An update must never reload the page under a child mid-session
     (app/src/swrefresh.js decides when it is safe). */
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("wq-screen", { detail: screen })); } catch (e) { /* no window */ }
  }, [screen]);

  const persist = useCallback(async (s) => {
    if (readOnly) return;                     // F3 — a timed-out boot never overwrites
    setPersistent(await saveState(s));
  }, [readOnly]);

  /* ---------- session ---------- */
  function beginSession() {
    unlockVoice();                 // a real tap: the audio engine may play from here on
    /* A save inside the ladder begins a PRE session; everyone else gets the
       words. One button, one meaning: begin where the child is. */
    if (stateRef.current.preLevel > 0) { beginPre(); return; }
    const s = structuredClone(state);
    const q = buildSession(s);
    setState(s); setQueue(q); setQi(0);
    setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
    /* Where this session's sentences fall, decided once. Deciding it per item
       would let the same sentence be drawn twice in one session, and a child
       who meets "The cat sat on the mat." twice in ten minutes has been given
       one fewer sentence than the level had for them.
       THE PLAN IS SIZED TO THIS SESSION'S REAL QUEUE, not to the target
       (build reviewer, 2026-08-15): with the default the slots sat at 5, 10
       and 15 of an assumed twenty, and every session shorter than sixteen
       items silently dropped its later sentences — a ten-word level showed
       one of the three its comment promised. A sentence planned past the last
       word is a sentence the log claims was offered and the child never met. */
    sentencePlanRef.current = sessionSentences(s.level, q.length);
    setSentence(null); setShownSentences([]); setOpenWord(null);
    setPromptCount(0); setPhase("ready"); setLastGrade(null);
    setAdvanceReady(true); advanceLive.current = true; setExitAsk(false);
    gradedRef.current = null;                          // and grades its first word afresh
    snapRef.current = structuredClone(s.words);   // N-3
    setScreen("session");
  }

  function beginFreePlay(mode) {
    unlockVoice();
    fpMode.current = mode;
    fpState.current = structuredClone(stateRef.current);
    setFpChooser(false);
    setFreePlay(true); setFpCount(0);
    setQi(0);
    setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
    setPromptCount(0); setPhase("ready"); setLastGrade(null);
    setAdvanceReady(true); advanceLive.current = true; setExitAsk(false);
    gradedRef.current = null;
    setSentence(null); setShownSentences([]); setOpenWord(null);
    /* SENTENCE FREE PLAY (SPEC section 12 point 7). The queue holds sentences
       rather than words and there is no grading at all: free play writes
       nothing to the record, ever (design rule 1 and S1), so a sentence read
       here teaches and celebrates and schedules nothing — which is what a
       sentence does inside a session anyway.

       The pool is every sentence up to and including the child's level. One
       earlier is practice they have earned; one later is the guessing
       exercise the decodability rule exists to prevent. */
    if (mode === "sentences") {
      const pool = shuffle(sentencesUpTo(fpState.current.level));
      fpSentences.current = pool;
      setQueue(pool); showSentence(pool[0], true);
      setScreen("session");
      return;
    }
    setQueue(mode === "random" ? buildRandomBlock("") : buildSession(fpState.current));
    setScreen("session");
  }

  /* Bring the advance control alive after `ms`. A later call can push the
     moment further out — the reveal turns out to be longer than the short
     guard — but never takes a control back once the child can see it live. */
  /* The wait is armed twice on every word: the 400 ms guard the moment the
     result is recorded, then the reveal's real length once its clips are
     scheduled. The timer is right both times, but the fill has to survive the
     handover without moving backwards, and it has failed at that twice. First
     it was given the new length alone, restarted from zero, and snapped back
     from a fast sweep to the start of a six-second one. The second attempt
     carried the elapsed TIME across (a negative animation-delay), but the new
     animation maps that time onto the longer track, so the drawn POSITION
     still stepped back a few pixels at the handover — G7 caught it under
     load. What must be continuous is the position. On a re-arm the fill now
     starts from wherever it is and sweeps to the far edge over exactly the
     remaining wait: never backwards, and it still lands as the control
     wakes. */
  /* The sound-out reveal's choreography. Each tile takes its ring the moment
     its OWN sound starts, on times the player measured off the clips it has
     just scheduled — never a guessed delay, which would drift apart from the
     sound the first time a word grew a tile or a sound was re-recorded a few
     milliseconds longer. A tile carries a count rather than a flag, so the
     ring restarts cleanly if the same tile is ever marked twice in one
     reveal; React remounts the span on the new key and the animation runs
     from its first frame. Nothing here can fire outside the feedback phase:
     grade() clears the timers before it arms new ones, and next() clears them
     with the reveal's sound. */
  function clearPops() {
    popTimers.current.forEach(clearTimeout);
    popTimers.current = [];
    setPops([]);
  }
  function schedulePops(tiles = []) {
    popTimers.current.forEach(clearTimeout);
    popTimers.current = tiles.map((t, i) => setTimeout(
      () => setPops(p => { const n = p.slice(); n[i] = { n: (n[i]?.n || 0) + 1, ms: t.ms }; return n; }), t.at));
  }

  /* `real` marks the reveal's own measured length, which always wins. Without
     it the 400 ms guard could reach its end first — six clips have to be
     fetched and decoded before a length is known, and after a recording the
     audio context is rebuilt and the decoded-clip cache dropped, so every
     reveal in microphone mode decodes cold — and the guard's early arrival
     would leave the control live for the whole seven-second reveal with the
     fill sitting full. The first tap then kills the sound-out, which is the
     one thing the wait exists to protect (CVC-UX-001). */
  function armAdvance(ms, real = false) {
    if (advanceLive.current && !real) return;
    clearTimeout(advanceTimer.current);
    clearTimeout(advanceBackstop.current);
    const now = Date.now();
    let from = 0;
    /* The guard may already have run out and woken the control. Take it back:
       the true wait is the one the child is actually living through, and the
       word is the thing the wait exists to protect. */
    if (real) { advanceLive.current = false; setAdvanceReady(false); }
    if (fillTrack.current) {
      /* The fill continues from where it is, on the longer track, exactly as
         it always has. Redrawing it at the true wait's honest fraction was
         tried and is wrong: it sent the bar backwards, from 12 per cent to 4,
         and A1-004's whole point is that a bar which jumps backwards is not
         information. G7 caught it. Where the guard has already finished, the
         bar therefore sits full while the control is held — which is a fair
         reading of "you are waiting", and the alternative is a live control
         that lets the first tap kill the sounding-out. */
      const f = fillTrack.current;
      from = Math.min(1, f.from + (1 - f.from) * Math.max(0, (now - f.t0) / f.ms));
    }
    fillTrack.current = { from, ms, t0: now };
    setWaitMs(ms);
    setWaitFrom(Math.round(from * 1000) / 10);
    advanceTimer.current = setTimeout(() => { advanceLive.current = true; setAdvanceReady(true); }, ms);
  }

  /* A1-007 / A2-005 — P1-7, the keyboard's place in the session. The grade used
     to hand focus to the advance control straight away, but the control is
     disabled for the whole reveal, and focusing a disabled button does nothing:
     focus fell to the page body, so Enter did nothing and VoiceOver lost the
     session on every word. An effect can wait for the control to come alive.
     Focus is only taken from the page body or from the result control the
     grown-up just used — if they have moved to another control, or the exit
     dialog is open, their choice stands. */
  useEffect(() => {
    if (!advanceReady || phase !== "feedback" || exitAsk) return;
    const el = advanceRef.current;
    if (!el || el.disabled) return;
    const from = document.activeElement;
    if (from && from !== document.body && !from.classList.contains("wq-hold")) return;
    el.focus();
  }, [advanceReady, phase, exitAsk]);

  const currentWord = queue[qi];
  const answered = order.length;
  const totalQ = queue.length || SESSION_SIZE;  // P1-5

  /* Everything advanceDecision needs is already known in this render, so the
     label the child reads and the queue next() builds come from one value. */
  const { retry: retryComing, finishes } =
    advanceFork(freePlay, { lastGrade, retries, firstResults, word: currentWord, promptCount, queue, qi });

  function grade(result) {
    /* One attempt, one result. Both result controls can be held at once — two
       fingers, or a palm across the strip — and each hold matures on its own
       timer. The controls turn themselves off with the feedback phase, but
       that only takes effect once React has committed the render, and a
       second hold maturing inside that window used to count the word twice.
       The grown-up was then offered "2 words have been read" for one word. */
    if (gradedRef.current === qi) return;
    gradedRef.current = qi;
    /* Free play grades the throwaway clone, so the mix evolves but the real
       save is untouched - setState and persist are never reached. */
    const s = freePlay ? fpState.current : structuredClone(stateRef.current);
    const word = queue[qi];
    const isRetry = firstResults[word] !== undefined;
    if (!isRetry) {
      if (!s.words[word]) s.words[word] = freshWordState();
      applyResult(s.words[word], result, s.sessionsCompleted + 1);
      setFirstResults(fr => ({ ...fr, [word]: result }));
      setOrder(o => [...o, word]);
      if (freePlay) setFpCount(c => c + 1);
    } else {
      setRetries(r => ({ ...r, [word]: (r[word] || 0) + 1 }));
      if (result === "correct" && s.words[word]) s.words[word].dueAt = s.sessionsCompleted + 2;
    }
    if (!freePlay) { setState(s); persist(s); }
    setLastGrade(result); setPhase("feedback");
    setAdvanceReady(false); advanceLive.current = false; fillTrack.current = null;
    setWaitFrom(0); setWaitMs(0);
    clearPops();
    /* P0-3, and CVC-UX-001: the reveal runs about five to seven seconds —
       praise, a pause, "The word was", a pause, then the word — and advancing
       silences it. A child who taps at once never hears the word said
       properly, which is the one thing the reveal exists for. So the control
       waits for the word.

       B17, FIXED 2026-08-15: the 400 ms guard used to be armed HERE, as a
       starting gun — and when six clips took longer than that to fetch and
       decode, it fired first, the control sat live and green in the middle of
       the sound-out for ~590 measured milliseconds, and the real length then
       "took it back". Promised for the beta after 18 and missed in 19. Now
       NOTHING is armed at grade time. Each path that learns the reveal's
       length is the thing that arms:
       - the clips schedule    -> the real length, with the guard as a FLOOR;
       - the pack cannot play  -> the guard, once system speech is underway
         (all five B7 fallback paths land here, the suspended iPad context
         included);
       - sound off             -> the guard at once, since playClips fires
         neither callback when it is disabled;
       - anything else — a decode that hangs forever, a path nobody has met —
       -> the backstop below, longer than the longest legitimate reveal, so a
         wedged reveal cannot trap the grown-up and a slow-but-working one is
         never cut into. The window is closed by never opening it, not late. */
    clearTimeout(advanceBackstop.current);
    if (!s.settings.sound) armAdvance(ADVANCE_GUARD_MS);
    else advanceBackstop.current = setTimeout(() => armAdvance(ADVANCE_GUARD_MS), ADVANCE_BACKSTOP_MS);
    if (result === "correct") buzz(28);           // N-11: no error rumble
    unlockVoice();
    const praiseIdx = Math.floor(Math.random() * PRAISE.length);
    speakVoice(result, word, praiseIdx, s.settings.sound,
      /* The system voice says "reed" for "read". The recorded clip does not,
         so only this fallback is remapped to a praise line it can say. */
      (why) => { noteFallback(why); speak(feedbackSpeech(result, word, ttsSafePraise(praiseIdx)), true, s.settings.lang); armAdvance(ADVANCE_GUARD_MS); },
      (ms, tiles) => { armAdvance(Math.max(ms, ADVANCE_GUARD_MS), true); schedulePops(tiles); });
    /* P1-7 lives in the effect below: this is the moment the control is
       disabled, so focusing it from here does nothing at all. */
  }

  /* THE SENTENCE, shown between two words (SPEC section 12 point 6). It
     arrives with an ATTEMPT PHASE everywhere (owner-ruled 2026-08-14 for the
     session, fixing open-faults N — "the child never gets a chance to be
     graded or do anything" — and 2026-08-15 for free play, from the owner's
     own phone: the reveal "plays without providing the child a chance to
     figure it out"): the sentence appears SILENT, the child reads it aloud,
     the grown-up marks it, and only the mark starts the reveal — S2's
     promise, extended from the word to the sentence. Free play's own promise
     is untouched by the mark: nothing is ever recorded there (design rule 1
     and S1), exactly as free-play WORD grades already record nothing real. */
  function showSentence(item, free = false) {
    /* WHICH WORD GETS SOUNDED OUT. In a session it is the word the LEVEL
       teaches (SPEC section 12 point 6). Free play has no such word — a
       sentence there may come from any level the child has reached — so the
       owner ruled on 2026-08-13, from four costed options: the LONGEST word,
       counted in sound tiles. Stable, so the same sentence teaches the same
       word every time; a random pick was offered and refused for exactly the
       reason the session rule gives. */
    const w = free ? revealWordLongest(item.text) : revealWord(item.text, stateRef.current.level);
    setSentence(item); setOpenWord(w); setPhase("sentence");
    setSentencePhase("attempt");
    sentenceGraded.current = false;
    setShownSentences((ids) => [...ids, item.id]);
    clearPops();
    unlockVoice();
  }
  /* The reveal itself, shared by the two doors that open it: a free-play
     arrival (no lead — nothing was graded) and a session mark (a lead by
     grade). One function, because two copies of this plan is how a queue and
     a session count stop agreeing. */
  function playSentenceReveal(item, w, leadId) {
    const line = REVEAL_LINES[Math.floor(Math.random() * REVEAL_LINES.length)];
    const plan = leadId ? [leadId, "seam", ...sentencePlan(item.id, w, line)]
      : sentencePlan(item.id, w, line);
    /* NO SYSTEM-SPEECH FALLBACK HERE, and that is a decision rather than an
       omission. Every other utterance falls back to the system voice when the
       pack cannot play, because saying a word badly beats saying nothing. A
       sentence cannot: the system voice reads "read" as *reed* (SPEC section
       9), it says letter names when handed a single letter, which S4 forbids,
       and the whole design rests on ONE recorded sentence rather than a stitch
       of separately spoken words. So the reason is recorded for the Grown-ups
       corner, the sentence stays on the screen to be read together, and
       nothing is spoken. The child loses the reading, not the sentence. */
    playClips(plan, stateRef.current.settings.sound, noteFallback,
      (ms, tiles) => {
        schedulePops(tiles);
        /* Point 5: the sentence reads again to close. It is a second
           utterance, timed to start when the first has finished, so a tap can
           interrupt it without touching what came before. */
        closeTimer.current = setTimeout(() => {
          playClips(sentenceClosePlan(item.id), stateRef.current.settings.sound, noteFallback);
        }, ms + SEAM_MS);
      });
  }
  /* THE MARK THAT ENDS THE SENTENCE ATTEMPT (owner-ruled 2026-08-14). Graded
     with the same three controls as a word, and the grade decides ONLY what
     the app says next: a praise line from the rows that never say "word" for
     a correct reading, or the same "Good try!" / "Let's try again." leads a
     word's reveal uses. Nothing is written to the save, nothing is scheduled,
     and the sentence never comes back — SPEC section 12 points 3 and 4 stand.
     No separate skip either: the mark IS the path to the reveal, exactly as
     "not yet" is for a stuck child on a word.

     One attempt, one result — the same double-fire guard the word controls
     need: both holds can mature in the same commit window, and a second call
     here would start the reveal twice over itself. */
  function gradeSentence(result) {
    if (sentenceGraded.current || !sentence) return;
    sentenceGraded.current = true;
    if (result === "correct") buzz(28);            // N-11: no error rumble, same as a word
    unlockVoice();
    const praiseIdx = SENTENCE_PRAISE[Math.floor(Math.random() * SENTENCE_PRAISE.length)];
    setSentencePhase("reveal");
    playSentenceReveal(sentence, openWord, sentenceLead(result, praiseIdx));
  }
  /* Point 3 and point 4: a tapped word shows its pieces SILENTLY, and opening
     one closes the last. The tap also interrupts the closing read (point 5) —
     the child has taken over, and the app talking over them is the opposite of
     what this half of the design is for. */
  function tapSentenceWord(w) {
    hush(); stopClips(); clearPops();
    clearTimeout(closeTimer.current);
    setOpenWord(w);
  }
  /* Point 6: the grown-up ends the item. Nothing has to finish first — the
     closing read and any tapping both stop here, which is the rule the word
     items already follow, and it means a grown-up never waits out a sentence
     to move on. */
  function endSentence() {
    hush(); stopClips(); clearPops();
    clearTimeout(closeTimer.current);
    setSentence(null); setOpenWord(null);
    setSentencePhase(null); sentenceGraded.current = false;
    /* The press the sentence took is now paid back. Without this the child
       lands back on the word they have already read and already been graded
       on — the sentence would not be an interlude, it would be a hole. */
    advanceWord();
  }

  function next() {
    hush(); stopClips(); clearPops();                // S2 — silence the last reveal before the next attempt, and unmark its tiles
    /* A sentence due here takes this press, and the child stays on the word
       they just read until the sentence is done. `order` counts FIRST results
       only, so a word put back for a second look does not push a sentence
       forward or trigger one twice. Free play has its own sentence route
       (SPEC section 12 point 7) and never lands here. */
    const due = freePlay ? null
      : sentencePlanRef.current.find((x) => x.after === order.length && !shownSentences.includes(x.id));
    if (due) { setLastGrade(null); showSentence(due); return; }
    advanceWord();
  }

  /* Everything the press does once no sentence is in the way. Split from
     `next` so the sentence's own control reaches exactly the same code: an
     advance that ran twice, or a second copy of this, is how a queue and a
     session count stop agreeing. */
  function advanceWord() {
    const word = queue[qi];
    let q = queue;
    if (retryComing) {                               // A2-003 — the same value the label was drawn from
      q = queue.slice();
      q.splice(Math.min(qi + 3, q.length), 0, word);
      setQueue(q);
      setSeenTwice(s => ({ ...s, [word]: true }));   // P2-11
    }
    const np = promptCount + 1;
    setPromptCount(np); setLastGrade(null);
    /* Sentence free play advances one sentence at a time and never runs out:
       the shuffled pool is dealt again from the top. There is nothing to
       grade and nothing to record, so none of the queue bookkeeping below
       applies to it. */
    if (freePlay && fpMode.current === "sentences") {
      const pool = fpSentences.current;
      const at = (qi + 1) % pool.length;
      setQi(at); setFpCount((c) => c + 1);
      showSentence(pool[at], true);
      return;
    }
    if (freePlay) {
      /* Endless: a spent block is rebuilt. In level mode it comes from the
         clone the results landed in, so a word read well recedes and a missed
         word returns - as-if progress that is thrown away on exit. In random
         mode it is a fresh uniform draw that never opens on the word just
         read. No Done screen, no cap. */
      if (qi + 1 >= q.length) {
        let q2;
        if (fpMode.current === "random") q2 = buildRandomBlock(word);
        else {
          fpState.current.sessionsCompleted += 1;    // the clone's clock, so reviews come due
          q2 = buildSession(fpState.current);
        }
        setQueue(q2); setQi(0);
        setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
        gradedRef.current = null;
        setPhase("ready");
      } else { setQi(qi + 1); setPhase("ready"); }
      return;
    }
    if (qi + 1 >= q.length || np >= PROMPT_CAP) finishSession(false);
    else { setQi(qi + 1); setPhase("ready"); }
  }

  /* The grown-up's skip (SPEC section 6): ends the reveal early when the
     adult judges the child does not need the rest of it — streaks of correct
     words above all. An adult hold only: the wait exists so the child hears
     the word (CVC-UX-001), so the child's tap stays dead and the strip
     control takes the same 450 ms hold as the graders. Everything advancing
     already does — the silence, the retry queue, the finish — happens
     through the same next(). */
  function skipReveal() {
    if (phase !== "feedback") return;
    clearTimeout(advanceTimer.current);
    clearTimeout(advanceBackstop.current);
    advanceLive.current = true;
    setAdvanceReady(true);
    next();
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
    speakVoice(stats.promoted ? "levelup" : "done", "", 0, stateRef.current.settings.sound,
      (why) => { noteFallback(why); speak(stats.promoted ? "Amazing! Level up!" : "All done! Great reading today!", true, stateRef.current.settings.lang); });
  }

  /* A2-002 / A2-013 — opening the dialog ends the attempt, exactly as every
     choice inside it does. The recognizer used to keep listening behind the
     dialog: the stage still read "Listening…", and a reading that arrived
     while the grown-up was deciding whether to stop was recorded, which also
     made the dialog's own controls move under their finger. */
  function askExit() {
    /* The reveal stops with the question. A seven-second sound-out playing on
       behind the dialog, with the tiles still ringing, talks over the
       grown-up while they read their options and decide. */
    hush(); stopClips(); clearPops();
    if (freePlay) {                       // nothing to save, nothing to ask
      setFreePlay(false); fpState.current = null;
      setScreen("home");
      return;
    }
    setExitAsk(true);
  }

  function handleExit(choice) {
    if (choice === "save") { finishSession(true); return; }
    if (choice === "discard") { hush(); stopClips(); clearPops(); discardSession(); setExitAsk(false); setScreen("home"); return; }
    setExitAsk(false);
  }

  /* P1-1 + N-1 — replay exists only AFTER feedback; the word is never spoken pre-attempt */
  function replay() {
    if (phase !== "feedback") return;
    /* speakVoice silences the sound-out on its way in. The rings were
       scheduled against that sound, so they go with it: without this the
       tiles kept lighting on the dead schedule while the child heard only the
       bare word. */
    clearPops();
    unlockVoice();
    speakVoice("replay", currentWord, 0, stateRef.current.settings.sound,
      (why) => { noteFallback(why); speak([{ text: ttsSafeWord(currentWord), rate: 0.9 }], true, stateRef.current.settings.lang); });
    /* ttsSafeWord, because the raw string is not always the word: "a" would
       be the letter's name (S4) and "i" goes as its capital. Found while the
       build reviewer was probing the i entry, latent since "a" shipped -- the
       pack path always played the clip, so only the fallback could say it. */
  }

  /* ---------- settings ---------- */
  const mutate = (fn) => { const s = structuredClone(stateRef.current); fn(s); setState(s); persist(s); };
  const setSound = (on) => mutate(s => { s.settings.sound = on; });
  const setUpdateCheck = (on) => mutate(s => { s.settings.updateCheck = on; });
  const setLang = (code) => mutate(s => { s.settings.lang = code; });
  const jumpLevel = (n) => { mutate(s => { s.level = n; s.perfectStreak = 0; }); setToast("Level set to " + n + " " + LEVELS[n - 1].emoji); };
  const jumpPreLevel = (n) => { mutate(s => { s.preLevel = n; s.prePerfectStreak = 0; }); setToast(n === 0 ? "Sessions serve words" : "Next session: Pre " + n); };
  function commitName() {
    const clean = Array.from(nameDraft.trim()).slice(0, 20).join("");   // P7 — never bisect a surrogate pair
    mutate(s => { s.settings.childName = clean; });
  }
  async function copyLog() {
    const md = buildMarkdown(state);
    try { await navigator.clipboard.writeText(md); setToast("Log copied ✓"); } catch (e) { setCopyBox(md); }
  }
  function doReset() {
    const s = newState();
    setState(s); persist(s); setNameDraft(""); setResetStage(0); setToast("All progress cleared.");
  }

  /* ---------- backup (W3: JSON export and import of the full state) ---------- */
  function exportJSON() {
    const doc = { application: "word-quest-backup", ...stateRef.current };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-quest-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Backup file saved.");
  }
  async function importJSON(file) {
    try {
      const parsed = JSON.parse(await file.text());
      /* "An object" is not a backup. migrate() is total by design, so it
         happily turned {} into a valid empty Level 2 state and the app
         reported "Backup loaded." over a child's real progress. A file must
         LOOK like a Word Quest save before anything is replaced. */
      if (!isBackup(parsed)) throw new Error("shape");
      const s = migrate(parsed);          // heal runs first inside migrate (SPEC §7)
      setState(s); setNameDraft(s.settings.childName || "");
      persist(s);
      setToast("Backup loaded.");
    } catch (e) {
      setToast("That file is not a Word Quest backup.");
    }
  }

  /* B7 — the last time the recorded voice could not play, and why. A fallback
     is correct behaviour, but it used to leave no trace: a grown-up saw a
     shorter sentence and no tile rings, with nothing saying the recorded voice
     was unavailable, so a pack that had quietly stopped resolving looked like a
     design choice. Kept out of the saved state on purpose — it describes this
     device right now, not the child's progress, and nothing about it is worth
     restoring tomorrow. */
  const [voiceFallback, setVoiceFallback] = useState(null);
  const noteFallback = useCallback((reason) => {
    if (reason) setVoiceFallback(String(reason));
  }, []);

  /* The pre-level ladder lives in its own hook (G6: App stays under the
     complexity ceiling; the ladder reads as one piece in usePre.js). */
  const { preQ, preQi, prePhase, preGrade, preAdvanceReady, preDone,
    beginPre, gradePre, nextPre, exitPre, playPrePrompt } =
    usePreSession({ stateRef, setState, persist, setScreen, noteFallback });

  const masteredCount = useMemo(() => state ? Object.values(state.words).filter(ws => ws.box >= 4).length : 0, [state]);

  /* ============================ RENDER ============================ */

  if (screen === "splash" || !state) {
    return <Frame><div className="wq-center"><div className="wq-float" style={{ fontSize: 56 }}>🚀</div>
      <p style={{ marginTop: 12, fontWeight: 800, color: C.ink }}>Loading Word Quest…</p></div></Frame>;
  }

  const L = LEVELS[state.level - 1];
  const kid = state.settings.childName;

  if (screen === "home") {
    return <HomeScreen state={state} L={L} kid={kid} masteredCount={masteredCount}
      persistent={persistent} readOnly={readOnly}
      onBegin={beginSession} onFreePlay={() => setFpChooser(true)} onParent={() => setScreen("parent")}
      fpChooser={fpChooser} onFreePlayChoose={beginFreePlay} onFreePlayCancel={cancelFpChooser} toast={toast} />;
  }

  if (screen === "session" && currentWord) {
    return <SessionScreen state={state} L={L} kid={kid} currentWord={currentWord}
      phase={phase} lastGrade={lastGrade} order={order}
      firstResults={firstResults} answered={answered} totalQ={totalQ}
      advanceReady={advanceReady} waitMs={waitMs} waitFrom={waitFrom} finishes={finishes}
      pops={pops}
      sentence={sentence} sentencePhase={sentencePhase} gradeSentence={gradeSentence}
      openWord={openWord} onTapWord={tapSentenceWord} endSentence={endSentence}
      freePlay={freePlay} fpCount={fpCount} fpMode={fpMode.current}
      seenTwice={seenTwice} exitAsk={exitAsk}
      onExitAsk={askExit} grade={grade} next={next} skipReveal={skipReveal}
      replay={replay}
      handleExit={handleExit} advanceRef={advanceRef} toast={toast} />;
  }

  if (screen === "pre" && preQ[preQi]) {
    return <PreSessionScreen state={state} item={preQ[preQi]} phase={prePhase} lastGrade={preGrade}
      answered={preQi + (prePhase === "feedback" ? 1 : 0)} totalQ={preQ.length}
      advanceReady={preAdvanceReady} finishes={preQi + 1 >= preQ.length}
      onExitAsk={exitPre} grade={gradePre} next={nextPre} replayPrompt={playPrePrompt} />;
  }

  if (screen === "predone" && preDone) {
    return <PreDoneScreen preDone={preDone} onHome={() => setScreen("home")} />;
  }

  if (screen === "done" && doneStats) {
    return <DoneScreen doneStats={doneStats} kid={kid} onHome={() => setScreen("home")} toast={toast} />;
  }

  return <ParentScreen state={state} nameDraft={nameDraft} setNameDraft={setNameDraft}
    commitName={commitName} setSound={setSound} setLang={setLang} setUpdateCheck={setUpdateCheck}
    jumpLevel={jumpLevel} jumpPreLevel={jumpPreLevel} openLevels={openLevels} setOpenLevels={setOpenLevels}
    copyLog={copyLog} copyBox={copyBox} resetStage={resetStage} setResetStage={setResetStage}
    doReset={doReset} onBack={() => { setResetStage(0); setCopyBox(""); setScreen("home"); }}
    voiceFallback={voiceFallback} onExportJSON={exportJSON} onImportJSON={importJSON} toast={toast} />;
}
