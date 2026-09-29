/* Word Quest — quiet letters (owner-ruled 2026-09-28, option B). Only the
   silent letter wears the quiet span, never the tile together: in climb the
   b is quiet and the m stays ceramic. The tile keeps .wq-tile everywhere —
   chunking, sounds, slots and census all see the same tile as before.
   @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { quietLetters, quietInTile } from "../src/engine.js";
import QuietChunk from "../app/src/components/QuietChunk.jsx";

afterEach(cleanup);

/* The predicate, letter by letter. */
describe("quietLetters marks only the silent letter", () => {
  it("climb: only the b, not mb together", () => {
    expect(quietLetters("climb")).toEqual([[], [], [], [1]]);
  });
  it("knock: only the k", () => {
    expect(quietLetters("knock")[0]).toEqual([0]);
  });
  it("wreck: only the w", () => {
    expect(quietLetters("wreck")[0]).toEqual([0]);
  });
  it("night: only the gh", () => {
    expect(quietLetters("night")[1]).toEqual([1, 2]);
  });
  it("whistle: t AND e in tle (prev tile s)", () => {
    expect(quietLetters("whistle")[3]).toEqual([0, 1]);
  });
  it("title, gentle, turtle: sounded t, no mark (MiMo F1)", () => {
    expect(quietLetters("title")).toEqual([[], [], []]);
    expect(quietLetters("gentle")).toEqual([[], [], [], []]);
    expect(quietLetters("turtle")).toEqual([[], [], []]);
  });
  it("gnat: only the g in gn", () => {
    expect(quietLetters("gnat")[0]).toEqual([0]);
  });
  it("smile: only the e in le", () => {
    expect(quietLetters("smile")[3]).toEqual([1]);
  });
  it("walk: only the l in al", () => {
    expect(quietLetters("walk")[1]).toEqual([1]);
  });
  it("cake: the whole magic-e tile (letter = tile)", () => {
    expect(quietLetters("cake")[3]).toEqual([0]);
  });
  it("could: the whole silent-l tile", () => {
    expect(quietLetters("could")[2]).toEqual([0]);
  });
  it("these, phone's ph, coat: nothing quiet; folk's l sounds today", () => {
    expect(quietLetters("these").flat()).toEqual([]);
    expect(quietLetters("phone")[0]).toEqual([]);
    expect(quietLetters("phone")[3]).not.toEqual([]);
    expect(quietLetters("coat").flat()).toEqual([]);
    /* Engine-consistency, not phonics truth: folk's l tile sounds d:l in
       the engine today (MiMo F4), so paint follows the audio until a sound
       change lands. */
    expect(quietLetters("folk").flat()).toEqual([]);
  });
});

/* The word-free half for Build-it trays and slots. */
describe("quietInTile marks context-free dead letters", () => {
  it("table tiles mark without a word", () => {
    expect(quietInTile("mb")).toEqual([1]);
    expect(quietInTile("kn")).toEqual([0]);
    expect(quietInTile("tle")).toEqual([0, 1]);
    expect(quietInTile("gn")).toEqual([0]);
  });
  it("single letters and sounding tiles mark nothing", () => {
    expect(quietInTile("e")).toEqual([]);
    expect(quietInTile("th")).toEqual([]);
    expect(quietInTile("c")).toEqual([]);
  });
});

/* The paint: quiet letters carry the span, sounding letters don't. */
describe("QuietChunk splits only the paint", () => {
  it("climb's b wears the span, its m does not", () => {
    render(createElement(QuietChunk, { word: "climb", g: "mb", i: 3 }));
    const q = document.querySelectorAll(".wq-quiet-letter");
    expect(q.length).toBe(1);
    expect(q[0].textContent).toBe("b");
  });
  it("a tile with no quiet letters renders bare text", () => {
    const { container } = render(createElement(QuietChunk, { word: "climb", g: "c", i: 0 }));
    expect(container.querySelectorAll(".wq-quiet-letter").length).toBe(0);
    expect(container.textContent).toBe("c");
  });
  it("without a word, tile text alone decides (Build-it trays)", () => {
    const { container } = render(createElement(QuietChunk, { g: "kn" }));
    expect(container.querySelector(".wq-quiet-letter").textContent).toBe("k");
    expect(container.textContent).toBe("kn");
  });
});

/* The pin: quiet spans read C.disabled, never a hex literal. */
describe("quiet spans are token-bound", () => {
  it("the stylesheet draws the quiet span from C.disabled", () => {
    const css = readFileSync("app/src/wq-css.js", "utf8");
    expect(css).toContain(".wq-quiet-letter{background:${C.disabled};");
  });
});
