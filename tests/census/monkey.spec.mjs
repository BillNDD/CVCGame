/* THE MONKEY CELL - one per device profile, in the every-beta novelties scope.
   Owner-ruled 2026-08-22 (bug-hunt page, monkey: A): "a Playwright monkey
   cell - 300 random taps on visible controls per profile, invariants: no
   console error, a child control always visible, the screen changes within
   3 s, the principal word never moves mid-attempt; seeded, so a failure
   replays". The detector is tools/census-novelties.mjs `monkey`; its
   planted-fault controls live in novelties-once.spec.mjs (E5).

   The seed is the commit, so the same build walks the same taps on every
   machine; CENSUS_MONKEY_SEED replays a run by hand. Both are written into
   the cell's annotations so the report says which walk it was. */
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { seedGraduated } from "../../tools/ux-census.mjs";
import { monkey } from "../../tools/census-novelties.mjs";

/* 300 by the ruling; CENSUS_MONKEY_TAPS shortens a dry run by hand and the
   cell then says so in its title, so a short walk can never read as the
   every-beta one. */
const TAPS = Number(process.env.CENSUS_MONKEY_TAPS || 300);
function seedFor(profile) {
  const env = process.env.CENSUS_MONKEY_SEED;
  const commit = execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { encoding: "utf8" }).trim();
  /* One seed per profile, from the commit: the same tap on eight different
     screens is eight different walks, but the walk on a given profile is the
     same walk tomorrow. */
  let h = Number.parseInt(commit, 16) >>> 0;
  for (const ch of profile) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return { seed: env ? Number(env) : h, commit };
}

test(`monkey: ${TAPS} random taps as a child, four invariants after each`, async ({ page }, testInfo) => {
  test.setTimeout(20 * 60 * 1000);
  const { seed, commit } = seedFor(testInfo.project.name);
  testInfo.annotations.push({ type: "seed", description: `${seed} (commit ${commit}; replay with CENSUS_MONKEY_SEED=${seed})` });
  await page.goto("/", { waitUntil: "load" });
  await seedGraduated(page);
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const result = await monkey(page, { taps: TAPS, seed });
  testInfo.annotations.push({ type: "walk", description: `${result.taps} taps over ${result.seen.length} distinct controls: ${result.seen.join(" | ")}` });
  expect(result.taps).toBe(TAPS);
  expect(result.findings, JSON.stringify(result.findings, null, 1)).toEqual([]);
});
