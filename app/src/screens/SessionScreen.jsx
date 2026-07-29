import { useRef } from "react";
import { C, TRICKY, chunkWord, feedbackParts } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import HoldButton from "../components/HoldButton.jsx";

/* The stage: word, tile slot, message slot. Split from the screen shell so no
   function passes the G6 complexity ceiling; the rendered output is identical. */
function SessionStage({ state, currentWord, phase, fb, liveRef, micNote, adultNote }) {
  return (
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
            {phase === "listening" && <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.action }}>🎙️ Listening…</p>}
            {phase === "heard" && <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink2 }}>Nice try! Grown-up will check. 👇</p>}
            {/* W4b — a microphone problem stays on screen until the next action,
                never only in a passing toast */}
            {phase === "ready" && micNote && <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink2 }}>{micNote}</p>}
            {/* SPEC section 6 — a word recognition cannot judge fairly. The note
                is for the adult, at 11.5 px so the longest one stays inside the
                fixed slot and the word above never moves. Never spoken (S4). */}
            {phase !== "feedback" && adultNote &&
              <p className="wq-parentnote" style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: C.ink2, lineHeight: 1.35 }}>{adultNote}</p>}
          </div>
        </div>
      </div>
    </Zone.Stage>
  );
}

/* The action rail: advance control in feedback, otherwise mic or prompt. */
function SessionRail({ state, kid, phase, advanceReady, waitMs, queue, qi, next, advanceRef, listening, micTried, startRec, softStop }) {
  return (
    <Zone.Rail>
      {phase === "feedback" ? (
        <button ref={advanceRef} className="wq-cta" onClick={next} disabled={!advanceReady}
          style={{ background: advanceReady ? C.green : "#9fb4c4" }}>
          {/* A1-004 — the wait is visible: a fill crosses the control over the
              reveal's own length and lands as the control comes alive. The key
              restarts it when the real length replaces the short guard, a
              moment after the wait begins. It carries no text and no role: the
              feedback already speaks for itself through one channel (N-9). */}
          {!advanceReady && <span key={waitMs} className="wq-ctafill" aria-hidden="true"
            style={{ "--wqfill": waitMs + "ms" }} />}
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
  );
}

/* P1-4 — the early-exit dialog with honest options. */
function ExitDialog({ answered, handleExit }) {
  return (
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
  );
}

export default function SessionScreen({
  state, L, kid, currentWord, micNote, adultNote, phase, lastGrade, queue, qi, order, firstResults,
  answered, totalQ, advanceReady, waitMs, micTried, listening, seenTwice, heard, exitAsk,
  onExitAsk, grade, next, startRec, softStop, replay, handleExit, advanceRef, toast,
}) {
  const liveRef = useRef(null);
  const fb = lastGrade ? feedbackParts(lastGrade, currentWord) : null;
  const canReplay = phase === "feedback";   // N-1
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={onExitAsk} aria-label="Leave session">🏠</button>
        <div style={{ flex: 1, minWidth: 0, padding: "0 10px" }}>
          <ProgressBar order={order} firstResults={firstResults} total={totalQ} />
        </div>
        {/* P2-9 — precise count, promoted into the header at tabular mono */}
        <span className="wq-mono" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{answered}/{totalQ}</span>
        <span className="wq-chip" style={{ marginLeft: 8 }}>{state.level} {L.emoji}</span>
      </Zone.Header>

      <SessionStage state={state} currentWord={currentWord} phase={phase} fb={fb} liveRef={liveRef} micNote={micNote} adultNote={adultNote} />

      <SessionRail state={state} kid={kid} phase={phase} advanceReady={advanceReady} waitMs={waitMs}
        queue={queue} qi={qi} next={next} advanceRef={advanceRef}
        listening={listening} micTried={micTried} startRec={startRec} softStop={softStop} />

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

      {exitAsk && <ExitDialog answered={answered} handleExit={handleExit} />}
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
