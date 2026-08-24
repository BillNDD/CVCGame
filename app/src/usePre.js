import { useState, useRef } from "react";
import {
  buildPreSession, checkPrePromotion, freshWordState, applyResult,
  soundIdFor, soundIdsFor, PRAISE, ADVANCE_GUARD_MS,
} from "@engine";
import { playClips, stopClips, unlockVoice } from "./voicepacks.js";

/* THE PRE-LEVEL SESSION LOOP (owner-ruled 2026-08-15), in its own hook so the
   App component stays under the G6 complexity ceiling and the ladder reads as
   one piece. Deliberately separate from the word machinery: no sentences, no
   retries, no prompt cap, no free play — a short taught-order walk graded by
   the adult with the same strip. Boxes live in state.pre; the word queue is
   never touched.

   The prompt IS the question here — a sound to echo, never a word to read —
   so playing it on arrival and on 🔊 at any moment does not touch S2, which
   guards reading attempts (SPEC section 12 item 8 carries the ruling).
   Letters play their one approved sound; an ear item plays its word's sounds
   apart on the sound-out's own seam. */
export default function usePreSession({ stateRef, setState, persist, setScreen, noteFallback }) {
  const [preQ, setPreQ] = useState([]);
  const [preQi, setPreQi] = useState(0);
  const [prePhase, setPrePhase] = useState("ready");
  const [preGrade, setPreGrade] = useState(null);
  const [preAdvanceReady, setPreAdvanceReady] = useState(true);
  const [preDone, setPreDone] = useState(null);
  const preGradedRef = useRef(null);
  const preResultsRef = useRef({});

  const prePromptPlan = (it) =>
    it.length === 1
      ? [soundIdFor(it)]
      : soundIdsFor(it).filter((id) => id !== "d:silent").flatMap((id, i) => (i ? ["seam2", id] : [id]));
  /* THE PROMPT ASKS ITSELF (open fault AH, closed 2026-08-24). The paragraph
     at the top of this file has said since the ladder shipped that the prompt
     plays "on arrival and on the speaker at any moment" - and nothing ever
     called it on arrival. A child met "What word do the sounds make?", an ear,
     and silence, with the only way to hear the question being an adult
     pressing a speaker labelled "Hear it AGAIN". Found by the owner on a real
     phone in the first minute of the beta 27 device check; no gate could see
     it, because every gate asks what is DRAWN and none asks whether the screen
     asks its question.

     IT TAKES THE ITEM, NEVER THE INDEX. Reading preQ[preQi] out of the closure
     is wrong twice over, and the council's before pass named both before a
     line was written: on entry preQ is still [] from this render, so
     prePromptPlan(undefined) throws INSIDE A CLICK HANDLER - a white screen
     and a lost session - and on advance the index has not yet moved, so it
     would play the item the child has just finished. Silent, plausible, and
     it would teach the wrong sound. */
  const playPromptFor = (item) => {
    if (!item) return;                     // nothing is not an item
    stopClips();
    playClips(prePromptPlan(item), stateRef.current.settings.sound, noteFallback);
  };
  const playPrePrompt = () => playPromptFor(preQ[preQi]);

  function beginPre() {
    const s = structuredClone(stateRef.current);
    const q = buildPreSession(s);
    setState(s); setPreQ(q); setPreQi(0);
    setPrePhase("ready"); setPreGrade(null); setPreAdvanceReady(true);
    preGradedRef.current = null; preResultsRef.current = {}; setPreDone(null);
    setScreen("pre");
    /* The press of "Begin Session" is the gesture the browser wants, so the
       context is unlocked here as showSentence does it - without this the very
       first prompt of a fresh install can fall back instead of playing,
       because playClips does not CREATE a context, it refuses without one
       (the before pass, 2026-08-24). Then the first item asks itself, from
       the local q rather than from state this render cannot see yet. */
    unlockVoice();
    playPromptFor(q[0]);
  }

  function gradePre(result) {
    if (preGradedRef.current === preQi) return;   // one attempt, one result
    preGradedRef.current = preQi;
    const item = preQ[preQi];
    const s = structuredClone(stateRef.current);
    if (!s.pre[item]) s.pre[item] = freshWordState();
    applyResult(s.pre[item], result, s.sessionsCompleted + 1);
    preResultsRef.current[item] = result;
    setState(s); persist(s);
    setPreGrade(result); setPrePhase("feedback"); setPreAdvanceReady(false);
    /* Feedback speaks with shipped clips only: praise or the retry line,
       then the prompt again, and — for an ear item read correctly — the
       whole word, the reveal the child has just earned. The advance arms
       when the clips' real length is known, with the guard as a floor. */
    const praise = "p:" + Math.floor(Math.random() * PRAISE.length);
    const prompt = prePromptPlan(item);
    const plan = result === "correct"
      ? [praise, "seam", ...prompt, ...(item.length > 1 ? ["seam", "w:" + item] : [])]
      : [result === "close" ? "l:close" : "l:wrong", "seam", ...prompt];
    if (!s.settings.sound) { setPreAdvanceReady(true); return; }
    playClips(plan, true,
      (why) => { noteFallback(why); setTimeout(() => setPreAdvanceReady(true), ADVANCE_GUARD_MS); },
      (ms) => setTimeout(() => setPreAdvanceReady(true), Math.max(ms, ADVANCE_GUARD_MS)));
  }

  function nextPre() {
    if (!preAdvanceReady) return;
    stopClips();
    if (preQi + 1 < preQ.length) {
      setPreQi(preQi + 1); setPrePhase("ready"); setPreGrade(null);
      preGradedRef.current = null; setPreAdvanceReady(true);
      playPromptFor(preQ[preQi + 1]);   // the NEXT item, never the one just finished
      return;
    }
    const s = structuredClone(stateRef.current);
    s.sessionsCompleted += 1;   // the ladder's reviews ride the same session clock
    const from = s.preLevel;
    /* The session's shape feeds promotion's second path, exactly as a word
       session's does: perfect means every item this walk was graded correct. */
    const rs = Object.values(preResultsRef.current);
    const promoted = checkPrePromotion(s, { perfect: rs.length > 0 && rs.every((r) => r === "correct") });
    setState(s); persist(s);
    setPreDone({ promoted, graduated: promoted && s.preLevel === 0, from, to: s.preLevel });
    setScreen("predone");
  }

  const exitPre = () => { stopClips(); setScreen("home"); };

  return { preQ, preQi, prePhase, preGrade, preAdvanceReady, preDone, beginPre, gradePre, nextPre, exitPre, playPrePrompt };
}
