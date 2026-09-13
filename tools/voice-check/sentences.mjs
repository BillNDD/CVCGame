/* G13, rules 7 and 8: a word the synthesiser reads wrongly from spelling
   must be carried, pinned or given as sounds; and a sentence carrying a word
   with two pronunciations must be settled by phonemes, by a graded say row
   whose bytes shipped, or by a byte pin the owner heard. The word lists, the
   respellings and the pin are this gate's oracle. */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/* Two-letter words are read wrongly from spelling. Every one of them must be
   rendered from an approved pronunciation, cut out of an approved carrier
   sentence (which never reads the bare spelling), or byte-pinned to audio a
   person heard - a pinned clip is never re-rendered, and the renderer
   hard-stops if it goes missing. The uplift pass (2026-08-07) moved all
   twelve to carrier cuts or pins; a future two-letter word with none of the
   three still trips this. */
export function checkShortWords(script, r, keeperBytes) {
  const short = script.filter((c) => c.id.startsWith("w:") && c.id.length === 4).map((c) => c.id.slice(2));
  const covered = new Set([...(r.phoneme_words || []),
    ...Object.keys(r.carrier_cut || {}), ...Object.keys(r.asr_pinned || {}),
    ...Object.keys(keeperBytes)]);
  return short.filter((w) => !covered.has(w)).map((w) => `two-letter word rendered from spelling: ${w}`);
}

/* A sentence can teach the wrong sound too. "You read that word all by
   yourself!" was spoken with "read" in the present tense, to a child who had
   just read the word. Any sentence containing a word whose spelling carries
   two pronunciations must be given as sounds, never left to the synthesiser.
   The list of such words is read from the sentences themselves, so a new
   sentence is covered from the moment it is added. */
const AMBIGUOUS = ["read", "live", "wind", "tear", "lead", "bow", "row", "close"];
/* Three proofs settle an ambiguous sentence, and a sentence with none of
   them is refused. (1) It was rendered from explicit phonemes
   (phoneme_sentences - how soundout-1 shipped). (2) The take ledger records
   a `say` respelling: the voice was given the disambiguated text, the child
   sees the true text, and the shipped bytes hash to what the listener graded
   - the SAY/SHOW split of 2026-08-19, when the owner refused three takes
   that said /riːd/ for a past-tense "read". The legal respellings are typed
   here from that renderer's own table; a say that leaves the ambiguous word
   unchanged proves nothing and is refused. (3) The take is byte-pinned
   below: rendered before the say mechanism existed, graded by the owner in a
   round held the same day he was refusing wrong "read"s, and never
   re-rendered - the exact shape of the keeper bytes for words. Bytes that
   drift from a pin are refused. */
const HOMOGRAPH_SAY = { read: ["red", "reed"], live: ["liv", "lyve"], wind: ["wynd", "wind"],
  tear: ["tair", "teer"], lead: ["led", "leed"], bow: ["boh", "bau"],
  row: ["roh", "rau"], close: ["kloce", "kloze"] };
const HEARD_AMBIGUOUS = {
  /* Present-tense "read", sentence batch 7, owner: perfect (2026-08-19). The
     pin binds BYTES AND TEXT: the audio is /riːd/, so if the shown
     sentence ever drifts to a past-tense frame the same bytes become the
     wrong reading - the axis the 2026-08-20 honesty audit named. */
  "s:v3-l100-01": { sha: "d16b0dcd700f53f49f5f32a5a3b813984a2f5c2fa40211c0b572d22fbb6d77b2",
    text: "Look how far you got, and look how fast you can read now." },
};
const bare = (w) => w.replace(/[.,!?:;'"]/g, "").toLowerCase();
/* Hardened by the 2026-08-20 honesty audit, which found two ways a say could
   settle while proving nothing. The renderer's table lists "wind" as its own
   legal respelling, so an identity say passed; now the say token must DIFFER
   at every ambiguous position as well as being a declared target. And a
   hyphenated token ("wind-up") tripped the detector but slipped the
   whitespace tokenizer, settling vacuously; both sides now split on hyphens
   too, keeping alignment. The row's own round verdict is honoured: a take the
   listener refused settles nothing, however right its say reads. */
const sayTokens = (s) => s.split(/[\s–—-]+/).filter(Boolean);
function sayAligned(tw, sw) {
  if (tw.length !== sw.length) return false;
  for (let i = 0; i < tw.length; i += 1) {
    const w = bare(tw[i]);
    if (!AMBIGUOUS.includes(w)) continue;
    const s2 = bare(sw[i]);
    if (s2 === w || !(HOMOGRAPH_SAY[w] || []).includes(s2)) return false;
  }
  return true;
}
function saySettles(row, text) {
  if (!row || typeof row.say !== "string") return false;
  const v = String(row.verdict || "");
  if (v !== "perfect" && !v.startsWith("accept")) return false;
  return sayAligned(sayTokens(text), sayTokens(row.say));
}
function fileSha(dir, file) {
  const path = `${dir}/${file}`;
  return existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : null;
}
function shippedSha(manifest, dir, id) {
  return manifest[id] && fileSha(dir, manifest[id].file);
}

/* One ambiguous sentence against its three proofs; the problems it raises. */
function ambiguousProblems(c, word, manifest, r, ledger, dir) {
  if ((r.phoneme_sentences || []).includes(c.id)) return [];
  const pin = HEARD_AMBIGUOUS[c.id];
  if (pin) {
    const out = [];
    if (shippedSha(manifest, dir, c.id) !== pin.sha) out.push(`pinned ambiguous take changed bytes: ${c.id} - the pin is the take the owner heard`);
    if (c.text !== pin.text) out.push(`pinned ambiguous take's text drifted: ${c.id} - the audio no longer matches the sentence shown`);
    return out;
  }
  const row = ledger[c.id];
  if (saySettles(row, c.text)) {
    return shippedSha(manifest, dir, c.id) === row.sha256 ? []
      : [`ambiguous take's shipped bytes are not the bytes the listener heard: ${c.id}`];
  }
  return [`sentence left to spelling though "${word}" has two pronunciations: ${c.id} ("${c.text}")`];
}

/** @param {Array<{id: string, text: string}>} script */
export function checkAmbiguous(script, manifest, r, ledger, dir) {
  const problems = [];
  for (const c of script) {
    if (c.id.startsWith("w:")) continue;
    const word = AMBIGUOUS.find((a) => new RegExp(`\\b${a}\\b`, "i").test(c.text));
    if (!word) continue;
    problems.push(...ambiguousProblems(c, word, manifest, r, ledger, dir));
  }
  return problems;
}
