import { useEffect, useRef, useState } from "react";

/* Carried-1 — deliberate adult gesture: pointer hold ~450ms; keyboard activates directly */
export default function HoldButton({ onFire, disabled, color, label }) {
  const [holding, setHolding] = useState(false);
  const tRef = useRef(null);
  const clear = () => { if (tRef.current) clearTimeout(tRef.current); tRef.current = null; setHolding(false); };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    setHolding(true);
    tRef.current = setTimeout(() => { clear(); onFire(); }, 450);
  };
  const key = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFire(); }
  };
  useEffect(() => clear, []);
  return (
    <button className={"wq-sbtn wq-hold" + (holding ? " holding" : "")} disabled={disabled}
      style={{ borderColor: color, color }}
      onPointerDown={down} onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear}
      onKeyDown={key} aria-label={label + " (hold)"}
    >
      <span className="wq-holdfill" style={{ background: color }} aria-hidden="true" />
      <span style={{ position: "relative" }}>{label}</span>
    </button>
  );
}
