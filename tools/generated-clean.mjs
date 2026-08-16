/* The G3 tail: tests/generated must be byte-identical to the commit AND hold
   nothing untracked. `git diff` alone misses a brand-new file, and the shell
   idiom that used to guard it — test -z "$(git status ...)" — is POSIX, so
   under the Windows default shell the whole gate failed on the idiom, not on
   the truth (the first Windows gauntlet found it, 2026-08-15). Ten portable
   lines instead. */
import { execFileSync } from "node:child_process";

const out = execFileSync("git", ["status", "--porcelain", "--", "tests/generated"], { encoding: "utf8" }).trim();
if (out) {
  console.error("tests/generated is not clean against the commit:\n" + out);
  process.exit(1);
}
console.log("tests/generated matches the commit, nothing untracked");
