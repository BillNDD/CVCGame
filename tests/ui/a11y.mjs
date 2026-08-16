/* Accessibility gate (G8). Playwright + axe-core over five screens, plus a
   computed-contrast walker (never eyeballed), a 200 percent text check, and a
   reduced-motion check. Negative controls run inline:
   - an injected unlabeled button must produce an axe violation;
   - an injected low-contrast line must be flagged by the walker;
   - a mid-hold snapshot without reduced motion must show a live animation.
   Run: npm run test:a11y */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { STORE_KEY } from "../../src/engine.js";

const PORT = 4184;
const URL = `http://localhost:${PORT}/`;
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
let failures = 0, checks = 0;
const ok = (name) => { checks += 1; console.log(`ok ${checks}: ${name}`); };
const fail = (name, detail) => { failures += 1; console.error(`FAIL: ${name} — ${detail}`); };

if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });
/* vite through node itself: "npx" is not spawnable on Windows (ENOENT), the
   same fault the mutant runners fixed on 2026-08-15. The bin path is the
   app's own vite, resolved from the cwd the server runs in. */
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: "app", stdio: "ignore", detached: true,
});
const stopServer = () => { try { process.platform === "win32" ? server.kill() : process.kill(-server.pid); } catch {} };
for (let i = 0; i < 50; i++) {
  try { const r = await fetch(URL); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

async function runAxe(page) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v) => v.id + ": " + v.nodes.length + " nodes");
  });
}

/* Contrast walker: computes the WCAG ratio of every lettered text node against
   its composed background. Gradients contribute every stop; the worst one
   counts. Disabled controls are exempt, as in WCAG. */
const WALKER = `(() => {
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => 0.2126 * toLin(rgb[0]) + 0.7152 * toLin(rgb[1]) + 0.0722 * toLin(rgb[2]);
  const ratio = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
  const parse = (s) => { const m = s && s.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/);
    return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const mix = (top, a, under) => [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a));
  const compose = (layers, base) => { let c = base; for (let i = layers.length - 1; i >= 0; i--) c = mix(layers[i].rgb, layers[i].a, c); return c; };
  function bgCandidates(el) {
    const layers = []; let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage.includes("gradient")) {
        const stops = [...cs.backgroundImage.matchAll(/rgba?\\([^)]+\\)/g)].map((m) => parse(m[0])).filter(Boolean);
        if (stops.length) return stops.map((st) => compose(layers, st.rgb));
      }
      const bc = parse(cs.backgroundColor);
      if (bc && bc.a > 0) { layers.push(bc); if (bc.a >= 0.999) return [compose(layers.slice(0, -1), bc.rgb)]; }
      node = node.parentElement;
    }
    return [compose(layers, [255, 255, 255])];
  }
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
    if (!/[A-Za-z0-9]/.test(text)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest("[disabled]") || el.disabled) continue;
    let alpha = 1; let node = el;
    while (node && node.nodeType === 1) { alpha *= parseFloat(getComputedStyle(node).opacity) || 1; node = node.parentElement; }
    const fg = parse(cs.color); if (!fg) continue;
    const worst = Math.min(...bgCandidates(el).map((bg) => ratio(mix(fg.rgb, fg.a * alpha, bg), bg)));
    if (worst < 4.5) bad.push(text.trim().slice(0, 30) + " @ " + worst.toFixed(2));
  }
  return bad;
})()`;

const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize({ width: 390, height: 720 });
await page.goto(URL, { waitUntil: "load" });
await page.getByRole("button", { name: "Begin Session" }).waitFor();

const screens = [];
const audit = async (name) => {
  const axe = await runAxe(page);
  if (axe.length === 0) ok(`axe clean on ${name} (WCAG 2.1 A/AA)`);
  else fail(`axe violations on ${name}`, axe.join("; "));
  const contrast = await page.evaluate(WALKER);
  if (contrast.length === 0) ok(`contrast >= 4.5:1 on every lettered text node of ${name}`);
  else fail(`low contrast on ${name}`, contrast.join("; "));
  screens.push(name);
};

/* home */
await audit("home");
/* controls: an injected unlabeled button must trip axe; a grey line must trip the walker */
{
  await page.evaluate(() => {
    const b = document.createElement("button"); b.id = "wq-control-a"; document.body.appendChild(b);
    const p = document.createElement("p"); p.id = "wq-control-b"; p.textContent = "control";
    p.style.cssText = "color:#cccccc;background:#ffffff;"; document.body.appendChild(p);
  });
  const axe = await runAxe(page);
  const contrast = await page.evaluate(WALKER);
  await page.evaluate(() => { document.getElementById("wq-control-a").remove(); document.getElementById("wq-control-b").remove(); });
  if (axe.length > 0) console.log("control OK: axe reports the planted unlabeled button");
  else fail("axe negative control broken", "planted violation not reported");
  if (contrast.length > 0) console.log("control OK: the walker flags the planted grey-on-white line");
  else fail("contrast negative control broken", "planted low contrast not flagged");
}

/* Seed a save whose most secure word is tricky ("is"), so the session opens
   with it and the feedback audit ALWAYS covers the tricky-word note. Before
   this seed the note was audited only when the shuffle happened to serve a
   tricky word — a stochastic blind spot that hid a real contrast failure.
   The database and store names come from the live adapter source, and the
   key from the live engine, so the seed follows any rename. */
{
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const seeded = JSON.stringify({
    version: 3, level: 1, sessionsCompleted: 0, perfectStreak: 0,
    settings: { sound: true, childName: "", lang: "en-US" },
    words: { is: { box: 5, attempts: 3, correct: 3, close: 0, wrong: 0, dueAt: 1, lastSession: 0 } },
    log: [],
  });
  await page.evaluate(([db, store, key, value]) => new Promise((resolve, reject) => {
    const rq = indexedDB.open(db, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(store);
    rq.onsuccess = () => {
      const tx = rq.result.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    rq.onerror = () => reject(rq.error);
  }), [dbName, dbStore, STORE_KEY, seeded]);
  await page.reload();
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
}

/* session (ready) */
await page.getByRole("button", { name: "Begin Session" }).click();
await page.locator(".wq-word").waitFor();
await audit("session");

/* feedback */
{
  const b = page.getByRole("button", { name: "✓ got it (hold)" });
  await b.focus(); await b.press("Enter");
  await page.locator(".wq-tile").first().waitFor();
  await page.waitForTimeout(500);
  /* A2-011 — the inert advance control, measured on purpose. WCAG exempts an
     inactive component and the walker above skips it by design, but this one
     waits about six seconds on every word and it is the control the grown-up
     is watching. Two backgrounds: the control's own, and the part the fill
     band has already crossed, which is the control's colour darkened by the
     band's own alpha. */
  {
    const m = await page.evaluate(() => {
      const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const lum = (p) => 0.2126 * toLin(p[0]) + 0.7152 * toLin(p[1]) + 0.0722 * toLin(p[2]);
      const ratio = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
      const parse = (s) => { const q = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        return q ? { rgb: [+q[1], +q[2], +q[3]], a: q[4] === undefined ? 1 : +q[4] } : null; };
      const btn = document.querySelector(".wq-rail button.wq-cta");
      if (!btn || !btn.disabled) return { inert: false };
      const cs = getComputedStyle(btn);
      const fg = parse(cs.color).rgb, bg = parse(cs.backgroundColor).rgb;
      const fillEl = btn.querySelector(".wq-ctafill");
      const fill = fillEl ? parse(getComputedStyle(fillEl).backgroundColor) : null;
      const band = fill ? [0, 1, 2].map((i) => fill.rgb[i] * fill.a + bg[i] * (1 - fill.a)) : bg;
      return { inert: true, bare: ratio(fg, bg), band: ratio(fg, band) };
    });
    if (m.inert && m.bare >= 4.5 && m.band >= 4) {
      ok(`inert advance control: label ${m.bare.toFixed(2)}:1 on its own colour, ${m.band.toFixed(2)}:1 under the fill`);
    } else fail("inert advance control label", JSON.stringify(m));
  }
  const note = page.locator("text=Tricky word!");
  if (await note.count() > 0) ok("the tricky-word note is on the audited feedback screen");
  else fail("tricky-word note missing", "the seeded tricky word did not show its note");
  await audit("feedback");
}

/* done (via the honest early exit) */
await page.getByRole("button", { name: "Leave session" }).click();
await page.getByRole("button", { name: "Save 1 as a short session" }).click();
await page.getByText("Good stop").waitFor();
await audit("done");

/* grown-ups */
await page.getByRole("button", { name: "Back home" }).click();
await page.getByRole("button", { name: "Grown-ups corner" }).click();
await page.getByText("Danger zone").waitFor();
await audit("grown-ups");

/* 200 percent text: the stage scrolls, nothing is cut off */
{
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const g = await page.evaluate(() => {
    const stage = document.querySelector(".wq-stage");
    stage.scrollTop = stage.scrollHeight;
    const last = stage.firstElementChild.lastElementChild.getBoundingClientRect();
    return {
      noHorizontal: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      stageScrolls: stage.scrollHeight > stage.clientHeight,
      reachable: last.bottom <= stage.getBoundingClientRect().bottom + 1,
    };
  });
  if (g.noHorizontal && g.stageScrolls && g.reachable) ok("200 percent text: grown-ups stage scrolls, nothing clipped");
  else fail("200 percent text on grown-ups", JSON.stringify(g));
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });

  /* The session at 200 percent text. This block used to switch the app into
     "You judge" first, because there were two session screens to audit and the
     mic one was the default; there is one now, so the switch went with the
     mode on 2026-08-12 and the audit keeps its own subject — the zoom, below,
     which nothing else covers. */
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.locator(".wq-word").waitFor();
  await page.getByText("Say the word out loud!").waitFor();
  await audit("session at the grown-up prompt");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const s = await page.evaluate(() => {
    const stage = document.querySelector(".wq-stage");
    return {
      noHorizontal: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      canScroll: getComputedStyle(stage).overflowY === "auto",
    };
  });
  if (s.noHorizontal && s.canScroll) ok("200 percent text: session stage can scroll, no horizontal cut");
  else fail("200 percent text on session", JSON.stringify(s));
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
}

/* reduced motion kills every animation; without it the hold fill animates */
{
  const hold = page.getByRole("button", { name: "~ close (hold)" });
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  const liveAnims = await page.evaluate(() => document.getAnimations().length);
  await page.mouse.up();
  if (liveAnims > 0) console.log("control OK: without reduced motion, the hold fill animates");
  else fail("motion negative control broken", "no animation seen mid-hold");
  await context.close();

  const rmContext = await browser.newContext({ reducedMotion: "reduce" });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(URL, { waitUntil: "load" });
  const rmHome = await rmPage.evaluate(() => document.getAnimations().length);
  await rmPage.getByRole("button", { name: "Begin Session" }).click();
  await rmPage.locator(".wq-word").waitFor();
  const rmSession = await rmPage.evaluate(() => document.getAnimations().length);
  const rmHold = rmPage.getByRole("button", { name: "~ close (hold)" });
  const rmBox = await rmHold.boundingBox();
  await rmPage.mouse.move(rmBox.x + rmBox.width / 2, rmBox.y + rmBox.height / 2);
  await rmPage.mouse.down();
  await rmPage.waitForTimeout(200);
  const rmMidHold = await rmPage.evaluate(() => document.getAnimations().length);
  await rmPage.mouse.up();
  await rmPage.waitForTimeout(400);
  await rmHold.focus();
  await rmHold.press("Enter");
  await rmPage.locator(".wq-tile").first().waitFor();
  /* B17 (2026-08-15): nothing is armed at grade time. On the PACK path the
     clips schedule, the wait's length becomes known, and the fill appears —
     the one animation that must survive reduced motion (A1-004). On the
     FALLBACK path there is no known length and therefore no fill AT ALL, by
     design ("no length means no fill"), so there is nothing to keep. Which
     path ran is measured, not assumed — the same discipline as G7's timing
     check — and each path gets its own honest assertion. */
  const path = await Promise.race([
    rmPage.locator(".wq-ctafill").waitFor({ timeout: 8000 }).then(() => "pack"),
    rmPage.waitForFunction(() => { const b = document.querySelector(".wq-rail .wq-cta"); return !!b && !b.disabled; }, null, { timeout: 8000 }).then(() => "fallback"),
  ]).catch(() => "neither");
  const rmFeedbackAnims = await rmPage.evaluate(() => document.getAnimations()
    .map((a) => (a.effect && a.effect.target ? String(a.effect.target.className) : "?")));
  const rmFill = rmFeedbackAnims.filter((c) => c.includes("wq-ctafill")).length;
  const rmFeedbackOther = rmFeedbackAnims.length - rmFill;
  if (rmHome + rmSession + rmMidHold + rmFeedbackOther === 0)
    ok("reduced motion: no animation on home, session, mid-hold, or feedback beyond the advance fill");
  else fail("reduced motion left animations running", JSON.stringify({ rmHome, rmSession, rmMidHold, rmFeedbackOther, rmFeedbackAnims }));
  if (path === "pack" && rmFill === 1) ok("reduced motion keeps the one animation that carries information: the advance fill (pack path)");
  else if (path === "fallback" && rmFill === 0) ok("reduced motion on the fallback path: no fill exists to keep, and none was invented (B17)");
  else fail("the advance fill does not match its path under reduced motion", JSON.stringify({ path, rmFill, rmFeedbackAnims }));
  await rmContext.close();
}

await browser.close();
stopServer();
console.log(`\nG8 accessibility gate: ${checks} checks passed, ${failures} failed (screens: ${screens.join(", ")})`);
process.exit(failures ? 1 : 0);
