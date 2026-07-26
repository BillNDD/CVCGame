import { useState, useEffect, useRef, useMemo, useCallback } from "react";
/* All game logic comes from the generated engine module. The components in
   this app never re-implement it (work item W1). */
import {
  LEVELS, HOMOPHONES, SESSION_SIZE, PROMPT_CAP, ADVANCE_GUARD_MS, SPLASH_TIMEOUT_MS,
  C, SR, freshWordState, applyResult, buildSession, checkPromotion,
  migrate, newState, buildMarkdown, feedbackSpeech, PRAISE, speak, buzz,
} from "@engine";
/* W3 — the storage adapter is IndexedDB in the standalone app. */
import { loadState, saveState } from "./storage.js";
import Frame from "./components/Frame.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import SessionScreen from "./screens/SessionScreen.jsx";
import DoneScreen from "./screens/DoneScreen.jsx";
import ParentScreen from "./screens/ParentScreen.jsx";

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
      setToast("Couldn’t read saved progress. Nothing will be saved this visit.");
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
    speak(feedbackSpeech(result, word, Math.floor(Math.random() * PRAISE.length)), s.settings.sound, s.settings.lang);
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

  /* ---------- microphone (P1-3 honest state, work item W4) ---------- */
  function startRec() {
    if (!SR) { fallbackToParent("This browser can’t listen — switched to grown-up mode."); return; }
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
        if (["not-allowed", "service-not-allowed", "audio-capture"].includes(ev.error)) fallbackToParent("Microphone isn’t available — switched to grown-up mode.");
        else if (ev.error === "no-speech") { setPhase("ready"); setMicTried(true); setToast("Didn’t catch that — tap to try again."); }
        else { setPhase("ready"); setMicTried(true); }
      };
      rec.onend = () => { recRef.current = null; setPhase(p => (p === "listening" ? "ready" : p)); setMicTried(true); };
      recRef.current = rec; rec.start(); setPhase("listening");
    } catch (e) { fallbackToParent("Microphone isn’t available — switched to grown-up mode."); }
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
    speak([{ text: currentWord, rate: 0.7 }], stateRef.current.settings.sound, stateRef.current.settings.lang);
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
    try { await navigator.clipboard.writeText(md); setToast("Log copied ✓"); } catch (e) { setCopyBox(md); }
  }
  function doReset() {
    const s = newState(); if (!SR) s.settings.mode = "parent";
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
      if (!SR) s.settings.mode = "parent";
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

  if (screen === "home") {
    return <HomeScreen state={state} L={L} kid={kid} masteredCount={masteredCount}
      persistent={persistent} readOnly={readOnly}
      onBegin={beginSession} onParent={() => setScreen("parent")} toast={toast} />;
  }

  if (screen === "session" && currentWord) {
    return <SessionScreen state={state} L={L} kid={kid} currentWord={currentWord}
      phase={phase} lastGrade={lastGrade} queue={queue} qi={qi} order={order}
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

  return <ParentScreen state={state} nameDraft={nameDraft} setNameDraft={setNameDraft}
    commitName={commitName} setMode={setMode} setSound={setSound} setLang={setLang}
    jumpLevel={jumpLevel} openLevels={openLevels} setOpenLevels={setOpenLevels}
    copyLog={copyLog} copyBox={copyBox} resetStage={resetStage} setResetStage={setResetStage}
    doReset={doReset} onBack={() => { setResetStage(0); setCopyBox(""); setScreen("home"); }}
    srAvailable={!!SR} onExportJSON={exportJSON} onImportJSON={importJSON} toast={toast} />;
}
