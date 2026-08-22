import { Component } from "react";
import { record } from "../errors.js";

/* THE LAST SCREEN BEFORE A BLANK ONE. A render error anywhere below this
   used to leave a child looking at nothing: React unmounts the whole tree
   and the page is white. Owner-ruled 2026-08-22 (bug-hunt page, errors: A):
   "an error boundary that shows the home screen rather than a blank page".
   The crash is written to the error ring like any other - never sent - and
   the child gets one big control that starts the app again from the home
   screen, which is App mounting afresh and reading the saved state. Nothing
   a child did is lost: the save is written after every result (SPEC 7).

   The copy is a calm sentence and a control, no red, no "error" - S3's rule
   for a miss applied to the app's own miss. A grown-up reads the details in
   the corner if they want them. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, n: 0 };
  }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error, info) {
    record({
      kind: "render", screen: this.props.screen ? this.props.screen() : "?", version: this.props.version,
      message: error?.message || String(error),
      where: String(info?.componentStack || "").split("\n").map((l) => l.trim()).filter(Boolean)[0] || "",
    });
  }
  render() {
    if (!this.state.crashed) return <div key={this.state.n}>{this.props.children}</div>;
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: "#fdfcfa", color: "#17356b" }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 18px", lineHeight: 1.4 }}>Let&rsquo;s go back to the start.</p>
          <button className="wq-cta" style={{ minHeight: 64, fontSize: 20, padding: "16px 28px" }} aria-label="Back to the start"
            onClick={() => this.setState((s) => ({ crashed: false, n: s.n + 1 }))}>🏠 Back to the start</button>
        </div>
      </main>
    );
  }
}
