/* Quality metrics (gate G6). Only two rules, both limits from
   docs/testing-gauntlet.md: cyclomatic complexity 15 or less per function in
   the engine and the app; file length 900 lines or less for every source
   file. reference/word-quest.jsx is exempt (it must stay one file), and
   generated files are not source.
   The file-length ceiling was 600 lines until 2026-07-29, when the owner
   raised it to 900. tools/quality-control.mjs reads both numbers from
   .claude/gate-baseline.json and fails if this config disagrees with it. */
export default [
  {
    ignores: [
      "node_modules/", "app/node_modules/", "app/dist/", "coverage/",
      "reference/", "tests/generated/", "tools/fixtures/",
    ],
  },
  {
    files: ["src/engine.js", "app/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      complexity: ["error", 15],
      "max-lines": ["error", 1200],
    },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.{js,mjs}", "app/vite.config.js", "app/src/main.jsx", "*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module" },
    rules: {
      "max-lines": ["error", 1200],
    },
  },
];
