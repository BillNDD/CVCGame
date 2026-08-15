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

  /* The real tree, through the real reader — the wiring, not just the rule
     (the lesson planted three times over on 2026-08-14). With no list on
     this machine the scan is vacuously green and says so; with one, this IS
     the live check. */
  const { names, problems } = loadNames();
  const tree = loadTree();
  T("the real list loads without configuration problems", problems.length === 0);
  T("the real tracked tree holds none of the loaded names", scan(tree, names).length === 0);

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
  const hits = scan(tree, names);
  problems.forEach((p) => console.error("  PROBLEM: " + p));
  hits.forEach((h) => console.error("  PROBLEM: " + h));
  console.log(`S9 names: ${names.length} names loaded, ${Object.keys(tree).length} files scanned, ${problems.length + hits.length} problems`);
  if (!names.length) console.log("  (no private/s9-names.txt and no S9_NAMES on this machine - structural controls only; the live scan runs where the owner keeps the list)");
  process.exit(problems.length + hits.length ? 1 : 0);
}
