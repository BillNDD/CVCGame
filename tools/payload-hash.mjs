/* THE PAYLOAD HASH - one function, two readers. The gauntlet writes it into
   the evidence (what was proved); the release command recomputes it from a
   fresh build of HEAD and refuses the release if the two differ (what is
   shipped). Both read THIS so the algorithm cannot drift between them - a
   second copy would be fault F2, the file map's own warning.

   A Node walk, sorted by POSIX path, forward slashes whatever the platform,
   so the same bytes hash the same everywhere. Null when there is no build. */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`;
    if (statSync(p).isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

export function payloadHash(dir = "app/dist") {
  if (!existsSync(dir)) return null;
  const files = walk(dir).sort();
  if (!files.length) return null;
  const h = createHash("sha256");
  for (const f of files) {
    h.update(f);                                     // cwd-relative, "app/dist/...": the form every evidence file since 2026-08-22 carries
    h.update(createHash("sha256").update(readFileSync(f)).digest("hex"));
  }
  return `sha256:${h.digest("hex")}`;
}
