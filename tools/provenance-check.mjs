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

/* THE LOCK IS READ, NOT TRUSTED (the antagonist's after pass on step 1): a
   family's lock must equal what the stylesheet and the screen state, or the
   entry the ruling calls the README drifts from the code it describes. */
/* a rule's block, brace-aware: `${C.ink}` carries a brace of its own, and a
   selector is matched at a line start so ".wq-tile{" never means the
   wq-many rule that ends in the same characters */
function cssBlock(src, selector) {
  const at = src.indexOf("\n" + selector + "{");
  if (at < 0) return null;
  let depth = 0, k = at + 1;
  for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}") { depth--; if (depth === 0) break; } }
  return src.slice(at + 1, k + 1);
}
const num = (block, re) => { const m = block && block.match(re); return m ? Number(m[1]) : null; };
export function lockFromSources(css = readFileSync("app/src/wq-css.js", "utf8"), screen = readFileSync("app/src/screens/BuildItScreen.jsx", "utf8")) {
  const blocks = {
    reveal: cssBlock(css, ".wq-tile"), many: cssBlock(css, ".wq-slot-tiles.wq-many .wq-tile"), crowd: cssBlock(css, ".wq-slot-tiles.wq-crowd .wq-tile"),
    shortStage: cssBlock(css, "  .wq-tile"), buildit: cssBlock(css, ".wq-tilebtn"), pop: cssBlock(css, "@keyframes wqpop"),
  };
  const r = num(blocks.pop, /outline:(\d+)px/);
  const spread = Object.fromEntries(["reveal", "many", "crowd", "shortStage"].map((k) => [k, num(blocks[k], /--wqband:(\d+)px/)]));
  return {
    radii: Object.fromEntries(["reveal", "many", "crowd", "shortStage", "buildit"].map((k) => [k, num(blocks[k], /border-radius:(\d+)px/)])),
    ring: r, ringOffset: num(blocks.pop, /outline-offset:(\d+)/),
    band: Object.fromEntries(Object.entries(spread).map(([k, v]) => [k, v === null || r === null ? null : v - r])),
    builditBox: num(screen, /const SLOT = (\d+), TILE = \d+/),
    extraPerLetter: num(screen, /\(tile \|\| ""\)\.length\) - 1\) \* (\d+)/),
    haloInset: num(cssBlock(css, ".wq-slotrow"), /padding:(\d+)px[;}]/),   // a single-value padding only: "4px 8px" would not be the inset on every side
    rim: num(blocks.reveal, /inset 0 0 0 (\d+)px \$\{C\.tileEdge\}/),
    highlightInset: num(blocks.reveal, /inset 0 (\d+)px 0 \$\{C\.tileHighlight\}/),
  };
}
export function lockDrift(lock, fromSources) {
  const out = [];
  for (const [k, v] of Object.entries(fromSources.radii)) if (lock.radii?.[k] !== v) out.push(`lock.radii.${k} is ${lock.radii?.[k]}, the stylesheet says ${v}`);
  if (lock.ring !== fromSources.ring) out.push(`lock.ring is ${lock.ring}, the keyframes say ${fromSources.ring}`);
  if (lock.ringOffset !== fromSources.ringOffset) out.push(`lock.ringOffset is ${lock.ringOffset}, the keyframes say ${fromSources.ringOffset}`);
  for (const [k, v] of Object.entries(fromSources.band)) if (lock.band?.[k] !== v) out.push(`lock.band.${k} is ${lock.band?.[k]}, the stylesheet says ${v}`);
  if (lock.builditBox !== fromSources.builditBox) out.push(`lock.builditBox is ${lock.builditBox}, the screen says ${fromSources.builditBox}`);
  if (lock.extraPerLetter !== fromSources.extraPerLetter) out.push(`lock.extraPerLetter is ${lock.extraPerLetter}, the screen says ${fromSources.extraPerLetter}`);
  if (lock.haloInset !== fromSources.haloInset) out.push(`lock.haloInset is ${lock.haloInset}, the stylesheet says ${fromSources.haloInset}`);
  if (lock.rim !== fromSources.rim) out.push(`lock.rim is ${lock.rim}, the stylesheet says ${fromSources.rim}`);
  if (lock.highlightInset !== fromSources.highlightInset) out.push(`lock.highlightInset is ${lock.highlightInset}, the stylesheet says ${fromSources.highlightInset}`);
  if (fromSources.rim !== null && fromSources.highlightInset !== null && lock.highlight !== fromSources.highlightInset - fromSources.rim) out.push(`lock.highlight (the visible pixel) is ${lock.highlight}, the stylesheet's inset ${fromSources.highlightInset} minus the rim ${fromSources.rim} is ${fromSources.highlightInset - fromSources.rim}`);
  return out;
}

export function judge(ledger, tokens = C, ceiling = BASELINE.art_bytes_max, sources = null) {
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
    if (name === "tiles" && f.lock) for (const d of lockDrift(f.lock, sources || lockFromSources())) at(d);
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
  const closed = JSON.parse(JSON.stringify(real)); closed.families.tiles.closed = "2026-08-22"; closed.families.tiles.checkpoints = closed.families.tiles.checkpoints.filter((c) => c.stage !== 7);
  ok.push(["a closed family with only checkpoint 1 is refused", judge(closed).some((p) => p.includes("closed without both checkpoints"))]);
  const drift = JSON.parse(JSON.stringify(real)); drift.families.tiles.share = 1;
  ok.push(["a family share that differs from the table is refused", judge(drift).some((p) => p.includes("is not the shares table's"))]);
  /* the lock against the sources: the reader finds every number, and a
     planted band of 7 is refused */
  const src = lockFromSources();
  ok.push(["the lock reader finds the ring, the offset, every band and radius, the box, the letter step and the halo inset in the sources, at their literals",
    src.ring === 3 && src.ringOffset === 0 && JSON.stringify(src.band) === JSON.stringify({ reveal: 6, many: 4, crowd: 2, shortStage: 4 })
    && JSON.stringify(src.radii) === JSON.stringify({ reveal: 12, many: 9, crowd: 7, shortStage: 8, buildit: 14 }) && src.builditBox === 64 && src.extraPerLetter === 26 && src.haloInset === 4]);
  const twoValue = lockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace(".wq-slotrow{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap;border-radius:18px;padding:4px}", ".wq-slotrow{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap;border-radius:18px;padding:4px 8px}"));
  ok.push(["a two-value padding on the slot row is not read as the halo inset, so the lock is refused", twoValue.haloInset === null && lockDrift(real.families.tiles.lock, twoValue).some((p) => p.includes("lock.haloInset is 4, the stylesheet says null"))]);
  const thickRim = lockFromSources(readFileSync("app/src/wq-css.js", "utf8").replaceAll("box-shadow:inset 0 0 0 1px ${C.tileEdge},inset 0 2px 0 ${C.tileHighlight}", "box-shadow:inset 0 0 0 2px ${C.tileEdge},inset 0 3px 0 ${C.tileHighlight}"));
  ok.push(["a 2 px rim and a 3 px highlight inset in the stylesheet are refused against the lock, naming both numbers", thickRim.rim === 2 && lockDrift(real.families.tiles.lock, thickRim).some((p) => p.includes("lock.rim is 1, the stylesheet says 2")) && lockDrift(real.families.tiles.lock, thickRim).some((p) => p.includes("lock.highlightInset is 2, the stylesheet says 3"))]);
  const wideBand = JSON.parse(JSON.stringify(real)); wideBand.families.tiles.lock.band.reveal = 7;
  ok.push(["a lock whose band differs from the stylesheet is refused, naming both numbers", judge(wideBand).some((p) => p.includes("lock.band.reveal is 7, the stylesheet says 6"))]);
  const closedEmpty = JSON.parse(JSON.stringify(real)); closedEmpty.families.tiles.closed = "2026-08-22"; closedEmpty.families.tiles.checkpoints = []; closedEmpty.families.tiles.originality = null;
  ok.push(["a closed family with an empty checkpoints array or a null originality is refused", judge(closedEmpty).filter((p) => p.includes("closed without")).length === 2]);
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
