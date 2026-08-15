/* Does the PROSE agree with the LEDGERS about what a person has approved?
 *
 * `tools/doc-truth.mjs` binds documents to the CODE — counts, level rows, copy
 * strings. It reads twelve files and `tools/pending-sounds/pending-sounds.json`
 * is not one of them. So a sentence could claim a sound was unheard while the
 * owner's verdict for that exact sound sat one directory away, and nothing
 * anywhere would notice.
 *
 * IT HAPPENED. On 2026-08-13 three documents said `d:long_o` "has never been
 * rendered or heard by anyone". The owner graded it **perfect** on 2026-08-10
 * in sound round SND5; the clip is on disk and its sha256 matches its record.
 * Three approved words — go, no, so — were described as blocked on a listening
 * round that had already happened, and the claim reached a published release
 * note. The owner found it by remembering, which is the one mechanism this
 * repository exists to replace.
 *
 * The direction matters. A sound shipping that nobody approved is the danger
 * everyone watches for, and it has never happened. This is the opposite fault
 * and it is quieter: an approval that exists and is not believed. Nothing goes
 * red, no child hears anything wrong, and the work simply does not get done.
 *
 * FIVE RULES:
 *   1. No document may call a sound unheard when a ledger says it was heard.
 *   2. Every sound that SHIPS carries an approval in a ledger.
 *   3. The two sound ledgers may not contradict each other about approval.
 *   4. A sound the documents call parked or waiting must genuinely not ship.
 *   5. A shipping sound may not rest on the ARCHIVE ledger alone. See the note
 *      above `ARCHIVED`: `tools/voice-sounds.csv` is not a second ledger of the
 *      shipping voice, it is the record of a superseded recording pipeline, and
 *      rule 2 accepts either ledger — so without this a clip could ship on the
 *      authority of a row describing audio that is not the audio playing.
 *
 * Usage:
 *   node tools/ledger-truth.mjs              check
 *   node tools/ledger-truth.mjs --self-test  prove each rule catches its fault
 */
import { readFileSync } from "node:fs";

const SOURCES = [
  "SPEC.md", "CLAUDE.md", "AGENTS.md", "README.md", "CHANGELOG.md",
  "docs/open-faults.md", "docs/settled.md", "docs/voice-pack.md",
  "docs/testing-gauntlet.md", "docs/qa-procedure.md",
  "tools/decodable.mjs",
];

/* THE PHRASES THAT MAKE A CLAIM ABOUT A PERSON'S EAR. Deliberately narrow.
   A wide list would catch "long_o did not come back, because nothing needed
   it" — a true sentence about SHIPPING, not about hearing — and a gate that
   cries wolf is a gate somebody switches off. Each of these asserts that no
   listener has judged the thing. */
export const UNHEARD = [
  /\bnever been (?:rendered|heard)\b/i,
  /\bnever (?:rendered|heard) (?:or heard )?by anyone\b/i,
  /\bnobody has (?:ever )?heard\b/i,
  /\bno one has (?:ever )?heard\b/i,
  /\bhas not been heard\b/i,
  /\bthe owner has not heard\b/i,
  /\bnobody has approved\b/i,
  /\bnobody has judged\b/i,
  /\bhas never been (?:rendered|heard|approved|graded)\b/i,
];
/* And the phrases that claim a sound is still waiting rather than in the pack.
   True for a parked sound, false the moment one ships. */
export const PARKED = [
  /\bis parked\b/i, /\bstill parked\b/i, /\bwaits? (?:here )?for a listening round\b/i,
];

export const approved = (v) => /perfect|good|\bok\b|accepted|marginal/i.test(String(v || ""));

/* A CSV row, split on commas that are NOT inside quotes.

   The first version of this used `line.split(",")`, and its own first run
   caught it: `oo_moon`'s as_in cell is "moon, food, boot", so every column
   after it shifted and the gate read the wrong cell as the verdict. It then
   reported a contradiction that did not exist — and, worse, would have read
   garbage as an approval for any row with a comma in it. A gate that
   mis-parses its evidence is a gate that lies confidently. */
export function cells(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/* The CSV reduced to the two cells the rules read, as its OWN function so a
   fixture can prove it. That is not style: on 2026-08-14 rule 5 was written
   with four controls, and deleting the line that captures `source` left all
   four green — every one of them handed the field in by fixture, so not one
   reached the code that reads it. Rule 5 would then have been dead against
   real data while its controls said it worked. The same shape had already been
   found twice that day, in `tools/free-port.mjs`. A reader that no control
   reaches is a reader that can be deleted. */
export function csvRows(text) {
  const rows = text.trim().split("\n");
  const head = cells(rows[0]);
  const iName = head.indexOf("sound"), iVer = head.indexOf("verdict"), iSrc = head.indexOf("source");
  const out = {};
  for (const line of rows.slice(1)) {
    const c = cells(line);
    if (c[iName]) out[c[iName]] = { verdict: c[iVer] || "", source: c[iSrc] || "" };
  }
  return out;
}

export function ledgers() {
  const js = JSON.parse(readFileSync("tools/pending-sounds/pending-sounds.json", "utf8"));
  const csv = csvRows(readFileSync("tools/voice-sounds.csv", "utf8"));
  const sounds = {};
  for (const [k, v] of Object.entries(js)) {
    if (k.startsWith("_") || typeof v !== "object" || v === null) continue;
    sounds[k] = { json: String(v.verdict || ""), round: v.round || "", csv: csv[k]?.verdict, csvSource: csv[k]?.source };
  }
  for (const k of Object.keys(csv)) if (!sounds[k]) sounds[k] = { json: "", round: "", csv: csv[k].verdict, csvSource: csv[k].source };
  return sounds;
}

/* WHAT `tools/voice-sounds.csv` IS, decided 2026-08-14 after measuring it.
   It is NOT a second ledger of the shipping voice. 26 of its 38 rows are
   sourced `superseded_by_synthesis` and say so in their own notes: they record
   cuts from recordings of the OWNER'S OWN VOICE, which the owner ruled on
   2026-08-11 would never ship, and whose source files are no longer in the
   repository. Of the 32 sounds both files name, exactly ONE shares a sha256.
   That is not two ledgers drifting; it is one archive and one live ledger.

   It was kept rather than deleted (deleting lowers E6 floors and destroys the
   only record of how those clips were made — B11 is what that costs) and
   rather than renamed (14 of its 20 references live in `docs/settled.md` and
   `docs/voice-pack.md`, which are declared LOGS, and in render scripts whose
   history must not be rewritten). What was missing was never the name. It was
   that nothing STOPPED a reader treating an archive row as the record of what
   ships — the trap `docs/settled.md` already records somebody falling into,
   which "turned a clip the owner had passed into a clip the owner had merely
   tolerated". Rule 5 is that stop. */
const ARCHIVED = "superseded_by_synthesis";

/* Markdown wraps a sentence over several lines, so paragraphs are joined
   before the split. Without that, "never been rendered or heard by\nanyone"
   is two half-sentences and the sound name falls outside both. */
export function sentences(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .flatMap((para) => para.replace(/\n/g, " ").split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Which sounds a sentence names. Every form the repository uses: the bare key,
   the clip id, and the file name — because a claim written as "d-long_o.mp3
   does not ship" names the sound just as surely as "long_o" does.

   A SHORT NAME MUST BE WRITTEN UNAMBIGUOUSLY, and this is not fussiness. Ten
   of the sounds are named by one or two letters — a, d, o, or, s, t, p, k, j,
   f — and a bare match on those turns ordinary English into a sound mention.
   The first run of this gate reported that "The sound has never been rendered
   OR heard by anyone" named the sound `or`, and that the article "a" named the
   schwa. So a name of three characters or fewer counts only when it is written
   as a clip id, a file name, or in backticks: `d:a`, `d-a.mp3`, `` `a` ``.
   Longer names are distinctive enough to stand bare. */
const SHORT = 3;
export function named(sentence, keys) {
  return keys.filter((k) => {
    if (sentence.includes(`d-${k}.mp3`) || sentence.includes(`s-${k}.mp3`)) return true;
    if (new RegExp(`d:${k}([^A-Za-z0-9_]|$)`).test(sentence)) return true;
    if (new RegExp("`" + k + "`").test(sentence)) return true;
    if (k.length <= SHORT) return false;
    return new RegExp(`(^|[^A-Za-z0-9_])${k}(\\.mp3)?([^A-Za-z0-9_]|$)`).test(sentence);
  });
}

export function check(sounds, texts, packIds) {
  const problems = [];
  const keys = Object.keys(sounds).sort((a, b) => b.length - a.length);
  const isApproved = (k) => approved(sounds[k].json) || approved(sounds[k].csv);

  /* 1 — a document may not call a sound unheard when a ledger heard it. */
  for (const [file, text] of Object.entries(texts)) {
    for (const s of sentences(text)) {
      if (!UNHEARD.some((re) => re.test(s))) continue;
      for (const k of named(s, keys)) {
        if (isApproved(k)) {
          const where = approved(sounds[k].json) ? "pending-sounds.json" : "voice-sounds.csv";
          const v = approved(sounds[k].json) ? sounds[k].json : sounds[k].csv;
          problems.push(`${file}: says "${k}" is unheard, but ${where} records "${v}"${sounds[k].round ? ` (${sounds[k].round})` : ""} — "${s.slice(0, 90)}…"`);
        }
      }
    }
  }
  /* 2 — every shipping sound carries an approval. The dangerous direction. */
  for (const id of packIds) {
    const k = id.slice(2);
    if (!sounds[k]) problems.push(`${id} ships and is in no sound ledger at all`);
    else if (!isApproved(k)) problems.push(`${id} ships with no recorded approval (json="${sounds[k].json}", csv="${sounds[k].csv ?? "no row"}")`);
  }
  /* 3 — the two ledgers may not contradict each other. A row that EXISTS and
     records no approval, for a sound the other ledger approved, is how a
     reader is told the opposite of the truth. A MISSING row is rule 4's
     business, not a contradiction. */
  for (const k of Object.keys(sounds)) {
    const { json, csv } = sounds[k];
    if (csv === undefined) continue;
    if (approved(json) && csv.trim() === "")
      problems.push(`the two sound ledgers disagree about "${k}": pending-sounds.json says "${json}", voice-sounds.csv has a row with no verdict`);
  }
  /* 5 — A SHIPPING SOUND MAY NOT REST ON THE ARCHIVE ALONE. Rule 2 accepts an
     approval from EITHER ledger, and that is the door this rule closes: a
     clip could ship carrying only the blessing of a row that describes a
     recording which no longer exists and whose bytes are not the bytes
     playing. Nobody would see it, because the row looks exactly like a live
     one — it has a verdict, a byte pin and a full recipe.

     True today for all 38 shipping sounds, measured 2026-08-14: every one is
     approved in `pending-sounds.json`. So this guards a regression rather than
     reporting a fault, which is precisely when a guard is worth writing — the
     day someone ships a sound on an archive row is the day nobody is looking. */
  for (const id of packIds) {
    const k = id.slice(2);
    const s = sounds[k];
    if (!s || !approved(s.csv) || approved(s.json)) continue;
    if (s.csvSource === ARCHIVED)
      problems.push(`${id} ships approved only by voice-sounds.csv, whose row is sourced "${ARCHIVED}" — an archive of a recording that no longer ships. The live approval belongs in pending-sounds.json.`);
  }
  /* 4 — a sound the documents call parked must genuinely not ship. */
  const ships = new Set(packIds.map((id) => id.slice(2)));
  for (const [file, text] of Object.entries(texts)) {
    for (const s of sentences(text)) {
      if (!PARKED.some((re) => re.test(s))) continue;
      for (const k of named(s, keys)) {
        if (ships.has(k)) problems.push(`${file}: calls "${k}" parked or waiting, but it ships in the pack — "${s.slice(0, 90)}…"`);
      }
    }
  }
  return problems;
}

const readAll = () => Object.fromEntries(SOURCES.map((f) => [f, readFileSync(f, "utf8")]));
const packSounds = () =>
  Object.keys(JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8"))).filter((k) => k.startsWith("d:"));

if (process.argv.includes("--self-test")) {
  let failed = 0;
  const say = (ok, name) => { console.log((ok ? "ok   " : "FAIL ") + name); if (!ok) failed += 1; };
  /* A fixture, not the shipped data: a control that can only run against
     today's tree is a control that passes for whatever reason it likes (E5). */
  /* The fixture names are REALISTIC sound names on purpose. The first draft
     called them "heard" and "unheard", and a control caught it: the sentence
     "…rendered or heard by anyone" contains the standalone word "heard", so
     the fixture sound was named by the very phrase that makes the claim. A
     fixture whose names collide with the vocabulary under test proves nothing
     about real data. */
  const fix = {
    long_z: { json: "perfect (owner)", round: "SND5 (2026-08-10)", csv: undefined },
    long_q: { json: "", round: "", csv: undefined },
  };
  const P = (t) => check(fix, { "f.md": t }, []);

  say(P("The sound `long_z` has never been rendered or heard by anyone, so seating go means a listening round first.").length === 1,
    "rule 1: the exact shape of the sentence that shipped the fault is caught");
  say(P("Its vowel needs `d:long_z`, which nobody has ever heard.").length === 1,
    "rule 1: a second phrasing of the same claim is caught");
  say(P("d-long_z.mp3 does not ship, and the sound has never been heard.").length === 1,
    "rule 1: the claim is caught when the sound is named by its FILE");
  say(P("The sound `long_q` has never been rendered or heard by anyone.").length === 0,
    "rule 1 control: the same claim about a genuinely unapproved sound passes");
  say(P("long_i and oo_moon came back the same day, and long_z did not, because nothing needed it.").length === 0,
    "rule 1 control: a true sentence about SHIPPING is not mistaken for a claim about hearing");
  say(P("The long_z clip is 1010 ms and was cut from its own word.").length === 0,
    "rule 1 control: naming an approved sound without any claim passes");

  say(check(fix, {}, ["d:long_z"]).length === 0, "rule 2: an approved shipping sound passes");
  say(check(fix, {}, ["d:long_q"]).length === 1, "rule 2: a shipping sound with no approval is caught");
  say(check(fix, {}, ["d:ghost"]).length === 1, "rule 2: a shipping sound in no ledger at all is caught");

  say(check({ x: { json: "perfect (owner)", csv: "" } }, {}, []).length === 1,
    "rule 3: a CSV row that records no verdict for an approved sound is caught");
  say(check({ x: { json: "perfect (owner)", csv: "accepted" } }, {}, []).length === 0,
    "rule 3 control: two ledgers that agree pass, whatever words they use");
  say(check({ x: { json: "perfect (owner)" } }, {}, []).length === 0,
    "rule 3 control: a MISSING row is not a contradiction");

  say(check(fix, { "f.md": "`long_z` is parked until a level needs it." }, ["d:long_z"]).length === 1,
    "rule 4: a sound called parked while it ships is caught");
  say(check(fix, { "f.md": "`long_z` is parked until a level needs it." }, []).length === 0,
    "rule 4 control: a genuinely parked sound passes");

  /* Rule 5. The fixtures differ ONLY in `csvSource`, which is the whole claim:
     the same verdict, on the same shipping sound, is trustworthy from a live
     row and is not from an archive row. Rule 2 passes all three of these — it
     accepts either ledger — so anything these catch, rule 5 caught. */
  say(check({ long_z: { json: "", csv: "ok", csvSource: "superseded_by_synthesis" } }, {}, ["d:long_z"]).length === 1,
    "rule 5: a sound shipping on an ARCHIVE row alone is caught");
  say(check({ long_z: { json: "", csv: "ok", csvSource: "kokoro" } }, {}, ["d:long_z"]).length === 0,
    "rule 5 control: the same verdict from a LIVE csv row passes");
  say(check({ long_z: { json: "perfect (owner)", csv: "ok", csvSource: "superseded_by_synthesis" } }, {}, ["d:long_z"]).length === 0,
    "rule 5 control: an archive row is harmless when the live ledger approves too");
  say(check({ long_z: { json: "", csv: "", csvSource: "superseded_by_synthesis" } }, {}, ["d:long_z"]).length === 1,
    "rule 5 control: an UNAPPROVED archive row is rule 2's catch, and is still caught");

  /* And the READER itself, on a fixture. Every control above supplies
     `csvSource` by hand, so all four survived the capture being deleted. These
     are the ones that fail when the CSV stops being read properly — the join
     between the rule and the file it judges. */
  const FIX_CSV = 'sound,ipa,source,verdict\nlong_z,z,superseded_by_synthesis,ok\nlong_y,y,kokoro,perfect (owner)';
  say(csvRows(FIX_CSV).long_z.source === "superseded_by_synthesis",
    "the reader captures a row's SOURCE, which rule 5 is decided on");
  say(csvRows(FIX_CSV).long_z.verdict === "ok",
    "the reader captures a row's VERDICT from the same row");
  say(csvRows(FIX_CSV).long_y.source === "kokoro",
    "the reader keeps each row's source distinct, not the first one for all");
  say(csvRows('sound,verdict\nlong_z,ok').long_z.source === "",
    "a CSV with no source column reads as no source, never as undefined");

  say(sentences("a\nb. c\n\nd").length === 3, "markdown wrapped over lines is joined before splitting");
  say(named("the d:long_o clip", ["long_o"]).includes("long_o"), "a clip id names its sound");
  say(!named("along_oh", ["long_o"]).length, "a sound name inside another word is not a mention");
  /* The CSV parser, and the exact row that caught it. A naive split on commas
     shifts every column after a quoted cell that contains one. */
  say(cells('oo_moon,u,o ou,"moon, food, boot",vowel,kokoro,,yes,perfect (owner)')[8] === "perfect (owner)",
    "a quoted cell containing a comma does not shift the columns after it");
  say(cells("a,b,c")[1] === "b", "a plain row still splits");
  say(cells('a,"b""c",d')[1] === 'b"c', "an escaped quote inside a quoted cell survives");
  /* The false positives the first real run produced, each now a control. */
  say(!named("never been rendered or heard by anyone", ["or"]).length,
    "short names: the word \"or\" in a sentence is not the sound `or`");
  say(!named("so seating a word means a round", ["a"]).length,
    "short names: the article \"a\" is not the schwa");
  say(!named("the d:long_o clip", ["d"]).length,
    "short names: the d of a clip id is not the sound `d`");
  say(named("the sound `a` says a schwa", ["a"]).includes("a"),
    "short names control: written in backticks, a short name IS a mention");
  say(named("d-a.mp3 does not ship", ["a"]).includes("a"),
    "short names control: written as a file, a short name IS a mention");

  console.log(`\nledger-truth controls: ${33 - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const problems = check(ledgers(), readAll(), packSounds());
problems.forEach((p) => console.log("  PROBLEM: " + p));
const n = Object.keys(ledgers()).length;
console.log(`Ledger truth: ${n} sounds, ${SOURCES.length} documents, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
