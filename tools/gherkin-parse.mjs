/* Gherkin parser (gate G3). Reads features/*.feature and writes the JSON IR to
   tests/generated/acceptance-ir.json. Deterministic: sorted input files, stable
   key order, LF endings, no timestamps, no absolute paths.
   Supported subset: Feature, Scenario, Scenario Outline, Examples, and the
   step keywords Given/When/Then/And/But. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FEATURES_DIR = "features";
const OUT = "tests/generated/acceptance-ir.json";

const files = readdirSync(FEATURES_DIR).filter((f) => f.endsWith(".feature")).sort();
if (files.length === 0) { console.error("No feature files in " + FEATURES_DIR); process.exit(1); }

const features = [];
for (const file of files) {
  const lines = readFileSync(join(FEATURES_DIR, file), "utf8").split(/\r?\n/);
  let feature = null, scenario = null, mode = "steps", headers = null, lastKind = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m;
    if ((m = line.match(/^Feature:\s*(.+)$/))) {
      feature = { file: FEATURES_DIR + "/" + file, name: m[1], scenarios: [] };
      features.push(feature);
      scenario = null;
    } else if ((m = line.match(/^Scenario( Outline)?:\s*(.+)$/))) {
      if (!feature) { console.error(file + ": scenario before feature"); process.exit(1); }
      scenario = { name: m[2], outline: !!m[1], steps: [], examples: [] };
      feature.scenarios.push(scenario);
      mode = "steps"; headers = null; lastKind = null;
    } else if (/^Examples:/.test(line)) {
      mode = "examples"; headers = null;
    } else if (mode === "examples" && line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (!headers) headers = cells;
      else scenario.examples.push(Object.fromEntries(headers.map((h, i) => [h, cells[i]])));
    } else if ((m = line.match(/^(Given|When|Then|And|But)\s+(.+)$/))) {
      if (!scenario) continue; // feature description text
      const kind = m[1] === "And" || m[1] === "But" ? lastKind || "Given" : m[1];
      lastKind = kind;
      scenario.steps.push({ kind, text: m[2] });
    }
    // any other line inside a feature is description text; ignore
  }
}

const count = features.reduce((n, f) => n + f.scenarios.length, 0);
mkdirSync("tests/generated", { recursive: true });
writeFileSync(OUT, JSON.stringify({ features }, null, 2) + "\n");
console.log(`Wrote ${OUT} (${features.length} features, ${count} scenarios)`);
