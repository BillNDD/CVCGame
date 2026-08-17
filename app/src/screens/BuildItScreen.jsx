import { useState, useEffect, useRef } from "react";
import { C } from "@engine";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";

/* BUILD-IT (SPEC section 12, owner-ruled 2026-08-17). The app speaks a word the
   child already knows; the child assembles it from sound tiles.

   IT SPEAKS FIRST, BY DESIGN, which is what makes it safe: a turn can never be
   a graded reading attempt, so S2 has no answer to rob. That holds only while
   it stays practice, so nothing here writes to any record - no boxes, no log,
   no promotion, and no adult marks anywhere on the screen (D4). The only
   controls are the tiles, the word button and the way out.

   D5, the miss: tries are unlimited. Each miss sounds out what the child
   ACTUALLY built, then says the word again, so a wrong answer is information
   rather than a buzz. After the second miss the right tiles glow in order
   while each sound plays, and the child copies them: every attempt ends in
   success, which is the whole reason the mode is practice-only. */
const SLOT = 64, TILE = 64;

export default function BuildItScreen({ tray, level, playSounds, playWord, onDone, onExit,
  soundIdOf, soundIdsOf }) {
  const [slots, setSlots] = useState(() => tray.answer.map(() => null));
  const [misses, setMisses] = useState(0);
  const [glow, setGlow] = useState(null);
  const [msg, setMsg] = useState("");
  const [won, setWon] = useState(false);
  const timers = useRef([]);

  /* Every timer this screen starts is remembered, so leaving mid-scaffold
     cannot leave a sound firing over the next screen. */
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* The word first, always, and never the tiles: hearing the word is the
     prompt, and hearing its sounds would be the answer. */
  useEffect(() => { playWord(tray.word); }, [tray.word, playWord]);

  const filled = slots.every(Boolean);

  /* Both handlers update from the PREVIOUS state rather than from the state
     this render closed over. Two taps inside one frame - which a child's hand
     does, and which a fast script does every time - otherwise both read the
     same empty tray and both land in slot one, so three taps fill one slot.
     Caught in the browser before this shipped. */
  function place(tile) {
    if (won) return;
    playSounds([soundIdOf(tile)]);
    setSlots((prev) => {
      if (prev.includes(tile)) return prev;
      const i = prev.indexOf(null);
      if (i < 0) return prev;
      const next = prev.slice();
      next[i] = tile;
      if (next.every(Boolean)) later(() => check(next), 520);
      return next;
    });
  }

  function lift(i) {
    if (won) return;
    setSlots((prev) => {
      if (!prev[i]) return prev;
      playSounds([soundIdOf(prev[i])]);
      const next = prev.slice();
      next[i] = null;
      return next;
    });
    setMsg("");
  }

  function check(built) {
    if (built.join("") === tray.answer.join("")) {
      setWon(true);
      setMsg("🎉 You built " + tray.word + "!");
      playSounds(soundIdsOf(tray.word), () => playWord(tray.word));
      later(onDone, 2600);
      return;
    }
    const n = misses + 1;
    setMisses(n);
    setMsg("That says " + built.join("‑") + "… listen again.");
    /* What the child BUILT, in their own tiles, then the target. A miss the
       child can hear is a miss the child can fix. */
    playSounds(built.map(soundIdOf), () => {
      playWord(tray.word);
      if (n >= 2) later(scaffold, 900);
    });
  }

  function scaffold() {
    setMsg("Watch the tiles glow, then copy them.");
    setSlots(tray.answer.map(() => null));
    tray.answer.forEach((tile, i) => {
      later(() => { setGlow(tile); playSounds([soundIdOf(tile)]); }, i * 900);
      later(() => setGlow(null), i * 900 + 700);
    });
  }

  const tileStyle = (tile, used) => ({
    width: TILE, height: TILE, borderRadius: 14, fontSize: 27, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "3px solid " + (glow === tile ? "#d97706" : C.ink2),
    background: glow === tile ? "#fef3c7" : "#fff",
    color: C.ink, opacity: used ? 0.22 : 1, cursor: used ? "default" : "pointer",
  });

  return (
    <Frame>
      <Zone.Header>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>🧱 Build a word</span>
        <span className="wq-chip" style={{ fontSize: 10.5, padding: "5px 8px" }}>practice</span>
        <button className="wq-btn-plain" onClick={onExit} aria-label="Leave building">✖️ Done</button>
      </Zone.Header>

      <Zone.Stage>
        <div style={{ textAlign: "center", width: "100%", maxWidth: 420 }}>
          {/* The word button is a child control (S7) and repeats the prompt as
              often as a child wants: the word is never the secret here. */}
          <button className="wq-cta" onClick={() => playWord(tray.word)}
            style={{ minHeight: 56, marginBottom: 18 }}>🔊 Hear the word</button>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {slots.map((tile, i) => (
              <button key={i} onClick={() => lift(i)} aria-label={tile ? "Take back " + tile : "Empty space"}
                style={{ width: SLOT, height: SLOT, borderRadius: 14, fontSize: 27, fontWeight: 800,
                  border: (tile ? "3px solid " + C.ink2 : "3px dashed #94a8c0"),
                  background: tile ? "#fff" : "rgba(255,255,255,.55)", color: C.ink,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: tile ? "pointer" : "default" }}>{tile || ""}</button>
            ))}
          </div>

          <div style={{ minHeight: 26, marginTop: 14, fontWeight: 700, fontSize: 15,
            color: won ? "#15803d" : C.ink }}>{msg}</div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            {tray.tiles.map((tile, i) => (
              <button key={tile + i} onClick={() => place(tile)} aria-label={"Tile " + tile}
                style={tileStyle(tile, slots.includes(tile))}>{tile}</button>
            ))}
          </div>
        </div>
      </Zone.Stage>

      <Zone.Strip>
        <span className="wq-striplabel">grown-up</span>
        <span style={{ fontSize: 12, color: C.strip }}>practice only · nothing is saved here</span>
      </Zone.Strip>
    </Frame>
  );
}
