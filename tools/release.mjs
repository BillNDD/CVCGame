/* THE RELEASE COMMAND - hardening decision 1, owner-ruled 2026-08-22:
 * "one local release command that refuses unless HEAD is the proved commit,
 * then pushes main and cuts the tag itself".
 *
 * Twice in one week (beta 24, beta 25) the website cut a release tag at a
 * main that had not been pushed, and the release text described commits the
 * tag did not contain. The step that failed both times was the one between
 * the push and the tag, done by hand on a phone. This command removes the
 * step. It is the ONLY way a release is meant to be cut now.
 *
 * WHAT IT REFUSES, each with a planted-fault control (E5):
 *   1. a dirty tree, or a branch other than main;
 *   2. no gauntlet evidence, evidence that is not PASS, evidence of a dirty
 *      tree, or evidence whose commit is not HEAD - the release is the proved
 *      bytes or nothing;
 *   3. a fresh build of HEAD whose payload hash differs from the evidence's:
 *      the build the gauntlet measured must be the build that ships;
 *   4. a version in app/package.json with no family changelog entry, or with
 *      a tag that already exists locally or on the remote;
 *   5. a remote main that is not an ancestor of HEAD (the push would not be a
 *      fast-forward, so somebody else's commits are in the way).
 *
 * WHAT IT DOES with --go, in this order and stopping at the first failure:
 * push main; create the tag and the GitHub release at HEAD's FULL sha with
 * the changelog entry as the notes; read the remote back and confirm the
 * tag points at HEAD. Without --go it is a dry run that prints every check.
 *
 * Run: node tools/release.mjs            (dry run)
 *      node tools/release.mjs --go       (release)
 *      node tools/release.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { payloadHash } from "./payload-hash.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/* The family changelog's entry for one version: every bullet that names it,
   in the order written, as release notes. Empty when the version is absent. */
export function changelogEntry(changelog, version) {
  const lines = changelog.split("\n");
  const out = [];
  let inBullet = false;
  for (const line of lines) {
    if (/^- /.test(line)) inBullet = line.includes(`in ${version}:`) || line.includes(`in ${version} `);
    else if (!/^  /.test(line)) inBullet = false;
    if (inBullet) out.push(line);
  }
  return out.join("\n").trim();
}

/* The pure judgement over a bag of facts, so every refusal can be proved on
   a planted fact without a repository. */
export function judge(f) {
  const refusals = [];
  if (f.branch !== "main") refusals.push(`on branch "${f.branch}", not main`);
  if (f.porcelain) refusals.push("the tree is dirty:\n" + f.porcelain);
  if (!f.evidence) refusals.push("no .gauntlet-evidence.json - run the gauntlet first");
  else {
    if (f.evidence.status !== "PASS") refusals.push(`the evidence says ${f.evidence.status}, not PASS`);
    if (f.evidence.dirty) refusals.push("the evidence was written over a dirty tree");
    if (f.evidence.commit !== f.head) refusals.push(`the evidence is for ${String(f.evidence.commit).slice(0, 7)}, HEAD is ${f.head.slice(0, 7)} - run the gauntlet on HEAD`);
    if (!f.evidence.payload || !f.evidence.payload.hash) refusals.push("the evidence carries no payload hash");
    else if (f.freshHash !== f.evidence.payload.hash) refusals.push(`a fresh build of HEAD hashes ${String(f.freshHash).slice(0, 20)}…, the evidence says ${f.evidence.payload.hash.slice(0, 20)}… - the proved bytes are not the shipped bytes`);
  }
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(f.version)) refusals.push(`app/package.json version "${f.version}" is not a version`);
  if (!f.notes) refusals.push(`CHANGELOG.md has no entry for ${f.version} - the family reads that before the tag exists`);
  if (f.tagExistsLocally) refusals.push(`tag v${f.version} already exists locally`);
  if (f.tagExistsRemotely) refusals.push(`tag v${f.version} already exists on the remote`);
  if (!f.remoteIsAncestor) refusals.push(`origin/main (${String(f.remoteMain).slice(0, 7)}) is not an ancestor of HEAD - the push would not be a fast-forward`);
  return refusals;
}

function gather({ build = true } = {}) {
  const head = git("rev-parse", "HEAD");
  const evidence = existsSync(".gauntlet-evidence.json") ? JSON.parse(readFileSync(".gauntlet-evidence.json", "utf8")) : null;
  if (build) execFileSync("npm", ["--prefix", "app", "run", "build"], { stdio: "ignore", shell: true });
  const version = JSON.parse(readFileSync("app/package.json", "utf8")).version;
  git("fetch", "-q", "origin", "main");
  const remoteMain = git("rev-parse", "origin/main");
  let remoteIsAncestor = true;
  try { execFileSync("git", ["merge-base", "--is-ancestor", remoteMain, head], { stdio: "ignore" }); } catch { remoteIsAncestor = false; }
  const remoteTags = git("ls-remote", "--tags", "origin");
  return {
    head, branch: git("branch", "--show-current"), porcelain: git("status", "--porcelain"),
    evidence, freshHash: payloadHash("app/dist"), version,
    notes: changelogEntry(readFileSync("CHANGELOG.md", "utf8"), version),
    tagExistsLocally: git("tag", "--list", `v${version}`) !== "",
    tagExistsRemotely: remoteTags.includes(`refs/tags/v${version}\n`) || remoteTags.endsWith(`refs/tags/v${version}`),
    remoteMain, remoteIsAncestor,
  };
}

function selfTest() {
  const ok = [];
  const good = {
    head: "a".repeat(40), branch: "main", porcelain: "",
    evidence: { status: "PASS", dirty: false, commit: "a".repeat(40), payload: { hash: "sha256:x" } },
    freshHash: "sha256:x", version: "1.0.0-beta.26", notes: "- New in 1.0.0-beta.26: a thing.",
    tagExistsLocally: false, tagExistsRemotely: false, remoteMain: "b".repeat(40), remoteIsAncestor: true,
  };
  ok.push(["a proved, clean, pushed-ahead HEAD with a changelog entry is accepted", judge(good).length === 0]);
  const refused = (patch, needle) => judge({ ...good, ...patch }).some((r) => r.includes(needle));
  ok.push(["a dirty tree is refused", refused({ porcelain: " M app/src/App.jsx" }, "dirty")]);
  ok.push(["a branch other than main is refused", refused({ branch: "work" }, "not main")]);
  ok.push(["no evidence is refused", refused({ evidence: null }, "no .gauntlet-evidence")]);
  ok.push(["evidence that is not PASS is refused", refused({ evidence: { ...good.evidence, status: "FAIL" } }, "not PASS")]);
  ok.push(["evidence over a dirty tree is refused", refused({ evidence: { ...good.evidence, dirty: true } }, "dirty tree")]);
  /* THE BETA 24 AND 25 SHAPE: the evidence is for an older commit. */
  ok.push(["evidence for a commit that is not HEAD is refused", refused({ evidence: { ...good.evidence, commit: "c".repeat(40) } }, "run the gauntlet on HEAD")]);
  ok.push(["a fresh build whose bytes differ from the proved bytes is refused", refused({ freshHash: "sha256:y" }, "not the shipped bytes")]);
  ok.push(["evidence with no payload hash is refused", refused({ evidence: { ...good.evidence, payload: { hash: null } } }, "no payload hash")]);
  ok.push(["a version with no changelog entry is refused", refused({ notes: "" }, "no entry")]);
  ok.push(["an existing local tag is refused", refused({ tagExistsLocally: true }, "exists locally")]);
  ok.push(["an existing remote tag is refused", refused({ tagExistsRemotely: true }, "exists on the remote")]);
  ok.push(["a push that would not fast-forward is refused", refused({ remoteIsAncestor: false }, "fast-forward")]);
  const log = "# Changelog\n\n- New in 1.0.0-beta.26: a thing.\n  More of it.\n- Fixed in 1.0.0-beta.25: old.\n- Under the hood in 1.0.0-beta.26: another.\n";
  const entry = changelogEntry(log, "1.0.0-beta.26");
  ok.push(["the changelog entry is every bullet naming the version, with its wrapped lines, and nothing else",
    entry.includes("a thing.") && entry.includes("More of it.") && entry.includes("another.") && !entry.includes("old.")]);
  ok.push(["the changelog entry for an unknown version is empty", changelogEntry(log, "9.9.9") === ""]);
  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nrelease controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

const GO = process.argv.includes("--go");
const facts = gather();
const refusals = judge(facts);
console.log(`release ${facts.version} from ${facts.head.slice(0, 7)} on ${facts.branch}: ${refusals.length ? "REFUSED" : "ready"}`);
for (const r of refusals) console.log("  - " + r);
if (refusals.length) process.exit(1);
console.log(`  evidence ${facts.evidence.commit_short || facts.evidence.commit.slice(0, 7)} PASS, payload ${facts.freshHash.slice(0, 20)}… rebuilt and identical`);
console.log(`  origin/main ${facts.remoteMain.slice(0, 7)} -> ${facts.head.slice(0, 7)} (fast-forward, ${git("rev-list", "--count", `${facts.remoteMain}..${facts.head}`)} commits)`);
console.log(`  tag v${facts.version} at ${facts.head}\n  notes:\n${facts.notes.split("\n").map((l) => "    " + l).join("\n")}`);
if (!GO) { console.log("\ndry run - add --go to push main and cut the release"); process.exit(0); }

execFileSync("git", ["push", "origin", "main"], { stdio: "inherit" });
const tmp = mkdtempSync(join(tmpdir(), "wq-release-"));
const notesFile = join(tmp, "notes.md");
writeFileSync(notesFile, facts.notes + "\n\nPlay it: https://billndd.github.io/CVCGame/\n");
try {
  execFileSync("gh", ["release", "create", `v${facts.version}`, "--target", facts.head, "--title", `v${facts.version}`, "--notes-file", notesFile], { stdio: "inherit", shell: true });
} finally { rmSync(tmp, { recursive: true, force: true }); }
/* Read the remote back: the tag must point at HEAD, or the release is not
   what this command promised. */
const remoteTag = git("ls-remote", "origin", `refs/tags/v${facts.version}`).split(/\s/)[0];
const tagCommit = remoteTag ? git("rev-list", "-n", "1", `v${facts.version}`) : "";
if (tagCommit !== facts.head) { console.error(`REFUSED AFTER THE FACT: the remote tag v${facts.version} is at ${tagCommit.slice(0, 7)}, not ${facts.head.slice(0, 7)}`); process.exit(1); }
console.log(`released v${facts.version} at ${facts.head.slice(0, 7)}; the tag's gauntlet runs on the remote now`);
