import { useState, useRef } from "react";
import {
  buildPreSession, checkPrePromotion, freshWordState, applyResult,
  soundIdFor, soundIdsFor, PRAISE, ADVANCE_GUARD_MS, isChunkItem, chunkText, bankWords,
} from "@engine";
import { playClips, stopClips, unlockVoice } from "./voicepacks.js";

/* THE PRE-LEVEL SESSION LOOP (owner-ruled 2026-08-15), in its own hook so the
   App component stays under the G6 complexity ceiling and the ladder reads as
   one piece. Deliberately separate from the word machinery: no sentences, no
   retries, no prompt cap, no free play — a short taught-order walk graded by
   the adult with the same strip. Boxes live in state.pre; the word queue is
   never touched.

   TWO KINDS OF ITEM, AND S2 ARRIVED WITH THE SECOND (the chunk rebuild,
   owner-ruled 2026-08-24/25). A LETTER item's prompt is its sound - the
   question, never the answer - so it plays on arrival and on 🔊 at any
   moment. A CHUNK item is READ: the screen is silent on arrival (speaking
   the chunk would hand a reading child the answer - S2 in full), and the 🔊
   plays the chunk's sounds SEPARATED, never blended, which is the ruled
   home of the retired ear rung's oral blend: a stuck child gets the
   listening help on demand, and if they then say the chunk, their ear is
   fine and the print is what is new. The "Your turn!" spoken cue lands with
   the clip round; until then silence is the whole arrival. */
export default function usePreSession({ stateRef, setState, persist, setScreen, noteFallback }) {
  const [preQ, setPreQ] = useState([]);
  const [preQi, setPreQi] = useState(0);
  const [prePhase, setPrePhase] = useState("ready");
  const [preGrade, setPreGrade] = useState(null);
  const [preAdvanceReady, setPreAdvanceReady] = useState(true);
  const [preDone, setPreDone] = useState(null);
  const preGradedRef = useRef(null);
  const preResultsRef = useRef({});

  /* KIND, NEVER LENGTH: a chunk and the retired ear items are both two
     letters, and a length test is how a chunk would have sounded itself out
     on arrival. Arrival: a letter asks itself; a chunk is silent (null).
     The speaker: a letter's sound again; a chunk's sounds APART. */
  const separated = (text) =>
    soundIdsFor(text).filter((id) => id !== "d:silent").flatMap((id, i) => (i ? ["seam2", id] : [id]));
  const arrivalPlan = (it) => (isChunkItem(it) ? null : [soundIdFor(it)]);
  const speakerPlan = (it) => (isChunkItem(it) ? separated(chunkText(it)) : [soundIdFor(it)]);
  /* A whole-chunk clip exists exactly when the chunk is a bank word - the
     seven ruled reuses. The rest arrive with the u: round; until then a
     chunk's feedback ends on its separated sounds and nothing is demanded
     of a clip that does not exist (the dormancy rule, SPEC section 12). */
  const wordClipFor = (it) => (isChunkItem(it) && bankWords().includes(chunkText(it)) ? "w:" + chunkText(it) : null);
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
    const plan = arrivalPlan(item);
    if (!plan) return;                     // a chunk arrives in silence (S2)
    stopClips();
    playClips(plan, stateRef.current.settings.sound, noteFallback);
  };
  const playPrePrompt = () => {
    const item = preQ[preQi];
    if (!item) return;
    stopClips();
    playClips(speakerPlan(item), stateRef.current.settings.sound, noteFallback);
  };

  /* RIDER MODE: due chunks opening a graduate's word session. The same
     items, the same grading, the same strip - but finishing hands control
     to the word session instead of the ladder's own done screen, and the
     walk never increments the session clock or asks promotion anything:
     there is no rung to promote, mastery is the boxes alone. */
  const riderAfter = useRef(null);
  function beginRiders(q, after) {
    riderAfter.current = after;
    setPreQ(q); setPreQi(0);
    setPrePhase("ready"); setPreGrade(null); setPreAdvanceReady(true);
    preGradedRef.current = null; preResultsRef.current = {}; setPreDone(null);
    setScreen("pre");
    playPromptFor(q[0]);   // a chunk: silence, by design (S2)
  }
  function beginPre() {
    riderAfter.current = null;                 // the ladder's own walk, never a rider's
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
       then the sounds - and for a chunk with an approved whole-chunk clip,
       the blend itself, the reveal the child has just earned. The sound-out
       fires on EVERY outcome, close and not yet included: a child who
       missed it needs the sounding-out at least as much (SPEC section 5's
       own rule). The full ruled reveal - "That is a-t, at. Like in cat.",
       the anchor word growing under the tiles - lands with the clip round;
       this is the same reveal built from what already ships. */
    const praise = "p:" + Math.floor(Math.random() * PRAISE.length);
    const prompt = isChunkItem(item) ? separated(chunkText(item)) : [soundIdFor(item)];
    const whole = wordClipFor(item);
    const plan = result === "correct"
      ? [praise, "seam", ...prompt, ...(whole ? ["seam", whole] : [])]
      : [result === "close" ? "l:close" : "l:wrong", "seam", ...prompt, ...(whole ? ["seam", whole] : [])];
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
    if (riderAfter.current) {
      const after = riderAfter.current; riderAfter.current = null;
      after();                  // the words begin; the clock is theirs to tick
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

  const exitPre = () => { riderAfter.current = null; stopClips(); setScreen("home"); };

  return { preQ, preQi, prePhase, preGrade, preAdvanceReady, preDone, beginPre, beginRiders, gradePre, nextPre, exitPre, playPrePrompt };
}
