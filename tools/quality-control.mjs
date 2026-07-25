/* Negative controls for the quality gate (G6, rule E5). Each detector must
   fail on the fault it targets:
   1. ESLint with the complexity rule must reject the over-complex fixture.
   2. The cycle detector must find a planted cycle (its own --self-test). */
import { execFileSync } from "node:child_process";

const run = (cmd, args) => {
  try { execFileSync(cmd, args, { stdio: "pipe" }); return true; } catch { return false; }
};

const complexityCaught = !run("npx", [
  "eslint", "--no-config-lookup", "--rule", '{"complexity":["error",15]}',
  "tools/fixtures/complexity-over.js",
]);
if (!complexityCaught) {
  console.error("control FAILED: ESLint accepted the complexity-17 fixture");
  process.exit(1);
}

const cycleCaught = run("node", ["tools/dep-cycles.mjs", "--self-test"]);
if (!cycleCaught) {
  console.error("control FAILED: the cycle detector missed its planted cycle");
  process.exit(1);
}

console.log("quality controls OK: complexity fixture rejected, planted cycle found");
