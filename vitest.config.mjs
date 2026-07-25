/* Vitest configuration. Coverage measures the generated engine only (gate G6):
   the floors are 95 percent lines and 90 percent branches, enforced here so a
   shortfall fails the run.
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
      include: ["src/engine.js"],
      reporter: ["text"],
      thresholds: { lines: 95, branches: 90 },
    },
  },
});
