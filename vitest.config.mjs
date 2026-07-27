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
  resolve: {
    alias: { "@engine": p("./src/engine.js") },
    /* One React instance for the app sources and the test renderer. */
    dedupe: ["react", "react-dom"],
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/engine.js", "app/src/**/*.{js,jsx}"],
      /* Two exclusions, both deliberate and both documented. main.jsx is entry
         wiring that runs on import; the decision it used to hold now lives in
         swrefresh.js, which is measured. pronunciation.js is an interface stub
         for a service that is out of scope (SPEC section 8, item 4); nothing
         imports it. Nothing else may be excluded. */
      exclude: ["app/src/main.jsx", "app/src/pronunciation.js"],
      reporter: ["text"],
      /* Floors sit at the measured truth on the day they were set, and rise
         from there (E6). They never fall. */
      thresholds: {
        "src/engine.js": { lines: 95, branches: 90 },
        "app/src/**": { lines: 81, branches: 82 },
      },
    },
  },
});
