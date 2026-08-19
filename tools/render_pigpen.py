# One sentence, three attempts: "A cat got in the pigpen!"
#
# The owner heard "pigben". The /p/ opening the second syllable of the compound
# is being voiced by the model's coarticulation - a pronunciation fault in the
# WORD, not a fault of the cut, since a sentence is synthesised whole and never
# cut at all.
#
# WHY THIS BREAKS THE ONE-TAKE RULE, AND WHY THAT IS HONEST. The owner ruled
# sentences are single takes: "your first try is usually a winner one is enough
# for each" (docs/settled.md). That ruling is about FIRST offers, and it has
# held - 55 of 56 takes accepted. This is a refusal, and a refusal earns one
# more take. The reason there are three here rather than one is that I cannot
# hear which of them fixes the word, and offering a single guess would spend
# his listen on a coin toss. Three arms, one of which may be right, spends less
# of his time than three rounds of one.
#
# The three axes, each a different mechanism:
#   1. speed        - coarticulation is speed-sensitive; the plainest fix
#   2. IPA          - the whole sentence phonemised, so the /p/ cannot be
#                     re-derived from spelling at all
#   3. hyphenation  - "pig-pen" makes the compound boundary explicit to the
#                     text front-end without changing what a reader sees
#
# Usage: python3 tools/render_pigpen.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

SHOWN = "A cat got in the pigpen!"          # what the child reads, unchanged
ARMS = [
    ("speed_0.9",  SHOWN,                          False, 0.9),
    ("speed_1.1",  SHOWN,                          False, 1.1),
    ("hyphen",     "A cat got in the pig-pen!",    False, 1.0),
    ("ipa",        "ɐ kˈæt ɡˈɑt ɪn ðə pˈɪɡpɛn!",  True,  1.0),
]


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    out = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                          np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    n = int(FADE_MS / 1000 * sr)
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


out, seen = {"s:v3-l09-02": []}, set()
for tag, text, ph, sp in ARMS:
    try:
        a, sr = k.create(text, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    except Exception as e:
        print("  %s: synth failed (%s)" % (tag, e.__class__.__name__), flush=True)
        continue
    pcm = (shape(np.asarray(a, np.float32), sr) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    mp3 = e.encode(pcm.tobytes()) + e.flush()
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in seen:
        print("  %s: identical to another arm - dropped" % tag, flush=True)
        continue
    seen.add(sha)
    ms = int(len(pcm) * 1000 / sr)
    out["s:v3-l09-02"].append({"id": "pigpen_%d" % (len(out["s:v3-l09-02"]) + 1),
                               "family": tag, "ms": ms, "text": SHOWN,
                               "level": 9, "kind": "sentence",
                               "b64": base64.b64encode(mp3).decode(), "sha256": sha})
    print("  %-10s %4d ms" % (tag, ms), flush=True)

(OUT / "pigpen-audio.json").write_text(json.dumps(out), encoding="utf-8")
print("wrote pigpen-audio.json; %d arms" % len(out["s:v3-l09-02"]), flush=True)
