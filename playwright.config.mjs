/* The deep UX census runs on the Playwright test runner, and ONLY the census
 * does. The gauntlet's browser gates (G7 interface, G8 accessibility, G18
 * network, G21 listening page) stay as plain scripts: they are measurements
 * with literal expected values and their own negative controls, and moving
 * them would change what they prove.
 *
 * What the runner buys the census, and why each one is here:
 *   PROJECTS   one per viewport, so a cell's viewport is part of its identity
 *              in the report rather than a string in a loop.
 *   WORKERS    the census is hundreds of independent cells. Serial, it is
 *              minutes; parallel, it is a fraction of that.
 *   SHARDING   --shard=1/2, which is the owner's execution recommendation.
 *   TRACE      retained on failure only. A pass trace is evidence about what
 *              happened, not evidence that it was right, and keeping them
 *              turns an investigation into an unreadable pile.
 *   RETRIES 0  a flaky pass is a finding, not a pass.
 *
 * NO PIXEL BASELINES. Screenshots vary with operating system, browser build,
 * hardware and headless mode, so this config never compares them. Screenshots
 * are kept for a human to look at when something else already failed.
 */
import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { VIEWPORTS } from "./tools/ux-census.mjs";

/* THE PORT IS A PARAMETER. Two census runs on one machine — a shard, or an
   auditor working in a clone — collide on a fixed port, and the collision does
   not read as a collision: the second run either refuses to start or has its
   server torn down under it and reports ERR_CONNECTION_REFUSED on the cells
   that had not run yet, which looks exactly like a flaky app. Seen on
   2026-08-13, in both directions, between this repository and an auditor's
   clone of it. */
const PORT = Number(process.env.CENSUS_PORT || 4187);

/* THE ENGINE IS A PARAMETER WITH A CHROMIUM DEFAULT. Item 1 of the build spec
   runs this census on Chromium, Firefox and WebKit, and the install guide tells
   a parent to use an iOS home screen — which is WebKit in every browser,
   always. This machine cannot download the other two: cdn.playwright.dev and
   playwright.azureedge.net are both 403 at the proxy. So the engine is set
   here, CI sets CENSUS_ENGINE to run the others, and the report states which
   one actually ran rather than implying all three.
   It must be STATED, not left to default. Every device descriptor carries its
   own defaultBrowserType, and every iPhone and iPad descriptor says webkit —
   so adopting real devices without this line would make the whole census try
   to launch an engine that is not installed. */
const ENGINE = process.env.CENSUS_ENGINE || "chromium";

export default defineConfig({
  testDir: "tests/census",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  /* ONE by default, and the number is a property of the MACHINE rather than of
     the census. At four workers this container failed cells with "Target page,
     context or browser has been closed", and at two it still failed one or two
     per run: Chromium contexts are expensive and the box is small. Every one of
     those cells passes when run on its own, which is the signature of churn
     rather than of a defect - and it is dangerous, because it looks exactly
     like flakiness in the game and would let a real finding hide inside the
     noise. A census that cannot repeat its own answer is worth nothing.
     Raise it with CENSUS_WORKERS on a bigger machine. */
  workers: Number(process.env.CENSUS_WORKERS || 1),
  reporter: [["list"], ["json", { outputFile: ".census/report.json" }],
             ["html", { outputFolder: ".census/html", open: "never" }]],
  outputDir: ".census/artifacts",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    reducedMotion: "reduce",
    /* NO deviceScaleFactor HERE ANY MORE. It was pinned to 1, which overrode
       every profile back to whole-number scaling — the opposite of what item 2
       asks for. Each profile now carries its device's own. */
    launchOptions: ENGINE === "chromium" && existsSync("/opt/pw-browsers/chromium")
      ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }
      : { args: ["--no-sandbox"] },
  },
  /* The controls get a project of their OWN, bound by testMatch. They used to
     live in every project and skip themselves unless the project was called
     "phone-portrait" - so renaming the projects, which item 1 of the census
     build spec requires, skipped all 63 of them and exited 0. A file selected
     by testMatch cannot silently skip: either the project exists and runs it,
     or the project is gone and tools/census-report.mjs says so by name. */
  projects: [
    {
      name: "controls",
      testMatch: /controls\.spec\.mjs/,
      /* THE ENGINE IS DECLARED, NOT INFERRED FROM THE NAME. The coverage
         paragraph in tools/census-report.mjs used to split the project name on
         "-" and print "Engines: phone, tablet, narrow, desktop" — the one
         paragraph whose whole job is to state honestly what did NOT run,
         stating it falsely. It reads this instead, and says NOT DECLARED when
         a project omits it. Item 1 of the build spec adds firefox and webkit. */
      metadata: { role: "negative-controls", engine: ENGINE, device: VIEWPORTS[0].device },
      use: { ...devices[VIEWPORTS[0].device], browserName: ENGINE },
    },
    ...VIEWPORTS.map((v) => ({
      name: v.name,
      testIgnore: /controls\.spec\.mjs/,
      metadata: { role: "census", engine: ENGINE, device: v.device },
      /* The descriptor whole, so the user agent, the scale factor, touch and
         isMobile all come from the same device rather than three of them being
         set here and the fourth being whatever Playwright defaults to. */
      use: { ...devices[v.device], browserName: ENGINE },
    })),
  ],
  webServer: {
    /* THE BINARY, NOT `npx`. npx puts a shim process between Playwright and
       the server it thinks it is managing, so the handle Playwright holds is
       the shim's. On 2026-08-13 a run would serve its first cell and then
       answer ERR_CONNECTION_REFUSED for every cell after it — the server gone,
       Playwright none the wiser, and the whole thing reading like a flaky app
       rather than a dead process. The same page loaded fine on the same device
       against a hand-started preview, which is what ruled the app out. */
    command: `node_modules/.bin/vite preview --port ${PORT} --strictPort`,
    cwd: "app",
    url: `http://localhost:${PORT}/`,
    /* NEVER reuse. A preview server already on this port is serving some other
       build, and attaching to it means measuring an app nobody has built for
       this run - which happened during a review, and again in the first full
       run, which spent an hour measuring a build made before "a" and the split
       v existed. */
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
