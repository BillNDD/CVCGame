/* THE LOCK AS A GUARD - hardening decision 3, owner-ruled 2026-08-22.
 *
 * Three gates plant mutants in files git tracks and restore them on exit
 * (open-faults C2). The rule "never commit or run the check while a gauntlet
 * runs" was a paragraph, and a paragraph let a mutant into the repository on
 * 2026-08-13 and, on 2026-08-22, let a stray G19 run restore its own
 * snapshot over an edit made meanwhile. The gauntlet already takes
 * .gauntlet.lock for the length of a run; this makes the lock REFUSE.
 *
 * Two callers: the first line of `npm run check`, and the pre-commit hook in
 * tools/hooks (installed once with `git config core.hooksPath tools/hooks`).
 * Both stop with the gate that holds the lock and when it took it, which the
 * gauntlet writes into the lock directory as each step starts.
 *
 * What it cannot do: survive a power cut. A lock left behind by a dead run is
 * removed by hand, and `git status` after a crash still needs a person.
 *
 * Run: node tools/lock-guard.mjs            Controls: node tools/lock-guard.mjs --self-test
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { finish } from "./lib/selftest.mjs";
import { run, withScratch } from "./lib/proc.mjs";

const LOCK = ".gauntlet.lock";

/* Pure: given whether the lock exists and what it says, the refusal or null. */
export function guard(lockExists, holder) {
  if (!lockExists) return null;
  const who = holder ? ` - ${holder}` : "";
  return `REFUSED: a gauntlet is running${who}. It plants mutants in tracked files and restores them on exit; `
    + "a commit or a check now would read or sweep up a mutant. Wait for it, or remove .gauntlet.lock if it is stale.";
}

/* WHO TAKES THE LOCK. The gauntlet takes it for its whole run and then invokes
   the mutant runners as steps, so those must NOT take it again - it would
   refuse the gauntlet's own child. The parent says so through the environment.
   This is a FUNCTION rather than an inline comparison because the two
   directions are asymmetric: if the variable fails to reach a child the gate
   goes red loudly, which is safe, but if it is ever set in an ambient
   environment a direct run SILENTLY skips the lock and the hole is back with
   no signal at all. That direction had no control until the after pass asked
   for one (2026-08-23). Only the exact token bypasses. */
function shouldTakeLock(env) {
  return (env && env.WQ_GAUNTLET_LOCK) !== "held";
}

function holderOf(lockDir) {
  try { return readFileSync(join(lockDir, "current"), "utf8").trim(); } catch { return ""; }
}

function holderName() {
  const tool = basename(process.argv[1] || "");
  return ({
    "acceptance-mutants.mjs": "G4 acceptance-mutants",
    "app-mutants.mjs": "G19 app-mutants",
    "mutants.mjs": "G5 source-mutants",
  })[tool] || tool || "unknown run";
}

export function takeLock(dir = LOCK) {
  if (!shouldTakeLock(process.env)) return;
  try {
    mkdirSync(dir);
    writeFileSync(join(dir, "current"), holderName() + " since " + new Date().toISOString().slice(11, 16) + String.fromCharCode(10));
  } catch {
    console.error("Another run appears to hold " + dir + " - " + (holderOf(dir) || "no holder named") + ". Remove it if it is stale.");
    process.exit(1);
  }
  process.on("exit", () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => setImmediate(() => process.exit(130)));
}

function selfTest() {
  const ok = [];
  const probe = (box, lock, after, token) => {
    const file = join(box, "probe.mjs");
    writeFileSync(file, `import { takeLock } from ${JSON.stringify(import.meta.url)};\nimport { existsSync } from "node:fs";\ntakeLock(${JSON.stringify(lock)});\n${after}\n`);
    return run(process.execPath, [file], { env: { ...process.env, WQ_GAUNTLET_LOCK: token } });
  };
  ok.push(["no lock, no refusal", guard(false, "") === null]);
  ok.push(["a lock refuses, and says so in words a person can act on", String(guard(true, "")).startsWith("REFUSED")]);
  ok.push(["a lock names its holder when the gauntlet wrote one", String(guard(true, "G5 source-mutants since 09:58")).includes("G5 source-mutants since 09:58")]);
  /* The real reader, on a planted lock directory with and without a holder. */
  withScratch("lock-guard-", (box) => {
    const lock = join(box, LOCK);
    mkdirSync(lock);
    ok.push(["a planted lock directory with no holder still refuses", guard(existsSync(lock), holderOf(lock)) !== null]);
    writeFileSync(join(lock, "current"), "G19 app-mutants since 10:01\n");
    ok.push(["the holder is read from the lock", holderOf(lock) === "G19 app-mutants since 10:01"]);
  });
  withScratch("lock-guard-", (box) => {
    const lock = join(box, "taken");
    const old = process.env.WQ_GAUNTLET_LOCK;
    process.env.WQ_GAUNTLET_LOCK = "";
    try {
      takeLock(lock);
      ok.push(["takeLock takes a scratch lock and writes its holder", existsSync(lock) && holderOf(lock).includes("since")]);
    } finally {
      if (old === undefined) delete process.env.WQ_GAUNTLET_LOCK;
      else process.env.WQ_GAUNTLET_LOCK = old;
    }
  });
  withScratch("lock-guard-", (box) => {
    const lock = join(box, "planted");
    mkdirSync(lock);
    writeFileSync(join(lock, "current"), "planted holder\n");
    const result = probe(box, lock, "", "");
    ok.push(["takeLock refuses a planted lock and reports its holder", result.status === 1 && result.out.includes("planted holder")]);
  });
  withScratch("lock-guard-", (box) => {
    const lock = join(box, "released");
    const result = probe(box, lock, "process.exit(0);", "");
    ok.push(["takeLock releases a scratch lock on process exit", result.status === 0 && !existsSync(lock)]);
  });
  withScratch("lock-guard-", (box) => {
    const lock = join(box, "bypassed");
    const result = probe(box, lock, "process.exit(existsSync(" + JSON.stringify(lock) + ") ? 1 : 0);", "held");
    ok.push(["WQ_GAUNTLET_LOCK=held bypasses a scratch lock", result.status === 0 && !existsSync(lock)]);
  });
  /* the bypass, both ways - the direction with no control until 2026-08-23 */
  ok.push(["a runner with no parent takes the lock itself", shouldTakeLock({}) === true]);
  ok.push(["a gauntlet child does not take it again", shouldTakeLock({ WQ_GAUNTLET_LOCK: "held" }) === false]);
  ok.push(["an empty value is not a bypass", shouldTakeLock({ WQ_GAUNTLET_LOCK: "" }) === true]);
  ok.push(["only the exact token bypasses, so a stray value cannot open the hole", shouldTakeLock({ WQ_GAUNTLET_LOCK: "HELD" }) === true && shouldTakeLock({ WQ_GAUNTLET_LOCK: "1" }) === true]);
  ok.push(["a missing environment takes the lock", shouldTakeLock(undefined) === true]);
  return finish("lock-guard", ok);
}

/* THE COMMAND HALF IS GUARDED (2026-08-23). Without this, IMPORTING this file
   ran the refusal and killed the importing process - so any tool that wanted
   `LOCK` or `holderOf` could not have them while a lock existed, which is the
   one moment they are needed. Found the moment the mutant runners began taking
   the lock themselves: both refused as a gauntlet child, and the message came
   from this file's import, not from their own check. The same fault the
   release sweep found in tools/locator-scan.mjs the same night. */
const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;

if (RUN_AS_COMMAND) {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);
  const refusal = guard(existsSync(LOCK), holderOf(LOCK));
  if (refusal) { console.error(refusal); process.exit(1); }
}
