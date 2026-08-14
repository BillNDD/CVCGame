# Sound round 21: /h/ matched on SPECTRAL BALANCE, which is what was wrong.
#
# The owner recorded themselves clicking the reference and then each of my
# options, in one take, through one playback chain. Measuring that recording
# removes every variable between us, and it says one thing very plainly:
#
#                        centroid      energy 2-6 kHz
#   the reference        ~1470 Hz      0.12 - 0.18
#   my options           ~1960 Hz      0.48 - 0.59
#
# My /h/ carries three to four times the energy in the 2-6 kHz band. That is
# the "bright snake-hiss character" the md's own /h/ recipe names as REJECTED -
# I had been building the exact thing it warns against, round after round.
#
# WHY FORMANT MATCHING NEVER CAUGHT IT. F1, F2 and F3 are peak POSITIONS. Two
# sounds can have their peaks in the same places and completely different
# spectral BALANCE - one dark, one hissy - because balance lives in the tilt
# and in the energy between the peaks, which formant tracking does not measure.
# Every round so far matched positions. None matched balance.
#
# THE FIX is a long-term average spectrum match. Take the reference's average
# spectrum and the candidate's, derive the per-band gain that turns one into
# the other, smooth it so it shapes rather than fingerprints, and apply it.
# After it, the candidate's average spectrum IS the reference's, so brightness,
# tilt and the 2-6 kHz band all follow by construction rather than by luck.
# Then the /h/ recipe's own edges, unchanged.
#
# Each arm is measured after encoding and carries its achieved centroid and
# 2-6 kHz fraction in its name, so the fix can be checked rather than believed.
#
# Usage: python render_sounds21.py <out_dir>
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
SR, NFFT = 24000, 1024
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0
# the /h/ entry's edge numbers, unchanged
FADE_IN_MS, FADE_OUT_MS, SMOOTH_WIN_MS = 20, 38, 2.0
ENT_MS, ENT_MIX, REL_MS, REL_MIX = 35, 0.45, 45, 0.55
# the /n/ entry's grain numbers, unchanged
SPLIT_HZ, SEED_LOW, SEED_HIGH, GRAIN_MS, HOP_MS = 1200, 7701, 8812, 24, 7


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


def ltas(a, sr, nfft=NFFT):
    """Long-term average spectrum: the sound's overall balance, which is what
    "bright" and "dark" actually are. Formant tracking cannot see it."""
    win, hop = nfft, nfft // 4
    if len(a) < win:
        a = np.pad(a, (0, win - len(a)))
    w = np.hanning(win).astype(np.float32)
    fr = np.stack([a[i:i + win] * w for i in range(0, len(a) - win + 1, hop)])
    S = (np.abs(np.fft.rfft(fr, n=nfft, axis=1)) ** 2).mean(axis=0)
    return S / (S.sum() + 1e-12)


def match_ltas(a, sr, target, smooth_bins=9):
    """Give `a` the target's average spectrum. The per-band gain is smoothed so
    it shapes the sound rather than stamping the reference's fine structure
    onto it - the aim is the same balance, not a copy."""
    src = ltas(a, sr)
    g = np.sqrt((target + 1e-10) / (src + 1e-10))
    k = np.hanning(smooth_bins); k /= k.sum()
    g = np.convolve(g, k, mode="same")
    g = np.clip(g, 0.05, 20.0)
    win, hop = NFFT, NFFT // 4
    if len(a) < win:
        a = np.pad(a, (0, win - len(a)))
    w = np.hanning(win).astype(np.float32)
    out = np.zeros(len(a) + win, np.float32)
    norm = np.zeros_like(out)
    for i in range(0, len(a) - win + 1, hop):
        seg = a[i:i + win] * w
        S = np.fft.rfft(seg, n=NFFT)
        y = np.fft.irfft(S * g, n=NFFT).astype(np.float32)[:win]
        out[i:i + win] += y * w
        norm[i:i + win] += w * w
    return (out[:len(a)] / np.maximum(norm[:len(a)], 1e-6)).astype(np.float32)


def band_split(a, sr, hz=SPLIT_HZ, order=6):
    n = 64 * order + 1
    t = np.arange(n) - (n - 1) / 2
    lp = np.sinc(2 * hz / sr * t) * np.hanning(n); lp /= lp.sum()
    low = np.convolve(a, lp, mode="same").astype(np.float32)
    return low, (a - low).astype(np.float32)


def grain_extend(src, sr, target_ms, seed):
    g, hop = int(sr * GRAIN_MS / 1000), int(sr * HOP_MS / 1000)
    if len(src) < g + 4:
        return None
    rng = np.random.default_rng(seed)
    win = np.hanning(g).astype(np.float32)
    n_out = int(sr * target_ms / 1000)
    out = np.zeros(n_out + g, np.float32); norm = np.zeros_like(out)
    starts = np.arange(0, len(src) - g, max(1, hop // 2))
    pos = 0
    while pos + g < len(out):
        s0 = int(rng.choice(starts))
        out[pos:pos + g] += src[s0:s0 + g] * win
        norm[pos:pos + g] += win
        pos += hop
    return (out[:n_out] / np.maximum(norm[:n_out], 1e-6)).astype(np.float32)


def natural_grain(src, sr, target_ms):
    low, high = band_split(src, sr)
    lo = grain_extend(low, sr, target_ms, SEED_LOW)
    hi = grain_extend(high, sr, target_ms, SEED_HIGH)
    if lo is None or hi is None:
        return None
    out = (lo + hi).astype(np.float32)
    f = min(672, len(out) // 2)
    if f > 1:
        out[-f:] *= (np.cos(np.linspace(0, np.pi / 2, f)) ** 1.2).astype(np.float32)
    return out


def feather_h(a, sr):
    a = np.asarray(a, np.float32).copy()
    n = max(3, int(sr * SMOOTH_WIN_MS / 1000) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    lp = np.convolve(a, kk, mode="same").astype(np.float32)
    ne = min(int(sr * ENT_MS / 1000), len(a) // 2); nr = min(int(sr * REL_MS / 1000), len(a) // 2)
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


def report(a, sr):
    S = np.abs(np.fft.rfft(a * np.hanning(len(a)).astype(np.float32), n=8192)) ** 2
    f = np.fft.rfftfreq(8192, 1 / sr); t = S.sum() + 1e-12
    return float((f * S).sum() / t), float(S[(f > 2000) & (f < 6000)].sum() / t)


def pad(a, sr):
    a = a * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(a).max()), 1e-6))
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


# THE TARGET comes from the owner's own playback recording, because that is the
# thing they are comparing against - events 0 to 3 of h_failure.mp4 are the
# reference, played through their speakers, and their average spectrum is what
# a candidate has to have.
fail, fsr = load(UP / "85c3075d-h_failure.mp4")
ref_events = [(1.16, 1.47), (2.23, 2.54), (9.88, 10.19), (11.39, 11.70)]
ref_pieces = [resample(fail[int(a * fsr):int(b * fsr)], fsr) for a, b in ref_events]
target = np.mean([ltas(p, SR) for p in ref_pieces], axis=0)
rc, rh = report(ref_pieces[0], SR)
print(f"target from the owner's playback: centroid {rc:.0f} Hz, 2-6 kHz {rh:.3f}")

# the reference cut from the original recording, for the card
raw, rsr = load(UP / "0fc5f827-h.mp4")
ref = G.core(resample(raw[int(17.23 * rsr):int(17.44 * rsr)], rsr), SR)

b19 = json.loads((ROUNDS / "out-snd19" / "batch-data.json").read_text(encoding="utf-8"))
accepted = next(a for i in b19["items"] if i["text"] == "h"
                for a in i["arms"] if a["id"] == "h_4")
arms = [{"id": "h_1", "family": "ACCEPTED-round19-unchanged", "ms": accepted["ms"],
         "b64": accepted["b64"], "sha": accepted["sha"]}]
mp3, ms = encode(pad(feather_h(ref, SR), SR), SR)
arms.append({"id": "h_2", "family": "REFERENCE-yours", "ms": ms,
             "b64": base64.b64encode(mp3).decode(), "sha": hashlib.sha256(mp3).hexdigest()})

built = []
for w in ("hat", "hum", "hen", "hop", "hut", "hug", "hid"):
    p = PACK / f"w-{w}.mp3"
    if not p.exists():
        continue
    x, psr = load(p)
    s0, s1, _, _ = wc.speech_span(x, psr)
    run = G.unvoiced_run(resample(x[s0:s0 + int(psr * 0.28)], psr), SR)
    if run is None or len(run) < int(SR * 0.03):
        continue
    for target_ms in (195, 240, 300):
        base = natural_grain(run, SR, target_ms)
        if base is None:
            continue
        for sm, tag in ((9, "shaped"), (21, "gentle"), (5, "tight")):
            out = feather_h(match_ltas(base, SR, target, sm), SR)
            cen, hi = report(G.core(out, SR), SR)
            built.append((f"ltas-{w}-{target_ms}ms-{tag}-c{cen:.0f}-h{hi:.2f}", out,
                          abs(cen - rc) / rc + abs(hi - rh)))
built.sort(key=lambda r: r[2])
for fam, out, err in built:
    mp3, ms = encode(pad(out, SR), SR)
    arms.append({"id": f"h_{len(arms) + 1}", "family": fam, "ms": ms,
                 "b64": base64.b64encode(mp3).decode(),
                 "sha": hashlib.sha256(mp3).hexdigest()})
    if len(arms) >= 10:
        break

for a in arms:
    t = OUT / "_v.mp3"; t.write_bytes(base64.b64decode(a["b64"]))
    y, ysr = load(t)
    cen, hi = report(G.core(y, ysr), ysr)
    print(f"  {a['id']:5} {a['family'][:40]:42} centroid {cen:5.0f}  2-6kHz {hi:.3f}")
(OUT / "_v.mp3").unlink(missing_ok=True)

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 21 — h matched on spectral balance, not just formants",
    "tally": ("Your playback recording measured it: the reference sits at centroid ~1470 Hz "
              "with 0.12-0.18 of its energy in 2-6 kHz; my options were ~1960 Hz and "
              "0.48-0.59. Three to four times too bright — the \"snake-hiss\" the recipe "
              "warns against."),
    "items": [{"kind": "word", "text": "h",
               "note": ("your video gave me both sounds in one playback chain, and the "
                        "answer was brightness: my /h/ had 3 to 4 times the energy in 2-6 kHz. "
                        "Formant matching cannot see that — F1/F2/F3 are peak POSITIONS, and "
                        "brightness is spectral BALANCE. These match the reference's whole "
                        "average spectrum, so the balance follows by construction. h_1 is the "
                        "h you accepted, h_2 is your reference; each other name carries its "
                        "measured centroid and 2-6 kHz fraction."),
               "how": "a light quick breath · as in hat",
               "reject": "bright snake-hiss, a loop you can hear, or any other sound around it",
               "arms": arms}]}), encoding="utf-8")
print("\nwrote", OUT / "batch-data.json")
