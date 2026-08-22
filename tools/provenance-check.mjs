/* THE PROVENANCE READER (art project, bible section 17's ruling; built at art
 * step 1, 2026-08-22, the step that landed the first family entry).
 *
 * tools/art/provenance.json is DATA, and data nobody reads is the drift G23
 * refuses. This reader holds every family entry to the shape the ruling asks:
 *   - a kind (css | raster | svg), the step that opened it, a source list;
 *   - an integer byte share equal to the shares table's, spent <= share, and
 *     the shares summing to at most the 16.2 ceiling in the baseline;
 *   - ramps and states that name only tokens C has;
 *   - ratios with a value and the test that pins them;
 *   - checkpoints as {stage, chair, date, verdict} and an originality verdict
 *     {test, verdict, chair, date} once the family is closed (closed: the
 *     "closed" date is set); an open family may leave them empty.
 * Controls (--self-test): a planted family with a token C lacks, a share that
 * breaks the sum, a negative spent, a closed family with no originality, and
 * the real ledger accepted.
 * Run: node tools/provenance-check.mjs            node tools/provenance-check.mjs --self-test
 */
import { readFileSync } from "node:fs";
import { C } from "../src/engine.js";

const LEDGER = "tools/art/provenance.json";
const BASELINE = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const KINDS = new Set(["css", "raster", "svg"]);

export function judge(ledger, tokens = C, ceiling = BASELINE.art_bytes_max) {
  const problems = [];
  const shares = ledger.shares || {};
  const sum = Object.values(shares).reduce((n, v) => n + (Number.isInteger(v) ? v : NaN), 0);
  if (!Number.isInteger(sum) || sum > ceiling) problems.push(`the byte shares sum to ${sum}, over the ${ceiling} ceiling or not integers`);
  for (const [name, f] of Object.entries(ledger.families || {})) {
    const at = (m) => problems.push(`family "${name}": ${m}`);
    if (!KINDS.has(f.kind)) at(`kind "${f.kind}" is not css, raster or svg`);
    if (!Number.isInteger(f.step)) at("no step number");
    if (!Array.isArray(f.source) || !f.source.length) at("no source files");
    if (!Number.isInteger(f.share) || f.share !== shares[name]) at(`share ${f.share} is not the shares table's ${shares[name]}`);
    if (!Number.isInteger(f.spent) || f.spent < 0 || f.spent > f.share) at(`spent ${f.spent} is outside 0..${f.share}`);
    for (const [ramp, names] of Object.entries(f.ramps || {})) for (const t of names) if (!(t in tokens)) at(`ramp "${ramp}" names ${t}, which C does not have`);
    for (const [state, names] of Object.entries(f.states || {})) for (const t of names) if (!(t in tokens)) at(`state "${state}" names ${t}, which C does not have`);
    for (const r of f.ratios || []) if (typeof r.value !== "number" || !r.test || !r.pair) at(`a ratio row lacks a pair, a value or the test that pins it: ${JSON.stringify(r)}`);
    for (const c of f.checkpoints || []) if (!c.stage || !c.chair || !c.date || !c.verdict) at(`a checkpoint lacks stage, chair, date or verdict: ${JSON.stringify(c)}`);
    if (f.closed) {
      const o = f.originality;
      if (!o || !o.test || !o.verdict || !o.chair || !o.date) at("closed without an originality verdict {test, verdict, chair, date}");
      if (!(f.checkpoints || []).some((c) => c.stage === 4) || !(f.checkpoints || []).some((c) => c.stage === 7)) at("closed without both checkpoints (stages 4 and 7)");
    }
  }
  return problems;
}

if (process.argv.includes("--self-test")) {
  const real = JSON.parse(readFileSync(LEDGER, "utf8"));
  const ok = [];
  ok.push(["the real ledger is accepted", judge(real).length === 0]);
  const stranger = JSON.parse(JSON.stringify(real)); stranger.families.tiles.states.available.push("nosuchToken");
  ok.push(["a state naming a token C lacks is refused", judge(stranger).some((p) => p.includes("nosuchToken, which C does not have"))]);
  const over = JSON.parse(JSON.stringify(real)); over.shares.scene += 1;
  ok.push(["shares that break the ceiling are refused", judge(over).some((p) => p.includes("over the"))]);
  const spent = JSON.parse(JSON.stringify(real)); spent.families.tiles.spent = -1;
  ok.push(["a negative spent is refused", judge(spent).some((p) => p.includes("outside 0.."))]);
  const closed = JSON.parse(JSON.stringify(real)); closed.families.tiles.closed = "2026-08-22";
  ok.push(["a closed family with no originality verdict or checkpoints is refused", judge(closed).some((p) => p.includes("closed without an originality")) && judge(closed).some((p) => p.includes("closed without both checkpoints"))]);
  const drift = JSON.parse(JSON.stringify(real)); drift.families.tiles.share = 1;
  ok.push(["a family share that differs from the table is refused", judge(drift).some((p) => p.includes("is not the shares table's"))]);
  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nprovenance controls: ${ok.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const problems = judge(ledger);
for (const p of problems) console.log("PROBLEM: " + p);
const fams = Object.keys(ledger.families || {});
console.log(`Provenance: ${fams.length} famil${fams.length === 1 ? "y" : "ies"} (${fams.join(", ")}), shares ${Object.values(ledger.shares).reduce((n, v) => n + v, 0)} of ${BASELINE.art_bytes_max}, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
