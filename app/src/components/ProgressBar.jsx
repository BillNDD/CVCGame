/* The session path (P1-6, remade 2026-08-12 on the owner's ruling): one dot per
   word of the session, at a size a child can count, with a label saying what
   they are. It replaced a 6 px segmented bar — accurate, and made for an adult
   who can read "7/20".

   Three states, and three is the minimum: a word read right, a word tried and
   missed, and a word not yet reached. A missed word comes BACK later in the
   session, so its dot cannot simply stay grey or the path would under-report
   what the child has already done. The colours are the mastery map's, so a
   grown-up learns one vocabulary and not two.

   The dots WRAP, EVENLY. Twenty at child size need more width than a phone
   has, so the path becomes two rows of ten there and stays one row of twenty
   from 480 px up; the label holds the start of the first line. Even rows are
   the point — left to a wrapping flex row, a 430 px phone broke them 19 and 1,
   which reads as a mistake — so the stylesheet uses a grid of fixed columns.
   The G7 gate measures the result at ten real device widths. */
export default function ProgressBar({ order, firstResults, total, at }) {
  return (
    <div className="wq-track">
      <span className="wq-tracklbl">read so far</span>
      <div className="wq-prog" role="img"
        aria-label={order.length + " of " + total + " words read"}>
        {Array.from({ length: total }).map((_, i) => {
          const w = order[i], r = w ? firstResults[w] : null;
          const cls = r === "correct" ? "ok" : r === "close" ? "mid" : r === "wrong" ? "bad"
            : i === at ? "now" : "todo";
          return <span key={i} className={"wq-seg wq-seg-" + cls} />;
        })}
      </div>
    </div>
  );
}
