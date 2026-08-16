/* The coverage lookup: how far along the owner's ruled target vocabulary the
   bank has come. Owner-ruled 2026-08-16 ("I would like for the game to cover
   at least these words by the time we call it done"); SPEC section 12 owns
   the ruling and tools/target-vocab.txt holds the 420 words. Like
   blast-radius, this is a LOOKUP, not a gate: it never fails a build and it
   cannot say whether teaching a word next is right — it only counts.

   Run: node tools/target-coverage.mjs            the tally and the gap, by family
        node tools/target-coverage.mjs --self-test  prove the counter counts */
import { readFileSync } from "node:fs";

export function targetWords(read = readFileSync) {
  return read("tools/target-vocab.txt", "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

export function coverage(target, bank) {
  const have = new Set(bank);
  const covered = target.filter((w) => have.has(w));
  const missing = target.filter((w) => !have.has(w));
  /* The same rough families the road in SPEC section 12 names. A word can
     match several shapes; first match wins, so the buckets add up. */
  const fam = { "vowel teams": [], "magic-e": [], "r-controlled": [], "-ing forms": [], "two-syllable": [], "short words": [] };
  for (const w of missing) {
    if (/ee|ea|oa|ai|oo|ou|ow|oy|ay|igh/.test(w)) fam["vowel teams"].push(w);
    else if (/[aeiou][bcdfgklmnprstvz]e$/.test(w)) fam["magic-e"].push(w);
    else if (/(ar|or|er|ir|ur)/.test(w) && w.length <= 5) fam["r-controlled"].push(w);
    else if (/ing$/.test(w)) fam["-ing forms"].push(w);
    else if (w.length >= 6) fam["two-syllable"].push(w);
    else fam["short words"].push(w);
  }
  return { covered, missing, fam };
}

function selfTest() {
  const target = ["cat", "rain", "cake", "card", "digging", "kitten", "mitt"];
  const { covered, missing, fam } = coverage(target, ["cat"]);
  const checks = [
    ["a covered word is counted covered", covered.length === 1 && covered[0] === "cat"],
    ["six uncovered words are all reported", missing.length === 6],
    ["a vowel-team word lands in its family", fam["vowel teams"].includes("rain")],
    ["a magic-e word lands in its family", fam["magic-e"].includes("cake")],
    ["an r-controlled word lands in its family", fam["r-controlled"].includes("card")],
    ["an -ing form lands in its family", fam["-ing forms"].includes("digging")],
    ["a long word lands in two-syllable", fam["two-syllable"].includes("kitten")],
    ["everything else is a short word", fam["short words"].includes("mitt")],
    ["the buckets add up to the gap", Object.values(fam).flat().length === 6],
  ];
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log((ok ? "ok   " : "FAIL ") + name);
    if (!ok) failed += 1;
  }
  console.log(`\ntarget-coverage controls: ${checks.length - failed} passed, ${failed} failed`);
  return failed;
}

const main = async () => {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);
  const { LEVELS } = await import("../src/engine.js");
  const bank = LEVELS.flatMap((l) => l.words);
  const target = targetWords();
  const { covered, missing, fam } = coverage(target, bank);
  console.log(`Target coverage: ${covered.length} of ${target.length} target words are in the ${bank.length}-word bank; ${missing.length} to go`);
  for (const [name, words] of Object.entries(fam)) {
    if (words.length) console.log(`  ${name} (${words.length}): ${words.slice(0, 10).join(" ")}${words.length > 10 ? " …" : ""}`);
  }
};
main();
