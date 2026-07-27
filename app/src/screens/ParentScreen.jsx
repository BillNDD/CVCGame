import { useState } from "react";
import { C, LANGS, LEVELS } from "@engine";
import { checkForUpdate, applyUpdate } from "../updates.js";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import H3 from "../components/H3.jsx";
import Seg from "../components/Seg.jsx";

export default function ParentScreen({
  state, nameDraft, setNameDraft, commitName, setMode, setSound, setLang, jumpLevel,
  openLevels, setOpenLevels, copyLog, copyBox, resetStage, setResetStage, doReset,
  onBack, srAvailable, onExportJSON, onImportJSON, toast,
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
              <span className="wq-lbl">Answer mode</span>
              <Seg options={[["mic", "🎙️ Mic"], ["parent", "👍 You judge"]]} value={state.settings.mode}
                onChange={setMode} disabled={!srAvailable ? ["mic"] : []} />
            </div>
            <p className="wq-help">The app only ever auto-confirms a <em>correct</em> reading. Anything else comes to you — recognition is unreliable for small voices.</p>

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
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Mastery map</H3>
            {LEVELS.map(l => {
              const done = l.words.filter(w => state.words[w] && state.words[w].box >= 4).length;
              const seen = l.words.filter(w => state.words[w] && state.words[w].attempts > 0).length;
              const isOpen = !!openLevels[l.n];
              return (
                <div key={l.n} style={{ borderTop: "1px solid " + C.line, paddingTop: 9, marginTop: 9 }}>
                  <button className="wq-rowbtn" onClick={() => setOpenLevels(o => ({ ...o, [l.n]: !isOpen }))} aria-expanded={isOpen}>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Level {l.n} {l.emoji}</span>
                    <span className="wq-mono" style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto" }}>{done}/{l.words.length} mastered</span>
                    <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  <div className="wq-meter"><div style={{ width: (done / l.words.length) * 100 + "%", background: C.green, height: "100%" }} />
                    <div style={{ width: ((seen - done) / l.words.length) * 100 + "%", background: C.sun, height: "100%" }} /></div>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {l.words.map(w => {
                        const ws = state.words[w];
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 4 ? "#c6f2dd" : ws.box >= 2 ? "#ffe9b3" : "#ffd4d0";
                        return <span key={w} style={{ background: bg, color: C.ink, borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 700 }}>{w}</span>;
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

          <UpdateSection />
        </div>
      </Zone.Stage>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}

/* SPEC §7a — the version chip, the one S6-permitted network request, and the
   adult-consented apply. An update never touches saved progress. */
function UpdateSection() {
  const [status, setStatus] = useState("");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onCheck() {
    setBusy(true); setStatus("Checking…"); setAvailable(false);
    const r = await checkForUpdate(__APP_VERSION__);
    setBusy(false);
    if (r.state === "current") setStatus("You have the latest version.");
    else if (r.state === "available") { setStatus(`Version ${r.latest} is available.`); setAvailable(true); }
    else if (r.state === "offline") setStatus("Couldn’t check. Are you online?");
    else setStatus("The version check didn’t work. Try again later.");
  }

  async function onApply() {
    setBusy(true); setStatus("Updating…");
    const ok = await applyUpdate();
    if (ok) { setStatus("Restarting…"); window.location.reload(); }
    else { setBusy(false); setStatus("The update is still downloading. Try again in a moment."); }
  }

  return (
    <section style={{ textAlign: "center", margin: "0 0 4px" }}>
      <p style={{ margin: "0 0 6px" }}>
        <span className="wq-chip" style={{ fontSize: 11.5 }}>Word Quest app {__APP_VERSION__}</span>
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="wq-btn-plain" onClick={onCheck} disabled={busy}>Check for updates</button>
        {available && <button className="wq-btn-plain" onClick={onApply} disabled={busy}>Update now</button>}
      </div>
      {status && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.strip }} role="status">{status}</p>}
      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: C.strip }}>
        An update never touches saved progress.
      </p>
    </section>
  );
}
