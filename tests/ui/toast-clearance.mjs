/* THE TOAST'S CLEARANCE - G7 checks 13-15, lifted out of tests/ui/interface.mjs
   on 2026-09-02 when a third check took that file past its 1400-line ceiling.
   A ceiling is never raised (E6), so the section moved instead. Nothing about
   the checks changed in the move; they are called with the runner's own
   harness so a failure is still one of G7's own. */
import { readFileSync } from "node:fs";

export async function toastClearance({ browser, URL, ok, fail, STORE_KEY }) {
/* 13-15 (A1-005) — a toast must clear the child's own control. The offset was
   a magic 112 px, which is not the height of anything: on a phone the toast
   covered the record control by 27 px and hid its label, and on iPad portrait
   by 3 px. The toast is raised by a real boot here — a stored value that is
   not valid JSON is read as damaged, and the app says so — and measured
   against the live rail control at three real device sizes. */
{
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const SIZES = [{ width: 390, height: 664 }, { width: 810, height: 1080 }, { width: 1280, height: 800 }];
  for (const vp of SIZES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize(vp);
    await page.goto(URL, { waitUntil: "load" });
    /* Let the boot finish before seeding: the app writes a fresh save of its
       own on first load, and that write lands on top of an early seed. */
    await page.getByRole("button", { name: "Begin Session" }).waitFor();
    await page.evaluate(([db, store, key]) => new Promise((resolve, reject) => {
      const rq = indexedDB.open(db, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(store);
      rq.onsuccess = () => {
        const tx = rq.result.transaction(store, "readwrite");
        tx.objectStore(store).put("{not json at all", key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      rq.onerror = () => reject(rq.error);
    }), [dbName, dbStore, STORE_KEY]);
    await page.reload({ waitUntil: "load" });
    const shown = await page.locator(".wq-toast").waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    if (!shown) { fail(`no toast at ${vp.width}x${vp.height}`, "the damaged-save boot raised none"); await context.close(); continue; }
    const t = await page.locator(".wq-toast").boundingBox();
    /* The home rail holds two child controls — Begin Session and Free play —
       and the toast must clear them BOTH, so the worst overlap is the verdict.
       An empty or unmeasurable rail must FAIL, never pass vacuously: a
       measurement of zero controls proves nothing about the toast. */
    /* The worst overlap between the toast and the two controls, or null when
       the rail cannot be measured - which must fail, never pass vacuously. */
    const worst = async () => {
      const box = await page.locator(".wq-toast").boundingBox();
      const boxes = [];
      for (const btn of await page.locator(".wq-rail .wq-cta").all()) boxes.push(await btn.boundingBox());
      if (!box || boxes.length !== 2 || boxes.some((b) => !b)) return null;
      return boxes.reduce((w, c) => Math.max(w, Math.min(box.y + box.height, c.y + c.height) - Math.max(box.y, c.y)), -Infinity);
    };
    const verdict = (over, what, where) => {
      if (over === null) fail(`the home rail did not offer two measurable child controls at ${vp.width}x${vp.height}`, where);
      else if (over <= 0) ok(`${what} at ${vp.width}x${vp.height} (gap ${Math.round(-over)}px)`);
      else fail(`${what} FAILED at ${vp.width}x${vp.height}`, `overlap ${Math.round(over)}px`);
    };
    verdict(await worst(), "the toast clears both child controls", "settled");
    /* THE ZONE GROWS AFTER THE TOAST IS UP (2026-09-02). The check above
       measures a settled screen, and a settled screen is not where this
       broke: the strip's marker line wrapped when the web font landed, after
       the last render, and nothing re-measured. Sixty pixels on the STRIP
       reproduces it exactly - the strip sits below the rail, so it lifts the
       rail's controls sixty pixels UP, towards a toast that is still placed
       against the old height. Growing the RAIL proves nothing and was the
       first version of this control: its padding moves its own controls down
       as far as its top edge moves up, so the gap cannot change and the
       check passed with the fault in place. */
    await page.evaluate(() => { document.querySelector(".wq-strip").style.paddingBottom = "60px"; });
    await page.waitForTimeout(250);
    verdict(await worst(), "the toast follows a zone that grows after it is up", "grown");
    await context.close();
  }
}
}
