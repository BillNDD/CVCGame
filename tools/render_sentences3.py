# Sentence batch 3: the sentences that fill the thin levels, and the one word
# the whole sentence plan still lacks.
#
# WHY THIS BATCH EXISTS. With the heart words brought forward, the 40 approved
# sentences of batches 1 and 2 place across Levels 2 to 9 — but they place
# unevenly: eleven at Level 4 and thirteen at Level 7, none at all at Level 1,
# and two or three at each of 2, 3, 5, 8 and 9. The owner's rule is at least
# five sentences per level. Levels 10 and 11 were built on 2026-08-12 and have
# none at all. This batch is the 30 sentences that close both gaps, written
# level by level so each one is readable by a child who has reached it and no
# earlier.
#
# THE WORD "a". Batch 2's header recorded a gap for the owner to rule on: the
# article "a" is taught nowhere, so no sentence could use it, and six drafts
# had to be bent into "the" or "my". The owner ruled on 2026-08-11 that "the",
# "a" and "and" come forward onto the heart roster. "and" was already recorded
# and shipped at Level 10; "the" has been in the bank since Level 7. "a" has
# never been rendered at all, in any round. It is the only word in the whole
# sentence plan with no audio, so it rides in this batch as a word card with
# candidate arms, judged the way every other word has been.
#
# Every sentence is validated mechanically before anything renders, by the
# project's own checker (tools/decodable.mjs) rather than a second copy of its
# rules: a sentence whose words are not all taught by its level, or that uses
# no word the level introduces, refuses to build.
#
# THE NINE THAT THE CHECKER REFUSED, 2026-08-13. This batch was written on
# 2026-08-12 and never rendered. Run at last, tools/decodable.mjs refused nine of
# its thirty, and one word explains six of them: "we" is not taught anywhere in
# the bank, and neither are "go" or "me". Level 1 refused three more because it
# is twelve VC words with no function words at all - the heart roster sits at
# Level 2, so a Level 1 sentence can only be built from at, an, am, ax, in, it,
# if, is, on, ox, up and us. The nine were rewritten from each level's own
# taught words rather than dropped, and the checker is still the arbiter.
#
# Usage: python render_sentences3.py <out_dir>
import base64
import hashlib
import json
import pathlib
import subprocess
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

# Level -> the sentences that level gains. Written to the length ramp the owner
# asked for: four to five words where the child has a dozen words to work with,
# up to eight once the blends arrive.
SENTENCES = {
    1: ["Is it an ox?", "An ox is up.", "It is an ax.", "Is it up?", "An ax is on it."],
    2: ["My dad has a map.", "The cat sat on my lap.", "A man and a cat ran.", "Dad had a nap."],
    3: ["The dog did not sit.", "A fox ran to the log.", "My mom got a big box."],
    5: ["The kid fed a cub.", "My pal hid the lid.", "My pal had gum and a fig."],
    6: ["My chum can wash the dish.", "The shop had a red cap."],
    8: ["My doll fell on the hill.", "My pal can quiz us."],
    9: ["The chick is on my thumb.", "A duck can quack.", "Check the thick shell."],
    10: ["The gift is in my hand.", "The tent is in the sand.", "My milk is on the desk.",
         "Lift the lamp to the desk.", "The best nest is soft."],
    11: ["My twin can swim fast.", "The sled is on the flat sand.", "Stop and grab my hand.",
         "The pup is snug in my lap.", "Grab the twig and grin."],
}

# The word "a" said alone. Two things can go wrong and both have happened to
# other two-letter words: the synthesiser reads the spelling as the LETTER NAME
# ("ay"), which is the fault the phoneme map exists for, and a word this short
# arrives clipped or creaky. So the arms cover both the letter-name risk (a
# spelled render against an explicit schwa) and the shortness (a plain render
# against cuts from two carriers, which is what won for every other short word
# the owner has judged).
A_ARMS = [
    ("a_1", "plain, spelled", dict(text="a", phonemes=None, speed=0.85)),
    ("a_2", "explicit uh sound", dict(text="ɐ", phonemes=True, speed=0.85)),
    ("a_3", "explicit uh, slower", dict(text="ɐ", phonemes=True, speed=0.75)),
    ("a_4", "cut from Listen—a.", dict(carrier="Listen—a.", speed=0.85)),
    ("a_5", "cut from The printed word is “a”.",
     dict(carrier="The printed word is “a”.", speed=0.85)),
    ("a_6", "cut from a. a.", dict(carrier="a. a.", speed=0.85)),
]


def check_all():
    """The project's own decodability checker is the gate, not a copy of it."""
    tmp = pathlib.Path(sys.argv[1]); tmp.mkdir(parents=True, exist_ok=True)
    f = tmp / "sentences.json"
    f.write_text(json.dumps({str(k): v for k, v in SENTENCES.items()}))
    r = subprocess.run(["node", "tools/decodable.mjs", "--file", str(f)],
                       cwd=REPO, capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        raise SystemExit("batch refused: the decodability checker rejected a sentence")


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def carrier_cut(k, text, speed, margin_ms=80, floor_db=-30, gap_ms=40):
    """Locate the word inside a carrier by its quiet edges. The settled rule
    (docs/settled.md): a cut that keeps most of the carrier is a PHRASE and is
    never offered to a listener."""
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
    a = np.asarray(a, np.float32)
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    loud = db > floor_db
    runs, i = [], 0
    while i < len(loud):
        if loud[i]:
            j = i
            while j < len(loud) and loud[j]:
                j += 1
            runs.append((i, j)); i = j
        else:
            i += 1
    runs = [r for r in runs if (r[1] - r[0]) * 10 >= gap_ms]
    if not runs:
        return None, sr, 1.0
    s, e = runs[-1]                       # the word sits last in every carrier here
    m = int(margin_ms / 1000 * sr)
    cut = a[max(0, s * n - m):min(len(a), e * n + m)]
    return cut, sr, len(cut) / len(a)


if __name__ == "__main__":
    OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
    check_all()
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

    items, audit = [], []

    # The word first, so it is the last card the page shows and the owner is
    # not asked to judge a single vowel before their ear has warmed up on
    # sentences. build_page.py puts sentences first regardless; this keeps the
    # data honest about the order it was rendered in.
    arms = []
    for aid, note, how in A_ARMS:
        if "carrier" in how:
            cut, sr, kept = carrier_cut(k, how["carrier"], how["speed"])
            if cut is None or kept > 0.60:
                print(f"  {aid}: dropped, the cut kept {kept:.0%} of the carrier (a phrase, not a word)")
                continue
            audio = cut
        else:
            audio, sr = k.create(how["text"], voice=VOICE, speed=how["speed"],
                                 lang="en-us", is_phonemes=bool(how.get("phonemes")))
            audio = np.asarray(audio, np.float32)
        mp3, ms = encode(shape(audio, sr), sr)
        arms.append({"id": aid, "family": note, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        print(f"  {aid}: {ms}ms  {note}")
    items.append({"kind": "word", "text": "a",
                  "note": "the article, never rendered in any round - it is the "
                          "last word the sentence plan lacks", "arms": arms})

    n = 0
    for level in sorted(SENTENCES):
        for text in SENTENCES[level]:
            n += 1
            a, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
            a = np.asarray(a, np.float32)
            mp3, ms = encode(shape(a, sr), sr)
            items.append({"kind": "sentence", "id": f"s{n:02d}", "text": text,
                          "note": f"Level {level}",
                          "arms": [{"id": f"s{n:02d}", "family": "sentence", "ms": ms,
                                    "b64": base64.b64encode(mp3).decode(),
                                    "sha": hashlib.sha256(mp3).hexdigest()}]})
            audit.append((f"s{n:02d}", ms, float(np.abs(a).max())))
            print(f"s{n:02d} L{level}: {ms}ms  {text}")

    bad = [x for x in audit if x[1] < 600 or x[2] < 0.05]
    if bad:
        raise SystemExit(f"batch refused: unusable clips {bad}")

    total = sum(len(v) for v in SENTENCES.values())
    (OUT / "batch-data.json").write_text(json.dumps({
        "title": "Sentence batch 3 — the thin levels filled, and the word “a”",
        "tally": (f"{total} sentences, one per card, each labelled with the level it belongs to. "
                  "With these every level from 1 to 11 has at least five. Plus the article "
                  "“a”, the only word in the sentence plan that has never been "
                  "rendered: six arms, blind."),
        "items": items}))
    print(f"\nwrote {OUT / 'batch-data.json'}: {total} sentences + 1 word ({len(arms)} arms)")
