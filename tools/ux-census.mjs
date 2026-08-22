/* THE DEEP UX CENSUS — every content family, on every viewport, in every state.
 *
 * Owner-requested 2026-08-12, adapted from the census they are running on their
 * maths game. This is NOT a gate and does not run in `npm run check` or the
 * gauntlet: it is a one-off investigation you launch, read, and act on.
 *
 * WHAT IT IS FOR. The 47 interface checks (G7) prove that specific
 * measurements hold on specific screens. Nothing in this repository proves that
 * every WORD in the bank renders correctly, and a word is content — which is
 * where layout breaks. A four-tile blend on a phone in landscape, a two-letter
 * tile beside a one-letter tile, the longest praise line wrapping under a
 * 56 px control: none of those are covered by a check that renders "cat".
 *
 * WHY NOT BRUTE FORCE. 1,123 words x 8 profiles x every state is tens of
 * thousands of renders, hours of machine time and a pile of evidence nobody
 * reads. Instead the bank is reduced to LAYOUT-RISK SIGNATURES — tile count,
 * letter count and the LENGTH of the widest multi-letter unit — which is 37
 * classes, not 1,123 (measured 2026-08-22). Every class is rendered, plus the
 * widest-glyph extreme inside each class.
 *
 * THE SIGNATURE IS MEASURED FROM THE ENGINE, never hand-listed, so a word added
 * tomorrow either falls into a class already covered or creates a new one that
 * the census then covers by itself. That is the difference between a census and
 * a checklist.
 *
 * HOW A NAMED WORD IS REACHED. Free play's truly-random chooser draws from the
 * whole bank with Math.random. The census seeds Math.random with a scripted
 * sequence so the first draw is the word it wants and the praise line is the
 * one it wants. It then READS THE WORD OFF THE SCREEN and refuses the case if
 * it is not the one asked for. Nothing is faked: the app builds its own block,
 * from its own bank, through its own chooser. Only the dice are held still.
 *
 * WHAT PLAYWRIGHT CANNOT SETTLE, stated here so no report implies otherwise:
 * whether the voice is right, whether a child understands the screen, whether
 * a colour is pleasant, and whether a rendering is beautiful. Screenshots also
 * vary with operating system, browser build and headless mode, so this tool
 * never compares pixels against a baseline. It measures geometry, accessibility
 * structure, and errors — facts that survive a different machine.
 *
 * THIS FILE IS A LIBRARY, NOT A COMMAND. It was documented as one — a usage
 * block offering --benchmark, --run, --shard and --self-test — and none of the
 * four had ever existed: the file has no main path, only exports. A header
 * that names four commands nobody can run is the same fault as a control that
 * cannot fail, in prose instead of code. The census runs on the Playwright
 * runner, and these are the commands that exist:
 *
 *   npm run census            build, run every cell, then judge the report
 *   npm run census:controls   the negative controls alone, ~14 seconds
 *   npm run census:report     judge the report of the last run
 *
 * Sharding is the runner's: `playwright test --shard=1/2`, which is the
 * owner's execution recommendation and needs the blob reporter to add up
 * (item 7 of the build spec).
 */
import { readFileSync } from "node:fs";
import { devices } from "@playwright/test";
import { LEVELS, chunkWord, PRAISE, SESSION_SIZE, STORE_KEY } from "../src/engine.js";

/* REAL DEVICES, NOT HAND-WRITTEN BOXES — item 2 of the build spec, and it
   corrected a number this census had been wrong about since the day it was
   written.
   Playwright ships 207 descriptors carrying the user agent, the device scale
   factor, touch, and the part that matters most here: the viewport a page
   ACTUALLY GETS on that device, after the browser's own chrome is subtracted.
   The hand-written boxes were device dimensions. This census called an
   iPhone 13 390x844 and asserted that nothing fell below the fold there; a
   page on an iPhone 13 gets 390x664. It was measuring a phone 180 pixels
   taller than any phone, and every "nothing is below the fold" it has ever
   reported for a phone was reported with that slack in it.

   Eight profiles, not seven. The owner's six, plus the 320px extreme this
   repository already measures in G7 — now a REAL 320px device rather than a
   box — and an Android phone, which is here for its device scale factor:
   Pixel 7 renders at 2.625, and a layout that only ever meets whole-number
   scaling never meets the fractional-pixel rounding that the build spec asks
   for. Galaxy S9+ brings 4.5 at the narrow end.

   Touch is declared per profile because tap() and click() are different code
   paths in a browser, not two names for one thing. */
const PROFILES = [
  ["phone-portrait", "iPhone 13"],
  ["phone-landscape", "iPhone 13 landscape"],
  ["phone-android", "Pixel 7"],
  ["tablet-portrait", "iPad Mini"],
  ["tablet-landscape", "iPad Mini landscape"],
  ["tablet-large", "iPad Pro 11"],
  ["desktop", "Desktop Chrome"],
  ["narrow-extreme", "Galaxy S9+"],
];
const VIEWPORTS = PROFILES.map(([name, device]) => {
  const d = devices[device];
  /* A descriptor renamed or dropped by a Playwright upgrade must stop the
     census rather than silently leave a profile undefined — which reads, four
     stack frames later, as "cannot read width of undefined" in a cell that
     looks like a game defect. */
  if (!d) throw new Error(`no Playwright device descriptor named "${device}" — the census profile "${name}" names nothing`);
  return { name, device, width: d.viewport.width, height: d.viewport.height,
           touch: d.hasTouch, scale: d.deviceScaleFactor };
});

/* S7's floors, as literals (E4): a child's control is 56 px, a grown-up's 44. */
const CHILD_MIN = 56;
const ADULT_MIN = 44;

// ---------------------------------------------------------------- the cases
const BANK = LEVELS.flatMap((l) => l.words.map((w) => ({ word: w, level: l.n })));
const WIDE = /[mwq]/g;                       // the widest glyphs in most faces

function signature(word) {
  const units = chunkWord(word);
  const multi = units.filter((u) => u.length > 1).sort((a, b) => b.length - a.length);
  /* The third term is the widest unit's LENGTH, not its spelling. Owner-ruled
     2026-08-21 ("Key by grapheme length; keep all 8 profiles"): after the
     hundred-level cutover the spelling took 66 values and the 29 classes
     became 256, 2,809 cells, 8.7 hours at one worker - and a class is a
     LAYOUT risk, so ea and ee in the same slot are the same class. By
     length the bank falls into 37 classes. The self-extending property is
     unchanged: a word whose widest unit is a length the bank has never
     tiled still makes a class of its own. */
  return `${units.length}t-${word.length}L-${multi[0] ? multi[0].length + "w" : "none"}`;
}

/* One representative per class, plus the widest-glyph member when it differs.
   The width heuristic is exactly that — a heuristic — so it is written down:
   m, w and q are the broadest letters in nearly every face, and a class's
   worst case for a tile row that does not wrap is its widest member. */
function cases() {
  const byClass = new Map();
  for (const { word, level } of BANK) {
    const s = signature(word);
    if (!byClass.has(s)) byClass.set(s, []);
    byClass.get(s).push({ word, level });
  }
  const picked = [];
  for (const [sig, members] of byClass) {
    const widest = [...members].sort((a, b) =>
      (b.word.match(WIDE) || []).length - (a.word.match(WIDE) || []).length
      || b.word.length - a.word.length || a.word.localeCompare(b.word))[0];
    const first = members[0];
    picked.push({ ...first, sig, why: "class representative", size: members.length });
    if (widest.word !== first.word)
      picked.push({ ...widest, sig, why: "widest glyphs in its class", size: members.length });
  }
  return picked;
}

/* PSEUDO-ELEMENT OVERLAYS — the third shape, and the one both other scans are
   structurally incapable of seeing.

   ::before and ::after are not in the DOM, so the element-overlap scan cannot
   reach them; and elementFromPoint returns the ORIGINATING element for a
   pseudo-element, so a badge added as a control's OWN ::after scores zero on
   all five sample points. An auditor planted exactly that on 2026-08-13:
   "Begin Session" read "B NEW ssion" on screen and every detector in this file
   stayed green. The five-point sample only catches a pseudo-element belonging
   to a DIFFERENT element, where elementFromPoint returns that other element.

   IT ASKS ABOUT PAINT, NOT GEOMETRY, AND THAT IS DELIBERATE. getComputedStyle
   resolves a pseudo-element's width and height differently in each engine, and
   item 1 of the build spec puts this census on three of them — a geometric
   rule here would give three different answers to one question. So the rule is
   flat: a ::before or ::after that is POSITIONED and PAINTS is reported, with
   the host it sits on. The app has none today, which is what the clean-page
   control proves; its two flex spacers (.wq-stage::before/::after) are
   content:"" with no position and no paint, exactly the shape this must NOT
   report. The cost of that breadth is that a decorative badge added later
   lands here as a finding until a person rules on it, which is the safe
   direction for a detector to fail in. */
async function pseudoOverlays(page) {
  return page.evaluate(() => {
    /* EVERY WAY A BOX CAN PUT INK ON THE SCREEN, not just background.
       The first version asked about background-color and background-image
       alone, and an auditor covered "▶️ Begin Session" solid black three
       separate ways it could not see: a 56px border-top, an inset box-shadow
       with a 200px spread, and a 200px outline pulled back over itself with a
       negative offset. All three screenshot as a black button; all three fired
       nothing. A detector that knows one painting route is a detector that
       names one fault. */
    const alphaOf = (c) => {
      const rgba = /rgba?\(([^)]+)\)/.exec(c || "");
      return rgba ? Number(rgba[1].split(",")[3] ?? 1) : 0;
    };
    const paints = (cs) => {
      if (alphaOf(cs.backgroundColor) > 0 || cs.backgroundImage !== "none") return true;
      if (cs.boxShadow && cs.boxShadow !== "none") return true;
      if (cs.outlineStyle && cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) return true;
      for (const side of ["Top", "Right", "Bottom", "Left"])
        if (cs[`border${side}Style`] !== "none" && parseFloat(cs[`border${side}Width`]) > 0) return true;
      return false;
    };
    const out = [];
    for (const el of document.querySelectorAll("*")) {
      for (const which of ["::before", "::after"]) {
        const cs = getComputedStyle(el, which);
        /* An element with no such pseudo-element reports "none" in Chromium
           and "normal" in the other two. Both mean there is nothing painted. */
        if (!cs.content || cs.content === "none" || cs.content === "normal") continue;
        if (cs.position !== "absolute" && cs.position !== "fixed") continue;
        const text = cs.content.replace(/^["']|["']$/g, "").trim();
        if (!text && !paints(cs)) continue;
        out.push({
          host: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40),
          which, text: text.slice(0, 20), size: `${cs.width}x${cs.height}`,
        });
      }
    }
    return out.slice(0, 12);
  });
}

/* Every check the census makes on one rendered state. Each returns a finding
   or null; a finding is a fact with numbers in it, never an opinion. */
async function inspect(page, viewport, label, opts = {}) {
  const findings = [];
  const push = (kind, detail, extra = {}) => findings.push({ kind, detail, state: label, ...extra });

  const page_ = await page.evaluate(({ vw, vh }) => {
    const de = document.documentElement;
    const overflowing = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        overflowing.push({
          tag: el.tagName.toLowerCase(), cls: el.className && String(el.className).slice(0, 60),
          left: Math.round(r.left), right: Math.round(r.right), scrollable: cs.overflowX !== "visible",
        });
      }
    }
    /* Nested scrolling a child never asked for: an element that scrolls
       sideways inside the page is a defect even when the page itself does not
       overflow, because the content is then unreachable without a gesture. */
    const nested = [...document.querySelectorAll("*")].filter((el) => {
      const cs = getComputedStyle(el);
      return el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "visible" && el !== de;
    }).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60),
                      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    return {
      pageScrollX: de.scrollWidth > de.clientWidth + 1,
      pageScrollY: de.scrollHeight > de.clientHeight + 1,
      overflowing: overflowing.slice(0, 8),
      nested: nested.slice(0, 8),
      focus: document.activeElement ? document.activeElement.tagName.toLowerCase()
        + (document.activeElement.className ? "." + String(document.activeElement.className).split(" ")[0] : "") : "none",
      vw, vh,
    };
  }, { vw: viewport.width, vh: viewport.height });

  if (page_.pageScrollX) push("horizontal-overflow", `the page scrolls sideways at ${viewport.width}px`);
  /* Vertical overflow in a shell built never to scroll means the content does
     not fit — the cheapest real check available, and it was measured and
     thrown away until a reviewer noticed. */
  if (page_.pageScrollY)
    push("vertical-overflow", `the page scrolls down at ${viewport.width}x${viewport.height}, and this shell is built not to scroll`);
  for (const o of page_.overflowing)
    push("element-past-the-edge", `${o.tag}.${o.cls} spans ${o.left}..${o.right} in a ${viewport.width}px viewport`);
  for (const n of page_.nested)
    push("nested-scroll", `${n.tag}.${n.cls} scrolls sideways inside the page (${n.scrollWidth} in ${n.clientWidth})`);
  /* Focus is only a question AFTER something has been operated: a freshly
     loaded page has focus on <body> by design, and calling that a defect made
     the census's own clean-page control fail - which is what a control is for. */
  if (opts.expectFocus && page_.focus === "body")
    push("focus-lost", "after grading, focus fell to <body>, so a keyboard has nowhere to go");

  /* Every control: its size against the floor its audience deserves, and
     whether a real tap would reach it or land on something else. */
  const controls = await page.evaluate(({ childMin, adultMin }) => {
    const out = [];
    /* A DIALOG COVERS THE PAGE ON PURPOSE. When one is open, every control
       behind it reports something on top of its own centre - which is the
       dialog doing its job, not a defect. Judge only what is inside it. The
       first version of this check called the whole home screen obscured the
       moment the free-play chooser opened. */
    const modal = document.querySelector('[role="dialog"] .wq-modal, .wq-modal');
    const scope = modal || document;
    for (const el of scope.querySelectorAll("button, [role=button], a[href], input, select")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      /* The floors belong to classes, and the classes are the ones G7 already
         measures: .wq-cta is a child's control at 56 px, .wq-sbtn and
         .wq-btn-plain are a grown-up's at 44. A control in neither class is
         reported as unclassified rather than judged against a floor invented
         here - inventing one made "Grown-ups corner" (137x46) read as a
         defect when S7 governs it at 44. */
      const isChild = el.classList.contains("wq-cta");
      const isAdult = el.classList.contains("wq-sbtn") || el.classList.contains("wq-btn-plain");
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = document.elementFromPoint(cx, cy);
      out.push({
        name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
        w: Math.round(r.width), h: Math.round(r.height),
        /* S7 governs EVERY control, so every control is judged: 56 px if it
           is a child's, 44 px otherwise. The class only says which. A control
           in neither class is still measured against the adult floor - the
           weakest safe claim - and its lack of a class is reported as a note
           rather than a defect, because the grown-up's corner is full of
           perfectly legal 44 px controls that simply are not .wq-sbtn. */
        floor: isChild ? childMin : adultMin,
        klass: isChild ? "child" : isAdult ? "adult" : "unclassified",
        inView: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
        /* Nothing at the centre point means the control is OFF SCREEN, not
           buried: elementFromPoint reads the viewport, so a control scrolled
           past the fold returns null. The grown-ups corner is a scrolling page
           by design and its lower level rows are legitimately below the fold,
           so calling that "obscured" reported eleven defects that did not
           exist. Obscured means something is on top of a control that IS in
           view. */
        /* FIVE POINTS, NOT ONE. Sampling only the centre meant an auditor
           could cover the left 49% of every screen in opaque black and the
           census reported nothing: every control's centre sat just clear of
           the panel edge, while "n Session" and "ee play" were half buried.
           Two of five covered is a partial cover; one can be an edge artifact
           where a rounded corner meets a neighbour. A pseudo-element overlay
           is caught here and NOT by the element-overlap scan below, because
           ::after is not in the DOM at all - which is why both exist. */
        obscured: (() => {
          const pts = [[r.left + r.width / 2, r.top + r.height / 2],
                       [r.left + r.width * 0.15, r.top + r.height * 0.15],
                       [r.right - r.width * 0.15, r.top + r.height * 0.15],
                       [r.left + r.width * 0.15, r.bottom - r.height * 0.15],
                       [r.right - r.width * 0.15, r.bottom - r.height * 0.15]];
          let covered = 0, centreCovered = false;
          for (const [i, [x, y]] of pts.entries()) {
            const hit = document.elementFromPoint(x, y);
            /* NOT `|| hit.contains(el)`. A full-page ::after overlay makes
               elementFromPoint return <body>, which is an ancestor - excluding
               ancestors made the detector blind to the whole overlay class,
               which is what it was built for. An ancestor painting over its own
               child is exactly the fault. */
            if (hit && !(hit === el || el.contains(hit))) { covered++; if (i === 0) centreCovered = true; }
          }
          /* The centre alone is still a finding. Requiring two of five was a
             REGRESSION on the case the one-point version already caught: a
             60x20 badge dropped on the middle of "Begin Session" reads
             "B NEW ssion" on screen, and the five-point rule reported nothing.
             The four inset points ADD to the centre; they never replace it. */
          return centreCovered || covered >= 2;
        })(),
        offScreen: !at,
        onTop: at ? at.tagName.toLowerCase() + "." + String(at.className).split(" ")[0] : "nothing",
        font: parseFloat(getComputedStyle(el).fontSize),
      });
    }
    return out;
  }, { childMin: CHILD_MIN, adultMin: ADULT_MIN });

  /* A scan that measures nothing reports nothing and goes green. Every state
     this census visits has controls; zero means the scan looked in the wrong
     place, which is a fault in the census and not in the game. */
  if (!controls.length) push("nothing-measured", "the control scan found no controls at all in this state");
  for (const c of controls) {
    if (c.floor && (c.h < c.floor - 0.5 || c.w < c.floor - 0.5))
      push("control-too-small", `"${c.name}" is ${c.w}x${c.h}px, floor ${c.floor}px (${c.klass})`);
    if (c.obscured)
      push("control-obscured", `"${c.name}" has ${c.onTop} on top of its own centre`);
    if (c.font && c.font < FONT_FLOOR.control)
      push("text-too-small", `"${c.name}" renders its label at ${c.font}px, floor ${FONT_FLOOR.control}px`);
    if (c.font && c.font > FONT_CEIL.control)
      push("text-too-big", `"${c.name}" renders its label at ${c.font}px, ceiling ${FONT_CEIL.control}px`);
  }

  /* The word a child is asked to read, which is the one piece of text on the
     screen the whole game exists for. */
  const wordFont = await page.evaluate(() => {
    const el = document.querySelector(".wq-word");
    return el ? parseFloat(getComputedStyle(el).fontSize) : null;
  });
  if (wordFont !== null && wordFont < FONT_FLOOR.word)
    push("word-too-small", `the target word renders at ${wordFont}px, floor ${FONT_FLOOR.word}px`);
  if (wordFont !== null && wordFont > FONT_CEIL.word)
    push("word-too-big", `the target word renders at ${wordFont}px, ceiling ${FONT_CEIL.word}px`);

  /* OVERLAP, over rectangles rather than one sampled pixel. control-obscured
     asks what sits at a control's exact centre, so an auditor covered the left
     49% of every screen in opaque black and the census reported nothing: every
     control's centre sat just clear of the panel. This compares the boxes of
     things that actually carry ink - text leaves and images - and ignores
     ancestor pairs, which always overlap by construction. */
  /* The modal boundary is passed IN and exported, so a control can hold the
     full overlay list against the app's own stylesheet. Maintaining it by hand
     already failed once: .wq-toast is position:absolute at z-index 70, floats
     over the stage, and is none of dialog/modal/modalwrap/scrim.
     IT IS NOT ON THIS BOUNDARY, and that is the correction of 2026-08-13.
     Adding it here silenced the class rather than the false positives: a toast
     that completely buries the "Ready to read?" line and the whole level card
     was then reported by nothing at all. A toast IS meant to float over
     content for a second or two, so what it covers is not a defect — it is a
     fact worth having, and it comes back through the report-only channel
     below, the same way an unclassified control does. */
  const { collisions, covered } = await page.evaluate((MODAL) => {
    /* THE MODAL IS NAMED, NOT INFERRED. The first version used two geometric
       proxies for "a dialog is open" - drop anything not top-most at its own
       centre, and ignore total containment - and both proxies excluded the
       real fault along with the scrim. An element landing ON a control covers
       that control's centre, so the control was dropped from the set and the
       pair was never compared: the detector was structurally incapable of
       seeing one thing land on top of another, which is the only fault it
       names. Naming the dialog lets both proxies go. */
    const modalOpen = !!document.querySelector(MODAL);
    const inModal = (el) => !!el.closest(MODAL);
    const ink = [...document.querySelectorAll("*")].filter((el) => {
      /* The page root carries a gradient, so it qualifies as ink and pairs
         with everything appended outside it, printing its whole text content
         as a name. */
      if (el.matches("html, body, .wq-root")) return false;
      /* The scrim is a full-screen button labelled "Close" that lives INSIDE
         the dialog, so it is on the same side of the modal boundary as the
         dialog's own controls and covers every one of them completely. It is a
         backdrop, not content: excluding the whole dialog would hide real
         collisions between the controls inside it. */
      if (el.matches(".wq-scrim")) return false;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      /* Controls count as ink even when their label sits in a child element,
         which is the common case and which made the first version of this scan
         blind to a div dropped on top of a button. */
      const isControl = el.matches("button, a, [role=button], input, .wq-cta, .wq-sbtn");
      /* A SOLID COLOUR IS INK. background-IMAGE counted and background-COLOUR
         did not, so an auditor dropped a textless black bar over the left
         quarter of "▶️ Begin Session" — the button read "gin Session" on
         screen — and this scan skipped the bar entirely as carrying nothing.
         The same bar with two characters of text in it was caught. Ink is
         about what a child SEES, and a black rectangle is the most visible
         thing on a page. */
      const rgba = /rgba?\(([^)]+)\)/.exec(s.backgroundColor || "");
      const paintedBg = rgba ? Number(rgba[1].split(",")[3] ?? 1) > 0 : false;
      return ownText || isControl || el.tagName === "IMG" || s.backgroundImage !== "none" || paintedBg;
    });
    const box = (el) => el.getBoundingClientRect();
    const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 28);
    const out = [], toasted = [];
    for (let i = 0; i < ink.length; i++) {
      for (let j = i + 1; j < ink.length; j++) {
        const a = ink[i], b = ink[j];
        if (a.contains(b) || b.contains(a)) continue;
        /* A dialog sits on top of the screen behind it by design, and the
           free-play chooser leaves the home screen's buttons in the DOM with
           real boxes. A pair that straddles that boundary is stacking, not a
           collision. */
        if (modalOpen && inModal(a) !== inModal(b)) continue;
        const ra = box(a), rb = box(b);
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w <= 1 || h <= 1) continue;
        const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (smaller <= 0) continue;
        const ratio = (w * h) / smaller;
        /* PARTIAL overlap only. Total containment - one box wholly inside
           another without a DOM ancestor relationship - is how stacking
           contexts and modal scrims look, and reporting it produced four
           findings on a clean screen where nothing was wrong: a dialog sits on
           top of the level strip by design. Two things COLLIDING overlap each
           other partly, which is the shape of the home-screen images that
           landed on top of one another. */
        /* No upper bound any more. Total containment is exactly what a panel
           landing on a control looks like, and excluding it was excluding the
           fault. */
        if (ratio <= 0.25) continue;
        const line = `"${name(a)}" and "${name(b)}" overlap over ${Math.round(ratio * 100)}% of the smaller`;
        /* A TOAST IS TRANSIENT CONTENT, NOT A COLLISION - and not a silence
           either. It floats over the stage on purpose, so a pair involving one
           is reported rather than asserted. "All progress cleared." and
           "Log copied" fire from the grown-ups corner, which the census
           inspects, and what they bury is worth reading. */
        (a.closest(".wq-toast") || b.closest(".wq-toast") ? toasted : out).push(line);
      }
    }
    return { collisions: out.slice(0, 12), covered: toasted.slice(0, 12) };
  }, MODAL_BOUNDARY);
  for (const o of collisions) push("overlap", o);

  /* OPT-IN PER CELL, because axe costs a few hundred milliseconds and the
     census runs it hundreds of times. Every cell that shows a child a screen
     asks for it; the planted-defect controls do not, since a stylesheet plant
     would drown the result in contrast violations of its own making. */
  if (opts.axe) {
    for (const v of await axeViolations(page))
      push("a11y", `${v.id} (${v.impact}) on ${v.count} node(s): ${v.where}${v.why ? " — " + v.why : ""}`);
  }

  const pseudo = await pseudoOverlays(page);
  for (const p of pseudo)
    push("pseudo-overlay", `"${p.host}" carries a positioned ${p.which} that paints`
      + `${p.text ? ` the text "${p.text}"` : ""} over it (${p.size})`);

  /* The accessibility tree with its geometry, in one call: what a screen
     reader is told and where those things actually are. Used to compare the
     VISIBLE tile count with the ACCESSIBLE one — an empty or duplicated tile
     shows up as a mismatch and as nothing else. */
  const aria = await page.locator("body").ariaSnapshot({ mode: "ai", boxes: true }).catch(() => "");

  if (opts.expectTiles !== undefined) {
    const visible = await page.locator(".wq-tile").count();
    if (visible !== opts.expectTiles)
      push("tile-count", `${visible} tiles on screen, the word breaks into ${opts.expectTiles}`);
    const empty = await page.evaluate(() =>
      [...document.querySelectorAll(".wq-tile")].filter((t) => !t.textContent.trim()).length);
    if (empty) push("empty-tile", `${empty} tile(s) render with no letter in them`);
  }
  /* EXISTENCE alone, for a screen that scrolls by design. The grown-ups corner
     is one: its lower rows sit at y=1824 in a 568px viewport and that is not a
     defect. Requiring them above the fold invented two findings; requiring
     nothing at all is how an auditor deleted the "Begin Session" button and
     left every viewport green. So a state says which of the two it means. */
  for (const sel of opts.mustExist || []) {
    if (!(await page.locator(sel).first().count()))
      push("missing", `${sel} is not on the page at all`);
  }
  if (opts.mustBeVisible) {
    for (const sel of opts.mustBeVisible) {
      const el = page.locator(sel).first();
      /* COUNT FIRST. boundingBox() auto-waits, so a control that is genuinely
         absent - the fault this is here to find - burned the whole 60s test
         timeout and reported a timeout instead of "missing". Found by writing
         the negative control for it: the detector could only report the fault
         it was built for by taking a minute to do it. */
      if (!(await el.count())) { push("missing", `${sel} is not on the page at all`); continue; }
      const box = await el.boundingBox().catch(() => null);
      if (!box) { push("missing", `${sel} is not on the page at all`); continue; }
      if (box.y + box.height > viewport.height + 1 || box.y < -1)
        push("below-the-fold", `${sel} sits at y=${Math.round(box.y)}..${Math.round(box.y + box.height)} in a ${viewport.height}px viewport`);
    }
  }
  /* Reported, not asserted: controls with no size class of their own, and
     controls sitting below the fold on a screen that scrolls by design. Both
     are worth knowing and neither is a defect. A control that MUST be reachable
     in a state is asserted through mustBeVisible instead, which is the list
     that knows what the state is for. */
  const unclassified = controls.filter((c) => c.klass === "unclassified")
    .map((c) => `${c.name || "(no label)"} ${c.w}x${c.h}`);
  const offScreen = controls.filter((c) => c.offScreen)
    .map((c) => `${c.name || "(no label)"} ${c.w}x${c.h}`);
  return { findings, aria, controls, unclassified, offScreen, covered, page: page_ };
}

/* THE STAGING REFUSAL, as a function both the census and its control call.
   It used to be an `expect` in the spec file with a control that re-ran the
   same expect inside a try/catch — which proved that Playwright's expect
   throws, and nothing about the census. An auditor downgraded the census's
   real guard to expect.soft on 2026-08-13 and the control still passed while
   the census went on to examine a word it had not asked for: exactly the fault
   tools/record-reveal.mjs shipped with, recording "mop" when asked for "of".
   A function that THROWS cannot be softened from the spec file. */
function requireStaged(asked, shown) {
  /* Case-blind on purpose (2026-08-21): the bank word "i" is DISPLAYED as
     "I", the pronoun's only honest spelling - displayWord's transform is the
     app being right, not the census drawing the wrong word. Any other
     difference still refuses. */
  if (shown.toLowerCase() !== asked.toLowerCase())
    throw new Error(`staging refused: asked for "${asked}", the app showed "${shown}" - the cell stops here rather than examining the wrong word`);
  return shown;
}

/* Floors, not measurements. inspect() collected a font size for every control
   from the day it was written and never asserted it, so an auditor set every
   child label to 6px and the target word to 8px and the census stayed green -
   the exact fault class it was commissioned for, after a label shipped at four
   times its intended size. Both numbers are well under what the app renders
   today; they are floors a child can still read, not the current values. */
const FONT_FLOOR = { control: 12, word: 24 };
/* AND CEILINGS. Floors alone left the exact fault this census was commissioned
   for still green: every control label at four times its size destroys the
   layout - the title, the "Ready to read?" line and the level card all pushed
   off the screen - and the census reported nothing. The app renders control
   labels at 16px and the word far larger; these are ceilings a layout can
   survive, not the values it uses. */
const FONT_CEIL = { control: 34, word: 160 };

/* TWO LISTS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS. Collapsing them into
   one on 2026-08-12 is what silenced the toast: a selector added to make the
   stylesheet control pass also removed the toast from the overlap scan, and a
   toast burying the level card became invisible.

   MODAL_BOUNDARY is "what sits over the screen BY DESIGN, so a pair that
   straddles it is stacking rather than a collision". A dialog is on it. A
   toast is not: it floats over live content the child is still reading.

   OVERLAYS is "everything in the app that stacks above content", and it exists
   to be held against the app's own stylesheet by a control — because a
   hand-kept list is a promise and a checked one is a fact. Every rule in
   app/src/wq-css.js at or above OVERLAY_Z must appear here. */
const MODAL_BOUNDARY = '[role="dialog"], .wq-modal, .wq-modalwrap, .wq-scrim';
const OVERLAYS = `${MODAL_BOUNDARY}, .wq-toast`;
/* The z-index at or above which an element is an overlay rather than content.
   The whole app uses four values: -1, 1, 70, 80. */
const OVERLAY_Z = 50;

const BANK_WORDS = LEVELS.flatMap((l) => l.words);
const LONGEST_PRAISE = [...PRAISE.keys()].sort((a, b) => PRAISE[b].length - PRAISE[a].length)[0];

/* Hold the dice still — with a QUEUE, not a call counter.
   The first attempt counted calls and made the FIRST one land on the wanted
   word. Measured in a real browser, the app boot spends two Math.random calls
   before free play is even opened, so the wanted word went to whatever asked
   first and the census drew "chat" when it asked for "at". The queue is set
   AFTER the page has loaded and is consumed one value per call, so nothing but
   the draw this census cares about is affected. Everything else gets 0.5,
   which makes a run repeatable. */
async function holdTheDice(page) {
  await page.addInitScript(() => {
    window.__wqQueue = [];
    Math.random = () => (window.__wqQueue.length ? window.__wqQueue.shift() : 0.5);
  });
}
const dieFor = (index, size) => (index + 0.5) / size;

async function stage(context, viewport, word, watchers, opts = {}) {
  const page = context.newPage ? await context.newPage() : context;   // context or page
  if (watchers) watchers(page);
  const wi = opts.forceWrongSeed
    ? (BANK_WORDS.indexOf(word) + 7) % BANK_WORDS.length     // deliberately not the word asked for
    : BANK_WORDS.indexOf(word);
  await holdTheDice(page);
  await page.goto(opts.url || "/", { waitUntil: "load" });
  /* Loaded, boot's own dice spent, and only now is the draw decided. */
  await page.evaluate((v) => { window.__wqQueue = [v]; }, dieFor(wi, BANK_WORDS.length));
  await page.getByText("🎈 Free play").click({ timeout: 8000 });
  await page.getByText("🎲 Any word").click({ timeout: 8000 });   // the grid's right Words cell (2026-08-21)
  await page.locator(".wq-word").waitFor({ timeout: 8000 });
  const shown = (await page.locator(".wq-word").textContent()).trim();
  /* The praise line for this cell is the longest one, because the longest is
     the one that wraps under a control. Queued now, spent when the grown-up
     grades. */
  await page.evaluate((v) => { window.__wqQueue = [v]; }, dieFor(LONGEST_PRAISE, PRAISE.length));
  return { page, shown };
}

/* A save with the pre-ladder behind it, for the cells that need "Begin
   Session" to start a WORD session: since the pre-ladder (2026-08-15) a
   truly fresh save begins at Pre 1, and the done cell was measuring the
   wrong screen - found by the first post-cutover census run (2026-08-21).
   Same seed shape as G7's GRADUATED, written through the app's own store. */
async function seedGraduated(page) {
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const db = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const store = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const save = JSON.stringify({ version: 5, level: 1, preLevel: 0, prePerfectStreak: 0,
    sessionsCompleted: 0, perfectStreak: 0, words: {}, log: [], pre: {}, settings: { sound: true, childName: "", lang: "en-US" } });
  await page.evaluate(([d, s, key, v]) => new Promise((resolve, reject) => {
    const rq = indexedDB.open(d, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(s);
    rq.onsuccess = () => {
      const tx = rq.result.transaction(s, "readwrite");
      tx.objectStore(s).put(v, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    rq.onerror = () => reject(rq.error);
  }), [db, store, STORE_KEY, save]);
  await page.reload({ waitUntil: "load" });
}

/* Free play must never touch learning evidence (SPEC section 6). Read the
   saved state straight out of IndexedDB, the same store the app writes. */
async function savedState(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open("word-quest", 1);
    req.onerror = () => resolve("unreadable");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) return resolve("no-store");
      const rq = db.transaction("kv", "readonly").objectStore("kv").get("wordquest:progress:v2");
      rq.onsuccess = () => resolve(rq.result === undefined ? "absent" : String(rq.result));
      rq.onerror = () => resolve("unreadable");
    };
  }));
}

/* A grade given the way a grown-up gives one: press, hold past 450 ms, let go.
   scroll:"none" is the point - a control below the fold must FAIL here rather
   than be quietly scrolled into view and reported as a pass. */
async function holdGrade(page, label, findings) {
  const button = page.getByRole("button", { name: label });
  try {
    await button.click({ scroll: "none", delay: 700, timeout: 5000 });
    return true;
  } catch (e) {
    findings.push({ kind: "unreachable-control", state: "grading",
      detail: `"${label}" could not be held where it sits: ${String(e).split("\n")[0].slice(0, 140)}` });
    return false;
  }
}

/* THE ACCESSIBILITY SWEEP — item 4 of the build spec, and its point is REACH
   rather than a new rule. G8 already runs axe-core over five screens and is
   the gate; this runs the same rule set over every cell the census visits, so
   the states G8 never sees — the close and the wrong reveal, the done screen,
   the update row, 44 words on 8 device profiles — are asked the same
   questions. A name a screen reader cannot say, a role that lies, a control
   with no accessible name, contrast that fails on ONE word and not another:
   none of those are things a geometry scan can see.

   THE SAME TAGS AS G8, deliberately. Two accessibility checks in one
   repository answering to different rule sets would let a state pass here and
   fail there, and nobody could say which was right.

   No new dependency: axe-core has been in the tree since G8 was built, and it
   is injected from node_modules rather than fetched — the census must not
   reach the network any more than the app must (S6). */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
let AXE_SRC = null;
async function axeViolations(page) {
  AXE_SRC ??= readFileSync("node_modules/axe-core/axe.min.js", "utf8");
  await page.addScriptTag({ content: AXE_SRC });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return r.violations.map((v) => ({
      id: v.id, impact: v.impact, count: v.nodes.length,
      /* The element, not just the rule. "color-contrast: 3 nodes" sends a
         person hunting; the selector and the failure summary do not. */
      where: v.nodes.slice(0, 3).map((n) => (n.target || []).join(" ")).join(" | "),
      why: (v.nodes[0]?.failureSummary || "").split("\n").filter(Boolean).slice(-1)[0] || "",
    }));
  }, AXE_TAGS);
}

/* THE REVEAL IS OVER WHEN THE ADVANCE CONTROL STAYS LIVE, not when it first
   goes live. The app enables it at 400 ms and TAKES IT BACK when the reveal's
   real length is known, re-arming it for the rest of the sound-out. Sampling
   inside that window reported "focus-lost" — a defect in the game that does not
   exist — because disabling a focused button drops focus to <body>. Measured
   with the voice clips delayed 900 ms: live at +192 ms, disabled again at
   +779 ms, live for good at +8726 ms. The window itself is a real finding and
   is docs/open-faults.md B17.

   This lived inline in one cell. It is a function now because item 3 adds three
   more states that have to wait the same way, and a wait that is copied is a
   wait that drifts. */
async function waitForReveal(page, timeout = 25000) {
  await page.locator(".wq-tile").first().waitFor({ timeout: 8000 });
  await page.waitForFunction(() => {
    const b = /** @type {HTMLButtonElement | null} */ (document.querySelector(".wq-rail .wq-cta"));
    if (!b || b.disabled) { window.__wqStable = 0; return false; }
    window.__wqStable = (window.__wqStable || 0) + 1;
    return window.__wqStable >= 5;
  }, null, { timeout, polling: 100 });
}

/* THE FOUR STATES A WORD NEVER REACHES — item 3 of the build spec.
   Until this landed the census saw the prompt and the CORRECT reveal, and
   nothing else. The close and the wrong reveals carry SPEC section 5's own
   sentences, which are the longest child-facing text in the game and the text
   most likely to wrap under a control; the done screen is the only screen a
   child reaches by finishing; and the update row is the only place in the app
   a parent can touch the network (S6).

   The done cell runs a REAL session, not free play, because free play never
   ends. That is why it is the one cell here that does not assert that the
   saved progress is unchanged: it deliberately saves a short session, which is
   what the app's own "Finish early" dialog offers. */
const GRADE = {
  correct: "✓ got it (hold)",
  close: "~ close (hold)",
  wrong: "↻ not yet (hold)",
};

/* The planted defects the controls run against. Each one is a fault this
   census exists to find, made on purpose, on a screen where the element it
   targets actually exists — and each CSS string here was corrected against a
   real browser rather than reasoned about: the app clips sideways overflow on
   `.wq-root` and absorbs it again on `.wq-stage`, and the action rail is
   positioned, so widening a control there never reaches the page's scroll
   width. A plant that plants nothing is a control that passes for the wrong
   reason, which is worse than no control at all. */
/* [kind, css, label]. The label exists because several kinds now carry more
   than one plant: one plant per detector proved only the branch that plant
   happened to take. An auditor deleted three of the four branches of the
   pseudo-element scan — ::before, position:fixed, and the paint test — and all
   25 controls stayed green, because the single shipped plant was an ::after,
   absolutely positioned, WITH TEXT, so `!text && !paints(cs)` short-circuited
   before paints() was ever called. The floors had the same hole: a 12px
   control against a 56px floor and a 6px label against a 12px floor prove the
   detector fires SOMEWHERE, and an auditor then set the floors to 20 and 8 and
   watched everything stay green. A boundary plant is what makes a floor a
   floor. */
const PLANTS = [
  ["horizontal-overflow",
   `html,body,.wq-root,.wq-shell,.wq-stage{overflow-x:auto !important;overflow:visible !important} .wq-home-title{width:3000px !important;display:block !important}`],
  ["element-past-the-edge", `.wq-home-title{ position:relative !important; left: 2000px !important; }`],
  ["control-too-small", `.wq-cta{ min-height:10px !important; height:12px !important; min-width:10px !important; width:12px !important; padding:0 !important; }`],
  ["control-obscured", `body::after{ content:""; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.01); }`],
  ["vertical-overflow", `html,body,.wq-root,.wq-shell,.wq-stage{overflow:visible !important;height:auto !important} .wq-home-title{height:4000px !important;display:block !important}`],
  ["nested-scroll", `.wq-stage{overflow-x:scroll !important} .wq-home-title{width:3000px !important;display:block !important}`],
  ["nothing-measured", `button,[role=button],a[href],input,select{display:none !important}`],
  /* THE AUDITOR'S BADGE, AS A SHIPPED PLANT. A control's own ::after, which is
     in no DOM scan and which elementFromPoint attributes to the control
     itself. On screen "▶️ Begin Session" reads "B NEW ssion". Every detector
     in this file was green against it until 2026-08-13. */
  ["pseudo-overlay",
   `.wq-cta::after{content:"NEW";position:absolute;left:50%;top:50%;width:60px;height:20px;`
   + `margin:-10px 0 0 -30px;background:#333;color:#fff;z-index:9;}`,
   "pseudo-overlay, an ::after with text"],
  /* The other three branches, each of which an auditor deleted with every
     control still green. The last three paint a control solid black without
     one byte of background: a screenshot of the button is a black rectangle. */
  ["pseudo-overlay", `.wq-cta::before{content:"";position:absolute;inset:0;background:#000;z-index:9;}`,
   "pseudo-overlay, a ::before rather than an ::after"],
  ["pseudo-overlay", `.wq-cta::after{content:"";position:fixed;inset:0;background:#000;z-index:9;}`,
   "pseudo-overlay, position:fixed rather than absolute"],
  ["pseudo-overlay", `.wq-cta::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 200px #000;z-index:9;}`,
   "pseudo-overlay, painting with a box-shadow and no background at all"],
  ["pseudo-overlay", `.wq-cta::after{content:"";position:absolute;inset:0;border-top:56px solid #000;z-index:9;}`,
   "pseudo-overlay, painting with a border and no background at all"],
  ["pseudo-overlay", `.wq-cta::after{content:"";position:absolute;inset:0;outline:200px solid #000;outline-offset:-200px;z-index:9;}`,
   "pseudo-overlay, painting with an outline and no background at all"],
  /* THE BOUNDARIES. Each of these is one pixel the wrong side of the limit it
     tests, so lowering the limit — which an auditor did to all four — makes the
     plant stop firing instead of firing anyway. */
  ["control-too-small",
   `.wq-cta{min-height:55px !important;height:55px !important;min-width:55px !important;width:55px !important;padding:0 !important}`,
   "control-too-small at the boundary: 55px against S7's 56px floor"],
  ["text-too-small", `button,.wq-cta,.wq-sbtn{font-size:11px !important}`,
   "text-too-small at the boundary: 11px against a 12px floor"],
  ["text-too-big", `button{font-size:35px !important}`,
   "text-too-big at the boundary: 35px against a 34px ceiling"],
];

export { cases, signature, inspect, pseudoOverlays, axeViolations, stage, holdGrade, savedState, seedGraduated, holdTheDice, requireStaged,
         waitForReveal, GRADE, AXE_TAGS,
         FONT_FLOOR, FONT_CEIL, MODAL_BOUNDARY, OVERLAYS, OVERLAY_Z,
         PROFILES, VIEWPORTS, CHILD_MIN, ADULT_MIN, PLANTS, BANK_WORDS, LONGEST_PRAISE };
