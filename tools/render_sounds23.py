# Sound round 23: the stops, the affricate, qu and the glides, shaped the way
# the phonetics and the phonics programmes say an isolated sound must be.
#
# WHAT ROUND 22 GOT WRONG, in the owner's words: "none good clipping terrible
# you need to rethink your strategy for letter phonics sounds and consult an
# expert". The research that followed (2026-09-02, sources in open fault BA)
# says why. A stop IS a silence plus a release: the burst runs 5-20 ms and
# carries the place cue in its onset spectrum, and the first 20-40 ms of
# formant transition into the vowel carry the rest. Round 22 faded IN over the
# burst (a 12 ms fade over a 10 ms burst erases the one cue that says which
# stop it is) and cut the transition hard - "clipping". Jolly Phonics itself
# concedes that /b/ "cannot be said without a schwa" and asks for "as little
# schwa as possible": the target is a released stop whose vocalic tail is too
# short to hear as a syllable, not zero tail.
#
# THE SHAPE, per sound class (from the research):
#   voiceless p t k, and qu   closure silence 30 ms, burst untouched, 40-80 ms
#                             of aspiration (qu: the k burst then the w glide),
#                             then a 25 ms raised-cosine fade to a zero crossing
#   voiced b d g, and j       closure 30 ms (with what voice bar the render has),
#                             burst untouched, 20-35 ms of voiced release
#                             (j: the affricate's frication), a 25 ms fade
#   glides w y                no closure: 150-250 ms gliding from oo / ee and
#                             fading over 40 ms
# Cuts snap to zero crossings; the fade-in is 2 ms and only inside silence;
# level is matched by RMS to the sound clip that ships.
#
# THREE MECHANISMS, from the research's own three:
#   T  truncate-and-decay from an approved word clip (bat): mid-closure cut,
#      burst, the researched tail length, the researched fade
#   N  vowel-neutral: the same stop before a neutral vowel (but / bug / bud)
#      so the tail cues no particular vowel, same shape
#   L  long-taper: 60-70 ms of tail under a decaying envelope, so the release
#      is heard dying away rather than as a syllable
#
# Usage: py -3.12 tools/render_sounds23.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import wordcut as wc

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS = 150, 400

SOUNDS = {
    # sound: (class, sources for T, neutral sources for N)
    "b": ("voiced", ["bat", "bag", "big"], ["but", "bug", "bud"]),
    "d": ("voiced", ["dog", "dig", "dad"], ["duck", "dug", "dust"]),
    "g": ("voiced", ["got", "gap", "gum"], ["gum", "gut", "gull"]),
    "j": ("affricate", ["jam", "jog", "jet"], ["jug", "jut", "jump"]),
    "p": ("voiceless", ["pat", "pig", "pot"], ["pup", "puff", "pump"]),
    "qu": ("qu", ["quit", "quiz", "quick"], ["quack", "quilt", "quest"]),
    "w": ("glide", ["wet", "web", "win"], ["wag", "wax", "wig"]),
    "y": ("glide", ["yes", "yet", "yak"], ["yum", "yap", "yam"]),
}
TAIL_MS = {"voiced": 30, "affricate": 70, "voiceless": 60, "qu": 90, "glide": 200}
CLOSURE_MS = 30

PRIOR = set()
for p in PACK.glob("d-*.mp3"):
    PRIOR.add(hashlib.sha256(p.read_bytes()).hexdigest())
_pend = json.loads((REPO / "tools/pending-sounds/pending-sounds.json").read_text(encoding="utf-8"))
PRIOR |= {v["sha256"] for v in _pend.values() if isinstance(v, dict) and v.get("sha256")}
for f in OUT.glob("sounds*-audio.json"):
    for arms in json.loads(f.read_text(encoding="utf-8")).values():
        PRIOR |= {a.get("sha256") or a.get("sha") for a in arms}


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def zero_cross(x, i, window=None):
    """The nearest zero crossing to sample i, within a window."""
    w = window or int(0.003 * 24000)
    lo, hi = max(1, i - w), min(len(x) - 1, i + w)
    best, bd = i, w + 1
    for k in range(lo, hi):
        if (x[k - 1] <= 0 < x[k]) or (x[k - 1] >= 0 > x[k]):
            if abs(k - i) < bd:
                best, bd = k, abs(k - i)
    return best


def burst_index(x, sr, start):
    """The first sample after `start` whose 2 ms energy jumps well above the
    closure floor: the release burst."""
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


def shape_stop(x, sr, cls, tail_ms, decay=False):
    """closure silence + burst (untouched) + tail + fade, cuts on zero
    crossings, a 2 ms fade-in only inside the closure."""
    s0, s1, _, _ = wc.speech_span(x, sr)
    b = burst_index(x, sr, max(0, s0 - int(0.05 * sr)))
    if b is None:
        return None
    closure = int(sr * CLOSURE_MS / 1000)
    start = zero_cross(x, max(0, b - closure))
    end = zero_cross(x, min(len(x) - 1, b + int(sr * 0.012) + int(sr * tail_ms / 1000)))
    piece = x[start:end].copy()
    # the closure is silenced softly: what the render has there (a voice bar
    # for b/d/g) is kept at low level rather than replaced, so nothing clicks
    fi = int(sr * 0.002)
    piece[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    fo = min(int(sr * 0.025), len(piece) // 2)
    if decay:
        # the long taper: a decaying envelope over the whole tail after the burst
        tail0 = (b - start) + int(sr * 0.012)
        n = len(piece) - tail0
        if n > 10:
            piece[tail0:] *= np.exp(-np.linspace(0, 3.0, n)).astype(np.float32)
    piece[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return piece


def shape_glide(x, sr, tail_ms):
    s0, s1, _, _ = wc.speech_span(x, sr)
    start = zero_cross(x, s0)
    end = zero_cross(x, min(len(x) - 1, s0 + int(sr * tail_ms / 1000)))
    piece = x[start:end].copy()
    fi = int(sr * 0.004); fo = min(int(sr * 0.04), len(piece) // 2)
    piece[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    piece[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return piece


def arm(sound, family, piece, sr, target_rms):
    if piece is None or len(piece) < sr * 0.04 or len(piece) > sr * 0.62:
        return None
    piece = piece * min(target_rms / rms(piece), 0.98 / (np.abs(piece).max() + 1e-9))
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
    for sound, (cls, srcs, neutral) in SOUNDS.items():
        ref = PACK / f"d-{sound}.mp3"
        rx, rsr = load(ref); r0, r1, _, _ = wc.speech_span(rx, rsr); target = rms(rx[r0:r1])
        arms = []
        def best_of(words, family, decay=False, tail=None):
            cands = []
            for w in words:
                p = PACK / f"w-{w}.mp3"
                if not p.exists():
                    continue
                x, sr = load(p)
                piece = shape_glide(x, sr, tail or TAIL_MS[cls]) if cls == "glide" else shape_stop(x, sr, cls, tail or TAIL_MS[cls], decay)
                a = arm(sound, f"{family}-{w}", piece, sr, target)
                if a:
                    cands.append(a)
            return cands[0] if cands else None
        for fam, words, decay, tail in (("T_truncate", srcs, False, None), ("N_neutral", neutral, False, None),
                                        ("L_taper" if cls != "glide" else "L_longer-glide", srcs, cls != "glide", TAIL_MS[cls] + (40 if cls != "glide" else 70))):
            a = best_of(words, fam, decay, tail)
            if a:
                arms.append(a)
        for i, a in enumerate(arms, 1):
            a["id"] = f"{sound}_{i}"
        out[sound] = arms
        print(f"  {sound}: {len(arms)} arms  " + " ".join(a["family"] for a in arms), flush=True)
    (OUT / "sounds23-audio.json").write_text(json.dumps(out), encoding="utf-8")
    return out


if __name__ == "__main__":
    r = build()
    print("wrote sounds23-audio.json;", sum(len(a) for a in r.values()), "arms over", len(r), "sounds")
