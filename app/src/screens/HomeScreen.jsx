import { C, PRE_LEVELS } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import UpdateRow from "../components/UpdateRow.jsx";

/* The free-play chooser (SPEC section 6): between the tap and the game, the
   grown-up picks which words free play serves. Both choices are full 56 px
   controls (S7) because the finger on them may be the child's. */
function FreePlayChooser({ level, L, onChoose, onCancel }) {
  return (
    <Modal title="Free play" onClose={onCancel}>
      <p style={{ margin: "0 0 14px", fontSize: 14.5, color: C.ink2, lineHeight: 1.5 }}>
        Grown-up: words or sentences? Truly random serves any word from all 461 — easy and
        hard alike. Nothing is saved in free play, whichever you pick.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        <button className="wq-cta" onClick={() => onChoose("random")}>🎲 Truly random</button>
        {/* The quiet styling the home rail uses would melt into this WHITE
            card - white on white, no edge at all - so the second choice takes
            the exit dialog's outlined pattern instead. */}
        <button className="wq-cta" onClick={() => onChoose("level")}
          style={{ background: "#fff", color: C.ink, border: "2px solid " + C.ink2, boxShadow: "none" }}>
          🎯 Level {level} {L.emoji} words
        </button>
        {/* Sentences (SPEC section 12 point 7, owner-ruled 2026-08-13). It
            serves every sentence up to and including this level, so a child
            can practise reading them without a session — and, like every
            other free-play choice, records nothing. */}
        <button className="wq-cta" onClick={() => onChoose("sentences")}
          style={{ background: "#fff", color: C.ink, border: "2px solid " + C.ink2, boxShadow: "none" }}>
          📖 Sentences
        </button>
        <button className="wq-btn-plain" onClick={onCancel} style={{ justifySelf: "center" }}>Back</button>
      </div>
    </Modal>
  );
}

export default function HomeScreen({ state, L, kid, masteredCount, persistent, readOnly, onBegin, onFreePlay, onParent,
  fpChooser, onFreePlayChoose, onFreePlayCancel, toast }) {
  return (
    <Frame>
      <Zone.Header>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Word Quest</span>
        <span className="wq-chip" style={{ fontSize: 10.5, padding: "5px 8px" }}>beta</span>
        <button className="wq-btn-plain" onClick={onParent} aria-label="Grown-ups corner">⚙️ Grown-ups</button>
      </Zone.Header>

      <Zone.Stage home>
        <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          {/* Geometry lives in the stylesheet (wq-home-*) so the short-screen
              rules can shrink the home furniture to fit: the level card used
              to slide under the action rail on a half-height desktop window. */}
          <h1 className="wq-display wq-home-title" style={{ color: C.ink }}>
            Word Quest
          </h1>
          <p className="wq-home-hi" style={{ color: C.ink }}>
            {kid ? "Hi " + kid + "! Ready to read? 📖" : "Ready to read? 📖"}
          </p>
          <div className="wq-card wq-home-card">
            <div style={{ fontWeight: 800, color: C.ink, fontSize: 18 }}>
              {/* Inside the ladder the chip names the pre-level: one chip,
                 one truth about where the child is (owner-ruled 2026-08-15). */}
              {state.preLevel > 0
                ? (() => { const P = PRE_LEVELS.find((x) => x.n === state.preLevel); return "Pre " + P.n + " " + P.emoji + " " + P.name; })()
                : "Level " + state.level + " " + L.emoji + " " + L.name}</div>
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
        {/* Free play: the same loop, endless, and nothing is ever written.
            A full 56 px child control (S7), styled quieter than the one
            session control so the main path stays unmistakable. */}
        <button className="wq-cta" onClick={onFreePlay}
          style={{ marginTop: 10, background: "rgba(255,255,255,.85)", color: C.ink, boxShadow: "none" }}>
          🎈 Free play
        </button>
      </Zone.Rail>
      {/* P2-7 — parent-facing copy lives in the grown-up strip, not under the child's button.
          The update row (SPEC section 7a) wraps onto the strip's second line. */}
      <Zone.Strip>
        <span className="wq-striplabel">grown-up</span>
        <span style={{ fontSize: 12, color: C.strip }}>up to 20 words · about 5 minutes · you judge</span>
        <UpdateRow />
      </Zone.Strip>
      {fpChooser && <FreePlayChooser level={state.level} L={L} onChoose={onFreePlayChoose} onCancel={onFreePlayCancel} />}
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
