/* The file map with teeth (G23). Owner-ruled 2026-08-15: "end drift and
   orphanage — any change to any file can't result in drift, because
   information ownership is well established and the map is known by all."
   Design: open-faults section M (2026-08-14), built with the ownership rule
   the owner approved from the refactor review the same day, then hardened the
   same evening against an independent reviewer's findings (see the controls
   that name them).

   THE RULE, in one line each:
     1. One fact, one owner file. The owner holds it; everyone else points.
     2. A copy of an owned fact in any other governing document FAILS the
        build. Drift ends by refusal, not by vigilance.
     3. Every tracked file is declared — individually for the governing set,
        by glob for the bulk sets. An undeclared file fails the build, and a
        G17-approved governing file with no declaration here fails too, so
        the two registries cannot drift apart (reviewer finding: without that
        coupling, a future CONTRIBUTING.md would slip through a bulk glob and
        never be scanned).
     4. A DATA or GENERATED file nobody reads fails the build, unless it is
        declared HISTORY with a written reason — and the HISTORY count is a
        CEILING only the owner moves (E6). A missing ceiling is itself a
        failure: `history > undefined` is false, which is how a ceiling
        silently stops existing (reviewer finding).
     5. A TOMBSTONE path may not exist on disk at all. A file the owner ruled
        deleted can come back quietly — app/public/voice-review.csv was
        "deleted" while tools/render-voice-pack.py still built its path from
        pieces no grep for the name could find (reviewer finding) — so the
        gate now refuses the path itself, tracked or not.
     6. The readable map, docs/file-map.md, is GENERATED from this table, so
        the map and the enforcement are one object and cannot disagree.

   WHY THE MAP LIVES IN THE TOOL AND NOT BESIDE IT. A hand-written map of
   owners rots exactly like a hand-written count — it would be fault F1 with a
   new filename. And a separate owners.json would be a second ledger over the
   same facts needing its own gate to stay in step, which is fault F2
   re-committed; section M's design says both, in as many words. The pattern
   here is the one the repo has already proven three times: effect-map.mjs,
   sentence-screen.mjs and ledger-truth.mjs all keep their declarations
   in-tool and generate or verify from them.

   WHAT THIS CANNOT DO, stated so nobody quotes it for more than it is:
   - A stale paragraph in FRESH WORDS is invisible — that is fault F3, open.
   - A sentence that correctly DENIES an owned fact but contains its shape is
     refused anyway ("a red gauntlet is not what blocks a change" trips the
     E7 shape). Deliberate: the cure is describing instead of quoting, the
     same discipline docs/testing-gauntlet.md's own G23 bullet learned when
     this gate's first live catch was its own specification.
   - The reader scan counts a path named in CODE (including code comments) as
     a reader. A comment is a documented relationship, but it does mean the
     scan can be satisfied by prose inside a .mjs file; the compensating
     control pins that non-code files never count.

   BORN RED. The fact rules were run against the tree as it stood at HEAD
   before the 2026-08-15 pointer fixes, and went red on the real thing —
   seven hits across README and AGENTS. A detector first seen red on real
   data is the strongest negative control this repository knows
   (tools/mic-absence.mjs was proven the same way).

   Run: node tools/file-map.mjs            (writes docs/file-map.md)
        node tools/file-map.mjs --check    (fails if map stale or rules broken)
        node tools/file-map.mjs --self-test */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { GOVERNING } from "./check-governing.mjs";

/* ---------------------------------------------------------------- facts --
   One entry per owned fact family: the owner file, and the phrase shapes no
   OTHER governing document may state. Deliberately narrow, like
   ledger-truth's UNHEARD list: a wide pattern catches true sentences and a
   gate that cries wolf is a gate somebody switches off. Each family names
   the incident that earned it, and each SHAPE has a control that kills its
   deletion (reviewer finding: two shapes had none, so replacing either with
   /zzz/ survived all 25 controls). */
export const FACTS = {
  "the word bank's size and levels": {
    owner: "SPEC.md",
    /* Earned by README stating 260 words in seven levels while the bank held
       445 in eleven — 185 words stale with every gate green (2026-08-15).
       The level count matches spelled-out AND digit forms, "in" and
       "across": the next stale count will not say 260, so the controls plant
       a DIFFERENT number to prove the shapes generalise (reviewer finding).
       The session-length sentence ("approximately 20 words") must NOT
       match; a control holds that too. */
    forbidden: [
      /word bank has \d+ words/i,
      /\b\d+ words?,? (?:in|across) (?:seven|eight|nine|ten|eleven|twelve|thirteen|\d+) levels\b/i,
    ],
  },
  "when the checks run and what a red one blocks (E7)": {
    owner: "CLAUDE.md",
    /* Earned by AGENTS.md paraphrasing E7 as running the full gauntlet
       before every push, and README crediting the gauntlet with blocking a
       change — both contradicting the owner's 2026-08-02 cadence ruling that
       E7 records. Even a sentence DENYING these is refused if it carries the
       shape: describe, never quote. */
    forbidden: [
      /gauntlet[^.\n]{0,30}before every push/i,
      /red gauntlet blocks a (change|push)/i,
    ],
  },
  "the network rule (S6)": {
    owner: "CLAUDE.md",
    /* Earned twice. First by README's unqualified privacy absolute; then,
       the same day this gate was built, the reviewer found the QUALIFIED
       absolute — "no network calls after the first load" — in both install
       guides, which are the documents a parent actually reads. S6's own
       words carry two narrow exceptions; a restatement that drops them tells
       a parent an untruth they can catch the app contradicting. */
    forbidden: [
      /no analytics, and no network calls\b/i,
      /\bapp does not transmit data\b/i,
      /\b(makes|has) no network calls\b/i,
    ],
  },
  "the gate count": {
    owner: "docs/testing-gauntlet.md",
    /* Earned by AGENTS.md item 5 saying "the 16 gates" while the gauntlet
       ran 24. A count outside its owner is a countdown to being wrong. */
    forbidden: [/\bthe \d+ gates\b/i],
  },
};

/* Paths the owner ruled OUT of existence. Not "untracked" — nonexistent: a
   generator can write a file back without git ever seeing it, and app/public
   ships wholesale into the precache. Each carries its ruling. */
export const TOMBSTONES = [
  { path: "app/public/voice-review.csv", why: "owner-ruled deleted 2026-08-15 after a measured no-loss proof; its writer built the path from pieces and nearly resurrected it the same day" },
];

/* ------------------------------------------------------------ declared --
   The governing set (G17's owned files plus this tool's own output), each
   with section M's four keys: KIND, the one thing it OWNS, how it is
   regenerated if GENERATED, and WHY it is kept if HISTORY.

   Kinds: OWNER      prose a person maintains; the single home of its facts
          LOG        grows forever by design; searched, never read whole
          DATA       a person edits it, machines read it — needs a reader
          GENERATED  a tool writes it — its regen tool must name it
          HISTORY    kept with no reader, on purpose, with the reason written

   `quotesFaults`: docs/open-faults.md quotes wrong sentences verbatim —
   that is its job — so the fact scan must not read a quoted fault as a
   fresh copy. The exemption is named here, argued once, and controlled. */
export const DECLARED = [
  { path: "AGENTS.md", kind: "OWNER", owns: "how agents work here: the prose rules, the dependency rule, and the shape of a round or decision page" },
  { path: "CHANGELOG.md", kind: "LOG", owns: "what shipped in each release, in a parent's words" },
  { path: "CLAUDE.md", kind: "OWNER", owns: "the safety rules S1-S9, the engineering rules E1-E11, and what counts as finished work" },
  { path: "README.md", kind: "OWNER", owns: "the front door: what the game is, and pointers to every owner" },
  { path: "SPEC.md", kind: "OWNER", owns: "behaviour: the bank and levels, the engine, the screens, the feedback text, and the road ahead" },
  { path: ".claude/gate-baseline.json", kind: "DATA", owns: "every floor and ceiling the gates hold (E6)" },
  { path: ".claude/skills/council-engineer/SKILL.md", kind: "OWNER", owns: "the brief for the council's engineering seat: what that reviewer is told, what it may not do, and how its findings come back" },
  { path: ".claude/skills/council-literacy/SKILL.md", kind: "OWNER", owns: "the brief for the council's early-literacy seat: what it judges about the ladder and the questions it asks of every level" },
  { path: ".claude/skills/council-adult-ux/SKILL.md", kind: "OWNER", owns: "the brief for the council's adult-experience seat: whose experience it judges and what it is suspicious of" },
  { path: ".claude/skills/drift-check/SKILL.md", kind: "OWNER", owns: "how to run the comprehensive drift check: which gates and lookups, in what order, and what a green run does not mean" },
  { path: "docs/install-ios.md", kind: "OWNER", owns: "the iOS install steps a parent follows" },
  { path: "docs/install-windows.md", kind: "OWNER", owns: "the Windows install steps a parent follows" },
  { path: "docs/phonics-handoff-defects.md", kind: "OWNER", owns: "the historical handoff defect record; its instructions are history, not tasks" },
  { path: "docs/qa-procedure.md", kind: "OWNER", owns: "the on-device QA script" },
  { path: "docs/self-hosting.md", kind: "OWNER", owns: "the self-hosting steps" },
  { path: "docs/effect-map.md", kind: "GENERATED", regen: "node tools/effect-map.mjs" },
  { path: "docs/file-map.md", kind: "GENERATED", regen: "node tools/file-map.mjs" },
  { path: "docs/open-faults.md", kind: "OWNER", owns: "what is wrong right now, and nothing closed", quotesFaults: true },
  { path: "docs/settled.md", kind: "LOG", owns: "what a listener or a measurement has closed" },
  { path: "docs/testing-gauntlet.md", kind: "OWNER", owns: "the gates: what each proves, cannot prove, and the floors it holds" },
  { path: "docs/voice-pack.md", kind: "LOG", owns: "the round-by-round story of the voice" },
  /* HISTORY, owner-ruled 2026-08-15 from the orphan decision page: 57 early
     recipes from packs 1-3, superseded by tools/voice-words.csv, and 11 of
     the 57 DISAGREE with it — reading it as live is the trap docs/settled.md
     already records a reviewer falling into. Kept because deleting the only
     record of how early clips were made is what B11 cost for one sound;
     read by nothing, and that is now enforced as its declared state. */
  { path: "docs/voice-goldens-packs1-3.json", kind: "HISTORY", why: "superseded early recipes; 11 of 57 disagree with tools/voice-words.csv — provenance, not a live ledger" },
  { path: "tools/keeper-bytes.json", kind: "GENERATED", regen: "node tools/gen-voice-lock.mjs" },
  { path: "tools/keepers-treatments.json", kind: "GENERATED", regen: "node tools/gen-voice-lock.mjs" },
  { path: "tools/pending-sounds/pending-sounds.json", kind: "DATA", owns: "the sound ledger: every sound verdict the owner has given" },
  { path: "tools/s9-vocab.json", kind: "DATA", owns: "the known capitalized vocabulary of the tree (G24): a stranger to it fails the build" },
  { path: "tools/s9-common-names.json", kind: "DATA", owns: "the public common-names registry the tree must never contain (G24)" },
  { path: "tools/s9-surnames.json", kind: "DATA", owns: "the public census surnames for G24's pair rule: a first name beside one is a person" },
  { path: "tools/pending-words/pending-words.json", kind: "DATA", owns: "the waiting room's ledger: verdict, family, arm, round and byte pin for every approved-and-unshipped clip — docs/voice-pack.md tells each round's story" },
  { path: "tools/target-vocab.txt", kind: "DATA", owns: "the 420-word target vocabulary the owner ruled the game covers before it is called done — SPEC section 12 owns the ruling" },
  { path: "tools/s9-passage-names.json", kind: "DATA", owns: "the passage-names ledger: which character names verbatim teaching content may carry, where they pass, and each name's source — S9's second exception (CLAUDE.md owns the rule)" },
  { path: "tools/voice-lock.json", kind: "GENERATED", regen: "node tools/gen-voice-lock.mjs" },
  { path: "tools/voice-sounds.csv", kind: "DATA", owns: "the archive of the retired recording pipeline (ledger-truth rule 5 guards it)" },
  { path: "tools/voice-words.csv", kind: "DATA", owns: "per word: the recipe, the verdict, the round, the byte pin — the one file a person edits after a listening round" },
];

/* Everything else tracked must fall under one of these, or the build fails.
   Coverage only: these files' facts are owned elsewhere (the engine by SPEC,
   the tests by the gauntlet doc) and their reader relationships are already
   gated (G13 chains the pack, G20 maps the tests). A path that matches no
   glob — a future .claude/agents/x.md, say — fails the build and takes the
   declaration ritual, which is the intended door. */
export const BULK = [
  { glob: /^app\//, kind: "SOURCE", note: "the shipped app and its assets; copy gated by G11, pack by G13" },
  { glob: /^reference\//, kind: "SOURCE", note: "the one-file reference build (E2)" },
  { glob: /^tests\//, kind: "TEST", note: "suites and generated acceptance; mapped by G20" },
  { glob: /^tools\//, kind: "TOOL", note: "gates, generators, renderers" },
  { glob: /^features\//, kind: "DATA", note: "owner-approved Gherkin, the G3 source" },
  { glob: /^\.github\//, kind: "CI", note: "deploy and release workflows" },
  { glob: /^icons\//, kind: "ASSET", note: "repo art" },
  { glob: /^\.claude\/skills\//, kind: "DOC", note: "skills the owner invokes by name; instructions, not facts" },
  { glob: /^(\.claude\/)?[^/]+$/, kind: "ROOT", note: "configs, license, lockfiles at the top level" },
];

/* Registries do not count as readers: a list that NAMES every file would make
   the orphan question unanswerable — voice-review.csv sat named in a registry
   while read by nothing, which is exactly the state this detector exists to
   refuse. Only CODE files count, by extension: prose being discussed is not
   being read, and a JSON ledger's _comment naming a path is not a read either
   (reviewer finding: pending-sounds.json was passing as a code reader). */
const REGISTRIES = ["tools/check-governing.mjs", "tools/file-map.mjs", "tools/blast-radius.mjs"];
const CODE_DIRS = /^(tools|tests|app|reference|\.github)\//;
const CODE_EXT = /\.(mjs|js|jsx|py|yml|yaml)$/;

const isBinary = (f) => /\.(mp3|png|jpg|jpeg|ico|woff2?|ttf|gif|webp|onnx|bin)$/i.test(f);

export function loadTree() {
  const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const text = {};
  for (const f of tracked) {
    if (isBinary(f)) continue;
    try { text[f] = readFileSync(f, "utf8"); } catch { /* deleted mid-run */ }
  }
  return { tracked, text };
}

/* D1 — every tracked file is declared, individually or by glob. */
export function undeclared(tracked) {
  const named = new Set(DECLARED.map((d) => d.path));
  return tracked.filter((f) => !named.has(f) && !BULK.some((b) => b.glob.test(f)));
}

/* D1b — the two registries cannot drift: every file G17 approves must carry a
   declaration here, so a future governing file is scanned from the day it is
   approved rather than slipping through a bulk glob (reviewer finding: a new
   top-level CONTRIBUTING.md holding the exact born-red sentence passed every
   detector, because only hand-declared files were ever scanned). */
export function govGaps(governing = GOVERNING, declared = DECLARED) {
  const named = new Set(declared.map((d) => d.path));
  return governing.filter((f) => !named.has(f))
    .map((f) => `${f} is G17-approved but has no declaration in tools/file-map.mjs — it would never be scanned; add its DECLARED row in the same commit that approves it`);
}

/* D2 — a DATA file needs a code reader; a GENERATED file needs its generator
   to name it; HISTORY needs its reason and is counted against a ceiling.
   The ceiling comes from the baseline, and a MISSING ceiling is a failure in
   its own right: `history > undefined` is false for every count, which is a
   ceiling that stopped existing with every gate green (reviewer finding). */
export function orphans(tree, declared = DECLARED, ceiling = null, readBaseline = null) {
  const problems = [];
  let history = 0;
  for (const d of declared) {
    if (d.kind === "HISTORY") {
      history += 1;
      if (!d.why) problems.push(`${d.path}: HISTORY with no reason written — a graveyard with unlabeled graves`);
      continue;
    }
    if (d.kind === "DATA") {
      const base = d.path.split("/").pop();
      const readers = Object.keys(tree.text).filter((f) =>
        f !== d.path && CODE_DIRS.test(f) && CODE_EXT.test(f) && !REGISTRIES.includes(f) && tree.text[f].includes(base));
      if (!readers.length) problems.push(`${d.path}: DATA that no code reads — an orphan, or it should be declared HISTORY (owner's call: the HISTORY count is a ceiling)`);
    }
    if (d.kind === "GENERATED") {
      const tool = (d.regen || "").split(/\s+/).find((w) => w.startsWith("tools/"));
      if (!tool || !tree.text[tool] || !tree.text[tool].includes(d.path.split("/").pop())) {
        problems.push(`${d.path}: GENERATED but its regen tool ${tool || "(none named)"} does not exist or never names it`);
      }
    }
  }
  let max = ceiling;
  if (max === null) {
    const read = readBaseline || (() => JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8")));
    try { max = read().filemap_history_max; } catch { max = undefined; }
  }
  if (typeof max !== "number") problems.push("filemap_history_max is absent from .claude/gate-baseline.json — the HISTORY ceiling cannot be enforced, which is a ceiling that stopped existing (E6)");
  else if (history > max) problems.push(`HISTORY files: ${history} against a ceiling of ${max} — the ceiling moves only by the owner (E6)`);
  return problems;
}

/* D2b — tombstones: the path must not exist AT ALL, tracked or not. */
export function tombstones(exists = existsSync, stones = TOMBSTONES) {
  return stones.filter((t) => exists(t.path))
    .map((t) => `${t.path} exists again — ${t.why}. Find and stop whatever wrote it; the owner ruled this path out.`);
}

/* D3 — an owned fact stated as a literal in a governing document that does
   not own it. Logs are exempt (dated entries keep their numbers, owner-ruled
   2026-08-14); open-faults is exempt because quoting wrong sentences is its
   job, and the exemption is declared on its entry above. */
export function copies(tree, declared = DECLARED, facts = FACTS) {
  const problems = [];
  const scan = declared.filter((d) => (d.kind === "OWNER") && !d.quotesFaults);
  for (const [fact, spec] of Object.entries(facts)) {
    for (const d of scan) {
      if (d.path === spec.owner) continue;
      const body = tree.text[d.path];
      if (!body) continue;
      for (const re of spec.forbidden) {
        const m = body.match(re);
        if (m) {
          const line = body.slice(0, m.index).split("\n").length;
          problems.push(`${d.path}:${line} states "${fact}" as a literal ("${m[0].slice(0, 60)}") — that fact's one owner is ${spec.owner}; point instead`);
        }
      }
    }
  }
  return problems;
}

/* D4 — two claims to one fact. The FACTS table cannot hold duplicate keys by
   construction; what CAN happen is two DECLARED rows claiming the same owns
   line, or a family's forbidden shape matching inside a DIFFERENT family's
   owner — a de-facto second owner wearing the first one's words. */
export function duplicates(tree, declared = DECLARED, facts = FACTS) {
  const problems = [];
  const seen = {};
  for (const d of declared) {
    if (!d.owns) continue;
    if (seen[d.owns]) problems.push(`${d.path} and ${seen[d.owns]} both declare they own "${d.owns}"`);
    seen[d.owns] = d.path;
  }
  const owners = new Set(Object.values(facts).map((s) => s.owner));
  for (const [fact, spec] of Object.entries(facts)) {
    for (const other of owners) {
      if (other === spec.owner || !tree.text[other]) continue;
      for (const re of spec.forbidden) {
        if (re.test(tree.text[other])) problems.push(`${other} matches the forbidden shape of "${fact}", whose owner is ${spec.owner} — two owners de facto`);
      }
    }
  }
  return problems;
}

/* ------------------------------------------------------- the map itself --
   No volatile counts in the rendered map: an earlier version baked the
   tracked-file total into it, so ANY commit that added a file went red on a
   staleness message unrelated to ownership (reviewer finding). The map holds
   the stable truth; the console prints the run's numbers. */
export function render() {
  const rows = DECLARED.map((d) => {
    const what = d.kind === "GENERATED" ? `regenerate: \`${d.regen}\`` : d.kind === "HISTORY" ? `kept because: ${d.why}` : d.owns;
    return `| \`${d.path}\` | ${d.kind} | ${what} |`;
  }).join("\n");
  const factRows = Object.entries(FACTS).map(([fact, s]) =>
    `| ${fact} | \`${s.owner}\` | ${s.forbidden.length} refused shape${s.forbidden.length === 1 ? "" : "s"} |`).join("\n");
  const bulkRows = BULK.map((b) => `| \`${b.glob.source}\` | ${b.kind} | ${b.note} |`).join("\n");
  const stoneRows = TOMBSTONES.map((t) => `| \`${t.path}\` | ${t.why} |`).join("\n");
  return `# The file map — generated, do not edit

**This document owns** nothing a person may write: it is the readable
projection of the ownership table inside \`tools/file-map.mjs\`, regenerated by
\`node tools/file-map.mjs\` and held fresh by gate G23.
**It does not own** any fact it points at — each row names the file that does.

Hand edits are erased on the next run. To change a row, change the table in
the tool; the gate fails if this file and the table disagree. Before any
change to any file, this map is the first read: change a fact only in its
owner, and declare a new file in the same commit that creates it.

## The owned facts

| fact | one owner | enforcement |
|---|---|---|
${factRows}

A copy of one of these facts in a governing document that does not own it
fails \`npm run check\`. Logs and \`docs/open-faults.md\` (which quotes faults
verbatim) are exempt; the exemptions are declared in the tool.

## The governing files

| file | kind | owns / regen / why kept |
|---|---|---|
${rows}

Every G17-approved file must carry a row here, so approval and scanning
cannot drift apart. A DATA file no code reads fails the build. HISTORY files
are counted against a ceiling only the owner moves.

## Tombstones

| path that must not return | ruling |
|---|---|
${stoneRows}

## Everything else

| pattern | kind | note |
|---|---|---|
${bulkRows}

Every tracked file is one of the governing files above or matches a bulk
pattern; an undeclared file fails the build.
`;
}

/* ------------------------------------------------------------ self-test -- */
function selfTest() {
  const say = [];
  const T = (name, pass) => say.push([name, pass]);
  const mk = (files) => ({ tracked: Object.keys(files), text: files });

  /* D1 */
  T("an undeclared tracked file is caught",
    undeclared(["SPEC.md", "rogue/NOTES.md"]).includes("rogue/NOTES.md"));
  T("declared and bulk files pass", undeclared(["SPEC.md", "app/src/App.jsx", "tools/x.mjs"]).length === 0);

  /* D1b — the registry coupling, on fixtures and on the real pair. */
  T("a G17-approved file with no declaration here is caught",
    govGaps(["SPEC.md", "CONTRIBUTING.md"], DECLARED).length === 1);
  T("a fully declared governing set passes",
    govGaps(["SPEC.md", "CLAUDE.md"], DECLARED).length === 0);

  /* D2 — fixtures, never today's data (E5): a control that can only run
     against the live tree passes for whatever reason it likes. */
  const dataDecl = [{ path: "tools/lonely.csv", kind: "DATA", owns: "x" }];
  T("a DATA file no code reads is caught",
    orphans(mk({ "tools/lonely.csv": "a,b", "docs/talk.md": "we discuss lonely.csv here" }), dataDecl, 5).length === 1);
  T("prose discussion does not count as a reader — only code does",
    orphans(mk({ "tools/lonely.csv": "a,b", "docs/talk.md": "lonely.csv", "tools/reader.mjs": 'read("tools/lonely.csv")' }), dataDecl, 5).length === 0);
  T("a reader in tests/ counts too",
    orphans(mk({ "tools/lonely.csv": "a,b", "tests/reads.test.js": 'load("tools/lonely.csv")' }), dataDecl, 5).length === 0);
  T("a registry naming the file does not count as a reader",
    orphans(mk({ "tools/lonely.csv": "a,b", "tools/check-governing.mjs": '"tools/lonely.csv"' }), dataDecl, 5).length === 1);
  T("a JSON ledger's comment naming the file is not a code reader",
    orphans(mk({ "tools/lonely.csv": "a,b", "tools/other/ledger.json": '{"_comment": "see tools/lonely.csv"}' }), dataDecl, 5).length === 1);
  T("a GENERATED file whose generator never names it is caught",
    orphans(mk({ "tools/gen.mjs": "makes nothing" }), [{ path: "docs/out.md", kind: "GENERATED", regen: "node tools/gen.mjs" }], 5).length === 1);
  T("a GENERATED file its generator names passes",
    orphans(mk({ "tools/gen.mjs": 'writeFileSync("docs/out.md")' }), [{ path: "docs/out.md", kind: "GENERATED", regen: "node tools/gen.mjs" }], 5).length === 0);
  T("HISTORY with no reason is caught",
    orphans(mk({}), [{ path: "old.json", kind: "HISTORY" }], 5).length === 1);
  T("a second HISTORY file over the ceiling of one is caught",
    orphans(mk({}), [{ path: "a.json", kind: "HISTORY", why: "w" }, { path: "b.json", kind: "HISTORY", why: "w" }], 1).length === 1);
  /* The ceiling's own existence, with an injected baseline reader: renaming
     the key must be a failure, never a ceiling that silently stops existing. */
  T("a MISSING ceiling key is itself a failure",
    orphans(mk({}), [{ path: "a.json", kind: "HISTORY", why: "w" }], null, () => ({})).length === 1);
  T("a present ceiling read from the baseline enforces",
    orphans(mk({}), [{ path: "a.json", kind: "HISTORY", why: "w" }, { path: "b.json", kind: "HISTORY", why: "w" }], null, () => ({ filemap_history_max: 1 })).length === 1);

  /* D2b — tombstones, with an injected filesystem. */
  T("a tombstoned path that exists again is caught",
    tombstones((p) => p === "app/public/voice-review.csv").length === 1);
  T("an absent tombstoned path passes", tombstones(() => false).length === 0);

  /* D3 — the born-red shapes, planted as fixtures with literal text (E4). */
  const own = [{ path: "README.md", kind: "OWNER", owns: "front door" }, { path: "SPEC.md", kind: "OWNER", owns: "behaviour" },
    { path: "log.md", kind: "LOG", owns: "history" }, { path: "faults.md", kind: "OWNER", owns: "faults", quotesFaults: true }];
  const bankFact = { "the word bank's size and levels": FACTS["the word bank's size and levels"] };
  /* Exactly TWO hits: the sentence trips both forbidden shapes, and the
     born-red run against HEAD reported README.md:31 twice for the same
     reason. One hit would mean a shape died. */
  T("the exact README sentence that sat stale for weeks is caught, by both shapes",
    copies(mk({ "README.md": "The word bank has 260 words in seven levels:" }), own, bankFact).length === 2);
  /* The shapes must GENERALISE: the next stale count will not say 260, so a
     different number, a digit level count, and "across" must all hit
     (reviewer finding: every fixture was the historical sentence, so
     hard-coding 260 into the pattern survived everything). */
  T("a DIFFERENT stale count is caught by both shapes",
    copies(mk({ "README.md": "The word bank has 470 words in thirteen levels." }), own, bankFact).length === 2);
  T("a digit level count is caught",
    copies(mk({ "README.md": "It holds 445 words in 11 levels." }), own, bankFact).length === 1);
  T("'across N levels' is caught",
    copies(mk({ "README.md": "445 words across eleven levels." }), own, bankFact).length === 1);
  T("the session-length sentence does NOT match — a different fact",
    copies(mk({ "README.md": "A session has approximately 20 words." }), own, bankFact).length === 0);
  T("the same stale sentence in a LOG passes — dated entries keep their numbers",
    copies(mk({ "log.md": "The word bank has 260 words in seven levels." }), own, bankFact).length === 0);
  T("open-faults quoting the fault verbatim passes — quoting is its job",
    copies(mk({ "faults.md": "README said 'The word bank has 260 words in seven levels'" }), own, bankFact).length === 0);
  T("the owner itself stating its own fact passes",
    copies(mk({ "SPEC.md": "The word bank has 445 words in eleven levels." }), own, bankFact).length === 0);
  /* Each E7 shape has its own kill: one fixture trips BOTH (reviewer
     finding: with one-shape fixtures, deleting the other shape survived). */
  T("the E7 paraphrase is caught by both shapes at once",
    copies(mk({ "README.md": "Run the gauntlet before every push; a red gauntlet blocks a change." }), own,
      { e7: FACTS["when the checks run and what a red one blocks (E7)"] }).length === 2);
  T("the S6 absolutes are caught, all three shapes",
    copies(mk({ "README.md": "The app has no analytics, and no network calls. The app does not transmit data. It makes no network calls." }), own,
      { s6: FACTS["the network rule (S6)"] }).length === 3);
  T("the install-guide sentence the reviewer found is caught",
    copies(mk({ "README.md": "The app makes no network calls after the first load." }), own,
      { s6: FACTS["the network rule (S6)"] }).length === 1);
  T("a stale gate count outside its owner is caught",
    copies(mk({ "README.md": "see the 16 gates" }), own, { g: FACTS["the gate count"] }).length === 1);
  T("a different stale gate count is caught too",
    copies(mk({ "README.md": "all the 24 gates pass" }), own, { g: FACTS["the gate count"] }).length === 1);

  /* D4 */
  T("two files declaring the same owns line are caught",
    duplicates(mk({}), [{ path: "a.md", kind: "OWNER", owns: "the thing" }, { path: "b.md", kind: "OWNER", owns: "the thing" }], {}).length === 1);
  T("a fact's shape appearing inside a DIFFERENT fact's owner is caught",
    duplicates(mk({ "CLAUDE.md": "The word bank has 9 words" }), [],
      { bank: { owner: "SPEC.md", forbidden: [/word bank has \d+ words/i] }, e7: { owner: "CLAUDE.md", forbidden: [/x^/] } }).length === 1);
  T("distinct owners with distinct shapes pass",
    duplicates(mk({ "CLAUDE.md": "checks run before a push", "SPEC.md": "the bank" }), [],
      { bank: { owner: "SPEC.md", forbidden: [/word bank has \d+ words/i] }, e7: { owner: "CLAUDE.md", forbidden: [/x^/] } }).length === 0);

  /* The real tree, through the real readers — the lesson this repository
     learned three times on 2026-08-14 alone: an injected fixture proves the
     rule, only the real run proves the wiring. */
  const tree = loadTree();
  T("the real tree has no undeclared file", undeclared(tree.tracked).length === 0);
  T("the real governing set is fully declared", govGaps().length === 0);
  T("the real tree has no orphan and honours the ceiling", orphans(tree).length === 0);
  T("no tombstoned path exists", tombstones().length === 0);
  T("the real tree holds no copied fact", copies(tree).length === 0);
  T("the real tree holds no duplicate owner", duplicates(tree).length === 0);
  T("the committed map matches the table",
    existsSync("docs/file-map.md") && readFileSync("docs/file-map.md", "utf8") === render());

  const failed = say.filter(([, p]) => !p).length;
  for (const [n, p] of say) console.log((p ? "ok   " : "FAIL ") + n);
  console.log(`\nfile-map controls: ${say.length - failed} passed, ${failed} failed`);
  return failed ? 1 : 0;
}

/* ----------------------------------------------------------------- main -- */
/* Guarded so an import gets the functions without the run: the born-red
   demonstration imports copies() to scan HEAD's files, and an import that
   writes docs/file-map.md as a side effect would be a generator firing when
   nobody asked it to. */
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("tools/file-map.mjs");
if (isMain && process.argv.includes("--self-test")) process.exit(selfTest());
if (isMain) {
const tree = loadTree();
const problems = [
  ...undeclared(tree.tracked).map((f) => `${f} is tracked and declared nowhere — add it to DECLARED or a BULK glob in tools/file-map.mjs (an owner-visible diff, like G17)`),
  ...govGaps(),
  ...orphans(tree),
  ...tombstones(),
  ...copies(tree),
  ...duplicates(tree),
];
if (process.argv.includes("--check")) {
  const committed = existsSync("docs/file-map.md") ? readFileSync("docs/file-map.md", "utf8") : "";
  if (committed !== render()) problems.push("docs/file-map.md is stale — run node tools/file-map.mjs and commit the result");
} else {
  writeFileSync("docs/file-map.md", render());
}
problems.forEach((p) => console.error("  PROBLEM: " + p));
console.log(`File map: ${DECLARED.length} declared, ${Object.keys(FACTS).length} owned facts, ${tree.tracked.length} tracked, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
}
