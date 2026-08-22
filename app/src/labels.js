/* THE PLAIN NAME OF A CONTROL - what a screen reader is told.
 *
 * Art project step 0a (owner-ruled 2026-08-22, amended by the council). A
 * child's controls carry an emoji in their visible text - "▶️ Begin Session",
 * "🎈 Free play" - and until today that emoji was the start of the accessible
 * name too, so a screen reader said "black right-pointing triangle Begin
 * Session". The adult holds were worse: their names ended "(hold)", a word
 * about the pointer, to the one kind of user who never holds (S5: the
 * keyboard and assistive technology operate them directly).
 *
 * plainLabel() strips every pictograph, symbol and the hold suffix and leaves
 * the words: "Begin Session", "got it", "Check for updates". The visible
 * text is untouched; only the aria-label is built from this. Every test and
 * tool locator names a control by this plain name, and tools/locator-scan.mjs
 * refuses a locator that names an emoji, so the coming icon swap (the second
 * half of the icons ruling) cannot break a locator.
 */
const PICTOGRAPHS = /[←-⇿⌀-⏿■-➿⬀-⯿\u{1F000}-\u{1FAFF}️‍~]/gu;

export function plainLabel(text) {
  return String(text ?? "")
    .replace(/\(hold\)/g, "")
    .replace(PICTOGRAPHS, "")
    .replace(/\s+/g, " ")
    .trim();
}
