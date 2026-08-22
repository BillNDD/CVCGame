/* THE PALETTE, PINNED (art project step 0b as the council amended it; built
   after the after pass on step 0 found it missing, 2026-08-22).
   Two things a document bind cannot do. First, the thirteen keys the game
   had before the bible are pinned to their LITERAL values, so a change to C
   and the bible's table together - which doc-truth rule 11 would accept,
   since it only asks that the two agree - is refused here (E4). Second, the
   bible's 3:1 boundary rule (section 9's ruling) is asserted with this file's
   own WCAG relative-luminance arithmetic at literal expected ratios, so a
   token darkened to clear the rule cannot quietly drift back under it. The
   controls are three pairs held BELOW 3:1 - disabled as a fill under ink
   (2.10), and the two edges the sweep first typed and withdrew (1.94, 1.44) -
   plus WCAG's own anchors (21:1, the #777 grey at 4.48), which must measure
   so, or the arithmetic is not measuring. Tests 3b and 3c hold the two edges
   the game still draws below the rule at their literals. */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { C, alpha } from "../src/engine.js";

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/* `over` at alpha `a` on `under`, per channel, as the browser composites it */
export function mix(over, a, under) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const o = ch(over), u = ch(under);
  return "#" + o.map((v, i) => Math.round(v * a + u[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
}

describe("the palette is pinned", () => {
  it("1: the thirteen keys the game had before the bible keep their literal values", () => {
    expect(C.ink).toBe("#17356b");
    expect(C.ink2).toBe("#3e5aa6");
    expect(C.muted).toBe("#5a6ba8");
    expect(C.strip).toBe("#455073");
    expect(C.action).toBe("#c9402f");
    expect(C.green).toBe("#0f7a4f");
    expect(C.amber).toBe("#8a5a00");
    expect(C.amberInk).toBe("#6b4600");
    expect(C.red).toBe("#c8342f");
    expect(C.purple).toBe("#6b4bbf");
    expect(C.sun).toBe("#ffd166");
    expect(C.chip).toBe("#e8ecf7");
    expect(C.line).toBe("#dfe5f3");
  });

  it("2: C holds exactly the keys the bible's table names - 13 of the game's, 28 of the bible's, 5 from the sweep, 1 from the tile step", () => {
    expect(Object.keys(C).length).toBe(47);
    for (const [k, v] of Object.entries(C)) expect(v, k).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("3: the bible's four structural edges, the empty slot's edge and the progress ring clear 3:1 on the surface each edges, at literal ratios", () => {
    expect(contrast(C.tileEdge, C.tileFace)).toBeCloseTo(3.78, 2);
    expect(contrast(C.boundary, C.surfacePanel)).toBeCloseTo(4.68, 2);
    expect(contrast(C.cyanStructural, C.surfaceReading)).toBeCloseTo(7.51, 2);
    expect(contrast(C.purpleStructural, C.surfaceReading)).toBeCloseTo(6.39, 2);
    /* The two edges the sweep first typed below the rule (the re-judgement
       of step 0): the empty slot's dashed border now reads boundary, on
       paper and on its real ground - paper at .55 over the lavender stop,
       the LEAST luminous of the three and the one that gives the lowest
       ratio (3.79 against 3.81 over skyBlue and 3.92 over the mist) - and
       the progress ring reads amber, on sun. The ground is derived from the
       tokens and pinned, so a moved stop cannot leave it stale. */
    const slotGround = mix(C.paper, 0.55, C.skyLavender);
    expect(slotGround).toBe("#e0e4fd");
    expect(contrast(C.boundary, C.paper)).toBeCloseTo(4.77, 2);
    expect(contrast(C.boundary, slotGround)).toBeCloseTo(3.79, 2);
    expect(contrast(C.amber, C.sun)).toBeCloseTo(4.11, 2);
    for (const [edge, face] of [[C.tileEdge, C.tileFace], [C.boundary, C.surfacePanel], [C.cyanStructural, C.surfaceReading], [C.purpleStructural, C.surfaceReading],
      [C.boundary, C.paper], [C.boundary, slotGround], [C.amber, C.sun]]) {
      expect(contrast(edge, face)).toBeGreaterThanOrEqual(3);
    }
  });

  it("3b: the adult controls' edge, line, is BELOW 3:1 today and is named in open-faults for the grown-up-zone step", () => {
    /* The third judgement of step 0 found the claim "every edge the game
       draws" false while line - the border of the corner's inputs and the
       strip's buttons, the to-do progress ring on chip, the strip's top
       edge - sat at 1.26:1 and 1.07:1. Darkening an adult-zone edge is
       step 4's declared change; until then this test holds the truth and
       docs/open-faults.md carries the fault. */
    expect(contrast(C.line, C.paper)).toBeCloseTo(1.26, 2);
    expect(contrast(C.line, C.chip)).toBeCloseTo(1.07, 2);
    expect(contrast(C.line, C.paper)).toBeLessThan(3);
    const faults = readFileSync("docs/open-faults.md", "utf8");
    expect(faults).toContain("`line`");
    expect(faults).toContain("1.26:1");
  });

  it("3c: the open sentence word's ring is cyanStructural on the gradient, clearing 3:1 on every stop; the action red it replaced is held below as the control", () => {
    /* .wq-sword-open drew a 3 px action ring round the sentence word the
       child is on: 2.95, 2.88 and 3.15 on the gradient's stops (open-faults
       AB). Art step 1 moved it to cyanStructural - the same mark the sounding
       tile takes - owner-ruled 2026-08-22 on the ceramic-tiles page, closing
       AB early. */
    expect(contrast(C.cyanStructural, C.skyBlue)).toBeCloseTo(4.73, 2);
    expect(contrast(C.cyanStructural, C.skyLavender)).toBeCloseTo(4.61, 2);
    expect(contrast(C.cyanStructural, C.skyPurpleMist)).toBeCloseTo(5.05, 2);
    for (const s of [C.skyBlue, C.skyLavender, C.skyPurpleMist]) expect(contrast(C.cyanStructural, s)).toBeGreaterThanOrEqual(3);
    expect(contrast(C.action, C.skyBlue)).toBeCloseTo(2.95, 2);       // the control: what it was
    expect(contrast(C.action, C.skyLavender)).toBeCloseTo(2.88, 2);
    expect(contrast(C.action, C.skyLavender)).toBeLessThan(3);
    const faults = readFileSync("docs/open-faults.md", "utf8");
    expect(faults).toContain("AB. The open sentence word's ring");
    expect(faults).toContain("CLOSED 2026-08-22");
  });

  it("8: the ceramic tile family (art step 1) - every face, edge, ring and state at its literal ratio on the surface it sits on", () => {
    /* The contrast walker reads a background colour under text and nothing
       else: not a box-shadow rim, not an outline, not a disabled control.
       So every ratio the ceramic family relies on is pinned here (bible 9's
       ruling, 11, 15; the before pass on step 1). */
    const stops = [C.skyBlue, C.skyLavender, C.skyPurpleMist];
    /* the face under the letters, the highlight, the rim on the face */
    expect(contrast(C.ink, C.tileFace)).toBeCloseTo(8.64, 2);
    expect(contrast(C.ink, C.tileHighlight)).toBeCloseTo(10.52, 2);
    expect(contrast(C.tileEdge, C.tileFace)).toBeCloseTo(3.78, 2);
    /* the rim is the ONLY boundary between a tile and the sky: the face and
       the slot merge with the gradient (1.13-1.26), so the rim's ratio on
       the three stops is what a child sees the tile by - 3.06 on lavender
       is the margin */
    expect(stops.map((s) => +contrast(C.tileEdge, s).toFixed(2))).toEqual([3.13, 3.06, 3.35]);
    expect(stops.map((s) => +contrast(C.tileFace, s).toFixed(2))).toEqual([1.21, 1.24, 1.13]);
    expect(stops.map((s) => +contrast(C.slot, s).toFixed(2))).toEqual([1.23, 1.26, 1.15]);
    /* the sounding state: the structural ring on the stops, on the face and
       on the slot; the electric band a glow and never a boundary (control);
       the lifted face inside bible 11's 8-12% */
    expect(contrast(C.cyanStructural, C.tileFace)).toBeCloseTo(5.71, 2);
    expect(contrast(C.cyanStructural, C.slot)).toBeCloseTo(5.82, 2);
    expect(contrast(C.cyanElectric, C.tileFace)).toBeCloseTo(1.04, 2);
    expect(contrast(C.cyanElectric, C.tileFace)).toBeLessThan(3);
    expect(mix(C.tileHighlight, 0.5, C.tileFace)).toBe(C.tileFaceLit);
    const lift = luminance(C.tileFaceLit) / luminance(C.tileFace);
    expect(lift).toBeCloseTo(1.114, 3);
    expect(lift).toBeGreaterThanOrEqual(1.08);
    expect(lift).toBeLessThanOrEqual(1.12);
    expect(contrast(C.ink, C.tileFaceLit)).toBeCloseTo(9.55, 2);
    /* pressed: the edge at .08 under the rim darkens the face 8.7% */
    const pressed = mix(C.tileEdge, 0.08, C.tileFace);
    expect(pressed).toBe("#eed07d");
    expect(luminance(pressed) / luminance(C.tileFace)).toBeCloseTo(0.913, 3);
    expect(contrast(C.ink, pressed)).toBeCloseTo(7.94, 2);
    /* the slot: the empty slot's dashed boundary edge, a used tile's rim and
       letter on the slot face */
    expect(contrast(C.boundary, C.slot)).toBeCloseTo(3.51, 2);
    expect(contrast(C.tileEdge, C.slot)).toBeCloseTo(3.85, 2);
    expect(contrast(C.ink, C.slot)).toBeCloseTo(8.80, 2);
    /* a different arrangement: the purpleStructural ring on the face, the
       slot and the stops - never red */
    expect(contrast(C.purpleStructural, C.tileFace)).toBeCloseTo(4.86, 2);
    expect(contrast(C.purpleStructural, C.slot)).toBeCloseTo(4.95, 2);
    expect(stops.map((s) => +contrast(C.purpleStructural, s).toFixed(2))).toEqual([4.02, 3.92, 4.29]);
    for (const [a, b] of [[C.tileEdge, C.tileFace], [C.cyanStructural, C.tileFace], [C.cyanStructural, C.slot], [C.boundary, C.slot], [C.tileEdge, C.slot], [C.purpleStructural, C.tileFace], [C.purpleStructural, C.slot], ...stops.map((s) => [C.tileEdge, s]), ...stops.map((s) => [C.purpleStructural, s])]) {
      expect(contrast(a, b)).toBeGreaterThanOrEqual(3);
    }
  });

  it("9: the scaffold letter at .60 clears 3:1 on the slot and on the old ground; .28 is held below as the withdrawn control", () => {
    /* Owner-ruled 2026-08-22 on the ceramic-tiles page: the letter that fades
       into its own slot after the second miss renders at opacity .60 - it
       sat at .28 (1.65:1) beside the 2026-08-17 ruling, unruled. */
    const ghost = mix(C.ink, 0.6, C.slot);
    expect(ghost).toBe("#6a7891");
    expect(contrast(ghost, C.slot)).toBeCloseTo(3.28, 2);
    expect(contrast(mix(C.ink, 0.6, mix(C.paper, 0.55, C.skyLavender)), mix(C.paper, 0.55, C.skyLavender))).toBeCloseTo(3.37, 2);
    expect(contrast(ghost, C.slot)).toBeGreaterThanOrEqual(3);
    expect(contrast(mix(C.ink, 0.28, C.slot), C.slot)).toBeCloseTo(1.65, 2);
    expect(contrast(mix(C.ink, 0.28, C.slot), C.slot)).toBeLessThan(3);
    /* and the stylesheet says .6, in both copies */
    const css = readFileSync("app/src/wq-css.js", "utf8"), ref = readFileSync("reference/word-quest.jsx", "utf8");
    expect(css).toContain(".wq-ghost{opacity:.6}");
    expect(ref).toContain(".wq-ghost{opacity:.6}");
  });

  it("10: the twelve tile blocks the two stylesheet copies share agree character for character; a drift in a block's last line is refused through the reader; the band literals are pinned", () => {
    /* E2: the reference build stays one file, and its stylesheet copy
       carries the tile rules the app ships. Compared here, by block: .wq-tile,
       .wq-tilebtn, its :active, .wq-used, .wq-empty, .wq-cue, .wq-empty.wq-cue,
       .wq-arr, :focus-visible, .wq-ghost, .wq-slotrow and .wq-slotrow.wq-won.
       NOT compared, because the reference has neither: @keyframes wqpop, the
       density rules (wq-many, wq-crowd, the short stage) and .wq-sword-open -
       doc-truth rule 12 says the same by name. The reader is brace-aware,
       since ${C.ink} carries a brace of its own. */
    const css = readFileSync("app/src/wq-css.js", "utf8"), ref = readFileSync("reference/word-quest.jsx", "utf8");
    const block = (src, start) => {
      const i = src.indexOf(start); expect(i, start).toBeGreaterThan(-1);
      let depth = 0, j = i;
      for (; j < src.length; j++) { if (src[j] === "{") depth++; else if (src[j] === "}") { depth--; if (depth === 0) break; } }
      return src.slice(i, j + 1);
    };
    const SHARED = [".wq-tile{", ".wq-tilebtn{", ".wq-tilebtn:active:not(:disabled){", ".wq-tilebtn.wq-used{", ".wq-tilebtn.wq-empty{", ".wq-tilebtn.wq-cue{", ".wq-tilebtn.wq-empty.wq-cue{", ".wq-tilebtn.wq-arr{", ".wq-tilebtn:focus-visible{", ".wq-ghost{", ".wq-slotrow{", ".wq-slotrow.wq-won{"];
    for (const start of SHARED) expect(block(ref, start), start).toBe(block(css, start));
    /* the control goes THROUGH the reader: one character changed in the last
       line of a block of a copy of the reference source must be read as a
       different block - a reader that stopped early would miss it */
    const tileBlock = block(ref, ".wq-tile{");
    const lastLine = tileBlock.slice(tileBlock.lastIndexOf("\n") + 1);
    const driftedSrc = ref.replace(tileBlock, tileBlock.slice(0, tileBlock.lastIndexOf("\n") + 1) + lastLine.replace("--wqband:9px", "--wqband:8px"));
    expect(driftedSrc).not.toBe(ref);
    expect(block(driftedSrc, ".wq-tile{")).not.toBe(block(css, ".wq-tile{"));
    /* the band, pinned: ring 3 plus band 6 / 4 / 2 / 4 by density, the
       owner's ruled numbers; toward either neighbour the band shows gap
       minus ring (3 / 1 / 0 / 1) and the rest lies beneath the neighbour's
       box, the live tile painting beneath its siblings */
    expect(css).toContain(".wq-tile.wq-live{position:relative;z-index:-1}");
    expect(css).toContain(".wq-slot-tiles{isolation:isolate}");
    expect(block(css, ".wq-tile{")).toContain("--wqband:9px");
    expect(block(ref, ".wq-tile{")).toContain("--wqband:9px");
    expect(css).toContain("border-radius:9px;--wqband:7px");
    expect(css).toContain("border-radius:7px;--wqband:5px");
    expect(css).toContain("font-size:clamp(.85rem,4svh,1.1rem);--wqband:7px");
  });

  it("4: teaching text clears 7:1 and the action blue 4.5:1, at literal ratios", () => {
    expect(contrast(C.ink, C.surfaceReading)).toBeCloseTo(11.36, 2);
    expect(contrast(C.actionBlue, C.paper)).toBeCloseTo(6.43, 2);
    expect(contrast(C.ink, C.disabled)).toBeCloseTo(5.57, 2);
    expect(contrast(C.ink, C.surfaceReading)).toBeGreaterThanOrEqual(7);
  });

  it("5 (control): the one pair the bible admits below 3:1 measures below it, the two withdrawn edges measure below it, and the arithmetic agrees with WCAG's own anchors", () => {
    expect(contrast(C.disabled, C.surfacePanel)).toBeCloseTo(2.10, 2);
    expect(contrast(C.disabled, C.surfacePanel)).toBeLessThan(3);
    expect(contrast("#94a8c0", "#e0e4fd")).toBeCloseTo(1.94, 2);   // the empty slot's first edge, on its ground
    expect(contrast("#e0ac2b", C.sun)).toBeCloseTo(1.44, 2);       // the progress ring's first edge, on sun
    expect(contrast("#000000", "#ffffff")).toBe(21);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);   // the classic just-under-4.5 grey
  });

  it("7: alpha() reproduces the literals it replaced, and the two theme colours the build cannot derive equal skyBlue", () => {
    expect(alpha(C.ink, 0.18)).toBe("rgba(23,53,107,0.18)");
    expect(alpha(C.paper, 0.55)).toBe("rgba(255,255,255,0.55)");
    expect(alpha(C.ink, 0.42)).toBe("rgba(23,53,107,0.42)");
    /* app/index.html and the manifest cannot import C; SPEC 9 declares them
       as the two places skyBlue is retyped, and this holds them to it */
    const html = readFileSync("app/index.html", "utf8");
    const manifest = JSON.parse(readFileSync("app/public/manifest.webmanifest", "utf8"));
    expect((html.match(/name="theme-color"\s+content="([^"]+)"/) || [])[1]).toBe(C.skyBlue);
    expect(manifest.theme_color).toBe(C.skyBlue);
    expect(manifest.background_color).toBe(C.skyBlue);
  });

  it("6: every C.<key> an app source or the reference reads is a key C has, and a planted one is refused", () => {
    /* PreDoneScreen read C.blue for weeks: no such key, undefined, and the
       control fell back to the stylesheet - the drift the token step exists
       to close, which no gate saw (the re-judgement of step 0). */
    const files = execSync("git ls-files app/src reference/word-quest.jsx", { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.(jsx?|mjs)$/.test(f));
    const reads = (text) => [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\bC\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    const unknown = [];
    for (const f of files) for (const k of reads(readFileSync(f, "utf8"))) if (!(k in C)) unknown.push(f + ": C." + k);
    expect(unknown).toEqual([]);
    expect(files.length).toBeGreaterThan(20);
    expect(reads('style={{ background: C.nosuch }} color: C.ink').filter((k) => !(k in C))).toEqual(["nosuch"]);
  });
});
