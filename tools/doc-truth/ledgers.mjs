/* G16, rules 10 to 12: the counts and lists the documents keep beside a
   ledger or a table - the approved-and-unshipped heading, SPEC's level rows,
   and the tools the governing documents tell an agent to run. */

/* How many approved items are still waiting for a level. Every key in the
   ledger except its own comment, minus anything the shipped pack already
   carries - an item that has shipped is no longer unshipped, and the ledger
   keeps its row as provenance. A word key is bare ("jump"), a sentence key
   carries the "s:" prefix, and the pack names words "w:jump".
   An entry with `superseded_by` is neither shipped nor waiting: its text
   ships under another id whose clip the owner also approved, so the row is
   provenance for a render that will never ship (two rounds offered the same
   sentence twice on 2026-08-15, and the accepted clip is the authority - the
   word-a rule). Counting one as waiting would keep the heading wrong forever. */
export function unshipped(ledgerText, packText) {
  const pack = JSON.parse(packText);
  return Object.keys(JSON.parse(ledgerText))
    .filter((k) => k !== "_comment")
    .filter((k) => !JSON.parse(ledgerText)[k].superseded_by)
    .filter((k) => !(k.startsWith("s:") ? k in pack : "w:" + k in pack)).length;
}
/* The approved backlog the voice-pack document reports must be the backlog
   the ledger holds. Owner time is the scarcest thing this project spends, and
   a heading that undercounts it hides the debt rather than paying it. */
export function checkUnshipped(d) {
  const stated = /## Approved and unshipped: (\d+) items/.exec(d.voiceDoc);
  const waiting = unshipped(d.ledger, d.pack);
  if (!stated || Number(stated[1]) !== waiting)
    return [`the voice-pack document says ${stated ? stated[1] : "no"} items are approved and unshipped, the ledger holds ${waiting}`];
  return [];
}

/* SPEC's level table, word for word against the engine. The table is the
   only place a reader can see what a level actually contains, so a row that
   drifts is a document telling a grown-up about a level the game does not
   have. Order matters: a level's word order IS its introduction order. */
function rowFinding(l, row) {
  const listed = row[1].trim().split(/\s+/).join(" ");
  if (listed === l.words.join(" ")) return null;
  const missing = l.words.filter((w) => !row[1].split(/\s+/).includes(w));
  return `SPEC's Level ${l.n} row lists ${listed.split(" ").length} words, the level holds ${l.words.length}`
    + (missing.length ? ` (missing: ${missing.join(", ")})` : " (same words, different order)");
}
export function checkLevelTable(d) {
  const found = [];
  for (const l of d.levels) {
    const row = new RegExp(`^\\| ${l.n} \\|[^|]*\\|[^|]*\\| ([^|]*)\\|`, "m").exec(d.spec);
    if (!row) { found.push(`SPEC's level table has no row for Level ${l.n}`); continue; }
    const finding = rowFinding(l, row);
    if (finding) found.push(finding);
  }
  return found;
}

/* THE ORPHAN RULE (owner-ruled 2026-08-13). A tool an agent is told to run is
   only as real as the sentence that tells them. Nothing in this repository
   used to notice if that sentence was edited away, and an agent resuming
   after a context compaction knows only what the governing documents say -
   so a tool dropped from AGENTS.md is a tool that has stopped existing,
   however green its own controls are.

   Both halves are checked, because a tool can be orphaned in two directions:
   the documents stop naming it, or the command stops running it and it rots
   unnoticed. `tools` is the entry's list of what an agent is told to run. */
export function checkOrphans(d, tools) {
  const found = [];
  for (const t of tools) {
    for (const [doc, text] of Object.entries(t.docs)) {
      if (!d[text].includes(t.file))
        found.push(`${doc} no longer names ${t.file} (${t.why}) — an agent reading only the governing documents would never run it`);
    }
    /* `runBy` names what runs the tool when it is not an npm script: a gate's
       entry, importing its rule module. */
    if (t.command && !d[t.wiredIn || "pkg"].includes(t.command))
      found.push(`${t.runBy || `npm run ${t.script}`} no longer runs ${t.file} (${t.why}) — it can now rot without anything going red`);
  }
  return found;
}
