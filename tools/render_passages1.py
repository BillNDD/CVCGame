# Passage round 1 (listening round 8): the eleven kept passages, sentence by
# sentence, plus the three spoken credit lines.
#
# WHY THIS BATCH EXISTS. The owner culled eleven verbatim public-domain
# passages on two page rounds (docs/settled.md, 2026-08-16, "The first
# passages from real books"). The whisper presentation shows a passage one
# sentence at a time, and the sentence stage's ruled design is one whole
# recording per sentence - so each passage sentence gets one render at
# sentence speed, exactly the round-7 treatment. The credit lines are the
# passage stage's closing words (SPEC section 12): one render per distinct
# source. No seat check runs here ON PURPOSE: passages are the one stage
# ruled to carry untaught words, covered by tap-to-hear.
#
# Usage: python tools/render_passages1.py <out_dir>
import base64
import hashlib
import json
import pathlib
import re
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
SPEED = 1.0
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

CREDITS = [
    "That was from McGuffey's First Eclectic Reader.",
    "That was from The Aesop for Children, by Aesop.",
    "That was a Mother Goose rhyme.",
]


def sentences_of(text):
    return [s.strip() for s in re.findall(r"[^.!?]+[.!?]", text)]


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder()
    e.set_bit_rate(96)
    e.set_in_sample_rate(sr)
    e.set_channels(1)
    e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


if __name__ == "__main__":
    OUT = pathlib.Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    kept = json.loads((OUT / "passages-kept.json").read_text(encoding="utf-8"))
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

    out = {"passages": [], "credits": {}}
    for pi, p in enumerate(kept, 1):
        rec = {"title": p["title"], "author": p["author"], "text": p["text"], "sentences": []}
        for si, s in enumerate(sentences_of(p["text"]), 1):
            audio, sr = k.create(s, voice=VOICE, speed=SPEED, lang="en-us")
            mp3, ms = encode(shape(np.asarray(audio, np.float32), sr), sr)
            rec["sentences"].append({"text": s, "ms": ms,
                "b64": base64.b64encode(mp3).decode(),
                "sha256": hashlib.sha256(mp3).hexdigest()})
            print(f"  p{pi:02d}s{si} {ms}ms  {s[:60]}")
        out["passages"].append(rec)
    for c in CREDITS:
        audio, sr = k.create(c, voice=VOICE, speed=SPEED, lang="en-us")
        mp3, ms = encode(shape(np.asarray(audio, np.float32), sr), sr)
        out["credits"][c] = {"ms": ms, "b64": base64.b64encode(mp3).decode(),
                             "sha256": hashlib.sha256(mp3).hexdigest()}
        print(f"  credit {ms}ms  {c}")
    path = OUT / "r8-audio.json"
    path.write_text(json.dumps(out), encoding="utf-8")
    n = sum(len(p["sentences"]) for p in out["passages"])
    print(f"wrote {path} ({n} sentence clips + {len(CREDITS)} credit clips)")
