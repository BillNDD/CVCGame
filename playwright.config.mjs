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
  workers: process.env.CI ? 2 : 4,
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
  projects: VIEWPORTS.map((v) => ({
    name: v.name,
    use: { viewport: { width: v.width, height: v.height }, hasTouch: v.touch, isMobile: v.touch },
  })),
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    cwd: "app",
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
