export default function Seg({ options, value, onChange, disabled = [] }) {
  return (
    <div className="wq-seggroup" role="group">
      {options.map(([v, label]) => {
        const on = value === v, off = disabled.includes(v);
        return <button key={String(v)} onClick={() => !off && onChange(v)} disabled={off} aria-pressed={on}
          className={"wq-segbtn" + (on ? " on" : "")}>{label}</button>;
      })}
    </div>
  );
}
