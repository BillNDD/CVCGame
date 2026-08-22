import { C, LEVELS, PRE_LEVELS } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";

/* The ladder's own done screen: small, warm, and honest about what moved.
   A graduate is handed to Level 1 by name. */
export default function PreDoneScreen({ preDone, onHome }) {
  const toP = PRE_LEVELS.find((pl) => pl.n === preDone.to);
  const title = preDone.graduated ? "Ready to read!" : preDone.promoted ? "Pre-level up!" : "All done!";
  const line = preDone.graduated ? "Welcome to Level 1 " + LEVELS[0].emoji
    : preDone.promoted && toP ? "Welcome to Pre " + toP.n + " " + toP.emoji
    : "Great listening today!";
  return (
    <Frame>
      <Zone.Stage home>
        <section className="wq-card" style={{ padding: 20, textAlign: "center" }}>
          <div className="wq-trophy" style={{ borderColor: preDone.promoted ? C.purple : "transparent" }}>
            {preDone.graduated ? "🎓" : preDone.promoted ? "🏆" : "⭐"}</div>
          <h2 className="wq-display" style={{ margin: "10px 0 0", color: preDone.promoted ? C.purple : C.ink }}>{title}</h2>
          <p style={{ margin: "6px 0 0", fontWeight: 800, color: C.ink }}>{line}</p>
        </section>
      </Zone.Stage>
      <Zone.Rail>
        <button className="wq-cta" onClick={onHome} style={{ background: C.blue }} aria-label="Back home">🏠 Back home</button>
      </Zone.Rail>
    </Frame>
  );
}
