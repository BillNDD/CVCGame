import { C, LEVELS } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Stat from "../components/Stat.jsx";

export default function DoneScreen({ doneStats, kid, onHome, toast }) {
  const promoted = doneStats.promoted;
  return (
    <Frame>
      <Zone.Header><span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Session complete</span></Zone.Header>
      <Zone.Stage>
        <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          {/* P2-12 — level-up folded into the trophy, not stacked beneath it */}
          <div className="wq-trophy" style={{ borderColor: promoted ? C.purple : "transparent" }}>
            <span style={{ fontSize: "clamp(2.5rem,8dvh,4rem)" }}>🏆</span>
          </div>
          <h2 className="wq-display" style={{ margin: "10px 0 0", color: promoted ? C.purple : C.ink, fontSize: "clamp(1.5rem,5dvh,2.2rem)" }}>
            {promoted ? "Level up!" : doneStats.partial ? "Good stop" : kid ? "All done, " + kid + "!" : "All done!"}
          </h2>
          {promoted && <p style={{ margin: "2px 0 0", fontWeight: 800, color: C.purple, fontSize: 14 }}>
            Welcome to Level {doneStats.newLevel} {LEVELS[doneStats.newLevel - 1].emoji}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
            <Stat n={doneStats.c} label="Got it" emoji="✅" />
            <Stat n={doneStats.k} label="So close" emoji="🟡" />
            <Stat n={doneStats.w} label="Practised" emoji="🔁" />
          </div>
          <p style={{ margin: "12px 0 0", fontWeight: 800, color: C.ink, fontSize: 15 }}>
            {doneStats.acc >= 90 ? "Superstar reading! 🌟" : doneStats.acc >= 70 ? "Great work today! 💪" : "Every try makes you stronger! 🌱"}
          </p>
        </div>
      </Zone.Stage>
      <Zone.Rail><button className="wq-cta" onClick={onHome} aria-label="Back home">🏠 Back home</button></Zone.Rail>
      <Zone.Strip>
        <span className="wq-striplabel">grown-up</span>
        <span style={{ fontSize: 12, color: C.strip }}>
          {doneStats.total} words · {doneStats.acc}% first-try{doneStats.partial ? " · saved as a short session" : ""}
        </span>
      </Zone.Strip>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
