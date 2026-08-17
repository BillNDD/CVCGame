# Batch 18: the first train batch toward the full target bank - the A-to-L half
# of the short-decodable family (33 words), plus the three comebacks: as and
# than on new mechanisms, and cage on the novel approaches the owner ordered
# on 2026-08-16 ("Keep trying with novel approaches to get a good cage
# recording").
#
# Standard words ride the settled recipe: listen sweeps starting 0.7 (the
# batch-16 finding - all three winners were listen_sp0.7) plus two solos.
# Nothing here needs a sound the sidecar is still making: word clips never
# wait on sounds - only sound-outs and seats do.
#
# The comebacks, per word:
#   as    - refused in batch 17 on solos and listens; now: phonemised arms
#           (the was/read cure), the stop-frame (lids' winner), a fresh speed.
#   than  - same treatment; its th needs the frame more than the sweep.
#   cage  - novel only, nothing recycled: word-INITIAL carrier cuts, a
#           lengthened phoneme, a spaced phoneme spliced back together, a
#           wide world_colour grid, and byte-splices whose /k/ comes from the
#           approved shipped w-cat clip.
#
# Every arm is hash-checked against every prior batch field in the out dir -
# offering a listener bytes they already refused is the round-8 fault.
#
# The first run left three thin fields (gets, goats, lots - the sweep's cuts
# failed the gate) and two of cage's ordered mechanisms empty (the initial-
# carrier islands merged; the spaced phoneme never split). --topup reruns
# exactly those words on repaired mechanisms and merges into the existing
# field; the hash guard swallows anything the first run already made.
#
# Usage: python3 tools/render_batch18.py <out_dir> [--topup]
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

PRIOR_SHAS = set()
for f in OUT.glob("batch*-audio.json"):
    prior = json.loads(f.read_text(encoding="utf-8"))
    PRIOR_SHAS |= {a["sha256"] for arms in prior.values() for a in arms}

STANDARD = ("as bill brush cakes coat coats cold comes cops dust fill find fly "
            "fold frog gates gets goat goats gold grass held hits hold holes "
            "hunt into jumps liked likes lived logs lots").split()
STANDARD = [w for w in STANDARD if w not in ("as",)]  # as is a comeback, below
TWO_SYLL = {"into", "noses"}


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


def decode_mp3(path):
    c = av.open(str(path)); s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate; c.close()
    if np.abs(x).max() > 2:
        x = x / 32768.0
    return x, sr


def world_colour(a, sr, f0r=1.0, fmt=1.0):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
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
        print(f"    {word}/{family}: identical to a prior-batch arm - refused by the hash guard")
        return
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


def plan_standard(word, arms):
    ai = 1 if word in TWO_SYLL else 0
    for sp in (0.7, 0.75, 0.8):
        car, csr = say(f"Listen—{word}.", sp)
        offer(word, arms, f"listen_sp{sp}", located(arms["_clean"], car, csr, word), csr, allow_islands=ai)
    for sp in (0.7, 0.8):
        a, sr = say(word, sp)
        offer(word, arms, f"solo_sp{sp}", a, sr, allow_islands=ai, gate=False)


def stop_frame(word, arms, sp):
    car, csr = say(f"Stop. {word.capitalize()}. Stop.", sp)
    isl = speech_islands(car, csr)
    if len(isl) == 3:
        a, b = isl[1]
        offer(word, arms, f"stop_sp{sp}", car[max(0, a - int(0.05 * csr)):b], csr)


def plan_as(word, arms):
    for sp in (0.7, 0.75):
        a, sr = say(word, sp)
        offer(word, arms, f"solo_sp{sp}", a, sr, gate=False)
    for sp in (0.7, 0.8):
        a, sr = say("ˈæz", sp, phonemes=True)
        offer(word, arms, f"phoneme_sp{sp}", a, sr, gate=False)
    for sp in (0.6, 0.7):
        stop_frame(word, arms, sp)
    car, csr = say("Listen—as.", 0.65)
    offer(word, arms, "listen_sp0.65", located(arms["_clean"], car, csr, word), csr)


def plan_than(word, arms):
    a, sr = say(word, 0.7)
    offer(word, arms, "solo_sp0.7", a, sr, gate=False)
    for sp in (0.7, 0.8):
        a, sr = say("ðˈæn", sp, phonemes=True)
        offer(word, arms, f"phoneme_sp{sp}", a, sr, gate=False)
    for sp in (0.6, 0.7):
        stop_frame(word, arms, sp)
    car, csr = say("Listen—than.", 0.65)
    offer(word, arms, "listen_sp0.65", located(arms["_clean"], car, csr, word), csr)


def crossfade_join(a, b, sr, fade_ms):
    n = int(fade_ms / 1000 * sr)
    if n <= 0 or len(a) < n or len(b) < n:
        return np.concatenate([a, b])
    ramp = np.linspace(0, 1, n).astype(np.float32)
    mid = a[-n:] * (1 - ramp) + b[:n] * ramp
    return np.concatenate([a[:-n], mid, b[n:]])


def plan_cage(word, arms):
    # 1. word-initial carrier: the word leads, the sentence follows.
    for sp in (0.7, 0.8):
        car, csr = say("Cage the bird.", sp)
        isl = speech_islands(car, csr)
        if isl:
            a, b = isl[0]
            offer(word, arms, f"initial_sp{sp}", car[max(0, a - int(0.05 * csr)):b], csr)
    # 2. lengthened phoneme vowel.
    a, sr = say("kˈeɪːdʒ", 0.7, phonemes=True)
    offer(word, arms, "phoneme_long_sp0.7", a, sr, gate=False)
    # 3. spaced phoneme, spliced back together across the gap.
    a, sr = say("kˈeɪ dʒ", 0.75, phonemes=True)
    isl = speech_islands(a, sr, min_ms=60)
    if len(isl) == 2:
        gap = np.zeros(int(0.03 * sr), np.float32)
        joined = np.concatenate([a[isl[0][0]:isl[0][1]], gap, a[isl[1][0]:isl[1][1]]])
        offer(word, arms, "phoneme_spaced_sp0.75", joined, sr, gate=False)
    # 4. wide world_colour grid on a fresh listen cut.
    if HAS_WORLD:
        car, csr = say("Listen—cage.", 0.7)
        seg = located(arms["_clean"], car, csr, word)
        if seg is not None:
            for f0r, fmt in ((0.94, 1.0), (1.0, 1.03), (0.97, 0.97), (1.03, 1.0)):
                try:
                    offer(word, arms, f"world_f{f0r}_m{fmt}", world_colour(seg, csr, f0r, fmt), csr, gate=False)
                except Exception as ex:
                    print(f"    cage/world {f0r}x{fmt} failed: {ex}")
    # 5. byte-splice: the approved shipped /k/ of w-cat, joined to a fresh eIdZ.
    try:
        cat, csr2 = decode_mp3(REPO / "app" / "dist" / "voice" / "w-cat.mp3")
        s0, _, _, _ = wc.speech_span(cat, csr2)
        konset = cat[s0:s0 + int(0.09 * csr2)]
        tail, tsr = say("ˈeɪdʒ", 0.75, phonemes=True)
        if tsr == csr2:
            t0, t1, _, _ = wc.speech_span(tail, tsr)
            for fade in (8, 20):
                offer(word, arms, f"splice_cat_k_f{fade}",
                      crossfade_join(konset, tail[t0:t1], tsr, fade), tsr, gate=False)
        else:
            print(f"    cage/splice skipped: sample rates differ ({csr2} vs {tsr})")
    except Exception as ex:
        print(f"    cage/splice failed: {ex}")


# ---------------------------------------------------------------- topup
TOPUP_SENTENCES = {"gets": "She gets the hat.", "goats": "The goats run fast.",
                   "lots": "We have lots."}


def plan_topup_thin(word, arms):
    stop_frame(word, arms, 0.7)
    for sp in (0.7, 0.8):
        car, csr = say(TOPUP_SENTENCES[word], sp)
        offer(word, arms, f"sentence_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    a, sr = say(word, 0.75)
    offer(word, arms, "solo_sp0.75", a, sr, gate=False)


def plan_topup_cage(word, arms):
    # The initial-carrier mechanism, repaired: template-locate the word at the
    # sentence's head instead of trusting island boundaries that merged.
    for sp in (0.7, 0.8):
        car, csr = say("Cage the bird.", sp)
        offer(word, arms, f"initial_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    # The spaced phoneme, repaired: looser island floor so the gap is seen.
    a, sr = say("kˈeɪ dʒ", 0.75, phonemes=True)
    isl = speech_islands(a, sr, floor_db=-35, min_ms=40, merge_ms=40)
    if len(isl) >= 2:
        gap = np.zeros(int(0.03 * sr), np.float32)
        joined = np.concatenate([a[isl[0][0]:isl[0][1]], gap, a[isl[-1][0]:isl[-1][1]]])
        offer(word, arms, "phoneme_spaced_sp0.75", joined, sr, gate=False)
    else:
        print(f"    cage/spaced: still no split ({len(isl)} islands) - reported, not hidden")


def plan_topup_frame(word, arms):
    # Looser stop frames for the comebacks whose first frames merged away.
    for sp in (0.6, 0.7):
        car, csr = say(f"Stop. {word.capitalize()}. Stop.", sp)
        isl = speech_islands(car, csr, floor_db=-35, min_ms=100, merge_ms=60)
        if len(isl) == 3:
            a, b = isl[1]
            offer(word, arms, f"stopx_sp{sp}", car[max(0, a - int(0.05 * csr)):b], csr)
        else:
            print(f"    {word}/stopx_sp{sp}: {len(isl)} islands, no middle to cut")


TOPUP_PLANS = {"gets": plan_topup_thin, "goats": plan_topup_thin, "lots": plan_topup_thin,
               "cage": plan_topup_cage, "as": plan_topup_frame, "than": plan_topup_frame}


def build(plans):
    out = {}
    for word, plan in plans:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        plan(word, arms)
        out[word] = arms["list"]
        print(f"  {word}: {len(arms['list'])} arms")
    return out


if __name__ == "__main__":
    path = OUT / "batch18-audio.json"
    if "--topup" in sys.argv:
        existing = json.loads(path.read_text(encoding="utf-8"))
        fresh = build(list(TOPUP_PLANS.items()))
        for word, new_arms in fresh.items():
            have = existing.get(word, [])
            for a in new_arms:
                a["id"] = f"{word}_{len(have) + 1}"
                have.append(a)
            existing[word] = have
        result = existing
    else:
        plans = [("as", plan_as), ("than", plan_than), ("cage", plan_cage)]
        plans += [(w, plan_standard) for w in STANDARD]
        result = build(plans)
        for word, arms_list in result.items():
            final = []
            for i, a in enumerate(arms_list[:9], 1):
                a["id"] = f"{word}_{i}"
                final.append(a)
            result[word] = final
    path.write_text(json.dumps(result), encoding="utf-8")
    thin = [w for w, a in result.items() if len(a) < 3]
    print(f"wrote batch18-audio.json; {sum(len(a) for a in result.values())} arms over {len(result)} words"
          + (f"; THIN FIELDS: {' '.join(thin)}" if thin else ""))
