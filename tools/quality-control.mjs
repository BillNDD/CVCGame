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

console.log("quality controls OK: complexity fixture rejected, planted cycle found, config matches the baseline ceilings");
