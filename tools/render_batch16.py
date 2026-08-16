# Batch 16: the four comeback words - bank, cage, flowers, all - each on a
# NEW mechanism, nothing re-offered.
#
# WHY THIS BATCH EXISTS. Batch 15 closed 28 of 32; these four came back
# refused or closest, and each sits inside a passage the owner kept, so a
# silent tap-to-hear waits behind every one. Per the batch-13 lesson, every
# arm here is hash-checked against batch 15's field - offering a listener
# bytes they already refused is the round-8 fault with a new date.
#
# The mechanisms, per word:
#   cage    - the soft-g suspect: carriers that end on the word, plus an
#             explicitly phonemised arm (the was/read cure).
#   flowers - two syllables: the compound treatment, slower and cut whole.
#   bank    - the frames that cracked hard cases: the stop-frame (lids'
#             winner) located by the carrier's own silences, new speeds.
#   all     - the owner's comment arrived truncated ("Little to..."), so the
#             field covers the likely axes: longer tail, slower, warmth.
#
# Usage: python3 tools/render_batch16.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import verify as V
import wordcut as wc

try:
    import pyworld
    HAS_WORLD = True
except Exception:
    HAS_WORLD = False

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

prior = json.loads((OUT / "batch15-audio.json").read_text(encoding="utf-8"))
PRIOR_SHAS = {a["sha256"] for arms in prior.values() for a in arms}


def say(t, sp=0.85, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


def shape(a, sr, tail_ms=TAIL_MS):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(tail_ms / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


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


def speech_islands(car, sr, floor_db=-32, min_ms=120, merge_ms=80):
    _, _, db, n = wc.speech_span(car, sr)
    hop = 1000 * n / sr
    loud = db > floor_db
    runs, start = [], None
    for i, v in enumerate(loud):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append([start, i]); start = None
    if start is not None:
        runs.append([start, len(loud)])
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * hop < merge_ms:
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    out = []
    for a, b in merged:
        if (b - a) * hop >= min_ms:
            out.append((int(a * n), int(b * n)))
    return out


def located(clean, carrier, csr, word):
    st, en, score = wc.template_match(clean, carrier, csr)
    if st is None or score < 0.5:
        return None
    st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=15, max_walk_ms=30)
    if V.onset_class(word) == "stop":
        st = max(0, st - int(0.06 * csr))
    return carrier[st:en]


def gate_ok(cut, word, clean, sr, allow_islands=0):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + allow_islands + (1 if V.onset_class(word) == "stop" else 0):
            return True
    return ok


def offer(word, arms, family, seg, sr, allow_islands=0, gate=True, tail_ms=TAIL_MS):
    if seg is None or len(seg) < 0.08 * sr:
        return
    s0, s1, _, _ = wc.speech_span(seg, sr)
    cut = seg[s0:s1]
    clean = arms["_clean"]
    if gate and not gate_ok(cut, word, clean, sr, allow_islands):
        return
    mp3, ms = encode(shape(cut, sr, tail_ms), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR_SHAS:
        print(f"    {word}/{family}: identical to a batch-15 arm - refused by the hash guard")
        return
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


def build():
    out = {}
    for word, plan in PLANS.items():
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        plan(word, arms)
        final = []
        for i, a in enumerate(arms["list"][:9], 1):
            a["id"] = f"{word}_{i}"
            final.append(a)
        out[word] = final
        print(f"  {word}: {len(final)} arms")
    return out


def plan_cage(word, arms):
    for sp in (0.75, 0.8, 0.85):
        car, csr = say(f"Listen—cage.", sp)
        offer(word, arms, f"listen_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    for sp in (0.8, 0.85):
        car, csr = say("The bird is in the cage.", sp)
        offer(word, arms, f"sentence_tail_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    for sp, tag in ((0.8, ""), (0.7, "_slow")):
        a, sr = say("kˈeɪdʒ", sp, phonemes=True)
        offer(word, arms, f"phoneme_sp{sp}{tag}", a, sr, gate=False)


def plan_flowers(word, arms):
    for sp in (0.7, 0.75, 0.8, 0.85):
        a, sr = say(word, sp)
        offer(word, arms, f"solo_sp{sp}", a, sr, allow_islands=1, gate=False)
    for sp in (0.7, 0.75, 0.8):
        car, csr = say(f"Listen—flowers.", sp)
        offer(word, arms, f"listen_sp{sp}", located(arms["_clean"], car, csr, word), csr, allow_islands=1)


def plan_bank(word, arms):
    for sp in (0.6, 0.7, 0.8):
        car, csr = say(f"Stop. Bank. Stop.", sp)
        isl = speech_islands(car, csr)
        if len(isl) == 3:
            a, b = isl[1]
            offer(word, arms, f"stop_sp{sp}", car[max(0, a - int(0.05 * csr)):b], csr)
    for sp in (0.7, 1.0):
        car, csr = say(f"Listen—bank.", sp)
        offer(word, arms, f"listen_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    a, sr = say("bˈæŋk", 0.8, phonemes=True)
    offer(word, arms, "phoneme_sp0.8", a, sr, gate=False)


def plan_all(word, arms):
    for sp in (0.7, 0.75, 0.8):
        a, sr = say(word, sp)
        offer(word, arms, f"solo_sp{sp}", a, sr, gate=False, tail_ms=420)
    a, sr = say("ˈɔːl", 0.75, phonemes=True)
    offer(word, arms, "phoneme_sp0.75", a, sr, gate=False, tail_ms=420)
    for sp in (0.7, 0.8):
        car, csr = say(f"Listen—all.", sp)
        offer(word, arms, f"listen_sp{sp}_longtail", located(arms["_clean"], car, csr, word), csr, tail_ms=420)
    if HAS_WORLD and arms["list"]:
        base = arms["list"][0]
        raw = base64.b64decode(base["b64"])
        tmp = OUT / "_tmp16.mp3"; tmp.write_bytes(raw)
        c = av.open(str(tmp)); s = c.streams.audio[0]
        x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
        sr2 = s.codec_context.sample_rate; c.close()
        if np.abs(x).max() > 2: x = x / 32768.0
        try:
            offer(word, arms, "solo_warm", world_colour(x, sr2, f0r=0.97, fmt=1.03), sr2, gate=False, tail_ms=420)
        except Exception as ex:
            print(f"    all/warm failed: {ex}")


PLANS = {"cage": plan_cage, "flowers": plan_flowers, "bank": plan_bank, "all": plan_all}

if __name__ == "__main__":
    result = build()
    (OUT / "batch16-audio.json").write_text(json.dumps(result), encoding="utf-8")
    thin = [w for w, a in result.items() if len(a) < 3]
    print(f"wrote batch16-audio.json; {sum(len(a) for a in result.values())} arms over {len(result)} words"
          + (f"; THIN FIELDS: {' '.join(thin)}" if thin else ""))
