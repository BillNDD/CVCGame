import { useLayoutEffect, useRef } from "react";

/* THE PRINCIPAL WORD FITS ITS LINE (art project step 0d, 2026-08-22).
   The stylesheet sizes the word by the screen's HEIGHT - 11svh, clamped - and
   nothing asked whether it fit the WIDTH. On a 390 x 844 phone the 88 px cap
   let thirty-four bank words break into two fragments, "swimmin" over "g";
   on the 320 px profile seven did, all at 100% text size. Found by the
   census's 200% cell while it was being built. A phonics word in two pieces
   is a different word.
   No stylesheet term fits a word exactly, because a word's width is its
   glyphs' and not its letter count's: "butterfly" is 4.4 em wide and
   "something" 5.2. So the word is measured after layout and, only when it is
   wider than its line, shrunk in proportion. It never grows - the
   stylesheet's size is the ceiling, and at 100% most words keep it on every
   profile. The census's 200% cell holds the result to one line box inside
   the viewport, at or above a literal floor, under rem scaling and zoom.
   It re-fits when the text changes, when the element's box changes - the
   container, the orientation, the rem size a phone's text setting moves -
   and when the display face finishes loading, which is what a ResizeObserver
   and document.fonts.ready see between them. Where ResizeObserver does not
   exist (jsdom) the word is the stylesheet's, as before. */
export default function Word({ children, ...rest }) {
  const ref = useRef(null);
  const text = String(children);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const inner = el.firstElementChild;
    /* THE BOX AND THE BASELINE NEVER MOVE; ONLY THE GLYPHS SHRINK. The
       stylesheet's size stays on .wq-word, whose line box is therefore the
       same height for every word; the fitted size goes on the inner span,
       whose smaller text sits on the outer line's baseline. So a word that
       fits shares its box and its baseline with every word that does not
       (P0-2, bible 3.2), G7 and the phase walk measure one box across words,
       and the observer below never sees its own write - a smaller inline
       span cannot change the box it is observing. The first draft set the
       size on the observed element itself, which moved the box between
       words and raised a ResizeObserver loop error on every refit that the
       error ring recorded as a phantom bug (the council's after pass on step
       0, 2026-08-22). */
    /* THE ONE-FRAME HIDE (art step 3, owner-ruled 2026-09-01; the seat's
       shape, 2026-09-02). Between a width change and the next-frame fit the
       word painted once at its old size - on landscape-to-portrait, wider
       than its line and clipped at the glass. The glyphs are hidden for that
       frame and shown again as the FIRST thing fit() does, which covers all
       three callers (the layout effect, the observer's frame, fonts.ready).
       opacity, never display or visibility: the outer box and baseline hold
       (bible 3.2) and the text stays in the accessibility tree. Gated on the
       width actually changing, so the observer's immediate first delivery
       never blanks a word on entry; and cleared in the cleanup, because React
       reuses this span across words and a torn-down effect must not leave the
       next word invisible. */
    let lastRoom = -1;
    const fit = () => {
      inner.style.opacity = "";
      inner.style.fontSize = "";
      /* both as client rects: under CSS zoom a rect is scaled and clientWidth
         is not, and a room in one unit against a need in the other halved the
         word for nothing (the zoom arm, 2026-08-22) */
      const room = el.getBoundingClientRect().width, need = inner.getBoundingClientRect().width;
      /* The guard's memory is clientWidth, rounded: the observer reports
         contentRect in the same unzoomed CSS pixels, while a client rect is
         scaled under CSS zoom - the zoom lesson above, applied to the guard
         (the engineering seat's after pass). */
      lastRoom = Math.round(el.clientWidth);
      if (room > 0 && need > room) {
        inner.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * (room - 1) / need).toFixed(2) + "px";
        /* A second pass (art step 3, 2026-09-02): glyph widths do not scale
           quite linearly with size - hinting and letter-spacing round per
           glyph - and one proportional pass left "something" 2 px wider than
           its box at 390 px. Measured again and scaled once more if it still
           overhangs; the census's rotation cell reads the result to a pixel. */
        const again = inner.getBoundingClientRect().width;
        if (again > room) inner.style.fontSize = (parseFloat(inner.style.fontSize) * (room - 1) / again).toFixed(2) + "px";
      }
    };
    fit();
    /* The observer's callback schedules the fit for the next frame rather
       than running it inside the delivery. The cost, stated: on a rotation
       or a text-size change the word paints one frame (about 16 ms) at its
       previous size before the fit lands - and on landscape-to-portrait,
       where the stylesheet's size rises first, that frame can show the word
       wider than its line, clipped at the viewport's edge - never at word
       entry, where the
       layout effect above fits before the first paint, and never within a
       phase. The reading chair asked whether the fit could run inside the
       delivery instead, now that the write cannot change the observed box;
       it was tried on 2026-08-22 and the rotation cell measured the loop
       error back at 320 x 568 - forcing layout inside a delivery during a
       viewport change is enough to raise it - so the frame stays. */
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? Math.round(entries[0].contentRect.width) : lastRoom;
      if (lastRoom >= 0 && w !== lastRoom) inner.style.opacity = "0";   // the width moved: hide until the fit lands
      cancelAnimationFrame(frame); frame = requestAnimationFrame(fit);
    });
    ro.observe(el);
    /* THE HIDE ALSO RIDES THE RESIZE EVENT. The observer delivers after
       layout, which is after every animation-frame callback of that frame:
       the census's rotation sampler, and anything else reading the word in a
       frame callback, could still meet the old glyphs at the new width with
       opacity 1 (the novelties run of 2026-09-02 did, once, at 320 x 568).
       A resize event is dispatched before the frame callbacks, so the hide
       lands first. Reading clientWidth here forces one layout at the new
       size, outside any observer delivery, which the loop guard allows. */
    const onResize = () => { if (lastRoom >= 0 && Math.round(el.clientWidth) !== lastRoom) inner.style.opacity = "0"; };
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit, () => {});
    return () => { ro.disconnect(); window.removeEventListener("resize", onResize); cancelAnimationFrame(frame); inner.style.opacity = ""; };
  }, [text]);
  return <div ref={ref} className="wq-display wq-word" aria-live="off" {...rest}><span className="wq-word-text">{children}</span></div>;
}
