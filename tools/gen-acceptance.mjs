/* Acceptance test generator (gate G3). Reads tests/generated/acceptance-ir.json
   and writes tests/generated/acceptance.test.js. Nobody edits the output by
   hand. Every example value from the IR is baked into the emitted code as a
   literal, so the acceptance-mutation gate (G4) can prove each value is read.
   Deterministic: stable ordering, LF endings, no timestamps, no absolute
   paths. An unmatched step is a hard error, never a skip. */
import { readFileSync, writeFileSync } from "node:fs";

const IR = "tests/generated/acceptance-ir.json";
const OUT = "tests/generated/acceptance.test.js";
const S = (v) => JSON.stringify(v); // JS string/number literal
const N = (v) => String(Number(v));

/* Each entry: regex over the step text -> lines of code. The generator, not
   the runner, resolves the mapping, so the output is plain Vitest. */
const STEPS = [
  // ---- grading ----
  [/^a word the child has never attempted$/, () => [
    `const ws = freshWordState();`]],
  [/^a word in box (\d+) with (\d+) attempts?$/, (m) => [
    `const ws = { ...freshWordState(), box: ${N(m[1])}, attempts: ${N(m[2])} };`]],
  /* A word's HISTORY, not just its count of tries. The fast track to box 3 keys
     off the first CORRECT reading, so "box 5 with 9 attempts" described a state
     the app cannot reach - nine tries and never once right, yet at the top box. */
  [/^a word in box (\d+) read correctly (\d+) times? before$/, (m) => [
    `const ws = { ...freshWordState(), box: ${N(m[1])}, attempts: ${N(m[2])}, correct: ${N(m[2])} };`]],
  [/^the child reads it correctly in session (\d+)$/, (m) => [
    `applyResult(ws, "correct", ${N(m[1])});`]],
  [/^the child is close in session (\d+)$/, (m) => [
    `applyResult(ws, "close", ${N(m[1])});`]],
  [/^the child misses it in session (\d+)$/, (m) => [
    `applyResult(ws, "wrong", ${N(m[1])});`]],
  [/^the word is in box (\d+)$/, (m) => [
    `expect(ws.box).toBe(${N(m[1])});`]],
  [/^the word is due again in session (\d+)$/, (m) => [
    `expect(ws.dueAt).toBe(${N(m[1])});`]],

  // ---- phonics ----
  [/^the app shows the sound tiles for "([a-z]+)"$/, (m) => [
    `const word = ${S(m[1])};`,
    `const tiles = chunkWord(word);`]],
  [/^the tiles read "([a-z,]+)"$/, (m) => [
    `expect(tiles).toEqual(${S(m[1].split(","))});`]],
  [/^the dashed form is "([a-z-]+)"$/, (m) => [
    `expect(dashed(word)).toBe(${S(m[1])});`]],
  [/^the app gives feedback for a "(correct|close|wrong)" reading of "([a-z]+)"$/, (m) => [
    `const fb = feedbackParts(${S(m[1])}, ${S(m[2])});`]],
  [/^the feedback lead is "(.+)"$/, (m) => [
    `expect(fb.lead).toBe(${S(m[1])});`]],
  [/^the feedback shows "(.+)" and the word "([a-z]+)"$/, (m) => [
    `expect(fb.d).toBe(${S(m[1])});`,
    `expect(fb.word).toBe(${S(m[2])});`]],
  [/^the word "([a-z]+)" carries the note "(.+)"$/, (m) => [
    `expect(TRICKY[${S(m[1])}]).toBe(${S(m[2])});`]],

  // ---- session building ----
  [/^a brand-new player$/, () => [
    `const s = newState();`]],
  [/^a player on Level (\d+) who has mastered every Level 1 word$/, (m) => [
    `const s = newState(); s.level = ${N(m[1])};`,
    `LEVELS[0].words.forEach((w) => { s.words[w] = { ...freshWordState(), box: 5, attempts: 3, dueAt: 99 }; });`]],
  [/^a player on Level (\d+) in session (\d+) with all (\d+) lower-level words overdue in box (\d+)$/, (m) => [
    `const s = newState(); s.level = ${N(m[1])}; s.sessionsCompleted = ${N(m[2])} - 1;`,
    `const lower = LEVELS.slice(0, ${N(m[1])} - 1).flatMap((l) => l.words);`,
    `expect(lower.length).toBe(${N(m[3])});`,
    `lower.forEach((w) => { s.words[w] = { ...freshWordState(), box: ${N(m[4])}, attempts: 4, dueAt: 1 }; });`]],
  [/^a player on Level (\d+) with every lower-level word mastered and none due$/, (m) => [
    `const s = newState(); s.level = ${N(m[1])};`,
    `LEVELS.slice(0, ${N(m[1])} - 1).flatMap((l) => l.words).forEach((w) => { s.words[w] = { ...freshWordState(), box: 5, attempts: 6, dueAt: 999 }; });`]],
  [/^the player has completed (\d+) sessions?$/, (m) => [
    `s.sessionsCompleted = ${N(m[1])};`]],
  [/^a player on Level (\d+) whose Level 1 words are all due in box (\d+)$/, (m) => [
    `const s = newState(); s.level = ${N(m[1])}; s.sessionsCompleted = 6;`,
    `LEVELS[0].words.forEach((w) => { s.words[w] = { ...freshWordState(), box: ${N(m[2])}, attempts: 3, dueAt: 1 }; });`]],
  [/^the word "([a-z]+)" is due in box (\d+)$/, (m) => [
    `s.words[${S(m[1])}] = { ...freshWordState(), box: ${N(m[2])}, attempts: 9, dueAt: 1 };`]],
  /* Every Level 1 step asserts the level's size from the scenario's own words.
     The old shapes baked "12" into the regex and, for two of them, emitted no
     length assertion at all — so a scenario could say "all 12 words" of a
     level that held ten, slice past the end, and pass while its text lied
     (found by the build reviewer, 2026-08-15). The count is captured and
     asserted in every shape now; a wrong Y is a red build in all four. */
  [/^a player on Level 1 who has seen (\d+) of the (\d+) words$/, (m) => [
    `const s = newState(); s.sessionsCompleted = 3;`,
    `expect(LEVELS[0].words.length).toBe(${N(m[2])});`,
    `LEVELS[0].words.slice(0, ${N(m[1])}).forEach((w) => { s.words[w] = { ...freshWordState(), box: 5, attempts: 4, dueAt: 99 }; });`]],
  [/^a player on Level 1 who has seen all (\d+) words$/, (m) => [
    `const s = newState(); s.sessionsCompleted = 3;`,
    `expect(LEVELS[0].words.length).toBe(${N(m[1])});`,
    `LEVELS[0].words.forEach((w) => { s.words[w] = { ...freshWordState(), box: 5, attempts: 4, dueAt: 99 }; });`]],
  /* A3-002 — "seen" and "learned" are different things. A box of 0 is a word
     the child has read and got wrong; the box only rises on a correct reading,
     and a first correct reading sets it to 3. */
  [/^a player on Level 1 who has seen all (\d+) words and read none correctly$/, (m) => [
    `const s = newState(); s.sessionsCompleted = 3;`,
    `expect(LEVELS[0].words.length).toBe(${N(m[1])});`,
    `LEVELS[0].words.forEach((w) => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });`]],
  [/^a player on Level 1 who has read (\d+) of the (\d+) words correctly$/, (m) => [
    `const s = newState(); s.sessionsCompleted = 3;`,
    `expect(LEVELS[0].words.length).toBe(${N(m[2])});`,
    `LEVELS[0].words.forEach((w) => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });`,
    `LEVELS[0].words.slice(0, ${N(m[1])}).forEach((w) => { s.words[w] = { ...freshWordState(), box: 3, attempts: 2, dueAt: 1 }; });`]],
  [/^the Level 2 word "([a-z]+)" was read wrong in an earlier session$/, (m) => [
    `expect(WORD_LEVEL[${S(m[1])}]).toBe(2);`,
    `s.words[${S(m[1])}] = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 };`]],
  [/^(\d+) Level 2 words were read wrong in earlier sessions$/, (m) => [
    `LEVELS[1].words.slice(0, ${N(m[1])}).forEach((w) => { s.words[w] = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 }; });`]],
  [/^a session is built$/, () => [
    `const q = buildSession(s);`]],
  [/^it has exactly (\d+) words$/, (m) => [
    `expect(q.length).toBe(${N(m[1])});`]],
  [/^every word is a Level (\d+) word$/, (m) => [
    `expect(q.every((w) => WORD_LEVEL[w] === ${N(m[1])})).toBe(true);`]],
  [/^no word repeats$/, () => [
    `expect(new Set(q).size).toBe(q.length);`]],
  [/^at most (\d+) words come from lower levels$/, (m) => [
    `expect(q.filter((w) => WORD_LEVEL[w] < s.level).length).toBeLessThanOrEqual(${N(m[1])});`]],
  [/^it contains exactly (\d+) mastered words$/, (m) => [
    `expect(q.filter((w) => s.words[w] && s.words[w].box >= 4).length).toBe(${N(m[1])});`]],
  [/^the first word is "([a-z]+)"$/, (m) => [
    `expect(q[0]).toBe(${S(m[1])});`]],
  [/^at least one word is a Level (\d+) word$/, (m) => [
    `expect(q.some((w) => WORD_LEVEL[w] === ${N(m[1])})).toBe(true);`]],
  [/^no word is above Level (\d+)$/, (m) => [
    `expect(q.every((w) => WORD_LEVEL[w] <= ${N(m[1])})).toBe(true);`]],
  [/^the session contains the word "([a-z]+)"$/, (m) => [
    `expect(q).toContain(${S(m[1])});`]],
  [/^exactly (\d+) words come from higher levels$/, (m) => [
    `expect(q.filter((w) => WORD_LEVEL[w] > s.level).length).toBe(${N(m[1])});`]],

  // ---- promotion ----
  [/^a player on Level (\d+) with (\d+) of the (\d+) words at box (\d+)$/, (m) => [
    `const s = newState(); s.level = ${N(m[1])};`,
    `expect(LEVELS[${N(m[1])} - 1].words.length).toBe(${N(m[3])});`,
    `LEVELS[${N(m[1])} - 1].words.slice(0, ${N(m[2])}).forEach((w) => { s.words[w] = { ...freshWordState(), box: ${N(m[4])}, attempts: 1 }; });`]],
  [/^the session ends$/, () => [
    `const promoted = checkPromotion(s);`]],
  [/^a perfect-session streak of (\d+)$/, (m) => [
    `s.perfectStreak = ${N(m[1])};`]],
  [/^the session ends with every word correct$/, () => [
    `const promoted = checkPromotion(s, { partial: false, perfect: true });`]],
  [/^the session ends with a missed word$/, () => [
    `const promoted = checkPromotion(s, { partial: false, perfect: false });`]],
  [/^the session stops early$/, () => [
    `const promoted = checkPromotion(s, { partial: true, perfect: true });`]],
  [/^the session stops early with a missed word$/, () => [
    `const promoted = checkPromotion(s, { partial: true, perfect: false });`]],
  [/^the perfect-session streak is (\d+)$/, (m) => [
    `expect(s.perfectStreak).toBe(${N(m[1])});`]],
  [/^the player is promoted to Level (\d+)$/, (m) => [
    `expect(promoted).toBe(true);`,
    `expect(s.level).toBe(${N(m[1])});`]],
  [/^the player stays on Level (\d+)$/, (m) => [
    `expect(promoted).toBe(false);`,
    `expect(s.level).toBe(${N(m[1])});`]],

  // ---- saves ----
  [/^a version 2 save at level 3 with a log row at level 1$/, () => [
    `const doc = { version: 2, level: 3, sessionsCompleted: 9,`,
    `  settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },`,
    `  words: { cat: { box: 5, attempts: 9, correct: 8, close: 1, wrong: 0, dueAt: 20, lastSession: 8 } },`,
    `  log: [{ n: 1, level: 1, c: 18, k: 1, w: 1, acc: 90, items: [] }] };`,
    `const wordsBefore = JSON.stringify(doc.words);`]],
  [/^a version 2 save at level 3$/, () => [
    `const doc = { version: 2, level: 3, sessionsCompleted: 9,`,
    `  settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },`,
    `  words: { cat: { box: 5, attempts: 9, correct: 8, close: 1, wrong: 0, dueAt: 20, lastSession: 8 } }, log: [] };`]],
  [/^a version 3 save with level "([a-z]+)"$/, (m) => [
    `const doc = { version: 3, level: ${S(m[1])} };`]],
  [/^a version (\d+) save with level (\d+)$/, (m) => [
    `const doc = { version: ${N(m[1])}, level: ${N(m[2])} };`]],
  /* The v4 landing, from the child's own words: mastering the first two
     levels' words exactly secures Levels 1 and 2 and nothing above, so the
     recompute must answer 3. Built from LEVELS so the fixture can never
     drift from the bank. */
  [/^a version 2 save whose words have mastered the first two levels$/, () => [
    `const doc = { version: 2, level: 1, words: {} };`,
    `LEVELS.slice(0, 2).flatMap((l) => l.words).forEach((w) => { doc.words[w] = { box: 5, attempts: 6, correct: 6, close: 0, wrong: 0, dueAt: 99, lastSession: 1 }; });`]],
  [/^a save where the word "([a-z]+)" sits in box (\d+)$/, (m) => [
    `const doc = { version: 3, words: { ${m[1]}: { box: ${N(m[2])}, attempts: 1 } } };`]],
  [/^a save whose log contains one null row$/, () => [
    `const doc = { version: 3, log: [null] };`]],
  [/^the save loads$/, () => [
    `const m = migrate(doc);`]],
  [/^the save loads twice$/, () => [
    `const m = migrate(structuredClone(doc));`,
    `const m2 = migrate(structuredClone(m));`]],
  [/^the player is on level (\d+)$/, (m) => [
    `expect(m.level).toBe(${N(m[1])});`]],
  [/^the log row shows level (\d+)$/, (m) => [
    `expect(m.log[0].level).toBe(${N(m[1])});`]],
  [/^the word data is unchanged$/, () => [
    `expect(JSON.stringify(m.words)).toBe(wordsBefore);`]],
  [/^both results are identical$/, () => [
    `expect(m2).toEqual(m);`]],
  [/^the word "([a-z]+)" sits in box (\d+)$/, (m) => [
    `expect(m.words[${S(m[1])}].box).toBe(${N(m[2])});`]],
  [/^the load does not fail$/, () => [
    `expect(m).toBeTruthy();`]],
  [/^the log has (\d+) rows$/, (m) => [
    `expect(m.log.length).toBe(${N(m[1])});`]],

  // ---- export ----
  [/^a fresh player whose words "([a-z]+)" and "([a-z]+)" sit in box (\d+)$/, (m) => [
    `const s = newState();`,
    `for (const w of [${S(m[1])}, ${S(m[2])}]) s.words[w] = { ...freshWordState(), box: ${N(m[3])}, attempts: 2 };`]],
  [/^a fresh player with one logged session marked as partial$/, () => [
    `const s = newState();`,
    `s.log = [{ n: 1, date: "2026-07-25", level: 1, c: 5, k: 1, w: 0, acc: 83, items: [{ w: "at", r: "correct", retries: 0 }], partial: true }];`]],
  [/^the reader's name is 19 letters followed by the chick emoji$/, () => [
    `const s = newState();`,
    `s.settings.childName = "NNNNNNNNNNNNNNNNNNN\\u{1F423}";`]],
  [/^the log is exported$/, () => [
    `const md = buildMarkdown(s);`]],
  [/^the export contains "(.+)"$/, (m) => [
    `expect(md).toContain(${S(m[1])});`]],
  [/^the export contains the chick emoji$/, () => [
    `expect(md).toContain("\\u{1F423}");`]],
  [/^the export contains no broken character$/, () => [
    `const LONE = /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/;`,
    `expect(LONE.test(md)).toBe(false);`]],
];

const ir = JSON.parse(readFileSync(IR, "utf8"));
const emit = (text, where) => {
  for (const [re, fn] of STEPS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  console.error(`No step definition for: "${text}" (${where})`);
  process.exit(1);
};

const out = [];
out.push(`/* GENERATED by tools/gen-acceptance.mjs from ${IR} — do not edit by hand. */`);
out.push(`import { describe, it, expect } from "vitest";`);
out.push(`import {`);
out.push(`  LEVELS, WORD_LEVEL, TRICKY, chunkWord, dashed, freshWordState, applyResult,`);
out.push(`  buildSession, checkPromotion, migrate, newState, buildMarkdown, feedbackParts,`);
out.push(`} from "../../src/engine.js";`);
out.push(``);

let scenarios = 0, tests = 0;
for (const feature of ir.features) {
  out.push(`describe(${S("Feature: " + feature.name)}, () => {`);
  for (const sc of feature.scenarios) {
    scenarios += 1;
    const rows = sc.outline ? sc.examples : [null];
    for (const row of rows) {
      tests += 1;
      const label = row
        ? `${sc.name} (${Object.entries(row).map(([k, v]) => k + "=" + v).join(", ")})`
        : sc.name;
      out.push(`  it(${S(label)}, () => {`);
      for (const step of sc.steps) {
        const text = row
          ? step.text.replace(/<([^>]+)>/g, (_, k) => row[k])
          : step.text;
        for (const line of emit(text, `${feature.file}: ${sc.name}`)) out.push(`    ${line}`);
      }
      out.push(`  });`);
    }
  }
  out.push(`});`);
  out.push(``);
}

writeFileSync(OUT, out.join("\n"));
console.log(`Wrote ${OUT} (${scenarios} scenarios, ${tests} tests)`);
