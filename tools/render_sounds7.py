# Sound round 7: schwa and oo (book), by mechanisms never tried on them.
# The owner's instruction (2026-08-10): keep trying with new ideas. These
# are new, and each was proven on controls before this file ran:
#
#   1. VOICED-RUN EXTRACTION (soundgate.voiced_run, calibrated on approved
#      audio): a vowel between UNVOICED sounds has measurable edges - the
#      silence-flank principle generalised. cup and cut carry ʌ, push and
#      bush carry ʊ, between stop closures and frication - and all four are
#      owner-perfect pack words, so the vowel comes out of audio the ear
#      already accepted. Calibration: all four extractions pass the gate
#      against their phoneme templates (dtw 0.11-0.21).
#      Schwa is derived from ʌ because American ə and ʌ share their
#      quality; the difference is stress, length and loudness - so the cup
#      vowel, shortened and softened, IS a lazy uh.
#   2. WORD-FINAL SCHWA from real words: the most natural lazy uh in
#      English ends sofa, pasta, papa - an unvoiced consonant gives the
#      clean left edge, the pause gives the right.
#   3. PHONEME SANDWICHES (θəθ, fəf, pəp / fʊf, θʊθ, pʊp): the target
#      vowel rendered between unvoiced phonemes, extracted by voicing.
#   4. DERIVATION from the accepted oo (moon) bytes: shorten, lax the
#      formants, soften - the iterate-on-approved-bytes family that won ow.
#
# Usage: python render_sounds7.py <out_dir>
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
REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app/public/voice"
P45 = REPO / "tools/pending-sounds"
VOICE = "af_heart"
PAD_LEAD, PAD_TAIL = 150, 400

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(t, sp=0.85, ph=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


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


def soften_tail(a, sr, keep_ms):
    """Shorten with a gentle decay - a lazy vowel dies away, it does not cut."""
    n = int(keep_ms / 1000 * sr)
    if len(a) <= n:
        return a
    a = a[:n].copy()
    d = int(0.05 * sr)
    if len(a) > d:
        a[-d:] *= np.linspace(1, 0, d)
    return a


def last_voiced_run(a, sr):
    """The LAST voiced energetic run - the final schwa of sofa/pasta."""
    lf, db = G._frame_power(a, sr)
    hop = int(sr * 0.005)
    runs, cur = [], None
    for i, (v, e) in enumerate(zip(lf, db)):
        if v > 0.20 and e > -30:
            cur = [i, i + 1] if cur is None else [cur[0], i + 1]
        else:
            if cur:
                runs.append(cur)
            cur = None
    if cur:
        runs.append(cur)
    runs = [r for r in runs if (r[1] - r[0]) * hop >= 0.06 * sr]
    if not runs:
        return None
    r = runs[-1]
    return a[r[0] * hop:r[1] * hop]


CARDS = [
    dict(name="schwa", ph="ə",
         note="new mechanisms: the cup/cut vowel (your approved clips) made lazy; sofa/pasta endings; vowel sandwiches",
         how="the lazy little 'uh' of 'the', 'sofa', 'about' — short, soft, relaxed, never stressed",
         reject="stressed like 'UH!', too long, or any other sound around it"),
    dict(name="oo_book", ph="ʊ",
         note="new mechanisms: the push/bush vowel (your approved clips); took/book cuts; oo-moon made short and lax",
         how="the short 'oo' of book, push, took — quick, rounded, relaxed",
         reject="the long 'oo' of moon instead, tense or stretched, or consonants left on it"),
]


items, failures = [], []
for card in CARDS:
    name, ph = card["name"], card["ph"]
    tpl_raw, sr = say(ph, 0.85, ph=True)
    tpl = G.core(tpl_raw, sr)
    arms, seen = [], []

    def add(family, seg, seg_sr, peak_db=-3.0):
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

    if name == "schwa":
        # 1. the approved cup/cut vowel, made lazy
        for w in ("cup", "cut"):
            a, wsr = load(PACK / f"w-{w}.mp3")
            run = G.voiced_run(G.core(a, wsr), wsr)
            if run is None:
                failures.append((name, f"{w}_vowel", "no voiced run"))
                continue
            add(f"{w}_vowel_lazy", soften_tail(run, wsr, 150), wsr, peak_db=-8.0)
            add(f"{w}_vowel_lazier", soften_tail(run, wsr, 120), wsr, peak_db=-11.0)
            add(f"{w}_vowel_soft", run, wsr, peak_db=-8.0)
            try:
                add(f"{w}_vowel_low_lazy",
                    soften_tail(world_colour(run, wsr, f0r=0.93), wsr, 150), wsr, peak_db=-9.0)
            except Exception as e:
                failures.append((name, f"{w}_low", f"world: {e}"))
        # 2. the natural word-final schwa of sofa / pasta / papa
        for w in ("sofa", "pasta", "papa"):
            for sp in (0.7, 0.8):
                car, csr = say(f"{w.capitalize()}. {w.capitalize()}.", sp)
                wsolo, ssr = say(w, 0.85)
                wclean = V.clean_onset(wsolo, ssr, w)
                st, en, score = wc.template_match(wclean, car, csr)
                if st is None or score < 0.55:
                    failures.append((name, f"{w}_sp{sp}", "word not located"))
                    continue
                run = last_voiced_run(car[st:en], csr)
                add(f"{w}_end_sp{sp}", run, csr, peak_db=-7.0)
        # 3. phoneme sandwiches
        for ctx in ("θəθ", "fəf", "pəp"):
            a, psr = say(ctx, 0.8, ph=True)
            add(f"sandwich_{ctx}", G.voiced_run(G.core(a, psr), psr), psr, peak_db=-7.0)

    if name == "oo_book":
        # 1. the approved push/bush vowel
        for w in ("push", "bush"):
            a, wsr = load(PACK / f"w-{w}.mp3")
            run = G.voiced_run(G.core(a, wsr), wsr)
            if run is None:
                failures.append((name, f"{w}_vowel", "no voiced run"))
                continue
            add(f"{w}_vowel", run, wsr)
            add(f"{w}_vowel_short", soften_tail(run, wsr, 160), wsr)
            try:
                add(f"{w}_vowel_warm", world_colour(run, wsr, f0r=0.97, fmt=1.03), wsr)
            except Exception as e:
                failures.append((name, f"{w}_warm", f"world: {e}"))
        # 2. fresh took/book/foot repeats, vowel by voicing
        for w in ("took", "book", "foot"):
            for sp in (0.7, 0.8):
                car, csr = say(f"{w.capitalize()}. {w.capitalize()}. {w.capitalize()}.", sp)
                wsolo, ssr = say(w, 0.85)
                wclean = V.clean_onset(wsolo, ssr, w)
                st, en, score = wc.template_match(wclean, car, csr)
                if st is None or score < 0.55:
                    failures.append((name, f"{w}_sp{sp}", "word not located"))
                    continue
                add(f"{w}_sp{sp}", G.voiced_run(car[st:en], csr), csr)
        # 3. sandwiches
        for ctx in ("fʊf", "θʊθ", "pʊp"):
            a, psr = say(ctx, 0.8, ph=True)
            add(f"sandwich_{ctx}", G.voiced_run(G.core(a, psr), psr), psr)
        # 4. the accepted oo (moon), made short and lax
        a, msr = load(P45 / "s-oo_moon.mp3")
        core = G.core(a, msr)
        for tag, keep, fmt in (("shortlax", 170, 0.94), ("shorter", 140, 0.94),
                               ("laxer", 170, 0.90)):
            try:
                add(f"moon_{tag}",
                    soften_tail(world_colour(core, msr, fmt=fmt), msr, keep), msr)
            except Exception as e:
                failures.append((name, f"moon_{tag}", f"world: {e}"))

    items.append({"kind": "word", "text": name, "note": card.get("note", ""),
                  "how": card["how"], "reject": card["reject"], "arms": arms[:12]})
    print(f"{name}: {len(arms[:12])} arms")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused during build: {len(failures)}")
for n, fam, why in failures:
    print(f"  {n:7s} {fam:22s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    raise SystemExit(f"round refused: too few verified arms for {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 7 — uh and book-oo, four mechanisms never tried on them",
    "tally": ("Sounds: 45 of 47 done - only these two left. "
              "Words: 349 shipped + 77 approved; batch 10 with you. "
              "Sentences: first proofing batch is out."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")

# self-verify
data = json.loads((OUT / "batch-data.json").read_text(encoding="utf-8"))
bad = []
for item in data["items"]:
    card = next(c for c in CARDS if c["name"] == item["text"])
    a, tsr = say(card["ph"], 0.85, ph=True)
    tpl = G.core(a, tsr)
    for arm in item["arms"]:
        aud, asr = decode(base64.b64decode(arm["b64"]))
        if float(np.abs(aud).max()) < 0.04 or arm["ms"] < 250:
            bad.append((arm["id"], "inaudible or too short")); continue
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
