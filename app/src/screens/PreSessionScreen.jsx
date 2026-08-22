import { C, PRE_LEVELS } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import HoldButton from "../components/HoldButton.jsx";
import Word from "../components/Word.jsx";

/* THE PRE-LEVEL SESSION (owner-ruled 2026-08-15). One item at a time:
   a letter fills the stage and its approved sound is the PROMPT, or — in the
   ear items — the sounds of a Level 1 word play apart and nothing is shown to
   read at all. The child says it back; the adult grades with the identical
   hold strip a word uses, so S1 is the same sentence here it is everywhere.
   The 🔊 replays the PROMPT and is live in every phase: the prompt is the
   question, not the answer, which is why S2 is not in play — nothing on this
   screen is being read (SPEC section 12 item 8). */
export default function PreSessionScreen({
  state, item, phase, lastGrade, answered, totalQ,
  advanceReady, finishes, onExitAsk, grade, next, replayPrompt,
}) {
  const P = PRE_LEVELS.find((p) => p.n === state.preLevel) || PRE_LEVELS[0];
  const isEar = item.length > 1;
  const dead = phase === "feedback";
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-sbtn" onClick={onExitAsk} aria-label="Home">🏠</button>
        <span className="wq-chip wq-mono">{answered}/{totalQ}</span>
        <span className="wq-chip">Pre {P.n} {P.emoji}</span>
      </Zone.Header>

      <Zone.Stage>
        <div className="wq-stagegrid">
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.ink }}>
              {isEar ? "What word do the sounds make?" : "Say the sound"}
            </p>
            {/* The ear shows an ear and never letters: the whole point of
                Pre 1 is blending by sound before print exists. A letter item
                shows its letter in the word slot, one glyph, tile-sized. */}
            <Word>{isEar ? "👂" : item}</Word>
            <div className="wq-slot-tiles" aria-hidden={!(dead && isEar)}>
              {/* In feedback the ear item reveals its word in print — the
                  child has already said it, and seeing it after is exposure,
                  not a test. Letters have nothing more to reveal. */}
              {dead && isEar && <span className="wq-display wq-tile">{item}</span>}
            </div>
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
          : <div className="wq-prompt">{isEar ? "Listen… then say the word! 📣" : "Say it back! 📣"}</div>}
      </Zone.Rail>

      <Zone.Strip>
        <span className="wq-striplabel">grown-up · hold to grade</span>
        <button className="wq-sbtn" onClick={replayPrompt} aria-label="Hear it again">🔊</button>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <HoldButton onFire={() => grade("correct")} disabled={dead} color={C.green} label="✓ got it" />
          <HoldButton onFire={() => grade("close")} disabled={dead} color={C.amber} label="~ close" />
          <HoldButton onFire={() => grade("wrong")} disabled={dead} color={C.red} label="↻ not yet" />
        </div>
        <span className="wq-mark wq-mono"> </span>
      </Zone.Strip>
    </Frame>
  );
}
