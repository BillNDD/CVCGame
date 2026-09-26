/* Acceptance test generator (gate G3). Reads tests/generated/acceptance-ir.json
   and writes tests/generated/acceptance.test.js. Nobody edits the output by
   hand. Every example value from the IR is baked into the emitted code as a
   literal, so the acceptance-mutation gate (G4) can prove each value is read.
   Deterministic: stable ordering, LF endings, no timestamps, no absolute
   paths. An unmatched step is a hard error, never a skip.
   Maintenance constraint (review 2026-09-26): the shared beforeEach installs
   fake timers for the WHOLE generated file, engine scenarios included. Engine
   tests must never call Date or async timer APIs — they would see frozen time.
   Pure algorithmic steps only. */
import { readFileSync, writeFileSync } from "node:fs";

const IR = "tests/generated/acceptance-ir.json";
const OUT = "tests/generated/acceptance.test.js";
const S = (v) => JSON.stringify(v); // JS string/number literal
const N = (v) => String(Number(v));

/* Each entry: regex over the step text -> lines of code. The generator, not
   the runner, resolves the mapping, so the output is plain Vitest. */
/** @type {Array<[RegExp, (m: RegExpMatchArray) => string[]]>} */
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

/* ---- App-DOM steps (E2E journeys, Wave 1+). Only used by features/app-*.feature.
   Every regex here is namespaced away from the engine STEPS above ("the app boots",
   "the grown-ups corner", "the hostile file", ...): the emitter tries STEPS_APP
   first for app features, engine STEPS second, and an unmatched step is a hard
   error either way. Values from the IR are baked as literals (G4 rule). The _wK /
   _fileK suffixes come from a module-level counter incremented in emission order,
   so output is deterministic. */
let appSeq = 0, lastW = null;
const STEPS_APP = [
  [/^the app boots with a level (\d+) save$/, (m) => [
    `mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0, level: ${N(m[1])} });`,
    `render(createElement(App));`,
    `await flush(2001); // owner-ruled 2s minimum splash`]],
  [/^the grown-ups corner is opened$/, () => [
    `fireEvent.click(screen.getByLabelText("Grown-ups corner"));`,
    `await flush(0);`,
    `expect(document.querySelector('input[type="file"]')).toBeTruthy();`]],
  [/^the hostile file (.+) is imported$/, (m) => {
    const k = appSeq++; lastW = `_w${k}`;
    return [
      `const ${lastW} = mockSave.mock.calls.length;`,
      `const _file${k} = new File([${S(m[1])}], "b.json", { type: "application/json" });`,
      `Object.defineProperty(_file${k}, "text", { value: async () => ${S(m[1])} });`,
      `await act(async () => { fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [_file${k}] } }); });`,
      `await flush(0);`]; }],
  [/^the app reports "([^"]*)"$/, (m) => [
    `expect(screen.getByText(${S(m[1])})).toBeTruthy();`]],
  [/^no new save leaves level (\d+)$/, (m) => [
    `expect(mockSave.mock.calls.slice(${lastW}).some((c) => c[0].level !== ${N(m[1])})).toBe(false);`,
    `expect(mockSave.mock.calls.at(-1)[0].level).toBe(${N(m[1])});`]],
  [/^the save-shaped array is refused and the genuine one passes$/, () => [
    `const _shaped = Object.assign([], { version: 3, level: 5, words: {}, settings: { mode: "parent" } });`,
    `expect(isBackup(_shaped)).toBe(false);`,
    `expect(isBackup({ version: 3, level: 5, words: {}, settings: { mode: "parent" } })).toBe(true);`]],
  [/^the app restarts fresh$/, () => [
    `cleanup(); mockSave.mockClear(); mockLoad.mockReset();`,
    `mockSave.mockImplementation(async () => true);`]],
  [/^a genuine level (\d+) backup is imported$/, (m) => {
    const k = appSeq++;
    return [
      `const _gen${k} = JSON.stringify({ ...newState(), level: ${N(m[1])}, version: 4 });`,
      `const _gfile${k} = new File([_gen${k}], "b.json", { type: "application/json" });`,
      `Object.defineProperty(_gfile${k}, "text", { value: async () => _gen${k} });`,
      `await act(async () => { fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [_gfile${k}] } }); });`,
      `await flush(0);`]; }],
  [/^the backup loads and the level is (\d+)$/, (m) => [
    `expect(screen.getByText("Backup loaded.")).toBeTruthy();`,
    `expect(mockSave.mock.calls.at(-1)[0].level).toBe(${N(m[1])});`]],
  [/^the Load backup button is pressed from the keyboard$/, () => [
    `const _input = document.querySelector('input[type="file"]');`,
    `const _clicks = vi.spyOn(_input, "click").mockImplementation(() => {});`,
    `const _button = screen.getByLabelText("Load backup file");`,
    `expect(_button.tagName).toBe("BUTTON");`,
    `fireEvent.keyDown(_button, { key: "Enter" });`,
    `fireEvent.click(_button);`]],
  [/^the picker opens exactly (\d+) time$/, (m) => [
    `expect(_clicks).toHaveBeenCalledTimes(${N(m[1])});`]],
  [/^the hidden input has aria-hidden "([^"]*)" and tab index (-?\d+)$/, (m) => [
    `expect(_input.getAttribute("aria-hidden")).toBe(${S(m[1])});`,
    `expect(_input.tabIndex).toBe(${m[2]});`]],
];

const ir = JSON.parse(readFileSync(IR, "utf8"));
const emit = (text, where, table) => {
  for (const [re, fn] of table) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  console.error(`No step definition for: "${text}" (${where})`);
  process.exit(1);
};

const isAppFeature = (f) => f.file.startsWith("features/app-");
const anyApp = ir.features.some(isAppFeature);
const out = [];
out.push(`/* GENERATED by tools/gen-acceptance.mjs from ${IR} — do not edit by hand. */`);
if (anyApp) out.push(`/* @vitest-environment jsdom */`);
out.push(`import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";`);
out.push(`import {`);
out.push(`  LEVELS, WORD_LEVEL, TRICKY, chunkWord, dashed, freshWordState, applyResult,`);
out.push(`  buildSession, checkPromotion, migrate, newState, buildMarkdown, feedbackParts,`);
out.push(`} from "../../src/engine.js";`);
if (anyApp) {
  out.push(`import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";`);
  out.push(`import { createElement } from "react";`);
  out.push(`import App, { isBackup } from "../../app/src/App.jsx";`);
  out.push(`vi.mock("../../app/src/storage.js", () => ({`);
  out.push(`  loadState: vi.fn(),`);
  out.push(`  saveState: vi.fn(async () => true),`);
  out.push(`}));`);
  out.push(`import { loadState as mockLoad, saveState as mockSave } from "../../app/src/storage.js";`);
  out.push(`const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });`);
  out.push(`beforeEach(() => {`);
  out.push(`  mockLoad.mockReset();`);
  out.push(`  mockSave.mockClear();`);
  out.push(`  mockSave.mockImplementation(async () => true);`);
  out.push(`  vi.useFakeTimers();`);
  out.push(`});`);
  out.push(`afterEach(() => {`);
  out.push(`  cleanup();`);
  out.push(`  vi.useRealTimers();`);
  out.push(`  vi.unstubAllGlobals();`);
  out.push(`});`);
}
out.push(``);

let scenarios = 0, tests = 0;
for (const feature of ir.features) {
  const app = isAppFeature(feature);
  const table = app ? STEPS_APP.concat(STEPS) : STEPS;
  out.push(`describe(${S("Feature: " + feature.name)}, () => {`);
  for (const sc of feature.scenarios) {
    scenarios += 1;
    const rows = sc.outline ? sc.examples : [null];
    for (const row of rows) {
      tests += 1;
      const label = row
        ? `${sc.name} (${Object.entries(row).map(([k, v]) => k + "=" + v).join(", ")})`
        : sc.name;
      out.push(app ? `  it(${S(label)}, async () => {` : `  it(${S(label)}, () => {`);
      for (const step of sc.steps) {
        const text = row
          ? step.text.replace(/<([^>]+)>/g, (_, k) => row[k])
          : step.text;
        for (const line of emit(text, `${feature.file}: ${sc.name}`, table)) out.push(`    ${line}`);
      }
      out.push(`  });`);
    }
  }
  out.push(`});`);
  out.push(``);
}

writeFileSync(OUT, out.join("\n"));
console.log(`Wrote ${OUT} (${scenarios} scenarios, ${tests} tests)`);
