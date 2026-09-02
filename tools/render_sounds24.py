# Sound round 24: the stops at CITATION length.
#
# ROUND 23's verdict, in the owner's words: "All are only a fraction of the
# time that would be needed for the actual sound." Round 23 shaped each stop to
# the phonetics of a stop INSIDE a word - burst plus 20-60 ms of release, 80 to
# 150 ms in all. A sound said ON ITS OWN, as a teacher says it, runs two to
# five times longer than the same sound inside a word: the record's citation
# band is 110-620 ms, and the pack's own accepted stops run 110-240 ms of
# speech. The owner wants the citation form. What round 23 got right stays:
# the burst is never faded, the cut before it sits in the closure on a zero
# crossing, and the level is matched to the clip that ships.
#
# THREE MECHANISMS, each at citation length (target 200-300 ms of speech):
#   D  decaying release from an approved word clip: the burst, then the vowel
#      released under an exponential decay over 200-260 ms, so the release is
#      heard dying away for the length a teacher gives it and never as a
#      syllable - the research's third mechanism, at the owner's length
#   S  the citation carrier "hˈɪɹ ɪz ðə sˈaʊnd: Xə." (a schwa'd release, which
#      is how the model says a stop on its own and how the P45 bake got its
#      stops), the last island, its second half faded so the schwa recedes
#   R  the minimal-pair carrier's last word, released the same way as D but
#      from a fresh render rather than the pack - a different voice contour
# Glides and qu: the same three at 250-320 ms.
#
# Usage: py -3.12 tools/render_sounds24.py <out_dir>
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

SOUNDS = {
    "b": ("b", "stop", ["bat", "bag", "but"], "t"), "d": ("d", "stop", ["dog", "dig", "dug"], "t"),
    "g": ("ɡ", "stop", ["got", "gap", "gum"], "t"), "j": ("ʤ", "stop", ["jam", "jog", "jug"], "t"),
    "p": ("p", "stop", ["pat", "pig", "pup"], "b"), "qu": ("kw", "stop", ["quit", "quiz", "quack"], "t"),
    "w": ("w", "glide", ["wet", "web", "wag"], "t"), "y": ("j", "glide", ["yes", "yet", "yum"], "t"),
}
RELEASE_MS = {"stop": 240, "glide": 300}

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


def say(t, sp=1.0, phonemes=False):
    a, sr = k.create(t, voice="af_heart", speed=sp, lang="en-us", is_phonemes=phonemes)
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


def burst_index(x, sr, start):
    n = int(sr * 0.002)
    e = np.array([np.mean(x[i:i + n] ** 2) for i in range(start, len(x) - n, n)])
    if not len(e):
        return None
    floor = np.percentile(e[: max(3, len(e) // 4)], 20) + 1e-9
    for j, v in enumerate(e):
        if v > 40 * floor and v > 1e-5:
            return start + j * n
    return None


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-9)


def decaying_release(x, sr, kind, release_ms, decay=2.6):
    """closure (30 ms) + burst untouched + the release under an exponential
    decay for release_ms, ending in a 30 ms raised-cosine fade at a zero
    crossing. A glide has no closure: it starts at its onset."""
    s0, s1, _, _ = wc.speech_span(x, sr)
    if kind == "glide":
        start = zero_cross(x, s0); b = start
    else:
        b = burst_index(x, sr, max(0, s0 - int(0.05 * sr)))
        if b is None:
            return None
        start = zero_cross(x, max(0, b - int(sr * 0.03)))
    end = zero_cross(x, min(len(x) - 1, b + int(sr * 0.012) + int(sr * release_ms / 1000)))
    if end - start < sr * 0.08:
        return None
    piece = x[start:end].copy()
    fi = int(sr * 0.002); piece[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    tail0 = (b - start) + int(sr * 0.012)
    n = len(piece) - tail0
    if n > 10:
        piece[tail0:] *= np.exp(-np.linspace(0, decay, n)).astype(np.float32)
    fo = min(int(sr * 0.03), len(piece) // 2)
    piece[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return piece


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
    for sound, (ipa, kind, srcs, nb) in SOUNDS.items():
        rx, rsr = load(PACK / f"d-{sound}.mp3"); r0, r1, _, _ = wc.speech_span(rx, rsr); target = rms(rx[r0:r1])
        arms = []
        # D - the pack, released and decaying at citation length
        for w in srcs:
            x, sr = load(PACK / f"w-{w}.mp3")
            a = arm(sound, f"D_decay-{w}", decaying_release(x, sr, kind, RELEASE_MS[kind]), sr, target)
            if a:
                arms.append(a); break
        # S - the citation carrier with a schwa'd release, last island, second half faded
        car, csr = say(f"hˈɪɹ ɪz ðə sˈaʊnd: {ipa}ə.", 1.0, phonemes=True)
        isl = islands(car, csr)
        if len(isl) >= 2:
            a0, a1 = isl[-1]
            piece = car[zero_cross(car, a0):zero_cross(car, a1)].copy()
            half = len(piece) // 2
            piece[half:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, len(piece) - half))).astype(np.float32)
            a = arm(sound, "S_citation-schwa-faded", piece, csr, target)
            if a:
                arms.append(a)
        # R - the minimal pair's last word, released and decaying, from a fresh render
        car, csr = say(f"{ipa}ˈɪn, {nb}ˈɪn, {ipa}ˈɪn.", 1.0, phonemes=True)
        s0, s1, _, _ = wc.speech_span(car, csr)
        last = car[max(s0, s1 - int(csr * 0.36)):s1]
        a = arm(sound, "R_pair-release", decaying_release(last, csr, kind, RELEASE_MS[kind]), csr, target)
        if a:
            arms.append(a)
        for i, a in enumerate(arms, 1):
            a["id"] = f"{sound}_{i}"
        out[sound] = arms
        print(f"  {sound}: {len(arms)} arms  " + " ".join(f'{a["family"]}({a["ms"] - PAD_HEAD_MS - PAD_TAIL_MS}ms)' for a in arms), flush=True)
    (OUT / "sounds24-audio.json").write_text(json.dumps(out), encoding="utf-8")
    return out


if __name__ == "__main__":
    r = build()
    print("wrote sounds24-audio.json;", sum(len(a) for a in r.values()), "arms over", len(r), "sounds")
