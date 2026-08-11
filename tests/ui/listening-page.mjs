/* Does a listening page give the owner their answers back? (G21)

   On 2026-08-11 the owner listened to a whole round of seventeen words, pressed
   "Copy all answers", and lost every mark. Two faults compounded: the clipboard
   call is blocked inside an embedded viewer, and the fallback revealed a
   textarea that sat at the very bottom of a 2400 KB document - below the fold,
   invisible from the sticky footer the reader was standing on. The button
   looked dead, and an evening of listening was gone.

   No automated check could have caught that, because nothing drove the page.
   This one does: it builds a real page from a real batch, marks it in a real
   browser with the clipboard DENIED, and proves the answers are recoverable
   anyway - visible on screen, and still there after the tab is closed.

   Negative control (E5): the same drive is run against a page with the fix
   removed, and it must fail. A check that only ever sees the fixed page cannot
   tell a working export from a broken one.

   Run: npm run test:listening */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failures = 0, checks = 0;
const ok = (name) => { checks += 1; console.log(`ok ${checks}: ${name}`); };
const fail = (name, detail) => { failures += 1; console.error(`FAIL: ${name} — ${detail}`); };

const work = mkdtempSync(join(tmpdir(), "wq-listen-"));
const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const shutdown = () => { try { browser.close(); } catch {} try { rmSync(work, { recursive: true, force: true }); } catch {} };
process.on("exit", shutdown);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { shutdown(); process.exit(130); });
process.on("uncaughtException", (e) => { shutdown(); console.error(e); process.exit(1); });
process.on("unhandledRejection", (e) => { shutdown(); console.error(e); process.exit(1); });

/* A two-item batch is enough to drive every path, and it keeps the check fast.
   The audio is a real, decodable silent mp3 frame so the page's decoder is
   exercised rather than stubbed. */
const SILENT_MP3 = "//OkxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
const batch = {
  title: "Control batch — two items",
  tally: "a control, not a round",
  items: [
    { kind: "word", text: "cat", note: "", arms: [
      { id: "cat_1", family: "listen", ms: 400, b64: SILENT_MP3, sha: "x" },
      { id: "cat_2", family: "say", ms: 400, b64: SILENT_MP3, sha: "y" }] },
    { kind: "sentence", id: "s01", text: "The cat sat.", note: "", arms: [
      { id: "s01", family: "sentence", ms: 900, b64: SILENT_MP3, sha: "z" }] },
  ],
};
writeFileSync(join(work, "batch-data.json"), JSON.stringify(batch));

function buildPage(target, mutate) {
  execFileSync("python3", ["tools/build_page.py", work, target], { stdio: "pipe" });
  if (mutate) writeFileSync(target, mutate(readFileSync(target, "utf8")));
  return "file://" + target;
}

/* The clipboard is denied for the whole run. That is the condition the owner
   actually met, and the condition under which the old page failed silently. */
async function drive(url, { reload }) {
  const context = await browser.newContext();
  await context.grantPermissions([]);
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      get: () => ({ writeText: () => Promise.reject(new Error("blocked in this frame")) }),
    });
    document.execCommand = () => false;
    window.alert = () => { throw new Error("alert is blocked in this frame"); };
  });
  await page.goto(url, { waitUntil: "load" });
  await page.locator(".card").first().waitFor();
  await page.locator('.mark.perfect[data-id="cat_1"]').click();
  await page.locator('.cmt input[data-item="cat"]').fill("clear and warm");
  await page.locator('.mark.close[data-id="s01"]').click();
  if (reload) { await page.reload({ waitUntil: "load" }); await page.locator(".card").first().waitFor(); }
  await page.getByRole("button", { name: /copy all answers/i }).click();
  await page.waitForTimeout(200);
  const box = page.locator("#out");
  const visible = await box.isVisible();
  const inViewport = visible ? await box.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
  }) : false;
  const value = visible ? await box.inputValue() : "";
  const status = (await page.locator("#status").textContent()) || "";
  await context.close();
  return { visible, inViewport, value, status };
}

const good = buildPage(join(work, "page.html"));

{
  const r = await drive(good, { reload: false });
  if (!r.visible) fail("the export box is not shown", "pressing copy left nothing on screen");
  else if (!r.inViewport) fail("the export box is off screen", "it is shown but not where the reader is standing — the exact 2026-08-11 fault");
  else ok("with the clipboard blocked, the answers appear on screen where the reader is standing");

  if (r.value.includes("cat | perfect | cat_1 | clear and warm")) ok("the export carries the word verdict, the chosen arm and the comment");
  else fail("the word verdict is not in the export", JSON.stringify(r.value));

  if (r.value.includes("s01 | closest | s01 |")) ok("the export carries the sentence verdict");
  else fail("the sentence verdict is not in the export", JSON.stringify(r.value));

  if (/ctrl\+c|cmd\+c/i.test(r.status)) ok("the reader is told exactly what to do when the clipboard is blocked");
  else fail("no usable instruction when the clipboard is blocked", JSON.stringify(r.status));
}

{
  const r = await drive(good, { reload: true });
  if (r.value.includes("cat | perfect | cat_1 | clear and warm") && r.value.includes("s01 | closest"))
    ok("marks survive the tab being reloaded — a closed page no longer costs the round");
  else fail("marks did not survive a reload", JSON.stringify(r.value));
}

/* Negative control: strip the fix and the drive above must fail. */
{
  const broken = buildPage(join(work, "broken.html"), (html) =>
    html.replace("#out{width:100%;height:132px", "#out{position:absolute;top:-9999px;width:100%;height:132px"));
  const r = await drive(broken, { reload: false });
  if (!r.inViewport) console.log(`control OK: a page whose export box is parked off screen is caught (visible=${r.visible}, in view=${r.inViewport})`);
  else fail("negative control broken", "an off-screen export box was not detected");
}

{
  const broken = buildPage(join(work, "broken2.html"), (html) =>
    html.replace("function save() {", "function save() { return;"));
  const r = await drive(broken, { reload: true });
  if (!r.value.includes("cat | perfect | cat_1")) console.log("control OK: a page that does not save marks is caught by the reload check");
  else fail("negative control broken", "a page with saving removed still restored its marks");
}

await browser.close();
console.log(`\nG21 listening page: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
