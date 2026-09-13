/* G16, rules 13 and 14: the art bible's token table against C, and its
   state tables against the stylesheet and the reference's copy. The table
   anchors and the row counts are this gate's oracle. */

/* The rows of the section 9.3 table: `| key | #hex | note |`, from the
   heading to the next one. */
function tokenTable(bible) {
  const start = bible.indexOf("### 9.3 ");
  if (start < 0) return [];
  const end = bible.indexOf("\n## ", start);
  const body = bible.slice(start, end < 0 ? undefined : end);
  return [...body.matchAll(/^\| ([A-Za-z][A-Za-z0-9]*) \| (#[0-9a-fA-F]{6}) \|/gm)].map((m) => [m[1], m[2]]);
}
/* Rule 11 (art project step 0b, 2026-08-22): the palette's one prose
   statement is the token table in docs/art-bible.md section 9.3, bound to C
   in the engine by name and value, BOTH directions, case-insensitive. A table
   that parses to fewer than 29 rows is a moved anchor, and a rule reading
   nothing must say so (the G25 lesson) rather than pass. */
export function checkTokens(d) {
  const table = tokenTable(d.bible);
  const found = [];
  if (table.length < 29) found.push(`the art bible's section 9.3 token table parses to ${table.length} rows - the anchor moved, and this rule is checking nothing`);
  for (const [k, v] of table) {
    if (!(k in d.tokens)) found.push(`the art bible's token table names "${k}", which C does not have`);
    else if (String(d.tokens[k]).toLowerCase() !== v.toLowerCase()) found.push(`the art bible says ${k} is ${v}; C says ${d.tokens[k]}`);
  }
  for (const k of Object.keys(d.tokens)) if (!table.some(([t]) => t === k)) found.push(`C has "${k}", which the art bible's token table does not name`);
  return found;
}

/* Every state table, in document order, each as its own array of rows:
   `| state | \`selector\` | a, b, c |`, read from its header to the next
   section heading. Section 7's (the Glowseed) comes first, section 11's
   (the tiles) second. */
function stateTables(bible) {
  const tables = [];
  let from = 0;
  for (;;) {
    const start = bible.indexOf("| state | selector | tokens |", from);
    if (start < 0) break;
    const end = bible.indexOf("\n## ", start);
    const body = bible.slice(start, end < 0 ? undefined : end);
    const rows = [];
    for (const m of body.matchAll(/^\| ([^|`]+?) \| `([^`]+)` \| ([^|]+) \|/gm)) rows.push([m[1].trim(), m[2].trim(), m[3].split(",").map((t) => t.trim()).filter((t) => t && t !== "none")]);
    tables.push(rows);
    from = end < 0 ? bible.length : end;
  }
  return tables;
}
/* The text of `selector{...}` - the first block whose rule starts with the
   selector followed by `{`, or the keyframes block for an @keyframes name;
   null when absent. Brace-aware, because the sheet is a template: `${C.ink}`
   carries a brace of its own, so "the first }" ends a block mid-declaration. */
function cssBlock(src, selector) {
  const i = src.indexOf(selector + "{");
  if (i < 0) return null;
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}
/* Rule 12 (art step 1, 2026-08-22): bible 11's state table is the
   repository's - each row's selector must exist in the app's stylesheet AND
   in the reference's copy, and the block must name every token the row lists
   as ${C.token}. Prose cells ("3 px") are not bound. Fewer than 8 rows is a
   moved anchor. Since art step 2 the bible carries TWO such tables - section
   7's (the Glowseed, three looks and its core) and section 11's (the tiles) -
   and this rule reads every one; the Glowseed's selectors are app-only too,
   since the reference build has no Glowseed. PER TABLE, not in total: the
   first anchor was `< 12`, which is exactly section 11's own row count, so
   section 7's four Glowseed rows could be deleted whole and the rule stayed
   green - a guard that could not detect the removal of its own subject (the
   after pass, 2026-08-23). */
const APP_ONLY = new Set([".wq-sword-open", "@keyframes wqpop", ".wq-glowseed", ".wq-glowseed-lit", ".wq-glowseed-lit::after", ".wq-glowseed-muted"]);   // the reference build has no sentence stage, no sound-out animation and no Glowseed
function tableAnchors(tables) {
  if (tables.length < 2) return [`the art bible has ${tables.length} state table(s), not the two this rule reads (section 7's Glowseed and section 11's tiles) - an anchor moved`];
  const found = [];
  if (tables[0].length < 4) found.push(`the art bible's section 7 state table parses to ${tables[0].length} rows, fewer than the 4 the Glowseed has - an anchor moved, and this rule is checking less than it claims`);
  if (tables[1].length < 12) found.push(`the art bible's section 11 state table parses to ${tables[1].length} rows, fewer than the 12 the tiles have - an anchor moved, and this rule is checking less than it claims`);
  return found;
}
function stateFindings(state, selector, tokens, name, src) {
  const block = cssBlock(src, selector);
  if (block === null) return [`the art bible's tile table names "${selector}" (${state}), which ${name} does not have`];
  return tokens.filter((t) => !block.includes("${C." + t + "}") && !block.includes("${alpha(C." + t + ","))
    .map((t) => `the art bible says ${state} (${selector}) paints ${t}; ${name}'s block does not name it`);
}
export function checkStates(d) {
  const tables = stateTables(d.bible);
  const found = tableAnchors(tables);
  for (const [state, selector, tokens] of tables.flat()) {
    for (const [name, src] of [["app/src/wq-css.js", d.css], ["the reference", d.reference]]) {
      if (name === "the reference" && APP_ONLY.has(selector)) continue;
      found.push(...stateFindings(state, selector, tokens, name, src));
    }
  }
  return found;
}
