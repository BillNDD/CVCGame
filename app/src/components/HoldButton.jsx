import { useEffect, useRef, useState } from "react";
import { plainLabel } from "../labels.js";

/* Carried-1 — deliberate adult gesture: pointer hold ~450ms; keyboard activates
   directly. A screen reader activates it directly too: see below. */
const HOLD_MS = 450;
const AT_GUARD_MS = 1000;

export default function HoldButton({ onFire, disabled, color, label }) {
  const [holding, setHolding] = useState(false);
  const tRef = useRef(null);
  const firedAt = useRef(0);
  const clear = () => { if (tRef.current) clearTimeout(tRef.current); tRef.current = null; setHolding(false); };
  const fire = () => { firedAt.current = Date.now(); onFire(); };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    setHolding(true);
    tRef.current = setTimeout(() => { clear(); fire(); }, HOLD_MS);
  };
  const key = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
  };
  /* A click with no pointer behind it is assistive technology: VoiceOver's
     double-tap, Narrator, Voice Control's "tap Correct". Without this the
     control could not be operated at all by a grown-up who uses one, and on a
     tablet there is no keyboard to fall back to. It stays a deliberate act —
     the control must be focused first, then activated — so it counts as the
     keyboard does under safety rule S5, not as a pointer.
     A real pointer still has to hold. The child's stray touch that S5 exists
     to refuse arrives as a click with a detail count of 1 or more, from every
     browser this app supports; only a synthesised activation reports 0. The
     one guard is against grading twice: a hold or a keypress that has just
     fired swallows the click that may follow it. */
  const click = (e) => {
    if (disabled || e.detail !== 0) return;
    if (Date.now() - firedAt.current < AT_GUARD_MS) return;
    fire();
  };
  useEffect(() => clear, []);
  return (
    <button className={"wq-sbtn wq-hold" + (holding ? " holding" : "")} disabled={disabled}
      style={{ borderColor: color, color }}
      onPointerDown={down} onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear}
      onKeyDown={key} onClick={click} aria-label={plainLabel(label)}
    >
      <span className="wq-holdfill" style={{ background: color }} aria-hidden="true" />
      <span style={{ position: "relative" }}>{label}</span>
    </button>
  );
}
