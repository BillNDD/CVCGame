/* THE GAUNTLET'S SECOND LANE - a child the gauntlet spawns, never a command a
 * person runs. P2 of the speed plan (owner-ruled 2026-08-21: "lanes only if
 * they earn 20%"), built 2026-08-22 behind `--workers 2`, default 1.
 *
 * The parent hands this a list of [gate, command] pairs and a path to write
 * to. It runs them ONE AFTER ANOTHER - the lane is itself serial; the only
 * concurrency in the whole design is this lane beside G5 - with exactly the
 * environment and capture the parent's own step() uses, and writes every
 * gate's output, exit and duration to the path when the last has finished.
 * It parses nothing, judges nothing, prints nothing and takes no lock: the
 * parent is the sole reader of the baseline and the sole writer of the
 * evidence, which is what makes a laned run the same proof as a serial one.
 *
 * Which gates may ride here is decided in tools/gauntlet.mjs, not here, and
 * guarded there: only gates that read the tree and write nothing tracked,
 * and only beside G5, which rewrites the untracked engine and nothing else.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [, , listPath, outPath] = process.argv;
if (!listPath || !outPath) {
  console.error("usage: node tools/gauntlet-lane.mjs <lane-list.json> <results.json>   (spawned by tools/gauntlet.mjs)");
  process.exit(2);
}
const lane = JSON.parse(readFileSync(listPath, "utf8"));
const results = [];
for (const [gate, command] of lane) {
  let out = "", ok = true;
  const startedAt = Date.now();
  try {
    out = execSync(command, { stdio: "pipe", encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
    ok = false;
  }
  results.push({ gate, command, out, ok, durationMs: Date.now() - startedAt });
}
writeFileSync(outPath, JSON.stringify(results));
