/* THE LAST THING BETWEEN A BAD ARTEFACT AND A CHILD'S DEVICE.
 *
 * The website publishes the bytes the gauntlet proved (E7, owner-ruled
 * 2026-08-23): the release carries a tarball of the proved `app/dist` and the
 * `.gauntlet-evidence.json` that proved it, and the deploy refuses to publish
 * anything whose payload hash differs. Then it reads the live site back and
 * refuses after the fact if what a family can download is not what was
 * released.
 *
 * THOSE TWO REFUSALS LIVED AS INLINE JAVASCRIPT INSIDE A YAML `run:` STEP,
 * with no control of any kind and no run behind them - the release sweep of
 * 2026-08-23 found that the whole chain had never executed once. E5 says every
 * detector ships with a negative control that proves it catches its target, and
 * a detector nobody can call is a detector nobody can test. So the judgement is
 * here, as two pure functions over plain data, with controls that plant each
 * fault; the workflow calls this file and does no thinking of its own.
 *
 * Pure in, string out: each returns the refusal a person should read, or null
 * when there is nothing to refuse. Neither reads a file or the network.
 *
 * Run:      node tools/verify-published.mjs --payload   (env: EVIDENCE_FILE, DIST_DIR)
 *           node tools/verify-published.mjs --live      (env: LIVE_FILE, RELEASE_SHA, RELEASE_TAG)
 * Controls: node tools/verify-published.mjs --self-test
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/* Are these the bytes the gauntlet measured? The evidence must say PASS, must
   carry a hash, and that hash must equal the one recomputed from the files that
   were actually extracted. */
export function judgePayload(evidence, got) {
  if (!evidence || typeof evidence !== "object") return "REFUSED: the evidence could not be read as a record";
  if (evidence.status !== "PASS") return `REFUSED: the evidence says ${evidence.status}, not PASS`;
  const want = evidence.payload && evidence.payload.hash;
  if (!want) return "REFUSED: the evidence carries no payload hash";
  if (!got) return "REFUSED: no payload hash could be computed from the downloaded build";
  if (got !== want) return `REFUSED: the downloaded build hashes ${got}, the evidence proved ${want} - these are not the bytes that were measured`;
  return null;
}

/* Is what a family can download the thing that was released? version.json is
   written at build time from the commit, so the live build must be the commit
   the evidence proved - not main's HEAD, which on a hand-run deploy is a
   different commit entirely.

   THE PRESENCE CHECKS COME FIRST. They used to sit after the comparison, so an
   empty sha reached `sha.startsWith(live.build)`, which is false for any real
   build, and the deploy refused with a message about the wrong thing entirely
   instead of saying it did not know what it had published. */
export function judgeLive(live, sha, tag) {
  if (!live || typeof live !== "object") return "REFUSED AFTER THE FACT: the live site served nothing that reads as a version record";
  if (!sha || !tag) return "REFUSED AFTER THE FACT: the deploy could not say which release it published, so there is nothing to check it against";
  if (!live.version || !live.build) return "REFUSED AFTER THE FACT: the live site served no version and build to read";
  if (!sha.startsWith(live.build)) return `REFUSED AFTER THE FACT: the live site reports build ${live.build}, which is not the commit the gauntlet proved, ${sha.slice(0, 12)}`;
  if (tag !== "v" + live.version) return `REFUSED AFTER THE FACT: the live site reports ${live.version}, the release is ${tag}`;
  return null;
}

function selfTest() {
  const ok = [];
  const good = { status: "PASS", payload: { hash: "abc123" }, commit: "deadbeefcafe" };

  ok.push(["proved bytes are accepted", judgePayload(good, "abc123") === null]);
  ok.push(["a FAIL evidence is refused", String(judgePayload({ ...good, status: "FAIL" }, "abc123")).includes("not PASS")]);
  ok.push(["evidence with no hash is refused", String(judgePayload({ status: "PASS", payload: {} }, "abc123")).includes("no payload hash")]);
  ok.push(["a build that hashes differently is refused, and both hashes are named",
    (() => { const r = String(judgePayload(good, "zzz999")); return r.includes("zzz999") && r.includes("abc123"); })()]);
  ok.push(["no computed hash at all is refused", String(judgePayload(good, "")).includes("no payload hash could be computed")]);
  ok.push(["evidence that is not a record is refused", String(judgePayload(null, "abc123")).includes("could not be read")]);

  const live = { version: "1.0.0-beta.27", build: "deadbeef" };
  ok.push(["a site serving the released commit and version is accepted",
    judgeLive(live, "deadbeefcafe", "v1.0.0-beta.27") === null]);
  ok.push(["a site still serving the previous build is refused",
    String(judgeLive({ ...live, build: "0badcafe" }, "deadbeefcafe", "v1.0.0-beta.27")).includes("0badcafe")]);
  ok.push(["a site serving another version is refused",
    String(judgeLive({ ...live, version: "1.0.0-beta.26" }, "deadbeefcafe", "v1.0.0-beta.27")).includes("beta.26")]);
  ok.push(["a version record with no build is refused",
    String(judgeLive({ version: "1.0.0-beta.27" }, "deadbeefcafe", "v1.0.0-beta.27")).includes("no version and build")]);
  /* the ordering fault: with nothing to compare against, the refusal must SAY
     that, not report a build mismatch it cannot actually have judged */
  ok.push(["an unknown release says so, rather than reporting a mismatch",
    String(judgeLive(live, "", "")).includes("could not say which release it published")]);
  ok.push(["a known sha with no tag is still refused for the same reason",
    String(judgeLive(live, "deadbeefcafe", "")).includes("could not say which release")]);
  ok.push(["nothing served at all is refused", String(judgeLive(null, "deadbeefcafe", "v1.0.0-beta.27")).includes("reads as a version record")]);

  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nverify-published controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;

if (RUN_AS_COMMAND) {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  if (process.argv.includes("--payload")) {
    const { payloadHash } = await import("./payload-hash.mjs");
    const evidence = read(process.env.EVIDENCE_FILE);
    const got = payloadHash(process.env.DIST_DIR || "app/dist");
    const no = judgePayload(evidence, got);
    if (no) { console.error(no); process.exit(1); }
    console.log(`publishing the bytes proved on ${evidence.commit_short || evidence.commit}: ${got}`);
    process.exit(0);
  }
  if (process.argv.includes("--live")) {
    const no = judgeLive(read(process.env.LIVE_FILE), process.env.RELEASE_SHA || "", process.env.RELEASE_TAG || "");
    if (no) { console.error(no); process.exit(1); }
    const live = read(process.env.LIVE_FILE);
    console.log(`the live site reports ${live.version} at ${live.build}, the released commit`);
    process.exit(0);
  }
  console.error("usage: verify-published.mjs --payload | --live | --self-test");
  process.exit(1);
}
