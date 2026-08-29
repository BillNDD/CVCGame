/* Quality metrics (gate G6). Only two rules, both limits from
   docs/testing-gauntlet.md: cyclomatic complexity 15 or less per function in
   the engine and the app; file length 1400 lines or less for every source
   file except the generated engine, whose own ceiling is 2600.
   reference/word-quest.jsx is exempt (it must stay one file), and
   generated files are not source — the generated engine is linted anyway,
   deliberately, so the module the app actually imports stays under the
   same roof.
   The file-length ceiling was 600 lines until 2026-07-29; the owner raised
   it to 900 that day, to 1200 on 2026-08-12, and to 1400 on 2026-08-15
   ("Increase it to 1400 on my authority" — the auditor found this header
   still saying 900 while the enforced number had moved twice; CLAUDE.md E6
   is the record). On 2026-08-16 the owner split the engine out: "Increase
   the engine specific line max to 2400" — the engine alone rose to 2400, and
   on 2026-08-25 to 2600 ("Increase engine max length to 2600 lines") for the
   chunk-ladder roster,
   every other file keeps 1400. tools/quality-control.mjs reads all the
   numbers from .claude/gate-baseline.json and fails if this config
   disagrees with it. */
export default [
  {
    ignores: [
      "node_modules/", "app/node_modules/", "app/dist/", "coverage/",
      "reference/", "tests/generated/", "tools/fixtures/", ".stryker-tmp/",
    ],
  },
  {
    files: ["src/engine.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 15],
      "max-lines": ["error", 2600],
    },
  },
  {
    files: ["app/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      complexity: ["error", 15],
      "max-lines": ["error", 1400],
    },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.{js,mjs}", "app/vite.config.js", "app/src/main.jsx", "*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module" },
    rules: {
      "max-lines": ["error", 1400],
    },
  },
];
