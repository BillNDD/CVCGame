/* Dependency-cycle check (gate G6). Walks the import graph of app/src and
   src, resolving the @engine alias, and fails on any cycle. The ceiling is 0.
   Negative control: --self-test runs the detector on a fixture graph that
   contains a cycle; the detector must find it. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOTS = ["app/src", "src"];
const ALIAS = { "@engine": "src/engine.js" };

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

function resolveImport(from, spec) {
  if (ALIAS[spec]) return ALIAS[spec];
  if (!spec.startsWith(".")) return null; // external package
  const base = resolve(dirname(from), spec);
  for (const cand of [base, base + ".js", base + ".jsx", base + ".mjs", join(base, "index.js")]) {
    if (existsSync(cand)) return cand.replace(process.cwd() + "/", "");
  }
  return null;
}

function buildGraph() {
  const graph = {};
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const src = readFileSync(file, "utf8");
      const deps = [];
      for (const m of src.matchAll(/(?:import|export)\s[^"'\n]*from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g)) {
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

if (process.argv.includes("--self-test")) {
  const cycle = findCycle({ "a.js": ["b.js"], "b.js": ["a.js"] });
  if (cycle) { console.log("self-test OK: the detector finds a planted cycle"); process.exit(0); }
  console.error("self-test FAILED: the detector missed a planted cycle");
  process.exit(1);
}

const graph = buildGraph();
const files = Object.keys(graph).length;
const cycle = findCycle(graph);
if (cycle) {
  console.error("Dependency cycle: " + cycle.join(" -> "));
  process.exit(1);
}
console.log(`Dependency cycles: 0 (${files} files checked, @engine alias resolved)`);
