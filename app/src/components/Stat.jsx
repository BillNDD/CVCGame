import { C } from "@engine";

export default function Stat({ n, label, emoji }) {
  return <div className="wq-card" style={{ padding: 10 }}>
    <div style={{ fontSize: 20 }}>{emoji}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{n}</div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink2 }}>{label}</div>
  </div>;
}
