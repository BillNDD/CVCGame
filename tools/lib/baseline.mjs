/* THE BASELINE READER - batch 1 of the refactor, owner-ruled 2026-09-12.
 *
 * Seventeen tools each parsed .claude/gate-baseline.json themselves and then
 * read a key out of it with a bare property access. A bare access is how a
 * ceiling silently stops existing: `count > undefined` is false, so a key
 * that is misspelled, renamed or deleted reads as "no limit" and the gate
 * stays green - the G27 lesson, which G23 and G31 each had to learn for
 * themselves with a hand-written refusal.
 *
 * This file is the one reader. `loadBaseline()` returns the parsed object
 * and a `floor(key)` / `ceiling(key)` pair that THROW on a key the file does
 * not hold, on a value that is not a number, and on a key asked for as the
 * wrong kind: a floor never ends in _max and a ceiling always does (the
 * baseline's own convention, stated in its comment and in E6).
 *
 * MECHANICS ONLY. Which key a gate compares, and what it compares it with,
 * stay in the gate - the oracle line of the batch-1 brief.
 *
 * Run: node tools/lib/baseline.mjs --self-test
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { finish } from "./selftest.mjs";

const BASELINE_PATH = ".claude/gate-baseline.json";

/**
 * @param {Record<string, unknown>} data
 * @param {string} key
 * @param {"floor" | "ceiling"} kind
 */
function bound(data, key, kind) {
  const isMax = key.endsWith("_max");
  if (kind === "floor" && isMax) throw new Error(`${key} ends in _max, so it is a ceiling, not a floor (E6) - ask ceiling() for it`);
  if (kind === "ceiling" && !isMax) throw new Error(`${key} does not end in _max, so it is a floor, not a ceiling (E6) - ask floor() for it`);
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} is not a number in ${BASELINE_PATH} (${value === undefined ? "missing" : JSON.stringify(value)}) - a ${kind} that does not exist cannot refuse anything`);
  }
  return value;
}

/**
 * The parsed baseline and the two readers over it. `read` is injectable so
 * the controls can plant a file; every real caller takes the default.
 * @param {(path: string, encoding: "utf8") => string} [read]
 */
export function loadBaseline(read = readFileSync) {
  /** @type {Record<string, unknown>} */
  const data = JSON.parse(read(BASELINE_PATH, "utf8"));
  return {
    data,
    floor: (/** @type {string} */ key) => bound(data, key, "floor"),
    ceiling: (/** @type {string} */ key) => bound(data, key, "ceiling"),
  };
}

/* ---------------------------------------------------------- controls -- */
function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  const throws = (fn, needle) => { try { fn(); return false; } catch (e) { return String(e.message).includes(needle); } };
  const planted = loadBaseline(() => JSON.stringify({ g0_probe: 7, g0_probe_max: 3, g0_words: "seven", _retired: {} }));
  T("a floor is read from the planted file", planted.floor("g0_probe") === 7);
  T("a ceiling is read from the planted file", planted.ceiling("g0_probe_max") === 3);
  T("the parsed object is handed back whole", planted.data.g0_probe === 7 && typeof planted.data._retired === "object");
  T("a floor missing from the baseline throws, naming the key", throws(() => planted.floor("g0_gone"), "g0_gone is not a number"));
  T("a ceiling missing from the baseline throws, naming the key - the G27 lesson", throws(() => planted.ceiling("g0_gone_max"), "g0_gone_max is not a number"));
  T("a value that is not a number throws rather than comparing as nothing", throws(() => planted.floor("g0_words"), "g0_words is not a number"));
  T("a floor asked of a _max key is refused: the two kinds cannot be confused", throws(() => planted.floor("g0_probe_max"), "is a ceiling, not a floor"));
  T("a ceiling asked of a plain key is refused the same way", throws(() => planted.ceiling("g0_probe"), "is a floor, not a ceiling"));
  const real = loadBaseline();
  T("the real baseline loads, and its comment says which keys are ceilings", typeof real.data.comment === "string" && real.data.comment.includes("_max"));
  return finish("baseline", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
