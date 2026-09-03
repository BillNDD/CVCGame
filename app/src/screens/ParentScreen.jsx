import { useState } from "react";
import { C, LEVELS, PRE_LEVELS, displayWord, isChunkItem, chunkText, workingOnWords } from "@engine";
import { plainLabel } from "../labels.js";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";
import Toast from "../components/Toast.jsx";
import H3 from "../components/H3.jsx";
import HoldButton from "../components/HoldButton.jsx";
import Seg from "../components/Seg.jsx";

function WordList({ state, openDecades, setOpenDecades }) {
  const decades = [];
  for (let d = 0; d < LEVELS.length; d += 10) decades.push(LEVELS.slice(d, d + 10));
  const allOpen = decades.every((g, i) => openDecades[i]);
  const preLetterRow = (p) => p.items.filter((it) => !isChunkItem(it)).join(", ");
  const preChunkRow = (p) => p.items.filter(isChunkItem).map(chunkText).join(", ");
  return (
    <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
      <H3>What each level teaches</H3>
      <p className="wq-help" style={{ margin: "0 0 8px" }}>
        Every level and the words it introduces, so you can see what your reader has met and
        what is coming. Your reader is at {state.preLevel > 0 ? `Pre ${state.preLevel}` : `Level ${state.level}`}.
      </p>
      <button className="wq-rowbtn" style={{ marginBottom: 6 }} aria-expanded={allOpen}
        aria-label={allOpen ? "Close it all" : "See it all"}
        onClick={() => setOpenDecades(Object.fromEntries(decades.map((g, i) => [i, !allOpen])))}>
        <span style={{ fontWeight: 800, color: C.ink2, fontSize: 12.5 }}>{allOpen ? "Close it all ▲" : "See it all ▼"}</span>
      </button>
      <div style={{ borderTop: "1px solid " + C.boundary, paddingTop: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>
          Before Level 1 — the chunk ladder{state.preLevel > 0 ? " ← here" : ""}
        </div>
        {PRE_LEVELS.map((p) => (
          <p key={p.n} className="wq-help" style={{ margin: "4px 0 0" }}>
            Pre {p.n} · {p.name} {p.emoji}: the letter sounds {preLetterRow(p)}, then reading
            the chunks {preChunkRow(p)} — building blocks, not words.
          </p>
        ))}
      </div>
      {decades.map((g, i) => {
        const words = g.reduce((n, l) => n + l.words.length, 0);
        const here = state.preLevel === 0 && state.level >= g[0].n && state.level <= g[g.length - 1].n;
        const isOpen = !!openDecades[i];
        return (
          <div key={i} style={{ borderTop: "1px solid " + C.boundary, paddingTop: 8, marginTop: 8 }}>
            <button className="wq-rowbtn" onClick={() => setOpenDecades(o => ({ ...o, [i]: !isOpen }))}
              aria-expanded={isOpen}
              aria-label={plainLabel(`Levels ${g[0].n} to ${g[g.length - 1].n}${here ? " here" : ""} ${words} new words`)}>
              <span style={{ fontWeight: 800, color: C.ink, fontSize: 13.5 }}>
                Levels {g[0].n} to {g[g.length - 1].n}{here ? " ← here" : ""}
              </span>{" "}
              <span className="wq-mono" style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{words} new words</span>
              <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && g.map((l) => (
              <p key={l.n} className="wq-help" style={{ margin: "5px 0 0" }}>
                <b style={{ color: C.ink }}>{l.n} {l.emoji}{state.preLevel === 0 && state.level === l.n ? " ← here" : ""}</b>{" "}
                {l.words.map(displayWord).join(", ")}
              </p>
            ))}
          </div>
        );
      })}
    </section>
  );
}

/* WORDS WE ARE WORKING ON (fault AU, owner-ruled 2026-08-31). The aging term
   fixed the ox problem by serving stuck words LESS, which is right for the child
   and leaves a grown-up with no way to say "no, do that one now". This is that
   way.

   Derived on every render from state.words, so there is no second place
   recording who is struggling and nothing to drift. The threshold is the
   owner's: read wrong three or more times AND still in the lowest two boxes,
   capped at ten so it stays readable on a phone - measured at 3, 8 and 10 for
   children missing 3, 8 and 20 words.

   The control writes NO result (S1): it queues a word for the next session and
   nothing else. It takes the 450 ms hold even though S5 asks that only of
   RESULT controls, because the corner is one unguarded tap from the child's
   home screen and SPEC applies the same reasoning to the update controls.

   The SELECTOR lives in the engine, not here: it is derived scheduler state and
   belongs beside the lane that serves it, and the copy gate reads a screen's
   JSX region as child-facing text where a filter naming that counter scans as
   the banned word it is named after. */
function WorkingOn({ state, onBringForward }) {
  const working = workingOnWords(state);
  if (!working.length) return null;
  const queued = state.bringForward || [];
  return (
    <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
      <H3>Words we are working on</H3>
      <p className="wq-help" style={{ margin: "0 0 10px" }}>
        These are the ones your child is finding hard, so the game brings them back gently rather
        than every time. Choose one and it will be in the next session.
      </p>
      {working.map(({ word: w, attempts }) => (
        <div key={w} style={{ display: "flex", alignItems: "center", gap: 10,
          borderTop: "1px solid " + C.boundary, paddingTop: 9, marginTop: 9 }}>
          <span style={{ fontWeight: 800, fontSize: 15, minWidth: 90 }}>{displayWord(w)}</span>
          <span className="wq-help" style={{ flex: 1, fontSize: 12.5 }}>
            {"tried " + attempts + (attempts === 1 ? " time" : " times")}
          </span>
          {queued.includes(w)
            ? <span className="wq-help" style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>in the next session</span>
            : <HoldButton onFire={() => onBringForward(w)} disabled={false} color={C.chipAmber}
                label={plainLabel("Bring " + displayWord(w) + " to the next session")} />}
        </div>
      ))}
    </section>
  );
}

export default function ParentScreen({
  state, nameDraft, setNameDraft, commitName, setSound, setUpdateCheck, jumpLevel, jumpPreLevel,
  openLevels, setOpenLevels, copyLog, copyBox, resetStage, setResetStage, doReset,
  onBack, onExportJSON, onImportJSON, toast, voiceFallback, onBringForward,
  errorCount = 0, copyErrors, clearErrors,
}) {
  const [openDecades, setOpenDecades] = useState({});
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={onBack} aria-label="Back">← Back</button>
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

            {/* The "Voice & accent" list stood here until 2026-08-29 and was
                removed on the owner's 2026-08-24 ruling: the game has ONE
                recorded voice, and the list only ever set the system
                FALLBACK's language while looking like it chose the voice a
                child hears - a control claiming something it does not
                deliver. The fallback keeps the stored default, en-US. If a
                second recorded voice is ever built, the choice returns,
                naming voices that exist. SPEC section 6 carries the ruling. */}

            {/* The pre-level ladder sits ABOVE Jump to level (owner-ruled
                2026-08-24): the order a parent reads is the order a child
                travels. Words means the child reads words; P1 and P2 put the
                next session on the chunk ladder. */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.ink, marginBottom: 4 }}>Pre-levels (sounds before words)</div>
              <Seg options={[[0, "Words"], ...PRE_LEVELS.map(p => [p.n, "P" + p.n])]} value={state.preLevel} onChange={jumpPreLevel} />
            </div>
            <p className="wq-help">Words: sessions serve reading. P1 and P2: sessions teach letter sounds and the first reading chunks, graded by you.</p>

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
                saved as usual — but the sound-out will not light up letter by letter, and the listening light stays dark.
              </p>
              <p className="wq-help" style={{ margin: "8px 0 0" }}>
                Reason: {voiceFallback}
              </p>
            </section>
          )}

          {/* ABOVE the mastery map, deliberately. It sat below it until
              2026-09-01, and measured in the rendered page that put it 9,049
              pixels down a stage 11,195 pixels tall - about eleven phone
              screens, behind a hundred level rows. The owner looked for it on
              the first beta that had it and reported it missing, which is the
              only report that matters: a control a grown-up cannot find is a
              control that does not exist. The mastery map is reference; this is
              the one thing on the page they can ACT on, so it goes first. */}
          <WorkingOn state={state} onBringForward={onBringForward} />

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Mastery map</H3>
            {/* A parent read "2/12 mastered" after their child read all twelve
                correctly and reported it as a bug (2026-08-12, fault B14). It
                was not one: a first correct reading reached box 3 and green was
                box 4, so every amber word was one the child GOT RIGHT. B14
                answered it with a key and two numbers, and kept green at two
                readings.
                It came back. The owner hit it himself twice more, and on
                2026-08-31 ruled the display: green now means ONE confident
                "got it". Only the display moved - the scheduler still promotes,
                retires and reviews on the same boxes it always did, which is
                what B14 declined to change and fault AQ's banding is built on.
                The three colours were re-ruled as a SET, because moving green
                alone would have made amber a fresh lie: box 2 is reachable only
                by a word that WAS green and then slipped. */}
            <p className="wq-help" style={{ margin: "0 0 10px" }}>
              One confident “got it” turns a word green — it is a word your child can read, and it
              counts toward moving up a level. The game still brings green words back later to be
              sure, and that gap is deliberate: waiting is what moves a word into long-term memory.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "0 0 12px",
              fontSize: 12, color: C.ink2 }}>
              {[[C.chipGreen, "read right"], [C.chipAmber, "was doing well, slipped"],
                [C.chipRed, "not yet"], [C.chip, "not tried"]].map(([bg, label]) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ background: bg, width: 15, height: 15, borderRadius: 4,
                    border: "1px solid " + C.boundary, display: "inline-block" }} />{label}
                </span>
              ))}
            </div>
            {LEVELS.map(l => {
              /* GREEN IS BOX 3, the display's own threshold since 2026-08-31. The
                 markdown export and the home screen's star still count box 4 and
                 deliberately were not moved with it: three tests and a G5 mutant
                 anchor pin that number, and the ruling was about this screen. */
              const done = l.words.filter(w => state.words[w] && state.words[w].box >= 3).length;
              const seen = l.words.filter(w => state.words[w] && state.words[w].attempts > 0).length;
              const isOpen = !!openLevels[l.n];
              return (
                <div key={l.n} style={{ borderTop: "1px solid " + C.boundary, paddingTop: 9, marginTop: 9 }}>
                  <button className="wq-rowbtn" onClick={() => setOpenLevels(o => ({ ...o, [l.n]: !isOpen }))} aria-expanded={isOpen}
                    aria-label={plainLabel(`Level ${l.n} ${l.emoji} ${seen} of ${l.words.length} read, ${done} green`)}>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Level {l.n} {l.emoji}</span>
                    {/* Two numbers, not one. "2/12 mastered" alone told a
                        parent their child had failed ten words they had in
                        fact read correctly. What the child DID comes first. */}
                    <span className="wq-mono" style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto" }}>{seen} of {l.words.length} read, {done} green</span>
                    <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  <div className="wq-meter"><div style={{ width: (done / l.words.length) * 100 + "%", background: C.green, height: "100%" }} />
                    <div style={{ width: ((seen - done) / l.words.length) * 100 + "%", background: C.sun, height: "100%" }} /></div>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {l.words.map(w => {
                        const ws = state.words[w];
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 3 ? C.chipGreen : ws.box === 2 ? C.chipAmber : C.chipRed;
                        return <span key={w} style={{ background: bg, color: C.ink, borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 700 }}>{displayWord(w)}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>


          {/* THE WORD LIST A PARENT CAN CONSULT (owner-ruled 2026-08-24:
              "a list of every pre level and real level, and what words they
              introduce"). DERIVED from the engine's own levels at render -
              a typed copy would drift the first time a word moved. Collapsed
              by decade because a hundred levels is a long scroll on a phone
              and the ladder already thinks in tens; "See it all" is the
              escape hatch, ruled the same day. The pre-level rungs come
              first as their own short group - they teach letters and chunks,
              not words, so the decade shape would misdescribe them. Adult-
              facing; reads nothing aloud; no S2 concern. */}
          <WordList state={state} openDecades={openDecades} setOpenDecades={setOpenDecades} />

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Session log</H3>
            {state.log.length === 0
              ? <p className="wq-help">No sessions yet.</p>
              : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, color: C.ink, borderCollapse: "collapse" }}>
                    <thead><tr style={{ textAlign: "left" }}>
                      <th>#</th><th>Date</th><th>Lvl</th><th>✅</th><th>🟡</th><th>🔁</th><th>Acc</th></tr></thead>
                    <tbody>{state.log.slice().reverse().map(s => (
                      <tr key={s.n} style={{ borderTop: "1px solid " + C.boundary }}>
                        <td>{s.n}{s.partial ? "*" : ""}</td><td>{s.date}</td><td>{s.level}</td>
                        <td>{s.c}</td><td>{s.k}</td><td>{s.w}</td><td style={{ fontWeight: 700 }}>{s.acc}%</td>
                      </tr>))}</tbody>
                  </table>
                  {state.log.some(s => s.partial) && <p className="wq-help">* ended early</p>}
                </div>}
            <button className="wq-cta" style={{ marginTop: 12, background: C.ink, fontSize: 14, padding: "11px 14px" }} onClick={copyLog} aria-label="Copy log (Markdown)">📋 Copy log (Markdown)</button>
            {/* P2-15 */}
            {copyBox && <>
              <p className="wq-lbl" style={{ marginTop: 10 }}>Clipboard blocked — select all and copy</p>
              <textarea readOnly value={copyBox} onFocus={e => e.target.select()} rows={6} className="wq-input wq-mono" style={{ fontSize: 11.5 }} />
            </>}
          </section>

          {/* THE ERROR REPORT, owner-ruled 2026-08-22: recorded on the device,
              never sent, and a separate copy from the session log so that a
              grown-up CHOOSES whether it goes anywhere. The count is the only
              thing shown until they press Copy. */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Bug report</H3>
            <p className="wq-help" style={{ marginTop: 4 }}>
              {errorCount === 0 ? "No problems recorded on this device." : `${errorCount} problem${errorCount === 1 ? "" : "s"} recorded on this device.`}
              {" "}Nothing is sent anywhere by itself. If the game misbehaves, copy the report and choose
              whether to send it to the game&rsquo;s maker. It carries no name and no web address.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="wq-sbtn" onClick={copyErrors} disabled={errorCount === 0} aria-label="Copy bug report">📋 Copy bug report</button>
              {errorCount > 0 && <button className="wq-sbtn" onClick={clearErrors}>Clear</button>}
            </div>
          </section>

          {/* W3 — full-state backup: JSON export and import */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Backup</H3>
            <p className="wq-help" style={{ margin: "0 0 10px" }}>Save all progress to a file, or load a saved file. The file stays on this device.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="wq-sbtn" onClick={onExportJSON} aria-label="Save backup file">⬇️ Save backup file</button>
              {/* A BUTTON that opens the picker, not a label round a hidden
                  input: a label is not focusable and a display:none input is
                  not reachable, so the keyboard had no way to load a file
                  and the names walker (which reads buttons) never saw the
                  pictograph in its name - the council's after pass on step
                  0, 2026-08-22. */}
              <button className="wq-sbtn" aria-label="Load backup file" onClick={() => { const i = document.getElementById("wq-import-file"); if (i) i.click(); }}>⬆️ Load backup file</button>
              <input id="wq-import-file" type="file" accept="application/json,.json" style={{ display: "none" }} tabIndex={-1} aria-hidden="true"
                onChange={e => { const f = e.target.files && e.target.files[0]; if (f) onImportJSON(f); e.target.value = ""; }} />
            </div>
            <p className="wq-help">A loaded file replaces the progress on this device.</p>
          </section>

          {/* P2-3 — confirm is a different, offset control; cancel is larger */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Danger zone</H3>
            {resetStage === 0
              ? <button className="wq-sbtn" style={{ borderColor: C.muted, color: C.muted }} onClick={() => setResetStage(1)} aria-label="Reset all progress">🗑️ Reset all progress</button>
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
