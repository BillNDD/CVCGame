/* ONE PLACE THE BROWSER ENGINE IS CHOSEN (QA build-out item 1, owner-ruled
   2026-09-01: "engines first"). The three plain-script browser gates - G7
   interface, G8 accessibility, G18 network - each launched Chromium by name,
   with the same Linux executable-path branch copied into each. The engine of
   every iPhone and iPad is WebKit, the devices the owner QAs on, and until
   this file no gate had ever run it.

   THE ENGINE IS STATED, NEVER INFERRED, AND NEVER SUBSTITUTED. The variable is
   CENSUS_ENGINE, the name playwright.config.mjs has used since the census was
   built, so one fact has one name. An engine that is asked for and not
   installed is REFUSED, loudly, with the install command - never quietly
   replaced by Chromium. tools/census-report.mjs carries the incident this
   guards against: CENSUS_ENGINE=webkit on a machine with no WebKit once
   printed "Engines: webkit" over a run that had launched nothing.

   THE PRINTED LINE IS THE EVIDENCE. `browser: WebKit/26.5` is the string
   tests/ui/network.mjs has printed since 2026-08-10 and the gauntlet parses
   into its evidence file; every gate now prints it, and the gauntlet's
   per-engine steps require it to name the engine they asked for. */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as playwright from "playwright";

export const ENGINES = ["chromium", "webkit", "firefox"];
const LABEL = { chromium: "Chromium", webkit: "WebKit", firefox: "Firefox" };

/* The engine this process was asked for. Read once per call so a self-test
   can vary it; unknown names are refused here, before anything launches. */
export function requestedEngine(env = process.env) {
  const name = env.CENSUS_ENGINE || "chromium";
  if (!ENGINES.includes(name)) {
    throw new Error(`CENSUS_ENGINE=${name} is not an engine this project runs; one of: ${ENGINES.join(", ")}`);
  }
  return name;
}

/* Launch options per engine. The Linux container path is Chromium's alone:
   the other engines are installed by playwright and found by it. */
function launchOptions(name) {
  if (name === "chromium") {
    const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
    return { executablePath, args: ["--no-sandbox"] };
  }
  return {};
}

export function engineLine(name, version) { return `browser: ${LABEL[name]}/${version}`; }

/* Launch the requested engine and print its evidence line. `launchers` is the
   injection the self-test uses to prove the refusal without uninstalling a
   browser; callers never pass it. */
export async function launchEngine({ env = process.env, launchers = playwright, log = console.log } = {}) {
  const name = requestedEngine(env);
  const type = launchers[name];
  let browser;
  try {
    browser = await type.launch(launchOptions(name));
  } catch (e) {
    throw new Error(`CENSUS_ENGINE=${name} was asked for and could not launch - it is NOT substituted. `
      + `Install it with: npx playwright install ${name}\n${String(e).split("\n")[0]}`);
  }
  const actual = browser.browserType().name();
  if (actual !== name) {
    await browser.close();
    throw new Error(`asked for ${name}, launched ${actual} - an engine must never stand in for another`);
  }
  log(engineLine(name, browser.version()));
  return { browser, engine: name };
}

async function selfTest() {
  const fails = [];
  let ran = 0;
  const T = (n, c) => { ran += 1; if (!c) fails.push(n); };
  const threw = async (fn) => { try { await fn(); return null; } catch (e) { return String(e); } };
  const lines = [];
  const log = (l) => lines.push(l);

  T("an unknown engine name is refused before anything launches",
    (await threw(() => launchEngine({ env: { CENSUS_ENGINE: "safari" } }))) !== null);
  T("the refusal names the engines this project runs",
    ((await threw(() => requestedEngine({ CENSUS_ENGINE: "edge" }))) || "").includes("chromium, webkit, firefox"));
  T("no variable means chromium, stated rather than defaulted downstream", requestedEngine({}) === "chromium");

  /* The incident, replayed: an engine that cannot launch must be refused,
     not replaced. A fake launcher whose webkit throws stands in for a
     machine with no WebKit installed. */
  const noWebkit = { ...playwright, webkit: { launch: async () => { throw new Error("Executable doesn't exist"); } } };
  const msg = await threw(() => launchEngine({ env: { CENSUS_ENGINE: "webkit" }, launchers: noWebkit, log }));
  T("an engine that is asked for and cannot launch is refused, never substituted",
    msg !== null && msg.includes("NOT substituted") && msg.includes("playwright install webkit"));
  T("nothing was printed for the engine that never ran", lines.length === 0);

  /* An engine standing in for another is caught by asking the browser what it
     is, not the request what it wanted. */
  const liar = { ...playwright, webkit: playwright.chromium };
  const lie = await threw(() => launchEngine({ env: { CENSUS_ENGINE: "webkit" }, launchers: liar, log }));
  T("a launcher that hands back a different engine is caught and closed",
    lie !== null && lie.includes("asked for webkit, launched chromium"));

  /* Every installed engine launches under its own name and prints its own
     line, in the exact shape the gauntlet parses. */
  for (const name of ENGINES) {
    const got = [];
    const r = await launchEngine({ env: { CENSUS_ENGINE: name }, log: (l) => got.push(l) });
    await r.browser.close();
    T(`${name} launches as itself and prints "browser: ${LABEL[name]}/<version>"`,
      r.engine === name && got.length === 1 && new RegExp("^browser: " + LABEL[name] + "/[0-9]").test(got[0]));
  }

  for (const f of fails) console.error("  FAIL " + f);
  console.log(fails.length === 0
    ? `engine self-test: ${ran} controls, all caught`
    : `engine self-test: ${fails.length} of ${ran} controls FAILED`);
  return fails.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === "--self-test") {
  process.exit(await selfTest());
}
