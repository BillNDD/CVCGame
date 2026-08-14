# How far is this candidate from a clip we already know is right?
#
# WHY THIS IS NOT A FOURTH FAILED PROXY. docs/settled.md closes three attempts
# to predict a VERDICT from a number — duration, tail jitter and harmonic-to-
# noise ratio, irregularity — and says not to look for a fourth. This asks a
# different question. Not "will the owner like it", which is not measurable,
# but "how far is it from a clip the owner already accepted", which is. The
# rule that follows is the same one the round guard lives by: use it to REFUSE
# a candidate that is plainly not the same sound, never to conclude that one is
# good. The ear still decides.
#
# The owner asked for this on 2026-08-12 after refusing three fields for the
# word "a": "make a list of parameters that should be close to those of the
# reference", then "run every measurement against the accepted clips already in
# the pack to learn what close actually means, rather than inventing
# thresholds", and against refused material so the separation is checked rather
# than assumed.
#
# Usage:
#   python3 tools/clip_compare.py <reference.mp3> <candidate.mp3> [...]
#   python3 tools/clip_compare.py --calibrate d:schwa    what "close" means
#   python3 tools/clip_compare.py --self-test
import json
import pathlib
import sys

import av
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def _frames(a, sr, hop_ms=10):
    n = max(1, int(sr * hop_ms / 1000))
    return np.array([np.sqrt(np.mean(a[i:i + n].astype(np.float64) ** 2))
                     for i in range(0, max(1, len(a) - n + 1), n)]), n


def speech_span(a, sr, floor_db=-45.0):
    rms, n = _frames(a, sr)
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    if not len(on):
        return 0, len(a)
    return int(on.min()) * n, (int(on.max()) + 1) * n


def _lpc(sig, order):
    """Levinson-Durbin, the same one the sound rounds used."""
    sig = sig - sig.mean()
    r = np.correlate(sig, sig, "full")[len(sig) - 1:len(sig) + order]
    if r[0] <= 0:
        return None
    a = np.zeros(order + 1); a[0] = 1.0; e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + sum(a[j] * r[i - j] for j in range(1, i))
        kk = -acc / e; an = a.copy()
        for j in range(1, i):
            an[j] = a[j] + kk * a[i - j]
        an[i] = kk; a = an; e *= (1 - kk * kk)
        if e <= 0:
            return None
    return a


def formants(seg, sr):
    """F1, F2, F3 as the frame-by-frame MEDIAN. settled.md, 2026-08-11:
    "Measure a formant as a frame-by-frame MEDIAN, never from one window" —
    one window of a glide is not the glide."""
    d = max(1, int(sr / 10000)); fs = sr / d
    order = int(2 + fs / 1000)
    win, hop = int(sr * 0.030), int(sr * 0.005)
    rows = []
    for i in range(0, max(1, len(seg) - win), hop):
        s = seg[i:i + win][::d]
        if len(s) < 64:
            continue
        s = s * np.hamming(len(s)); s = np.append(s[0], s[1:] - 0.97 * s[:-1])
        a = _lpc(s, order)
        if a is None:
            continue
        o = []
        for rt in np.roots(a):
            if np.imag(rt) < 0.01:
                continue
            f = np.arctan2(np.imag(rt), np.real(rt)) * fs / (2 * np.pi)
            bw = -0.5 * (fs / (2 * np.pi)) * np.log(max(np.abs(rt), 1e-9))
            if 90 < f < 5000 and bw < 700:
                o.append(f)
        o = sorted(o)[:3]
        if len(o) == 3:
            rows.append(o)
    if not rows:
        return None
    A = np.array(rows)
    return [int(np.median(A[:, 0])), int(np.median(A[:, 1])), int(np.median(A[:, 2]))]


def f0_track(seg, sr, fmin=70, fmax=350):
    """Autocorrelation pitch per frame. Only frames with a clear peak count, so
    an unvoiced stretch does not invent a pitch."""
    win, hop = int(sr * 0.040), int(sr * 0.010)
    out = []
    for i in range(0, max(1, len(seg) - win), hop):
        s = seg[i:i + win] - np.mean(seg[i:i + win])
        if np.sqrt(np.mean(s ** 2)) < 1e-4:
            continue
        r = np.correlate(s, s, "full")[len(s) - 1:]
        lo, hi = int(sr / fmax), int(sr / fmin)
        if hi >= len(r):
            continue
        k = lo + int(np.argmax(r[lo:hi]))
        if r[0] > 0 and r[k] / r[0] > 0.3:
            out.append(sr / k)
    return np.array(out)


def spectrum(seg, sr):
    w = seg * np.hanning(len(seg))
    S = np.abs(np.fft.rfft(w, n=max(2048, len(w))))
    f = np.fft.rfftfreq(max(2048, len(w)), 1 / sr)
    p = S ** 2
    tot = p.sum() + 1e-12
    centroid = float((f * p).sum() / tot)
    c = np.cumsum(p) / tot
    rolloff = float(f[int(np.searchsorted(c, 0.85))])
    # tilt: dB per octave, fitted over the speech band
    band = (f > 100) & (f < 6000)
    lf, ldb = np.log2(f[band] + 1e-9), 20 * np.log10(S[band] + 1e-12)
    tilt = float(np.polyfit(lf, ldb, 1)[0])
    return centroid, rolloff, tilt


def mel(seg, sr, n_mel=24):
    """A coarse mel spectrum, unit-normalised — for a timbre distance."""
    w = seg * np.hanning(len(seg))
    S = np.abs(np.fft.rfft(w, n=max(2048, len(w))))
    f = np.fft.rfftfreq(max(2048, len(w)), 1 / sr)
    m = 2595 * np.log10(1 + f / 700)
    edges = np.linspace(m.min(), min(m.max(), 2595 * np.log10(1 + 7600 / 700)), n_mel + 1)
    out = np.array([S[(m >= edges[i]) & (m < edges[i + 1])].sum() for i in range(n_mel)])
    out = np.log(out + 1e-9)
    return (out - out.mean()) / (np.std(out) + 1e-9)


def envelope(a, sr, n=32):
    """The loudness shape, resampled to a fixed length so two clips of
    different duration can still be compared on SHAPE alone."""
    rms, _ = _frames(a, sr, hop_ms=5)
    if len(rms) < 2:
        return np.zeros(n)
    x = np.interp(np.linspace(0, len(rms) - 1, n), np.arange(len(rms)), rms)
    return x / (x.max() + 1e-12)


def measure(path):
    """Every parameter on the owner's list, for one clip."""
    a, sr = load(path)
    s0, s1 = speech_span(a, sr)
    seg = a[s0:s1]
    if len(seg) < int(sr * 0.02):
        seg = a
    rms = float(np.sqrt(np.mean(seg.astype(np.float64) ** 2)))
    peak = float(np.abs(seg).max())
    env = envelope(seg, sr)
    fr, n = _frames(seg, sr, hop_ms=5)
    thr = fr.max() * 0.5 if len(fr) else 0
    attack = float(np.argmax(fr >= thr) * 5) if len(fr) else 0.0
    decay = float((len(fr) - 1 - np.argmax(fr[::-1] >= thr)) * 5) if len(fr) else 0.0
    cen, roll, tlt = spectrum(seg, sr)
    F = formants(seg, sr)
    f0 = f0_track(seg, sr)
    # timbre drift: first half against second half, to catch a neighbour
    half = len(seg) // 2
    drift = float(np.linalg.norm(mel(seg[:half], sr) - mel(seg[half:], sr))) if half > 64 else 0.0
    return {
        "file": str(path),
        "total_ms": round(len(a) / sr * 1000),
        "speech_ms": round(len(seg) / sr * 1000),
        "lead_ms": round(s0 / sr * 1000),
        "tail_ms": round((len(a) - s1) / sr * 1000),
        "attack_ms": round(attack), "decay_ms": round(len(seg) / sr * 1000 - decay),
        "peak_dbfs": round(20 * np.log10(max(peak, 1e-9)), 1),
        "rms_dbfs": round(20 * np.log10(max(rms, 1e-9)), 1),
        "crest": round(peak / (rms + 1e-12), 2),
        "peak_at": round(float(np.argmax(env)) / (len(env) - 1), 2),
        "F1": F[0] if F else None, "F2": F[1] if F else None, "F3": F[2] if F else None,
        "centroid_hz": round(cen), "rolloff_hz": round(roll), "tilt_db_oct": round(tlt, 2),
        "f0_mean": round(float(np.median(f0)), 1) if len(f0) else None,
        "f0_range": round(float(np.percentile(f0, 90) - np.percentile(f0, 10)), 1) if len(f0) > 3 else None,
        "timbre_drift": round(drift, 2),
        "_env": env.tolist(), "_mel": mel(seg, sr).tolist(),
    }


def compare(ref, cand):
    """Distances, one per parameter the owner listed. Every one is a plain
    difference in the parameter's own units, so a number can be argued with."""
    d = {}
    for k in ("speech_ms", "total_ms", "attack_ms", "peak_dbfs", "rms_dbfs",
              "crest", "peak_at", "centroid_hz", "rolloff_hz", "tilt_db_oct",
              "f0_mean", "f0_range", "timbre_drift"):
        if ref.get(k) is None or cand.get(k) is None:
            d["d_" + k] = None
        else:
            d["d_" + k] = round(cand[k] - ref[k], 2)
    for k in ("F1", "F2", "F3"):
        d["d_" + k] = None if ref.get(k) is None or cand.get(k) is None else cand[k] - ref[k]
    re_, ce = np.array(ref["_env"]), np.array(cand["_env"])
    d["env_corr"] = round(float(np.corrcoef(re_, ce)[0, 1]), 3)
    d["mel_dist"] = round(float(np.linalg.norm(np.array(ref["_mel"]) - np.array(cand["_mel"]))), 2)
    # one headline number for vowel identity, in the space that defines a vowel
    if ref.get("F1") and cand.get("F1"):
        d["formant_dist"] = round(float(np.hypot(cand["F1"] - ref["F1"], cand["F2"] - ref["F2"])), 1)
    else:
        d["formant_dist"] = None
    return d


def pack_sounds():
    man = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    return {k: PACK / v["file"] for k, v in man.items() if k.startswith("d:")}


def calibrate(ref_id="d:schwa"):
    """What does "close" mean? Measure the reference against every OTHER
    accepted sound in the pack. Those are all clips the owner approved, and
    they are all DIFFERENT sounds, so the distances between them are the scale
    on which "a different sound" is measured. A candidate for "a" must sit far
    below the nearest of them."""
    sounds = pack_sounds()
    ref = measure(sounds[ref_id])
    rows = []
    for k, p in sorted(sounds.items()):
        if k == ref_id:
            continue
        rows.append((k, compare(ref, measure(p))))
    return ref, rows


if __name__ == "__main__":
    if "--calibrate" in sys.argv:
        rid = sys.argv[sys.argv.index("--calibrate") + 1] if len(sys.argv) > sys.argv.index("--calibrate") + 1 else "d:schwa"
        ref, rows = calibrate(rid)
        print(f"REFERENCE {rid}: " + json.dumps({k: v for k, v in ref.items() if not k.startswith("_")}, indent=1))
        rows.sort(key=lambda r: (r[1]["formant_dist"] is None, r[1]["formant_dist"] or 0))
        print(f'\n{"sound":10} {"formants":>9} {"mel":>6} {"env":>6} {"d speech":>9} {"d rms":>7}')
        for k, d in rows:
            print(f'{k:10} {str(d["formant_dist"]):>9} {d["mel_dist"]:6.2f} {d["env_corr"]:6.3f} '
                  f'{str(d["d_speech_ms"]):>9} {str(d["d_rms_dbfs"]):>7}')
        near = [d["formant_dist"] for _, d in rows if d["formant_dist"] is not None]
        print(f"\nnearest OTHER accepted sound is {min(near):.0f} Hz away in the F1/F2 plane;")
        print(f"median across the pack's sounds is {np.median(near):.0f} Hz.")
        sys.exit(0)
    if len(sys.argv) < 3:
        print(__doc__ or "usage: clip_compare.py <reference> <candidate> [...]")
        sys.exit(2)
    ref = measure(pathlib.Path(sys.argv[1]))
    print("REFERENCE " + json.dumps({k: v for k, v in ref.items() if not k.startswith("_")}, indent=1))
    for c in sys.argv[2:]:
        d = compare(ref, measure(pathlib.Path(c)))
        print(f"\n{c}\n" + json.dumps(d, indent=1))
