import { C, LANGS, LEVELS, displayWord } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import H3 from "../components/H3.jsx";
import Seg from "../components/Seg.jsx";

export default function ParentScreen({
  state, nameDraft, setNameDraft, commitName, setSound, setLang, setUpdateCheck, jumpLevel,
  openLevels, setOpenLevels, copyLog, copyBox, resetStage, setResetStage, doReset,
  onBack, onExportJSON, onImportJSON, toast, voiceFallback,
}) {
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={onBack}>← Back</button>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15, marginLeft: 8 }}>Grown-ups corner</span>
      </Zone.Header>

      <Zone.Stage scroll>
        <div style={{ width: "100%", maxWidth: 560, display: "grid", gap: 12, paddingBottom: 8 }}>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Settings</H3>
            <label htmlFor="wq-name" className="wq-lbl">Reader’s first name (optional)</label>
            {/* P2-13 — blur commits; no redundant Save button */}
            <input id="wq-name" type="text" value={nameDraft} maxLength={20}
              onChange={e => setNameDraft(e.target.value)} onBlur={commitName}
              placeholder="Leave blank to stay anonymous" className="wq-input" />
            <p className="wq-help">Saves when you tap away. Used only for greetings; stored on this device.</p>

            <div className="wq-fieldrow">
              <span className="wq-lbl">Sounds</span>
              <Seg options={[[true, "🔊 On"], [false, "🔇 Off"]]} value={state.settings.sound} onChange={setSound} />
            </div>

            {/* P2-5 — native select for locale */}
            <div className="wq-fieldrow">
              <label className="wq-lbl" htmlFor="wq-lang">Voice &amp; accent</label>
              <select id="wq-lang" className="wq-input" value={state.settings.lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            {/* P2-5 — segmented level control; P2-14 — helper text */}
            <div className="wq-fieldrow">
              <span className="wq-lbl">Jump to level</span>
              <Seg options={LEVELS.map(l => [l.n, String(l.n)])} value={state.level} onChange={jumpLevel} />
            </div>
            <p className="wq-help">Changes only which words come up next. Mastery already earned is kept, and the engine still promotes on its own.</p>
          </section>

          {/* P2-4 — collapsed mastery map with summary rows */}
          {/* B7 — the recorded voice fell back to the device's own voice, and
              says why. Correct behaviour used to leave no trace at all: a
              grown-up saw a shorter sentence and no tile rings, and nothing
              anywhere said the recorded voice was unavailable, so a pack that
              had quietly stopped resolving looked like a design choice. Shown
              only to the grown-up, and only after it has actually happened. */}
          {voiceFallback && (
            <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
              <H3>The recorded voice</H3>
              <p className="wq-help" style={{ margin: 0 }}>
                The game is using your device's own voice at the moment, not its recorded one.
                The reading still works and nothing is lost — words are spoken and results are
                saved as usual — but the sound-out will not light up letter by letter.
              </p>
              <p className="wq-help" style={{ margin: "8px 0 0", opacity: 0.85 }}>
                Reason: {voiceFallback}
              </p>
            </section>
          )}

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Mastery map</H3>
            {/* A parent read "2/12 mastered" after their child read all twelve
                correctly and reported it as a bug (2026-08-12). It was not one:
                a first correct reading reaches box 3 and mastery is box 4, so
                every amber word is one the child GOT RIGHT. The screen had
                three colours, no key, and a single number that reads as
                failure. Both are answered here, in the grown-up's words. */}
            <p className="wq-help" style={{ margin: "0 0 10px" }}>
              Two correct readings, on different days, make a word green. The gap between them is
              deliberate — waiting is what moves a word into long-term memory.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "0 0 12px",
              fontSize: 12, color: C.ink2 }}>
              {[["#c6f2dd", "read right twice"], ["#ffe9b3", "read right once"],
                ["#ffd4d0", "not yet"], [C.chip, "not tried"]].map(([bg, label]) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ background: bg, width: 15, height: 15, borderRadius: 4,
                    border: "1px solid " + C.line, display: "inline-block" }} />{label}
                </span>
              ))}
            </div>
            {LEVELS.map(l => {
              const done = l.words.filter(w => state.words[w] && state.words[w].box >= 4).length;
              const seen = l.words.filter(w => state.words[w] && state.words[w].attempts > 0).length;
              const isOpen = !!openLevels[l.n];
              return (
                <div key={l.n} style={{ borderTop: "1px solid " + C.line, paddingTop: 9, marginTop: 9 }}>
                  <button className="wq-rowbtn" onClick={() => setOpenLevels(o => ({ ...o, [l.n]: !isOpen }))} aria-expanded={isOpen}>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Level {l.n} {l.emoji}</span>
                    {/* Two numbers, not one. "2/12 mastered" alone told a
                        parent their child had failed ten words they had in
                        fact read correctly. What the child DID comes first. */}
                    <span className="wq-mono" style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto" }}>{seen}/{l.words.length} read · {done} green</span>
                    <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  <div className="wq-meter"><div style={{ width: (done / l.words.length) * 100 + "%", background: C.green, height: "100%" }} />
                    <div style={{ width: ((seen - done) / l.words.length) * 100 + "%", background: C.sun, height: "100%" }} /></div>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {l.words.map(w => {
                        const ws = state.words[w];
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 4 ? "#c6f2dd" : ws.box >= 2 ? "#ffe9b3" : "#ffd4d0";
                        return <span key={w} style={{ background: bg, color: C.ink, borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 700 }}>{displayWord(w)}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Session log</H3>
            {state.log.length === 0
              ? <p className="wq-help">No sessions yet.</p>
              : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, color: C.ink, borderCollapse: "collapse" }}>
                    <thead><tr style={{ textAlign: "left" }}>
                      <th>#</th><th>Date</th><th>Lvl</th><th>✅</th><th>🟡</th><th>🔁</th><th>Acc</th></tr></thead>
                    <tbody>{state.log.slice().reverse().map(s => (
                      <tr key={s.n} style={{ borderTop: "1px solid " + C.line }}>
                        <td>{s.n}{s.partial ? "*" : ""}</td><td>{s.date}</td><td>{s.level}</td>
                        <td>{s.c}</td><td>{s.k}</td><td>{s.w}</td><td style={{ fontWeight: 700 }}>{s.acc}%</td>
                      </tr>))}</tbody>
                  </table>
                  {state.log.some(s => s.partial) && <p className="wq-help">* ended early</p>}
                </div>}
            <button className="wq-cta" style={{ marginTop: 12, background: C.ink, fontSize: 14, padding: "11px 14px" }} onClick={copyLog}>📋 Copy log (Markdown)</button>
            {/* P2-15 */}
            {copyBox && <>
              <p className="wq-lbl" style={{ marginTop: 10 }}>Clipboard blocked — select all and copy</p>
              <textarea readOnly value={copyBox} onFocus={e => e.target.select()} rows={6} className="wq-input wq-mono" style={{ fontSize: 11.5 }} />
            </>}
          </section>

          {/* W3 — full-state backup: JSON export and import */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Backup</H3>
            <p className="wq-help" style={{ margin: "0 0 10px" }}>Save all progress to a file, or load a saved file. The file stays on this device.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="wq-sbtn" onClick={onExportJSON}>⬇️ Save backup file</button>
              <label className="wq-sbtn" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                ⬆️ Load backup file
                <input type="file" accept="application/json,.json" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files && e.target.files[0]; if (f) onImportJSON(f); e.target.value = ""; }} />
              </label>
            </div>
            <p className="wq-help">A loaded file replaces the progress on this device.</p>
          </section>

          {/* P2-3 — confirm is a different, offset control; cancel is larger */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Danger zone</H3>
            {resetStage === 0
              ? <button className="wq-sbtn" style={{ borderColor: C.muted, color: C.muted }} onClick={() => setResetStage(1)}>🗑️ Reset all progress</button>
              : <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13.5, color: C.ink, fontWeight: 700 }}>Erase every session, word score and setting?</p>
                  <button className="wq-cta" style={{ background: C.ink2 }} onClick={() => setResetStage(0)}>Keep my progress</button>
                  <button className="wq-sbtn" style={{ borderColor: C.red, color: C.red, justifySelf: "start" }} onClick={doReset}>Yes, erase everything</button>
                </div>}
          </section>

          <UpdateSection updateCheck={state.settings.updateCheck} setUpdateCheck={setUpdateCheck} />
        </div>
      </Zone.Stage>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}

/* SPEC §7a — the version chip and the owner's condition on S6's second
   request (2026-08-03): the words below the switch say exactly what the app
   asks and when, and Off means zero requests. The manual "Check for
   updates" and "Update now" moved to the home screen's grown-up strip
   (owner-approved 2026-08-07) so an adult finds them without hunting; this
   section keeps the switch and the plain words. */
function UpdateSection({ updateCheck, setUpdateCheck }) {
  return (
    <section style={{ textAlign: "center", margin: "0 0 4px" }}>
      <p style={{ margin: "0 0 6px" }}>
        <span className="wq-chip" style={{ fontSize: 11.5 }}>Word Quest app {__APP_VERSION__} · {__APP_BUILD__}</span>
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: C.strip }}>
        An update never touches saved progress.
      </p>
      <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        {/* Not wq-lbl: that class is C.muted for white cards, and this section
            sits on the gradient, where it measured 2.99:1 (G8). C.strip is the
            color the section's other text already passes with. */}
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.strip }}>
          Automatic update check</span>
        <Seg options={[[true, "On"], [false, "Off"]]} value={updateCheck} onChange={setUpdateCheck} />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11.5, color: C.strip }}>
        When this is on, each time you come back to the app it asks its own website
        whether a newer version exists. The question carries nothing about you or your
        child. A new version still waits for a grown-up&#39;s &quot;Update now&quot;, or the app&#39;s
        next fresh start. Off means the app only checks when a grown-up presses and
        holds &quot;Check for updates&quot; on the first screen.
      </p>
    </section>
  );
}
