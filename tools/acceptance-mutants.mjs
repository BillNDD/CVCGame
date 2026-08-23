/* Acceptance mutation gate (G4). Corrupts one expected value in the JSON IR at
   a time, regenerates the acceptance tests, and requires the run to FAIL. A
   scenario that still passes is not reading that value: a survivor.
   Scope: values in Then steps, and Examples cells that Then steps read. Setup
   values in Given/When are exercised through the assertions they feed.
   Operators: numbers step up by one; bounded checks (at most / above) step
   down by one, so the mutation always tightens; strings gain one letter.
   Negative control: --self-test applies one mutant WITHOUT regenerating. The
   stale test must pass, which proves the gate can see a survivor.
   Run: npm run test:acceptance-mutants   Requirement: 0 survivors. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync as rmLock } from "node:fs";
import { join as joinLock } from "node:path";
import { LOCK, holderOf, shouldTakeLock } from "./lock-guard.mjs";

const IR = "tests/generated/acceptance-ir.json";
const TEST = "tests/generated/acceptance.test.js";
const TIGHTEN = [/^at most /, /^no word is above /];
const selfTest = process.argv.includes("--self-test");

const run = (cmd, args) => {
  try { execFileSync(cmd, args, { stdio: "pipe" }); return true; } catch { return false; }
};

/* THE LOCK, AND THIS IS THE RUNNER THAT MOST NEEDED IT (the after pass,
   2026-08-23). The lock's founding comment names G4 first - "G4 mutates
   tests/generated mid-run" - and both files this tool rewrites are TRACKED,
   while the two runners locked earlier the same night write only
   reference/.mutant.jsx and src/engine.js, which are both gitignored. So the
   batch that set out to close the mutation window locked two tools that
   cannot leave a mutant in the repository and left open the one that can.
   A concurrent `npm run check` or commit would sweep a planted acceptance
   mutant straight in - open-faults C2, verbatim.
   The gauntlet holds the lock for its own run and says so through the
   environment; a direct `npm run test:acceptance-mutants` takes it itself.
   THE SELF-TEST TAKES IT TOO: it plants a mutant in the same tracked IR to
   prove the staleness control, so it carries the same hazard (the after pass's
   own residual note). And the lock sits ABOVE the gherkin-parse call below,
   which rewrites that IR: those are pristine bytes, so nothing could be swept
   up, but the lock reads more honestly over everything that writes. */
const LOCK_HELD_BY_PARENT = !shouldTakeLock(process.env);
if (!LOCK_HELD_BY_PARENT) {
  try {
    mkdirSync(LOCK);
    writeFileSync(joinLock(LOCK, "current"), "G4 acceptance-mutants since " + new Date().toISOString().slice(11, 16) + String.fromCharCode(10));
  } catch {
    console.error("Another run appears to hold " + LOCK + " - " + (holderOf(LOCK) || "no holder named") + ". Remove it if it is stale.");
    process.exit(1);
  }
  process.on("exit", () => { try { rmLock(LOCK, { recursive: true, force: true }); } catch {} });
}

run("node", ["tools/gherkin-parse.mjs"]); // fresh IR from the feature files
const pristine = readFileSync(IR, "utf8");

function collectSites(ir) {
  const sites = [];
  ir.features.forEach((f, fi) =>
    f.scenarios.forEach((sc, si) =>
      sc.steps.forEach((st, ti) => {
        if (st.kind !== "Then") return;
        const at = (what) => `${f.file} :: ${sc.name} :: ${what}`;
        for (const m of st.text.matchAll(/\d+/g))
          sites.push({ fi, si, ti, kind: "num", pos: m.index, len: m[0].length,
            desc: at(`"${st.text}" number ${m[0]}`) });
        for (const m of st.text.matchAll(/"([^"]*)"/g))
          sites.push({ fi, si, ti, kind: "str", pos: m.index, len: m[0].length,
            desc: at(`"${st.text}" string ${m[0]}`) });
        if (sc.outline)
          for (const m of st.text.matchAll(/<([^>]+)>/g))
            sc.examples.forEach((row, ri) =>
              sites.push({ fi, si, kind: "cell", name: m[1], ri,
                desc: at(`example row ${ri + 1} cell <${m[1]}> = ${row[m[1]]}`) }));
      })
    )
  );
  return sites;
}

function applyMutant(site) {
  const ir = JSON.parse(pristine);
  const sc = ir.features[site.fi].scenarios[site.si];
  if (site.kind === "cell") {
    const v = sc.examples[site.ri][site.name];
    sc.examples[site.ri][site.name] = /^\d+$/.test(v) ? String(Number(v) + 1) : v + "x";
  } else {
    const st = sc.steps[site.ti];
    const t = st.text;
    if (site.kind === "num") {
      const n = Number(t.slice(site.pos, site.pos + site.len));
      const nv = TIGHTEN.some((re) => re.test(t)) ? n - 1 : n + 1;
      st.text = t.slice(0, site.pos) + String(nv) + t.slice(site.pos + site.len);
    } else {
      st.text = t.slice(0, site.pos + site.len - 1) + "x" + t.slice(site.pos + site.len - 1);
    }
  }
  writeFileSync(IR, JSON.stringify(ir, null, 2) + "\n");
}

const restore = () => { writeFileSync(IR, pristine); run("node", ["tools/gen-acceptance.mjs"]); };
/* Restore on EVERY exit path, as G19 does (hardening decision 3, 2026-08-22):
   an exception, Ctrl-C or a killed shell between a write and its restore
   leaves tests/generated mutated in the working tree, where the next commit
   sweeps it up - open-faults C2, and it has happened. */
let restoredOnExit = false;
const restoreOnce = () => { if (!restoredOnExit) { restoredOnExit = true; restore(); } };
process.on("exit", restoreOnce);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { restoreOnce(); process.exit(130); });
process.on("uncaughtException", (e) => { restoreOnce(); console.error(e); process.exit(1); });
const sites = collectSites(JSON.parse(pristine));

if (selfTest) {
  applyMutant(sites[0]);
  const stalePassed = run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", TEST, "--reporter=dot"]);
  restore();
  if (stalePassed) {
    console.log("self-test OK: an unregenerated mutant survives, and this gate would report it");
    process.exit(0);
  }
  console.error("self-test FAILED: the stale test did not pass; the control is broken");
  process.exit(1);
}

const survivors = [];
for (const site of sites) {
  applyMutant(site);
  const generated = run("node", ["tools/gen-acceptance.mjs"]);
  const passed = generated && run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", TEST, "--reporter=dot"]);
  if (passed) survivors.push(site.desc);
}
restore();

console.log(`Acceptance mutation gate: ${sites.length} mutants, ${sites.length - survivors.length} killed, ${survivors.length} survived`);
survivors.forEach((s) => console.log("  SURVIVED: " + s));
process.exit(survivors.length ? 1 : 0);
