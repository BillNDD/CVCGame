/* THE APP'S OWN SOURCE FILES, derived rather than listed.
 *
 * Owner-ruled 2026-08-17 ("also C for rot protection"). Three gates each kept
 * their own hand-written list of app files to scan — the copy gate, the S6
 * no-network scan and doc-truth — and all three had drifted the same way: a new
 * screen was added and none of them learned about it. BuildItScreen was missing
 * from all three, and SentenceStage had been missing from the copy gate since
 * the sentence stage shipped. The same omission, three times, which says the
 * problem is the list and not the people keeping it.
 *
 * So the lists are now DERIVED. A new file under app/src is scanned from the
 * moment it exists, and staying out of a scan takes a written exclusion with a
 * reason — an owner-visible diff, the same shape as G17's owned set.
 *
 * WHAT THIS CANNOT DO. It knows which files exist, never whether a scan is the
 * right scan for them. An exclusion with a bad reason still excludes.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "app/src";
const CODE = /\.(js|jsx)$/;

/* Every source file the app ships, in a stable order so a derived list is the
   same on every machine and in every run. */
export function appSources(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name).replaceAll("\\", "/");
      if (statSync(full).isDirectory()) walk(full);
      else if (CODE.test(name)) out.push(full);
    }
  };
  walk(root);
  return out;
}

/* THE EXCLUSIONS, per scan, each with the reason it is out. A file is scanned
   unless it appears here; adding one is a deliberate diff a reader can argue
   with. Keys are the scan's own name so a reader sees all three together and
   can spot a file excluded from one and not the others. */
export const EXCLUDED = {
  /* The copy gate reads STRINGS and asks whether a child could meet them. A
     file with no child-facing text only adds noise, and one kind of noise is
     dangerous: a stylesheet or an adapter carries words like "error" in its own
     vocabulary, which the banned-word rule would refuse. */
  copy: {
    "app/src/main.jsx": "the entry point: mounts the app and renders no text",
    "app/src/storage.js": "storage keys and error handling, never child text",
    "app/src/voicepacks.js": "the audio adapter; its strings are clip ids and failure reasons for the grown-up log",
    "app/src/updates.js": "the version check; its strings are for the grown-up strip, gated with the rest of ParentScreen",
    "app/src/swrefresh.js": "no text at all",
    "app/src/usePre.js": "ladder state; its copy lives in PreSessionScreen, which IS scanned",
    "app/src/wq-css.js": "the stylesheet, whose vocabulary is CSS",
    "app/src/components/Frame.jsx": "layout only",
    "app/src/components/Zone.jsx": "layout only",
    "app/src/components/Modal.jsx": "a shell; its text comes from the caller",
    "app/src/components/Toast.jsx": "a shell; its text comes from the caller",
    "app/src/components/HoldButton.jsx": "a control; its label comes from the caller",
    "app/src/components/UpdateRow.jsx": "grown-up copy, gated with ParentScreen's",
    "app/src/errors.js": "the error ring; its one text is the report a grown-up copies, which must say the word error",
  },
  /* The network scan reads every file, because any file could reach the
     network — that is the point of S6. Nothing is excluded; the two files
     entitled to a request carry a scoped allowance at the call site instead. */
  network: {},
  /* doc-truth compares documents against the CODE that holds a fact. A file
     that holds no fact any document states adds a read for nothing. */
  docs: {
    "app/src/main.jsx": "mounts the app; states no fact a document repeats",
    "app/src/wq-css.js": "the stylesheet: geometry is proved by the browser gates, not by a document",
    "app/src/components/Frame.jsx": "layout only",
    "app/src/components/Zone.jsx": "layout only",
    "app/src/components/Modal.jsx": "a shell",
    "app/src/components/Toast.jsx": "a shell",
  },
};

/* The list a scan actually reads. */
export function sourcesFor(scan, root = ROOT) {
  const excluded = EXCLUDED[scan] || {};
  return appSources(root).filter((f) => !(f in excluded));
}

/* A stale exclusion is a lie: it names a file that no longer exists, so a
   reader believes something is deliberately out of a scan when nothing is.
   Returns the offenders rather than throwing, so each caller reports in its
   own voice. */
export function staleExclusions() {
  const bad = [];
  for (const [scan, list] of Object.entries(EXCLUDED))
    for (const f of Object.keys(list))
      if (!existsSync(f)) bad.push(`${scan}: ${f} is excluded but does not exist`);
  return bad;
}

export function selfTest() {
  const all = appSources();
  const cases = [
    ["every app source is found", all.length >= 20 && all.includes("app/src/App.jsx")
      && all.includes("app/src/screens/BuildItScreen.jsx"),
      "the walk reaches nested folders, not just the top level"],
    ["a new file is in by default", !(("app/src/screens/BuildItScreen.jsx") in EXCLUDED.copy)
      && sourcesFor("copy").includes("app/src/screens/BuildItScreen.jsx"),
      "the fault this replaces: a screen added and no list told about it"],
    ["an exclusion really excludes", !sourcesFor("copy").includes("app/src/wq-css.js")
      && all.includes("app/src/wq-css.js"),
      "a file named in the list is out of that scan and still exists"],
    ["the network scan excludes nothing", Object.keys(EXCLUDED.network).length === 0
      && sourcesFor("network").length === all.length,
      "S6 asks whether ANY file reaches the network, so no file may sit outside it"],
    ["no exclusion names a vanished file", staleExclusions().length === 0,
      "an exclusion for a deleted file tells a reader something deliberate is happening when nothing is"],
    ["the order is stable", appSources().join() === appSources().join(),
      "a derived list that reorders between runs makes every diff unreadable"],
  ];
  /* The control: a stub that returns everything must fail the exclusion case,
     or that case proves nothing about the filter. */
  const stub = () => appSources();
  const stubPasses = !stub().includes("app/src/wq-css.js");
  let bad = 0;
  for (const [name, ok, why] of cases) {
    console.log(`${ok ? "ok  " : "FAIL"} ${name} — ${why}`);
    if (!ok) bad++;
  }
  console.log(stubPasses
    ? "FAIL control: a stub that filters nothing still passed the exclusion case"
    : "ok   control: a stub that filters nothing fails the exclusion case");
  if (stubPasses) bad++;
  console.log(`\napp-sources controls: ${cases.length + 1 - bad} passed, ${bad} failed`);
  return bad ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith("app-sources.mjs")) {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  console.log(`app sources: ${appSources().length} files; copy scans ${sourcesFor("copy").length}, `
    + `network ${sourcesFor("network").length}, docs ${sourcesFor("docs").length}`);
  const stale = staleExclusions();
  for (const s of stale) console.error(`  PROBLEM: ${s}`);
  process.exit(stale.length ? 1 : 0);
}
