/* A SPAN BETWEEN TWO ANCHORS - batch 1 of the refactor, owner-ruled
 * 2026-09-12.
 *
 * The converter and the rehearsal both splice a data literal out of the
 * reference build by its opening line and the first line-start terminator
 * after it; the converter imported this from the rehearsal, which imported
 * the converter's seat merge back - the tools' one import cycle. Finding the
 * span is a mechanic and belongs to neither, so it lives here.
 *
 * Both anchors must be found, or it throws naming the literal: a splice that
 * silently found nothing would leave a rehearsal testing today's world and
 * calling it clean, which is the fault the rehearsal exists to refuse.
 *
 * MECHANICS ONLY. Which anchors, and what goes between them, are the
 * caller's - the oracle line.
 *
 * Run: node tools/lib/splice.mjs --self-test
 */
import { pathToFileURL } from "node:url";
import { finish } from "./selftest.mjs";

/**
 * The half-open span [a, b) of `open` through the end of the first `close`
 * after it, in `src`.
 * @param {string} src @param {string} open @param {string} close @param {string} label
 * @returns {[number, number]}
 */
export function spanOf(src, open, close, label) {
  const a = src.indexOf(open);
  if (a < 0) throw new Error(`the reference has no ${label} literal to substitute (looked for ${JSON.stringify(open)})`);
  const b = src.indexOf(close, a);
  if (b < 0) throw new Error(`the reference's ${label} literal never ends (looked for ${JSON.stringify(close)})`);
  return [a, b + close.length];
}

function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  const throws = (fn, needle) => { try { fn(); return false; } catch (e) { return String(e.message).includes(needle); } };
  const src = "head\nconst X = [\n 1,\n];\ntail\nconst X = [\n 2,\n];\n";
  const [a, b] = spanOf(src, "const X = [", "\n];\n", "X");
  T("the span runs from the opening anchor through the end of the closing one", src.slice(a, b) === "const X = [\n 1,\n];\n");
  T("the FIRST opening anchor is taken, and the first close after it", a === 5 && b === 24);
  T("a missing opening anchor throws, naming the literal and the anchor", throws(() => spanOf(src, "const Y = [", "\n];\n", "Y"), "no Y literal to substitute"));
  T("a missing closing anchor throws, naming the literal", throws(() => spanOf(src, "const X = [", "\n};\n", "X"), "X literal never ends"));
  T("a close that appears only BEFORE the open is not taken", throws(() => spanOf("];\nconst Z = [", "const Z = [", "];", "Z"), "Z literal never ends"));
  return finish("splice", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
