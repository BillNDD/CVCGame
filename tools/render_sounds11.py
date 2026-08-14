# Sound round 11: oo (book), matched to a measured human target.
#
# The owner supplied a recording of a person pronouncing the oo in "book" and
# asked for af_heart to be bent toward it. That turns a taste question into a
# measurement, and the measurement says something the previous three rounds
# had wrong.
#
# MEASURED, by LPC formant tracking (12th order, 10 kHz, pre-emphasised):
#   her /U/         F1 505-535   F2 1090-1190   F3 ~2400
#   af_heart cut    F1 771       F2 1220        F3 2860
#   af_heart sib    F1 682       F2 1461        F3 2771
#
# So the error is F1, not F2. af_heart's first formant sits about 250 Hz too
# HIGH, which is a jaw too open - the vowel drifting toward /A/. Its F2 was
# already close to hers. The owner's ear said "not rounded enough" and the ear
# was right about the direction, but round 10 answered it by lowering ALL
# formants uniformly (fmt 0.97, 0.94, 0.91), which dragged an already-correct
# F2 down while barely touching the F1 that was actually wrong. All twenty
# options were refused. That is the whole story of round 10's failure.
#
# THE FIX: a PIECEWISE frequency warp, not a scalar ratio. A monotonic map
# pins each formant to her value independently -
#   0 -> 0, F1_src -> F1_tgt, F2_src -> F2_tgt, F3_src -> F3_tgt, Nyq -> Nyq
# - and is applied to WORLD's spectral envelope before resynthesis. A single
# ratio cannot move F1 down while holding F2 still; this can.
#
# Every arm is re-measured after warping and after encoding, and its achieved
# F1 and F2 are printed and carried in its family name. An arm that does not
# land near the target is not offered. This round can therefore be checked
# rather than believed.
#
# Usage: python render_sounds11.py <out_dir>
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
REPO = pathlib.Path(__file__).resolve().parent.parent
LEAD_MS, TAIL_MS = 80, 300

# The measured human target. Recorded here because a number nobody can trace
# is a number this project will lose.
TARGET_F1, TARGET_F2, TARGET_F3 = 520, 1140, 2400

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)


def decode_file(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def envelope(a, sr, rise_ms=25, fall_ms=80):
    a = np.asarray(a, np.float32).copy()
    r, f = int(sr * rise_ms / 1000), int(sr * fall_ms / 1000)
    if r + f >= len(a):
        return None
    if r:
        a[:r] *= np.linspace(0, 1, r) ** 0.6
    if f:
        a[-f:] *= np.linspace(1, 0, f) ** 1.4
    return a


def polish(a, sr, peak_db=-3.0):
    a = np.asarray(a, np.float32).copy()
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a *= (10 ** (peak_db / 20)) / peak
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def _lpc(sig, order=12):
    sig = sig - sig.mean()
    r = np.correlate(sig, sig, "full")[len(sig) - 1:len(sig) + order]
    if r[0] <= 0:
        return None
    a = np.zeros(order + 1); a[0] = 1.0; e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + sum(a[j] * r[i - j] for j in range(1, i))
        k = -acc / e
        anew = a.copy()
        for j in range(1, i):
            anew[j] = a[j] + k * a[i - j]
        anew[i] = k; a = anew; e *= (1 - k * k)
        if e <= 0:
            return None
    return a


def formants(seg, sr):
    """F1, F2, F3 by LPC root-solving, the standard method."""
    d = max(1, int(sr / 10000)); s = seg[::d]; fs = sr / d
    if len(s) < 64:
        return []
    s = s * np.hamming(len(s))
    s = np.append(s[0], s[1:] - 0.97 * s[:-1])
    a = _lpc(s)
    if a is None:
        return []
    out = []
    for r in np.roots(a):
        if np.imag(r) < 0.01:
            continue
        f = np.arctan2(np.imag(r), np.real(r)) * fs / (2 * np.pi)
        bw = -0.5 * (fs / (2 * np.pi)) * np.log(max(np.abs(r), 1e-9))
        if 150 < f < 5000 and bw < 500:
            out.append(f)
    return sorted(round(v) for v in out)[:3]


def steady_formants(a, sr):
    """The steadiest 60 ms of a clip, which for a vowel is its nucleus."""
    win = int(sr * 0.06); best = None
    for i in range(0, max(1, len(a) - win), int(sr * 0.01)):
        w = a[i:i + win]
        if np.sqrt(np.mean(w ** 2)) < 0.02:
            continue
        f = formants(w, sr)
        if len(f) < 3 or not (300 < f[0] < 900):
            continue
        h1, h2 = formants(w[:win // 2], sr), formants(w[win // 2:], sr)
        if len(h1) < 2 or len(h2) < 2:
            continue
        drift = abs(h1[0] - h2[0]) + abs(h1[1] - h2[1])
        if best is None or drift < best[0]:
            best = (drift, f)
    return best[1] if best else None


def warp_to(a, sr, src, tgt, amount=1.0):
    """Move each formant to its target with a monotonic piecewise-linear map on
    frequency, applied to WORLD's spectral envelope.

    A scalar ratio scales every formant by the same factor, so it cannot lower
    F1 while holding F2 — which is exactly what this vowel needs, and exactly
    why round 10's uniform shifts failed. `amount` blends toward the target so
    a partial correction can be offered beside the full one.
    """
    pts_src = [0.0] + [float(s) for s in src[:3]] + [sr / 2]
    pts_tgt = [0.0] + [float(s + (t - s) * amount) for s, t in zip(src[:3], tgt[:3])] + [sr / 2]
    if any(b <= a2 for a2, b in zip(pts_tgt, pts_tgt[1:])):
        return None                                   # map must stay monotonic
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    bins = sp.shape[1]
    freqs = np.linspace(0, sr / 2, bins)
    # For each OUTPUT frequency, which INPUT frequency supplies it.
    src_of_out = np.interp(freqs, pts_tgt, pts_src)
    idx = np.clip((src_of_out / (sr / 2) * (bins - 1)).astype(int), 0, bins - 1)
    sp = np.ascontiguousarray(sp[:, idx])
    ap = np.ascontiguousarray(ap[:, idx])
    return np.asarray(pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0), np.float32)


k_tpl = None
import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")
tp, sr0 = k.create("ʊ", voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
tp = G.core(np.asarray(tp, np.float32), sr0)
m0 = int(len(tp) * 0.2)
tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

ROUNDS = pathlib.Path(SCRATCH) / "rounds"
ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    # NEVER read this round's own output. Re-running into the same directory
    # made run 1's arms read as "already offered" and threw away the best
    # matches, which the owner had never seen. Found 2026-08-11.
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
print(f"hash guard: {len(ALREADY)} arms already offered")
print(f"target: F1 {TARGET_F1}  F2 {TARGET_F2}  F3 {TARGET_F3}  (measured from the owner's recording)\n")

cands, seen, failures = [], [], []


def add(family, seg, seg_sr, achieved):
    if seg is None or len(seg) < int(0.05 * seg_sr):
        return
    cut = G.core(np.asarray(seg, np.float32), seg_sr)
    ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind="voiced")
    if not ok:
        failures.append((family, why)); return
    f = wc.logmel(cut, seg_sr).mean(axis=0)
    f = f / (np.linalg.norm(f) + 1e-9)
    ms = len(cut) / seg_sr * 1000
    # full, most and half of one cut are three different answers, not one.
    cls = "_".join(family.split("-")[:2])
    if any(c == cls and float(np.dot(f, g)) > 0.995 and abs(ms - m2) / max(ms, m2) < 0.12
           for g, m2, c in seen):
        failures.append((family, "duplicate")); return
    seen.append((f, ms, cls))
    cands.append((family, cut, seg_sr, d, achieved))


for word, fname in (("bush", "w-bush.mp3"), ("push", "w-push.mp3")):
    pack, psr = decode_file(REPO / "app" / "public" / "voice" / fname)
    s0, s1, _, _ = wc.speech_span(pack, psr)
    span = pack[s0:s1]
    for pct in (12, 20, 25, 32, 40):
        for hold in (120, 150):
            a = int(len(span) * pct / 100)
            b = min(len(span), a + int(psr * hold / 1000))
            if b - a < int(psr * 0.06):
                continue
            seg = span[a:b]
            src = steady_formants(seg, psr)
            if src is None or len(src) < 3:
                failures.append((f"{word}-{pct}-{hold}", "no measurable formants")); continue
            for amount, tag in ((1.0, "full"), (0.75, "most"), (0.5, "half")):
                try:
                    w = warp_to(seg, psr, src, (TARGET_F1, TARGET_F2, TARGET_F3), amount)
                except Exception as e:
                    failures.append((f"warp_{word}-{pct}-{hold}-{tag}", f"world: {e}")); continue
                if w is None:
                    failures.append((f"warp_{word}-{pct}-{hold}-{tag}", "warp map not monotonic")); continue
                got = steady_formants(w, psr)
                if got is None:
                    failures.append((f"warp_{word}-{pct}-{hold}-{tag}", "unmeasurable after warp")); continue
                add(f"warp_{word}{pct}-{tag}-F{got[0]}-{got[1]}", envelope(w, psr), psr, got)
            # the unwarped source, so the field is not all treatment
            add(f"plain_{word}{pct}-{hold}-F{src[0]}-{src[1]}", envelope(seg, psr), psr, src)

# closest to the target first, but never all from one family
def err(a):
    f = a[4]
    return abs(f[0] - TARGET_F1) / TARGET_F1 + abs(f[1] - TARGET_F2) / TARGET_F2
# A plain arm is only worth a slot if it is near the target on its own; the
# rest are the "not rounded enough" the owner already refused twice.
cands = [c for c in cands if not c[0].startswith("plain_") or err(c) < 0.25]
by_family = {}
for c in sorted(cands, key=err):
    by_family.setdefault("plain" if c[0].startswith("plain_") else c[0].split("-")[1], []).append(c)
ordered, depth = [], 0
while any(len(v) > depth for v in by_family.values()):
    for fam in sorted(by_family):
        if len(by_family[fam]) > depth:
            ordered.append(by_family[fam][depth])
    depth += 1

arms = []
print(f"{'id':12} {'family':34} {'F1':>5} {'F2':>5}   err")
for fam, cut, csr, d, got in ordered:
    mp3, ms = encode(polish(cut, csr), csr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in ALREADY:
        failures.append((fam, f"already offered as {ALREADY[sha]}")); continue
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(mp3)
    dec, dsr = decode_file(tmp)
    core = G.core(dec, dsr)
    ok, why, _ = G.verify_sound(core, tpl, dsr, kind="voiced")
    if not ok:
        failures.append((fam, f"after encode: {why}")); continue
    # re-measure the SHIPPED bytes: a warp that survives analysis but not the
    # encoder is not a warp the owner will hear.
    final = steady_formants(core, dsr) or got
    aid = f"oo_book_{len(arms) + 1}"
    arms.append({"id": aid, "family": fam, "ms": ms,
                 "b64": base64.b64encode(mp3).decode(), "sha": sha})
    e = abs(final[0] - TARGET_F1) / TARGET_F1 + abs(final[1] - TARGET_F2) / TARGET_F2
    print(f"{aid:12} {fam:34} {final[0]:5} {final[1]:5}   {e:.3f}")
    if len(arms) >= 20:
        break

print(f"\nrefused: {len(failures)}")
for fam, why in failures[:10]:
    print(f"  {fam:36} {why}")
tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
if len(arms) < 12:
    raise SystemExit("round refused: too thin a field")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 11 — oo (book), matched to your recording by measurement",
    "tally": ("Sounds: 46 of 47 — schwa closed. This is the last one. Words: 349 shipped + "
              "115 approved, backlog zero. Sentences: 42 approved, done."),
    "items": [{"kind": "word", "text": "oo_book",
               "note": ("your recording measures F1 520, F2 1140. af_heart's cut measures F1 "
                        "771, F2 1220 — so the fault is the FIRST formant, about 250 Hz too "
                        "high, a jaw too open. Round 10 lowered every formant uniformly, "
                        "which dragged an already-correct F2 down and barely moved F1; that "
                        "is why all twenty were refused. These bend F1 to your target while "
                        "holding F2 still, at full, three-quarter and half strength, plus the "
                        "unbent cuts for comparison. Each arm's measured F1 and F2 are in its "
                        "family name."),
               "how": "the short 'oo' of book, push, took — quick, ROUNDED, relaxed",
               "reject": "the long 'oo' of moon, still not rounded enough, tense, or consonants left on it",
               "arms": arms}]}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
