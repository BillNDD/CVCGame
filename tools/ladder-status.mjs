/* The curriculum redesign's state, measured from the design artefacts rather
   than remembered. A LOOKUP, like blast-radius: it never fails a build and it
   cannot say whether the ladder is RIGHT, only what it currently holds.

   WHY IT EXISTS. Every number in this redesign has been recomputed by hand,
   repeatedly, and got quoted wrong at least three times - a sound bill five
   times too large, an "approved and unshipped" count wrong twice, a passage
   total inflated by sliding windows. A number a person retypes is a number
   this project loses. This prints them from the files that own them.

   It is also the reader that makes tools/ladder/*.json honest data rather than
   orphans (G23 rule 4). That is a consequence, not the purpose: a tool written
   only to satisfy a gate would be exactly the paperwork CLAUDE.md refuses.

   Run: node tools/ladder-status.mjs
        node tools/ladder-status.mjs --self-test */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LADDER = "tools/ladder";

export function load(read = readFileSync) {
  const j = (f) => JSON.parse(read(`${LADDER}/${f}`, "utf8"));
  return { shape: j("shape-v3.json"), ladder: j("ladder-v4.json"),
           bill: j("word-bill.json"), corpus: j("corpus-harvest.json") };
}

/* A level's subject, as the generator can see it: graphemes are written
   grapheme=sound_id and the sound half is the teaching fact. */
export function unitsOf(level) {
  const raw = String(level.new || "").trim();
  if (!raw) return [];
  return raw.split(/[\s,]+/).filter(Boolean).map((t) => {
    const [g, sound] = t.split("=");
    return { grapheme: g.replace(/^-+|-+$/g, ""), sound: sound || null };
  });
}

export function report(d) {
  const levels = Array.isArray(d.shape) ? d.shape : d.shape.levels;
  const byN = new Map(d.ladder.map((l) => [l.n, l]));
  const out = { levels: levels.length, placed: 0, empty: [], thin: [],
                noSubject: [], bare: [], billLevels: Object.keys(d.bill).length,
                billWords: 0, singles: 0, passages: 0 };
  for (const l of d.ladder) out.placed += (l.words || []).length;
  for (const ws of Object.values(d.bill)) out.billWords += ws.length;
  out.singles = (d.corpus.singles || []).length;
  out.passages = (d.corpus.passages || []).length;
  for (const lv of levels) {
    const words = (byN.get(lv.n) || {}).words || [];
    if (!words.length) out.empty.push(lv.n);
    else if (words.length < 6) out.thin.push(`${lv.n}(${words.length})`);
    const units = unitsOf(lv);
    if (!units.length && !lv.rule) out.noSubject.push(lv.n);
    for (const u of units) if (!u.sound) out.bare.push(`${lv.n}:${u.grapheme}`);
  }
  return out;
}

/* The main-module guard. A Windows path needs pathToFileURL, not string
   surgery: the hand-rolled version matched nothing, so the whole file ran as a
   no-op and its self-test printed success by printing nothing at all. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--self-test")) {
    const say = [];
    const T = (n, p) => say.push([n, p]);
    const fake = {
      shape: [{ n: 1, new: "s=s a=short_a", rule: "" }, { n: 2, new: "", rule: "swap1" },
              { n: 3, new: "ea", rule: "" }, { n: 4, new: "", rule: "" }],
      ladder: [{ n: 1, words: ["a", "b", "c", "d", "e", "f"] }, { n: 2, words: ["g", "h"] },
               { n: 3, words: [] }, { n: 4, words: ["i", "j", "k", "l", "m", "n"] }],
      bill: { "9": ["x", "y"] }, corpus: { singles: [1, 2, 3], passages: [1] },
    };
    const r = report(fake);
    T("counts every placed word", r.placed === 14);
    T("an empty level is named", r.empty.length === 1 && r.empty[0] === 3);
    T("a thin level is named with its count", r.thin.length === 1 && r.thin[0] === "2(2)");
    T("a level with neither grapheme nor rule is named", r.noSubject.join() === "4");
    T("a level with a rule and no grapheme is NOT called subjectless",
      !r.noSubject.includes(2));
    T("a grapheme with no sound is named", r.bare.join() === "3:ea");
    T("a grapheme WITH a sound is not named", !r.bare.some((b) => b.includes("s=")));
    T("the bill and corpus are counted", r.billWords === 2 && r.singles === 3 && r.passages === 1);
    /* The control every detector here ships with (E5): a reporter that always
       says nothing must fail this suite, or the suite proves nothing. */
    const blind = { levels: 0, placed: 0, empty: [], thin: [], noSubject: [], bare: [],
                    billLevels: 0, billWords: 0, singles: 0, passages: 0 };
    T("control: a reporter that always says nothing answers 0 of the 6 planted facts",
      [blind.placed === 14, blind.empty.length === 1, blind.thin.length === 1,
       blind.noSubject.join() === "4", blind.bare.join() === "3:ea",
       blind.billWords === 2].filter(Boolean).length === 0);
    const failed = say.filter(([, p]) => !p).length;
    for (const [n, p] of say) console.log((p ? "ok   " : "FAIL ") + n);
    console.log(`\nladder-status controls: ${say.length - failed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
  const r = report(load());
  console.log(`Ladder: ${r.levels} levels, ${r.placed} words placed`);
  console.log(`  empty levels          : ${r.empty.length}${r.empty.length ? " -> " + r.empty.join(" ") : ""}`);
  console.log(`  under six words       : ${r.thin.length}${r.thin.length ? " -> " + r.thin.join(" ") : ""}`);
  console.log(`  no grapheme and no rule: ${r.noSubject.length}${r.noSubject.length ? " -> " + r.noSubject.join(" ") : ""}`);
  console.log(`  graphemes with no sound: ${r.bare.length}${r.bare.length ? " -> " + r.bare.join(" ") : ""}`);
  console.log(`Word bill: ${r.billWords} candidates across ${r.billLevels} levels`);
  console.log(`Corpus   : ${r.singles} single sentences, ${r.passages} contiguous passages`);
  console.log(`\nA LOOKUP, not a gate. It says what the ladder holds, never whether it is right.`);
}
