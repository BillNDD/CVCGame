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
    const fit = () => {
      inner.style.fontSize = "";
      /* both as client rects: under CSS zoom a rect is scaled and clientWidth
         is not, and a room in one unit against a need in the other halved the
         word for nothing (the zoom arm, 2026-08-22) */
      const room = el.getBoundingClientRect().width, need = inner.getBoundingClientRect().width;
      if (room > 0 && need > room) {
        inner.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * (room - 1) / need).toFixed(2) + "px";
      }
    };
    fit();
    /* The observer's callback schedules the fit for the next frame rather
       than running it inside the delivery, so no write of any kind happens
       while the browser is still reporting sizes. */
    let frame = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); });
    ro.observe(el);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit, () => {});
    return () => { ro.disconnect(); cancelAnimationFrame(frame); };
  }, [text]);
  return <div ref={ref} className="wq-display wq-word" aria-live="off" {...rest}><span className="wq-word-text">{children}</span></div>;
}
