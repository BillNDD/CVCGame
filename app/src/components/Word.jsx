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
    const fit = () => {
      el.style.fontSize = "";
      const room = el.clientWidth, need = el.scrollWidth;
      if (room > 0 && need > room) {
        el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * (room - 1) / need).toFixed(2) + "px";
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit, () => {});
    return () => ro.disconnect();
  }, [text]);
  return <div ref={ref} className="wq-display wq-word" aria-live="off" {...rest}>{children}</div>;
}
