import { displayChunk, quietLetters, quietInTile } from "@engine";

/* One tile's letters with the quiet ones (owner-ruled 2026-09-28) wearing
   .wq-quiet-letter. The tile keeps .wq-tile — chunking, sounds and census
   all see the same tile as before; only the paint splits. Without a word
   (Build-it trays and slots) the word-free half decides by tile text. */
export default function QuietChunk({ word = null, g, i = 0 }) {
  const text = displayChunk(word || "", g);
  const q = word ? quietLetters(word)[i] || [] : quietInTile(g);
  if (!q.length) return text;
  return text.split("").map((ch, k) =>
    q.includes(k) ? (
      <span key={k} className="wq-quiet-letter">
        {ch}
      </span>
    ) : (
      <span key={k}>{ch}</span>
    ),
  );
}
