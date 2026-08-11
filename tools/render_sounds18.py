# Sound round 18: w and h matched on all three axes, against the reference itself.
#
# Round 17's verdict named two faults and both are measurable, so both were
# measured:
#
#   "much more high pitched, and sound like they have been sped up"  (w)
#   "still sounds inhuman and sped up"                               (h)
#
#   reference w   330 ms   f0 214 Hz   voiced-frames 1.00
#   my arms       140 ms   f0 204 Hz   voiced-frames 1.00     -> 2.4x TOO SHORT
#
#   reference h   210 ms   f0   0 Hz   voiced-frames 0.00     -> pure breath
#   my arms       140 ms   f0  75-90   voiced-frames 0.55-1.00 -> still VOICED
#
# So "sped up" was literal: every arm ran less than half the reference's
# length, because I warped formants and never touched duration. And h was never
# actually devoiced - the arms that survived the gate were the ones that kept
# 15 to 30 percent of the periodic component, while the fully devoiced ones
# were refused. This round matches DURATION, F0 and FORMANTS together.
#
# THE GATE'S TEMPLATE IS NOW THE REFERENCE. Until now the content check
# compared each candidate against kokoro's isolated phoneme render, which for
# these two is a poor reference and was refusing the pure-breath /h/ at dtw
# 0.32. The owner has supplied audio of the actual target, so the target is
# what a candidate is measured against. Nothing is loosened: the same dtw
# ceiling, island count and length band apply, against a better reference.
#
# Usage: python render_sounds18.py <out_dir>
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
SR = 24000

# The island the owner chose on round 16, and everything measured from it.
REF = {
    "w": dict(file="7f727579-w.mp4", t0=7.63, t1=7.96,
              F=[621, 948, 3161], ms=330, f0=214.0, voiced=1.00,
              words=["web", "win", "wag", "wet", "wig", "was", "wish"]),
    "h": dict(file="0fc5f827-h.mp4", t0=17.23, t1=17.44,
              F=[1105, 1562, 2484], ms=210, f0=0.0, voiced=0.00,
              words=["hat", "hum", "hen", "hop", "hid", "hut", "hug"]),
}
HOW = {"w": "a rounded w · as in web", "h": "a light quick breath · as in hat"}

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def load_media(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def load_pack(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate; c.close()
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


def smooth(a, sr, win_ms=2.0):
    n = max(3, int(sr * win_ms / 1000) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    return np.convolve(a, kk, mode="same").astype(np.float32)


def feather(a, sr, fi=20, fo=38, emix=0.45, rmix=0.55):
    a = np.asarray(a, np.float32).copy()
    if emix or rmix:
        lp = smooth(a, sr)
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


def match_all(a, sr, src_F, tgt_F, tgt_ms, tgt_f0, amount=1.0):
    """Duration, pitch and formants together. Matching one and not the others
    is what produced "high pitched and sped up": the formants were right and
    the clip ran at 40 percent of the reference's length."""
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)

    # DURATION: resample the frame sequence to the reference's length.
    want = max(4, int(tgt_ms / 5.0))
    idx = np.clip((np.arange(want) * len(f0) / want).astype(int), 0, len(f0) - 1)
    f0, sp, ap = f0[idx], np.ascontiguousarray(sp[idx]), np.ascontiguousarray(ap[idx])

    # PITCH: scale to the reference's median f0, or silence it entirely when
    # the reference has none - the measured /h/ is 0.00 voiced.
    if tgt_f0 <= 0:
        f0 = np.zeros_like(f0)
    else:
        v = f0[f0 > 0]
        if len(v):
            f0 = f0 * (tgt_f0 / float(np.median(v)))

    # FORMANTS: the piecewise map that closed oo (book).
    if src_F and len(src_F) >= 3:
        ps = [0.0] + [float(s) for s in src_F[:3]] + [sr / 2]
        pt = [0.0] + [float(s + (t2 - s) * amount) for s, t2 in zip(src_F[:3], tgt_F[:3])] + [sr / 2]
        if all(b > a2 for a2, b in zip(pt, pt[1:])):
            bins = sp.shape[1]
            freqs = np.linspace(0, sr / 2, bins)
            j = np.clip((np.interp(freqs, pt, ps) / (sr / 2) * (bins - 1)).astype(int), 0, bins - 1)
            sp = np.ascontiguousarray(sp[:, j]); ap = np.ascontiguousarray(ap[:, j])
    return np.asarray(pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0), np.float32)


ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    if d.resolve() == OUT.resolve():
        continue
    f = d / "batch-data.json"
    if f.exists():
        try:
            for it in json.loads(f.read_text()).get("items", []):
                for a in it.get("arms", []):
                    ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
        except Exception:
            pass
print(f"hash guard: {len(ALREADY)} arms already offered\n")

items, failures = [], []
for name, R in REF.items():
    raw, rsr = load_media(UP / R["file"])
    ref = resample(raw[int(R["t0"] * rsr):int(R["t1"] * rsr)], rsr)
    # THE TEMPLATE IS THE REFERENCE. The owner supplied the target, so a
    # candidate is measured against the target rather than against kokoro's
    # isolated phoneme render. Same thresholds, better reference.
    tpl = G.core(ref, SR)
    cands, seen = [], set()

    def add(family, seg, seg_sr, force=False):
        if seg is None or len(seg) < int(0.04 * seg_sr) or family in seen:
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        if force:
            d = 0.0
        else:
            ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind="voiced", form="citation")
            if not ok:
                failures.append((name, family, why)); return
        seen.add(family)
        cands.append((family, cut, seg_sr, d))

    add("REFERENCE-yours", feather(ref, SR, 12, 24), SR, force=True)
    for w in R["words"]:
        p = PACK / f"w-{w}.mp3"
        if not p.exists():
            continue
        x, psr = load_pack(p)
        s0, s1, _, _ = wc.speech_span(x, psr)
        span = resample(x[s0:s1], psr)
        for hold in (120, 160, 200):
            seg = span[:int(SR * hold / 1000)]
            src = steady(seg, SR)
            if not src or len(src) < 3:
                continue
            for amt, tag in ((1.0, "full"), (0.75, "most")):
                for ms in (R["ms"], int(R["ms"] * 1.15)):
                    out = match_all(seg, SR, src, R["F"], ms, R["f0"], amt)
                    add(f"match3-{w}{hold}-{tag}-{ms}ms", feather(out, SR), SR)

    arms = []
    ordered = ([c for c in cands if c[0].startswith("REFERENCE")]
               + sorted([c for c in cands if not c[0].startswith("REFERENCE")], key=lambda r: r[3]))
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(np.concatenate([
            np.zeros(int(csr * PAD_HEAD_MS / 1000), np.float32),
            cut * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(cut).max()), 1e-6)),
            np.zeros(int(csr * PAD_TAIL_MS / 1000), np.float32)]), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in ALREADY and not fam.startswith("REFERENCE"):
            failures.append((name, fam, "already offered")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    print(f"{name}: {len(arms)} arms   {[a['family'] for a in arms][:3]}")
    items.append({
        "kind": "word", "text": name,
        "note": (f"\"sped up\" was literal: your reference runs {R['ms']} ms and every arm I "
                 f"sent ran 140 ms. These match DURATION ({R['ms']} ms), PITCH "
                 f"({'silent — your h measures 0.00 voiced' if R['f0'] <= 0 else str(int(R['f0'])) + ' Hz'}) "
                 f"and FORMANTS together, not formants alone. Arm 1 is your reference, marked "
                 f"as such, so you can A/B it directly."),
        "how": HOW[name],
        "reject": "still sped up, still high pitched, or any other sound around it",
        "arms": arms})

print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:10]:
    print(f"  {n:3} {fam:30} {why}")
items = [i for i in items if i["arms"]]
(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 18 — w and h matched on duration, pitch and formants together",
    "tally": ("Sounds: 12 of 14 closed. w and h are the last two. Words: 349 shipped + 115 "
              "approved. Sentences: 42 approved."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
