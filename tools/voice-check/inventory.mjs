/* G13, rule 1: the clip inventory. Every clip the engine's script names has a
   manifest entry, declares its speech edges, sits inside its duration band,
   and - when the files are verified - exists on disk at a size its declared
   duration can account for. Rule 2 is the mirror: no orphan clip. The bands
   and the sentences here are this gate's oracle and belong to no helper. */
import { existsSync, statSync } from "node:fs";

/* Every clip declares where its own speech starts and ends, because the
   sound-out seam is a gap between SOUNDS and not between files - see
   tools/voice-edges.py, which measures those edges from the audio and
   re-checks them. A clip with no edges cannot be placed in a sound-out at
   all, so a pack that forgot to record them fails here rather than playing a
   rhythm nobody approved. */
function speech(m) {
  const edged = typeof m.lead === "number" && typeof m.tail === "number";
  return { edged, ms: edged ? m.ms - m.lead - m.tail : m.ms };
}

/* A SOUND clip is measured on its SPEECH, not its file: the shipped sounds
   carry between 0 and 422 ms of their own silence, so a file length says
   almost nothing about the sound inside it.

   The band is 60 to 620 ms, and the two ends have different histories. The
   ceiling is the one the owner's ear set across twenty-one listening rounds
   and that tools/soundgate.py enforces on every candidate: a spoken sound
   longer than 620 ms is a word or a carrier, not a sound. The floor is NOT
   soundgate's 85 ms, because the two files measure different things.
   soundgate cuts a candidate at its energy islands; tools/voice-edges.py
   reads the silence at -45 dB below the clip's own peak, and a plosive burst
   has a peak so far above its release that this method reads it short.
   Measured that way the shipped, owner-approved pack runs /k/ 70 ms, /p/
   80 ms, /b/ and /t/ 110 ms - the four unvoiced plosives, and every other
   sound at 120 ms or more. A number invented in a gate does not outrank a
   sound a listener has accepted (the same reasoning is recorded at
   tools/soundgate.py:186), so the floor sits below the shortest approved
   sound with room to spare. It still catches what it exists to catch: a
   truncation leaves 20 to 40 ms, and soundgate's 85 ms band is untouched at
   the gate that judges candidates BEFORE they are approved. This band is in
   every case TIGHTER than the 8000 ms these clips would otherwise share with
   sentences. */
function soundProblem(clip, m) {
  const ms = speech(m).ms;
  if (typeof m.ms !== "number" || ms < 60 || ms > 620) return `duration out of range: ${clip.id} at ${ms} ms of speech (limits 60-620)`;
  return null;
}

/* A WORD clip has a word in it and nothing else. The longest word in the
   pack runs 1318 ms with its silences, so 1500 is a generous ceiling and a
   clip beyond it is carrying something that is not the word. This comes from
   a real defect: an attempt to give six words the prosody of a sentence
   shipped the whole sentence - "Here is the word cup." - at 1640 to 1800 ms,
   and no other check would have noticed. Sentences and praise keep the wide
   ceiling. The floor of 400 ms is the one every clip used to share: the
   shortest real word clip is 448 ms, so anything under 400 is a truncation.
   Both ends are still measured on the whole FILE, as they always have been -
   these clips are pinned and listened to as files, and nothing about them
   has changed.
   The sentence ceiling was 8,000 ms in the one-breath world; the 2026-08-20
   cutover shipped the owner's approved paragraphs, the longest 33,264 ms
   (s:v3-l94-01). The ceiling is that take plus a breath of margin - a clip
   past it is longer than anything an owner ear has approved and goes back to
   a person. */
function fileLengthProblem(clip, m) {
  const ceiling = clip.id.startsWith("w:") ? 1500 : 34000;
  if (typeof m.ms !== "number" || m.ms < 400 || m.ms > ceiling) return `duration out of range: ${clip.id} at ${m.ms} ms (limit ${ceiling})`;
  return null;
}

/* The manifest must not lie about durations: at 96 kbps CBR the file holds
   12.3-12.9 bytes per millisecond (measured across the whole pack). A
   fabricated ms or a truncated file lands outside 10-15. */
function fileProblems(clip, m, dir) {
  const p = `${dir}/${m.file}`;
  if (!existsSync(p)) return [`missing file: ${p}`];
  const out = [];
  const size = statSync(p).size;
  if (size < 1000) out.push(`suspiciously small file: ${p}`);
  const ratio = size / Math.max(m.ms, 1);
  if (ratio < 10 || ratio > 15) out.push(`size does not match duration: ${clip.id} (${size} bytes for ${m.ms} ms)`);
  return out;
}

function clipProblems(clip, m, verifyFiles, dir) {
  const out = [];
  if (!speech(m).edged) out.push(`clip declares no speech edges: ${clip.id}`);
  const band = clip.id.startsWith("d:") ? soundProblem(clip, m) : fileLengthProblem(clip, m);
  if (band) out.push(band);
  if (verifyFiles) out.push(...fileProblems(clip, m, dir));
  return out;
}

/** @param {Array<{id: string, text: string}>} script */
export function checkInventory(script, manifest, verifyFiles, dir) {
  const problems = [];
  for (const clip of script) {
    const m = manifest[clip.id];
    if (!m) { problems.push(`missing clip: ${clip.id} ("${clip.text}")`); continue; }
    problems.push(...clipProblems(clip, m, verifyFiles, dir));
  }
  return problems;
}

/** @param {Array<{id: string}>} script */
export function checkOrphans(script, manifest) {
  const ids = new Set(script.map((c) => c.id));
  return Object.keys(manifest).filter((id) => id !== "__recipe" && !ids.has(id)).map((id) => `orphan clip: ${id}`);
}
