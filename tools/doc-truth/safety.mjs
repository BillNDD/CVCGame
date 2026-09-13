/* G16, rules 1 and 2: the two safety rules read against the code. The
   anchors and the sentences are this gate's oracle. */

/* SAFETY RULE S8 AGAINST THE CHUNKER AND THE PATHWAY (2026-09-02). S8 names
   the units the owner ruled by name, once said ph was "considered and left
   out", and since 2026-09-02 says every other tiled unit is a spelling the
   hundred-level pathway teaches. Level 91 had taught ph since 2026-08-17 and
   six bank words tiled it while the sentence stood - two agents editing two
   files, nothing reading one against the other. Owner: "we need to somehow
   correct the inconsistency between claude.md and agents.md". Three checks,
   every expected value read from the documents: a unit S8 names in a
   parenthesised list must be a tile the chunker emits; a unit S8 says was
   left out must not be emitted unless the next sentence says it was
   superseded; and every unit the chunker emits must be named in S8 or appear
   in some pathway level's `new` field. */
function namedUnits(s8) {
  const named = new Set();
  for (const m of s8.matchAll(/\(([a-z]{2,4}(?:, [a-z]{2,4})+)\)/g)) for (const u of m[1].split(", ")) named.add(u);
  for (const m of s8.matchAll(/\b(ai|ou|ey|or|ere|qu)\b(?= (?:\(|and|join|alone|\d))/g)) named.add(m[1]);
  return named;
}
function taughtUnits(pathway) {
  const taught = new Set();
  for (const row of JSON.parse(pathway)) for (const tok of String(row.new || "").split(/\s+/)) if (tok) taught.add(tok.split("=")[0]);
  return taught;
}
function leftOutFindings(s8, emitted) {
  const found = [];
  for (const m of s8.matchAll(/\b([a-z]{2,4}) was considered and left out\b[^.]*\.(\s*Superseded)?/g)) {
    if (!m[2] && emitted.has(m[1])) found.push(`S8 says ${m[1]} was left out, and the chunker emits it - the note is stale, or the ruling moved without S8 saying so`);
  }
  return found;
}
/* The third owner of a unit is a per-word tiling in the lexicon - laugh's
   one-use "ugh" tile, ruled at the cutover with no default on purpose - so a
   unit declared for a word there is accounted for, and a unit none of the
   three own is the drift. */
function unownedFindings(d, named, emitted) {
  const taught = taughtUnits(d.pathway);
  const perWord = new Set(Object.values(d.wordTiles || {}).flat().filter((t) => t.length > 1));
  const found = [];
  for (const u of emitted) if (!named.has(u) && !taught.has(u) && !perWord.has(u)) found.push(`the chunker tiles ${u} and neither S8, a pathway level nor a per-word tiling in the lexicon owns it`);
  return found;
}
export function checkS8(d) {
  /* Read with its line wraps folded: S8's lists wrap mid-parenthesis. */
  const s8 = ((d.claude.match(/- S8\.[\s\S]*?(?=\n- S9\.)/) || [""])[0]).replace(/\n\s+/g, " ");
  const emitted = new Set(d.levels.flatMap((l) => l.words).flatMap((w) => d.chunkWord(w)).filter((t) => t.length > 1));
  const found = [];
  if (!s8) found.push("CLAUDE.md has no S8 paragraph - the rule is checking nothing");
  const named = namedUnits(s8);
  for (const u of named) if (!emitted.has(u)) found.push(`S8 names ${u} as a tiling unit and the chunker never emits it for any bank word`);
  found.push(...leftOutFindings(s8, emitted));
  found.push(...unownedFindings(d, named, emitted));
  return found;
}

/* S9's own count of G24's corpus controls, read from S9 and counted in the
   tool: "seven controls" stood while the gate held thirteen. */
const WORDS = { seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15 };
export function checkS9Count(d) {
  const s9 = (d.claude.match(/- S9\.[\s\S]*?(?=\n## |$)/) || [""])[0];
  const cm = s9.match(/rule and (\w+) controls/);
  const corpusControls = (d.s9tool.match(/T\("(BREACH|window|corpus)/g) || []).length;
  if (!cm) return ["S9 no longer states G24's control count - the rule is checking nothing"];
  if (corpusControls > 0 && WORDS[cm[1]] !== corpusControls) return [`S9 says G24 carries ${cm[1]} controls, the corpus section of tools/s9-names.mjs holds ${corpusControls}`];
  return [];
}
