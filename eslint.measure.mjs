/* THE MEASUREMENT CONFIG - a report, never a gate.
   Batch 0 of the refactor, owner-ruled 2026-09-12 (ruling 4 of the plan the
   owner agreed to in full): cognitive complexity is MEASURED from this batch
   and enforced by nothing before batch 3. From batch 3 (owner-ruled
   2026-09-15) the number is enforced by the shape gate (tools/shape.mjs,
   G31) at its own ceiling; this config remains the standalone report, its
   one rule here set to "warn" with the threshold at zero so every function
   reports its number. The shape gate (tools/shape.mjs, G31) holds the
   ceilings that ARE enforced; this config
   existed so the number batch 3 set a ceiling on could be read.

   The sonarjs plugin carries no rule for the ABC size metric, so ABC is not
   measured here; batch 3 decided the instrument by enforcing the sonar
   number in the shape gate.

   The scopes are the shape gate's: app/src, the generated engine and the
   tools. The reference build's own component is out, exactly as
   eslint.config.mjs leaves it out.

   Run: node node_modules/eslint/bin/eslint.js --no-inline-config --config eslint.measure.mjs app/src src tools
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
    files: ["src/engine.js", "src/engine/*.js", "tools/**/*.mjs"],
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
