import { useState, useEffect, useRef, useMemo, useCallback } from "react";
/* All game logic comes from the generated engine module. The components in
   this app never re-implement it (work item W1). */
import {
  LEVELS, HOMOPHONES, SESSION_SIZE, PROMPT_CAP, ADVANCE_GUARD_MS, SPLASH_TIMEOUT_MS,
  C, SR, freshWordState, applyResult, buildSession, checkPromotion,
  migrate, newState, buildMarkdown, feedbackSpeech, PRAISE, speak, hush, buzz, adultNote,
} from "@engine";
/* W3 — the storage adapter is IndexedDB in the standalone app. */
import { loadState, saveState } from "./storage.js";
import { initVoicePacks, speakVoice, stopClips, unlockVoice } from "./voicepacks.js";
import Frame from "./components/Frame.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import SessionScreen from "./screens/SessionScreen.jsx";
import DoneScreen from "./screens/DoneScreen.jsx";
import ParentScreen from "./screens/ParentScreen.jsx";

/* W4b — recognizer lifetime rules. A recognizer that shows no sign of life
   for WATCHDOG_MS is stopped; while it reports sound or speech the timer
   re-arms, so a slow reader is never cut off. After any stop, GRACE_MS still
   accepts the finalized result: iOS often delivers it only after stop(). */
const WATCHDOG_MS = 8000;
const GRACE_MS = 2000;
const RETRY_MSG = "Didn’t catch that — tap to try again.";
const MIC_GONE_MSG = "The microphone isn’t available here — grown-up grading for this visit.";
const NET_MSG = "Can’t listen without the internet — a grown-up can check instead.";
const DENIED_MSG = "Microphone permission is off — switched to grown-up mode.";
/* Standing explanations. A microphone that is absent must say why, on the page,
   for as long as it stays absent — not once, and not only in a settings screen.
   An adult who CHOSE grown-up mode gets none of these: that is a choice, not a
   fault, and the app does not nag about it. */
const NO_SR_MSG = "Parent: this browser can’t listen. Chrome, Edge or Safari can use the microphone.";
const DENIED_STANDING_MSG = "Parent: microphone permission is off. Allow it, then choose the microphone in the Grown-ups corner.";
const CORNER_NO_SR_MSG = "This browser can’t listen. Chrome, Edge or Safari can use the microphone.";

/* Device-local adult-facing markers (never child data). localStorage keeps
   them out of the one-object save document; private modes just skip them. */
const mark = (k) => { try { localStorage.setItem(k, "1"); } catch { /* private mode */ } };
const marked = (k) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
const unmark = (k) => { try { localStorage.removeItem(k); } catch { /* private mode */ } };

/* W4b heal, one time per device: app versions before this one saved mode
   "parent" on ANY microphone failure. Where no adult ever chose that mode,
   give the microphone back. An explicit choice — the corner toggle, or a
   permission denial — sets the marker and is never overridden. */
/* Why the microphone is absent, as a pure function so the reason cannot be
   stored, cleared, or wiped by advancing a word. An adult who CHOSE grown-up
   mode gets no message: that is a choice, not a fault. */
const micAbsenceReason = (mode) =>
  !SR ? NO_SR_MSG
  : (mode === "parent" && marked("wq-mode-denied")) ? DENIED_STANDING_MSG
  : "";
const CORNER_HINT = SR ? "" : CORNER_NO_SR_MSG;
const asParent = (s) => ({ ...s, settings: { ...s.settings, mode: "parent" } });
const displayState = (s, blocked) => (blocked ? asParent(s) : s);

const shouldHealMode = (s) =>
  !!SR && s.settings.mode === "parent" && !marked("wq-mode-chosen") && !marked("wq-mic-heal-1");

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
  const advanceRef = useRef(null);
  const watchdogRef = useRef(0);           // W4b: a dead recognizer must never trap the child
  const graceRef = useRef(0);              // W4b: the after-stop window for a finalized result
  const deadStrikesRef = useRef(0);        // W4b: attempts that produced no event at all
  const [micVisitBlock, setMicVisitBlock] = useState(false); // W4b: this-visit-only fallback
  const [micNote, setMicNote] = useState(""); // W4b: mic status that stays in the message slot
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
      let s, changed = false, healed = false;
      if (d && d.__corrupt) { s = newState(); setToast("Saved progress was damaged. A copy was kept; starting fresh."); }
      else if (d) {
        const before = d.version; s = migrate(d); changed = before !== s.version;
        if (shouldHealMode(s)) {                 // W4b — see shouldHealMode
          healed = true; s.settings.mode = "mic"; changed = true;
          setToast("The microphone is switched back on. Change it any time in the Grown-ups corner.");
        }
      }
      else s = newState();
      finish(s);
      if (!d || changed) {
        const saved = await saveState(s);
        setPersistent(saved);
        /* Spend the one-time heal only when the healed save actually landed:
           a failed write must leave the device eligible to heal again. */
        if (healed && saved) mark("wq-mic-heal-1");
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

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
    const s = structuredClone(state);
    const q = buildSession(s);
    setState(s); setQueue(q); setQi(0);
    setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
    setPromptCount(0); setPhase("ready"); setHeard(""); setLastGrade(null);
    setMicTried(false); setAdvanceReady(true); setExitAsk(false);
    deadStrikesRef.current = 0;                        // a new session judges the microphone afresh
    setMicNote(micVisitBlock ? MIC_GONE_MSG : "");     // a blocked visit keeps its reason on screen
    snapRef.current = structuredClone(s.words);   // N-3
    setScreen("session");
  }

  const currentWord = queue[qi];
  const answered = order.length;
  const totalQ = queue.length || SESSION_SIZE;  // P1-5

  function grade(result) {
    hardStopRec();
    clearNote();
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
    unlockVoice();
    const praiseIdx = Math.floor(Math.random() * PRAISE.length);
    speakVoice(result, word, praiseIdx, s.settings.sound,
      () => speak(feedbackSpeech(result, word, praiseIdx), true, s.settings.lang));
    requestAnimationFrame(() => { if (advanceRef.current) advanceRef.current.focus(); }); // P1-7
  }

  function next() {
    hush(); stopClips();                             // S2 — silence the last reveal before the next attempt
    clearNote();
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
    hardStopRec();
    const stats = commitSession(partial);
    setDoneStats(stats); setScreen("done"); setExitAsk(false);
    if (stats.promoted) buzz([30, 60, 30]);
    speakVoice(stats.promoted ? "levelup" : "done", "", 0, stateRef.current.settings.sound,
      () => speak(stats.promoted ? "Amazing! Level up!" : "All done! Great reading today!", true, stateRef.current.settings.lang));
  }

  function handleExit(choice) {
    hardStopRec();
    if (choice === "save") { finishSession(true); return; }
    if (choice === "discard") { hush(); stopClips(); discardSession(); setExitAsk(false); setScreen("home"); return; }
    setExitAsk(false);
  }

  /* ---------- microphone (P1-3 honest state, work items W4 + W4b) ----------
     Rebuilt after the field failures. The rules:
     - every handler checks it still speaks for the CURRENT attempt, so a
       tardy event from an abandoned recognizer never touches the screen,
       never tears down the feedback phase, and never records twice;
     - the watchdog re-arms while the engine reports sound or speech, and
       when it does stop an attempt, a grace window still welcomes the
       finalized result;
     - an attempt that produces no event at all strikes once with a message
       and twice into grown-up grading for the visit;
     - a failure leaves its message in the message slot until the next
       action, not only in a passing toast. */
  const toReady = () => { setPhase(p => (p === "listening" ? "ready" : p)); setMicTried(true); };
  const note = (msg) => { setToast(msg); setMicNote(msg); };
  const clearNote = () => { if (!micVisitBlock) setMicNote(""); };
  function retire(rec) {
    clearTimeout(watchdogRef.current); clearTimeout(graceRef.current);
    rec.onresult = rec.onend = rec.onnomatch = null;
    rec.onaudiostart = rec.onsoundstart = rec.onspeechstart = null;
    /* A permission answer can arrive after the attempt was abandoned. It is
       the one late event still worth hearing, and it never moves the phase,
       so it cannot tear down a feedback screen. */
    rec.onerror = (ev) => { if (ev && ev.error === "not-allowed") persistDenial(DENIED_MSG); };
    if (recRef.current === rec) recRef.current = null;
  }
  /* Only an attempt that produced NO event at all counts as a strike: not a
     Stop the child chose, and not a failure that named its own cause. */
  function strike(msg, visitMsg) {
    deadStrikesRef.current += 1;
    if (deadStrikesRef.current >= 2) visitFallback(visitMsg);
    else note(msg);
  }
  function startRec() {
    unlockVoice();                 // a real tap: reclaim the audio engine before the mic takes it
    if (!SR) { visitFallback("This browser can’t listen — grown-up grading for this visit."); return; }
    if (recRef.current) hardStopRec();   // never start a second engine over a live one
    setMicNote("");
    try {
      const rec = new SR();
      rec.lang = (stateRef.current && stateRef.current.settings.lang) || "en-US";
      rec.interimResults = false; rec.maxAlternatives = 5;
      const mine = () => recRef.current === rec;
      const arm = () => {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = setTimeout(() => {
          if (!mine()) return;
          rec.judging = true;      // the watchdog owns this ending; Stop must not take it over
          graceRef.current = setTimeout(() => {
            if (!mine()) return;
            retire(rec); toReady();
            if (rec.sawLife) note(RETRY_MSG); else strike(RETRY_MSG, MIC_GONE_MSG);
          }, GRACE_MS);
          try { rec.stop(); } catch (e) { /* dead recognizer: the grace timer judges it */ }
        }, WATCHDOG_MS);
      };
      rec.onaudiostart = rec.onsoundstart = rec.onspeechstart = () => {
        if (mine()) { rec.sawLife = true; arm(); }
      };
      rec.onresult = (ev) => {
        if (!mine()) return;
        rec.sawResult = true; deadStrikesRef.current = 0;
        clearTimeout(watchdogRef.current); clearTimeout(graceRef.current);
        const alts = []; const res = ev.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript.toLowerCase().trim());
        handleTranscripts(alts);
      };
      rec.onnomatch = () => {
        if (!mine()) return;
        rec.sawResult = true; deadStrikesRef.current = 0;
        retire(rec); toReady(); note(RETRY_MSG);
      };
      rec.onerror = (ev) => {
        /* Only an explicit permission denial changes the saved setting (SPEC §8,
           QA step 8). Every other failure is treated as this environment being
           unable to listen right now — grown-up grading for the visit only. */
        if (!mine()) return;
        rec.sawError = true;
        retire(rec); toReady();
        if (ev.error === "not-allowed") fallbackToParent(DENIED_MSG);
        else if (["service-not-allowed", "audio-capture"].includes(ev.error)) visitFallback(MIC_GONE_MSG);
        else if (ev.error === "no-speech") { deadStrikesRef.current = 0; note(RETRY_MSG); }
        else if (ev.error === "network") strike(NET_MSG, NET_MSG);
        else if (ev.error !== "aborted") note(RETRY_MSG);
      };
      rec.onend = () => {
        if (!mine()) return;
        const quiet = !rec.sawResult && !rec.sawError;
        retire(rec); toReady();
        /* A Stop the child chose is not a fault: it ends the attempt in
           silence, with nothing counted against the microphone. */
        if (!quiet || rec.userStopped) return;
        if (rec.sawLife) note(RETRY_MSG); else strike(RETRY_MSG, MIC_GONE_MSG);
      };
      rec.start(); recRef.current = rec; setPhase("listening");
      arm();
    } catch (e) { visitFallback(MIC_GONE_MSG); }
  }
  const listening = phase === "listening" && !!recRef.current;
  function softStop() {
    /* N-8 — Stop always causes a visible change at once. The recognizer gets
       the grace window: iOS often delivers the result only after stop(). */
    const rec = recRef.current;
    toReady();
    if (!rec) return;
    if (rec.judging) return;       // the watchdog already owns this ending
    clearTimeout(watchdogRef.current);
    rec.userStopped = true;
    try { rec.stop(); } catch (e) { retire(rec); return; }
    clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => { if (recRef.current === rec) retire(rec); }, GRACE_MS);
  }
  function hardStopRec() {
    clearTimeout(watchdogRef.current); clearTimeout(graceRef.current);
    const rec = recRef.current;
    if (!rec) return;
    retire(rec); toReady();        // an ended attempt never leaves "Listening…" on screen
    try { (rec.abort || rec.stop).call(rec); } catch (e) { /* dead recognizer */ }
  }
  /* A denial is an answer about permission, not about this attempt: it never
     moves the phase, so it cannot interrupt feedback. */
  function persistDenial(msg) {
    mark("wq-mode-chosen");        // a denial is a choice: the heal never overrides it
    mark("wq-mode-denied");        // ...and it is the reason the microphone is gone
    const s = structuredClone(stateRef.current); s.settings.mode = "parent";
    setState(s); persist(s); setToast(msg);
  }
  function fallbackToParent(msg) { persistDenial(msg); setPhase("ready"); }
  /* W4b — grown-up grading for THIS VISIT only: the saved setting never
     changes, so the microphone comes back on the next open in a browser
     that can listen. */
  function visitFallback(msg) {
    setMicVisitBlock(true); setPhase("ready"); setToast(msg); setMicNote(msg);
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
    unlockVoice();
    speakVoice("replay", currentWord, 0, stateRef.current.settings.sound,
      () => speak([{ text: currentWord, rate: 0.9 }], true, stateRef.current.settings.lang));
  }

  /* ---------- settings ---------- */
  const mutate = (fn) => { const s = structuredClone(stateRef.current); fn(s); setState(s); persist(s); };
  const setMode = (mode) => { mark("wq-mode-chosen"); unmark("wq-mode-denied"); mutate(s => { s.settings.mode = mode; }); };
  const setSound = (on) => mutate(s => { s.settings.sound = on; });
  const setLang = (code) => mutate(s => { s.settings.lang = code; });
  const jumpLevel = (n) => { mutate(s => { s.level = n; s.perfectStreak = 0; }); setToast("Level set to " + n + " " + LEVELS[n - 1].emoji); };
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
    const blob = new Blob([JSON.stringify(stateRef.current, null, 2)], { type: "application/json" });
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
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
      const s = migrate(parsed);          // heal runs first inside migrate (SPEC §7)
      setState(s); setNameDraft(s.settings.childName || "");
      persist(s);
      setToast("Backup loaded.");
    } catch (e) {
      setToast("That file is not a Word Quest backup.");
    }
  }

  const masteredCount = useMemo(() => state ? Object.values(state.words).filter(ws => ws.box >= 4).length : 0, [state]);

  /* ============================ RENDER ============================ */

  if (screen === "splash" || !state) {
    return <Frame><div className="wq-center"><div className="wq-float" style={{ fontSize: 56 }}>🚀</div>
      <p style={{ marginTop: 12, fontWeight: 800, color: C.ink }}>Loading Word Quest…</p></div></Frame>;
  }

  const L = LEVELS[state.level - 1];
  const kid = state.settings.childName;

  /* W4b — grown-up grading is a DISPLAY state when this visit cannot listen.
     The saved setting is never rewritten, so the microphone returns on the
     next open in a browser that can. */
  const micBlocked = !SR || micVisitBlock;
  /* SPEC section 3 — this ONE word cannot be judged fairly by recognition, so
     the adult judges it. The whole-visit block above is a different thing, and
     the corner must keep showing the saved setting either way. */
  /* Why the microphone is absent, derived rather than stored, so advancing to
     the next word can never clear it. The device-wide reason wins over the
     per-word one: it is true of every word, not just this one. */
  const parentNote = micAbsenceReason(state.settings.mode) || adultNote(currentWord);
  const shown = displayState(state, micBlocked);
  const shownSession = displayState(state, micBlocked || !!parentNote);

  if (screen === "home") {
    return <HomeScreen state={state} L={L} kid={kid} masteredCount={masteredCount}
      persistent={persistent} readOnly={readOnly}
      onBegin={beginSession} onParent={() => setScreen("parent")} toast={toast} />;
  }

  if (screen === "session" && currentWord) {
    return <SessionScreen state={shownSession} L={L} kid={kid} currentWord={currentWord}
      micNote={micNote} adultNote={parentNote} phase={phase} lastGrade={lastGrade} queue={queue} qi={qi} order={order}
      firstResults={firstResults} answered={answered} totalQ={totalQ}
      advanceReady={advanceReady} micTried={micTried} listening={listening}
      seenTwice={seenTwice} heard={heard} exitAsk={exitAsk}
      onExitAsk={() => setExitAsk(true)} grade={grade} next={next}
      startRec={startRec} softStop={softStop} replay={replay}
      handleExit={handleExit} advanceRef={advanceRef} toast={toast} />;
  }

  if (screen === "done" && doneStats) {
    return <DoneScreen doneStats={doneStats} kid={kid} onHome={() => setScreen("home")} toast={toast} />;
  }

  return <ParentScreen state={shown} nameDraft={nameDraft} setNameDraft={setNameDraft}
    commitName={commitName} setMode={setMode} setSound={setSound} setLang={setLang}
    jumpLevel={jumpLevel} openLevels={openLevels} setOpenLevels={setOpenLevels}
    copyLog={copyLog} copyBox={copyBox} resetStage={resetStage} setResetStage={setResetStage}
    doReset={doReset} onBack={() => { setResetStage(0); setCopyBox(""); setScreen("home"); }}
    srAvailable={!!SR} micHint={CORNER_HINT} onExportJSON={exportJSON} onImportJSON={importJSON} toast={toast} />;
}
