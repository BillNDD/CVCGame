/* Acceptance test generator (gate G3). Reads tests/generated/acceptance-ir.json
   and writes tests/generated/acceptance.test.js. Nobody edits the output by
   hand. Every example value from the IR is baked into the emitted code as a
   literal, so the acceptance-mutation gate (G4) can prove each value is read.
   Deterministic: stable ordering, LF endings, no timestamps, no absolute
   paths. An unmatched step is a hard error, never a skip.
   Maintenance constraint (review 2026-09-26): the shared beforeEach installs
   fake timers for the WHOLE generated file, engine scenarios included. Engine
   tests must never call Date or async timer APIs — they would see frozen time.
   Pure algorithmic steps only.
   Journey convention (E7 2026-09-26): the boot verb renders the App once;
   following verbs never render again until `the app restarts fresh` (cleanup
   plus a fresh boot). Setup verbs that repeat in one journey redeclare with
   `var`, never `const`.
   The generated header defines NO speech stub: a dead no-op speechSynthesis
   is WORSE than none (the app waits on an utterance-end that never fires and
   the free-play advance never arms — E2b probe 2026-09-27). Speech-asserting
   unit tests keep their own recording stubs and stay unit. */
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
  [/^the app boots with a fresh seed$/, () => [
    `mockLoad.mockResolvedValueOnce({ version: 6, level: 1, preLevel: 0, prePerfectStreak: 0, sessionsCompleted: 0, perfectStreak: 0, words: {}, log: [], pre: {}, settings: { sound: true, childName: "", lang: "en-US" } });`,
    `render(createElement(App));`,
    `await flush(2001); // owner-ruled 2s minimum splash`]],
  [/^the child's name is entered as "([^"]*)"$/, (m) => [
    `const _nameInput = document.getElementById("wq-name");`,
    `fireEvent.change(_nameInput, { target: { value: ${S(m[1])} } });`,
    `fireEvent.blur(_nameInput);`,
    `await flush(0);`]],
  [/^the committed name has (\d+) glyphs and no cut surrogate$/, (m) => [
    `const _committed = mockSave.mock.calls.at(-1)[0].settings.childName;`,
    `expect(Array.from(_committed).length).toBe(${N(m[1])});`,
    `expect(_committed.endsWith("\\uFFFD")).toBe(false);`]],
  [/^the clipboard allows copying$/, () => [
    `Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });`]],
  [/^the clipboard refuses copying$/, () => [
    `navigator.clipboard.writeText = vi.fn(async () => { throw new Error("denied"); });`]],
  [/^the log copy reports "([^"]*)"$/, (m) => [
    `fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));`,
    `await flush(0);`,
    `expect(screen.getByText(${S(m[1])})).toBeTruthy();`]],
  [/^the fallback box contains "([^"]*)"$/, (m) => [
    `fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));`,
    `await flush(0);`,
    `expect(document.querySelector("textarea.wq-input").value).toContain(${S(m[1])});`]],
  [/^the backup is saved through the blob path$/, () => [
    `let _made = null;`,
    `URL.createObjectURL = vi.fn((blob) => { _made = blob; return "blob:wq-test"; });`,
    `URL.revokeObjectURL = vi.fn();`,
    `fireEvent.click(screen.getByLabelText("Save backup file"));`,
    `await flush(1200);`]],
  [/^one URL is made and revoked carrying '(.+)'$/, (m) => [
    `expect(screen.getByText("Backup file saved.")).toBeTruthy();`,
    `expect(URL.createObjectURL).toHaveBeenCalledTimes(1);`,
    `expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:wq-test");`,
    `expect(await _made.text()).toContain(${S(m[1])});`]],
  [/^the device records "([^"]*)" and "([^"]*)"$/, (m) => [
    `const _errMod = await import("../../app/src/errors.js");`,
    `_errMod.record({ kind: "error", message: ${S(m[1])}, where: "A.js:1", screen: "home", version: "t" });`,
    `_errMod.record({ kind: "rejection", message: ${S(m[2])}, where: "", screen: "session", version: "t" });`]],
  [/^the corner reports "([^"]*)"$/, (m) => [
    `expect(screen.getByText(new RegExp(${S(m[1])}))).toBeTruthy();`]],
  [/^the log copy carries no error text$/, () => [
    `const _written = [];`,
    `Object.assign(navigator, { clipboard: { writeText: vi.fn(async (t) => { _written.push(t); }) } });`,
    `fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));`,
    `await flush(0);`,
    `expect(_written[0]).not.toContain("bug report");`,
    `expect(_written[0]).not.toContain("ring-one");`]],
  [/^the bug report heads "([^"]*)" and promises "([^"]*)"$/, (m) => [
    `fireEvent.click(screen.getByLabelText("Copy bug report"));`,
    `await flush(0);`,
    `expect(_written[1]).toContain(${S(m[1])});`,
    `expect(_written[1]).toContain(${S(m[2])});`]],
  [/^the bug report lists "([^"]*)" and "([^"]*)" and "([^"]*)"$/, (m) => [
    `expect(_written[1]).toContain(${S(m[1])});`,
    `expect(_written[1]).toContain(${S(m[2])});`,
    `expect(_written[1]).toContain(${S(m[3])});`]],
  [/^the first report item precedes the second$/, () => [
    `expect(_written[1].indexOf("1. ")).toBeLessThan(_written[1].indexOf("2. "));`]],
  [/^the ring is cleared to "([^"]*)"$/, (m) => [
    `fireEvent.click(screen.getByText("Clear"));`,
    `await flush(0);`,
    `expect(screen.getByText(new RegExp(${S(m[1])}))).toBeTruthy();`,
    `expect(screen.getByLabelText("Copy bug report").disabled).toBe(true);`]],
  [/^a crashing build screen renders "([^"]*)"$/, (m) => [
    `const _quiet = vi.spyOn(console, "error").mockImplementation(() => {});`,
    `const _eb = await import("../../app/src/components/ErrorBoundary.jsx");`,
    `let _explode = true;`,
    `function _throwingChild() { if (_explode) throw new Error(${S(m[1])}); return createElement("p", null, "alive again"); }`,
    `render(createElement(_eb.default, { screen: () => "build", version: "t" }, createElement(_throwingChild)));`]],
  [/^the way back reads "([^"]*)" for "([^"]*)" and returns to "([^"]*)"$/, (m) => [
    `const _back = screen.getByLabelText(${S(m[1])});`,
    `expect(_back.className).toContain("wq-cta");`,
    `const _readErr = await import("../../app/src/errors.js");`,
    `expect(_readErr.readErrors().map((e) => [e.kind, e.screen, e.message])).toEqual([["render", "build", ${S(m[2])}]]);`,
    `_explode = false;`,
    `fireEvent.click(_back);`,
    `expect(screen.getByText(${S(m[3])})).toBeTruthy();`,
    `_quiet.mockRestore();`]],
  [/^the splash boots$/, () => [
    `render(createElement(App));`]],
  [/^(\d+) ms pass$/, (m) => [
    `await flush(${N(m[1])});`]],
  [/^Begin is hidden and the title art shows$/, () => [
    `expect(screen.queryByLabelText("Begin Session")).toBeNull();`,
    `expect(document.querySelector('[data-wq-art="title-splash"]')).not.toBeNull();`]],
  [/^Begin is shown$/, () => [
    `expect(screen.getByLabelText("Begin Session")).toBeTruthy();`]],
  [/^the splash is tapped$/, () => [
    `fireEvent.click(document.querySelector(".wq-center"));`,
    `await flush(0);`]],
  [/^the storage read hangs$/, () => [
    `var _resolveRead;`,
    `mockLoad.mockImplementation(() => new Promise((resolve) => { _resolveRead = resolve; }));`]],
  [/^the hung read resolves empty$/, () => [
    `_resolveRead(null);`,
    `await flush(0);`]],
  [/^the hung read resolves unreadable$/, () => [
    `_resolveRead({ __unreadable: true });`,
    `await flush(0);`]],
  [/^no save is written$/, () => [
    `expect(mockSave.mock.calls.length).toBe(0);`]],
  [/^the update host answers version "([^"]*)" build "([^"]*)"$/, (m) => [
    `var _fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ version: ${S(m[1])}, build: ${S(m[2])} }) }));`,
    `vi.stubGlobal("fetch", _fetchSpy);`]],
  [/^the update host answers version "([^"]*)" with no build$/, (m) => [
    `var _fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ version: ${S(m[1])} }) }));`,
    `vi.stubGlobal("fetch", _fetchSpy);`]],
  [/^the service worker waits for consent$/, () => [
    `const _posted = [];`,
    `Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { addEventListener: () => {}, removeEventListener: () => {}, getRegistration: async () => ({ update: async () => {}, waiting: { postMessage: (mm) => _posted.push(mm) }, installing: null }) } });`]],
  [/^the service worker only updates$/, () => [
    `const _update = vi.fn(async () => {});`,
    `Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ update: _update }) } });`]],
  [/^the check key is pressed$/, () => [
    `fireEvent.keyDown(screen.getByLabelText("Check for updates"), { key: "Enter" });`,
    `await flush(0);`]],
  [/^the version was asked (\d+) times?$/, (m) => [
    `expect(_fetchSpy.mock.calls.filter(([url]) => url === "version.json").length).toBe(${N(m[1])});`]],
  [/^the request bypasses every cache$/, () => [
    `expect(_fetchSpy).toHaveBeenCalledWith("version.json", { cache: "no-store" });`]],
  [/^Update now is absent$/, () => [
    `expect(screen.queryByLabelText("Update now")).toBeNull();`]],
  [/^Update now is offered$/, () => [
    `expect(screen.queryByLabelText("Update now")).not.toBeNull();`]],
  [/^the child's tap on Update now sends nothing$/, () => [
    `fireEvent.click(screen.getByLabelText("Update now"), { detail: 1 });`,
    `await flush(600);`,
    `expect(_posted).toEqual([]);`]],
  [/^the adult hold sends "([^"]*)"$/, (m) => [
    `fireEvent.keyDown(screen.getByLabelText("Update now"), { key: "Enter" });`,
    `await flush(0);`,
    `expect(_posted).toEqual([${S(m[1])}]);`]],
  [/^the child's tap and short press ask nothing$/, () => [
    `const _btn = screen.getByLabelText("Check for updates");`,
    `fireEvent.click(_btn, { detail: 1 });`,
    `await flush(600);`,
    `fireEvent.pointerDown(_btn);`,
    `await flush(300);`,
    `fireEvent.pointerUp(_btn);`,
    `await flush(600);`]],
  [/^the foreground returns$/, () => [
    `document.dispatchEvent(new Event("visibilitychange"));`,
    `await flush(0);`]],
  [/^the worker updated (\d+) times?$/, (m) => [
    `expect(_update).toHaveBeenCalledTimes(${N(m[1])});`]],
  [/^the update switch is set Off$/, () => [
    `fireEvent.click(screen.getByLabelText("Grown-ups corner"));`,
    `await flush(0);`,
    `fireEvent.click(screen.getByText("Off"));`,
    `await flush(0);`]],
  [/^the session opens on its first word$/, () => [
    `fireEvent.click(screen.getByLabelText("Begin Session"));`,
    `await flush(0);`]],
  [/^the grown-up marks it with Enter$/, () => [
    `fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });`,
    `await flush(0);`]],
  [/^the advance control appears$/, () => [
    `expect(screen.getByText(/Next word|Finish!/)).toBeTruthy();`]],
  [/^the advance control stays absent$/, () => [
    `expect(screen.queryByText(/Next word|Finish!/)).toBeNull();`]],
  [/^the screen reader activates it$/, () => [
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 0 });`,
    `await flush(500);`]],
  [/^a stray touch lands on it$/, () => [
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 1 });`,
    `await flush(500);`]],
  [/^an early release lets go of it$/, () => [
    `fireEvent.pointerDown(screen.getByLabelText("got it"));`,
    `await flush(200);`,
    `fireEvent.pointerUp(screen.getByLabelText("got it"));`,
    `await flush(500);`]],
  [/^a lone hold button is rendered$/, () => [
    `var _fired = { n: 0 };`,
    `render(createElement(HoldButton, { onFire: () => { _fired.n += 1; }, color: "#0f7a4f", label: "✓ got it" }));`]],
  [/^a lone disabled hold button is rendered$/, () => [
    `var _fired = { n: 0 };`,
    `render(createElement(HoldButton, { onFire: () => { _fired.n += 1; }, color: "#0f7a4f", label: "✓ got it", disabled: true }));`]],
  [/^a full hold fires it once$/, () => [
    `fireEvent.pointerDown(screen.getByLabelText("got it"));`,
    `await flush(700);`,
    `fireEvent.pointerUp(screen.getByLabelText("got it"));`,
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 0 });`]],
  [/^it fired (\d+) times?$/, (m) => [
    `expect(_fired.n).toBe(${N(m[1])});`]],
  [/^Enter plus its click fires it again$/, () => [
    `fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });`,
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 0 });`]],
  [/^past the guard window a real second activation counts$/, () => [
    `await flush(1500);`,
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 0 });`]],
  [/^nothing at all fires the disabled one$/, () => [
    `fireEvent.click(screen.getByLabelText("got it"), { detail: 0 });`,
    `fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });`,
    `fireEvent.pointerDown(screen.getByLabelText("got it"));`,
    `await flush(700);`]],
  [/^both result controls are held at once$/, () => [
    `fireEvent.pointerDown(screen.getByLabelText("got it"));`,
    `await flush(10);`,
    `fireEvent.pointerDown(screen.getByLabelText("not yet"));`,
    `await flush(700);`]],
  [/^the early exit counts "([^"]*)"$/, (m) => [
    `fireEvent.click(screen.getByLabelText("Leave session"));`,
    `await flush(0);`,
    `expect(screen.getByText(new RegExp(${S(m[1])}))).toBeTruthy();`]],
  [/^focus falls to the page body$/, () => [
    `expect(document.activeElement).toBe(document.body);`]],
  [/^the reveal wait passes$/, () => [
    `await flush(500);`]],
  [/^the live advance control holds focus$/, () => [
    `const _adv = screen.getByText(/Next word|Finish!/);`,
    `expect(_adv.disabled).toBe(false);`,
    `expect(document.activeElement).toBe(_adv);`]],
  [/^activating the focused control readies the next word$/, () => [
    `fireEvent.click(document.activeElement);`,
    `await flush(0);`,
    `expect(screen.getByLabelText("got it").disabled).toBe(false);`]],
  [/^the grown-up moves focus away mid-wait$/, () => [
    `await flush(100);`,
    `screen.getByLabelText("Leave session").focus();`,
    `await flush(500);`]],
  [/^the control comes alive but their choice stands$/, () => [
    `expect(screen.getByText(/Next word|Finish!/).disabled).toBe(false);`,
    `expect(document.activeElement).toBe(screen.getByLabelText("Leave session"));`]],
  [/^home opens with (\d+) sessions? completed$/, (m) => [
    `mockLoad.mockResolvedValueOnce({ version: 3, level: 1, sessionsCompleted: ${N(m[1])}, perfectStreak: 0, settings: { mode: "mic", sound: true, childName: "", lang: "en-US" }, words: {}, log: [] });`,
    `render(createElement(App));`,
    `await flush(2001);`]],
  [/^one session counts singular$/, () => [
    `expect(screen.getByText(/1 session$/)).toBeTruthy();`,
    `expect(screen.queryByText(/1 sessions$/)).toBe(null);`]],
  [/^two sessions count plural$/, () => [
    `expect(screen.getByText(/2 sessions$/)).toBeTruthy();`,
    `expect(screen.queryByText(/2 session$/)).toBe(null);`]],
  [/^free play is entered through "([^"]*)"$/, (m) => [
    `mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0, level: 1 });`,
    `render(createElement(App));`,
    `await flush(2001);`,
    `fireEvent.click(screen.getByLabelText("Free play"));`,
    `await flush(0);`,
    `fireEvent.click(screen.getByText(new RegExp(${S(m[1])})));`,
    `await flush(0);`]],
  [/^the header counts "([^"]*)"$/, (m) => [
    `expect(screen.getByText(${S(m[1])})).toBeTruthy();`]],
  [/^no block total is shown$/, () => [
    `expect(screen.queryByText(/\\/12|\\/20/)).toBeNull();`]],
  [/^a free-play word is graded "([^"]*)"$/, (m) => [
    `fireEvent.keyDown(screen.getByLabelText(${S(m[1])}), { key: "Enter" });`,
    `await flush(500);`,
    `fireEvent.click(screen.getByText(/Next word/));`,
    `await flush(0);`]],
  [/^the last word is graded "([^"]*)"$/, (m) => [
    `fireEvent.keyDown(screen.getByLabelText(${S(m[1])}), { key: "Enter" });`,
    `await flush(500);`]],
  [/^the last slot still says Next word$/, () => [
    `expect(screen.getByLabelText("Next word")).toBeTruthy();`,
    `expect(screen.queryByText(/Finish!/)).toBeNull();`]],
  [/^the block rolls into a new one$/, () => [
    `fireEvent.click(screen.getByLabelText("Next word"));`,
    `await flush(0);`,
    `expect(document.querySelector(".wq-word")).toBeTruthy();`,
    `expect(screen.queryByText(/Great reading today/)).toBeNull();`]],
  [/^random is pinned high$/, () => [
    `vi.spyOn(Math, "random").mockReturnValue(0.9999999);`]],
  [/^random is pinned to the boundary$/, () => [
    `vi.spyOn(Math, "random").mockReturnValue(0.955);`]],
  [/^the served word is "([^"]*)"$/, (m) => [
    `expect(document.querySelector(".wq-word").textContent).toBe(${S(m[1])});`]],
  [/^the served word is one of Level 1$/, () => [
    `expect(["at", "an", "am", "ax", "in", "it", "if", "is", "on", "ox", "up", "us"]).toContain(document.querySelector(".wq-word").textContent);`]],
  [/^the dice chip names the mode$/, () => [
    `expect(screen.getByLabelText(/random (words|sentences)/)).toBeTruthy();`,
    `expect(screen.queryByText(/\\bLevel 1\\b/)).toBeNull();`]],
  [/^a save window opens$/, () => [
    `var _savesBefore = mockSave.mock.calls.length;`]],
  [/^no save was written in the window$/, () => [
    `expect(mockSave.mock.calls.length).toBe(_savesBefore);`]],
  [/^the pinned block is walked collecting every word$/, () => [
    `var _seen = [];`,
    `for (let _i = 0; _i < 19; _i += 1) {`,
    `  _seen.push(document.querySelector(".wq-word").textContent);`,
    `  fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });`,
    `  await flush(500);`,
    `  fireEvent.click(screen.getByText(/Next word/));`,
    `  await flush(0);`,
    `}`,
    `_seen.push(document.querySelector(".wq-word").textContent);`]],
  [/^the block opens on "([^"]*)" and closes on "([^"]*)" with no repeats$/, (m) => [
    `expect(_seen[0]).toBe(${S(m[1])});`,
    `expect(_seen[19]).toBe(${S(m[2])});`,
    `expect(new Set(_seen).size).toBe(20);`]],
  [/^free play is left straight home$/, () => [
    `fireEvent.click(screen.getByLabelText("Leave session"));`,
    `await flush(0);`,
    `expect(screen.getByLabelText("Begin Session")).toBeTruthy();`,
    `expect(screen.queryByText("Finish early?")).toBeNull();`]],
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
const anyHold = JSON.stringify(ir).includes("hold button");
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
  if (anyHold) out.push(`import HoldButton from "../../app/src/components/HoldButton.jsx";`);
  out.push(`const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });`);
  out.push(`beforeEach(() => {`);
  out.push(`  mockLoad.mockReset();`);
  out.push(`  mockSave.mockClear();`);
  out.push(`  mockSave.mockImplementation(async () => true);`);
  out.push(`  localStorage.clear(); // ring journeys must not leak wq-errors across boots`);
  out.push(`  vi.useFakeTimers();`);
  out.push(`});`);
  out.push(`afterEach(() => {`);
  out.push(`  cleanup();`);
  out.push(`  vi.useRealTimers();`);
  out.push(`  localStorage.clear();`);
  out.push(`  vi.unstubAllGlobals();`);
  out.push(`  vi.restoreAllMocks(); // pinned-random spies must not leak into engine scenarios`);
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
