# Sound round 6: the ow iteration, and the backfill the owner asked for.
#
# Round 5 proved the recipe - the sound's own pure word, spoken slowly,
# cut only where the source shows measured silence on both flanks. All
# three winners came from the 0.7-speed repeat frames. This round applies
# exactly that recipe to:
#
#   - ow: iterating on ow_1 ("closest") - its own bytes treated, plus fresh
#     slow silence-flanked instances;
#   - air and ear: the next r-controlled sounds a full phonics game needs
#     (SPEC section 12 names r-controlled vowels as the tier after the
#     current levels), and both are their own pure word. Testing them now
#     is the owner's 2026-08-10 instruction; joining the game stays a SPEC
#     decision.
#
# schwa and oo (book) are NOT here: schwa has failed five rounds and oo
# (book) has no pure word, so both are recommended for the owner's own
# voice - the nine-sound precedent.
#
# Usage: python render_sounds6.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
import pyworld
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import verify as V
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
VOICE = "af_heart"
PAD_LEAD, PAD_TAIL = 150, 400

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(t, sp=0.85, ph=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


def polish(a, sr, peak_db=-3.0):
    a = np.asarray(a, np.float32)
    n = int(0.008 * sr)
    if len(a) > 2 * n:
        a = a.copy(); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    a = a * (10 ** (peak_db / 20) / (float(np.abs(a).max()) or 1.0))
    return np.concatenate([np.zeros(int(PAD_LEAD / 1000 * sr), np.float32), a,
                           np.zeros(int(PAD_TAIL / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def decode(raw):
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
    c = av.open(str(tmp)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def world_colour(a, sr, f0r=1.0, fmt=1.0, breath=1.0):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    if breath != 1.0:
        ap = np.ascontiguousarray(np.clip(ap * breath, 0.0, 1.0))
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def quiet_flanks(car, sr, st, en):
    _, _, db, n = wc.speech_span(car, sr)
    i, pre = st // n, 0
    while i - 1 >= 0 and db[i - 1] < -32:
        pre += 1; i -= 1
    j, post = en // n, 0
    while j < len(db) and db[j] < -32:
        post += 1; j += 1
    return pre * 10, post * 10


def instances(tpl, car, sr, k_peaks=3):
    C = wc.logmel(car, sr)
    hop = int(sr * 5 / 1000)
    found = []
    for s in (0.85, 0.925, 1.0, 1.08):
        idx = np.clip((np.arange(int(len(tpl) / s)) * s).astype(int), 0, len(tpl) - 1)
        T = wc.logmel(tpl[idx], sr)
        if len(T) < 4 or len(C) <= len(T):
            continue
        scores = np.array([float(np.mean(np.sum(C[i:i + len(T)] * T, axis=1)))
                           for i in range(len(C) - len(T) + 1)])
        order = np.argsort(scores)[::-1]
        for i in order[:40]:
            st, en, sc = i * hop, (i + len(T)) * hop, float(scores[i])
            if sc < 0.6:
                break
            if all(en <= f[0] or st >= f[1] for f in [(a, b) for a, b, _ in found]):
                found.append((st, en, sc))
    found.sort(key=lambda f: -f[2])
    return found[:k_peaks]


CARDS = [
    dict(name="ow", word="ow", ph="aʊ", seed="ow_1",
         note="iterating on ow_1, your 'closest' — plus fresh slow cuts",
         how="'ow', like something stings — 'ah' rolling into 'oo' as one warm human sound",
         reject="robotic flatness, any other sound around it, a chopped glide"),
    dict(name="air", word="air", ph="ɛɹ", seed=None,
         note="NEW — the r-controlled 'air' of chair and bear; testing is your call today, shipping stays a SPEC decision",
         how="'air' — the vowel of chair, bear, hair, said as one smooth r-coloured sound",
         reject="any other sound around it, two separate pieces, robotic flatness"),
    dict(name="ear", word="ear", ph="ɪɹ", seed=None,
         note="NEW — the r-controlled 'ear' of ear and deer",
         how="'ear' — the vowel of ear, deer, near, said as one smooth r-coloured sound",
         reject="any other sound around it, two separate pieces, robotic flatness"),
]

seed_arms = {}
snd5 = json.load(open(ROUNDS / "out-snd5/batch-data.json", encoding="utf-8"))
for it in snd5["items"]:
    for a in it["arms"]:
        seed_arms[a["id"]] = a

items, failures = [], []
for card in CARDS:
    name, w, ph = card["name"], card["word"], card["ph"]
    tpl_raw, sr = say(ph, 0.85, ph=True)
    tpl = G.core(tpl_raw, sr)
    wsolo, wsr = say(w, 0.85)
    wclean = V.clean_onset(wsolo, wsr, w)
    arms, seen = [], []

    def add(family, seg, seg_sr, peak_db=-3.0, raw_bytes=None):
        if raw_bytes is not None:
            a, _sr = decode(raw_bytes)
            arms.append({"id": f"{name}_{len(arms) + 1}", "family": family,
                         "ms": int(len(a) * 1000 / _sr),
                         "b64": base64.b64encode(raw_bytes).decode(),
                         "sha": hashlib.sha256(raw_bytes).hexdigest()})
            return
        if seg is None or len(seg) < 0.05 * seg_sr:
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, "voiced")
        if not ok:
            failures.append((name, family, why))
            return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        if any(pk == peak_db and
               float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
               for g, pk in seen):
            return
        mp3, ms = encode(polish(cut, seg_sr, peak_db), seg_sr)
        dec, dsr = decode(mp3)
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, "voiced")
        if not ok:
            failures.append((name, family, f"after encode: {why}"))
            return
        seen.append((f, peak_db))
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})

    # the closest seed rides first, byte for byte, then its treatments
    if card["seed"]:
        a = seed_arms[card["seed"]]
        raw = base64.b64decode(a["b64"])
        add(f"SEED {card['seed']} (your closest)", None, sr, raw_bytes=raw)
        aud, asr = decode(raw)
        core = G.core(aud, asr)
        for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)),
                        ("breath", dict(breath=1.25)),
                        ("low", dict(f0r=0.94)),
                        ("warmest", dict(f0r=0.95, fmt=1.05, breath=1.15))):
            try:
                add(f"seed_{tag}", world_colour(core, asr, **kw), asr)
            except Exception as e:
                failures.append((name, f"seed_{tag}", f"world: {e}"))
        add("seed_tail-60", core[:-int(0.06 * asr)], asr)

    W = w.capitalize()
    FRAMES = [f"{W}. {W}. {W}.", f"Sit. {W}. Sit.", f"Pat. {W}. Pat."]
    for sp in (0.65, 0.7, 0.8):
        for frame in FRAMES:
            car, csr = say(frame, sp)
            for st, en, score in instances(wclean, car, csr):
                pre, post = quiet_flanks(car, csr, st, en)
                if pre < 40 or post < 40:
                    failures.append((name, f"rep_sp{sp}", f"flanks {pre}/{post}ms"))
                    continue
                seg = car[st:en]
                base = f"rep_sp{sp}_q{pre}-{post}"
                add(base, seg, csr)
                for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)),
                                ("breath", dict(breath=1.25))):
                    try:
                        add(f"{base}_{tag}", world_colour(seg, csr, **kw), csr)
                    except Exception as e:
                        failures.append((name, f"{base}_{tag}", f"world: {e}"))

    items.append({"kind": "word", "text": name, "note": card.get("note", ""),
                  "how": card["how"], "reject": card["reject"], "arms": arms[:10]})
    print(f"{name}: {len(arms[:10])} arms")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused during build: {len(failures)}")
for n, fam, why in failures[-15:]:
    print(f"  {n:5s} {fam:26s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    raise SystemExit(f"round refused: too few verified arms for {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 6 — ow iterated, and two new sounds: air and ear",
    "tally": ("Sounds: 42 of 45 done; ow here with your closest as option 1. "
              "schwa and oo (book) go to your voice - five rounds and no pure "
              "word have settled it. air and ear are NEW, ahead of the "
              "r-controlled tier. Words: 349 shipped + 77 approved; batch 10 "
              "is next. Sentences: 21 shipped + 2 approved."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")

# self-verify: decode every arm and re-gate (the seed is owner-heard bytes,
# checked for audibility and length only)
data = json.loads((OUT / "batch-data.json").read_text(encoding="utf-8"))
bad = []
for item in data["items"]:
    card = next(c for c in CARDS if c["name"] == item["text"])
    a, tsr = say(card["ph"], 0.85, ph=True)
    tpl = G.core(a, tsr)
    for arm in item["arms"]:
        aud, asr = decode(base64.b64decode(arm["b64"]))
        if float(np.abs(aud).max()) < 0.05 or arm["ms"] < 250:
            bad.append((arm["id"], "inaudible or too short")); continue
        if arm["family"].startswith("SEED"):
            continue
        ok, why, _ = G.verify_sound(G.core(aud, asr), tpl, asr, "voiced")
        if not ok:
            bad.append((arm["id"], why))
    print(f"self-verify {item['text']}: {len(item['arms'])} arms checked")
if tmp.exists():
    tmp.unlink()
if bad:
    for b in bad:
        print("  FAIL", *b)
    raise SystemExit("round refused: an arm a listener would get failed verification")
print("self-verify OK")
