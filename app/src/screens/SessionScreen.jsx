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
function SessionStage({ state, currentWord, phase, fb, liveRef, pops = [] }) {
  return (
    <Zone.Stage>
      <div className="wq-stagegrid">
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
            textTransform: "uppercase", color: C.ink }}>Read this word</p>
          {/* P0-2 — word baseline is fixed; everything else lives in reserved slots below */}
          <div className="wq-display wq-word" aria-live="off">{currentWord}</div>

          {/* The sound-out: a tile takes its ring as its own sound plays. The
              key carries the tile's mark count, so the browser runs the
              animation from its first frame each time rather than ignoring a
              class it already has. `pops` is empty whenever no sound-out is
              playing, so the tiles simply sit there — the reveal without
              sound is the reveal it always was. */}
          <div className="wq-slot-tiles" aria-hidden={phase !== "feedback"}>
            {phase === "feedback" && chunkWord(currentWord).map((g, i) => (
              <span key={i + ":" + (pops[i]?.n || 0)}
                className={"wq-display wq-tile" + (pops[i] ? " wq-pop" : "")}
                style={pops[i]?.ms ? { "--wqpop": pops[i].ms + "ms" } : undefined}>{g}</span>
            ))}
          </div>

          {/* N-9: one announcement channel — TTS when sound is on, live region when muted */}
          <div className="wq-slot-msg" ref={liveRef} aria-live={state.settings.sound ? "off" : "polite"} role={state.settings.sound ? undefined : "status"}>
            {phase === "feedback" && fb && (
              <>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
                  {fb.icon} {fb.lead}<strong className="wq-dashed">{fb.d}</strong>, {fb.word}.
                </p>
                {TRICKY[currentWord] && <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 800, color: C.amberInk }}>⭐ {TRICKY[currentWord]}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </Zone.Stage>
  );
}

/* The action rail: the advance control in feedback, the prompt otherwise.
   There used to be a third state — the child's own record control. The
   microphone was removed on 2026-08-12 (owner-ruled 2026-08-11, safety), so
   the prompt is now what a child meets in every ready phase. */
function SessionRail({ kid, phase, advanceReady, waitMs, waitFrom, finishes, next, advanceRef }) {
  return (
    <Zone.Rail>
      {phase === "feedback" ? (
        <button ref={advanceRef} className="wq-cta" onClick={next} disabled={!advanceReady}
          style={{ background: advanceReady ? C.green : "#9fb4c4" }}>
          {/* A1-004 — the wait is visible: a fill crosses the control over the
              reveal's own length and lands as the control comes alive. The
              wait is armed twice — the 400 ms guard first, the reveal's real
              length a moment later — and on the second arm the fill continues
              from its own position (--wqfillfrom, a percent) over the
              remaining wait, so it never moves backwards. It carries no text
              and no role: the feedback already speaks for itself through one
              channel (N-9). */}
          {!advanceReady && <span key={waitMs + "-" + waitFrom} className="wq-ctafill" aria-hidden="true"
            style={{ "--wqfill": waitMs + "ms", "--wqfillfrom": waitFrom + "%" }} />}
          {/* A2-003 — the label says what the press will do, and the app works
              that out rather than reading it off the queue as it stands: a
              missed word is put back three places later, so the last slot of
              the queue is often not the last word of the session. */}
          {finishes ? "🏁 Finish!" : "Next word ➡️"}
        </button>
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
        {/* A2-002 — the Save slot is reserved, never conditional. It was once
            able to appear mid-dialog and push everything below it down about
            53 px: a tap meant for "Keep reading" discarded the session instead.
            The thing that could change the count behind an open dialog was the
            microphone, and the microphone is gone (2026-08-12) — the reserved
            slot stays anyway, because a dialog that cannot move is a promise
            worth keeping whatever is behind it. */}
        <button className="wq-cta" disabled={answered === 0} onClick={() => handleExit("save")}
          style={{ background: answered === 0 ? "#9fb4c4" : C.green }}>
          {answered === 0 ? "Save as a short session" : "Save " + answered + " as a short session"}
        </button>
        <button className="wq-cta" style={{ background: "#fff", color: C.red, border: "2px solid " + C.red }} onClick={() => handleExit("discard")}>Discard and go home</button>
        <button className="wq-btn-plain" onClick={() => handleExit("cancel")} style={{ justifySelf: "center" }}>Keep reading</button>
      </div>
    </Modal>
  );
}

export default function SessionScreen({
  state, L, kid, currentWord, phase, lastGrade, order, firstResults,
  answered, totalQ, advanceReady, waitMs, waitFrom, finishes, seenTwice, exitAsk, pops,
  freePlay, fpCount, fpMode,
  onExitAsk, grade, next, skipReveal, replay, handleExit, advanceRef, toast,
}) {
  const liveRef = useRef(null);
  const fb = lastGrade ? feedbackParts(lastGrade, currentWord) : null;
  const canReplay = phase === "feedback";   // N-1
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={onExitAsk} aria-label="Leave session">🏠</button>
        <div style={{ flex: 1, minWidth: 0, padding: "0 10px", textAlign: "center" }}>
          {/* Free play keeps its chip here. It has no total, so the path below
              would promise an ending this mode does not have — the same reason
              the bar was never shown here either. */}
          {freePlay && <span className="wq-chip" style={{ fontSize: 10.5, letterSpacing: ".12em" }}>FREE PLAY</span>}
        </div>
        {/* P2-9 — precise count, promoted into the header at tabular mono */}
        <span className="wq-mono" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>
          {freePlay ? fpCount + (fpCount === 1 ? " word" : " words") : answered + "/" + totalQ}</span>
        {/* Truly random free play serves every level at once, so the level
            chip would be a false statement there. The dice says what is true,
            and carries a name a screen reader can say. */}
        <span className="wq-chip" style={{ marginLeft: 8 }}
          {...(freePlay && fpMode === "random" ? { role: "img", "aria-label": "random words" } : {})}>
          {freePlay && fpMode === "random" ? "🎲" : state.level + " " + L.emoji}</span>
      </Zone.Header>

      {/* The session path, on its own row beneath the header (owner-ruled
          2026-08-12). It sits outside the header so the dots can WRAP to two or
          three lines on a phone without pushing the home control or the level
          chip off the edge — which is exactly what a single row did. */}
      <ProgressBar order={order} firstResults={firstResults} total={totalQ} at={answered} freePlay={freePlay} />

      <SessionStage state={state} currentWord={currentWord} phase={phase} fb={fb} liveRef={liveRef} pops={pops} />

      <SessionRail kid={kid} phase={phase} advanceReady={advanceReady} waitMs={waitMs} waitFrom={waitFrom}
        finishes={finishes} next={next} advanceRef={advanceRef} />

      {/* P0-4 / P1-2 / P2-10 — grown-up strip: muted, bottom edge, small */}
      <Zone.Strip>
        <span className="wq-striplabel">grown-up · hold to grade</span>
        <button className="wq-sbtn" onClick={replay} disabled={!canReplay} aria-label="Hear the word again">🔊</button>
        {/* The reveal's second adult control: hear it again, or move on
            (owner-approved 2026-08-07). A 450 ms hold, because a tap here
            would be the child skipping their own teaching moment; the slot
            is reserved in every phase so no control moves under a finger
            (A2-002). */}
        <HoldButton onFire={skipReveal} disabled={phase !== "feedback"} color={C.ink2} label="⏭ skip" />
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <HoldButton onFire={() => grade("correct")} disabled={phase === "feedback"} color={C.green} label="✓ got it" />
          <HoldButton onFire={() => grade("close")} disabled={phase === "feedback"} color={C.amber} label="~ close" />
          <HoldButton onFire={() => grade("wrong")} disabled={phase === "feedback"} color={C.red} label="↻ not yet" />
        </div>
        {/* N-12 + P0-2: one reserved marker line, so the strip height never changes
            and the word never moves between phases */}
        <span className="wq-mark wq-mono">
          {seenTwice[currentWord] && phase !== "feedback" ? "Parent: second look" : " "}
        </span>
      </Zone.Strip>

      {exitAsk && <ExitDialog answered={answered} handleExit={handleExit} />}
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
