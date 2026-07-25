/* Vitest configuration. Coverage measures the generated engine only (gate G6):
   the floors are 95 percent lines and 90 percent branches, enforced here so a
   shortfall fails the run. */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/engine.js"],
      reporter: ["text"],
      thresholds: { lines: 95, branches: 90 },
    },
  },
});
