/* NO EMOJI IN A LOCATOR (art project step 0a, owner-ruled 2026-08-22).
 *
 * The icons ruling is two steps: first every control gets a plain
 * aria-label and every locator moves to it, with no visible change; then the
 * original icons arrive screen by screen. This scan is what makes the first
 * step provable rather than asserted (the engineering chair's finding: "every
 * locator moved" was unmeasured). It reads every test and every census tool
 * and refuses a LOCATOR whose string names a pictograph - getByText,
 * getByLabelText, getByRole's name, locator(), getByText in Playwright - so
 * the icon swap cannot break a locator it never knew about.
 *
 * Only locator calls. A test that asserts visible copy, a copy-lint pin, a
 * source tripwire or a listening-page builder may say "🎉" all it likes:
 * those are content, and the icons ruling keeps the labels' words beside
 * the icons. Python round builders are not scanned at all; they build pages
 * a listener reads, not locators.
 *
 * Run: node tools/locator-scan.mjs            Controls: node tools/locator-scan.mjs --self-test
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PICTOGRAPH = /[←-⇿⌀-⏿■-➿⬀-⯿\u{1F000}-\u{1FAFF}]/u;
/* A locator call with a string argument, or a role query's name. The string
   may be double-, single- or backtick-quoted. */
const LOCATOR = /\b(getByText|queryByText|getAllByText|findByText|getByLabelText|queryByLabelText|getAllByLabelText|getByLabel|getByRole|getByTitle|locator|getByPlaceholder)\s*\(\s*(?:["'`])([^"'`]*)(?:["'`])|\bname:\s*(?:["'`])([^"'`]*)(?:["'`])/g;

export function scan(text) {
  const hits = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const s = line.trim();
    if (s.startsWith("//") || s.startsWith("*") || s.startsWith("/*")) return;
    for (const m of line.matchAll(LOCATOR)) {
      const str = m[2] ?? m[3] ?? "";
      if (PICTOGRAPH.test(str)) hits.push({ line: i + 1, text: str });
    }
  });
  return hits;
}

function files() {
  const out = execFileSync("git", ["ls-files", "-z", "--", "tests", "tools/ux-census.mjs", "tools/census-novelties.mjs"], { encoding: "utf8" });
  return out.split("\0").filter((f) => /\.(m?js)$/.test(f) && !f.startsWith("tests/generated/"));
}

function selfTest() {
  const ok = [];
  ok.push(["a text locator naming an emoji is caught", scan('fireEvent.click(screen.getByText("🎈 Free play"));').length === 1]);
  ok.push(["a role query whose name carries a symbol is caught", scan('screen.getByRole("button", { name: "✓ got it (hold)" })').length === 1]);
  ok.push(["a Playwright locator with an arrow is caught", scan('page.getByText("Next word ➡️")').length === 1]);
  ok.push(["a plain locator passes", scan('screen.getByLabelText("Begin Session"); page.getByRole("button", { name: "Free play" })').length === 0]);
  ok.push(["a copy assertion is not a locator", scan('expect(document.body.textContent).toContain("🎉 Great job!");').length === 0]);
  ok.push(["a comment is not scanned", scan('// the old label was "▶️ Begin Session"').length === 0]);
  ok.push(["a regex locator without a pictograph passes", scan('screen.getByText(/Great job!/)').length === 0]);
  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nlocator-scan controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

let problems = 0, scanned = 0;
for (const f of files()) {
  scanned += 1;
  for (const h of scan(readFileSync(f, "utf8"))) { problems += 1; console.log(`PROBLEM: ${f}:${h.line} locator names a pictograph: "${h.text}"`); }
}
console.log(`Locator scan: ${scanned} files, ${problems} locators naming a pictograph`);
process.exit(problems ? 1 : 0);
