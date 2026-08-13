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
import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { VIEWPORTS } from "./tools/ux-census.mjs";

const PORT = 4187;

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
    deviceScaleFactor: 1,
    launchOptions: {
      executablePath: existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined,
      args: ["--no-sandbox"],
    },
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
      metadata: { role: "negative-controls", engine: "chromium" },
      use: {
        viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
        hasTouch: VIEWPORTS[0].touch, isMobile: VIEWPORTS[0].touch,
      },
    },
    ...VIEWPORTS.map((v) => ({
      name: v.name,
      testIgnore: /controls\.spec\.mjs/,
      metadata: { role: "census", engine: "chromium" },
      use: { viewport: { width: v.width, height: v.height }, hasTouch: v.touch, isMobile: v.touch },
    })),
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
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
