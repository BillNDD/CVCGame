/* Network audit gate (G18). Safety rule S6 promises that the app makes no
   network calls after load, with two exceptions to the app's own host. Until
   now that promise was proven by READING THE SOURCE: tests/safety.test.js
   scans every shipped file for fetch, XMLHttpRequest, WebSocket, sendBeacon
   and analytics. That scan is fast and has negative controls, but it can only
   see the code it is pointed at — never a request made by a dependency, by an
   <img src>, by a stylesheet url(), or by any path its allowlist strips
   before scanning.

   This gate WATCHES THE BROWSER instead. It drives the built app through a
   real child's visit and records every request the page actually makes. A
   request to any origin other than the app's own fails the gate, whatever
   the source said.

   The allowlist is the whole of S6: same-origin only. version.json is
   same-origin too, so the update check needs no special case — a rule with
   no exceptions is a rule that cannot be quietly widened.

   Negative control (E5): a cross-origin request is planted in the live page
   and the recorder must catch it. Without that control a recorder that saw
   nothing would look identical to an app that asked for nothing.

   Run: npm run test:network */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = 4185;
const ORIGIN = `http://localhost:${PORT}`;
const URL = `${ORIGIN}/`;
let failures = 0, checks = 0;
const ok = (name) => { checks += 1; console.log(`ok ${checks}: ${name}`); };
const fail = (name, detail) => { failures += 1; console.error(`FAIL: ${name} — ${detail}`); };

if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: "app", stdio: "ignore", detached: true,
});
const stopServer = () => { try { process.kill(-server.pid); } catch {} };
for (let i = 0; i < 50; i++) {
  try { const r = await fetch(URL); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
/* The gauntlet's evidence file records WHICH browser saw this, so a report
   can never be read as covering a platform it never ran on. */
console.log(`browser: Chromium/${browser.version()}`);

/* Every request the context makes, from any page, worker or service worker.
   Recorded as {url, resourceType, from} so a failure names the offender. */
function recorder(context) {
  const seen = [];
  context.on("request", (r) => seen.push({ url: r.url(), type: r.resourceType() }));
  context.on("requestfailed", (r) => seen.push({ url: r.url(), type: r.resourceType() }));
  return seen;
}
const foreign = (seen) => seen.filter((r) =>
  !r.url.startsWith(ORIGIN) && !r.url.startsWith("data:") && !r.url.startsWith("blob:"));

/* 1 — a whole child's visit: load, a full word, the reveal, the done screen. */
{
  const context = await browser.newContext();
  const seen = recorder(context);
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.locator(".wq-word").waitFor();
  const grade = page.getByRole("button", { name: "✓ got it (hold)" });
  await grade.focus();
  await grade.press("Enter");
  await page.locator(".wq-tile").first().waitFor();
  await page.waitForTimeout(1200);          // let the reveal and any clip finish
  const bad = foreign(seen);
  if (bad.length === 0) ok(`a full word asks nothing of the network beyond its own host (${seen.length} requests, all same-origin)`);
  else fail("a child's session reached another host", JSON.stringify(bad.slice(0, 5)));
  await context.close();
}

/* 2 — the grown-up strip's update check: the S6 exception, and it must still
   be same-origin. 3 — a foreground return must not add a foreign request. */
{
  const context = await browser.newContext();
  const seen = recorder(context);
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: "load" });
  const check = page.getByRole("button", { name: "↻ Check for updates (hold)" });
  await check.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  if (await check.count()) {
    const box = await check.first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);          // past the 450 ms hold
    await page.mouse.up();
    await page.waitForTimeout(400);
    const version = seen.filter((r) => r.url.includes("version.json"));
    const bad = foreign(seen);
    if (bad.length) fail("the update check reached another host", JSON.stringify(bad.slice(0, 5)));
    else if (version.length === 0) fail("the update check made no version request", "expected one version.json request");
    else ok(`the update check asks its own host only (${version.length} version.json request(s), 0 foreign)`);
  } else {
    fail("the update control was not found on the home screen", "expected a 'Check for updates' hold button");
  }

  const before = seen.length;
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(500);
  const bad2 = foreign(seen);
  if (bad2.length === 0) ok(`returning to the foreground stays on the app's own host (${seen.length - before} further requests)`);
  else fail("a foreground return reached another host", JSON.stringify(bad2.slice(0, 5)));
  await context.close();
}

/* 4 — negative control: the recorder must SEE a foreign request. A planted
   cross-origin fetch is caught even though it can never succeed here, because
   the request event fires when the browser tries. */
{
  const context = await browser.newContext();
  const seen = recorder(context);
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "load" });
  await page.evaluate(() => {
    fetch("https://analytics.example.invalid/collect?child=1").catch(() => {});
    const img = document.createElement("img");
    img.src = "https://tracker.example.invalid/pixel.gif";
    document.body.appendChild(img);
  });
  await page.waitForTimeout(600);
  const caught = foreign(seen);
  const sawFetch = caught.some((r) => r.url.includes("analytics.example.invalid"));
  const sawImg = caught.some((r) => r.url.includes("tracker.example.invalid"));
  if (sawFetch && sawImg)
    console.log(`control OK: the recorder catches a planted fetch AND a planted image request (${caught.length} foreign requests seen)`);
  else fail("negative control broken", `a planted cross-origin request was not recorded: fetch=${sawFetch} img=${sawImg}`);
  await context.close();
}

await browser.close();
stopServer();
console.log(`\nG18 network audit: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
