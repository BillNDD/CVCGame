# One word: third. The owner marked rescue-3's third_t11 "closest" - that arm
# was gb_sp0.75, the British G2P path over "Listen — third." So this micro
# round is that family, widened: more GB frames, neighbouring speeds, plus one
# frame that primes the word with its own ordinal series ("First, second,
# third.") - a sentence that ends on the target with natural stress.
#
# royal and soil are NOT here. Both were refused in rescue 3 and the stated
# rule was one more mechanism, then the sidecar. They go to the sidecar.
#
# Usage: python3 tools/render_third.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
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
print("hash guard: %d prior arms" % len(PRIOR), flush=True)

WORD = "third"
FRAMES = [
    ("listen", "Listen — third."),
    ("wordis", "The word is third."),
    ("ordinal", "First, second, third."),
    ("pair", "Third. Third."),
]
SPEEDS = (0.65, 0.7, 0.75, 0.8, 0.85)


def say(t, sp, lang="en-gb"):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang=lang, is_phonemes=False)
    return np.asarray(a, np.float32), sr


def trim_silence(a, sr, floor_db=-45.0, pad_ms=15):
    amp = np.abs(a); thr = 10 ** (floor_db / 20)
    idx = np.where(amp > thr)[0]
    if not len(idx):
        return a
    pad = int(pad_ms / 1000 * sr)
    return a[max(0, idx[0] - pad):min(len(a), idx[-1] + pad)]


def shape(a, sr):
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


def cut(probe, carrier, csr):
    off = int(len(carrier) * 0.40)
    st, en, score = wc.template_match(probe, carrier[off:], csr)
    if st is None or score < 0.45:
        return None
    st, en = st + off, en + off
    # third ends in a stop: the long tail walk, the batch's fix for "the d cut
    # off the end of third"
    st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=35, max_walk_ms=70)
    st = max(0, st - int(0.090 * csr))       # th onset: full 90 ms backup
    return carrier[st:en]


out = {}
solo, ssr = say(WORD, 0.8)
probe = trim_silence(solo, ssr)
arms = []
for tag, frame in FRAMES:
    for sp in SPEEDS:
        if len(arms) >= 12:
            break
        car, csr = say(frame, sp)
        seg = cut(probe, car, csr)
        if seg is None or len(seg) < 0.08 * csr:
            continue
        mp3, ms = encode(shape(seg, csr), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in PRIOR:
            continue
        PRIOR.add(sha)
        arms.append({"family": "gb_%s_sp%s" % (tag, sp), "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha256": sha})
for i, a in enumerate(arms[:12], 1):
    a["id"] = "third_u%d" % i
out[WORD] = arms[:12]
(OUT / "third-audio.json").write_text(json.dumps(out), encoding="utf-8")
print("wrote third-audio.json; %d arms" % len(out[WORD]), flush=True)
