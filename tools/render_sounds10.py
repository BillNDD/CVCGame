# Sound round 10: oo (book), the last sound, iterating on one named fault.
#
# Round 9 got it to CLOSEST on `oo_book_3` = `pack-bush-25-130-shaped`: the
# vowel cut from the SHIPPED, owner-approved clip for "bush", starting 25% into
# the word, held 130 ms, with a natural rise and fall. The owner's fault report
# is one phrase: "not rounded enough".
#
# That is an acoustic direction, not a vague one. Lip rounding lowers the
# second formant, so "more rounded" means F2 down. Four families answer it, and
# all four iterate the round-9 recipe rather than replacing it — because that
# recipe closed schwa in the same round, after six rounds of invention had
# failed.
#
#   1. CUT EARLIER. In "bush" and "push" the lips are already together for the
#      /b/ and /p/, so rounding is at its strongest the moment the vowel
#      starts and relaxes as the mouth opens toward the /sh/. Round 9 swept
#      20-60% into the word; this sweeps 8-24%, the part it never reached.
#   2. THE BLEND, the technique this project already accepts. a, e, i, o, u, l,
#      m, n, r, v and ng all ship as `half_world` or `three_quarter_world`
#      blends, and d, g, h, y and w were accepted the same way. Here the cut is
#      blended toward the ALREADY-APPROVED oo (moon), which is a fully rounded
#      vowel, at a quarter, a half and three quarters.
#   3. F2 LOWERED DIRECTLY, by a small named amount. This is the one processing
#      family, and it is here because the owner asked for one specific quality
#      rather than "better" — the round-8 lesson was that processing cannot
#      supply warmth, not that it cannot supply rounding.
#   4. THE ROUND-9 WINNER'S SIBLINGS. The same cut at neighbouring hold lengths
#      and envelope shapes, unprocessed, so the field is not all treatment.
#
# Usage: python render_sounds10.py <out_dir>
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


def formant_shift(a, sr, fmt):
    """Move the spectral envelope. fmt below 1.0 lowers the formants, and lip
    rounding IS a lowered second formant, so this is the direct answer to
    "not rounded enough"."""
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    bins = sp.shape[1]
    sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    return np.asarray(pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0), np.float32)


def blend(a, b, sr, w):
    """The project's own technique: a weighted mix of two clips, time-aligned
    to the first. a, e, i, o, u, l, m, n, r, v and ng all ship as half or
    three-quarter blends."""
    n = len(a)
    if len(b) < 8:
        return None
    idx = np.clip((np.arange(n) * (len(b) - 1) / max(1, n - 1)).astype(int), 0, len(b) - 1)
    bb = b[idx]
    ra, rb = float(np.sqrt(np.mean(a ** 2))), float(np.sqrt(np.mean(bb ** 2)))
    if rb > 1e-6:
        bb = bb * (ra / rb)
    return ((1 - w) * a + w * bb).astype(np.float32)


import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")
tp, sr0 = k.create("ʊ", voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
tp = G.core(np.asarray(tp, np.float32), sr0)
m0 = int(len(tp) * 0.2)
tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

# The already-approved oo (moon): a fully rounded vowel, and the blend target.
moon_p = REPO / "tools" / "pending-sounds" / "s-oo_moon.mp3"
moon, moon_sr = decode_file(moon_p) if moon_p.exists() else (None, None)
if moon is not None:
    moon = G.core(moon, moon_sr)

ROUNDS = pathlib.Path(SCRATCH) / "rounds"
ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    f = d / "batch-data.json"
    if f.exists():
        try:
            for it in json.loads(f.read_text(encoding="utf-8")).get("items", []):
                for a in it.get("arms", []):
                    ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
        except Exception:
            pass
print(f"hash guard: {len(ALREADY)} arms already offered")

cands, seen, failures = [], [], []


def add(family, seg, seg_sr):
    if seg is None or len(seg) < int(0.05 * seg_sr):
        return
    cut = G.core(np.asarray(seg, np.float32), seg_sr)
    ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind="voiced")
    if not ok:
        failures.append((family, why)); return
    f = wc.logmel(cut, seg_sr).mean(axis=0)
    f = f / (np.linalg.norm(f) + 1e-9)
    ms = len(cut) / seg_sr * 1000
    cls = family.split("_")[0]
    if any(c == cls and float(np.dot(f, g)) > 0.995 and abs(ms - m2) / max(ms, m2) < 0.12
           for g, m2, c in seen):
        failures.append((family, "duplicate")); return
    seen.append((f, ms, cls))
    cands.append((family, cut, seg_sr, d))


for word, fname in (("bush", "w-bush.mp3"), ("push", "w-push.mp3")):
    pack, psr = decode_file(REPO / "app" / "public" / "voice" / fname)
    s0, s1, _, _ = wc.speech_span(pack, psr)
    span = pack[s0:s1]

    # 1 — CUT EARLIER: rounding is strongest where the lips have just parted.
    for pct in (8, 11, 14, 17, 20, 24):
        for hold in (110, 130, 150):
            a = int(len(span) * pct / 100)
            b = min(len(span), a + int(psr * hold / 1000))
            if b - a < int(psr * 0.06):
                continue
            seg = span[a:b]
            add(f"early_{word}-{pct}-{hold}", seg, psr)
            add(f"early_{word}-{pct}-{hold}-shaped", envelope(seg, psr), psr)

    # the round-9 closest, rebuilt here as the seed for families 2 and 3
    a = int(len(span) * 25 / 100)
    seed = span[a:min(len(span), a + int(psr * 130 / 1000))]

    # 4 — THE WINNER'S SIBLINGS, unprocessed
    for hold in (100, 115, 145, 160):
        b = min(len(span), a + int(psr * hold / 1000))
        add(f"sib_{word}-25-{hold}-shaped", envelope(span[a:b], psr), psr)
    for rise, fall in ((15, 60), (35, 110), (20, 100)):
        add(f"sib_{word}-25-130-env{rise}-{fall}", envelope(seed, psr, rise, fall), psr)

    # 2 — THE BLEND toward the approved, fully rounded oo (moon)
    if moon is not None:
        for w, tag in ((0.25, "quarter"), (0.5, "half"), (0.75, "threequarter")):
            mixed = blend(seed, moon, psr, w)
            add(f"blend_{word}-{tag}", envelope(mixed, psr) if mixed is not None else None, psr)

    # 3 — F2 LOWERED by a small named amount
    for fmt in (0.97, 0.94, 0.91):
        try:
            add(f"round_{word}-fmt{fmt}", envelope(formant_shift(seed, psr, fmt), psr), psr)
        except Exception as e:
            failures.append((f"round_{word}-fmt{fmt}", f"world: {e}"))

by_family = {}
for c in sorted(cands, key=lambda r: r[3]):
    by_family.setdefault(c[0].split("_")[0], []).append(c)
ordered, depth = [], 0
while any(len(v) > depth for v in by_family.values()):
    for fam in sorted(by_family):
        if len(by_family[fam]) > depth:
            ordered.append(by_family[fam][depth])
    depth += 1

arms = []
for fam, cut, csr, d in ordered:
    mp3, ms = encode(polish(cut, csr), csr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in ALREADY:
        failures.append((fam, f"already offered as {ALREADY[sha]}")); continue
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(mp3)
    dec, dsr = decode_file(tmp)
    ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind="voiced")
    if not ok:
        failures.append((fam, f"after encode: {why}")); continue
    arms.append({"id": f"oo_book_{len(arms) + 1}", "family": fam, "ms": ms,
                 "b64": base64.b64encode(mp3).decode(), "sha": sha})
    if len(arms) >= 20:
        break

print(f"oo_book: {len(arms)} arms from {len(cands)} gated candidates, "
      f"families {sorted({a['family'].split('_')[0] for a in arms})}")
print(f"refused: {len(failures)}")
for fam, why in failures[:12]:
    print(f"  {fam:34} {why}")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
if len(arms) < 12:
    raise SystemExit("round refused: too thin a field for the last sound")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 10 — oo (book), the last sound: more rounded",
    "tally": ("Sounds: 46 of 47 — schwa closed in round 9. This is the last one. "
              "Words: 349 shipped + 115 approved, backlog zero. Sentences: 42 approved, done."),
    "items": [{"kind": "word", "text": "oo_book",
               "note": ("your fault report was \"not rounded enough\" on oo_book_3, which was "
                        "the vowel cut from the shipped \"bush\" clip. Rounding is a lowered "
                        "second formant, so: cuts taken EARLIER, where the lips have just "
                        "parted from the b and p and rounding is strongest; blends toward the "
                        "already-approved oo (moon), the technique a, e, i, o and u all ship "
                        "with; the formant lowered directly by a small named amount; and the "
                        "closest arm's own siblings, unprocessed"),
               "how": "the short 'oo' of book, push, took — quick, ROUNDED, relaxed",
               "reject": "the long 'oo' of moon instead, still not rounded enough, tense, or consonants left on it",
               "arms": arms}]}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
