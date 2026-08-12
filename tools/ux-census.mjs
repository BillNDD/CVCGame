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
 * WHY NOT BRUTE FORCE. 439 words x 6 viewports x every state is roughly 17,000
 * renders, hours of machine time and a pile of evidence nobody reads. Instead
 * the bank is reduced to LAYOUT-RISK SIGNATURES — tile count, letter count and
 * the widest multi-letter unit — which is 29 classes, not 439. Every class is
 * rendered, plus the widest-glyph extreme inside each class.
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
 * Usage:
 *   node tools/ux-census.mjs --benchmark [n]   time n cells, estimate the run
 *   node tools/ux-census.mjs --run             the whole census
 *   node tools/ux-census.mjs --run --shard 1/2 half of it
 *   node tools/ux-census.mjs --self-test       prove every detector fires
 */
import { LEVELS, chunkWord, PRAISE, SESSION_SIZE } from "../src/engine.js";

const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => { const i = ARGS.indexOf(f); return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : d; };
const PORT = 4187;
const URL = `http://localhost:${PORT}/`;
const OUT = ".census";

/* The six the owner named, plus the 320 px extreme this repository already
   measures in G7. Touch is declared per profile because tap() and click() are
   different code paths in a browser, not two names for one thing. */
const VIEWPORTS = [
  { name: "phone-portrait", width: 390, height: 844, touch: true },
  { name: "phone-landscape", width: 844, height: 390, touch: true },
  { name: "tablet-portrait", width: 768, height: 1024, touch: true },
  { name: "tablet-landscape", width: 1024, height: 768, touch: true },
  { name: "tablet-large", width: 1180, height: 820, touch: true },
  { name: "desktop", width: 1366, height: 768, touch: false },
  { name: "narrow-extreme", width: 320, height: 568, touch: true },
];

/* S7's floors, as literals (E4): a child's control is 56 px, a grown-up's 44. */
const CHILD_MIN = 56;
const ADULT_MIN = 44;

// ---------------------------------------------------------------- the cases
const BANK = LEVELS.flatMap((l) => l.words.map((w) => ({ word: w, level: l.n })));
const WIDE = /[mwq]/g;                       // the widest glyphs in most faces

function signature(word) {
  const units = chunkWord(word);
  const multi = units.filter((u) => u.length > 1).sort((a, b) => b.length - a.length);
  return `${units.length}t-${word.length}L-${multi[0] || "none"}`;
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
    for (const el of document.querySelectorAll("button, [role=button], a[href], input, select")) {
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
        obscured: !(at === el || el.contains(at)),
        onTop: at ? at.tagName.toLowerCase() + "." + String(at.className).split(" ")[0] : "nothing",
        font: parseFloat(getComputedStyle(el).fontSize),
      });
    }
    return out;
  }, { childMin: CHILD_MIN, adultMin: ADULT_MIN });

  for (const c of controls) {
    if (c.floor && (c.h < c.floor - 0.5 || c.w < c.floor - 0.5))
      push("control-too-small", `"${c.name}" is ${c.w}x${c.h}px, floor ${c.floor}px (${c.klass})`);
    if (c.obscured)
      push("control-obscured", `"${c.name}" has ${c.onTop} on top of its own centre`);
  }

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
  if (opts.mustBeVisible) {
    for (const sel of opts.mustBeVisible) {
      const el = page.locator(sel).first();
      const box = await el.boundingBox().catch(() => null);
      if (!box) { push("missing", `${sel} is not on the page at all`); continue; }
      if (box.y + box.height > viewport.height + 1 || box.y < -1)
        push("below-the-fold", `${sel} sits at y=${Math.round(box.y)}..${Math.round(box.y + box.height)} in a ${viewport.height}px viewport`);
    }
  }
  /* Reported, not asserted: which controls carry no class of their own. It is
     worth knowing and it is not a defect. */
  const unclassified = controls.filter((c) => c.klass === "unclassified")
    .map((c) => `${c.name || "(no label)"} ${c.w}x${c.h}`);
  return { findings, aria, controls, unclassified, page: page_ };
}

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
  await page.getByText("🎲 Truly random").click({ timeout: 8000 });
  await page.locator(".wq-word").waitFor({ timeout: 8000 });
  const shown = (await page.locator(".wq-word").textContent()).trim();
  /* The praise line for this cell is the longest one, because the longest is
     the one that wraps under a control. Queued now, spent when the grown-up
     grades. */
  await page.evaluate((v) => { window.__wqQueue = [v]; }, dieFor(LONGEST_PRAISE, PRAISE.length));
  return { page, shown };
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

/* The planted defects the controls run against. Each one is a fault this
   census exists to find, made on purpose, on a screen where the element it
   targets actually exists — and each CSS string here was corrected against a
   real browser rather than reasoned about: the app clips sideways overflow on
   `.wq-root` and absorbs it again on `.wq-stage`, and the action rail is
   positioned, so widening a control there never reaches the page's scroll
   width. A plant that plants nothing is a control that passes for the wrong
   reason, which is worse than no control at all. */
const PLANTS = [
  ["horizontal-overflow",
   `html,body,.wq-root,.wq-shell,.wq-stage{overflow-x:auto !important;overflow:visible !important} .wq-home-title{width:3000px !important;display:block !important}`],
  ["element-past-the-edge", `.wq-home-title{ position:relative !important; left: 2000px !important; }`],
  ["control-too-small", `.wq-cta{ min-height:10px !important; height:12px !important; min-width:10px !important; width:12px !important; padding:0 !important; }`],
  ["control-obscured", `body::after{ content:""; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.01); }`],
];

export { cases, signature, inspect, stage, holdGrade, savedState, holdTheDice,
         VIEWPORTS, CHILD_MIN, ADULT_MIN, PLANTS, BANK_WORDS, LONGEST_PRAISE };
