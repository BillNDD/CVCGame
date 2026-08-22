import { useState, useEffect, useRef } from "react";
import { C } from "@engine";
import { alpha } from "../colour.js";
import Frame from "../components/Frame.jsx";
import Zone from "../components/Zone.jsx";

/* BUILD-IT (SPEC section 12, owner-ruled 2026-08-17). The app speaks a word the
   child already knows; the child assembles it from sound tiles.

   IT SPEAKS FIRST, BY DESIGN, which is what makes it safe: a turn can never be
   a graded reading attempt, so S2 has no answer to rob. That holds only while
   it stays practice, so nothing here writes to any record - no boxes, no log,
   no promotion, and no adult marks anywhere on the screen (D4). The only
   controls are the tiles, the word button and the way out.

   IT SERVES TWO MODES from one screen. A word tray has several slots and its
   prompt is a spoken word; a SOUND tray (the pre-letter ladder's version,
   owner-ruled 2026-08-17) has one slot and its prompt is a single sound. The
   loop, the safety property and the help are identical, so they are one screen
   rather than two that drift apart.

   D5, the miss: tries are unlimited. Each miss sounds out what the child
   ACTUALLY built, then says the word again, so a wrong answer is information
   rather than a buzz. After the second miss the right tiles glow in order
   while each sound plays, and the child copies them: every attempt ends in
   success, which is the whole reason the mode is practice-only. */
const SLOT = 64, TILE = 64;
/* A slot is wider when its sound is written with more than one letter, so the
   SHAPE of the word is visible before a single sound plays. Owner-chosen on
   2026-08-17 from three live layouts. It is a real clue and that is the point:
   a child meeting sh-i-p can see that the first sound is a wide one. The extra
   width is per letter beyond the first, so a trigraph is wider still. */
const slotWidth = (tile) => SLOT + (Math.max(1, (tile || "").length) - 1) * 26;

/* `tray.sounds` is parallel to `tray.tiles`: the sound each tile makes in THIS
   word, decided when the tray was built. The screen never derives a sound from
   a letter - that is what made five words' tiles silent. */
export default function BuildItScreen({ tray, playSounds, playWord, onDone, onExit, soundIdsOf }) {
  const isSound = tray.kind === "sound";
  /* The prompt: a word through the pack's word path, or one sound. Either way
     it is spoken FIRST and never assembled from the tiles. */
  const sayPrompt = () => (isSound ? playSounds([tray.prompt]) : playWord(tray.word));
  /* A slot holds the INDEX of the tray tile in it, never the letter. Holding
     the letter deduped by grapheme, so a word with a repeated sound had one
     tile that could not be placed at all: dad is d-a-d, and its second d was
     unreachable. Eleven bank words were unbuildable - bib dad did mom nun pep
     pop pump pup tent tot - and at Level 2, where there are no distractors,
     the screen simply sat there with a slot that could never fill. Found by
     an independent review, 2026-08-17. */
  const [slots, setSlots] = useState(() => tray.answer.map(() => null));
  const [misses, setMisses] = useState(0);
  const [ghost, setGhost] = useState(null);
  const [msg, setMsg] = useState("");
  const [won, setWon] = useState(false);
  /* True while a full build is being judged: the tray is locked, and the
     screen SAYS so (aria-busy) rather than silently ignoring taps. The
     census's monkey (2026-08-22) met the silent version as three "dead"
     taps on a tile during a long sound-out. */
  const [busy, setBusy] = useState(false);
  const timers = useRef([]);
  /* Written before the state it mirrors, so a second tap in the same frame
     sees the first one. */
  const slotsRef = useRef(tray.answer.map(() => null));
  /* True from the moment the last tile is placed until its sound has ended
     and the build has been judged. */
  const judging = useRef(false);
  /* False after unmount, so a callback that outlives the screen - the sound
     player's completion runs on App's timer, not this screen's - cannot speak
     over the next screen or run endBuild a second time. */
  const alive = useRef(true);

  /* Every timer this screen starts is remembered, so leaving mid-scaffold
     cannot leave a sound firing over the next screen. */
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { alive.current = false; timers.current.forEach(clearTimeout); }, []);

  /* The word first, always, and never the tiles: hearing the word is the
     prompt, and hearing its sounds would be the answer. */
  /* The prompt is spoken once per tray. Keyed on the tray's own identity
     rather than on sayPrompt, which is a new function every render. */
  useEffect(() => { sayPrompt(); }, [tray.word, tray.prompt]);

  /* The tray is kept in a ref as well as in state, and the ref is written
     FIRST. Two taps inside one frame - which a child's hand does - otherwise
     both read the state their own render closed over, both find slot one
     empty, and three taps fill one slot. Caught in the browser.

     The last tile's sound is also the reason the check is not on a timer: the
     owner heard the celebration start over the top of /n/. `check` now runs
     when that sound has finished, which the pack reports. */
  const at = (idx) => (idx === null ? null : tray.tiles[idx]);
  const soundAt = (idx) => tray.sounds[idx];
  const builtFrom = (arr) => arr.map(at);
  const soundsFrom = (arr) => arr.map(soundAt);

  function place(idx) {
    if (won || judging.current) return;
    const prev = slotsRef.current;
    if (prev.includes(idx)) return;
    const i = prev.indexOf(null);
    if (i < 0) return;
    const next = prev.slice();
    next[i] = idx;
    slotsRef.current = next;
    setSlots(next);
    const full = next.every((x) => x !== null);
    /* While the last sound plays the tray is LOCKED. Without it a child could
       lift a tile inside that window and the finished build would still be
       judged - a celebration over an empty slot, or a miss against something
       already dismantled. */
    if (full) { judging.current = true; setBusy(true); }
    playSounds([soundAt(idx)], full ? () => { judging.current = false; setBusy(false); check(builtFrom(next), soundsFrom(next)); } : undefined);
  }

  function lift(i) {
    if (won || judging.current || slotsRef.current[i] === null) return;
    const idx = slotsRef.current[i];
    const next = slotsRef.current.slice();
    next[i] = null;
    slotsRef.current = next;
    setSlots(next);
    setMsg("");
    playSounds([soundAt(idx)]);
  }

  function check(built, builtSounds) {
    if (!alive.current) return;
    if (built.join("") === tray.answer.join("")) {
      /* A win cancels every help still queued. Each miss past the second
         queued a scaffold 900 ms out, and a scaffold landing AFTER the win
         stamped "Watch which tile it is" over "You found it!" and emptied
         the slot the child had just filled right - found by the
         free-play-continues test on 2026-08-21. The win's own onDone timer
         is queued below, after the clear. */
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setWon(true);
      setMsg(isSound ? "🎉 You found it!" : "🎉 You built " + tray.word + "!");
      /* The turn ends when the CELEBRATION ends, never on a fixed timer: the
         old 2,600 ms was shorter than a five-tile word's sound-out plus its
         word, so "biting" was cut off mid-word and the next tray dealt over
         it (the owner, 2026-08-21). Every player path reports when it has
         finished and carries its own backstop, so a silent pack still ends
         the turn. The 900 ms after it is the beat the child gets to enjoy
         having won. */
      const finish = () => { if (alive.current) later(onDone, 900); };
      if (isSound) playSounds([tray.prompt], finish);
      else playSounds(soundIdsOf(tray.word), () => {
        if (!alive.current) return;
        playWord(tray.word, finish);
      });
      return;
    }
    const n = misses + 1;
    setMisses(n);
    setMsg(isSound ? "That is a different sound… listen again." : "That says " + built.join("‑") + "… listen again.");
    /* What the child BUILT, in their own tiles, then the target. A miss the
       child can hear is a miss the child can fix. */
    playSounds(builtSounds, () => {
      if (!alive.current) return;
      /* The tray is HANDED BACK after a miss: the slots clear once the child
         has heard what they built, so "listen again" is something they can
         act on. Beta 22 left the wrong tiles sitting in the slots, and with
         one slot in Find-the-sound there was no visible way to try another
         tile at all (the owner's report, 2026-08-21). The scaffold after the
         second miss still glows the answer into the same cleared slots. */
      slotsRef.current = tray.answer.map(() => null);
      setSlots(slotsRef.current);
      sayPrompt();
      if (n >= 2) later(scaffold, 900);
    });
  }

  /* The help after two misses (D5), in the form the owner chose on 2026-08-17
     from three live options: the letter fades into ITS OWN SLOT while its sound
     plays, so the child sees where each sound goes rather than only which tile
     it is. Then it clears and the child copies it. */
  function scaffold() {
    if (!alive.current || won) return;   // never over a win
    setMsg(isSound ? "Watch which tile it is, then tap it." : "Watch where each sound goes, then copy it.");
    slotsRef.current = tray.answer.map(() => null);
    setSlots(slotsRef.current);
    tray.answer.forEach((tile, i) => {
      later(() => { setGhost(i); playSounds([tray.sounds[tray.tiles.indexOf(tile)]]); }, i * 900);
      later(() => setGhost(null), i * 900 + 700);
    });
  }

  const tileStyle = (tile, used) => ({
    width: TILE, height: TILE, borderRadius: 14, fontSize: 27, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "3px solid " + C.ink2, background: C.paper,
    color: C.ink, opacity: used ? 0.22 : 1, cursor: used ? "default" : "pointer",
  });

  return (
    <Frame>
      <Zone.Header>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>{isSound ? "🔎 Find the sound" : "🧱 Build a word"}</span>
        <span className="wq-chip" style={{ fontSize: 10.5, padding: "5px 8px" }}>practice</span>
        <button className="wq-btn-plain" onClick={onExit} aria-label="Done (leave building)">✖️ Done</button>
      </Zone.Header>

      <Zone.Stage>
        <div style={{ textAlign: "center", width: "100%", maxWidth: 420 }}>
          {/* The word button is a child control (S7) and repeats the prompt as
              often as a child wants: the word is never the secret here. */}
          <button className="wq-cta" onClick={sayPrompt} aria-label={isSound ? "Hear the sound" : "Hear the word"}
            style={{ minHeight: 56, marginBottom: 18 }}>{isSound ? "🔊 Hear the sound" : "🔊 Hear the word"}</button>

          {/* An empty slot and a used tile are DISABLED, not merely inert: a
              tap on either does nothing by design, and a control that does
              nothing is a dead control to a finger and to a screen reader
              alike. The census's monkey reported both as dead on its first
              300-tap walk (2026-08-22); now they say what they are. */}
          <div aria-busy={busy ? "true" : undefined} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {slots.map((tile, i) => (
              <button key={i} onClick={() => lift(i)} disabled={tile === null || won} aria-label={tile !== null ? "Take back " + at(tile) : "Empty space"}
                style={{ width: slotWidth(tray.answer[i]), height: SLOT, borderRadius: 14,
                  fontSize: 27, fontWeight: 800,
                  border: (tile !== null ? "3px solid " + C.ink2 : "3px dashed " + C.boundary),
                  background: tile !== null ? C.paper : alpha(C.paper, .55), color: C.ink,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: tile !== null ? "pointer" : "default" }}>
                {at(tile) || (ghost === i ? <span style={{ opacity: 0.28 }}>{tray.answer[i]}</span> : "")}
              </button>
            ))}
          </div>

          <div style={{ minHeight: 26, marginTop: 14, fontWeight: 700, fontSize: 15,
            color: won ? C.success : C.ink }}>{msg}</div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            {tray.tiles.map((tile, i) => (
              <button key={tile + "-" + i} onClick={() => place(i)} disabled={slots.includes(i) || won} aria-label={"Tile " + tile}
                style={tileStyle(tile, slots.includes(i))}>{tile}</button>
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
