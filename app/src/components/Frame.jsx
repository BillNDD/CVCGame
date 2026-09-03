import { useEffect, useRef } from "react";
import CSS from "../wq-css.js";

/* A1-005 — a toast has to clear the child's own control, and the height it must
   clear is not a constant. The session screen carries a rail and a strip, the
   "Grown-ups corner" carries neither, the strip wraps its marker line onto a
   second row, and the safe-area inset moves with the device. The old rule
   guessed 112 px and lost: on an iPhone the toast covered the record control by
   27 px and hid its label, and on iPad portrait by 3 px.
   The shell measures what is actually below the stage and publishes it, so the
   toast is placed against the real controls on every screen. A resize or a
   rotation re-measures, and so does every render, which is what carries a phase
   or a screen change. Found by an audit of the running build, 2026-07-29. */
export default function Frame({ children }) {
  const shell = useRef(null);
  useEffect(() => {
    const el = shell.current;
    const measure = () => {
      let h = 0;
      el.querySelectorAll(".wq-rail, .wq-strip").forEach((zone) => {
        h += zone.getBoundingClientRect().height;
      });
      el.style.setProperty("--wq-bottomzones", h + "px");
      /* the garden frame is the shell's sibling, so it reads the same
         measure from the root (art step 3): its drawing stops above the
         rail and the strip */
      el.parentElement?.style.setProperty("--wq-bottomzones", h + "px");
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    /* A ZONE CAN GROW WITHOUT A RENDER, A RESIZE OR A ROTATION, and until
       2026-09-02 nothing re-measured when it did. The strip's marker line
       wraps onto a second row when the web font lands, and the font lands
       after the last render of the boot: the height the toast was placed
       against was then one line short of the truth. The release gauntlet
       caught it on WebKit under load - the toast covered a child control by
       41 px at 390 x 664 and by 25 px at 1280 x 800, on bytes that passed the
       same gate twice unloaded, which is exactly the shape of a race that
       only a slow font load opens. The zones are observed, so the measure
       follows the real height whatever moved it; the observer cannot loop,
       because the value it publishes moves the toast and the frame and
       nothing inside a zone. */
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    /* BORDER-BOX, because that is the box the measure reads. An observer's
       default is the CONTENT box, and a zone that grows by padding then
       changes height without ever notifying: the gate's own control grew the
       strip by padding and stayed red with this fix in place until the two
       boxes were made the same one. */
    if (ro) el.querySelectorAll(".wq-rail, .wq-strip").forEach((zone) => ro.observe(zone, { box: "border-box" }));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure, () => {});
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (ro) ro.disconnect();
    };
  });
  /* The garden frame (art step 3): fixed, out of flow, geometry only, and
     never a target - aria-hidden, no focusable node, pointer-events none on
     every element. Its zones are empty boxes step 6 paints state 0 onto. */
  return (
    <div className="wq-root">
      <style>{CSS}</style>
      <div className="wq-frame" aria-hidden="true">
        <div className="wq-frame-box">
          <div className="wq-frame-side left" /><div className="wq-frame-side right" />
          <div className="wq-frame-band top" /><div className="wq-frame-band bottom" />
          <div className="wq-frame-corner tl" /><div className="wq-frame-corner tr" />
        </div>
      </div>
      <div className="wq-shell" ref={shell}>{children}</div>
    </div>
  );
}
