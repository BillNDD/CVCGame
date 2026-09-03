/* THE GARDEN IS REGENERATED AND COMPARED, BYTE FOR BYTE - art step 6.
 *
 * The owner's first instruction when the art began was that everything be kept
 * "in immutable form and replicable form". tools/art/garden.py is the
 * replicable half: every motif is a hand-authored map or row table, nothing
 * samples a random source, so the same source renders the same pixels on any
 * machine on any day. This file is the immutable half, and the difference
 * between the two is the difference between a claim and a gate.
 *
 * WHAT IT DOES. For every profile the scene family pins, it runs garden.py,
 * hashes what comes out, and compares that to the sha256 in
 * tools/art/provenance.json. A pinned file that no longer regenerates means one
 * of two things, and both are worth stopping for: the source changed without
 * the pin being updated, or the render is not deterministic after all.
 *
 * WHY A HASH AND NOT A LOOK. Art is judged by eye, once, by the owner. After
 * that the only question is whether the bytes he approved are the bytes that
 * ship, and that is not a question an eye can answer - the tile family learned
 * this in August when a 2x export drifted from its master by a rounding rule
 * nobody could see.
 *
 * Run:      node tools/art-render.mjs            (regenerate and compare)
 *           node tools/art-render.mjs --write    (adopt what renders now, after
 *                                                 the owner has approved it)
 * Controls: node tools/art-render.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const LEDGER = "tools/art/provenance.json";
const SOURCE = "tools/art/garden.py";

export const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/* PURE, so every rule below can be driven by a fixture (E5). `rendered` maps a
   profile to the bytes that came out of the generator; `pinned` is what the
   ledger says they should be. */
export function judge(pinned, rendered, sourceHash, sourceNow) {
  const problems = [];
  if (sourceHash && sourceNow && sourceHash !== sourceNow) {
    problems.push(`${SOURCE} hashes to ${sourceNow.slice(0, 12)}, the ledger pins ${sourceHash.slice(0, 12)}`
      + " - the source moved, so every render below is about a different garden than the one that was approved");
  }
  for (const [profile, want] of Object.entries(pinned)) {
    if (!(profile in rendered)) {
      problems.push(`${profile}: pinned but the generator produced nothing for it`);
      continue;
    }
    const got = sha(rendered[profile]);
    if (got !== want) {
      problems.push(`${profile}: renders to ${got.slice(0, 12)}, the ledger pins ${String(want).slice(0, 12)}`
        + " - either the drawing changed without the pin, or the render is not deterministic");
    }
  }
  for (const profile of Object.keys(rendered)) {
    if (!(profile in pinned)) problems.push(`${profile}: rendered but nothing pins it, so nobody would notice it changing`);
  }
  return problems;
}

function render(profile, python = "py") {
  const box = mkdtempSync(join(tmpdir(), "wq-art-"));
  const out = join(box, `${profile}.png`);
  try {
    execFileSync(python, ["-3.12", SOURCE, "--profile", profile, "--out", out],
      { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
    return readFileSync(out);
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
}

function selfTest() {
  const ok = [];
  const a = Buffer.from("one"), b = Buffer.from("two");
  ok.push(["a render that matches its pin passes", judge({ p: sha(a) }, { p: a }).length === 0]);
  ok.push(["a render that drifted from its pin is caught",
    judge({ p: sha(a) }, { p: b }).some((s) => s.includes("not deterministic"))]);
  ok.push(["a pinned profile the generator no longer produces is caught",
    judge({ p: sha(a) }, {}).some((s) => s.includes("produced nothing"))]);
  ok.push(["a rendered profile nothing pins is caught, because nobody would notice it changing",
    judge({}, { p: a }).some((s) => s.includes("nothing pins it"))]);
  ok.push(["a moved source is caught even when every render still matches",
    judge({ p: sha(a) }, { p: a }, "aaaa", "bbbb").some((s) => s.includes("the source moved"))]);
  ok.push(["an unmoved source raises nothing",
    judge({ p: sha(a) }, { p: a }, "aaaa", "aaaa").length === 0]);
  /* The control that matters most: this file must be able to fail. A checker
     whose fixtures all pass is not a checker. */
  ok.push(["the empty case is not silently green", judge({ p: sha(a) }, { p: b }).length > 0]);
  let failed = 0;
  for (const [name, pass] of ok) {
    if (!pass) failed += 1;
    console.log(`${pass ? "ok  " : "FAIL"} ${name}`);
  }
  console.log(`\nart-render controls: ${ok.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes("--self-test")) selfTest();

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const scene = ledger.families?.scene;
if (!scene) {
  console.log("PROBLEM: the scene family is not open in " + LEDGER);
  process.exit(1);
}
const pinned = scene.renders || {};
const profiles = Object.keys(pinned).length ? Object.keys(pinned) : ["phone", "phone-small", "tablet", "desktop"];
const rendered = {};
for (const p of profiles) {
  try {
    rendered[p] = render(p);
  } catch (e) {
    console.log(`PROBLEM: ${p} could not be rendered - ${String(e.message).split("\n")[0].slice(0, 120)}`);
    process.exit(1);
  }
}
const sourceNow = existsSync(SOURCE) ? sha(readFileSync(SOURCE)) : null;

if (process.argv.includes("--write")) {
  scene.renders = Object.fromEntries(profiles.map((p) => [p, sha(rendered[p])]));
  scene.sourceHash = { [SOURCE]: sourceNow };
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + "\n");
  console.log(`pinned ${profiles.length} renders and the source at ${sourceNow.slice(0, 12)}`);
  process.exit(0);
}

const problems = judge(pinned, rendered, scene.sourceHash?.[SOURCE], sourceNow);
for (const p of problems) console.log("PROBLEM: " + p);
console.log(`Art render: ${profiles.length} profiles regenerated, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
