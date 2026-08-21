import { C, chunkWord, displayChunk, sentenceWords, TRICKY } from "@engine";

/* THE SENTENCE REVEAL (SPEC section 12 point 6, approved 2026-08-13 from a
   working prototype). The owner was shown four designs on 2026-08-11, chose
   none, and described a fifth:

     1. The sentence is read whole.
     2. An invitation line plays and the word the LEVEL TEACHES takes the tile
        ring: its pieces appear, and the voice says the sounds, then the word.
     3. After that it is the child's. Tapping any other word shows that word's
        pieces SILENTLY — no sound is ever spoken for a tapped word.
     4. Exactly one word is ever open. Opening another closes the last.
     5. The sentence reads again to close, and a tap interrupts that read.
     6. The grown-up pressing for the next word ends the item. Nothing has to
        finish first.

   WHY THE SILENCE IN POINT 3 IS THE RULE AND NOT AN OVERSIGHT. Design rule 2:
   a word may be SHOWN split, because that is a scaffold, but it may not be
   SPOKEN, because that is the answer. Tap-to-hear is ruled for the passages
   stage alone, where the words are untaught on purpose. A tapped word here
   would hand a child the answer to a word they are learning to decode.

   The ring is the existing `.wq-tile.wq-pop` outline, never a new shape, so a
   child meets the same reveal they know from every word. */
export default function SentenceStage({ sentence, openWord, pops = [], onTapWord, attempt = false }) {
  const ws = sentenceWords(sentence.text);
  /* The words as the WRITER wrote them — capitals and punctuation kept —
     beside the lower-cased forms the game reasons about. A child reads
     "The cat sat on the mat.", not "the cat sat on the mat". The two lists
     are the same length by construction: `sentenceWords` splits on the same
     whitespace this does. */
  const shown = sentence.text.trim().split(/\s+/);
  /* THE ATTEMPT (owner-ruled 2026-08-14, open-faults N). Before the mark the
     sentence is the child's to READ: plain words, no tap targets, no tiles,
     no hint — the same bare stage a word gets in its ready phase. Tapping
     belongs to the reveal, where SPEC section 12 point 6 places it ("After
     that it is the child's"): a scaffold offered mid-attempt would be the
     app helping before the child has tried. The slots below stay reserved in
     both phases so nothing moves when the mark lands (P0-2). */
  return (
    <div className="wq-sentence">
      {attempt && <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
        textTransform: "uppercase", color: C.ink, textAlign: "center" }}>Read this sentence</p>}
      <p className="wq-sentence-line">
        {shown.map((raw, i) => {
          const w = ws[i];
          const open = !attempt && w !== undefined && w === openWord;
          if (attempt) return <span key={i} className="wq-sword">{raw}</span>;
          return (
            <button
              key={i}
              type="button"
              className={"wq-sword" + (open ? " wq-sword-open" : "")}
              /* Every word is tappable, including the one the app opened
                 first: a child who taps it should not find the one word on
                 the screen that does nothing. Tapping the open word closes
                 it, which is point 4 read the only way that is consistent —
                 exactly one word open, and none is a legal number. */
              onClick={() => onTapWord(open ? null : w)}
              aria-pressed={open}
            >{raw}</button>
          );
        })}
      </p>
      {/* The tile row for the open word. It sits in a reserved slot so the
          sentence above it never moves when a word opens or closes — the same
          promise the word stage makes (P0-2). */}
      <div className={"wq-slot-tiles wq-sentence-tiles" + (openWord && chunkWord(openWord).length >= 8 ? " wq-crowd" : openWord && chunkWord(openWord).length >= 6 ? " wq-many" : "")} aria-hidden={attempt || !openWord}>
        {!attempt && openWord && chunkWord(openWord).map((g, i) => (
          /* A ring only where its LENGTH is known (B5), and only for the word
             the app sounded out. A tapped word is silent, so it has no sounds
             playing and therefore nothing to ring against: it shows its pieces
             and no rings, which is the honest picture of "here is how this
             word is built" without claiming to say it. */
          <span key={i + ":" + (pops[i]?.n || 0)}
            className={"wq-display wq-tile" + (pops[i]?.ms > 0 ? " wq-pop" : "")}
            style={pops[i]?.ms > 0 ? { "--wqpop": pops[i].ms + "ms" } : undefined}>{displayChunk(openWord, g)}</span>
        ))}
      </div>
      {/* The bent-sound note, for whichever word is OPEN (open-faults J1,
          "sentences too" owner-ruled 2026-08-15). The word reveal has carried
          this note since the first nine tricky words; a bent word sounded out
          or tapped open inside a sentence now says the same thing in the same
          amber words. A reserved slot, like every slot on this stage (P0-2):
          one line high whether or not a note exists, so the sentence never
          moves when a word opens, closes, or changes. Never in the attempt —
          the child is reading, and the note is part of the reveal's teaching,
          not a hint before the try. */}
      <p className="wq-slot-msg" style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 800, color: C.amberInk, textAlign: "center", minHeight: "1.4em" }}>
        {!attempt && openWord && TRICKY[openWord] ? "⭐ " + TRICKY[openWord] : " "}</p>
      <p className="wq-sentence-hint" style={{ color: C.ink2 }}>
        {attempt ? " " : "Tap a word to see its sounds."}</p>
    </div>
  );
}
