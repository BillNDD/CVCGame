/* Dependency-cycle check (gate G6). Walks the import graph of app/src, src
   and - since batch 1 of the refactor, 2026-09-13 - tools, resolving the
   @engine alias, and fails on any cycle. The ceiling is 0.

   TWO FAULTS CLOSED THE DAY tools JOINED. The tools held one cycle -
   tools/convert-ladder.mjs imported csvCells and spanOf from
   tools/conversion-rehearsal.mjs, which imported seatWords back - and this
   gate could not see it, because it read app/src and src alone; the shared
   mechanics moved to tools/lib and the cycle is gone. And the gate had been
   VACUOUS ON WINDOWS since the repository moved there: a resolved import was
   made cwd-relative by stripping `process.cwd() + "/"`, which never matches a
   path with backslashes, so every edge pointed at an absolute name no node
   had, the walk stopped one hop from every file, and 0 cycles was reported
   over a graph with no edges in it. Every name is a POSIX path relative to
   the cwd now, on every platform, and the controls plant a cycle ON DISK -
   two files importing each other in a scratch directory - which the old
   resolution could not find on this machine.

   Negative controls: --self-test runs the detector on a literal graph with a
   cycle, on the planted on-disk cycle, on the same files with the back-edge
   removed, and on the real tree, where a known edge in each area must have
   resolved. */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { finish } from "./lib/selftest.mjs";
import { withScratch } from "./lib/proc.mjs";

const ROOTS = ["app/src", "src", "tools"];
const ALIAS = { "@engine": "src/engine.js" };
const SKIP = new Set(["node_modules", "fixtures"]);

/* Every name in the graph is the same shape: a POSIX path relative to the
   cwd, whatever the platform wrote. */
const posix = (p) => relative(process.cwd(), resolve(p)).split(sep).join("/");

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...walk(p)); }
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(posix(p));
  }
  return out;
}

function resolveImport(from, spec) {
  if (ALIAS[spec]) return ALIAS[spec];
  if (!spec.startsWith(".")) return null; // external package
  const base = resolve(dirname(from), spec);
  for (const cand of [base, base + ".js", base + ".jsx", base + ".mjs", join(base, "index.js")]) {
    if (existsSync(cand)) return posix(cand);
  }
  return null;
}

/* A named-import list may run over several lines - app/src/App.jsx's import
   of the engine does - and the old pattern stopped at a newline, so the
   app's largest edge was never in the graph (found 2026-09-13 by the control
   below, which asks for that exact edge). The braces may span lines; the
   bare forms stay on one. */
const IMPORT = /(?:import|export)\s+(?:\{[^}]*\}|[^"'\n{]*)\s*from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
function buildGraph(roots = ROOTS) {
  const graph = {};
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const deps = [];
      for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
        const dep = resolveImport(file, m[1] || m[2]);
        if (dep) deps.push(dep);
      }
      graph[file] = deps;
    }
  }
  return graph;
}

function findCycle(graph) {
  const state = {}; // 1 = visiting, 2 = done
  const stack = [];
  const visit = (n) => {
    if (state[n] === 2) return null;
    if (state[n] === 1) return stack.slice(stack.indexOf(n)).concat(n);
    state[n] = 1; stack.push(n);
    for (const d of graph[n] || []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop(); state[n] = 2;
    return null;
  };
  for (const n of Object.keys(graph)) {
    const c = visit(n);
    if (c) return c;
  }
  return null;
}

/* The planted cycle lives on disk, so the WALK and the RESOLUTION are under
   test and not only the search: a.mjs imports b.mjs, b.mjs imports a.mjs,
   c.mjs imports a.mjs and is imported by nobody. */
function plantedControls(T) {
  withScratch("dep-cycles-", (dir) => {
    writeFileSync(join(dir, "a.mjs"), 'import "./b.mjs";\nexport const a = 1;\n');
    writeFileSync(join(dir, "b.mjs"), 'import { a } from "./a.mjs";\nexport const b = a;\n');
    writeFileSync(join(dir, "c.mjs"), 'import { a } from "./a.mjs";\nexport const c = a;\n');
    const cycle = findCycle(buildGraph([dir]));
    T("a cycle planted ON DISK, two files importing each other, is found and named",
      !!cycle && cycle.some((n) => n.endsWith("a.mjs")) && cycle.some((n) => n.endsWith("b.mjs")));
    writeFileSync(join(dir, "b.mjs"), "export const b = 2;\n");
    T("the same files with the back-edge removed hold no cycle", findCycle(buildGraph([dir])) === null);
    T("every file in the scratch directory is a node, whatever the platform wrote", Object.keys(buildGraph([dir])).length === 3);
  });
}
function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  T("the detector finds a planted cycle in a literal graph", !!findCycle({ "a.js": ["b.js"], "b.js": ["a.js"] }));
  T("the detector finds no cycle in a literal chain", findCycle({ "a.js": ["b.js"], "b.js": [] }) === null);
  plantedControls(T);
  const real = buildGraph();
  T("the real graph reaches into tools", Object.keys(real).some((f) => f.startsWith("tools/")));
  T("a real edge resolved in the tools: tools/shape.mjs imports tools/lib/selftest.mjs", (real["tools/shape.mjs"] || []).includes("tools/lib/selftest.mjs"));
  T("the @engine alias resolved: app/src/App.jsx imports src/engine.js", (real["app/src/App.jsx"] || []).includes("src/engine.js"));
  return finish("dep-cycles", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (process.argv.includes("--self-test")) {
    const failed = selfTest();
    if (!failed) console.log("self-test OK: the detector finds a planted cycle");
    process.exit(failed ? 1 : 0);
  }
  const graph = buildGraph();
  const cycle = findCycle(graph);
  if (cycle) {
    console.error("Dependency cycle: " + cycle.join(" -> "));
    process.exit(1);
  }
  console.log(`Dependency cycles: 0 (${Object.keys(graph).length} files checked, @engine alias resolved)`);
}
