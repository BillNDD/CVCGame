/* Quality metrics (gate G6). Only two rules, both limits from
   docs/testing-gauntlet.md: cyclomatic complexity 15 or less per function in
   the engine and the app; file length 1400 lines or less for every source
   file except the generated engine's modules, whose own ceiling is 501.
   reference/word-quest.jsx is exempt (it must stay one file), and
   generated files are not source — the generated engine is linted anyway,
   deliberately, so the module the app actually imports stays under the
   same roof.
   The file-length ceiling was 600 lines until 2026-07-29; the owner raised
   it to 900 that day, to 1200 on 2026-08-12, and to 1400 on 2026-08-15
   ("Increase it to 1400 on my authority" — the auditor found this header
   still saying 900 while the enforced number had moved twice; AGENTS.md E6
   is the record). On 2026-08-16 the owner split the engine out: "Increase
   the engine specific line max to 2400" — the engine alone rose to 2400, and
   on 2026-08-29 to 2600 ("Increase engine max length to 2600 lines") for the
   chunk-ladder roster, and on 2026-09-03 to 3000 ("Up the max lines for the
   engine to 3000") for the garden's colours - this header said 2600 until
   2026-09-12, nine days after the rule below moved; every other file keeps
   1400. On 2026-09-13, batch 2 of the refactor split the engine into one
   module per section of the reference and the ceiling came DOWN to 1485,
   the length of the largest module then (the sounds module) with no slack -
   the repayment the 3000 raise was owed. The same day, batch 2b moved the
   storage block below the chunk roster, the engine became thirteen modules,
   and the ceiling came down again to 501, the length of the largest module
   (src/engine/content.js, the teaching tables) with no slack; AGENTS.md E6
   is the record. tools/quality-control.mjs reads all the
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
    /* The generated engine: since batch 2 of the refactor (2026-09-13) one
       module per section of the reference under src/engine/, and the index
       src/engine.js that re-exports them - under the same roof, the index
       exempt from nothing. */
    files: ["src/engine.js", "src/engine/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 15],
      "max-lines": ["error", 501],
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
