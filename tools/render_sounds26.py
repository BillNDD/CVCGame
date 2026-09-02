# Sound round 26: w and y without the schwa.
#
# Round 25 gave the glides the carrier that won b, d, g, j and p - "here is the
# sound: wə." - and the owner heard the schwa ("hear uh"). A stop needs a
# release to be heard at all; a glide does not. Phonics teachers say /w/ as a
# long "wwoo" and /y/ as a long "yyee": the glide sliding into the vowel it is
# made of (/u/ for w, /i/ for y), and that vowel faded before it settles. Three
# ways, all schwa-free:
#   V  the glide-plus-own-vowel said alone ("wˈuː" / "jˈiː"), faded from 40 %
#   C  the same inside the winning carrier ("here is the sound: wˈuː."), last
#      island, faded from 40 %
#   D  an approved word clip (wet / yes) cut at the glide and faded from 35 %,
#      so the vowel that follows is heard only as the glide's colour
# Usage: py -3.12 tools/render_sounds26.py <out_dir>
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

SOUNDS = {"w": ("wˈuː", ["wet", "web", "wag"]), "y": ("jˈiː", ["yes", "yet", "yum"])}

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


def faded(piece, frac, max_ms, sr):
    """Keep at most max_ms, fade from frac of what is kept."""
    piece = piece[: int(sr * max_ms / 1000)].copy()
    start = int(len(piece) * frac)
    piece[start:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, len(piece) - start))).astype(np.float32)
    fi = int(sr * 0.003); piece[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    return piece


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
    for sound, (ipa, srcs) in SOUNDS.items():
        rx, rsr = load(PACK / f"d-{sound}.mp3"); r0, r1, _, _ = wc.speech_span(rx, rsr); target = rms(rx[r0:r1])
        arms = []
        solo, sr = say(ipa + ".", 0.9)
        s0, s1, _, _ = wc.speech_span(solo, sr)
        a = arm(sound, "V_own-vowel-alone", faded(solo[zero_cross(solo, s0):zero_cross(solo, s1)], 0.4, 340, sr), sr, target)
        if a:
            arms.append(a)
        car, csr = say(f"hˈɪɹ ɪz ðə sˈaʊnd: {ipa}.", 1.0)
        isl = islands(car, csr)
        if len(isl) >= 2:
            a0, a1 = isl[-1]
            a = arm(sound, "C_carrier-own-vowel", faded(car[zero_cross(car, a0):zero_cross(car, a1)], 0.4, 340, csr), csr, target)
            if a:
                arms.append(a)
        for w in srcs:
            x, sr = load(PACK / f"w-{w}.mp3"); s0, s1, _, _ = wc.speech_span(x, sr)
            a = arm(sound, f"D_word-glide-{w}", faded(x[zero_cross(x, s0):zero_cross(x, s1)], 0.35, 320, sr), sr, target)
            if a:
                arms.append(a); break
        for i, a in enumerate(arms, 1):
            a["id"] = f"{sound}_{i}"
        out[sound] = arms
        print(f"  {sound}: {len(arms)} arms  " + " ".join(f'{a["family"]}({a["ms"] - PAD_HEAD_MS - PAD_TAIL_MS}ms)' for a in arms), flush=True)
    (OUT / "sounds26-audio.json").write_text(json.dumps(out), encoding="utf-8")
    return out


if __name__ == "__main__":
    r = build()
    print("wrote sounds26-audio.json;", sum(len(a) for a in r.values()), "arms over", len(r), "sounds")
