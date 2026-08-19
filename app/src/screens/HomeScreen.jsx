import { C, PRE_LEVELS } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import UpdateRow from "../components/UpdateRow.jsx";

/* The free-play chooser (SPEC section 6): between the tap and the game, the
   grown-up picks which words free play serves. Both choices are full 56 px
   controls (S7) because the finger on them may be the child's. */
function FreePlayChooser({ level, L, sound, preLevel, buildable, sentences, onChoose, onCancel }) {
  return (
    <Modal title="Free play" onClose={onCancel}>
      {/* The question names only the choices below it. With no sentences to
          serve the row is gone, and a paragraph still offering to read them
          describes a control the grown-up cannot find — the same fault as the
          dead control, one line higher up. */}
      <p style={{ margin: "0 0 14px", fontSize: 14.5, color: C.ink2, lineHeight: 1.5 }}>
        {sentences > 0
          ? "Grown-up: read words, read sentences, or build a word from its sounds?"
          : "Grown-up: read words or build a word from its sounds?"}
        {" "}Truly random serves any word from all 476 — easy and hard alike. Nothing is
        saved in free play, whichever you pick.
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
        {/* Hidden where that pool is empty. A level's text is written with the
            level, so a level whose text is not written yet has no sentences —
            which is what a level looks like before it is finished, not a
            fault. Nothing a grown-up can switch brings them back, so the row
            GOES rather than standing there disabled: that is the call the
            Build-it row takes at Pre 1, where a tray would have nothing honest
            to hold (open-faults Q6), and the opposite of the call it takes
            with sound off, where a switch does exist and the row says so.
            Under it, beginFreePlay refuses an empty pool whatever this
            decides — a hidden control is not a guard. */}
        {sentences > 0 && <button className="wq-cta" onClick={() => onChoose("sentences")}
          style={{ background: "#fff", color: C.ink, border: "2px solid " + C.ink2, boxShadow: "none" }}>
          📖 Sentences
        </button>}
        {/* Build-it (SPEC section 12, owner-ruled 2026-08-17, decision D1). The
            fourth row: the app speaks a word and the child assembles it from
            sound tiles. It serves words the child has mastered first, so the
            word spoken is one they own; nothing here is recorded either. */}
        {/* With sound switched off the mode has nothing to say, and its whole
            prompt is a spoken word: it would show a child empty slots and never
            tell them what to build. The row states why rather than vanishing,
            so a grown-up can see the switch that brings it back. */}
        {/* Hidden at Pre 1, where the child has met no letters and a tray would
            have nothing honest to hold (open-faults Q6). It returns at Pre 2 as
            "find the sound", and after the ladder as "build a word". */}
        {buildable && <button className="wq-cta" onClick={() => onChoose("build")} disabled={!sound}
          style={{ background: "#fff", color: C.ink, border: "2px solid " + C.ink2,
            boxShadow: "none", opacity: sound ? 1 : 0.55 }}>
          {preLevel > 0 ? "🔎 Find the sound" : "🧱 Build a word"}
        </button>}
        {!sound && <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, textAlign: "center" }}>
          Building needs sound. Turn sound on in the Grown-ups corner.
        </p>}
        <button className="wq-btn-plain" onClick={onCancel} style={{ justifySelf: "center" }}>Back</button>
      </div>
    </Modal>
  );
}

export default function HomeScreen({ state, L, kid, masteredCount, persistent, readOnly, onBegin, onFreePlay, onParent,
  fpChooser, onFreePlayChoose, onFreePlayCancel, sentences, toast }) {
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
      {fpChooser && <FreePlayChooser level={state.level} L={L} sound={state.settings.sound}
        preLevel={state.preLevel} buildable={state.preLevel === 0 || state.preLevel >= 2}
        sentences={sentences}
        onChoose={onFreePlayChoose} onCancel={onFreePlayCancel} />}
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
