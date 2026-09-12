/* THE MEASUREMENT CONFIG - a report, never a gate.
   Batch 0 of the refactor, owner-ruled 2026-09-12 (ruling 4 of the plan the
   owner agreed to in full): cognitive complexity is MEASURED from this batch
   and enforced by nothing before batch 2. So the sonarjs plugin is a
   devDependency from today, its one rule here is set to "warn" with the
   threshold at zero so every function reports its number, and nothing in
   `npm run check` or the gauntlet reads this file. The shape gate
   (tools/shape.mjs, G31) holds the ceilings that ARE enforced; this config
   exists so the number batch 2 will set a ceiling on can be read today.

   The sonarjs plugin carries no rule for the ABC size metric, so ABC is not
   measured here; batch 2 decides its instrument.

   The scopes are the shape gate's: app/src, the generated engine and the
   tools. The reference build's own component is out, exactly as
   eslint.config.mjs leaves it out.

   Run: node node_modules/eslint/bin/eslint.js --no-inline-config --config eslint.measure.mjs app/src src/engine.js tools
        (add --format json to keep the numbers) */
let sonarjs;
try {
  sonarjs = (await import("eslint-plugin-sonarjs")).default;
} catch {
  throw new Error("eslint-plugin-sonarjs is not installed - it is a devDependency since 2026-09-12; run npm install");
}
const rules = { "sonarjs/cognitive-complexity": ["warn", 0] };
export default [
  {
    ignores: [
      "node_modules/", "app/node_modules/", "app/dist/", "coverage/",
      "reference/", "tests/generated/", "tools/fixtures/", ".stryker-tmp/",
    ],
  },
  {
    files: ["src/engine.js", "tools/**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module" },
    plugins: { sonarjs },
    rules,
  },
  {
    files: ["app/src/**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { sonarjs },
    rules,
  },
];
