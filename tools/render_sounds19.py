# Sound round 19: the chipmunk was my measurement, and kokoro's knobs get swept.
#
# The owner on round 18: w "sounds like a chipmunk speaking not a human. Please
# think of what you are forgetting here." They were right, and the fault was in
# the measurement rather than the method.
#
# WHAT I WAS FORGETTING. Every formant target so far came from ONE 60 ms window,
# picked as the "steadiest" frame of the reference. A single window of a glide
# is not the glide. Measured frame by frame across the whole span and taken as
# a MEDIAN, the reference says something quite different:
#
#            single window (what I used)     frame-median (the truth)
#   w  F1          621                              424
#   w  F2          948                              896
#   w  F3         3161                             1830
#   h  F1         1105                              997
#   h  F2         1562                             1498
#   h  F3         2484                             2268
#
# I was warping w's third formant UP by a factor of 1.7 and its first by 200 Hz.
# Raising the formants while holding the pitch is the textbook recipe for a
# chipmunk, so that is precisely what came out. The ear was describing the
# transform I had applied.
#
# AND THE OWNER'S OTHER INSTRUCTION, taken literally: "turn every knob in kokoro
# until you match it". Until now each candidate came from post-processing one
# af_heart cut. This round SEARCHES kokoro's own parameter space first - many
# phoneme spellings, many carrier frames, many speeds - scores every result
# against the reference by an objective distance, and only then applies the
# three-axis match to the best of them. The search is the new part; the match
# is the part that already works.
#
# THE SCORE is a log-spectral distance between a candidate and the reference,
# computed on mel features after both are normalised for length and level. It
# ranks the field so the closest thing kokoro can produce leads, rather than
# whatever my hand happened to build.
#
# Usage: python render_sounds19.py <out_dir>
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

REF = {
    "w": dict(file="7f727579-w.mp4", t0=7.63, t1=7.96,
              F=[424, 896, 1830], ms=330, f0=214.0,
              # every knob worth turning for a /w/
              phon=["w", "wˈʌ", "ˈw", "www", "wwwˈʌ", "ʊw", "wˈʊ", "ˈwʊw"],
              frames=["hˈɪɹ ɪz ðə sˈaʊnd: ˈw.", "hˈɪɹ ɪz ðə sˈaʊnd: wˈʌ.",
                      "ðə sˈaʊnd ɪz : ˈw. ænd ðˈɛn wiː kəntˈɪnjuː.",
                      "wˈɛt, wˈɛb, wˈɪn."],
              words=["web", "win", "wag", "wet", "wig", "was", "wish"]),
    "h": dict(file="0fc5f827-h.mp4", t0=17.23, t1=17.44,
              F=[997, 1498, 2268], ms=210, f0=0.0,
              phon=["h", "hhh", "ˈh", "hˈʌ", "hhhˈʌ"],
              frames=["hˈɪɹ ɪz ðə sˈaʊnd: ˈh.", "hˈɪɹ ɪz ðə sˈaʊnd: hhh.",
                      "ðə sˈaʊnd ɪz : ˈh. ænd ðˈɛn wiː kəntˈɪnjuː.",
                      "hˈæt, hˈʌm, hˈɛn."],
              words=["hat", "hum", "hen", "hop", "hid", "hut", "hug"]),
}
HOW = {"w": "a rounded w · as in web", "h": "a light quick breath · as in hat"}
SPEEDS = (0.6, 0.75, 0.9, 1.0, 1.15)

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(text, ph=True, speed=1.0):
    a, sr = k.create(text, voice="af_heart", speed=speed, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


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


def feather(a, sr, fi=20, fo=38):
    a = np.asarray(a, np.float32).copy()
    n = max(3, int(sr * 0.002) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    lp = np.convolve(a, kk, mode="same").astype(np.float32)
    ne = min(int(sr * 0.035), len(a) // 2); nr = min(int(sr * 0.045), len(a) // 2)
    if ne > 1:
        m = 0.45 * (1 - np.linspace(0, 1, ne)); a[:ne] = (1 - m) * a[:ne] + m * lp[:ne]
    if nr > 1:
        m = 0.55 * np.linspace(0, 1, nr); a[-nr:] = (1 - m) * a[-nr:] + m * lp[-nr:]
    cap = int(len(a) * 0.18)
    n1, n2 = min(int(sr * fi / 1000), cap), min(int(sr * fo / 1000), cap)
    if n1 > 1:
        a[:n1] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n1))).astype(np.float32)
    if n2 > 1:
        a[-n2:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n2))).astype(np.float32)
    return a


def _lpc(sig, order):
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


def formant_median(seg, sr):
    """The frame-by-frame MEDIAN, which is the fix this round exists for. One
    window of a glide is not the glide, and picking the "steadiest" window of
    the reference is how w's F3 came out at 3161 instead of 1830."""
    d = max(1, int(sr / 10000)); fs = sr / d
    order = int(2 + fs / 1000)
    win, hop = int(sr * 0.030), int(sr * 0.010)
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


def match_all(a, sr, src_F, tgt_F, tgt_ms, tgt_f0, amount=1.0):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    want = max(4, int(tgt_ms / 5.0))
    idx = np.clip((np.arange(want) * len(f0) / want).astype(int), 0, len(f0) - 1)
    f0, sp, ap = f0[idx], np.ascontiguousarray(sp[idx]), np.ascontiguousarray(ap[idx])
    if tgt_f0 <= 0:
        f0 = np.zeros_like(f0)
    else:
        v = f0[f0 > 0]
        if len(v):
            f0 = f0 * (tgt_f0 / float(np.median(v)))
    if src_F and len(src_F) >= 3:
        ps = [0.0] + [float(s) for s in src_F[:3]] + [sr / 2]
        pt = [0.0] + [float(s + (t2 - s) * amount) for s, t2 in zip(src_F[:3], tgt_F[:3])] + [sr / 2]
        if all(b > a2 for a2, b in zip(pt, pt[1:])):
            bins = sp.shape[1]
            freqs = np.linspace(0, sr / 2, bins)
            j = np.clip((np.interp(freqs, pt, ps) / (sr / 2) * (bins - 1)).astype(int), 0, bins - 1)
            sp = np.ascontiguousarray(sp[:, j]); ap = np.ascontiguousarray(ap[:, j])
    return np.asarray(pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0), np.float32)


def distance_to(ref_mel, a, sr):
    """Objective closeness to the reference: mean cosine distance between
    length-normalised mel features. This is what ranks the field, so the
    closest thing kokoro can make leads rather than whatever I built by hand."""
    M = wc.logmel(a, sr)
    if len(M) < 4 or len(ref_mel) < 4:
        return 9.9
    idx = np.clip((np.arange(len(ref_mel)) * len(M) / len(ref_mel)).astype(int), 0, len(M) - 1)
    A = M[idx]
    A = A / (np.linalg.norm(A, axis=1, keepdims=True) + 1e-9)
    B = ref_mel / (np.linalg.norm(ref_mel, axis=1, keepdims=True) + 1e-9)
    return float(1.0 - np.mean(np.sum(A * B, axis=1)))


def islands(a, sr, floor_db=-34, min_ms=45, merge_ms=60):
    _, _, db, n = wc.speech_span(a, sr)
    hop = 1000 * n / sr
    loud = db > floor_db
    runs, st = [], None
    for i, v in enumerate(loud):
        if v and st is None:
            st = i
        elif not v and st is not None:
            runs.append([st, i]); st = None
    if st is not None:
        runs.append([st, len(loud)])
    m = []
    for r in runs:
        if m and (r[0] - m[-1][1]) * hop < merge_ms:
            m[-1][1] = r[1]
        else:
            m.append(list(r))
    return [(int(s * n), int(e * n)) for s, e in m if (e - s) * hop >= min_ms]


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
for name, R in REF.items():
    raw, rsr = load_media(UP / R["file"])
    ref = G.core(resample(raw[int(R["t0"] * rsr):int(R["t1"] * rsr)], rsr), SR)
    ref_mel = wc.logmel(ref, SR)
    measured = formant_median(ref, SR)
    print(f"--- {name}: reference {len(ref)/SR*1000:.0f}ms  frame-median F={measured}  "
          f"(the round-18 target was {'621/948/3161' if name == 'w' else '1105/1562/2484'})")

    pool, seen = [], set()

    def consider(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.04 * seg_sr) or family in seen:
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        src = formant_median(cut, seg_sr)
        if not src:
            return
        for amt in (1.0, 0.8):
            out = match_all(cut, seg_sr, src, R["F"], R["ms"], R["f0"], amt)
            fam = f"{family}-m{amt}"
            if fam in seen:
                continue
            fin = feather(out, seg_sr)
            ok, why, _ = G.verify_sound(G.core(fin, seg_sr), ref, seg_sr,
                                        kind="voiced", form="citation")
            if not ok:
                failures.append((name, fam, why)); continue
            seen.add(fam)
            pool.append((fam, fin, seg_sr, distance_to(ref_mel, G.core(fin, seg_sr), seg_sr)))

    # KNOB 1 and 2: every phoneme spelling, at every speed, alone.
    for ph in R["phon"]:
        for sp in SPEEDS:
            try:
                a, sr = say(ph, ph=True, speed=sp)
            except Exception:
                continue
            consider(f"solo-{ph}-{sp}", a, sr)
    # KNOB 3: every carrier frame, at every speed, last island.
    for fi, fr in enumerate(R["frames"]):
        for sp in SPEEDS:
            try:
                car, sr = say(fr, ph=True, speed=sp)
            except Exception:
                continue
            isl = islands(car, sr)
            if not isl:
                continue
            s, e = isl[-1]
            consider(f"frame{fi}-{sp}", car[s:e], sr)
    # KNOB 4: the approved word clips, which is where the closed sounds came from.
    for w in R["words"]:
        p = PACK / f"w-{w}.mp3"
        if not p.exists():
            continue
        x, psr = load_pack(p)
        s0, s1, _, _ = wc.speech_span(x, psr)
        span = resample(x[s0:s1], psr)
        for hold in (120, 170, 220):
            consider(f"word-{w}{hold}", span[:int(SR * hold / 1000)], SR)

    pool.sort(key=lambda r: r[3])
    print(f"    {len(pool)} gated candidates; best objective distance {pool[0][3]:.3f}"
          if pool else "    no candidates")
    arms = [{"id": f"{name}_1", "family": "REFERENCE-yours", "ms": int(len(ref) / SR * 1000),
             "b64": base64.b64encode(encode(np.concatenate([
                 np.zeros(int(SR * PAD_HEAD_MS / 1000), np.float32),
                 feather(ref, SR, 12, 24) * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(ref).max()), 1e-6)),
                 np.zeros(int(SR * PAD_TAIL_MS / 1000), np.float32)]), SR)[0]).decode(),
             "sha": ""}]
    arms[0]["sha"] = hashlib.sha256(base64.b64decode(arms[0]["b64"])).hexdigest()
    for fam, cut, csr, dist in pool:
        mp3, ms = encode(np.concatenate([
            np.zeros(int(csr * PAD_HEAD_MS / 1000), np.float32),
            cut * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(cut).max()), 1e-6)),
            np.zeros(int(csr * PAD_TAIL_MS / 1000), np.float32)]), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in ALREADY:
            failures.append((name, fam, "already offered")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": f"{fam}-d{dist:.3f}",
                     "ms": ms, "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    print(f"    {len(arms)} arms")
    items.append({
        "kind": "word", "text": name,
        "note": (f"the chipmunk was MY measurement. I took the target formants from one 60 ms "
                 f"window of your reference; measured frame by frame across the whole span, "
                 f"{'w F3 is 1830 and I was warping it to 3161' if name == 'w' else 'h F1 is 997 and I was using 1105'}. "
                 f"Raising formants while holding pitch IS a chipmunk. These use the corrected "
                 f"targets, and every one is the best kokoro could do out of a sweep of "
                 f"phoneme spellings, carrier frames, speeds and word clips — ranked by an "
                 f"objective distance to your reference, which is printed in each name."),
        "how": HOW[name],
        "reject": "still a chipmunk, still sped up, or any other sound around it",
        "arms": arms})

print(f"\nrefused: {len(failures)}")
items = [i for i in items if len(i["arms"]) > 1]
(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 19 — the chipmunk was my measurement, and kokoro's knobs are swept",
    "tally": ("Sounds: 12 of 14 closed. w and h are the last two. Words: 349 shipped + 115 "
              "approved. Sentences: 42 approved."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
