/* Vitest configuration. Coverage measures the generated engine AND the app
   sources (gate G6). The app was measured only after the microphone faults
   of beta.2, every one of which lived in an app file that no floor watched.
   A line that never runs in a test is a line nobody has checked.
   The aliases let the fault suite (gate G9) render the real app: @engine as in
   the app's Vite config, and one single React instance from app/node_modules
   so hooks see the same library the components use. */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  /* The app's Vite build injects this; without it the "Grown-ups corner"
     cannot be rendered in a test at all, which is how that screen came to
     have almost no coverage. */
  define: { __APP_VERSION__: JSON.stringify("0.0.0-test"), __APP_BUILD__: JSON.stringify("test-build") },
  resolve: {
    alias: { "@engine": p("./src/engine.js") },
    /* One React instance for the app sources and the test renderer. */
    dedupe: ["react", "react-dom"],
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/engine.js", "app/src/**/*.{js,jsx}"],
      /* ONE exclusion, deliberate and documented: main.jsx is entry wiring that
         runs on import, and the decision it used to hold now lives in
         swrefresh.js, which is measured. pronunciation.js was the second until
         2026-08-12, when the owner ruled the cloud scoring stub deleted along
         with the microphone. Nothing else may be excluded. */
      exclude: ["app/src/main.jsx"],
      reporter: ["text"],
      /* Floors sit at the measured truth on the day they were set, and rise
         from there (E6). They never fall. */
      thresholds: {
        "src/engine.js": { lines: 95, branches: 90 },
        "app/src/**": { lines: 82, branches: 84 },   /* same numbers as g6_app_lines_min and g6_app_branches_min in .claude/gate-baseline.json, which the gauntlet gates on: two places, one pair of numbers */
      },
    },
  },
});
