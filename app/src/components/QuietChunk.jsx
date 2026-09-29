import { displayChunk, quietLetters } from "@engine";

/* One tile's letters with the quiet ones (owner-ruled 2026-09-28) wearing
   .wq-quiet-letter. The tile keeps .wq-tile — chunking, sounds and census
   all see the same tile as before; only the paint splits. */
export default function QuietChunk({ word, g, i }) {
  const text = displayChunk(word, g);
  const q = quietLetters(word)[i] || [];
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
