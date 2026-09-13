/* PROCESSES AND SCRATCH DIRECTORIES - batch 1 of the refactor, owner-ruled
 * 2026-09-12.
 *
 * Fifty-one process-execution call sites in twenty-four tools, and not one
 * shared timeout or cleanup: a child that hangs hangs the check for ever, and
 * a scratch directory made before a throw is left behind. Two mechanics,
 * here once:
 *
 *   run(cmd, args, { cwd, env, timeoutMs })  the child, ALWAYS with a timeout,
 *       both streams captured, and NEVER a throw on a non-zero exit - the
 *       caller reads `status` and `out` and decides. A child that could not
 *       start, or was killed at the timeout, reports status -1 and says why in
 *       `error`; `timedOut` is set when the clock did it. The try/catch around
 *       execFileSync that every runner used to carry, folded into the return.
 *   must(result, what)  the one-line refusal for a caller that cannot go on:
 *       the output when the exit was zero, a throw naming `what` otherwise.
 *   withScratch(prefix, fn)  a temporary directory handed to fn and removed
 *       when fn returns, when it throws, when its promise settles, on process
 *       exit and on a signal (the C2 lesson: files restored on every exit
 *       path). The signal handlers are armed once, for every live directory,
 *       and exit with the conventional code so the caller's own handlers -
 *       which the mutant runners have - still run first if they were armed
 *       first.
 *
 * MECHANICS ONLY. Which command runs, and what its output must say, stay in
 * the tool - the oracle line of the batch-1 brief.
 *
 * Run: node tools/lib/proc.mjs --self-test
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { finish } from "./selftest.mjs";

const DEFAULT_TIMEOUT_MS = 600000;   // ten minutes: longer than any child the check runs, shorter than for ever
const MAX_BUFFER = 64 * 1024 * 1024;

/**
 * @typedef {{ status: number, out: string, stdout: string, stderr: string, timedOut: boolean, error: string | null }} RunResult
 */

/* What became of the child: its exit, or the reason there was none. */
/** @param {import("node:child_process").SpawnSyncReturns<string>} r */
function outcome(r) {
  const err = /** @type {(Error & { code?: string }) | undefined} */ (r.error);
  const status = typeof r.status === "number" ? r.status : -1;
  let error = null;
  if (err) error = `${err.code || "error"}: ${err.message}`;
  else if (r.signal) error = `killed by ${r.signal}`;
  return { status, timedOut: !!(err && err.code === "ETIMEDOUT"), error };
}

/**
 * @param {string} cmd
 * @param {string[]} [args]
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeoutMs?: number, maxBuffer?: number, input?: string }} [opts]
 * @returns {RunResult}
 */
export function run(cmd, args = [], opts = {}) {
  /** @type {import("node:child_process").SpawnSyncReturns<string>} */
  let r;
  try { r = spawnSync(cmd, args, spawnOptions(opts)); } catch (e) { return notSpawned(e); }
  const stdout = r.stdout || "", stderr = r.stderr || "";
  return { ...outcome(r), out: stdout + stderr, stdout, stderr };
}
/**
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeoutMs?: number, maxBuffer?: number, input?: string }} opts
 * @returns {import("node:child_process").SpawnSyncOptionsWithStringEncoding}
 */
function spawnOptions(opts) {
  /** @type {import("node:child_process").StdioOptions} */
  const stdio = [opts.input === undefined ? "ignore" : "pipe", "pipe", "pipe"];
  return {
    cwd: opts.cwd, env: opts.env, input: opts.input, encoding: "utf8", windowsHide: true, stdio,
    timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: opts.maxBuffer ?? MAX_BUFFER,
  };
}
/* spawnSync itself refuses an argument it cannot pass (a NUL byte, a
   non-string): still a result, never a throw. */
/** @param {unknown} e @returns {RunResult} */
function notSpawned(e) {
  const err = /** @type {{ message?: string }} */ (e);
  return { status: -1, out: "", stdout: "", stderr: "", timedOut: false, error: String(err && err.message ? err.message : e) };
}

/**
 * @param {RunResult} result
 * @param {string} what
 */
export function must(result, what) {
  if (result.status === 0) return result.out;
  const why = result.error || `exit ${result.status}`;
  const first = result.out.trim().split("\n")[0] || "";
  throw new Error(`${what} failed (${why})${first ? ": " + first.slice(0, 200) : ""}`);
}

/* Every scratch directory still alive, removed together on exit. */
const LIVE = new Set();
let armed = false;
function removeAll() {
  for (const dir of LIVE) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* already gone */ } }
  LIVE.clear();
}
function arm() {
  if (armed) return;
  armed = true;
  process.on("exit", removeAll);
  for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) {
    process.on(/** @type {NodeJS.Signals} */ (sig), () => process.exit(code));
  }
}
const isPromise = (v) => !!v && typeof (/** @type {any} */ (v)).then === "function";

/**
 * @template T
 * @param {string} prefix
 * @param {(dir: string) => T} fn
 * @returns {T}
 */
export function withScratch(prefix, fn) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  LIVE.add(dir);
  arm();
  const done = () => { LIVE.delete(dir); rmSync(dir, { recursive: true, force: true }); };
  let result;
  try { result = fn(dir); } catch (e) { done(); throw e; }
  if (isPromise(result)) {
    return /** @type {T} */ (/** @type {Promise<unknown>} */ (result).then((v) => { done(); return v; }, (e) => { done(); throw e; }));
  }
  done();
  return result;
}

/* ---------------------------------------------------------- controls --
   Real children, through node itself, so every branch of run() is met by a
   process that exists; and scratch directories watched from outside. */
const node = (/** @type {string} */ script, /** @type {object} */ opts = {}) => run(process.execPath, ["-e", script], opts);
const bothStreams = (/** @type {RunResult} */ r) => r.out.includes("hello") && r.out.includes("aside") && r.stdout.includes("hello") && r.stderr.includes("aside");

/** @param {(name: string, pass: unknown) => void} T */
function runControls(T) {
  const zero = node('console.log("hello"); console.error("aside")');
  T("a zero exit reports status 0, and out carries both streams", zero.status === 0 && bothStreams(zero) && zero.error === null);
  const three = node('console.log("partial"); process.exit(3)');
  T("a non-zero exit is returned, never thrown, with its output kept", three.status === 3 && three.out.includes("partial"));
  const started = Date.now();
  const slow = node("setTimeout(() => {}, 20000)", { timeoutMs: 400 });
  T("a child past its timeout is killed and reported as timed out, status -1", slow.timedOut === true && slow.status === -1 && Date.now() - started < 10000);
  const missing = run("wq-no-such-command-" + process.pid, ["--version"]);
  T("a command that cannot start reports status -1 and says why, never throws", missing.status === -1 && !!missing.error && !missing.timedOut);
  const nul = run(process.execPath, ["bad\0arg"]);
  T("an argument the spawn itself refuses is still a result", nul.status === -1 && !!nul.error);
  T("the default timeout is ten minutes, not none", DEFAULT_TIMEOUT_MS === 600000);
  const here = withScratch("proc-cwd-", (dir) => node("console.log(process.cwd() + '|' + process.env.WQ_PROC_PROBE)", { cwd: dir, env: { ...process.env, WQ_PROC_PROBE: "probe" } }).out.trim());
  T("cwd and env reach the child", here.endsWith("|probe") && here.length > "|probe".length);
  T("must hands back the output on a zero exit", must(zero, "a probe").includes("hello"));
  T("must throws on a non-zero exit, naming what failed and the exit", refuses(() => must(three, "the probe child"), "the probe child failed (exit 3)"));
}
const refuses = (/** @type {() => void} */ fn, /** @type {string} */ needle) => { try { fn(); return false; } catch (e) { return String(e.message).includes(needle); } };

/** @param {(name: string, pass: unknown) => void} T */
async function scratchControls(T) {
  let seen = "";
  const value = withScratch("proc-sync-", (dir) => { seen = dir; writeFileSync(join(dir, "x.txt"), "x"); return existsSync(dir) ? 42 : 0; });
  T("withScratch hands a directory that exists, returns the function's value, and removes the directory after it returns", value === 42 && seen !== "" && !existsSync(seen));
  let asyncDir = "";
  const asyncValue = await withScratch("proc-async-", async (dir) => { asyncDir = dir; await new Promise((r) => setTimeout(r, 10)); return existsSync(dir) ? "kept" : "gone"; });
  T("an async function keeps its directory until its promise settles, then loses it", asyncValue === "kept" && !existsSync(asyncDir));
  let thrownDir = "";
  const rethrown = refuses(() => withScratch("proc-throw-", (dir) => { thrownDir = dir; throw new Error("planted"); }), "planted");
  T("a throw inside the function still removes the directory, and the throw is passed on", rethrown && thrownDir !== "" && !existsSync(thrownDir));
  T("a signal handler is armed while a scratch directory can exist", process.listenerCount("SIGINT") > 0 && process.listenerCount("SIGTERM") > 0);
  /* The exit path, watched from outside: a child makes a scratch directory,
     prints its path, and exits from inside the function. */
  const child = node(`import(${JSON.stringify(import.meta.url)}).then((m) => m.withScratch("proc-exit-", (dir) => { console.log(dir); process.exit(0); }))`);
  const childDir = child.out.trim();
  T("a process.exit from inside the function removes the directory on the way out", child.status === 0 && childDir.length > 0 && !existsSync(childDir));
}

async function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  runControls(T);
  await scratchControls(T);
  return finish("proc", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit((await selfTest()) ? 1 : 0);
}
