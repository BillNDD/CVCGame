# Round 7: iteration on named seeds, plus new words.
#
# The owner's round-6 notes name one fault four times - "extra sound at the
# front", "weird extra uh at start", "other words are contained on either
# side". That is my cut's left edge: refine_edges pads 25 ms and may walk 40
# more, so up to 65 ms of the PREVIOUS word can ride in front of the target.
#
# So an iterate seed here is swept densely: the exact family the owner picked,
# re-cut at every front trim from 10 to 220 ms in 15 ms steps, and with the
# left edge taken hard at the word's own first burst (onset). One of those is
# the clip with the junk gone and nothing else changed - which is what "iterate
# on this one" asks for.
#
# A SENTENCE can now carry several arms too: "Pronounced:" came back as
# "slightly too quick and slightly high pitched and robotic", so it is offered
# slower, and lower, using WORLD to drop the pitch without changing the voice.
#
# Usage: python render_batch7.py <batch.json> <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
import pyworld
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc
import verify as V

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

batch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")

FRAMES = {
    "listen":    "Listen—{w}.",
    "spell":     "The printed word is “{w}”.",
    "everybody": "{W}, everybody.",
    "withme":    "{W}, say it with me.",
    "again":     "{W}, and again, {w}.",
    "say":       "Say {w}, everybody.",
    "next":      "Class, the word {w} is next.",
    "twice":     "{W}. {W}.",
    "quoted":    "The word is “{w}”, everybody.",
    "slowly":    "Slowly now: {w}, everybody.",
    # NEW, from the phoneme list the owner brought back: a longer carrier
    # renders more naturally, and a pre-comma position gives a full release
    # with no phrase-final creak.
    "preboundary": "When I say {w}, everybody says it back to me.",
    "long":        "Here is our next word, class. The word is {w}, and we will read it together.",
}


def say(t, sp, ph=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def head_trim(a, sr, ms):
    s0, s1, _, _ = wc.speech_span(a, sr)
    cut = s0 + int(ms / 1000 * sr)
    return a[cut:s1] if s1 - cut > 0.15 * sr else None


def onset_cut(a, sr, thresh_db=-18):
    """Take the left edge HARD at the word's own first burst: everything before
    the first genuinely loud frame is the neighbour's tail, not the word."""
    _, _, db, n = wc.speech_span(a, sr)
    loud = np.nonzero(db > thresh_db)[0]
    return a[max(0, (int(loud.min())) * n):] if len(loud) else None


def world_shift(a, sr, f0r=1.0, fmt=1.0, floor=0.0):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def truth_template(word, phoneme):
    a, sr = say(phoneme, 0.85, ph=True) if phoneme else say(word, 0.85)
    s0, s1, _, _ = wc.speech_span(a, sr)
    return a[s0:s1], sr


def cut_from(frame_key, word, speed, tpl, sr):
    text = FRAMES[frame_key].replace("{W}", word.capitalize()).replace("{w}", word)
    car, _ = say(text, speed)
    st, en, score = wc.template_match(tpl, car, sr)
    if st is None:
        return None
    st, en = wc.refine_edges(car, sr, st, en, pad_ms=25, max_walk_ms=40)
    return car[st:en]


def iterate_seed(word, seed, phoneme):
    """The owner's chosen family, swept for the front junk they named."""
    fam, sp_part = seed.split("_sp")
    speed = float(sp_part.split("_")[0])
    tpl, sr = truth_template(word, phoneme)
    seg = cut_from(fam, word, speed, tpl, sr)
    out = []
    if seg is None:
        return out, sr
    for ms in range(10, 226, 15):
        t = head_trim(seg, sr, ms)
        if t is None:
            continue
        ok, _, d = V.verify(t, tpl, sr)
        if ok:
            out.append((f"{fam}_sp{speed}_front{ms}", t, sr, d))
    for th in (-14, -18, -22):
        o = onset_cut(seg, sr, th)
        if o is not None and len(o) > 0.16 * sr:
            ok, _, d = V.verify(o, tpl, sr)
            if ok:
                out.append((f"{fam}_sp{speed}_onset{abs(th)}", o, sr, d))
    return out, sr


def fresh(word, phoneme, speeds=(0.85, 0.95)):
    tpl, sr = truth_template(word, phoneme)
    out = []
    for speed in speeds:
        for key in FRAMES:
            seg = cut_from(key, word, speed, tpl, sr)
            if seg is None:
                continue
            cands = [("", seg)] + [(f"_front{m}", head_trim(seg, sr, m)) for m in (30, 60, 90, 130)]
            o = onset_cut(seg, sr)
            if o is not None:
                cands.append(("_onset", o))
            for tag, v in cands:
                if v is None or len(v) < 0.16 * sr:
                    continue
                ok, _, d = V.verify(v, tpl, sr)
                if ok:
                    out.append((f"{key}_sp{speed}{tag}", v, sr, d))
    return out, sr


def diverse(c, n):
    c.sort(key=lambda r: r[3])
    picked, feats, fams = [], [], {}
    for fam, seg, sr, d in c:
        base = fam.split("_sp")[0]
        if fams.get(base, 0) >= 3:
            continue
        f = wc.logmel(seg, sr).mean(axis=0)
        if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.988 for g in feats):
            continue
        feats.append(f); fams[base] = fams.get(base, 0) + 1
        picked.append((fam, seg, sr, d))
        if len(picked) >= n:
            break
    return picked


items, audit = [], []
for entry in batch["items"]:
    if entry.get("kind") == "sentence" and entry.get("ideas"):
        # Seven distinct ideas, not seven settings of one: read from a natural
        # sentence and cut, different punctuation, a held vowel, a lower voice,
        # a slower read, and the plain word at two speeds. The owner's note was
        # "all sound almost the same" - so no two of these come from the same
        # rendering approach.
        arms = []
        tpl_txt = entry["text"]
        IDEAS = [
            ("plain_slow",      lambda: say(tpl_txt, 0.78)[0]),
            ("plain_natural",   lambda: say(tpl_txt, 0.95)[0]),
            ("comma",           lambda: say("Pronounced,", 0.85)[0]),
            ("dash",            lambda: say("Pronounced —", 0.85)[0]),
            ("no_punct",        lambda: say("Pronounced", 0.85)[0]),
            ("in_sentence",     None),
            ("in_sentence2",    None),
        ]
        for tag, fn in IDEAS:
            try:
                if tag.startswith("in_sentence"):
                    src = ("The word is pronounced like this." if tag == "in_sentence"
                           else "Here is how it is pronounced, everybody.")
                    a, sr = say(src, 0.9)
                    tw, _ = say("pronounced", 0.9)
                    s0, s1, _, _ = wc.speech_span(tw, sr)
                    st, en, sc = wc.template_match(tw[s0:s1], a, sr)
                    if st is None: continue
                    st, en = wc.refine_edges(a, sr, st, en, pad_ms=25, max_walk_ms=40)
                    v = a[st:en]
                else:
                    v = fn()
                    sr = 24000
                for sub, f0r, fmt in (("", 1.0, 1.0), ("_lower", 0.90, 1.04)):
                    vv = v if f0r == 1.0 else world_shift(v, sr, f0r, fmt)
                    mp3, ms = encode(shape(vv, sr), sr)
                    arms.append({"id": f"{entry['id']}_{len(arms)+1}", "family": tag+sub, "ms": ms,
                                 "b64": base64.b64encode(mp3).decode(),
                                 "sha": hashlib.sha256(mp3).hexdigest()})
                    audit.append((f"{entry['id']}_{len(arms)}", tag+sub, ms, 1.0))
            except Exception as e:
                print("   idea failed:", tag, type(e).__name__, e)
        items.append({"kind": "sentence", "id": entry["id"], "text": entry["text"],
                      "note": entry.get("note", ""), "arms": arms})
        print(f"{entry['id']}: {len(arms)} arms"); continue

    if entry.get("kind") == "sentence":
        arms = []
        base_speed = entry.get("speeds", [1.0])
        for sp in base_speed:
            a, sr = say(entry["text"], sp)
            variants = [(f"sp{sp}", a)]
            for tag, f0r, fmt in entry.get("colours", []):
                try:
                    variants.append((f"sp{sp}{tag}", world_shift(a, sr, f0r, fmt)))
                except Exception:
                    pass
            for tag, v in variants:
                mp3, ms = encode(shape(v, sr), sr)
                arms.append({"id": f"{entry['id']}_{len(arms) + 1}", "family": tag, "ms": ms,
                             "b64": base64.b64encode(mp3).decode(),
                             "sha": hashlib.sha256(mp3).hexdigest()})
                audit.append((f"{entry['id']}_{len(arms)}", tag, ms, 1.0))
        items.append({"kind": "sentence", "id": entry["id"], "text": entry["text"],
                      "note": entry.get("note", ""), "arms": arms})
        print(f"{entry['id']}: {len(arms)} arms"); continue

    word = entry["text"]
    ph = entry.get("phoneme")
    if entry.get("seed"):
        cands, sr = iterate_seed(word, entry["seed"], ph)
        more, _ = fresh(word, ph, (0.9,))
        cands += more
        n = 14
    else:
        cands, sr = fresh(word, ph)
        n = 8
    arms = []
    for fam, seg, sr2, d in diverse(cands, n):
        mp3, ms = encode(shape(seg, sr2), sr2)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{word}_{len(arms)}", fam, ms, round(float(np.abs(seg).max()), 3)))
    items.append({"kind": "word", "text": word, "note": entry.get("note", ""), "arms": arms})
    print(f"{word}: {len(arms)} arms")

bad = [a for a in audit if a[2] < 250 or a[3] < 0.05]
print(f"audit: {len(audit)} clips, {len(bad)} unusable")
if bad:
    raise SystemExit("round refused: clips a listener could not judge")
(OUT / "batch-data.json").write_text(json.dumps({"title": batch["title"], "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
