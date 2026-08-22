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

  it("2: C holds exactly the keys the bible's table names - 13 of the game's, 28 of the bible's, 7 from the sweep", () => {
    expect(Object.keys(C).length).toBe(48);
    for (const [k, v] of Object.entries(C)) expect(v, k).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("3: every edge or boundary token clears 3:1 on the surface it edges, at literal ratios", () => {
    expect(contrast(C.tileEdge, C.tileFace)).toBeCloseTo(3.78, 2);
    expect(contrast(C.boundary, C.surfacePanel)).toBeCloseTo(4.68, 2);
    expect(contrast(C.cyanStructural, C.surfaceReading)).toBeCloseTo(7.51, 2);
    expect(contrast(C.purpleStructural, C.surfaceReading)).toBeCloseTo(6.39, 2);
    for (const [edge, face] of [[C.tileEdge, C.tileFace], [C.boundary, C.surfacePanel], [C.cyanStructural, C.surfaceReading], [C.purpleStructural, C.surfaceReading]]) {
      expect(contrast(edge, face)).toBeGreaterThanOrEqual(3);
    }
  });

  it("4: teaching text clears 7:1 and the action blue 4.5:1, at literal ratios", () => {
    expect(contrast(C.ink, C.surfaceReading)).toBeCloseTo(11.36, 2);
    expect(contrast(C.actionBlue, C.paper)).toBeCloseTo(6.43, 2);
    expect(contrast(C.ink, C.disabled)).toBeCloseTo(5.57, 2);
    expect(contrast(C.ink, C.surfaceReading)).toBeGreaterThanOrEqual(7);
  });

  it("5 (control): the one pair the bible admits below 3:1 measures below it, and the arithmetic agrees with WCAG's own anchors", () => {
    expect(contrast(C.disabled, C.surfacePanel)).toBeCloseTo(2.10, 2);
    expect(contrast(C.disabled, C.surfacePanel)).toBeLessThan(3);
    expect(contrast("#000000", "#ffffff")).toBe(21);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);   // the classic just-under-4.5 grey
  });
});
