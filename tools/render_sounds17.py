# Sound round 16: af_heart bent toward four human reference recordings.
#
# The owner supplied recordings of a person saying v, w, z and h - the four
# sounds that had returned NONE twice - and asked for af_heart to be made to
# match them. That is the move that closed oo (book) in round 11: turn a taste
# question into a measurement, then warp to the measurement.
#
# MEASURED from the owner's recordings (LPC formants, spectral centroid, and
# the voiced-frame ratio), with the island each came from named so the owner
# can correct the choice cheaply:
#
#   v  island 1 @10.96s  610 ms  F 259 / 1455 / 2571   centroid  154  voiced 1.00
#   w  island 2 @ 3.97s  350 ms  F 591 / 1070 / 2947   centroid  367  voiced 1.00
#   z  island 6 @ 5.51s  390 ms  F 792 /  849 / 1475   centroid  991  voiced 1.00
#   h  island 8 @13.65s  140 ms  F 1062 / 1586 / 2515  centroid 1426  voiced 0.13
#
# THE /h/ MEASUREMENT EXPLAINS TWO FAILED ROUNDS. A demonstration /h/ is almost
# unvoiced - 0.13 - and bright, centroid 1426 Hz. Every source this project has
# used for h was PREVOCALIC /h/ taken from hat, hum, hen and hop, which measures
# 0.74 to 1.00 voiced because in that position English /h/ is breathy-voiced
# [ɦ]. They are different sounds, and no amount of edge work on the wrong one
# would ever have passed. So h is DEVOICED here: WORLD resynthesis with the
# periodic component removed, leaving the aperiodic breath, then brightened to
# the measured centroid.
#
# Each card also carries the reference cut itself, labelled REFERENCE-yours, so
# the owner can confirm in one play that the right piece of their recording was
# found. It is a check, not a candidate - no recording of the owner's voice
# ships in the game (owner-ruled 2026-08-11).
#
# n and ng are here for a different reason: "weird crackling or electric sound"
# and "a lot of static and sounds muffled" are artefacts of MY resynthesis, so
# both get direct cuts with no resynthesis at all.
#
# Usage: python render_sounds16.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
import pyworld

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
UP = pathlib.Path("/root/.claude/uploads/e6f72ac3-eaf2-5b4a-aa69-540f121df052")
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0

REF_FILE = {"v": "d30448b3-v.mp4", "w": "7f727579-w.mp4",
            "z": "fef0116c-z.mp4", "h": "0fc5f827-h.mp4"}
# (island start, end) in seconds, and the measured target F1/F2/F3.
REF = {
    "v": [(10.96, 11.57, [259, 1455, 2571])],
    # The owner chose REFERENCE-yours-2 for both w and h on round 16, so the
    # SECOND island is the one they mean. It leads here now, and its formants
    # are the target every af_heart arm is bent toward.
    "w": [(7.63, 7.96, [621, 948, 3161]), (3.97, 4.32, [591, 1070, 2947])],
    "z": [(5.51, 5.90, [792, 849, 1475]), (6.00, 6.16, [627, 2047, 2281])],
    "h": [(17.23, 17.44, [1105, 1562, 2484]), (13.65, 13.79, [1062, 1586, 2515])],
}
SOURCE = {"v": ["van", "vet", "vex"], "w": ["web", "win", "wag", "wet", "wig", "wish", "was"],
          "z": ["zip", "zap", "zig", "zag"], "h": ["hat", "hum", "hen", "hop", "hid", "hut", "hug"]}
IPA = {"v": "v", "w": "w", "z": "z", "h": "h", "n": "n", "ng": "ŋ", "g": "ɡ"}
KIND = {"v": "voiced", "w": "voiced", "z": "voiced", "h": "voiced",
        "n": "voiced", "ng": "voiced", "g": "voiced"}
HOW = {"v": "a buzzing v · as in van", "w": "a rounded w · as in web",
       "z": "a buzzing z · as in zip", "h": "a light quick breath · as in hat",
       "n": "a humming n · as in net", "ng": "a humming ng · as in ring",
       "g": "a g-catch a child can hear · as in gap"}

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def load_media(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def resample(a, sr, to=24000):
    if sr == to:
        return a
    idx = np.clip((np.arange(int(len(a) * to / sr)) * sr / to).astype(int), 0, len(a) - 1)
    return a[idx].astype(np.float32)


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def smooth(a, sr, win_ms):
    n = max(3, int(sr * win_ms / 1000) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    return np.convolve(a, kk, mode="same").astype(np.float32)


def feather(a, sr, fi=20, fo=38, emix=0.45, rmix=0.55):
    a = np.asarray(a, np.float32).copy()
    if emix or rmix:
        lp = smooth(a, sr, 2.0)
        ne = min(int(sr * 0.035), len(a) // 2); nr = min(int(sr * 0.045), len(a) // 2)
        if ne > 1 and emix:
            m = emix * (1 - np.linspace(0, 1, ne)); a[:ne] = (1 - m) * a[:ne] + m * lp[:ne]
        if nr > 1 and rmix:
            m = rmix * np.linspace(0, 1, nr); a[-nr:] = (1 - m) * a[-nr:] + m * lp[-nr:]
    cap = int(len(a) * 0.18)
    n1, n2 = min(int(sr * fi / 1000), cap), min(int(sr * fo / 1000), cap)
    if n1 > 1:
        a[:n1] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n1))).astype(np.float32)
    if n2 > 1:
        a[-n2:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n2))).astype(np.float32)
    return a


def parts(a, sr):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    return f0, pyworld.cheaptrick(x, f0, t, sr), pyworld.d4c(x, f0, t, sr)


def lpc_formants(seg, sr):
    d = max(1, int(sr / 10000)); s = seg[::d]; fs = sr / d
    if len(s) < 64:
        return []
    s = s * np.hamming(len(s)); s = np.append(s[0], s[1:] - 0.97 * s[:-1])
    sig = s - s.mean(); order = 12
    r = np.correlate(sig, sig, "full")[len(sig) - 1:len(sig) + order]
    if r[0] <= 0:
        return []
    aa = np.zeros(order + 1); aa[0] = 1.0; e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + sum(aa[j] * r[i - j] for j in range(1, i))
        kk = -acc / e; an = aa.copy()
        for j in range(1, i):
            an[j] = aa[j] + kk * aa[i - j]
        an[i] = kk; aa = an; e *= (1 - kk * kk)
        if e <= 0:
            return []
    o = []
    for rt in np.roots(aa):
        if np.imag(rt) < 0.01:
            continue
        f = np.arctan2(np.imag(rt), np.real(rt)) * fs / (2 * np.pi)
        bw = -0.5 * (fs / (2 * np.pi)) * np.log(max(np.abs(rt), 1e-9))
        if 120 < f < 5000 and bw < 600:
            o.append(f)
    return sorted(round(v) for v in o)[:3]


def steady(a, sr):
    win = int(sr * 0.06); best = None
    for i in range(0, max(1, len(a) - win), int(sr * 0.01)):
        w = a[i:i + win]
        if np.sqrt(np.mean(w ** 2)) < 0.02:
            continue
        f = lpc_formants(w, sr)
        if len(f) >= 3:
            h1, h2 = lpc_formants(w[:win // 2], sr), lpc_formants(w[win // 2:], sr)
            if len(h1) < 2 or len(h2) < 2:
                continue
            dr = abs(h1[0] - h2[0]) + abs(h1[1] - h2[1])
            if best is None or dr < best[0]:
                best = (dr, f)
    return best[1] if best else None


def warp_to(a, sr, src, tgt, amount=1.0):
    """The piecewise formant map that closed oo (book): each formant moves to
    its own target, which a scalar ratio cannot do."""
    ps = [0.0] + [float(s) for s in src[:3]] + [sr / 2]
    pt = [0.0] + [float(s + (t - s) * amount) for s, t in zip(src[:3], tgt[:3])] + [sr / 2]
    if any(b <= a2 for a2, b in zip(pt, pt[1:])):
        return None
    f0, sp, ap = parts(a, sr)
    bins = sp.shape[1]
    freqs = np.linspace(0, sr / 2, bins)
    idx = np.clip((np.interp(freqs, pt, ps) / (sr / 2) * (bins - 1)).astype(int), 0, bins - 1)
    return np.asarray(pyworld.synthesize(f0, np.ascontiguousarray(sp[:, idx]),
                                         np.ascontiguousarray(ap[:, idx]), sr,
                                         frame_period=5.0), np.float32)


def devoice(a, sr, keep=0.0):
    """Remove the periodic component and keep the breath. The measured
    demonstration /h/ is 0.13 voiced; every source this project used was
    prevocalic /h/ at 0.74-1.00, which is a different sound."""
    f0, sp, ap = parts(a, sr)
    return np.asarray(pyworld.synthesize(f0 * keep, sp,
                                         np.ascontiguousarray(np.clip(ap * 1.0, 0, 1)),
                                         sr, frame_period=5.0), np.float32)


def tilt(a, sr, hz, db):
    n = 257
    t = np.arange(n) - (n - 1) / 2
    lp = np.sinc(2 * hz / sr * t) * np.hanning(n); lp /= lp.sum()
    low = np.convolve(a, lp, mode="same")
    return (low * (10 ** (db / 20)) + (a - low)).astype(np.float32)


ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    if d.resolve() == OUT.resolve():
        continue
    f = d / "batch-data.json"
    if f.exists():
        try:
            for it in json.loads(f.read_text(encoding="utf-8")).get("items", []):
                for a in it.get("arms", []):
                    ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
        except Exception:
            pass
print(f"hash guard: {len(ALREADY)} arms already offered\n")

items, failures = [], []
for name in ("w", "h"):
    kind = KIND[name]
    tp, sr0 = k.create(IPA[name], voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m0 = int(len(tp) * 0.2)
    tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp
    cands, seen = [], set()

    def add(family, seg, seg_sr, force=False):
        if seg is None or len(seg) < int(0.04 * seg_sr) or family in seen:
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        if not force:
            ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind, form="citation")
            if not ok:
                failures.append((name, family, why)); return
        else:
            d = 0.0
        seen.add(family)
        cands.append((family, cut, seg_sr, d))

    if name in REF:
        ref, rsr = load_media(UP / REF_FILE[name])
        for n_i, (t0, t1, tgt) in enumerate(REF[name]):
            piece = resample(ref[int(t0 * rsr):int(t1 * rsr)], rsr)
            # the reference itself, so the owner can confirm the right piece was
            # found. A check, never a candidate: no owner voice ships.
            add(f"REFERENCE-yours-{n_i + 1}", feather(piece, 24000, 12, 24), 24000, force=True)
            for w in SOURCE[name]:
                p = PACK / f"w-{w}.mp3"
                if not p.exists():
                    continue
                c = av.open(str(p)); s = c.streams.audio[0]
                x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
                psr = s.codec_context.sample_rate; c.close()
                x = x / 32768.0 if np.abs(x).max() > 2 else x
                s0, s1, _, _ = wc.speech_span(x, psr)
                span = x[s0:s1]
                for hold in (140, 200, 260):
                    seg = span[:int(psr * hold / 1000)]
                    src = steady(seg, psr)
                    if not src or len(src) < 3:
                        continue
                    for amt, tag in ((1.0, "full"), (0.85, "near"), (0.7, "most"), (0.5, "half")):
                        out = warp_to(seg, psr, src, tgt, amt)
                        if out is None:
                            continue
                        if name == "h":
                            # the target measures 0.13 voiced: devoice hard,
                            # and offer three degrees so the ear can choose
                            for keep, dtag in ((0.0, "pure"), (0.15, "trace"), (0.3, "some")):
                                add(f"match-{w}{hold}-{tag}{n_i + 1}-{dtag}",
                                    feather(tilt(devoice(out, psr, keep), psr, 1000, -6.0), psr), psr)
                            continue
                        add(f"match-{w}{hold}-{tag}{n_i + 1}", feather(out, psr), psr)
        note = (f"your recording measures F {'/'.join(str(v) for v in REF[name][0][2])} at "
                f"{int((REF[name][0][1] - REF[name][0][0]) * 1000)} ms. Arm 1 on each card is "
                f"the cut FROM YOUR RECORDING, so you can confirm in one play that I found "
                f"the right piece — it is a check, not a candidate, and no recording of your "
                f"voice ships. The rest are af_heart bent to those exact formants.")
        if name == "h":
            note += (" h is also DEVOICED: your demonstration /h/ measures 0.13 voiced, while "
                     "every source I had used was prevocalic /h/ from hat and hum at 0.74 to "
                     "1.00. They are different sounds, which is why two rounds failed.")
    else:
        # n and ng: the faults named are artefacts of MY resynthesis, so this is
        # cutting only - no PSOLA, no grains, no WORLD.
        words = {"n": ["net", "nap", "nut", "nod", "nag"],
                 "ng": ["ring", "sing", "king", "bang", "long", "song"],
                 "g": ["gap", "gum", "got", "gas", "gob"]}[name]
        for w in words:
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            c = av.open(str(p)); s = c.streams.audio[0]
            x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
            psr = s.codec_context.sample_rate; c.close()
            x = x / 32768.0 if np.abs(x).max() > 2 else x
            s0, s1, _, _ = wc.speech_span(x, psr)
            span = x[s0:s1]
            if name == "ng":
                for hold in (150, 190, 230, 270):
                    add(f"cut-{w}-{hold}", feather(span[max(0, len(span) - int(psr * hold / 1000)):], psr), psr)
            else:
                for hold in (150, 200, 250, 300):
                    add(f"cut-{w}-{hold}", feather(span[:int(psr * hold / 1000)], psr), psr)
        note = ("\"crackling or electric\" and \"static and muffled\" are artefacts of MY "
                "resynthesis, so every option here is a straight cut from a clip you already "
                "approved — no PSOLA, no grains, no WORLD, nothing but a cut and the edge "
                "feathering you accepted.")

    arms = []
    ordered = ([c for c in cands if c[0].startswith("REFERENCE")]
               + sorted([c for c in cands if not c[0].startswith("REFERENCE")], key=lambda r: r[3]))
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(np.concatenate([
            np.zeros(int(csr * PAD_HEAD_MS / 1000), np.float32),
            cut * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(cut).max()), 1e-6)),
            np.zeros(int(csr * PAD_TAIL_MS / 1000), np.float32)]), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        # The hash guard exists to stop a CANDIDATE being offered twice. A
        # reference is not a candidate - it is the target, and hearing it
        # beside the attempts is the whole point of a matching round - so it
        # is exempt, and its button now says so on its face.
        if sha in ALREADY and not fam.startswith("REFERENCE"):
            failures.append((name, fam, "already offered")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    print(f"{name:4} {len(arms):2} arms   {[a['family'] for a in arms][:3]}")
    items.append({"kind": "word", "text": name, "note": note, "how": HOW[name],
                  "reject": "not the sound, or any other sound around it", "arms": arms})

print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:10]:
    print(f"  {n:4} {fam:28} {why}")
items = [i for i in items if i["arms"]]
(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 17 — w and h, aimed at the reference you actually chose",
    "tally": ("Sounds: 12 of the 14 are closed. Only w and h are open, and on round 16 you "
              "chose the REFERENCE arm for both — your own voice, which cannot ship — so "
              "these are af_heart aimed at exactly that. Words: 349 shipped + 115 approved."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
