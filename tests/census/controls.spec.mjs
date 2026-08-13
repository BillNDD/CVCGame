/* The census's negative controls (E5). 38 cells run here: a detector that
 * cannot find a fault it was told about will not find one it was not.
 *
 * NOT EVERY DETECTOR, and the difference is counted here rather than glossed —
 * three times now. The header claimed "every" until a reviewer counted them on
 * 2026-08-12; then "SEVEN" while 18 cells ran, with `missing` listed as
 * uncovered a hundred lines above its own control; then a breakdown whose
 * arithmetic came to 23 while 25 ran, in the same commit that added a cell to
 * stop exactly that. A claim about coverage is the kind that must be counted,
 * so the last cell in this file counts it — the total AND the make-up, because
 * a total alone cannot notice a cell changing category, which is how "five
 * own-rule cells" stayed written while six existed.
 *
 * The make-up, and it is asserted below rather than trusted here:
 *   16 plant a defect from the CSS table in tools/ux-census.mjs;
 *    9 plant one built in the page, where a stylesheet cannot reach;
 *    2 prove a clean page reports none of them;
 *    8 hold the census's own rules against the app;
 *    3 cover the toast report, the staging refusal, and this count itself.
 *
 * These have a control: horizontal-overflow, vertical-overflow,
 * element-past-the-edge, nested-scroll, control-too-small (twice: far below the
 * floor, and one pixel below it), control-obscured (three ways: a full-page
 * overlay, a 49% panel, and a badge on the centre alone), nothing-measured,
 * pseudo-overlay (six ways: ::before and ::after, absolute and fixed, and
 * painting by background, box-shadow, border and outline), text-too-small and
 * text-too-big (twice each: far outside, and one pixel outside),
 * word-too-small, word-too-big, overlap (twice: with text and textless),
 * missing, and the staging refusal.
 *
 * These do NOT yet: tile-count, empty-tile, below-the-fold, focus-lost,
 * unreachable-control, page/console errors, off-host requests, and
 * free-play-wrote-evidence. Each of those needs a defect planted in the app
 * rather than in a stylesheet, which is a bigger job than a CSS string.
 *
 * These run in ONE project (phone-portrait) because a detector is code, not a
 * viewport: proving it fires once proves it fires. The census itself is what
 * runs everywhere.
 */
import { readFileSync, readdirSync } from "node:fs";
import { test, expect, devices } from "@playwright/test";
import { inspect, PLANTS, VIEWPORTS, stage, BANK_WORDS, requireStaged, FONT_FLOOR, FONT_CEIL,
         MODAL_BOUNDARY, OVERLAYS, OVERLAY_Z, CHILD_MIN, ADULT_MIN } from "../../tools/ux-census.mjs";

/* NO NAME-STRING SKIP. This file used to select itself with
   `test.skip(testInfo.project.name !== "phone-portrait")`. An auditor renamed
   the projects to `chromium-<viewport>` - the minimum item 1 of the census
   build spec requires - and every one of these 63 cells skipped, exit code 0,
   reported as success. Every E5 obligation in the census would have evaporated
   on the first commit, silently and greenly.
   The file is now bound to its own project by testMatch in the config, so
   there is nothing to skip and nothing to mis-spell. */
const VP = VIEWPORTS[0];

for (const [kind, css, label] of PLANTS) {
  test(`detector fires: ${label || kind}`, async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(150);
    const { findings } = await inspect(page, VP, "planted", {});
    expect(findings.map((f) => f.kind)).toContain(kind);
  });
}

test("a clean page produces none of those findings", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "clean", {});
  const kinds = new Set(findings.map((f) => f.kind));
  for (const [kind] of PLANTS) expect(kinds.has(kind), `clean page reported ${kind}`).toBe(false);
});

/* The detectors added on 2026-08-13, each with the plant an auditor used to
   prove the previous version was decoration. */
test("detector fires: text-too-small", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content: `button, .wq-cta, .wq-sbtn { font-size: 6px !important; }` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const detail = findings.filter((f) => f.kind === "text-too-small").map((f) => f.detail).join(" | ");
  expect(detail, "text-too-small did not fire").not.toBe("");
  expect(detail, "the finding does not quote the size that was planted").toMatch(/6px/);
});

test("detector fires: a PARTIAL cover, not just a full-page one", async ({ page }) => {
  /* The old control used a full-page overlay, the easiest possible case. This
     covers the left 49% - the exact plant that produced ZERO findings from the
     single-centre-point version, because every control's centre sat just clear
     of the panel edge while its label was half buried. It is a pseudo-element,
     so it is invisible to a DOM scan: this is what the five-point sample is
     for, and the element-overlap scan below is for the other shape. */
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content:
    `body::after{content:"";position:fixed;left:0;top:0;width:49vw;height:100vh;background:#000;z-index:99999;}` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  expect(findings.map((f) => f.kind)).toContain("control-obscured");
});

test("detector fires: overlap, when something lands ON a control", async ({ page }) => {
  /* The fault this is actually for: the home-screen images that landed on top
     of one another. The first version of this plant sat half off the button and
     the only thing it collided with was the NEXT button down - so the control
     was green for a collision it never named, while the detector was blind to
     the case in its own title. It asserts the DETAIL now, not the kind: a
     finding of the right kind from the wrong pair is not evidence. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const d = document.createElement("div");
    d.textContent = "landed on top";
    d.style.cssText = `position:fixed;left:${r.left + r.width * 0.25}px;top:${r.top + r.height * 0.2}px;`
      + `width:${r.width * 0.5}px;height:${r.height * 0.6}px;background:#c33;color:#fff;z-index:5;`;
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const overlap = findings.filter((f) => f.kind === "overlap").map((f) => f.detail).join(" | ");
  expect(overlap, "no overlap was reported at all").not.toBe("");
  expect(overlap, "an overlap was reported, but not between the two elements the plant collided")
    .toMatch(/landed on top/);
  expect(overlap, "the control that was landed on is not named in the finding").toMatch(/Begin Session/);
});

test("detector fires: control-obscured, from a badge on the CENTRE alone", async ({ page }) => {
  /* Requiring two of five sample points was a regression on the case the
     single-centre version already caught. On screen this reads "B NEW ssion". */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const d = document.createElement("div");
    d.textContent = "NEW";
    d.style.cssText = `position:fixed;left:${r.left + r.width / 2 - 30}px;top:${r.top + r.height / 2 - 10}px;`
      + `width:60px;height:20px;background:#333;color:#fff;z-index:9;`;
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const obscured = findings.filter((f) => f.kind === "control-obscured").map((f) => f.detail).join(" | ");
  expect(obscured, "a badge on a control's centre was not reported").toMatch(/Begin Session/);
});

test("detector fires: text-too-big, the fault this census was commissioned for", async ({ page }) => {
  /* A label at four times its intended size. Floors alone left this green, and
     it is the reason the census exists. */
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content: `button { font-size: 64px !important; }` });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "planted", {});
  const detail = findings.filter((f) => f.kind === "text-too-big").map((f) => f.detail).join(" | ");
  expect(detail, "text-too-big did not fire").not.toBe("");
  expect(detail, "the finding does not quote the size that was planted").toMatch(/64px/);
});

test("a clean page reports no overlap and no small text", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "clean", {});
  const kinds = findings.map((f) => f.kind);
  expect(kinds, "a clean page reported an overlap").not.toContain("overlap");
  expect(kinds, "a clean page reported small text").not.toContain("text-too-small");
  expect(kinds, "a clean page reported big text").not.toContain("text-too-big");
});

test("detector fires: missing, when a screen loses a control it must have", async ({ page }) => {
  /* B5's plant, as a shipped control. An auditor deleted the "Begin Session"
     button - a child cannot start a session at all - and every one of the seven
     viewports stayed green, because the screen cells passed `{}` to inspect and
     so asserted the existence of nothing. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  /* The node is REMOVED, which is the fault. An earlier version of this plant
     used addStyleTag with `button:has-text(...)` - a Playwright selector, not
     CSS - and one invalid selector voids the whole rule, so nothing was hidden
     and the control failed for a reason that had nothing to do with the app. */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    b.remove();
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {
    mustBeVisible: ['button:has-text("Begin Session")'],
  });
  const detail = findings.filter((f) => f.kind === "missing").map((f) => f.detail).join(" | ");
  expect(detail, "the finding does not name the control that was removed").toMatch(/Begin Session/);
});

/* The app's stylesheet is a JS template literal, so every colour in it is a
   `${C.something}` interpolation — and `${` carries a brace. The rule-splitting
   regex is written over "not a brace", so an interpolation ENDS a rule body
   early and the real one is never matched. That is not a hypothetical: the
   scan reached 71% of the file and exactly ONE rule at or above the overlay
   threshold, and the one it could not see was `.wq-toast` at z-index 70 — the
   exact rule this control was written to catch. It passed because it matched
   nothing.

   Interpolations are blanked before the split. Nothing is dropped: a colour is
   never a selector and never a z-index. */
function stylesheet() {
  const css = readFileSync(new URL("../../app/src/wq-css.js", import.meta.url), "utf8");
  /* One brace inside an interpolation would defeat the blanking as surely as
     the interpolation defeated the split. There are none today; if one
     appears, this says so instead of quietly under-reading the file again. */
  if (/\$\{[^}]*\{/.test(css)) throw new Error("an interpolation in wq-css.js contains a brace, so the rule split is unsafe");
  /* Comments go FIRST, and this cost a run to find. `[^{}]+` before a rule's
     brace swallows whatever precedes it, so the paragraph above .wq-toast
     became part of its selector list and every comma in that paragraph became
     a "selector" — the rule was reached at last, and then reported under six
     names none of which was .wq-toast. */
  return css.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\$\{[^}]*\}/g, "0");
}

/* A z-index whose value is not a bare integer — var(--wqtop), calc(70 + 20),
   a keyword — is UNRESOLVABLE, and unresolvable is treated as an overlay.
   The first version matched only `-?\d+`, so `z-index: var(--wqtop)` with
   --wqtop:90 was not a z-index at all: an auditor put a full-page opaque black
   panel in the app's own stylesheet and all three stylesheet cells passed. And
   the coverage cell could not notice, because it counted "declared" with THE
   SAME REGEX — two derivations that share a blind spot always agree. `declared`
   now counts every `z-index:` in the file, whatever follows it. */
const Z_ANY = /z-index\s*:/g;

function overlayRules(css) {
  const rules = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const zm = /z-index\s*:\s*([^;}]+)/.exec(m[2]);
    if (!zm) continue;
    const raw = zm[1].trim();
    const z = /^-?\d+$/.test(raw) ? Number(raw) : null;   // null = unresolvable
    rules.push({ selectors: m[1].split(",").map((s) => s.trim()).filter(Boolean), z, raw });
  }
  return rules;
}

/* EXACT NAMES, NOT SUBSTRINGS. The matcher was
   `named.some(n => cls.some(c => n.includes(c)) || (n.includes("role=") && sel.includes("[role")))`,
   which waved through ANY selector containing `[role` — so
   `[role="alert"]{position:fixed;inset:0;background:#000;z-index:90}` passed —
   and any class that is a substring of a named one, so `.wq-mod` passed
   because ".wq-modal".includes(".wq-mod"). */
const NAMED = OVERLAYS.split(",").map((s) => s.trim());
const NAMED_CLASSES = new Set(NAMED.flatMap((n) => n.match(/\.[a-zA-Z0-9_-]+/g) || []));
const NAMED_ATTRS = new Set(NAMED.filter((n) => n.startsWith("[")));
const isNamed = (sel) =>
  (sel.match(/\.[a-zA-Z0-9_-]+/g) || []).some((c) => NAMED_CLASSES.has(c)) || NAMED_ATTRS.has(sel.trim());

test("the stylesheet scan reaches every z-index the app declares", () => {
  /* THE CONTROL FOR THE CONTROL. "It passes because it matched nothing" is the
     failure mode, so coverage is asserted before the verdict is trusted: every
     z-index declaration in the file must be reached by the rule split. Two
     independent derivations of one number — a flat count of the declarations,
     and the count the parser actually assembled into rules. */
  const css = stylesheet();
  const declared = (css.match(Z_ANY) || []).length;
  expect(declared, "wq-css.js declares no z-index at all, so this control is judging an empty set")
    .toBeGreaterThan(0);
  expect(overlayRules(css).length, "the rule split cannot reach every z-index the stylesheet declares")
    .toBe(declared);

  /* And that it reaches the two that matter, by name and value (E4). */
  const stacked = overlayRules(css).filter((r) => r.z === null || r.z >= OVERLAY_Z)
    .flatMap((r) => r.selectors.map((s) => `${s} ${r.raw}`)).sort();
  expect(stacked, "the overlays the scan can see are not the ones the app defines")
    .toEqual([".wq-modalwrap 80", ".wq-toast 70"]);
});

test("every overlay the app defines is named in the overlay list", () => {
  /* A HAND-KEPT LIST IS A PROMISE; THIS MAKES IT A FACT. The first version
     named dialog, modal, modalwrap and scrim, and missed .wq-toast - which is
     position:absolute at z-index 70, floats over the stage, and collided with
     everything under it on 11 of 21 state-by-viewport combinations. Nothing
     would have noticed until a cell provoked a toast. This reads the app's own
     stylesheet and fails on any rule that stacks above content and is not
     covered. */
  const uncovered = [];
  for (const rule of overlayRules(stylesheet())) {
    /* An unresolvable value (rule.z === null) is judged as an overlay. A
       z-index nobody can read from the source is exactly the one nobody
       notices, and that is the safe direction to be wrong in. */
    if (rule.z !== null && rule.z < OVERLAY_Z) continue;
    for (const sel of rule.selectors)
      if (!isNamed(sel)) uncovered.push(`${sel} (z-index ${rule.raw})`);
  }
  expect(uncovered, "the app stacks something above content that the overlay list does not name").toEqual([]);
});

test("the overlay matcher refuses what it should refuse", () => {
  /* Its own control, because this matcher waved two things through. It is
     doing no work at all if it accepts everything, and the neighbouring cell's
     hard-coded literal would hide that: the literal is what went red on the
     auditor's plants, not this. E4 literals both ways. */
  expect(isNamed(".wq-toast"), ".wq-toast is named and must be accepted").toBe(true);
  expect(isNamed('[role="dialog"]'), '[role="dialog"] is named and must be accepted').toBe(true);
  expect(isNamed(".wq-modalwrap"), ".wq-modalwrap is named and must be accepted").toBe(true);
  expect(isNamed('[role="alert"]'), "any [role] selector used to be waved through").toBe(false);
  expect(isNamed(".wq-mod"), ".wq-mod passed because it is a substring of .wq-modal").toBe(false);
  expect(isNamed(".wq-audit-panel"), "an unnamed class must be refused").toBe(false);
});

test("no other app source stacks above content where the scan cannot see it", () => {
  /* The scan above reads ONE file. Everything else the app ships could raise a
     z-index too — a second stylesheet, or an inline style={{ zIndex }} in a
     component — and none of it would reach the overlay list. There is none
     today; this is the tripwire for the day there is. */
  const dir = new URL("../../app/src/", import.meta.url);
  const strays = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const child = new URL(e.name + (e.isDirectory() ? "/" : ""), d);
      if (e.isDirectory()) { walk(child); continue; }
      /* EVERY EXTENSION THE APP COULD SHIP. It was /\.(jsx?|css)$/, and an
         auditor put the same stray object in a .ts file and in a .mjs file and
         walked past twice. */
      if (!/\.(m?[jt]sx?|cjs|css)$/.test(e.name) || e.name === "wq-css.js") continue;
      const text = readFileSync(child, "utf8");
      for (const m of text.matchAll(/z-?[iI]ndex["']?\s*[:=]\s*["']?([^,;}\n]+)/g)) {
        const raw = m[1].trim().replace(/["')]+$/, "");
        /* A NUMBER IS JUDGED; ANYTHING ELSE IS REPORTED. `const TOP = 99; …
           zIndex: TOP` and `el.style.setProperty("z-index", "99")` both walked
           past a numbers-only scan, and both are plausible ships — a design
           token and a one-line imperative style. A value this cannot resolve
           is named rather than skipped, which is the safe direction and costs
           only a sentence when someone adds a legitimate one. */
        if (/^-?\d+$/.test(raw)) {
          if (Number(raw) >= OVERLAY_Z) strays.push(`${e.name}: z-index ${raw}`);
        } else if (!/^(auto|inherit|initial|unset|revert)$/.test(raw)) {
          strays.push(`${e.name}: z-index ${raw} — a value this scan cannot resolve, so it cannot be cleared`);
        }
      }
      for (const m of text.matchAll(/setProperty\(\s*["']z-index["']/g))
        strays.push(`${e.name}: sets z-index imperatively (${m[0]}), where no stylesheet scan can see it`);
    }
  };
  walk(dir);
  expect(strays, "an app source outside wq-css.js stacks above content, where the overlay control cannot see it")
    .toEqual([]);
});

test("the toast is NOT on the modal boundary, so what it buries is still seen", () => {
  /* The correction of 2026-08-13. Adding .wq-toast to the boundary made the
     stylesheet control pass and, in the same character, removed the toast from
     the overlap scan: a toast that completely buries the "Ready to read?" line
     and the whole level card was then reported by nothing at all. The fix had
     removed the finding rather than the false positive.
     Two lists now, and they are asserted apart. */
  expect(MODAL_BOUNDARY, "the toast is back on the modal boundary, which silences everything it covers")
    .not.toContain("wq-toast");
  expect(OVERLAYS, "the toast has left the overlay list, so the stylesheet control will refuse it")
    .toContain("wq-toast");
  for (const named of ['[role="dialog"]', ".wq-modal", ".wq-modalwrap", ".wq-scrim"])
    expect(MODAL_BOUNDARY, `${named} left the modal boundary`).toContain(named);
});

test("a toast that buries content is REPORTED, and is not called a collision", async ({ page }) => {
  /* Both halves of the 2026-08-13 correction, in one cell. A toast floats over
     live content on purpose, so it must not redden a cell — and it must not
     vanish either, which is what naming it an overlay did. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const t = document.createElement("div");
    t.className = "wq-toast";
    t.setAttribute("role", "status");
    t.textContent = "All progress cleared.";
    t.style.cssText = `position:fixed;left:${r.left}px;top:${r.top + r.height * 0.3}px;`
      + `width:${r.width}px;height:${r.height * 0.6}px;background:#173;color:#fff;z-index:70;`;
    document.body.appendChild(t);
  });
  await page.waitForTimeout(150);
  const { findings, covered } = await inspect(page, VP, "planted", {});
  const line = covered.join(" | ");
  expect(line, "a toast burying a control was reported by nothing at all").toMatch(/All progress cleared/);
  expect(line, "the report does not name what the toast buried").toMatch(/Begin Session/);
  expect(findings.map((f) => f.kind), "a toast floating over content was asserted as a collision")
    .not.toContain("overlap");
});

test("detector fires: overlap, from a TEXTLESS bar burying a control's label", async ({ page }) => {
  /* The auditor's plant of 2026-08-13, and it beat every detector in this
     file. Opaque black over the left quarter of "▶️ Begin Session" — the
     button reads "gin Session" on screen — in a column that misses all five
     obscured sample points, and with NO TEXT in it, so the overlap scan's ink
     filter rejected it: background-IMAGE counted as ink and background-COLOUR
     did not. The same bar with two characters of text in it was caught, which
     is what made the gap obvious once it was found. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${r.left + r.width * 0.2}px;top:${r.top}px;`
      + `width:${r.width * 0.25}px;height:${r.height}px;background:#000;z-index:60;`;
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const overlap = findings.filter((f) => f.kind === "overlap").map((f) => f.detail).join(" | ");
  expect(overlap, "a textless opaque bar burying a control's label was reported by nothing")
    .toMatch(/Begin Session/);
});

test("detector fires: word-too-small, on the one word the whole game is for", async ({ page }) => {
  /* Neither word-too-small nor word-too-big had a control, and neither
     appeared in EITHER list in this file's header — in the file whose stated
     purpose is that a coverage claim must be counted rather than asserted.
     Deleting the check left 25 of 25 green. They need a staged word, because
     .wq-word does not exist on the home screen, which is why the CSS-only
     plant loop above could never have covered them. */
  const { shown } = await stage(page, VP, "chat", null, { url: "/" });
  requireStaged("chat", shown);
  await page.addStyleTag({ content: `.wq-word{font-size:23px !important}` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const detail = findings.filter((f) => f.kind === "word-too-small").map((f) => f.detail).join(" | ");
  expect(detail, "the target word rendered at 23px against a 24px floor and nothing fired").toMatch(/23px/);
});

test("detector fires: word-too-big", async ({ page }) => {
  const { shown } = await stage(page, VP, "chat", null, { url: "/" });
  requireStaged("chat", shown);
  await page.addStyleTag({ content: `.wq-word{font-size:161px !important}` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const detail = findings.filter((f) => f.kind === "word-too-big").map((f) => f.detail).join(" | ");
  expect(detail, "the target word rendered at 161px against a 160px ceiling and nothing fired").toMatch(/161px/);
});

test("S7's control floors are the ones the rule states", () => {
  /* An auditor set these to 20 and 20 and every control in this file stayed
     green: the plants were 12px against 56, so they fired anyway. The boundary
     plants above close that, and these literals close it twice — S7 is a
     safety rule and the number belongs to the rule, not to the census.
     tests/ui/interface.mjs asserts the same two independently for G7. */
  expect(CHILD_MIN, "S7 sets a child's control at 56px").toBe(56);
  expect(ADULT_MIN, "S7 sets a grown-up's control at 44px").toBe(44);
});

test("this file's own cell count is the one its header states", () => {
  /* The header of this file has now been wrong twice about how much it proves,
     and a coverage claim nobody counts is the shape of every finding in
     docs/open-faults.md section G3b. So it is counted, from the source, every
     run. Add a cell without saying so and this goes red; say so without adding
     one and it goes red the other way. */
  const src = readFileSync(new URL("./controls.spec.mjs", import.meta.url), "utf8");
  const calls = (src.match(/^\s*test\(/gm) || []).length;
  const cells = calls - 1 + PLANTS.length;        // one of those test() calls is the PLANTS loop
  expect(cells, "the number of control cells in this file has changed").toBe(38);
  expect(src.slice(0, 400), "the header no longer states the number of cells that run")
    .toContain(`${cells} cells run here`);

  /* THE BREAKDOWN, NOT JUST THE TOTAL. The previous version asserted the total
     and that one string appeared in the header — and the header's arithmetic
     was wrong by two in both of the commits that wrote it, in the very file
     whose stated purpose is that a coverage claim must be counted. A total
     alone cannot notice a cell moving from one category to another, which is
     precisely how "five own-rule cells" stayed written while six existed. */
  const named = [...src.matchAll(/^\s*test\((?:`|")([^`"]*)/gm)].map((m) => m[1])
    .filter((n) => !n.includes("${"));
  const group = (n) =>
    /^detector fires/.test(n) ? "detector"
      : /clean page/.test(n) ? "clean"
      : /(overlay|stylesheet|modal boundary|font limits|real device|S7's control floors|other app source)/.test(n) ? "rule"
      : "rest";
  const tally = { plant: PLANTS.length, detector: 0, clean: 0, rule: 0, rest: 0 };
  for (const n of named) tally[group(n)] += 1;
  expect(tally, "the make-up of this file's cells has changed, and the header above still describes the old one")
    .toEqual({ plant: 16, detector: 9, clean: 2, rule: 8, rest: 3 });
  expect(Object.values(tally).reduce((a, b) => a + b, 0), "the breakdown no longer adds up to the total")
    .toBe(cells);
});

test("every viewport is a real device, and its size is the device's own", () => {
  /* Item 2 of the build spec, and the control that stops it sliding back. The
     hand-written boxes were DEVICE dimensions: this census called an iPhone 13
     390x844 and asserted nothing fell below the fold there, while a page on an
     iPhone 13 gets 390x664. Every size here is now read off the descriptor, so
     a number typed by hand cannot re-enter — and if a Playwright upgrade
     renames a device, the profile throws instead of going undefined. */
  for (const v of VIEWPORTS) {
    const d = devices[v.device];
    expect(d, `no Playwright descriptor named "${v.device}"`).toBeTruthy();
    expect([v.width, v.height, v.touch, v.scale], `${v.name} does not match the descriptor it names`)
      .toEqual([d.viewport.width, d.viewport.height, d.hasTouch, d.deviceScaleFactor]);
  }
  expect(VIEWPORTS.length, "the census profile set has changed size").toBe(8);
  /* The extreme this repository already measures in G7 (E4, literal). */
  expect(Math.min(...VIEWPORTS.map((v) => v.width)), "the 320px extreme has left the census").toBe(320);
  /* And the reason phone-android and narrow-extreme are in the set at all: a
     layout that only ever meets whole-number scaling never meets the
     fractional-pixel rounding item 2 asks for. */
  expect(VIEWPORTS.filter((v) => !Number.isInteger(v.scale)).map((v) => v.name).sort(),
    "no profile has a fractional device scale factor, so fractional-pixel layout is never exercised")
    .toEqual(["narrow-extreme", "phone-android"]);
});

test("the font limits are limits, not the values the app happens to render", () => {
  expect(FONT_FLOOR.control).toBe(12);
  expect(FONT_FLOOR.word).toBe(24);
  expect(FONT_CEIL.control).toBe(34);
  expect(FONT_CEIL.word).toBe(160);
});

test("a case that cannot be staged is refused, never examined", async ({ page }) => {
  /* The word is deliberately not the one the seed selects. The census must say
     so and stop, rather than examine whatever the app happened to show —
     which is exactly what tools/record-reveal.mjs did when it was asked for
     "of" and quietly recorded "mop".

     This asserts the REFUSAL, not just the mismatch. The earlier version
     checked only that a different word appeared, which would still pass if the
     census went on to examine it — the very fault it exists to rule out. So it
     runs the same expectation the census runs, inside a soft-assert boundary,
     and requires it to have failed. */
  const { shown } = await stage(page, VP, "cat", null, { forceWrongSeed: true, url: "/" });
  expect(shown).not.toBe("cat");
  expect(BANK_WORDS).toContain(shown);

  /* The REAL guard, called the way the census calls it. The previous version
     re-ran the census's own expect inside a try/catch, which proved that
     Playwright's expect throws and nothing about the census: an auditor
     downgraded the census's guard to expect.soft and this control still
     passed while the census examined a word it never asked for. */
  expect(() => requireStaged("cat", shown), "requireStaged accepted the wrong word").toThrow(/staging refused/);
  expect(requireStaged("cat", "cat"), "requireStaged rejected the RIGHT word").toBe("cat");

  /* And that the census actually calls it. A guard nothing calls is a guard
     that is not there. */
  const src = readFileSync(new URL("./ux.spec.mjs", import.meta.url), "utf8");
  expect(src, "the census no longer calls requireStaged").toContain("requireStaged(c.word, shown)");
  expect(src, "the census guards staging with a softenable assertion again")
    .not.toMatch(/expect\.soft\([^)]*shown/);
});
