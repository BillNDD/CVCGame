/* Negative controls for the quality gate (G6, rule E5). Each detector must
   fail on the fault it targets:
   1. ESLint with the complexity rule must reject the over-complex fixture.
   2. The cycle detector must find a planted cycle (its own --self-test).
   3. The live ESLint config must carry exactly the baseline ceilings, so a
      loosened config cannot pass while the baseline still claims 15/600. */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

const baseline = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const cfg = JSON.parse(execSync("npx eslint --print-config src/engine.js", { encoding: "utf8" }));
const complexity = cfg.rules?.complexity?.[1];
const maxLinesOpt = cfg.rules?.["max-lines"]?.[1];
const maxLines = typeof maxLinesOpt === "object" ? maxLinesOpt.max : maxLinesOpt;
if (complexity !== baseline.g6_complexity_max || maxLines !== baseline.g6_file_lines_max) {
  console.error(`control FAILED: the live ESLint config (complexity ${complexity}, max-lines ${maxLines}) ` +
    `does not match the baseline ceilings (${baseline.g6_complexity_max}, ${baseline.g6_file_lines_max})`);
  process.exit(1);
}

/* A `font:` shorthand ending in `inherit` is invalid CSS: `inherit` is not a
   font-family, so the browser throws the whole declaration away and the rule
   silently does nothing. Ten of them lived in the stylesheet, and every button
   label in the product rendered at the browser default because of it. Nothing
   in the build could see it — the file parsed, the app looked finished, and
   only reading computed styles in a browser revealed it. */
const DEAD_FONT = /font\s*:[^;{}]*\binherit\b/;
/* Comments explain the fault and would otherwise trip the detector, so they
   come out before the scan. */
const css = readFileSync("app/src/wq-css.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
if (DEAD_FONT.test(css)) {
  console.error("control FAILED: a `font:` shorthand ending in `inherit` is back in wq-css.js; " +
    "it is invalid CSS and the browser will discard the whole declaration");
  process.exit(1);
}
if (!DEAD_FONT.test(".wq-cta{font:800 12px/1 inherit;padding:0}")) {   // control
  console.error("control FAILED: the dead-font detector does not catch its own fixture");
  process.exit(1);
}

console.log("quality controls OK: complexity fixture rejected, planted cycle found, config matches the baseline ceilings, no dead font shorthand");
