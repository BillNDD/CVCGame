# Sound round 20: the bake's /h/ recipe, built in full, against the accepted h.
#
# The owner pointed out that ACCEPTED_SOUND_BAKE_RECIPES.md contains a recipe
# for /h/ and that I used only half of it. They are right. The recipe has two
# parts and I built one:
#
#   base:   "Second-pass Option B natural-grain extension, 195 ms"   <- NOT built
#   edges:  fade-in 20 ms, fade-out 38 ms, 2 ms smoothing window,
#           entrance 35 ms at 0.45, release 45 ms at 0.55            <- built
#
# I implemented the edge half as feather() in round 14 and applied it to all
# thirteen sounds - which is how b, d, y, short_e and short_u closed - but never
# built /h/'s own base. I used grain extension only for ng, never for the sound
# whose recipe it came from. Its stated purpose is exactly the fault the owner
# kept naming: "preserve the natural breath centre, avoid the rejected bright
# snake-hiss character".
#
# WHAT "NATURAL-GRAIN EXTENSION" MEANS is spelled out only in the accepted /n/
# entry, and those numbers are used here verbatim:
#
#   split frequency 1,200 Hz     filter order 6
#   low-band seed 7701           high-band seed 8812
#   grain length 24 ms           grain hop 7 ms
#   onset crossfade 336 samples  release crossfade 384    release fade 672
#   release curve cos(theta)^1.2
#
# The band split with INDEPENDENT seeds is the part that matters. Grain-shuffling
# a breath as one signal leaves an audible periodicity - the "motorboating" the
# /z/ entry says stretched versions were rejected for. Splitting at 1.2 kHz and
# shuffling each band on its own seed decorrelates them, which is what makes the
# result read as breath rather than as a loop.
#
# h_1 on the card is the h the owner ACCEPTED on round 19, unchanged, so this is
# a straight comparison rather than a fresh field.
#
# Usage: python render_sounds20.py <out_dir>
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

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
UP = pathlib.Path("/root/.claude/uploads/e6f72ac3-eaf2-5b4a-aa69-540f121df052")
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SR = 24000
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0

# every number below is quoted from the md, not chosen here
SPLIT_HZ, FILT_ORDER = 1200, 6
SEED_LOW, SEED_HIGH = 7701, 8812
GRAIN_MS, HOP_MS = 24, 7
ONSET_XF, RELEASE_XF, RELEASE_FADE = 336, 384, 672
FADE_IN_MS, FADE_OUT_MS = 20, 38
SMOOTH_WIN_MS = 2.0
ENT_MS, ENT_MIX, REL_MS, REL_MIX = 35, 0.45, 45, 0.55
BASE_MS = 195


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def resample(a, sr, to=SR):
    if sr == to:
        return np.asarray(a, np.float32)
    idx = np.clip((np.arange(int(len(a) * to / sr)) * sr / to).astype(int), 0, len(a) - 1)
    return a[idx].astype(np.float32)


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def band_split(a, sr, hz=SPLIT_HZ, order=FILT_ORDER):
    """A linear-phase split at the recipe's 1,200 Hz. `order` scales the
    kernel length, standing in for the recipe's filter order."""
    n = 64 * order + 1
    t = np.arange(n) - (n - 1) / 2
    lp = np.sinc(2 * hz / sr * t) * np.hanning(n)
    lp /= lp.sum()
    low = np.convolve(a, lp, mode="same").astype(np.float32)
    return low, (a - low).astype(np.float32)


def grain_extend(seed_audio, sr, target_ms, seed):
    """The recipe's natural-grain extension: 24 ms grains at a 7 ms hop, drawn
    in a SHUFFLED order from the source. Shuffling is what makes it "natural"
    rather than a loop - a loop repeats and the ear hears the period."""
    g = int(sr * GRAIN_MS / 1000)
    hop = int(sr * HOP_MS / 1000)
    if len(seed_audio) < g + 4:
        return None
    rng = np.random.default_rng(seed)
    win = np.hanning(g).astype(np.float32)
    n_out = int(sr * target_ms / 1000)
    out = np.zeros(n_out + g, np.float32)
    norm = np.zeros_like(out)
    starts = np.arange(0, len(seed_audio) - g, max(1, hop // 2))
    pos = 0
    while pos + g < len(out):
        s0 = int(rng.choice(starts))
        out[pos:pos + g] += seed_audio[s0:s0 + g] * win
        norm[pos:pos + g] += win
        pos += hop
    return (out[:n_out] / np.maximum(norm[:n_out], 1e-6)).astype(np.float32)


def natural_grain_extension(src, sr, target_ms, seeds=(SEED_LOW, SEED_HIGH)):
    """Split, extend each band on its OWN seed, recombine. Independent seeds
    decorrelate the bands, which is what stops the result reading as a loop -
    the "motorboating" the /z/ entry says stretched versions were rejected for."""
    low, high = band_split(src, sr)
    lo = grain_extend(low, sr, target_ms, seeds[0])
    hi = grain_extend(high, sr, target_ms, seeds[1])
    if lo is None or hi is None:
        return None
    out = (lo + hi).astype(np.float32)
    # the recipe's onset and release crossfades, in samples
    a = min(ONSET_XF, len(out) // 3)
    b = min(RELEASE_XF, len(out) // 3)
    f = min(RELEASE_FADE, len(out) // 2)
    if a > 1:
        out[:a] *= np.linspace(0, 1, a)
    if b > 1:
        out[-b:] *= np.linspace(1, 0.6, b)
    if f > 1:                       # release curve cos(theta)^1.2
        th = np.linspace(0, np.pi / 2, f)
        out[-f:] *= (np.cos(th) ** 1.2).astype(np.float32)
    return out


def feather_h(a, sr):
    """The /h/ entry's edge treatment, its numbers exactly."""
    a = np.asarray(a, np.float32).copy()
    n = max(3, int(sr * SMOOTH_WIN_MS / 1000) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    lp = np.convolve(a, kk, mode="same").astype(np.float32)
    ne = min(int(sr * ENT_MS / 1000), len(a) // 2)
    nr = min(int(sr * REL_MS / 1000), len(a) // 2)
    if ne > 1:
        m = ENT_MIX * (1 - np.linspace(0, 1, ne)); a[:ne] = (1 - m) * a[:ne] + m * lp[:ne]
    if nr > 1:
        m = REL_MIX * np.linspace(0, 1, nr); a[-nr:] = (1 - m) * a[-nr:] + m * lp[-nr:]
    fi = min(int(sr * FADE_IN_MS / 1000), len(a) // 3)
    fo = min(int(sr * FADE_OUT_MS / 1000), len(a) // 3)
    if fi > 1:
        a[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))).astype(np.float32)
    if fo > 1:
        a[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return a


def pad(a, sr):
    a = a * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(a).max()), 1e-6))
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


# the reference the owner supplied, and the h they accepted on round 19
ref_raw, rsr = load(UP / "0fc5f827-h.mp4")
ref = G.core(resample(ref_raw[int(17.23 * rsr):int(17.44 * rsr)], rsr), SR)
b19 = json.loads((ROUNDS / "out-snd19" / "batch-data.json").read_text(encoding="utf-8"))
accepted = next(a for i in b19["items"] if i["text"] == "h"
                for a in i["arms"] if a["id"] == "h_4")

arms = [
    {"id": "h_1", "family": "ACCEPTED-round19-unchanged", "ms": accepted["ms"],
     "b64": accepted["b64"], "sha": accepted["sha"]},
    {"id": "h_2", "family": "REFERENCE-yours", "ms": int(len(ref) / SR * 1000),
     "b64": "", "sha": ""},
]
mp3, ms = encode(pad(feather_h(ref, SR), SR), SR)
arms[1].update(b64=base64.b64encode(mp3).decode(), sha=hashlib.sha256(mp3).hexdigest(), ms=ms)

# the breath the extension is grown from: real af_heart frication, no owner voice
seeds = []
for w in ("hat", "hum", "hen", "hop", "hut", "hug"):
    p = PACK / f"w-{w}.mp3"
    if not p.exists():
        continue
    c = av.open(str(p)); s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    psr = s.codec_context.sample_rate; c.close()
    x = x / 32768.0 if np.abs(x).max() > 2 else x
    s0, s1, _, _ = wc.speech_span(x, psr)
    run = G.unvoiced_run(resample(x[s0:s0 + int(psr * 0.28)], psr), SR)
    if run is not None and len(run) > int(SR * 0.03):
        seeds.append((w, run))
print(f"breath seeds found: {[w for w, _ in seeds]}")

built = []
for w, seed in seeds:
    for target in (BASE_MS, 210):
        base = natural_grain_extension(seed, SR, target)
        if base is None:
            continue
        out = feather_h(base, SR)
        ok, why, d = G.verify_sound(G.core(out, SR), ref, SR, kind="voiced", form="citation")
        tag = f"bake-h-full-{w}-{target}ms"
        if not ok:
            print(f"  refused {tag}: {why}")
            continue
        built.append((tag, out, d))
built.sort(key=lambda r: r[2])
for tag, out, d in built:
    mp3, ms = encode(pad(out, SR), SR)
    sha = hashlib.sha256(mp3).hexdigest()
    arms.append({"id": f"h_{len(arms) + 1}", "family": f"{tag}-d{d:.3f}", "ms": ms,
                 "b64": base64.b64encode(mp3).decode(), "sha": sha})
    if len(arms) >= 10:
        break

print(f"\n{len(arms)} arms: {[a['family'] for a in arms]}")
(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 20 — the bake's /h/ recipe built in full, against the h you accepted",
    "tally": ("Every sound is closed; this is a comparison, not an open question. h_1 is the "
              "h you accepted on round 19, unchanged. h_2 is your reference. The rest are the "
              "md's own /h/ recipe built completely."),
    "items": [{"kind": "word", "text": "h",
               "note": ("you were right that the md has a recipe for /h/ and that I used only "
                        "half of it. Its base is \"natural-grain extension, 195 ms\" — 24 ms "
                        "grains at a 7 ms hop, band-split at 1,200 Hz with a separate seed per "
                        "band, cos^1.2 release — and I built only its EDGES. h_1 is the h you "
                        "accepted, unchanged; h_2 is your reference; the rest are the full "
                        "recipe. If none beats h_1, the accepted one stays."),
               "how": "a light quick breath · as in hat",
               "reject": "snake-hiss, a loop you can hear, or any other sound around it",
               "arms": arms}]}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
