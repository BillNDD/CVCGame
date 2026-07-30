import { C } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";

export default function HomeScreen({ state, L, kid, masteredCount, persistent, readOnly, onBegin, onParent, toast }) {
  return (
    <Frame>
      <Zone.Header>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Word Quest</span>
        <span className="wq-chip" style={{ fontSize: 10.5, padding: "5px 8px" }}>beta</span>
        <button className="wq-btn-plain" onClick={onParent} aria-label="Grown-ups corner">⚙️ Grown-ups</button>
      </Zone.Header>

      <Zone.Stage>
        <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          <h1 className="wq-display" style={{ margin: 0, color: C.ink, fontSize: "clamp(2rem,7dvh,3rem)", lineHeight: 1.1 }}>
            Word Quest
          </h1>
          <p style={{ margin: "8px 0 0", color: C.ink, fontWeight: 700, fontSize: 16 }}>
            {kid ? "Hi " + kid + "! Ready to read? 📖" : "Ready to read? 📖"}
          </p>
          <div className="wq-card" style={{ marginTop: 18, padding: 16 }}>
            <div style={{ fontWeight: 800, color: C.ink, fontSize: 18 }}>Level {state.level} {L.emoji} {L.name}</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 18, color: C.ink2, fontSize: 13.5, fontWeight: 700 }}>
              {/* A1-014 / A2-014 — "1 sessions" was the first thing a child saw
                  after their first session, on a screen that teaches reading.
                  Counted the way the exit dialog counts words. */}
              <span>🗓️ {state.sessionsCompleted} {state.sessionsCompleted === 1 ? "session" : "sessions"}</span><span>🌟 {masteredCount} mastered</span>
            </div>
          </div>
          {/* #96261d: warning red dark enough for 4.5:1 on the gradient */}
          {(!persistent || readOnly) && <p style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#96261d" }}>
            ⚠️ {readOnly ? "Saved progress could not be read. Nothing is being saved." : "Saving unavailable — progress lasts this visit only."}</p>}
        </div>
      </Zone.Stage>

      <Zone.Rail>
        <button className="wq-cta" onClick={onBegin}>▶️ Begin Session</button>
      </Zone.Rail>
      {/* P2-7 — parent-facing copy lives in the grown-up strip, not under the child's button */}
      <Zone.Strip>
        <span className="wq-striplabel">grown-up</span>
        <span style={{ fontSize: 12, color: C.strip }}>~20 words · about 5 minutes · {state.settings.mode === "mic" ? "microphone" : "you judge"}</span>
      </Zone.Strip>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
