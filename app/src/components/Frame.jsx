import CSS from "../wq-css.js";

export default function Frame({ children }) {
  return (
    <div className="wq-root">
      <style>{CSS}</style>
      <div className="wq-shell">{children}</div>
    </div>
  );
}
