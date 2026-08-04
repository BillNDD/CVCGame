/* Governing-files gate (G17). "What counts as finished work" (CLAUDE.md) bans
   new status files, progress logs, roadmaps and session summaries: most work
   must change something a child or grown-up can see, hear, or do, and every
   fact already has one owning document. This gate makes the ban mechanical.

   Every tracked .md, .json and .csv must be either a named governing file
   (the owned set below, literal per E4) or product/build machinery matched by
   an allowed pattern. Anything else is a stray: the build fails until the
   owner approves the file and it is added here — an owner-visible diff, the
   same shape as the dependency rule in AGENTS.md.

   Negative control: --self-test injects a planted PROGRESS.md and a stray
   status.json; the detector must report both and still accept the real tree.
   Run: node tools/check-governing.mjs */
import { execSync } from "node:child_process";

/* The owned set: each file is the single owner of its facts (E10, and the
   review of 2026-08-02 that pointed every one of them at the word table). */
const GOVERNING = [
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "README.md",
  "SPEC.md",
  ".claude/gate-baseline.json",
  "docs/install-ios.md",
  "docs/install-windows.md",
  "docs/phonics-handoff-defects.md",
  "docs/qa-procedure.md",
  "docs/self-hosting.md",
  "docs/settled.md",
  "docs/testing-gauntlet.md",
  "docs/voice-pack.md",
  "docs/voice-goldens-packs1-3.json",
  "tools/keeper-bytes.json",
  "tools/keepers-treatments.json",
  "tools/voice-lock.json",
  "tools/voice-sounds.csv",
  "tools/voice-words.csv",
];

/* Product and build machinery, not documents: the app's own assets, the
   generated acceptance IR, and the package manifests. */
const MACHINERY = [
  /^app\/public\//,
  /^app\/src\//,
  /^tests\/generated\//,
  /(^|\/)package(-lock)?\.json$/,
];

export function check(tracked) {
  const strays = [];
  let governing = 0;
  for (const f of tracked) {
    if (!/\.(md|json|csv)$/.test(f)) continue;
    if (GOVERNING.includes(f)) { governing += 1; continue; }
    if (MACHINERY.some((p) => p.test(f))) continue;
    strays.push(f);
  }
  return { governing, strays };
}

const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);

if (process.argv.includes("--self-test")) {
  const planted = check([...tracked, "PROGRESS.md", "docs/status.json"]);
  const sawMd = planted.strays.includes("PROGRESS.md");
  const sawJson = planted.strays.includes("docs/status.json");
  const clean = check(tracked).strays.length === 0;
  if (sawMd && sawJson && clean) {
    console.log("self-test OK: a planted progress file and a stray status json are caught, and the real tree is accepted");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify({ sawMd, sawJson, clean }));
  process.exit(1);
}

const { governing, strays } = check(tracked);
strays.forEach((f) => console.error(
  `  PROBLEM: ${f} is not in the owned set - a new governing or status file needs the owner's approval (add it to tools/check-governing.mjs)`));
console.log(`Governing files: ${governing} governing files, ${strays.length} strays`);
process.exit(strays.length ? 1 : 0);
