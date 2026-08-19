# The final batch-21 round: the 36 words still outstanding after fifteen rounds.
#
# TWO CLIPPING FAULTS ARE FIXED HERE, AND BOTH WERE FOUND BY EAR, NOT BY A GATE.
# The owner's own words, from four separate rounds:
#
#   "most badge sound like adge"                    the b is gone
#   "all foxes ... sound like 'oxes'"               the f is gone
#   "all gave ... sound like 'ave'"                 the g is gone
#   "terrible clipping none contained the word these"
#   "most had the d cut off the end of third"       the tail is gone
#
# FAULT 1 - THE ONSET IS EATEN ON QUIET CONSONANTS. render_batch21.py backs the
# cut up 60 ms only when verify.onset_class(word) == "stop". Measured: that
# classifier calls `b`, `d` and `g` "other" and `f`, `th` "fricative", so none of
# them got the backup. The voicing at the start of /b/, /d/, /g/ and voiced /th/
# is quiet and short, the template match lands after it, and the word begins at
# its vowel. Measured consequence: th-onset words missed at 64% against a 9%
# batch-wide rate - seven times the baseline.
#   Fix: the backup is decided by the WORD'S SPELLING, not by a classifier whose
#   buckets do not match the phonetics. Every consonant onset now gets a backup,
#   sized by how quiet its start is.
#
# FAULT 2 - A FINAL STOP IS TRUNCATED. refine_edges pads the end by 15 ms, which
# is less than the closure-plus-burst of a word-final /d/ or /t/. "third" lost
# its d. Fix: a word ending in a stop gets a longer tail walk.
#
# WHY EVERY ARM IS LEGITIMATELY NEW. The hash guard refuses any arm byte-identical
# to one already offered. Because the CUT is different now, the same frame at the
# same speed produces different bytes - so these are genuinely new candidates and
# not the same question asked louder.
#
# All four carrier frames are offered, always. docs/settled.md records why: every
# one of the batch's first nineteen misses had never met two of the four, because
# the old builder stopped adding frames once four arms survived. A word that is
# hard is exactly the word that needs the frames it did not get.
#
# Usage: python3 tools/render_final21.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import verify as V
import wordcut as wc

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

PRIOR = set()
for f in list(OUT.glob("*audio.json")) + list(OUT.parent.glob("*audio.json")):
    try:
        for arms in json.loads(f.read_text(encoding="utf-8")).values():
            PRIOR |= {a["sha256"] for a in arms}
    except Exception:
        pass
print("hash guard loaded %d prior arms" % len(PRIOR), flush=True)

WORDS = json.loads((OUT.parent / "final-comeback.json").read_text(encoding="utf-8"))
print("final round: %d words -> %s" % (len(WORDS), " ".join(WORDS)), flush=True)

# ---- FAULT 1: how far to back the cut up, by the word's own spelling ----
# Voiced stops and voiced th start quietly; the match reliably lands late on them.
# Voiceless stops already had 60 ms and kept it. Fricatives get a smaller walk
# because their noise IS detectable, just not always at full amplitude.
BACKUP_MS = {}
for c in "bdg":            BACKUP_MS[c] = 90     # voiced stops - the worst offenders
for c in "ptk":            BACKUP_MS[c] = 60     # voiceless stops - unchanged
for c in "fsvz":           BACKUP_MS[c] = 55     # fricatives
for c in "mnlrwyhj":       BACKUP_MS[c] = 45     # sonorants and the rest
DIGRAPH_BACKUP = {"th": 90, "sh": 55, "ch": 60, "wh": 45, "ph": 55}
STOP_END = tuple("bdgptk")


def backup_ms(word):
    for d, ms in DIGRAPH_BACKUP.items():
        if word.startswith(d):
            return ms
    return BACKUP_MS.get(word[0], 40)


def say(t, sp=0.85, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


def shape(a, sr):
    """FAULT 3, found by the engineering seat: the old version faded the SPEECH
    and then added the silence, so the 10 ms ramp landed on the word's first
    10 ms - measured at 45% of the energy there, which is most of a stop burst.
    Pad FIRST, then fade, so the ramp lands entirely inside the padding and
    touches no speech at all. Lead is 80 ms and the fade is 10 ms, so it does."""
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    out = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                          np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    n = int(FADE_MS / 1000 * sr)
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def located(clean, carrier, csr, word, backup=None):
    st, en, score = wc.template_match(clean, carrier, csr)
    if st is None or score < 0.5:
        return None
    # FAULT 2: a word ending in a stop needs a longer tail walk than 15/30 ms,
    # or its closure and burst are cut off - "third" without its d.
    tail_stop = word.endswith(STOP_END)
    st, en = wc.refine_edges(carrier, csr, st, en,
                             pad_ms=35 if tail_stop else 20,
                             max_walk_ms=70 if tail_stop else 40)
    # FAULT 1: back the start up by an amount the SPELLING decides.
    st = max(0, st - int((backup_ms(word) if backup is None else backup) / 1000 * csr))
    return carrier[st:en]


def gate_ok(cut, word, clean, sr):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + 1:
            ok = True
    return ok
    # NOTE: the fricative lead check from batch 17 is deliberately NOT applied
    # here. It refuses a cut whose leading voiced run exceeds 40 ms - which is
    # exactly what a correct /f/ or /th/ cut now looks like after the backup.
    # Keeping it would refuse the very fix this file exists to make.


def offer(word, arms, family, seg, sr):
    if seg is None or len(seg) < 0.08 * sr:
        return
    # FAULT 1 and 2, and the reason the earlier fixes did nothing: this used to
    # re-run wordcut.speech_span on the segment and re-slice to its answer -
    # discarding the 60-90 ms onset backup located() had just applied and the
    # tail pad refine_edges had just added. The cut was corrected and then
    # uncorrected on the next line. It also re-imposed speech_span's own
    # framing loss, which drops up to 10 ms from the end of EVERY cut at any
    # level, because its frame walk never covers the final partial frame.
    # located() has already decided the edges deliberately. Trust them.
    cut = seg
    if not gate_ok(cut, word, arms["_clean"], sr):
        return
    mp3, ms = encode(shape(cut, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print("    %s/%s: identical to a prior arm - refused by the hash guard" % (word, family), flush=True)
        return
    PRIOR.add(sha)
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


FRAMES = [("listen", "Listen—{w}."), ("say", "Say {w}, everybody."),
          ("word", "The word is {w}."), ("here", "Here is the word {w}.")]
# listen leads: measured 278 of 423 accepts against say's 124. Batch 19 concluded
# the opposite from a quarter of the sample.
#
# 0.9 is offered for the first time. The owner reported "words around painter
# started to get really slow pronunciations"; the grid has never gone above 0.8.
SPEEDS = (0.7, 0.8, 0.9)


def build():
    out = {}
    part = OUT / "final21-audio.json"
    for word in WORDS:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        # A BACKUP LADDER, not a single value. The first render with the fix
        # gave `thankful` ten arms where it had two - and gave `badge`, `girl`
        # and `read` NONE, because the larger backup pulled in enough of the
        # neighbouring word that verify() refused every cut. A backup that is
        # right for one onset is wrong for another, and guessing a second single
        # value would just move the empties around.
        # So: try the full backup, and if the field is still thin, try smaller
        # ones. The GATE IS NEVER WEAKENED - only the amount of audio offered to
        # it changes, and the first backup that produces arms is the one used.
        base = backup_ms(word)
        for factor in (1.0, 0.66, 0.33, 0.0):
            for tag, frame in FRAMES:
                for sp in SPEEDS:
                    if len(arms["list"]) >= 10:
                        break
                    car, csr = say(frame.format(w=word), sp)
                    offer(word, arms, "%s_sp%s" % (tag, sp),
                          located(arms["_clean"], car, csr, word, int(base * factor)), csr)
            if len(arms["list"]) >= 4:
                break
        for i, a in enumerate(arms["list"][:10], 1):
            a["id"] = "%s_f%d" % (word, i)
        out[word] = arms["list"][:10]
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms  (backup %d ms%s)  (%d/%d)"
              % (word, len(out[word]), backup_ms(word),
                 ", long tail" if word.endswith(STOP_END) else "",
                 len(out), len(WORDS)), flush=True)
    return out


if __name__ == "__main__":
    r = build()
    thin = [w for w, a in r.items() if len(a) < 3]
    empty = [w for w, a in r.items() if not a]
    print("wrote final21-audio.json; %d arms over %d words%s%s"
          % (sum(len(a) for a in r.values()), len(r),
             ("; THIN: " + " ".join(thin)) if thin else "",
             ("; EMPTY: " + " ".join(empty)) if empty else ""), flush=True)
