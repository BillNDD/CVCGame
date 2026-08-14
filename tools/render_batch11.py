# Batch 11: the two batch-10 sit-outs, the Level 12 plural-s draft, and the
# first three compounds (SPEC section 12).
#
#   - swam rides the batch-9 pipeline with a wider field (more frames and
#     speeds) after its thin batch-10 showing;
#   - be is a pure CV word, so it uses the recipe that closed the vowel
#     sounds: its own repeat frame, cut only where the source shows real
#     silence on both flanks;
#   - fifteen plural-s words (cats, hens, cups...), each screened for
#     child-appropriateness with plurals and near-misses (jugs, crabs and
#     buns stay banned, SPEC section 12);
#   - sunset, catnip, laptop - audio proofing only; the six-letter display
#     ruling stays open.
#
# Usage: python render_batch11.py <out_dir>
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
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(t, sp=0.85):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us")
    return np.asarray(a, np.float32), sr


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
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


def gate(cut, word, clean, sr):
    cls = V.onset_class(word)
    ok, why, d = V.verify(cut, clean, sr)
    if not ok and cls == "stop" and why.startswith("extra syllable island"):
        if V.syllable_nuclei(cut, sr) == max(1, V.syllable_nuclei(clean, sr)) + 1:
            ok, why = True, "ok (stop-burst island allowed)"
    if not ok:
        return False, why, d
    if cls == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False, f"voiced lead {lead}ms before an unvoiced onset", d
    return True, "ok", d


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


# word -> (natural mid-phrase sentence, note); all screened, plurals included
WORDS = {
    "swam": ("We swam in the lake today.", "wider field after batch 10"),
    "cats": ("Two cats sat in the sun.", "plural s says /s/ — Level 12"),
    "hats": ("Our hats fell off again.", "plural s says /s/"),
    "pots": ("The pots sit on the shelf.", "plural s says /s/"),
    "tops": ("The tops spin around fast.", "plural s says /s/"),
    "maps": ("Old maps show the way.", "plural s says /s/"),
    "cups": ("The cups are on the mat.", "plural s says /s/"),
    "dogs": ("The dogs run and play.", "plural s says /z/ — Level 12"),
    "hens": ("The hens peck at seeds.", "plural s says /z/"),
    "pigs": ("Three pigs sat in mud.", "plural s says /z/"),
    "bugs": ("Little bugs crawl on leaves.", "plural s says /z/"),
    "pens": ("Our pens ran out of ink.", "plural s says /z/"),
    "beds": ("The beds are soft and warm.", "plural s says /z/"),
    "cans": ("Tin cans stack up high.", "plural s says /z/"),
    "lids": ("The lids fit on tight.", "plural s says /z/"),
    "kids": ("The kids laugh and play.", "plural s says /z/"),
    "sunset": ("The sunset glows red tonight.", "compound — Level 13"),
    "catnip": ("Some catnip grew by the fence.", "compound — Level 13"),
    "laptop": ("Her laptop sits on the desk.", "compound — Level 13"),
}
TEACHER = [("listen", "Listen—{w}."), ("everybody", "{W}, everybody."),
           ("say", "Say {w}, everybody.")]


items, failures = [], []
for word, (sentence, note) in WORDS.items():
    solo_raw, sr = say(word, 0.85)
    clean = V.clean_onset(solo_raw, sr, word)

    cands = []

    def offer(family, cut_seg, seg_sr):
        if cut_seg is None or len(cut_seg) < 0.08 * seg_sr:
            failures.append((word, family, "not located"))
            return
        s0, s1, _, _ = wc.speech_span(cut_seg, seg_sr)
        cut = cut_seg[s0:s1]
        ok, why, d = gate(cut, word, clean, seg_sr)
        if not ok:
            failures.append((word, family, why))
            return
        cands.append((family, cut, seg_sr, d))

    def located(carrier, seg_sr, family):
        st, en, score = wc.template_match(clean, carrier, seg_sr)
        if st is None or score < 0.55:
            failures.append((word, family, f"no match ({score:.2f})"))
            return None
        st, en = wc.refine_edges(carrier, seg_sr, st, en, pad_ms=15, max_walk_ms=30)
        return carrier[st:en]

    speeds = (0.75, 0.8, 0.85, 0.95) if word == "swam" else (0.8, 0.85, 0.95)
    for fam, frame in TEACHER:
        for sp in speeds:
            car, csr = say(frame.replace("{W}", word.capitalize()).replace("{w}", word), sp)
            offer(f"{fam}_sp{sp}", located(car, csr, f"{fam}_sp{sp}"), csr)
    for sp in (0.85, 0.95):
        car, csr = say(sentence, sp)
        offer(f"natural_sp{sp}", located(car, csr, f"natural_sp{sp}"), csr)

    best = sorted(cands, key=lambda r: r[3])[:2]
    for fam, cut, csr, d in best:
        for tag, kw in (("breath", dict(breath=1.25)),
                        ("warm", dict(f0r=0.97, fmt=1.03))):
            try:
                offer(f"{fam}_{tag}", world_colour(cut, csr, **kw), csr)
            except Exception as e:
                failures.append((word, f"{fam}_{tag}", f"world: {e}"))

    cands.sort(key=lambda r: r[3])
    arms, seen_fam, feats = [], {}, []
    for fam, cut, csr, d in cands:
        base = fam.split("_sp")[0]
        if seen_fam.get(base, 0) >= 3:
            continue
        f = wc.logmel(cut, csr).mean(axis=0)
        if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
               for g in feats):
            continue
        mp3, ms = encode(shape(cut, csr), csr)
        dec, dsr = decode(mp3)
        d0, d1, _, _ = wc.speech_span(dec, dsr)
        ok, why, _ = gate(dec[d0:d1], word, clean, dsr)
        if not ok:
            failures.append((word, fam, f"after encode: {why}"))
            continue
        seen_fam[base] = seen_fam.get(base, 0) + 1
        feats.append(f)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        if len(arms) >= 8:
            break
    items.append({"kind": "word", "text": word, "note": note, "arms": arms})
    print(f"{word}: {len(arms)} arms ({len(cands)} candidates passed the gate)")

# be: the flank-verified repeat recipe that closed the vowel sounds
word = "be"
solo_raw, sr = say(word, 0.85)
s0, s1, _, _ = wc.speech_span(solo_raw, sr)
wclean = solo_raw[s0:s1]
arms, feats = [], []
for sp in (0.7, 0.8, 0.85):
    for frame in ("Be. Be. Be.", "Sit. Be. Sit."):
        car, csr = say(frame, sp)
        for st, en, score in instances(wclean, car, csr):
            pre, post = quiet_flanks(car, csr, st, en)
            if pre < 40 or post < 40:
                failures.append((word, f"rep_sp{sp}", f"flanks {pre}/{post}ms"))
                continue
            seg = car[st:en]
            c0, c1, _, _ = wc.speech_span(seg, csr)
            cut = seg[c0:c1]
            f = wc.logmel(cut, csr).mean(axis=0)
            if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
                   for g in feats):
                continue
            mp3, ms = encode(shape(cut, csr), csr)
            feats.append(f)
            arms.append({"id": f"be_{len(arms) + 1}", "family": f"rep_sp{sp}_q{pre}-{post}",
                         "ms": ms, "b64": base64.b64encode(mp3).decode(),
                         "sha": hashlib.sha256(mp3).hexdigest()})
items.append({"kind": "word", "text": "be",
              "note": "open syllable — cut between measured silences, the recipe that closed the vowel sounds",
              "arms": arms[:8]})
print(f"be: {len(arms[:8])} arms")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused during build: {len(failures)}")
for w, fam, why in failures[-20:]:
    print(f"  {w:6s} {fam:22s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    print(f"DROPPED, too few verified arms: {thin}")
    items = [i for i in items if len(i["arms"]) >= 3]
if len(thin) > 3:
    raise SystemExit("round refused: the drops are systemic, fix the pipeline")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Batch 11 — swam and be return, the plural-s fifteen, and the first compounds",
    "tally": ("Words: 349 shipped + 77 approved and waiting; these 20 are in "
              "flight. Sentences: 21 shipped + 2 approved; batch 1 of 20 with "
              "you. Sounds: 45 of 47; uh and book-oo in round 7."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
