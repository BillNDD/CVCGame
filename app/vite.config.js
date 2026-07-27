/* Vite configuration for the Word Quest standalone app.
   The app imports the game logic from ../src/engine.js. The extractor generates
   that module from the reference build before each dev run and each build. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, "../icons");
const DIST_DIR = path.resolve(__dirname, "dist");
const APP_VERSION = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")).version;

/* Walk a directory and return every file path relative to that directory. */
function walk(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

/* Copies the shared icon set into the bundle and writes a cache-first service
   worker whose precache list is the exact build output. The app then operates
   offline after the first load and makes no further network calls. */
function wqPwa() {
  return {
    name: "wq-pwa",
    buildStart() {
      for (const f of readdirSync(ICONS_DIR)) {
        this.emitFile({
          type: "asset",
          fileName: "icons/" + f,
          source: readFileSync(path.join(ICONS_DIR, f)),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = req.url && req.url.match(/^\/icons\/([^?]+)$/);
        if (!m) return next();
        const file = path.resolve(ICONS_DIR, decodeURIComponent(m[1]));
        if (!file.startsWith(ICONS_DIR + path.sep)) return next();
        try {
          const data = readFileSync(file);
          res.setHeader("Content-Type", file.endsWith(".ico") ? "image/x-icon" : "image/png");
          res.end(data);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      /* version.json is the update check's target (SPEC section 7a). It is
         never precached and the service worker never intercepts it, so the
         check always sees the live host. */
      writeFileSync(path.join(DIST_DIR, "version.json"), JSON.stringify({ version: APP_VERSION }) + "\n");
      const files = walk(DIST_DIR).filter((f) => f !== "sw.js" && f !== "version.json").sort();
      const assets = files.map((f) => "./" + f);
      /* Version by file CONTENTS, not names: index.html, the manifest, and the
         icons keep stable names across builds, and a changed byte in any of
         them must produce a new sw.js so installed clients pick it up. */
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update("\0").update(readFileSync(path.join(DIST_DIR, f)));
      const version = hash.digest("hex").slice(0, 12);
      /* The worker itself lives in app/sw-template.js, so the shipped code is
         a file a test can load and drive rather than a string inside a build
         script. Only the cache name and the precache list are filled in here. */
      const sw = readFileSync(path.resolve(__dirname, "sw-template.js"), "utf8")
        .replace("__CACHE_VERSION__", version)
        .replace("__ASSETS__", JSON.stringify(assets, null, 2));
      writeFileSync(path.join(DIST_DIR, "sw.js"), sw);
      console.log(`wq-pwa: wrote sw.js (${assets.length} precached assets, cache wq-${version})`);
    },
  };
}

export default defineConfig({
  /* Relative base: the built app works from any path, including a GitHub
     Pages project path. */
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react(), tailwindcss(), wqPwa()],
  resolve: {
    alias: { "@engine": path.resolve(__dirname, "../src/engine.js") },
  },
  server: {
    fs: { allow: [path.resolve(__dirname, "..")] },
  },
  build: {
    /* Minimum platform is iPadOS 15.4 (SPEC section 8). */
    target: ["es2020", "safari15"],
  },
});
