/* THE PALETTE, PINNED (art project step 0b as the council amended it; built
   after the after pass on step 0 found it missing, 2026-08-22).
   Two things a document bind cannot do. First, the thirteen keys the game
   had before the bible are pinned to their LITERAL values, so a change to C
   and the bible's table together - which doc-truth rule 11 would accept,
   since it only asks that the two agree - is refused here (E4). Second, the
   bible's 3:1 boundary rule (section 9's ruling) is asserted with this file's
   own WCAG relative-luminance arithmetic at literal expected ratios, so a
   token darkened to clear the rule cannot quietly drift back under it. The
   control is the one pair the bible admits BELOW 3:1 - disabled as a fill
   under ink, never as an edge - which must measure below, or the arithmetic
   is not measuring. */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { C } from "../src/engine.js";

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

  it("2: C holds exactly the keys the bible's table names - 13 of the game's, 28 of the bible's, 5 from the sweep", () => {
    expect(Object.keys(C).length).toBe(46);
    for (const [k, v] of Object.entries(C)) expect(v, k).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("3: every edge the game draws clears 3:1 on the surface it edges, at literal ratios - the bible's four, the empty slot's, the progress ring's", () => {
    expect(contrast(C.tileEdge, C.tileFace)).toBeCloseTo(3.78, 2);
    expect(contrast(C.boundary, C.surfacePanel)).toBeCloseTo(4.68, 2);
    expect(contrast(C.cyanStructural, C.surfaceReading)).toBeCloseTo(7.51, 2);
    expect(contrast(C.purpleStructural, C.surfaceReading)).toBeCloseTo(6.39, 2);
    /* The two edges the sweep first typed below the rule (the re-judgement
       of step 0): the empty slot's dashed border now reads boundary, on
       paper and on its real ground - paper at .55 over the palest gradient
       stop, #e0e4fd - and the progress ring reads amber, on sun. */
    expect(contrast(C.boundary, C.paper)).toBeCloseTo(4.77, 2);
    expect(contrast(C.boundary, "#e0e4fd")).toBeCloseTo(3.79, 2);
    expect(contrast(C.amber, C.sun)).toBeCloseTo(4.11, 2);
    for (const [edge, face] of [[C.tileEdge, C.tileFace], [C.boundary, C.surfacePanel], [C.cyanStructural, C.surfaceReading], [C.purpleStructural, C.surfaceReading],
      [C.boundary, C.paper], [C.boundary, "#e0e4fd"], [C.amber, C.sun]]) {
      expect(contrast(edge, face)).toBeGreaterThanOrEqual(3);
    }
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
