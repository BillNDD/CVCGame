import { useRef } from "react";
import { C, TRICKY, chunkWord, displayWord, displayChunk, feedbackParts } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import HoldButton from "../components/HoldButton.jsx";
import SentenceStage from "../components/SentenceStage.jsx";

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
          <div className="wq-display wq-word" aria-live="off">{displayWord(currentWord)}</div>

          {/* The sound-out: a tile takes its ring as its own sound plays. The
              key carries the tile's mark count, so the browser runs the
              animation from its first frame each time rather than ignoring a
              class it already has. `pops` is empty whenever no sound-out is
              playing, so the tiles simply sit there — the reveal without
              sound is the reveal it always was. */}
          {/* The owner's cutover ruling (2026-08-20): long words SHRINK to keep one
              row - reveal tiles are display, not controls, so S7's floor does not
              bind them. Two steps, at six and at eight tiles. */}
          <div className={"wq-slot-tiles" + (chunkWord(currentWord).length >= 8 ? " wq-crowd" : chunkWord(currentWord).length >= 6 ? " wq-many" : "")} aria-hidden={phase !== "feedback"}>
            {phase === "feedback" && chunkWord(currentWord).map((g, i) => (
              /* A ring only where its LENGTH is known (B5). A source that
                 cannot say how long its sound is — a family pack, whose clips
                 nobody has measured — used to get a ring of a fixed 700 ms,
                 which is the fault fixed on 2026-08-11 handed back: it
                 outlived the four short plosives and ran out 236 ms before /w/
                 finished in "win". A ring against the wrong sound teaches the
                 child the wrong piece of the word, so no length now means no
                 ring, and the reveal is simply the one it always was without
                 sound. */
              <span key={i + ":" + (pops[i]?.n || 0)}
                className={"wq-display wq-tile" + (pops[i]?.ms > 0 ? " wq-pop" : "")}
                style={pops[i]?.ms > 0 ? { "--wqpop": pops[i].ms + "ms" } : undefined}>{displayChunk(currentWord, g)}</span>
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
        <button aria-label={finishes ? "Finish!" : "Next word"} ref={advanceRef} className="wq-cta" onClick={next} disabled={!advanceReady}
          style={{ background: advanceReady ? C.green : "#9fb4c4" }}>
          {/* A1-004 — the wait is visible: a fill crosses the control over the
              reveal's own length and lands as the control comes alive. The
              fill appears only once a length is KNOWN (waitMs > 0): before
              the clips schedule there is nothing honest to sweep, and B17's
              fix means nothing is armed in that gap either — the control sits
              plainly disabled instead of showing a bar over a guessed length.
              If a later arm replaces an earlier one (the backstop, then the
              real length), the fill continues from its own position
              (--wqfillfrom, a percent) over the remaining wait, so it never
              moves backwards. It carries no text and no role: the feedback
              already speaks for itself through one channel (N-9). */}
          {!advanceReady && waitMs > 0 && <span key={waitMs + "-" + waitFrom} className="wq-ctafill" aria-hidden="true"
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

/* Stage and rail together, because a sentence replaces BOTH: it takes the
   whole stage, and its advance takes no wait. Split out so no function passes
   the G6 complexity ceiling; the rendered output for a word is identical. */
function SessionBody({ sentence, sentencePhase, openWord, openAt, onTapWord, endSentence, nextIsSentence,
  state, currentWord, phase, fb, liveRef, pops,
  kid, advanceReady, waitMs, waitFrom, finishes, next, advanceRef }) {
  /* The sentence replaces the word rather than sitting beside it: the word the
     child just read is finished, and two things to look at is one too many for
     a four-year-old (SPEC section 12 point 6). */
  if (sentence) {
    const attempt = sentencePhase === "attempt";
    return (
      <>
        <Zone.Stage><SentenceStage sentence={sentence} openWord={openWord} openAt={openAt} pops={pops}
          onTapWord={onTapWord} attempt={attempt} /></Zone.Stage>
        {/* THE CHILD'S TURN FIRST (owner-ruled 2026-08-14, open-faults N).
            During the attempt the rail carries the prompt, exactly as a
            word's ready phase does, and there is NO advance control: the mark
            is the only way forward, the same as a word. The always-live
            advance below belongs to the REVEAL — the ruling of 2026-08-13
            that nothing has to finish first was made about the reveal, and
            it stands there untouched. */}
        <Zone.Rail>
          {attempt
            ? <div className="wq-prompt">{kid ? kid + ", read the sentence out loud! 📣" : "Read the sentence out loud! 📣"}</div>
            : <button aria-label={nextIsSentence ? "Next sentence" : "Next word"} className="wq-cta" onClick={endSentence} style={{ background: C.green }}>
                {/* The label says what the press brings (A2-003). In sentence
                    free play the next item IS a sentence, and the owner read
                    "Next word" there from a real phone (2026-08-15): a label
                    that misnames the next thing teaches a child to ignore
                    labels. */}
                {nextIsSentence ? "Next sentence ➡️" : "Next word ➡️"}</button>}
        </Zone.Rail>
      </>
    );
  }
  return (
    <>
      <SessionStage state={state} currentWord={currentWord} phase={phase} fb={fb} liveRef={liveRef} pops={pops} />
      <SessionRail kid={kid} phase={phase} advanceReady={advanceReady} waitMs={waitMs} waitFrom={waitFrom}
        finishes={finishes} next={next} advanceRef={advanceRef} />
    </>
  );
}

/* What free play is counting. Sentences are not words, and a child who has
   read four sentences being told "4 words" is being told something untrue
   about their own reading. */
const countLabel = (fpMode, n) => (fpMode.startsWith("sentences")
  ? (n === 1 ? " sentence" : " sentences")
  : (n === 1 ? " word" : " words"));

/* The header row. Split from the screen at the G6 complexity ceiling — the
   same door the stage and the rail left by; the rendered output is identical. */
function SessionHeader({ onExitAsk, freePlay, fpCount, fpMode, answered, totalQ, state, L }) {
  return (
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
        {freePlay ? fpCount + countLabel(fpMode, fpCount) : answered + "/" + totalQ}</span>
      {/* Truly random free play serves every level at once, so the level
          chip would be a false statement there. The dice says what is true,
          and carries a name a screen reader can say. */}
      <span className="wq-chip" style={{ marginLeft: 8 }}
        {...(freePlay && (fpMode === "random" || fpMode === "sentences-any") ? { role: "img", "aria-label": fpMode === "random" ? "random words" : "random sentences" } : {})}>
        {freePlay && (fpMode === "random" || fpMode === "sentences-any") ? "🎲" : state.level + " " + L.emoji}</span>
    </Zone.Header>
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
  sentence, sentencePhase, gradeSentence, openWord, openAt, onTapWord, endSentence,
  freePlay, fpCount, fpMode,
  onExitAsk, grade, next, skipReveal, replay, handleExit, advanceRef, toast,
}) {
  const liveRef = useRef(null);
  const fb = lastGrade ? feedbackParts(lastGrade, currentWord) : null;
  const canReplay = phase === "feedback" && !sentence;   // N-1
  return (
    <Frame>
      <SessionHeader onExitAsk={onExitAsk} freePlay={freePlay} fpCount={fpCount} fpMode={fpMode}
        answered={answered} totalQ={totalQ} state={state} L={L} />

      {/* The session path, on its own row beneath the header (owner-ruled
          2026-08-12). It sits outside the header so the dots can WRAP to two or
          three lines on a phone without pushing the home control or the level
          chip off the edge — which is exactly what a single row did. */}
      <ProgressBar order={order} firstResults={firstResults} total={totalQ} at={answered} freePlay={freePlay} />

      <SessionBody
        sentence={sentence} sentencePhase={sentencePhase} openWord={openWord} openAt={openAt}
        nextIsSentence={freePlay && fpMode.startsWith("sentences")}
        onTapWord={onTapWord} endSentence={endSentence}
        state={state} currentWord={currentWord} phase={phase} fb={fb} liveRef={liveRef} pops={pops}
        kid={kid} advanceReady={advanceReady} waitMs={waitMs} waitFrom={waitFrom}
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
        {/* THE SENTENCE IS GRADED WITH THESE SAME CONTROLS (owner-ruled
            2026-08-14, open-faults N): live during its ATTEMPT, marking the
            SENTENCE — a grade that decides only what the app says next and is
            recorded nowhere (SPEC section 12 point 3: never scheduled, never
            in the boxes). Dead again the moment the mark lands, exactly as
            they are during a word's feedback: one attempt, one result, and
            the word behind the sentence can never be graded a second time.
            In free play a sentence has no attempt phase at all (SPEC section
            12 point 7: no grade control is live there), so `sentencePhase`
            is "reveal" from the start and these stay dead. */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {(() => {
            const sAttempt = !!sentence && sentencePhase === "attempt";
            const dead = sentence ? !sAttempt : phase === "feedback";
            const fire = (r) => (sAttempt ? gradeSentence(r) : grade(r));
            return (
              <>
                <HoldButton onFire={() => fire("correct")} disabled={dead} color={C.green} label="✓ got it" />
                <HoldButton onFire={() => fire("close")} disabled={dead} color={C.amber} label="~ close" />
                <HoldButton onFire={() => fire("wrong")} disabled={dead} color={C.red} label="↻ not yet" />
              </>
            );
          })()}
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
