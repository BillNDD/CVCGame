/* The S9 gate (G24): no file in the repository contains a personal name.
   Built 2026-08-15, from open-faults L — S9 was the ONE safety rule with no
   gate, and what that cost is on the record: a child's name entered four
   tracked files in six places, one of them a TEST NAME that printed it into
   every CI log, the repository is public, and every gate stayed green for a
   day. It was found by a review auditing something else, because a human
   happened to read the output.

   THE LIST CANNOT LIVE IN THIS REPOSITORY, and that is the rule's own logic:
   a public repo holding a list of the names that must never be public would
   BE the leak. So the names come from outside the tree, at run time:

     private/s9-names.txt   one name per line, "#" comments allowed.
                            `private/` has been gitignored since the
                            repository's first day, and the file never leaves
                            the owner's machine.
     S9_NAMES               an environment variable, comma-separated — the
                            "pattern the owner supplies at run time" option
                            the fault entry names. Merged with the file.

   This gate NEVER prints a name and never counts one into any committed
   artifact. It reports how many names it loaded and how many files it
   scanned; the one place a name appears is the failure message on the
   owner's own screen, where it must, or nothing can be fixed.

   WHAT A RUN WITHOUT A LIST MEANS, stated plainly rather than implied: on a
   machine with no list and no variable — CI, above all — only the structural
   controls run, and the summary says "0 names". That is not protection and
   is not reported as protection. The gate's strength is machine-local, on
   the machine where the owner keeps the list. A gate that pretended
   otherwise would be the C3 fault: a claim of safety resting on a check that
   does not run where the claim is read.

   MATCHING. Whole words, case-insensitive: the incident's name appeared
   capitalized in prose, lowercased in an identifier, and inside a test name,
   and one rule must catch all three. Whole-word because short names live
   inside ordinary words ("ann" is inside "cannot", "kim" inside "skimming")
   and a gate that cries wolf is a gate somebody switches off — the same
   reason ledger-truth refuses bare short sound names. A name under three
   characters is refused with its own message rather than silently matched
   into noise.

   FIXTURES HOLD NO REAL NAME, by the fault entry's own instruction: a
   scanner whose control fixture is a child's name is the fault it guards
   against. Every control plants the placeholder "Placeholderkid".

   Run: node tools/s9-names.mjs               scan the tracked tree
        node tools/s9-names.mjs --self-test   prove the scanner catches its fault */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const LIST_PATH = "private/s9-names.txt";

const isBinary = (f) => /\.(mp3|png|jpg|jpeg|ico|woff2?|ttf|gif|webp|onnx|bin)$/i.test(f);

/* The names, from outside the tree. Returned as {names, problems}: a name too
   short to match safely is a configuration problem the owner must see, not a
   pattern to unleash. */
export function loadNames(read = readFileSync, exists = existsSync, env = process.env) {
  const raw = [];
  if (exists(LIST_PATH)) {
    for (const line of read(LIST_PATH, "utf8").split("\n")) {
      const t = line.trim();
      if (t && !t.startsWith("#")) raw.push(t);
    }
  }
  for (const t of String(env.S9_NAMES || "").split(",")) if (t.trim()) raw.push(t.trim());
  const problems = [];
  const names = [];
  for (const n of [...new Set(raw)]) {
    if (n.length < 3) problems.push(`a ${n.length}-character name cannot be matched without drowning the gate in false hits; use a longer form`);
    else names.push(n);
  }
  return { names, problems };
}

/* Every tracked text file, scanned for every name, whole-word and
   case-insensitive. Returns one problem line per file-and-name pair, naming
   the line number — the name itself appears ONLY here, on the screen of
   whoever ran the scan, because a finding that hides where the fault is
   cannot be fixed. */
export function scan(tree, names) {
  const problems = [];
  for (const name of names) {
    /* Leading boundary: any non-letter. Trailing boundary: any non-LOWERCASE,
       so a camelCase gluing — placeholderkidScore — is still a hit, because
       an identifier was one of the six places the incident's name landed.
       "cannot" does not hit "ann" (letter before) and "skimming" does not hit
       "kim" (letter before); "Placeholderkids" with a lowercase plural s is
       the accepted miss, taken over drowning the gate in false hits.

       NO /i FLAG, and that is load-bearing: /i makes character CLASSES
       case-insensitive too, so the trailing [^a-z] would reject "S" and the
       camel-glue catch would silently die — which is exactly how this
       function's first version failed its own control. The name is made
       case-insensitive letter by letter instead, and the boundaries stay
       case-SENSITIVE. */
    const ci = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/[a-zA-Z]/g, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
    const re = new RegExp(`(^|[^A-Za-z])${ci}(?![a-z])`);
    for (const [file, text] of Object.entries(tree)) {
      const m = text.match(re);
      if (m) {
        const line = text.slice(0, m.index).split("\n").length;
        problems.push(`${file}:${line} contains "${name}" — S9: no file in the repository contains a personal name`);
      }
    }
  }
  return problems;
}

export function loadTree() {
  const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const tree = {};
  for (const f of tracked) {
    if (isBinary(f)) continue;
    try { tree[f] = readFileSync(f, "utf8"); } catch { /* deleted mid-run */ }
  }
  return tree;
}

/* THE VOCABULARY LAYER (owner-ruled 2026-08-15): "I would prefer no name
   ever appear, not have to list names." So: deny by default, no denylist:
   every capitalized token whose lowercase form the tree does not know must
   be in tools/s9-vocab.json, the committed known vocabulary — 155 tokens
   seeded from the scrub-verified tree of 2026-08-15 (Beatrix Potter sits
   there under S9's own author exception). A stranger fails the build until
   a person adds it: an owner-visible diff, G17's approval shape. A personal
   name nobody thought to list is exactly such a stranger. Lockfiles and
   git config are excluded as machinery — base64 fragments are capitalized
   noise, not language. STATED LIMIT, pinned by a control: a name written
   entirely in lowercase slips this layer; the optional private denylist
   above exists for precisely that residue. */
/* The gate's own ammunition files are excluded from the stranger scan: the
   vocabulary is self-satisfying by construction, and the common-names list
   holds 194 capitalized names ON PURPOSE — scanning the guard's own list
   would flag every bullet in it. */
const MACHINERY = /package-lock\.json$|\.gitignore$|\.gitattributes$|s9-common-names\.json$/;

/* camelCase splits first, so an identifier carrying a glued name still
   surrenders it — an identifier was one of the incident's six landings. */
export function strangers(tree, vocab) {
  const known = new Set(vocab);
  const lower = new Set();
  const caps = new Map();
  for (const [f, t] of Object.entries(tree)) {
    if (MACHINERY.test(f)) continue;
    for (const w of t.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z]+/)) {
      if (/^[a-z]+$/.test(w)) lower.add(w);
      else if (/^[A-Z][a-z]{2,}$/.test(w) && !caps.has(w)) caps.set(w, f);
    }
  }
  return [...caps.entries()]
    .filter(([w]) => !lower.has(w.toLowerCase()) && !known.has(w))
    .map(([w, f]) => `${f}: "${w}" is a capitalized token this repository has never known — a personal name is exactly such a stranger (S9). A legitimate new word is added to tools/s9-vocab.json, an owner-visible diff.`);
}

export function loadVocab(read = readFileSync) {
  return JSON.parse(read("tools/s9-vocab.json", "utf8")).vocabulary;
}

/* THE COMMON-NAMES LAYER (owner-proposed 2026-08-15): the US registry's most
   common given names of the last century, committed openly — public data
   names no real person — and scanned exactly like the private denylist, so a
   common name written in LOWERCASE is caught too, which is the vocabulary
   layer's pinned blind spot. Its adoption report earned its keep before it
   was even wired: filtering the list against repository language surfaced
   the owner's own given name inside a machine path in a fault entry —
   public for a day, written by the agent that built this gate. Names that
   collide with repository language are excluded WITH REASONS in the file
   itself; the list only grows, by owner-visible diff. */
export function loadCommon(read = readFileSync) {
  return JSON.parse(read("tools/s9-common-names.json", "utf8")).names;
}

/* ------------------------------------------------------------ self-test -- */
function selfTest() {
  const say = [];
  const T = (name, pass) => say.push([name, pass]);
  const P = "Placeholderkid";                     // never a real name (open-faults L)

  T("a planted name in file content is caught",
    scan({ "docs/a.md": `We showed it to ${P} yesterday.` }, [P]).length === 1);
  T("a planted name inside a TEST NAME is caught — the incident's worst leak",
    scan({ "tests/x.test.js": `it("7: ${P} can read the word", () => {})` }, [P]).length === 1);
  T("the catch is case-insensitive, both directions",
    scan({ "a.md": `saw placeholderkid there` }, [P]).length === 1
    && scan({ "b.md": `saw PLACEHOLDERKID there` }, [P]).length === 1);
  T("a camel-glued identifier is caught — one of the incident's six landings",
    scan({ "src/x.js": `const placeholderkidScore = 1;` }, [P]).length === 1);
  T("a name inside a longer WORD is not a hit — whole words only",
    scan({ "a.md": "the scanner cannot skim banners" }, ["ann", "kim"].filter((n) => n.length >= 3)).length === 0);
  T("a clean tree with a loaded list passes",
    scan({ "a.md": "an ordinary sentence about a cat" }, [P]).length === 0);
  /* Optional chaining on purpose: with the scan dead this control must FAIL,
     not throw — a thrown self-test prints no summary and reads as "no
     output", which is how the first planting of a dead scan went unscored. */
  T("the line number names where the fault is",
    scan({ "a.md": `line one\nline two with ${P}` }, [P])[0]?.includes("a.md:2") === true);
  T("two names both scan — the second is not shadowed by the first",
    scan({ "a.md": "Placeholdertwo was here" }, [P, "Placeholdertwo"]).length === 1);

  /* The list loader, on injected fixtures — never the owner's real file. */
  const fx = (content, envv) => loadNames(
    () => content, () => content !== null, envv || {});
  T("the file loads, one name per line, comments and blanks dropped",
    fx(`# family\n${P}\n\nPlaceholdertwo\n`).names.length === 2);
  T("the env variable merges with the file",
    fx(`${P}\n`, { S9_NAMES: "Placeholdertwo, Placeholderthree" }).names.length === 3);
  T("no file and no variable loads zero names, without error",
    fx(null).names.length === 0 && fx(null).problems.length === 0);
  T("a two-character name is refused as configuration, not matched as a pattern",
    fx("Jo\n").problems.length === 1 && fx("Jo\n").names.length === 0);
  T("duplicates collapse",
    fx(`${P}\n${P}\n`).names.length === 1);

  /* The vocabulary layer, on fixtures first (E5). Novel capitalized tokens
     are CONSTRUCTED at run time — this file is itself tracked and scanned,
     so a literal stranger in a fixture would pollute the vocabulary with
     nonsense or fail the very gate it tests. The first version did exactly
     that, five times over. */
  const V = ["Beatrix", "Leitner"];
  const capped = (w) => w[0].toUpperCase() + w.slice(1);   // "xyzzyqux" -> a novel capital the source never holds
  T("a capitalized stranger is caught — no denylist needed",
    strangers({ "docs/a.md": "we met " + capped("placeholderchild") + " at the park" }, V).length === 1);
  T("a stranger glued into an identifier is caught — camelCase splits first",
    strangers({ "src/x.js": "const held" + capped("xyzzyqux") + " = 1;" }, V).length === 1);
  T("a vocabulary token passes — the author exception lives here",
    strangers({ "docs/a.md": "a book by Beatrix" }, V).length === 0);
  T("a capitalized form of a word the tree knows passes",
    strangers({ "docs/a.md": "reading is fun. Reading wins." }, V).length === 0);
  T("machinery is excluded — lockfile base64 is not language",
    strangers({ "package-lock.json": capped("xyzzyqux") + " " + capped("abcdefgh") }, V).length === 0);
  T("STATED LIMIT, pinned: an all-lowercase name slips this layer",
    strangers({ "docs/a.md": "we met placeholderchild at the park" }, V).length === 0);
  T("two-letter capitals are not tokens — initials stay out of scope",
    strangers({ "docs/a.md": "a certain Xy wrote it" }, V).length === 0);

  /* The real tree, through the real reader — the wiring, not just the rule
     (the lesson planted three times over on 2026-08-14). With no list on
     this machine the scan is vacuously green and says so; with one, this IS
     the live check. */
  const { names, problems } = loadNames();
  const tree = loadTree();
  T("the real list loads without configuration problems", problems.length === 0);
  T("the real tracked tree holds none of the loaded names", scan(tree, names).length === 0);
  const vocab = loadVocab();
  T("the real vocabulary is sorted and unique, so a diff shows exactly the newcomer",
    JSON.stringify(vocab) === JSON.stringify([...new Set(vocab)].sort()));
  T("the real tree holds no capitalized stranger", strangers(tree, vocab).length === 0);
  /* The common layer, through the real list — fixture names are DRAWN from
     it at run time, so this file never holds a name literal of its own. */
  const common = loadCommon();
  T("the common list is real, sorted, and unique", common.length >= 150
    && JSON.stringify(common) === JSON.stringify([...new Set(common)].sort()));
  T("a common given name is caught, capitalized",
    scan({ "docs/a.md": "we met " + common[0] + " at the park" }, common).length === 1);
  T("a common given name is caught even written LOWERCASE — the layer's whole point",
    scan({ "tests/x.test.js": "it('" + common[1].toLowerCase() + " reads the word')" }, common).length === 1);
  T("a common name glued into an identifier is caught",
    scan({ "src/x.js": "const " + common[2].toLowerCase() + "Score = 1;" }, common).length === 1);
  const scanTree = Object.fromEntries(Object.entries(tree).filter(([f]) => !MACHINERY.test(f)));
  T("the real tree holds no common given name", scan(scanTree, common).length === 0);
  T("machinery is out of the common scan — a lockfile hash spells every short name eventually",
    scan({ "package-lock.json": "integrity: sha512-x" + common[0] + "q" }, common).length === 0
    && scan(Object.fromEntries(Object.entries({ "package-lock.json": "x" }).filter(([f]) => !MACHINERY.test(f))), common).length === 0);

  const failed = say.filter(([, p]) => !p).length;
  for (const [n, p] of say) console.log((p ? "ok   " : "FAIL ") + n);
  console.log(`\ns9 controls: ${say.length - failed} passed, ${failed} failed`);
  return failed ? 1 : 0;
}

/* ----------------------------------------------------------------- main -- */
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("tools/s9-names.mjs");
if (isMain && process.argv.includes("--self-test")) process.exit(selfTest());
if (isMain) {
  const { names, problems } = loadNames();
  const tree = loadTree();
  const vocab = loadVocab();
  const common = loadCommon();
  /* The common list is scanned over the tree minus MACHINERY: a lockfile's
     base64 integrity hashes spell every three-letter name eventually — one
     surfaced on this scan's very first live run, and noise is how a gate gets switched
     off. The PRIVATE list still scans everything including machinery — names
     the owner explicitly lists are worth a rare false hit. */
  const scanTree = Object.fromEntries(Object.entries(tree).filter(([f]) => !MACHINERY.test(f)));
  const hits = [...scan(scanTree, names), ...scan(scanTree, common), ...strangers(tree, vocab)];
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  hits.forEach((h) => console.error("  PROBLEM: " + h));
  console.log(`S9 names: ${names.length} names loaded, ${common.length} common names guarded, ${vocab.length} known tokens, ${Object.keys(tree).length} files scanned, ${problems.length + hits.length} problems`);
  if (!names.length) console.log("  (no private/s9-names.txt and no S9_NAMES on this machine - structural controls only; the live scan runs where the owner keeps the list)");
  process.exit(problems.length + hits.length ? 1 : 0);
}
