/* G26 — the waiting room: byte pins, schema, citations and verdicts.
 *
 * WHY THIS EXISTS. Every clip the owner has approved by ear and that has not
 * yet shipped lives in `tools/pending-words/`: a ledger row carrying a sha256,
 * and an mp3 beside it. Nothing checked that the two agree. G13
 * (`voice-check.mjs`) reads the shipped pack and never looks here;
 * `ledger-truth.mjs` checks sounds, not words; `doc-truth.mjs` reads this
 * ledger only to count it. The pin was honoured in exactly one place,
 * `tools/ship-words.py`, at ship time — weeks away for the 100-level ladder's
 * material. Between approval and shipping the bytes were unguarded, which is
 * the window in which they are written in bulk by tooling nobody has reviewed.
 *
 * It earned itself twice before it was written. An audit on 2026-08-18 found a
 * listening-round recorder writing mp3s inside its loop and then printing
 * "REFUSED - nothing written"; an audit on 2026-08-19 found 22 sentence takes
 * banked by a script in neither the repository nor the scratchpad, with no step
 * refusing bytes that failed to hash to what the owner heard. Both times the
 * bytes turned out to be correct. Neither time was anything checking.
 *
 * SIX RULES, owner-approved 2026-08-19.
 *   1. Every row's sha256 is the sha256 of the bytes on disk.
 *   2. Every row has bytes, and every mp3 in the room has a row.
 *   3. No two rows share a sha256.
 *   4. Every row carries the fields its kind needs.
 *   5. A row claiming a source is verifiable against that source.
 *   6. Every verdict is one of the two declared values.
 *
 * WHY RULE 6 DECLARES TWO VALUES AND NOT ONE — READ THIS BEFORE TIDYING.
 * `perfect` and `either-is-fine` are NOT synonyms and collapsing them is a
 * data loss, not a simplification. `perfect` means the owner listened and
 * CHOSE this clip. `either-is-fine` means he listened, judged two candidates
 * both acceptable, and DECLINED to choose — a tool then broke the tie. Writing
 * `perfect` over an `either-is-fine` row makes the ledger assert a decision the
 * owner did not make. He kept the second value for exactly that reason when he
 * ruled on 2026-08-19. This repository has already paid once for a record that
 * lost which thing went with which: a result approved on 28 July was lost for
 * two days because the closing record never said which margin went with which
 * word. Do not merge these two values. If a future reader finds this list
 * short and wants to tidy it, the shortness is the point.
 *
 * WHAT THIS GATE CANNOT DO.
 *   - It cannot prove the bytes are the ones the owner heard. Only the recorder
 *     can, by refusing at the moment of writing to bank bytes that do not hash
 *     to what it offered. Rule 3 is the closest this gate gets: two rows with
 *     identical bytes mean one approval was banked twice, or an id was minted
 *     over a live one.
 *   - It cannot catch a verdict COLLAPSE. If an `either-is-fine` row is
 *     rewritten to `perfect`, rule 6 passes, because `perfect` is a legal
 *     value. The rule closes the vocabulary; it cannot see a legal value put in
 *     the wrong row. That limit is proved by a control below rather than left
 *     for someone to discover, because an honest limit written down beats a
 *     false claim of coverage.
 *   - It cannot judge a clip, a sentence or a citation's suitability. A green
 *     run means the room is internally honest, not that anything in it is good.
 *     `tools/sentence-screen.mjs` and a person reading own that.
 *
 * Usage:
 *   node tools/waiting-room.mjs              check the tree
 *   node tools/waiting-room.mjs --self-test  prove each rule catches its fault
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const DIR = "tools/pending-words";
const LEDGER = `${DIR}/pending-words.json`;
/* The corpus manifest: one line per cited book. Adding a book is one line. */
const SOURCES = "tools/corpus/sources.json";

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/* A ledger key is a bare word ("jump") or a prefixed sentence id
   ("s:v3-l02-01"); the bytes are "w-jump.mp3" and "s-v3-l02-01.mp3". */
export const fileFor = (key) => (key.startsWith("s:") ? `s-${key.slice(2)}` : `w-${key}`) + ".mp3";
export const isSentence = (key) => key.startsWith("s:");

/* RULE 6's declared set, owner-ruled 2026-08-19. Two values, and the header
   above says at length why the second one is not redundant. Widening this list
   to fit a row is backwards: the row gets restated, never the rule. */
export const VERDICTS = ["perfect", "either-is-fine"];

/* Whitespace is the writer's, not the child's: a quotation spans line breaks in
   the source and is one line in the ledger. Nothing else is normalised, because
   a credit that needs the text bent to match is not a verbatim credit. */
const flat = (s) => String(s).replace(/\s+/g, " ").trim();

/* THE CHECK IS A PURE FUNCTION of what it is given, so a fixture can drive
   every rule without touching the tree. `bytes` maps a file name to its
   contents; `files` is the directory listing; `sources` is the parsed manifest
   with each entry's text already loaded, or null when there is no manifest. */
export function check(ledger, files, bytes, sources = null) {
  const problems = [];
  const rows = Object.fromEntries(Object.entries(ledger).filter(([k]) => !k.startsWith("_")));

  /* ---- rule 1: the byte pin ------------------------------------------ */
  for (const [key, row] of Object.entries(rows)) {
    if (!row || typeof row !== "object") { problems.push(`rule 4: ${key} is not a row object`); continue; }
    const name = fileFor(key);
    if (!Object.prototype.hasOwnProperty.call(bytes, name)) continue;   // rule 2 owns absence
    const got = sha(bytes[name]);
    if (got !== row.sha256)
      problems.push(`rule 1: ${key} — ${name} hashes to ${got.slice(0, 12)}, the ledger pins ${String(row.sha256).slice(0, 12)}`);
  }

  /* ---- rule 2: rows and clips come in pairs -------------------------- */
  const expected = new Set(Object.keys(rows).map(fileFor));
  for (const key of Object.keys(rows))
    if (!files.includes(fileFor(key)))
      problems.push(`rule 2: ${key} has a ledger row and no bytes at ${fileFor(key)}`);
  for (const f of files)
    if (!expected.has(f))
      problems.push(`rule 2: ${f} is in the waiting room and no ledger row claims it`);
  /* A row that names its own file must name the right one. Two naming schemes
     already live in this ledger; a third would be silent. */
  for (const [key, row] of Object.entries(rows))
    if (row && row.file && row.file !== fileFor(key))
      problems.push(`rule 2: ${key} names file "${row.file}" but its key derives "${fileFor(key)}"`);

  /* ---- rule 3: no two rows share bytes ------------------------------- */
  const bySha = new Map();
  for (const [key, row] of Object.entries(rows)) {
    if (!row || !row.sha256) continue;
    if (!bySha.has(row.sha256)) bySha.set(row.sha256, []);
    bySha.get(row.sha256).push(key);
  }
  for (const [s, keys] of bySha)
    if (keys.length > 1)
      problems.push(`rule 3: ${keys.join(" and ")} share the sha256 ${s.slice(0, 12)} — one approval banked twice, or an id minted over a live one`);

  /* ---- rule 4: the fields a row's kind needs -------------------------- */
  /* Both kinds need the pin and the provenance of the verdict. A word row must
     say WHICH offered take was accepted; the ledger holds two ways of saying so
     — `arm` since batch 15, `file` + `word` before it — and either is a real
     answer, so this asks for "arm or file". Requiring `arm` alone would refuse
     thirteen legitimate rows from batches 12 to 14. A sentence row must carry
     its `text`, because the text IS the thing approved and nothing else in the
     tree records it. `family` is deliberately NOT required of sentence rows:
     ninety-six of them predate the field. */
  const NEED_BOTH = ["sha256", "ms", "round", "verdict"];
  for (const [key, row] of Object.entries(rows)) {
    if (!row || typeof row !== "object") continue;
    for (const f of NEED_BOTH)
      if (row[f] === undefined) problems.push(`rule 4: ${key} has no ${f}`);
    if (isSentence(key)) {
      if (row.text === undefined)
        problems.push(`rule 4: ${key} is a sentence row with no text — nothing records what was approved`);
    } else if (row.arm === undefined && row.file === undefined) {
      problems.push(`rule 4: ${key} is a word row with neither arm nor file — nothing records which offer was accepted`);
    }
  }

  /* ---- rule 5: a citation must be checkable -------------------------- */
  /* A `credit` names a book. Nothing re-read that book, the texts lived outside
     the repository, and the pipeline that produced them was caught on
     2026-08-19 presenting five non-contiguous runs as passages — one of them
     joining sentences from either side of a lesson heading. A citation in a
     children's product is a claim, and an unverifiable claim is worse than
     none. Each credited row's text is split into sentences and every one must
     appear in the declared source. */
  const credited = Object.entries(rows).filter(([, r]) => r && r.credit);
  if (credited.length && !sources) {
    problems.push(`rule 5: ${credited.length} row(s) claim a source (${credited.map(([k]) => k).join(", ")}) and ${SOURCES} does not exist — a credit nothing can check is not a citation`);
  } else if (credited.length) {
    for (const [key, row] of credited) {
      const src = sources[row.credit];
      if (!src) { problems.push(`rule 5: ${key} credits "${row.credit}", which ${SOURCES} does not declare`); continue; }
      if (src.missing) { problems.push(`rule 5: ${SOURCES} declares "${row.credit}" at ${src.file}, which is not in the tree`); continue; }
      if (src.sha256 && src.actualSha && src.sha256 !== src.actualSha)
        problems.push(`rule 5: the declared source "${row.credit}" (${src.file}) hashes to ${src.actualSha.slice(0, 12)}, the manifest pins ${src.sha256.slice(0, 12)} — the book changed under its citations`);
      const hay = flat(src.text);
      for (const part of String(row.text ?? "").split(/(?<=[.!?])\s+/))
        if (part.trim() && !hay.includes(flat(part)))
          problems.push(`rule 5: ${key} credits "${row.credit}" but ${JSON.stringify(part)} does not appear in it`);
    }
  }

  /* ---- rule 6: the declared verdict set ------------------------------ */
  for (const [key, row] of Object.entries(rows)) {
    if (!row || row.verdict === undefined) continue;      // rule 4 owns absence
    if (!VERDICTS.includes(row.verdict))
      problems.push(`rule 6: ${key} has verdict ${JSON.stringify(row.verdict)}, which is not one of ${VERDICTS.map((v) => JSON.stringify(v)).join(", ")}`);
  }

  return problems;
}

/* ---- reading the real tree ------------------------------------------ */
function fromTree() {
  const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
  const files = readdirSync(DIR).filter((f) => f.endsWith(".mp3"));
  const bytes = {};
  for (const f of files) bytes[f] = readFileSync(`${DIR}/${f}`);
  let sources = null;
  if (existsSync(SOURCES)) {
    sources = {};
    const man = JSON.parse(readFileSync(SOURCES, "utf8"));
    for (const [credit, entry] of Object.entries(man)) {
      if (credit.startsWith("_")) continue;
      if (!existsSync(entry.file)) { sources[credit] = { ...entry, missing: true }; continue; }
      const buf = readFileSync(entry.file);
      sources[credit] = { ...entry, text: buf.toString("utf8"), actualSha: sha(buf) };
    }
  }
  return { ledger, files, bytes, sources };
}

if (process.argv.includes("--self-test")) {
  /* Fixtures, never the tree. Every rule gets a planted fault AND a control that
     must pass — a rule that only ever meets clean data passes on an
     implementation that compares nothing, which is precisely the risk for rule
     3, since the real ledger holds no duplicate sha256 at all. */
  const A = Buffer.from("clip-a"), B = Buffer.from("clip-b"), C = Buffer.from("clip-c");
  const BOOK = "Look. The fat hen is on the box.\nThe rat ran from the box. Can the hen run?";
  const base = {
    _comment: "ignored",
    jump: { arm: "jump_3", family: "say_sp0.85", ms: 900, sha256: sha(A), round: "batch 21 round 1", verdict: "perfect" },
    "s:v3-l02-01": { text: "I sip.", family: "sentence_sp1.0", ms: 1190, sha256: sha(B), round: "sentence batch 1", verdict: "either-is-fine" },
    "s:v3-l40-01": { text: "The fat hen is on the box. The rat ran from the box.", ms: 1700, sha256: sha(C), round: "sentence batch 1", verdict: "perfect", credit: "A Reader" },
  };
  const files = ["w-jump.mp3", "s-v3-l02-01.mp3", "s-v3-l40-01.mp3"];
  const bytes = { "w-jump.mp3": A, "s-v3-l02-01.mp3": B, "s-v3-l40-01.mp3": C };
  const sources = { "A Reader": { file: "tools/corpus/reader.txt", sha256: sha(Buffer.from(BOOK)), text: BOOK, actualSha: sha(Buffer.from(BOOK)) } };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const withRow = (mut) => { const l = clone(base); mut(l); return l; };

  /** @type {Array<[string, () => string[], number]>} */
  const cases = [
    ["control: a clean waiting room passes all six rules", () => check(base, files, bytes, sources), 0],

    ["rule 1: a clip whose bytes changed under its pin is caught",
      () => check(base, files, { ...bytes, "w-jump.mp3": Buffer.from("clip-a-TAMPERED") }, sources), 1],
    ["rule 1 control: the same clip untouched passes",
      () => check(base, files, bytes, sources), 0],

    ["rule 2: a row with no bytes is caught",
      () => { const b = { ...bytes }; delete b["w-jump.mp3"]; return check(base, files.filter((f) => f !== "w-jump.mp3"), b, sources); }, 1],
    ["rule 2: an mp3 no row claims is caught",
      () => check(base, [...files, "w-ghost.mp3"], { ...bytes, "w-ghost.mp3": Buffer.from("x") }, sources), 1],
    ["rule 2: a row naming the wrong file is caught",
      () => check(withRow((l) => { l.jump.file = "w-jumps.mp3"; }), files, bytes, sources), 1],

    ["rule 3: TWO ROWS SHARING BYTES are caught — the id-collision control",
      () => check(withRow((l) => { l["s:v3-l02-01"].sha256 = sha(A); }), files, { ...bytes, "s-v3-l02-01.mp3": A }, sources), 1],
    ["rule 3 control: three distinct clips pass",
      () => check(base, files, bytes, sources), 0],

    ["rule 4: a sentence row with no text is caught",
      () => check(withRow((l) => { delete l["s:v3-l02-01"].text; }), files, bytes, sources), 1],
    ["rule 4: a word row with neither arm nor file is caught",
      () => check(withRow((l) => { delete l.jump.arm; }), files, bytes, sources), 1],
    ["rule 4 control: a word row carrying the older file+word shape passes",
      () => check(withRow((l) => { delete l.jump.arm; l.jump.file = "w-jump.mp3"; l.jump.word = "jump"; }), files, bytes, sources), 0],
    ["rule 4 control: a sentence row with no family passes",
      () => check(withRow((l) => { delete l["s:v3-l02-01"].family; }), files, bytes, sources), 0],
    ["rule 4: a row with no verdict is caught",
      () => check(withRow((l) => { delete l.jump.verdict; }), files, bytes, sources), 1],

    ["rule 5: A CREDITED TEXT ALTERED BY ONE WORD is caught",
      () => check(withRow((l) => { l["s:v3-l40-01"].text = "The fat hen is on the mat. The rat ran from the box."; }), files, bytes, sources), 1],
    ["rule 5 control: the unaltered credited text passes, across a line break in the source",
      () => check(base, files, bytes, sources), 0],
    ["rule 5: a credit naming an undeclared source is caught",
      () => check(withRow((l) => { l["s:v3-l40-01"].credit = "A Book Nobody Declared"; }), files, bytes, sources), 1],
    ["rule 5: a credited row with no manifest at all is caught",
      () => check(base, files, bytes, null), 1],
    ["rule 5: a declared book whose bytes no longer match its pin is caught",
      () => check(base, files, bytes, { "A Reader": { ...sources["A Reader"], actualSha: sha(Buffer.from("a different edition")) } }), 1],
    ["rule 5: a declared book missing from the tree is caught",
      () => check(base, files, bytes, { "A Reader": { file: "tools/corpus/reader.txt", missing: true } }), 1],
    ["rule 5 control: a ledger with no credited row needs no manifest",
      () => check(withRow((l) => { delete l["s:v3-l40-01"].credit; }), files, bytes, null), 0],

    ["rule 6: a verdict outside the declared set is caught",
      () => check(withRow((l) => { l.jump.verdict = "either is fine - runner picked this one"; }), files, bytes, sources), 1],
    ["rule 6: another wording of the same act is still caught",
      () => check(withRow((l) => { l.jump.verdict = "pick"; }), files, bytes, sources), 1],
    ["rule 6 control: both declared values pass",
      () => check(withRow((l) => { l.jump.verdict = "either-is-fine"; l["s:v3-l02-01"].verdict = "perfect"; }), files, bytes, sources), 0],
    /* THE KNOWN LIMIT, proved rather than claimed. Collapsing an
       `either-is-fine` row into `perfect` makes the ledger assert a choice the
       owner declined to make — and this gate does NOT catch it, because
       `perfect` is a legal value. The control asserts the miss so that nobody
       reads rule 6 as protecting against it. See "WHAT THIS GATE CANNOT DO". */
    ["rule 6 KNOWN LIMIT: an either-is-fine row collapsed to perfect is NOT caught, and cannot be",
      () => check(withRow((l) => { l["s:v3-l02-01"].verdict = "perfect"; }), files, bytes, sources), 0],
  ];

  let failed = 0;
  for (const [why, run, want] of cases) {
    const got = run();
    const ok = want === 0 ? got.length === 0 : got.length >= want;
    if (!ok) failed += 1;
    console.log(`${ok ? "ok   " : "FAIL "}${why}`);
    if (!ok) console.log(`        expected ${want === 0 ? "no problems" : "a problem"}, got ${JSON.stringify(got)}`);
  }
  /* THE CONTROL ON THE CONTROLS. An implementation that always returns [], and
     one that always returns a problem, must both fail this suite. Without this
     every row above can pass on a stub. */
  const anyPass = cases.some(([, , w]) => w === 0);
  const anyFail = cases.some(([, , w]) => w !== 0);
  const meta = anyPass && anyFail;
  console.log(`${meta ? "ok   " : "FAIL "}control: the suite holds both passing and refusing cases, so no stub satisfies it`);
  if (!meta) failed += 1;
  console.log(`\nwaiting-room controls: ${cases.length + 1 - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const { ledger, files, bytes, sources } = fromTree();
const problems = check(ledger, files, bytes, sources);
const rows = Object.keys(ledger).filter((k) => !k.startsWith("_")).length;
for (const p of problems) console.log("  PROBLEM: " + p);
console.log(`Waiting room: ${rows} rows, ${files.length} clips, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
