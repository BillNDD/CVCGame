import { C } from "@engine";

export default function H3({ children }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em",
    textTransform: "uppercase", color: C.muted }}>{children}</h3>;
}
