/* A recording of the sound-out reveal, taken from the REAL app.
 *
 * The owner reviews this feature by watching the built game, not a demo page.
 * A demo cannot show whether the thing that shipped works: round 8 offered a
 * listener two identical files as different candidates, and the rule that came
 * out of it is that a mock is never proof.
 *
 * So this drives the built app in a browser and captures what the app itself
 * produces:
 *
 *   VIDEO  frames from the real page, at the real layout, with the real CSS.
 *   AUDIO  the app's own output. `ctx.destination` is replaced with a gain
 *          node wired BOTH to the real destination and to a media-stream
 *          destination that a MediaRecorder writes down. Every clip and the
 *          hum pass through it, so what is recorded is what a child hears —
 *          not a reconstruction of it.
 *
 * It also asserts the two facts a video cannot show on its own: that the tile
 * outlines land on the times the player scheduled, and that those times came
 * from the clips rather than from a guess.
 *
 * Usage: node tools/record-reveal.mjs <out_dir> [word]
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const OUT = process.argv[2] || "reveal-recording";
const WANT = process.argv[3] || "";
const ROOT = "app/dist";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".mp3": "audio/mpeg", ".png": "image/png",
  ".ico": "image/x-icon", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

mkdirSync(OUT, { recursive: true });
if (!existsSync(join(ROOT, "index.html"))) {
  console.error("no build to record — run: npm run build --prefix app");
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  let file = join(ROOT, normalize(path === "/" ? "/index.html" : path));
  if (!existsSync(file)) file = join(ROOT, "index.html");
  res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = "http://127.0.0.1:" + server.address().port + "/";

const browser = await chromium.launch({
  /* The same launch the browser gates use: this image ships one Chromium at a
     fixed path and no downloader. */
  executablePath: existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required",
    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
/* Playwright's own capture, rather than a screenshot loop: a full-page
   screenshot costs about a fifth of a second, which gave 13 frames over the
   whole reveal — a slideshow, not a recording. */
const ctx = await browser.newContext({
  viewport: { width: 820, height: 1180 },
  recordVideo: { dir: OUT, size: { width: 820, height: 1180 } },
});

/* Tap the app's own audio output before any of its code runs. The app only
   ever uses ctx.destination as something to connect to, so handing it a gain
   node that feeds both the speakers and a recorder changes nothing about what
   it plays. */
await ctx.addInitScript(() => {
  const Real = window.AudioContext;
  window.__tap = { chunks: [], ready: null };
  window.AudioContext = class extends Real {
    constructor(...a) {
      super(...a);
      const bus = super.createGain();
      const rec = super.createMediaStreamDestination();
      bus.connect(super.destination);
      bus.connect(rec);
      this.__bus = bus;
      /* Held until the reveal begins, so the audio file starts where the
         video is trimmed to and the two need no alignment guesswork. */
      const mr = new MediaRecorder(rec.stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => e.data.size && window.__tap.chunks.push(e.data);
      window.__tap.start = () => mr.start(100);
      window.__tap.stop = () => new Promise((res) => { mr.onstop = res; mr.stop(); });
    }
    get destination() { return this.__bus || super.destination; }
  };
  window.WebkitAudioContext = window.AudioContext;
});

const page = await ctx.newPage();
const pageOpened = Date.now();

await page.goto(base, { waitUntil: "networkidle" });
/* Free play, truly random, draws from the WHOLE bank at once — every level,
   in one sitting. It is the only way to reach a four-tile word on a fresh
   device without writing in a state the game would never have built, and it
   is an ordinary mode a child can choose from the home screen. */
await page.getByText("🎈 Free play").click();
await page.getByText("🎲 Truly random").click();
await page.waitForTimeout(300);

const shown = async () => (await page.locator(".wq-word").textContent());
/* Truly random draws from the whole bank, so reaching one NAMED word takes as
   many draws as the bank is wide. 30 was enough to find any four-tile word and
   nowhere near enough to find a chosen one: asked for "of" it walked past 30
   words and recorded "mop" without a word of complaint, which is a tool
   presenting something other than what was asked for. */
const TRIES = WANT ? 1200 : 30;
let found = !WANT;
for (let i = 0; i < TRIES; i++) {
  const w = await shown();
  if (WANT ? w === WANT : w.length >= 4) { found = true; break; }
  /* Free play never ends, so walking it forward costs nothing and records
     nothing: its results land in a throwaway clone. */
  await page.getByLabel("✓ got it (hold)").press("Enter");
  await page.getByRole("button", { name: /Next word|Finish!/ }).click({ timeout: 20000 });
  await page.waitForTimeout(120);
}
const word = await shown();
if (!found) {
  await browser.close();
  throw new Error(`asked for "${WANT}" and it did not come up in ${TRIES} draws. `
    + `Recording a different word would be a recording of the wrong thing.`);
}

/* Sample the tiles on the PAGE's own clock, every 25 ms. Timing taken from
   the driver instead lands wherever a screenshot happened to finish — a first
   attempt read the first outline at 1174 ms when the app had put it at 3592,
   because each screenshot costs a fifth of a second. */
await page.evaluate(() => {
  window.__t0 = performance.now();
  window.__s = [];
  window.__iv = setInterval(() => {
    window.__s.push({ at: Math.round(performance.now() - window.__t0),
      tiles: [...document.querySelectorAll(".wq-tile")].map((e) => ({
        g: e.textContent, on: e.classList.contains("wq-pop"),
        ms: e.style.getPropertyValue("--wqpop") })) });
  }, 25);
});

const SECONDS = 11;
await page.evaluate(() => window.__tap.start());
const t0 = Date.now();
await page.getByLabel("✓ got it (hold)").press("Enter");
await page.waitForTimeout(SECONDS * 1000);
const states = await page.evaluate(() => { clearInterval(window.__iv); return window.__s; });

/* The moment each tile's outline first appears, read off those samples. */
const pops = [];
for (let i = 1; i < states.length; i++) {
  states[i].tiles.forEach((t, j) => {
    if (t.on && !(states[i - 1].tiles[j] || {}).on) pops.push({ at: states[i].at, text: t.g, ms: t.ms });
  });
}
const audio = await page.evaluate(async () => {
  await window.__tap.stop();
  const blob = new Blob(window.__tap.chunks, { type: "audio/webm" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
});

writeFileSync(join(OUT, "audio.webm"), Buffer.from(audio, "base64"));
writeFileSync(join(OUT, "pops.json"), JSON.stringify(
  { word, pops, trim_s: (t0 - pageOpened) / 1000, seconds: SECONDS, states }, null, 1));

console.log(`word: ${word}`);
console.log(`tile outlines, as they appeared in the page:`);
for (const p of pops) console.log(`  "${p.text}" at ${p.at} ms, for ${p.ms}`);
console.log(`${(Buffer.from(audio, "base64").length / 1024).toFixed(0)} KB of the app\u2019s own audio`);

await page.close();
const video = await page.video().path();
await browser.close();
server.close();
writeFileSync(join(OUT, "video-path.txt"), video);
console.log(`video: ${video}`);
console.log(`trim the video by ${((t0 - pageOpened) / 1000).toFixed(2)}s to reach the reveal`);
