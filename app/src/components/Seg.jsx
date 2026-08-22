import { plainLabel } from "../labels.js";
/* A segmented choice. The `disabled` prop went on 2026-08-12: its only caller
   was the microphone's answer-mode toggle, which had to grey out "Mic" on a
   browser that could not listen. No surviving caller passes it, and a prop
   nothing sets is a branch nothing covers. */
export default function Seg({ options, value, onChange }) {
  return (
    <div className="wq-seggroup" role="group">
      {options.map(([v, label]) => {
        const on = value === v;
        return <button key={String(v)} onClick={() => onChange(v)} aria-pressed={on} aria-label={plainLabel(label)}
          className={"wq-segbtn" + (on ? " on" : "")}>{label}</button>;
      })}
    </div>
  );
}
