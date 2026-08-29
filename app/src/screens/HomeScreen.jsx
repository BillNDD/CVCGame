import { C, PRE_LEVELS, bankWords, alpha } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import Modal from "../components/Modal.jsx";
import UpdateRow from "../components/UpdateRow.jsx";

/* The free-play chooser (SPEC section 6): between the tap and the game, the
   grown-up picks which words free play serves. Both choices are full 56 px
   controls (S7) because the finger on them may be the child's. */
function FreePlayChooser({ level, L, sound, preLevel, buildable, sentences, onChoose, onCancel }) {
  /* THE GRID, owner-ruled 2026-08-21 from a mock he called perfect: one row
     per activity, two columns - the LEFT cell is the child's own level, the
     RIGHT cell is anything in the whole game. The old "Truly random" row at
     the top meant random WORDS only, and a grown-up had no random sentences
     or random builds at all; a fresh Level 1 save met its one sentence over
     and over. The Sounds row (a child still on the pre-letter ladder) has a
     level cell only: "any sound" would offer letters the rung has not taught,
     which the 2026-08-17 Build-a-sound ruling forbids, so that cell waits on
     the owner rather than guessing. Every cell is a 56 px child control (S7). */
  const left = { background: C.paper, color: C.ink, border: "2px solid " + C.ink2, boxShadow: "none", padding: "12px 10px", fontSize: 15 };
  const right = { padding: "12px 10px", fontSize: 15 };
  const rowLabel = { margin: "10px 0 6px", font: "700 11px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: C.ink2 };
  const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
  return (
    <Modal title="Free play" onClose={onCancel}>
      <p style={{ margin: "0 0 6px", fontSize: 14.5, color: C.ink2, lineHeight: 1.5 }}>
        Grown-up: pick what to practise. Left is your child&rsquo;s level; right is
        {/* The count is derived, never typed: the owner's build-time ruling at
            the cutover, after "all 476" sat one keystroke from stale for a
            month. G27's stale_chooser_copy re-sources from the same derivation. */}
        {" "}any word from all {bankWords().length} &mdash; easy and hard alike. Nothing is
        saved in free play, whichever you pick.
      </p>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={rowLabel}>Words</div>
        <div style={row}>
          <button className="wq-cta" onClick={() => onChoose("level")} style={left} aria-label={`Level ${level} words`}>🎯 Level {level} {L.emoji} words</button>
          <button className="wq-cta" onClick={() => onChoose("random")} style={right} aria-label="Any word">🎲 Any word</button>
        </div>
        {/* Sentences: the left cell serves every sentence up to this level and
            GOES when that pool is empty (a level whose text is not written yet
            has no sentences - not a fault); the right cell serves the whole
            game's texts and is never empty. Under both, beginFreePlay refuses
            an empty pool whatever this decides - a hidden control is not a
            guard. */}
        <div style={rowLabel}>Sentences</div>
        <div style={row}>
          {sentences > 0
            ? <button className="wq-cta" onClick={() => onChoose("sentences")} style={left} aria-label={`Level ${level} sentences`}>📖 Level {level} sentences</button>
            : <span aria-hidden="true" />}
          <button className="wq-cta" onClick={() => onChoose("sentences-any")} style={right} aria-label="Any sentence">🎲 Any sentence</button>
        </div>
        {/* Build (SPEC section 12, owner-ruled 2026-08-17, D1): the app speaks
            a word and the child assembles it. With sound switched off the mode
            has nothing to say, so the cells dim and the line below says why. A
            child still on the pre-letter ladder gets Find-the-sound instead
            (Q6), and at Pre 1 - no letters met - the row goes. */}
        {buildable && preLevel > 0 && <>
          <div style={rowLabel}>Sounds</div>
          <div style={row}>
            <button className="wq-cta" onClick={() => onChoose("build")} disabled={!sound} aria-label={`Find a Pre ${preLevel} sound`}
              style={{ ...left, opacity: sound ? 1 : 0.55, gridColumn: "1 / -1" }}>🔎 Find a Pre {preLevel} sound</button>
          </div>
        </>}
        {buildable && preLevel === 0 && <>
          <div style={rowLabel}>Build</div>
          <div style={row}>
            <button className="wq-cta" onClick={() => onChoose("build")} disabled={!sound} aria-label={`Build a level ${level} word`}
              style={{ ...left, opacity: sound ? 1 : 0.55 }}>🧱 Build a level {level} word</button>
            <button className="wq-cta" onClick={() => onChoose("build-any")} disabled={!sound} aria-label="Build any word"
              style={{ ...right, opacity: sound ? 1 : 0.55 }}>🎲 Build any word</button>
          </div>
        </>}
        {!sound && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.ink2, textAlign: "center" }}>
          Building needs sound. Turn sound on in the Grown-ups corner.
        </p>}
        <button className="wq-btn-plain" onClick={onCancel} style={{ justifySelf: "center", marginTop: 10 }}>Back</button>
      </div>
    </Modal>
  );
}

export default function HomeScreen({ state, L, kid, masteredCount, persistent, readOnly, onBegin, onFreePlay, onParent,
  fpChooser, onFreePlayChoose, onFreePlayCancel, sentences, toast }) {
  const ladderNeedsSound = state.preLevel > 0 && !state.settings.sound;
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
          {/* C.warningDeep: warning red dark enough for 4.5:1 on the gradient */}
          {(!persistent || readOnly) && <p style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: C.warningDeep }}>
            ⚠️ {readOnly ? "Saved progress could not be read. Nothing is being saved." : "Saving unavailable — progress lasts this visit only."}</p>}
        </div>
      </Zone.Stage>

      <Zone.Rail>
        {/* THE LADDER NEEDS SOUND (the after pass, 2026-08-23). A child on
            the pre-letter ladder is asked to hear: Pre 1 is nothing but ear
            items, where the sounds ARE the question and nothing is shown to
            read. With sound off that session cannot be answered, and every
            grade the adult gave was still written to the child's ladder
            record. The control now refuses in the chooser's own voice and
            for the chooser's own reason; a child past the ladder reads
            print, so words are unaffected. */}
        {/* THE REASON IS THE ONLY THING TELLING AN ADULT WHY THE APP JUST
            REFUSED THEIR CHILD'S SESSION, so it carries the contrast and the
            association a refusal needs (the council's re-judgement,
            2026-08-23). `ink2` measured 3.91 / 3.81 / 4.17 against the three
            sky stops - below this project's own 4.5 floor on the middle one,
            at 12.5 px, which is not large text at any weight. `strip` is
            4.75 / 4.63 / 5.07 and clears every stop. And it is named by the
            control it explains, so a screen reader reaches the reason from
            the button rather than only by sweeping the page. */}
        <button className="wq-cta" onClick={onBegin} disabled={ladderNeedsSound} aria-label="Begin Session"
          aria-describedby={ladderNeedsSound ? "wq-ladder-needs-sound" : undefined}
          style={ladderNeedsSound ? { opacity: 0.55 } : undefined}>▶️ Begin Session</button>
        {ladderNeedsSound && <p id="wq-ladder-needs-sound" style={{ margin: "6px 0 0", fontSize: 12.5, color: C.strip, textAlign: "center" }}>
          The first steps need sound. Turn sound on in the Grown-ups corner.
        </p>}
        {/* Free play: the same loop, endless, and nothing is ever written.
            A full 56 px child control (S7), styled quieter than the one
            session control so the main path stays unmistakable. */}
        <button className="wq-cta" onClick={onFreePlay} aria-label="Free play"
          style={{ marginTop: 10, background: alpha(C.paper, .85), color: C.ink, boxShadow: "none" }}>
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
        preLevel={state.preLevel} buildable={true /* every rung teaches letters since the chunk rebuild (PRE_TRAY_FROM 1) */}
        sentences={sentences}
        onChoose={onFreePlayChoose} onCancel={onFreePlayCancel} />}
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}
