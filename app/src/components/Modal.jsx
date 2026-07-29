import { useEffect, useRef } from "react";
import { C } from "@engine";

/* N-10 — the dialog holds keyboard focus, closes with Escape, and returns
   focus to the opener on close. */
export default function Modal({ title, children, onClose }) {
  const boxRef = useRef(null);
  const returnRef = useRef(null);
  useEffect(() => {
    returnRef.current = document.activeElement;
    const box = boxRef.current;
    /* Inert controls are skipped. A dialog may reserve a control it cannot
       offer yet — the exit dialog reserves its Save slot so nothing moves
       under a finger — and focusing a disabled button silently leaves focus
       on the page body, which drops the dialog's keyboard trap. */
    const focusables = () => box.querySelectorAll(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const r = returnRef.current;
      if (r && r.focus) r.focus();
    };
  }, [onClose]);
  return (
    <div className="wq-modalwrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="wq-modal" ref={boxRef}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</h3>
        {children}
      </div>
      <button className="wq-scrim" onClick={onClose} aria-label="Close" tabIndex={-1} />
    </div>
  );
}
