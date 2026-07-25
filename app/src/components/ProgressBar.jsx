/* P1-6 — segmented progress: colour AND fill pattern */
export default function ProgressBar({ order, firstResults, total }) {
  return (
    <div className="wq-prog" role="img" aria-label={order.length + " of " + total + " words read"}>
      {Array.from({ length: total }).map((_, i) => {
        const w = order[i], r = w ? firstResults[w] : null;
        const cls = r === "correct" ? "ok" : r === "close" ? "mid" : r === "wrong" ? "bad" : "todo";
        return <span key={i} className={"wq-seg wq-seg-" + cls} />;
      })}
    </div>
  );
}
