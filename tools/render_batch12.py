# Batch 12. Built from what three batches of the owner's verdicts actually
# say, rather than from a wish for variety.
#
# THE FRAME RULE. 37 of 39 winners across batches 9, 10 and 11 came from ONE
# frame - "Listen-{word}." - and none from `everybody` or a natural sentence.
# Every word the owner called robotic was a word whose `listen` arms never
# reached the page. So `listen` is swept wide here (six speeds, front trims,
# warmth), and the other frames appear only to fill a card that `listen`
# cannot fill on its own. More of the one thing that works, not more things.
#
# ONSET RECOVERY. A `listen` cut that carries voiced lead used to be thrown
# away, which is why flag, slid, dogs, beds and lids arrived with nothing but
# losing frames. "Listen" ends in a voiced /n/, so for an unvoiced-initial
# word that lead is the neighbour, not the word: trim the cut to its own
# frication onset and re-verify instead of discarding it.
#
# STOP BURST GUARD. The owner on "tops": "the first letter sounds like an h
# instead of a t". A /t/ is a silent closure then a sharp release; cut after
# the release and only the aspiration survives, and aspiration alone IS /h/.
# For a stop-initial word the cut starts EARLIER, inside the silent closure,
# where extra lead costs nothing and a missing burst costs the word.
#
# TWO-LETTER WORDS. he, we, me, go, no, so, be failed as a class, and "we"
# said "body" - a two-letter template matches almost anywhere, including
# inside "everybody". They use the recipe that closed the vowel SOUNDS: the
# word in a repeat frame, cut only where the SOURCE shows measured silence on
# both flanks. A cut flanked by silence cannot contain a neighbour.
#
# Usage: python render_batch12.py <out_dir>
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


def trim_to_onset(cut, sr):
    """Drop voiced lead so the clip starts on the word's own frication. This
    RECOVERS a candidate the onset check would otherwise refuse: after
    "Listen" the voiced /n/ bleeds into an unvoiced-initial word, and the
    fault is the neighbour, not the word."""
    lead = V.lead_voiced_ms(cut, sr)
    if lead <= 0:
        return None
    n = int(lead / 1000 * sr)
    return cut[n:] if len(cut) - n > 0.15 * sr else None


def widen_for_stop(carrier, sr, st, en):
    """Start the cut earlier for a stop-initial word. The closure is silent,
    so the extra lead is inaudible - but without it the release can be
    clipped, and a /t/ without its release is heard as /h/."""
    return max(0, st - int(0.06 * sr)), en


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
        for i in np.argsort(scores)[::-1][:40]:
            st, en, sc = int(i) * hop, (int(i) + len(T)) * hop, float(scores[i])
            if sc < 0.6:
                break
            if all(en <= f[0] or st >= f[1] for f in [(a, b) for a, b, _ in found]):
                found.append((st, en, sc))
    found.sort(key=lambda f: -f[2])
    return found[:k_peaks]


def gate(cut, word, clean, sr, allow_islands=0):
    cls = V.onset_class(word)
    ok, why, d = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + allow_islands + (1 if cls == "stop" else 0):
            ok, why = True, "ok (burst or compound island allowed)"
    if not ok:
        return False, why, d
    if cls == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False, f"voiced lead {lead}ms", d
    return True, "ok", d


# The words, and what each one is here to answer.
RETRY = {
    "flag": "no listen arm reached you last time",
    "slid": "no listen arm reached you last time",
    "dogs": "offered only `say` last time",
    "beds": "offered only `everybody` last time",
    "lids": "offered only `everybody` and `say` last time",
    "tops": "the t was clipped to an h — the burst is protected now",
    "swam": "cuts carried the carrier in front; recovered by onset trim",
    "snug": "you marked snug_2 closest — these iterate on the listen family",
}
TWO_LETTER = ["he", "we", "me", "go", "no", "so", "be"]
COMPOUND = {"sunset": "two syllables — slower, and cut whole",
            "laptop": "two syllables — slower, and cut whole"}

LISTEN_SPEEDS = (0.75, 0.8, 0.85, 0.9, 0.95, 1.0)
OTHER = [("everybody", "{W}, everybody."), ("say", "Say {w}, everybody.")]

items, failures = [], []


def build_word(word, note, compound=False):
    solo_raw, sr = say(word, 0.85)
    clean = V.clean_onset(solo_raw, sr, word)
    cls = V.onset_class(word)
    cands = []

    def offer(family, seg, seg_sr, recover=True):
        if seg is None or len(seg) < 0.08 * seg_sr:
            return
        s0, s1, _, _ = wc.speech_span(seg, seg_sr)
        cut = seg[s0:s1]
        ok, why, d = gate(cut, word, clean, seg_sr, allow_islands=1 if compound else 0)
        if ok:
            cands.append((family, cut, seg_sr, d)); return
        # RECOVERY: a voiced-lead refusal is the neighbour, not the word
        if recover and why.startswith("voiced lead"):
            t = trim_to_onset(cut, seg_sr)
            if t is not None:
                ok2, why2, d2 = gate(t, word, clean, seg_sr, allow_islands=1 if compound else 0)
                if ok2:
                    cands.append((family + "_onset", t, seg_sr, d2)); return
                failures.append((word, family + "_onset", why2)); return
        failures.append((word, family, why))

    def located(carrier, csr, family):
        st, en, score = wc.template_match(clean, carrier, csr)
        if st is None or score < 0.55:
            failures.append((word, family, f"no match ({score:.2f})")); return None
        st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=15, max_walk_ms=30)
        if cls == "stop":
            st, en = widen_for_stop(carrier, csr, st, en)
        return carrier[st:en]

    speeds = LISTEN_SPEEDS if not compound else (0.7, 0.75, 0.8, 0.85, 0.9)
    for sp in speeds:
        car, csr = say(f"Listen—{word}.", sp)
        offer(f"listen_sp{sp}", located(car, csr, f"listen_sp{sp}"), csr)
    for fam, frame in OTHER:
        for sp in (0.8, 0.85):
            car, csr = say(frame.replace("{W}", word.capitalize()).replace("{w}", word), sp)
            offer(f"{fam}_sp{sp}", located(car, csr, f"{fam}_sp{sp}"), csr)

    # warmth on the best listen cuts only — the family that wins
    best = [c for c in sorted(cands, key=lambda r: r[3]) if c[0].startswith("listen")][:3]
    for fam, cut, csr, d in best:
        for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)), ("breath", dict(breath=1.25)),
                        ("low", dict(f0r=0.94))):
            try:
                offer(f"{fam}_{tag}", world_colour(cut, csr, **kw), csr, recover=False)
            except Exception as e:
                failures.append((word, f"{fam}_{tag}", f"world: {e}"))
    return cands, clean, note


def speech_islands(car, sr, floor_db=-32, min_ms=120, merge_ms=80):
    """Every audible span in a carrier, with the silence on each side.

    -32 dB keeps a quiet /h/ or /s/ inside its own word; 80 ms of merging keeps
    a stop closure inside it; 120 ms drops clicks. Returns
    (start, end, pre_ms, post_ms) in sample offsets.
    """
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
    for idx, (a, b) in enumerate(merged):
        if (b - a) * hop < min_ms:
            continue
        pre = (a - merged[idx - 1][1]) * hop if idx else a * hop
        post = (merged[idx + 1][0] - b) * hop if idx + 1 < len(merged) else (len(loud) - b) * hop
        out.append((int(a * n), int(b * n), pre, post, idx))
    return out


def build_two_letter(word):
    """Locate a two-letter word by the carrier's own silence, not by matching.

    A solo "he" is 530 ms of speech because the render trails a long creak, but
    the same word inside a frame runs about half that, so every template-matched
    window overran into the neighbour: batch 12's first build refused all seven
    words with "flanks 0/120" and the owner's batch-10 verdict on he was "they
    all said 'and he ran'". Silence cannot have that fault - the boundaries ARE
    the gaps. The template's only job here is the content check.

    The first island of an utterance is never offered. af_heart puts an 85-115 ms
    voiced blob at the start of every render, and that blob is what the owner has
    now refused three times as "a big sound or a word in front".
    """
    solo_raw, sr = say(word, 0.85)
    s0, s1, _, _ = wc.speech_span(solo_raw, sr)
    tpl = solo_raw[s0:s1]
    W = word.capitalize()
    cands = []
    FRAMES = (("rep", f"{W}. {W}. {W}."), ("sit", f"Sit. {W}. Sit."),
              ("stop", f"Stop. {W}. Stop."), ("listen", f"Listen—{word}."))
    for sp in (0.6, 0.7, 0.8, 0.85):
        for fam, frame in FRAMES:
            car, csr = say(frame, sp)
            for st, en, pre, post, idx in speech_islands(car, csr):
                if idx == 0:
                    failures.append((word, f"{fam}_sp{sp}", "first island: the blob")); continue
                if pre < 60 or post < 60:
                    failures.append((word, f"{fam}_sp{sp}", f"flanks {pre:.0f}/{post:.0f}ms")); continue
                cut = car[st:en]
                ok, why, d = V.verify(cut, tpl, csr)
                if not ok:
                    failures.append((word, f"{fam}_sp{sp}", why)); continue
                cands.append((f"{fam}_sp{sp}", cut, csr, d))
    # warmth on the best cuts, the knob that won batches 9 to 11
    for fam, cut, csr, d in sorted(cands, key=lambda r: r[3])[:3]:
        for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)), ("breath", dict(breath=1.25))):
            try:
                col = world_colour(cut, csr, **kw)
                ok, why, d2 = V.verify(col, tpl, csr)
                if ok:
                    cands.append((f"{fam}_{tag}", col, csr, d2))
                else:
                    failures.append((word, f"{fam}_{tag}", why))
            except Exception as e:
                failures.append((word, f"{fam}_{tag}", f"world: {e}"))
    return cands, tpl, "two-letter: located by the carrier's own silence"


PLAN = ([(w, n, False) for w, n in RETRY.items()]
        + [(w, n, True) for w, n in COMPOUND.items()]
        + [(w, None, None) for w in TWO_LETTER])

for word, note, compound in PLAN:
    if compound is None:
        cands, clean, note = build_two_letter(word)
    else:
        cands, clean, note = build_word(word, note, compound)
    cands.sort(key=lambda r: r[3])
    arms, seen_fam, feats = [], {}, []
    for fam, cut, csr, d in cands:
        base = fam.split("_sp")[0]
        if seen_fam.get(base, 0) >= 6:
            continue
        f = wc.logmel(cut, csr).mean(axis=0)
        if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.996 for g in feats):
            continue
        mp3, ms = encode(shape(cut, csr), csr)
        dec, dsr = decode(mp3)
        d0, d1, _, _ = wc.speech_span(dec, dsr)
        # Every arm is re-checked after the encode, because the bytes the owner
        # hears are the encoded ones. The two-letter path checks content only:
        # its clean is the raw template, so the onset check that build_word
        # uses does not apply.
        if compound is None:
            ok, why, _ = V.verify(dec[d0:d1], clean, dsr)
        else:
            ok, why, _ = gate(dec[d0:d1], word, clean, dsr, allow_islands=1 if compound else 0)
        if not ok:
            failures.append((word, fam, f"after encode: {why}")); continue
        seen_fam[base] = seen_fam.get(base, 0) + 1
        feats.append(f)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": hashlib.sha256(mp3).hexdigest()})
        if len(arms) >= 9:
            break
    items.append({"kind": "word", "text": word, "note": note or "", "arms": arms})
    print(f"{word}: {len(arms)} arms ({len(cands)} passed the gate)")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
print(f"\nrefused: {len(failures)}")
for w, fam, why in failures[-25:]:
    print(f"  {w:7s} {fam:26s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    print(f"DROPPED, too few verified arms: {thin}")
    items = [i for i in items if len(i["arms"]) >= 3]
if len(thin) > 4:
    raise SystemExit("round refused: the drops are systemic")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Batch 12 — the listen frame swept wide, plus the two-letter words on a new recipe",
    "tally": ("Words: 349 shipped + 98 approved and waiting. Sentences: 21 shipped + 22 "
              "approved (sentence mode's twenty are done). Sounds: 45 of 47; the last two "
              "need your voice."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
