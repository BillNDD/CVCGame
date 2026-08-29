import { C, PRE_LEVELS, isChunkItem, chunkText } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import HoldButton from "../components/HoldButton.jsx";
import Word from "../components/Word.jsx";

/* THE PRE-LEVEL SESSION, rebuilt as the chunk ladder (owner-ruled
   2026-08-24/25; SPEC section 12). One item at a time, two kinds by
   declaration and never by length. A LETTER fills the stage and its
   approved sound is the PROMPT - shown, not read, S2 not in play. A CHUNK
   is READ: two letters printed, the screen silent, and S2 applies in full -
   the 🔊 plays the sounds SEPARATED, never the blended answer, so the help
   is the retired ear rung's oral blend on demand and never the answer. The
   adult grades with the identical hold strip a word uses, so S1 is the same
   sentence here it is everywhere. */
export default function PreSessionScreen({
  state, item, phase, lastGrade, answered, totalQ,
  advanceReady, finishes, onExitAsk, grade, next, replayPrompt,
}) {
  const P = PRE_LEVELS.find((p) => p.n === state.preLevel) || PRE_LEVELS[0];
  const isChunk = isChunkItem(item);
  const shown = chunkText(item);
  const dead = phase === "feedback";
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-sbtn" onClick={onExitAsk} aria-label="Home">🏠</button>
        <span className="wq-chip wq-mono">{answered}/{totalQ}</span>
        <span className="wq-chip">{state.preLevel > 0 ? `Pre ${P.n} ${P.emoji}` : "chunks 🧱"}</span>
      </Zone.Header>

      <Zone.Stage seed muted={!state.settings.sound}>
        <div className="wq-stagegrid">
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.ink }}>
              {isChunk ? "What does it say?" : "Say the sound"}
            </p>
            {/* A letter shows one glyph while its sound asks the question.
                A chunk shows its two letters and NOTHING plays: the print is
                the question and the child's reading is the answer (S2). */}
            <Word>{shown}</Word>
            <div className="wq-slot-tiles" aria-hidden="true"></div>
            <div className="wq-slot-msg">
              {dead && (
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
                  {lastGrade === "correct" ? "🎉 Great job!" : lastGrade === "close" ? "💪 Good try!" : "🔁 Let’s try that again."}
                </p>
              )}
            </div>
          </div>
        </div>
      </Zone.Stage>

      <Zone.Rail>
        {phase === "feedback"
          ? <button className="wq-cta" onClick={next} disabled={!advanceReady}
              style={{ background: C.green, opacity: advanceReady ? 1 : 0.55 }}>
              {finishes ? "🏁 Finish!" : "Next one ➡️"}</button>
          : <div className="wq-prompt">{isChunk ? "Your turn… read it out loud! 📣" : "Say it back! 📣"}</div>}
      </Zone.Rail>

      <Zone.Strip>
        <span className="wq-striplabel">grown-up · hold to grade</span>
        <button className="wq-sbtn" onClick={replayPrompt} disabled={!state.settings.sound} aria-label="Hear it again">🔊</button>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <HoldButton onFire={() => grade("correct")} disabled={dead} color={C.green} label="✓ got it" />
          <HoldButton onFire={() => grade("close")} disabled={dead} color={C.amber} label="~ close" />
          <HoldButton onFire={() => grade("wrong")} disabled={dead} color={C.red} label="↻ not yet" />
        </div>
        <span className="wq-mark wq-mono">{state.settings.sound ? " " : "Parent: sound is off"}</span>
      </Zone.Strip>
    </Frame>
  );
}
