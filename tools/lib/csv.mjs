/* ONE CSV LINE INTO CELLS - batch 1 of the refactor, owner-ruled 2026-09-12.
 *
 * The converter (tools/convert-ladder.mjs) imported this from the rehearsal
 * (tools/conversion-rehearsal.mjs) "so the two tools cannot parse the same
 * file two ways", and the rehearsal imported the converter's seat merge for
 * the same reason - the one import cycle among the tools, and one the cycle
 * gate could not see because it read app/src and src alone. The parser is a
 * mechanic and belongs to neither, so it lives here and both import it.
 *
 * Double quotes are honoured (the note column holds commas) and a doubled
 * quote inside a quoted cell is one quote. Enough parser for the lexicon and
 * no more; the controls prove each shape.
 *
 * MECHANICS ONLY. What a row must hold is the gate's - the oracle line.
 *
 * Run: node tools/lib/csv.mjs --self-test
 */
import { pathToFileURL } from "node:url";
import { finish } from "./selftest.mjs";

/** @param {string} line */
export function csvCells(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  T("a plain row splits on its commas", csvCells("a,b,c").join("|") === "a|b|c");
  T("a quoted cell keeps its comma", csvCells('moon,"moon, food, boot",x').join("|") === "moon|moon, food, boot|x");
  T("a doubled quote inside a quoted cell is one quote", csvCells('a,"b""c",d')[1] === 'b"c');
  T("an empty cell is an empty string, and the last cell is kept", csvCells("a,,c,").join("|") === "a||c|");
  T("a line with no comma is one cell", csvCells("alone").length === 1 && csvCells("alone")[0] === "alone");
  T("an unclosed quote runs to the end of the line rather than throwing", csvCells('a,"b,c').join("|") === "a|b,c");
  return finish("csv", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
