/* THE ART BUDGET (art project step 0c, owner-ruled 2026-08-22: "12 MB for
 * all art ... a ceiling in the baseline that a gate enforces").
 *
 * S6 puts every asset on the device at install: a child who earns level 40
 * offline cannot fetch the basin, so the whole garden ships on day one and
 * its bytes are a promise the install keeps. The ceiling is over the ART,
 * never the whole build: the engineering chair's finding was that a
 * whole-dist ceiling would be spent by the voice pack (39 of 40 MB, growing
 * with every listening round) and that E6 forbids raising a ceiling - the
 * casual-raise trap by construction. So:
 *
 *   art_bytes_max      12,582,912 bytes over the TRACKED files under
 *                      app/public/art/ - deterministic, identical on the
 *                      runner and here, measurable in npm run check without
 *                      a build. A file's bytes are its bytes in git.
 *   precache_files_max 1,650 over the service worker's precache list in
 *                      app/dist/sw.js (1,490 today; the census crashed a
 *                      browser at a 1,500-file precache, and the worker
 *                      installs every one). Needs a build: the gauntlet's
 *                      step after `app build` runs it with --dist.
 *
 * With --dist it also requires the built art to equal the source art byte
 * for byte (the art is copied, never transformed), so the bytes the ceiling
 * measured are the bytes the worker precaches.
 *
 * Controls (--self-test): a 13 MB file planted in a scratch directory, never
 * in app/public or app/dist, must exceed the ceiling; a precache list of
 * 1,651 entries must be refused; a built file whose bytes differ from its
 * source must be refused; and the real tree must pass.
 *
 * Run: node tools/art-budget.mjs            (source bytes, in the check)
 *      node tools/art-budget.mjs --dist     (plus the precache list and the copy check)
 *      node tools/art-budget.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASELINE = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const ART = "app/public/art";

/* Tracked art files and their byte sizes - git's list, so an untracked stray
   on one machine cannot move the number. */
export function trackedArt(dir = ART) {
  let names = "";
  try { names = execFileSync("git", ["ls-files", "-z", "--", dir], { encoding: "utf8" }); } catch { return []; }
  return names.split("\0").filter(Boolean).map((f) => ({ file: f, bytes: existsSync(f) ? statSync(f).size : 0 }));
}

export function judge({ artFiles, ceiling, precacheCount = null, precacheMax, copies = null }) {
  const problems = [];
  const total = artFiles.reduce((n, f) => n + f.bytes, 0);
  if (total > ceiling) problems.push(`art is ${total.toLocaleString()} bytes over ${artFiles.length} files; the ceiling is ${ceiling.toLocaleString()}`);
  if (precacheCount !== null && precacheCount > precacheMax) problems.push(`the service worker precaches ${precacheCount} files; the ceiling is ${precacheMax}`);
  if (copies) for (const c of copies) if (!c.same) problems.push(`${c.file}: the built art differs from the source art (${c.why})`);
  return { total, problems };
}

function precacheList(swPath) {
  const sw = readFileSync(swPath, "utf8");
  const m = sw.match(/const ASSETS = (\[[\s\S]*?\]);/);
  return m ? JSON.parse(m[1]) : null;
}

function compareCopies(artFiles) {
  return artFiles.map(({ file }) => {
    const built = join("app/dist", file.replace(/^app\/public\//, ""));
    if (!existsSync(built)) return { file, same: false, why: "missing from app/dist" };
    const a = readFileSync(file), b = readFileSync(built);
    return { file, same: a.equals(b), why: a.equals(b) ? "" : `${a.length} bytes in source, ${b.length} built` };
  });
}

function selfTest() {
  const ok = [];
  const ceiling = BASELINE.art_bytes_max, pmax = BASELINE.precache_files_max;
  ok.push(["the ceilings are the ruled numbers", ceiling === 12582912 && pmax === 1650]);
  ok.push(["the real tracked art is under the ceiling", judge({ artFiles: trackedArt(), ceiling, precacheMax: pmax }).problems.length === 0]);
  /* The planted 13 MB, in a scratch directory the ceiling is pointed at. */
  const box = mkdtempSync(join(tmpdir(), "art-budget-"));
  mkdirSync(join(box, "art"));
  writeFileSync(join(box, "art", "WQ_GARDEN_STATE00_WIDE_v001.png"), Buffer.alloc(13 * 1024 * 1024));
  const planted = [{ file: join(box, "art", "WQ_GARDEN_STATE00_WIDE_v001.png"), bytes: statSync(join(box, "art", "WQ_GARDEN_STATE00_WIDE_v001.png")).size }];
  ok.push(["13 MB of planted art is refused", judge({ artFiles: planted, ceiling, precacheMax: pmax }).problems.some((p) => p.includes("the ceiling is"))]);
  rmSync(box, { recursive: true, force: true });
  ok.push(["a precache list one over the ceiling is refused", judge({ artFiles: [], ceiling, precacheCount: 1651, precacheMax: pmax }).problems.some((p) => p.includes("precaches 1651"))]);
  ok.push(["a precache list at the ceiling passes", judge({ artFiles: [], ceiling, precacheCount: 1650, precacheMax: pmax }).problems.length === 0]);
  ok.push(["a built file whose bytes differ from its source is refused",
    judge({ artFiles: [], ceiling, precacheMax: pmax, copies: [{ file: "app/public/art/x.png", same: false, why: "10 bytes in source, 9 built" }] }).problems.some((p) => p.includes("differs from the source"))]);
  const list = existsSync("app/dist/sw.js") ? precacheList("app/dist/sw.js") : "no build";
  ok.push(["the precache reader finds the worker's list, when there is a build to read", list === "no build" || (Array.isArray(list) && list.length > 0)]);
  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nart-budget controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

const art = trackedArt();
const facts = { artFiles: art, ceiling: BASELINE.art_bytes_max, precacheMax: BASELINE.precache_files_max };
if (process.argv.includes("--dist")) {
  const list = existsSync("app/dist/sw.js") ? precacheList("app/dist/sw.js") : null;
  if (!list) { console.log("PROBLEM: no app/dist/sw.js with a precache list - build first"); process.exit(1); }
  facts.precacheCount = list.length;
  facts.copies = compareCopies(art);
}
const { total, problems } = judge(facts);
for (const p of problems) console.log("PROBLEM: " + p);
console.log(`Art budget: ${art.length} tracked art files, ${total} bytes (max ${facts.ceiling})`
  + (facts.precacheCount != null ? `, precache ${facts.precacheCount} files (max ${facts.precacheMax})` : "") + `, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
