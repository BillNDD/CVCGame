/* Voice-pack gate (G13). The shipped default pack must cover the engine's
   whole clip inventory: every bank word and fixed sentence has a clip file
   with a sane duration, and the pack holds no orphan clips. The inventory
   comes from the live engine, so a bank that grows past its voice fails the
   build (SPEC section 5a).
   Negative control: --self-test removes one word from a copy of the manifest
   and plants an orphan; the detector must report both. */
import { readFileSync, existsSync, statSync } from "node:fs";
import { voiceScript } from "../src/engine.js";

const DIR = "app/public/voice";

function check(manifest, verifyFiles) {
  const problems = [];
  const script = voiceScript();
  for (const clip of script) {
    const m = manifest[clip.id];
    if (!m) { problems.push(`missing clip: ${clip.id} ("${clip.text}")`); continue; }
    if (typeof m.ms !== "number" || m.ms < (clip.slow ? 400 : 300) || m.ms > 8000)
      problems.push(`duration out of range: ${clip.id} at ${m.ms} ms`);
    if (verifyFiles) {
      const p = `${DIR}/${m.file}`;
      if (!existsSync(p)) problems.push(`missing file: ${p}`);
      else if (statSync(p).size < 1000) problems.push(`suspiciously small file: ${p}`);
    }
  }
  const ids = new Set(script.map((c) => c.id));
  for (const id of Object.keys(manifest)) if (!ids.has(id)) problems.push(`orphan clip: ${id}`);
  return { required: script.length, shipped: Object.keys(manifest).length, problems };
}

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8"));

if (process.argv.includes("--self-test")) {
  const corrupted = { ...manifest, "x:orphan": { file: "x-orphan.mp3", ms: 900 } };
  delete corrupted["w:cat"];
  const r = check(corrupted, false);
  const sawMissing = r.problems.some((p) => p.startsWith("missing clip: w:cat"));
  const sawOrphan = r.problems.some((p) => p.startsWith("orphan clip: x:orphan"));
  if (sawMissing && sawOrphan) {
    console.log("self-test OK: a removed word clip and a planted orphan are both caught");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMissing, sawOrphan }));
  process.exit(1);
}

const { required, shipped, problems } = check(manifest, true);
console.log(`Voice pack: ${required} clips required, ${shipped} shipped, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
