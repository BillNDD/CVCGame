/* EVERY TEMPORARY FILE THIS REPOSITORY'S TOOLING WRITES GOES TO D:, NOT C:.
 *
 * Node writes temp files to os.tmpdir(), which on this machine is
 * the Temp folder inside the user profile on C: - a different drive from the repository.
 * The tooling leans on that directory hard: the blast-radius sandbox control
 * makes a temp git repo there, the release command builds its tarball there,
 * vitest caches there, and Playwright puts its artefacts there. C: is small
 * and the game moved to D: in the first place because C: filled up
 * (2026-08-22).
 *
 * ON 2026-08-24 IT BIT: a full gauntlet came back with five failed gates whose
 * numbers were either correct or unparseable, and the cause in the log was
 * `ENOSPC: no space left on device` from a plain writeFileSync. D: had 2.9 TB
 * free at that moment. The tooling had run the SMALL drive out of room while
 * the big one sat idle. The two "random" reds recorded in open fault AM - a
 * sandbox control that makes a temp directory, and a vitest run that caches
 * into one - are the same shape, and this is the better explanation than the
 * agent-contention one first suspected.
 *
 * So the heavy commands run through here. It sets TEMP, TMP and TMPDIR to
 * <repo>/.tmp and then runs the npm script it was given; every child process
 * inherits the environment, which is what makes ONE wrapper enough for a chain
 * of thirty tools rather than an import in each of them.
 *
 * The directory is gitignored and is safe to delete at any time.
 *
 * Run: node tools/run-with-tmp.mjs <npm script name>
 */
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("usage: node tools/run-with-tmp.mjs <npm script name>");
  process.exit(1);
}

const TMP = resolve(process.cwd(), ".tmp");
mkdirSync(TMP, { recursive: true });

/* All three names, because the platforms disagree: Windows reads TEMP and TMP,
   POSIX reads TMPDIR, and node's os.tmpdir() consults them in that order. */
const env = { ...process.env, TEMP: TMP, TMP: TMP, TMPDIR: TMP };

const run = spawnSync("npm", ["run", target], { stdio: "inherit", env, shell: true });
/* A signal gives status null - that is a failure, not a pass. */
process.exit(run.status === null ? 1 : run.status);
