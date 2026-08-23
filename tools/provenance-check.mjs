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
    builditBox: num(screen, /const SLOT = (\d+);/),
    extraPerLetter: num(screen, /compact\(\) \? \d+ : (\d+)\)/),
    compact: { below: num(screen, /const COMPACT_BELOW = (\d+)/), box: num(screen, /compact\(\) \? (\d+) : SLOT\)/), step: num(screen, /compact\(\) \? (\d+) : 26\)/), gap: num(screen, /compact\(\) \? (\d+) : 10\)/) },
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
  for (const k of ["below", "box", "step", "gap"]) if (!lock.compact || lock.compact[k] !== fromSources.compact[k]) out.push(`lock.compact.${k} is ${lock.compact && lock.compact[k]}, the screen says ${fromSources.compact[k]}`);
  if (lock.haloInset !== fromSources.haloInset) out.push(`lock.haloInset is ${lock.haloInset}, the stylesheet says ${fromSources.haloInset}`);
  if (lock.rim !== fromSources.rim) out.push(`lock.rim is ${lock.rim}, the stylesheet says ${fromSources.rim}`);
  if (lock.highlightInset !== fromSources.highlightInset) out.push(`lock.highlightInset is ${lock.highlightInset}, the stylesheet says ${fromSources.highlightInset}`);
  if (fromSources.rim !== null && fromSources.highlightInset !== null && lock.highlight !== fromSources.highlightInset - fromSources.rim) out.push(`lock.highlight (the visible pixel) is ${lock.highlight}, the stylesheet's inset ${fromSources.highlightInset} minus the rim ${fromSources.rim} is ${fromSources.highlightInset - fromSources.rim}`);
  return out;
}

/* THE GLOWSEED'S LOCK, read from the stylesheet (art step 2): the object's
   box, its corner offsets, the rim, the light outside it, the core's box,
   and the stage height below which it is absent. A row that stated these
   and nothing read them would be trusted, not read (step 1's antagonist). */
export function glowseedLockFromSources(css = readFileSync("app/src/wq-css.js", "utf8")) {
  const seed = cssBlock(css, ".wq-glowseed"), core = cssBlock(css, ".wq-glowseed::after"), lit = cssBlock(css, ".wq-glowseed-lit"), muted = cssBlock(css, ".wq-glowseed-muted");
  const absent = css.match(/@media \(max-height:(\d+)px\)\{\.wq-glowseed\{display:none\}\}/);
  return {
    box: { w: num(seed, /width:(\d+)px/), h: num(seed, /height:(\d+)px/) },
    corner: { top: num(seed, /top:(\d+)px/), right: num(seed, /right:(\d+)px/) },
    rim: num(seed, /border:(\d+)px solid/),
    light: num(lit, /box-shadow:0 0 0 (\d+)px/),
    core: { left: num(core, /left:(\d+)px/), top: num(core, /top:(\d+)px/), w: num(core, /width:(\d+)px/), h: num(core, /height:(\d+)px/) },
    /* THE SILHOUETTE is part of the lock (the after pass, 2026-08-23): order
       D says the step-6 pixel seed keeps the placeholder's shape, so the
       shape has to be recorded and guarded, not just its box. The radius as
       written, and the core's offset from the BORDER BOX's centre in CSS px
       - positive right and down - which is what makes it an ovoid with an
       offset core rather than the bullseye checkpoint 1 refused. */
    radius: (seed && (seed.match(/border-radius:([^;}]+)/) || [])[1] || "").trim() || null,
    coreOffset: (() => {
      const n = (b, re) => { const m = b && b.match(re); return m ? Number(m[1]) : null; };
      const L = n(core, /left:(\d+)px/), T = n(core, /top:(\d+)px/), W = n(core, /width:(\d+)px/), H = n(core, /height:(\d+)px/);
      const bw = n(seed, /width:(\d+)px/), bh = n(seed, /height:(\d+)px/), rim = n(seed, /border:(\d+)px solid/);
      if ([L, T, W, H, bw, bh, rim].some((v) => v === null)) return null;
      return { x: +(rim + L + W / 2 - bw / 2).toFixed(1), y: +(rim + T + H / 2 - bh / 2).toFixed(1) };
    })(),
    mutedBorderStyle: (muted && (muted.match(/border-style:(\w+)/) || [])[1]) || null,
    absentBelow: absent ? Number(absent[1]) : null,
    transition: seed ? /transition/.test(seed) || (lit ? /transition/.test(lit) : false) : null,
  };
}
export function glowseedDrift(lock, fromSources) {
  const out = [];
  for (const k of ["w", "h"]) if (!lock.box || lock.box[k] !== fromSources.box[k]) out.push(`lock.box.${k} is ${lock.box && lock.box[k]}, the stylesheet says ${fromSources.box[k]}`);
  for (const k of ["top", "right"]) if (!lock.corner || lock.corner[k] !== fromSources.corner[k]) out.push(`lock.corner.${k} is ${lock.corner && lock.corner[k]}, the stylesheet says ${fromSources.corner[k]}`);
  if (lock.rim !== fromSources.rim) out.push(`lock.rim is ${lock.rim}, the stylesheet says ${fromSources.rim}`);
  if (lock.light !== fromSources.light) out.push(`lock.light is ${lock.light}, the stylesheet says ${fromSources.light}`);
  for (const k of ["left", "top", "w", "h"]) if (!lock.core || lock.core[k] !== fromSources.core[k]) out.push(`lock.core.${k} is ${lock.core && lock.core[k]}, the stylesheet says ${fromSources.core[k]}`);
  if (lock.radius !== fromSources.radius) out.push(`lock.radius is ${JSON.stringify(lock.radius)}, the stylesheet says ${JSON.stringify(fromSources.radius)}`);
  for (const k of ["x", "y"]) if (!lock.coreOffset || !fromSources.coreOffset || lock.coreOffset[k] !== fromSources.coreOffset[k]) out.push(`lock.coreOffset.${k} is ${lock.coreOffset && lock.coreOffset[k]}, the stylesheet's geometry says ${fromSources.coreOffset && fromSources.coreOffset[k]}`);
  if (fromSources.coreOffset && (fromSources.coreOffset.x === 0 || fromSources.coreOffset.y === 0)) out.push(`the core sits on the object's ${fromSources.coreOffset.x === 0 ? "vertical" : "horizontal"} axis - checkpoint 1 refused the centred core (an eye, an LED, a bullseye; bible 17.1)`);
  if (lock.mutedBorderStyle !== fromSources.mutedBorderStyle) out.push(`lock.mutedBorderStyle is ${lock.mutedBorderStyle}, the stylesheet says ${fromSources.mutedBorderStyle}`);
  if (lock.absentBelow !== fromSources.absentBelow) out.push(`lock.absentBelow is ${lock.absentBelow}, the stylesheet says ${fromSources.absentBelow}`);
  if (fromSources.transition) out.push("the stylesheet gives the Glowseed a transition; its looks are hard-edged (bible 7, 14)");
  return out;
}

export function judge(ledger, tokens = C, ceiling = BASELINE.art_bytes_max, sources = null, seedSources = null) {
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
    if (name === "glowseed" && f.lock) for (const d of glowseedDrift(f.lock, seedSources || glowseedLockFromSources())) at(d);
    if (name === "glowseed" && !f.placeholder) at("the Glowseed family must declare its placeholder (or its absence) - the owner's page, ruling 1");
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
    && JSON.stringify(src.radii) === JSON.stringify({ reveal: 12, many: 9, crowd: 7, shortStage: 8, buildit: 14 }) && src.builditBox === 64 && src.extraPerLetter === 26 && src.haloInset === 4 && JSON.stringify(src.compact) === JSON.stringify({ below: 360, box: 56, step: 20, gap: 6 })]);
  const twoValue = lockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace(".wq-slotrow{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap;border-radius:18px;padding:4px}", ".wq-slotrow{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap;border-radius:18px;padding:4px 8px}"));
  ok.push(["a two-value padding on the slot row is not read as the halo inset, so the lock is refused", twoValue.haloInset === null && lockDrift(real.families.tiles.lock, twoValue).some((p) => p.includes("lock.haloInset is 4, the stylesheet says null"))]);
  const thickRim = lockFromSources(readFileSync("app/src/wq-css.js", "utf8").replaceAll("box-shadow:inset 0 0 0 1px ${C.tileEdge},inset 0 2px 0 ${C.tileHighlight}", "box-shadow:inset 0 0 0 2px ${C.tileEdge},inset 0 3px 0 ${C.tileHighlight}"));
  ok.push(["a 2 px rim and a 3 px highlight inset in the stylesheet are refused against the lock, naming both numbers", thickRim.rim === 2 && lockDrift(real.families.tiles.lock, thickRim).some((p) => p.includes("lock.rim is 1, the stylesheet says 2")) && lockDrift(real.families.tiles.lock, thickRim).some((p) => p.includes("lock.highlightInset is 2, the stylesheet says 3"))]);
  const wideBand = JSON.parse(JSON.stringify(real)); wideBand.families.tiles.lock.band.reveal = 7;
  ok.push(["a lock whose band differs from the stylesheet is refused, naming both numbers", judge(wideBand).some((p) => p.includes("lock.band.reveal is 7, the stylesheet says 6"))]);
  /* the Glowseed's lock against the stylesheet: every number found at its
     literal, a planted 3 px light and a planted transition refused */
  const seed = glowseedLockFromSources();
  ok.push(["the Glowseed lock reader finds the box, the corner, the rim, the light, the core, the silhouette and the absent-below height in the stylesheet, at their literals",
    JSON.stringify(seed) === JSON.stringify({ box: { w: 16, h: 20 }, corner: { top: 8, right: 14 }, rim: 1, light: 2, core: { left: 5, top: 8, w: 7, h: 7 },
      radius: "70% 34% 46% 54%/64% 56% 42% 38%", coreOffset: { x: 1.5, y: 2.5 }, mutedBorderStyle: "dashed", absentBelow: 400, transition: false })]);
  /* the silhouette: a core put back on either axis is refused BY NAME (the
     bullseye checkpoint 1 refused), a changed radius is refused, and a muted
     rim that stops being dashed is refused */
  const centred = glowseedLockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace('.wq-glowseed::after{content:"";position:absolute;left:5px;top:8px;width:7px;height:7px', '.wq-glowseed::after{content:"";position:absolute;left:3px;top:8px;width:8px;height:7px'));
  ok.push(["a core back on the object's vertical axis is refused by name", centred.coreOffset.x === 0 && glowseedDrift(real.families.glowseed.lock, centred).some((p) => p.includes("vertical axis") && p.includes("bullseye"))]);
  const roundish = glowseedLockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace("border-radius:70% 34% 46% 54%/64% 56% 42% 38%", "border-radius:50% 50% 50% 50%/55% 55% 45% 45%"));
  ok.push(["a silhouette rounded back to four concentric ovals is refused, naming both radii", roundish.radius === "50% 50% 50% 50%/55% 55% 45% 45%" && glowseedDrift(real.families.glowseed.lock, roundish).some((p) => p.includes("lock.radius is") && p.includes("50% 50%"))]);
  const solidMuted = glowseedLockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace(".wq-glowseed-muted{background:transparent;border-style:dashed}", ".wq-glowseed-muted{background:transparent}"));
  ok.push(["a muted rim that stops being dashed is refused - the shape is what carries the muted state in greyscale", solidMuted.mutedBorderStyle === null && glowseedDrift(real.families.glowseed.lock, solidMuted).some((p) => p.includes("mutedBorderStyle"))]);
  const wideLight = glowseedLockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace("box-shadow:0 0 0 2px ${C.purpleElectric}", "box-shadow:0 0 0 3px ${C.purpleElectric}"));
  ok.push(["a 3 px light in the stylesheet is refused against the lock, naming both numbers", wideLight.light === 3 && glowseedDrift(real.families.glowseed.lock, wideLight).some((p) => p.includes("lock.light is 2, the stylesheet says 3"))]);
  const fading = glowseedLockFromSources(readFileSync("app/src/wq-css.js", "utf8").replace(".wq-glowseed-lit{border-color", ".wq-glowseed-lit{transition:opacity .2s;border-color"));
  ok.push(["a transition on the Glowseed is refused", fading.transition === true && glowseedDrift(real.families.glowseed.lock, fading).some((p) => p.includes("transition"))]);
  const noPlaceholder = JSON.parse(JSON.stringify(real)); delete noPlaceholder.families.glowseed.placeholder;
  ok.push(["a Glowseed row that does not declare its placeholder is refused", judge(noPlaceholder).some((p) => p.includes("must declare its placeholder"))]);
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
