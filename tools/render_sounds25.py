# Sound round 25: j, p, w and y, three ways of the one mechanism round 24 won.
#
# Round 24 offered three mechanisms at citation length and the owner accepted
# four sounds (b, d, g, qu). Three of the four were the SAME mechanism: the
# model saying the sound alone inside a carrier ("here is the sound: bə."),
# the last island cut on zero crossings, its schwa faded from the midpoint.
# The two that were "closest" (w, y) and the two refused (j, p) got that
# mechanism once each. This round gives each of the four THREE carriers, so the
# owner chooses between voice contours rather than between mechanisms, and the
# fade is set per class: a stop's schwa fades from 45 % (short release, the
# burst carries the sound), a glide's from 60 % (the glide IS the sound and
# needs its length).
#
# Usage: py -3.12 tools/render_sounds25.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS = 150, 400
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

SOUNDS = {"j": ("ʤ", "stop"), "p": ("p", "stop"), "w": ("w", "glide"), "y": ("j", "glide")}
FADE_FROM = {"stop": 0.45, "glide": 0.6}
CARRIERS = [
    ("S1_here-is", "hˈɪɹ ɪz ðə sˈaʊnd: {x}ə."),
    ("S2_this-sound", "ðɪs sˈaʊnd ɪz {x}ə."),
    ("S3_say-it", "sˈeɪ ɪt wɪð mˈi: {x}ə."),
]

PRIOR = set()
for p in PACK.glob("d-*.mp3"):
    PRIOR.add(hashlib.sha256(p.read_bytes()).hexdigest())
_pend = json.loads((REPO / "tools/pending-sounds/pending-sounds.json").read_text(encoding="utf-8"))
PRIOR |= {v["sha256"] for v in _pend.values() if isinstance(v, dict) and v.get("sha256")}
for f in list(OUT.parent.glob("round50-s*/sounds*-audio.json")):
    for arms in json.loads(f.read_text(encoding="utf-8")).values():
        PRIOR |= {a.get("sha256") or a.get("sha") for a in arms}


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def say(t, sp=1.0):
    a, sr = k.create(t, voice="af_heart", speed=sp, lang="en-us", is_phonemes=True)
    return np.asarray(a, np.float32), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def zero_cross(x, i, w=72):
    lo, hi = max(1, i - w), min(len(x) - 1, i + w)
    best, bd = i, w + 1
    for j in range(lo, hi):
        if (x[j - 1] <= 0 < x[j]) or (x[j - 1] >= 0 > x[j]):
            if abs(j - i) < bd:
                best, bd = j, abs(j - i)
    return best


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-9)


def islands(a, sr, floor_db=-38, min_gap_ms=50, min_ms=40):
    s0, s1, db, n = wc.speech_span(a, sr)
    out, run, start = [], 0, None
    for i in range(len(db)):
        if db[i] > floor_db:
            if start is None:
                start = i
            run = 0
        elif start is not None:
            run += 1
            if run >= max(1, min_gap_ms // 10):
                end = i - run + 1
                if (end - start) * 10 >= min_ms:
                    out.append((start * n, end * n))
                start, run = None, 0
    if start is not None and (len(db) - start) * 10 >= min_ms:
        out.append((start * n, len(db) * n))
    return out


def arm(sound, family, piece, sr, target):
    if piece is None or len(piece) < sr * 0.11 or len(piece) > sr * 0.62:
        return None
    piece = piece * min(target / rms(piece), 0.98 / (np.abs(piece).max() + 1e-9))
    out = np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), piece.astype(np.float32),
                          np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])
    mp3, ms = encode(out, sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print(f"    {sound}/{family}: identical to bytes already judged - refused")
        return None
    PRIOR.add(sha)
    return {"family": family, "ms": ms, "b64": base64.b64encode(mp3).decode(), "sha": sha, "sha256": sha}


def build():
    out = {}
    for sound, (ipa, kind) in SOUNDS.items():
        rx, rsr = load(PACK / f"d-{sound}.mp3"); r0, r1, _, _ = wc.speech_span(rx, rsr); target = rms(rx[r0:r1])
        arms = []
        for fam, tpl in CARRIERS:
            for sp in (1.0, 0.9):
                car, csr = say(tpl.format(x=ipa), sp)
                isl = islands(car, csr)
                if len(isl) < 2:
                    continue
                a0, a1 = isl[-1]
                piece = car[zero_cross(car, a0):zero_cross(car, a1)].copy()
                start = int(len(piece) * FADE_FROM[kind])
                piece[start:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, len(piece) - start))).astype(np.float32)
                a = arm(sound, f"{fam}_sp{sp}", piece, csr, target)
                if a:
                    arms.append(a); break
        for i, a in enumerate(arms, 1):
            a["id"] = f"{sound}_{i}"
        out[sound] = arms
        print(f"  {sound}: {len(arms)} arms  " + " ".join(f'{a["family"]}({a["ms"] - PAD_HEAD_MS - PAD_TAIL_MS}ms)' for a in arms), flush=True)
    (OUT / "sounds25-audio.json").write_text(json.dumps(out), encoding="utf-8")
    return out


if __name__ == "__main__":
    r = build()
    print("wrote sounds25-audio.json;", sum(len(a) for a in r.values()), "arms over", len(r), "sounds")
