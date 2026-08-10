# Round 6. Two faults from round 5 are fixed in the tooling, not worked around:
#
#   - NO SPELLING VARIANTS. "uv", "ov" and "uhv" were offered as different
#     renditions of "of"; the model read them as LETTER NAMES and most of that
#     word's arms said "u v" to the owner. Only the real spelling, or an
#     explicit phoneme string, is ever synthesised now.
#   - THE GATE COMPARES TO THE CANONICAL WORD. Each variant used to be checked
#     against its own render, which proved only that it was self-consistent.
#     Every candidate here is checked against the true /word/ - rendered from
#     its phonemes, so the template itself cannot be a mispronunciation.
#
# Diversity now comes from knobs that cannot change the WORD: speed, frame,
# cut margin, front trim, and small WORLD pitch/formant colour.
#
# Usage: python render_batch6.py <batch.json> <out_dir>
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

batch = json.loads(pathlib.Path(sys.argv[1]).read_text())
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


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
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def head_trim(a, sr, ms):
    s0, s1, _, _ = wc.speech_span(a, sr)
    cut = s0 + int(ms / 1000 * sr)
    return a[cut:s1] if s1 - cut > 0.15 * sr else None


def onset_trim(a, sr):
    """Drop whatever precedes the first real burst — the "uh" the owner heard
    at the front of every "soft"."""
    _, _, db, n = wc.speech_span(a, sr)
    loud = np.nonzero(db > -20)[0]
    return a[max(0, (int(loud.min()) - 1) * n):] if len(loud) else a


def world_shift(a, sr, f0r, fmt):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


FRAMES = [
    ("listen",    "Listen—{w}."),
    ("spell",     "The printed word is “{w}”."),
    ("everybody", "{W}, everybody."),
    ("withme",    "{W}, say it with me."),
    ("again",     "{W}, and again, {w}."),
    ("say",       "Say {w}, everybody."),
    ("next",      "Class, the word {w} is next."),
    ("twice",     "{W}. {W}."),
    ("quoted",    "The word is “{w}”, everybody."),
    ("slowly",    "Slowly now: {w}, everybody."),
]


def build(word, phoneme, wide):
    """Every arm is a located, content-verified cut of the REAL word."""
    speeds = (0.8, 0.85, 0.9, 0.95, 1.0, 1.05) if wide else (0.85, 0.95)
    trims = (0, 30, 60, 90, 130) if wide else (0, 30, 60, 90)
    # the template is the word's TRUE sound, from its phonemes, so a
    # mispronounced candidate cannot be verified against a mispronunciation
    truth, sr = say(phoneme, 0.85, ph=True) if phoneme else say(word, 0.85)
    s0, s1, _, _ = wc.speech_span(truth, sr)
    tpl = truth[s0:s1]
    out = []
    for speed in speeds:
        for name, frame in FRAMES:
            text = frame.replace("{W}", word.capitalize()).replace("{w}", word)
            car, _ = say(text, speed)
            st, en, score = wc.template_match(tpl, car, sr)
            if st is None:
                continue
            st, en = wc.refine_edges(car, sr, st, en, pad_ms=25, max_walk_ms=40)
            seg = car[st:en]
            variants = [("", seg)]
            for tms in trims[1:]:
                t = head_trim(seg, sr, tms)
                if t is not None:
                    variants.append((f"_front{tms}", t))
            o = onset_trim(seg, sr)
            if len(o) > 0.16 * sr:
                variants.append(("_onset", o))
            for tag, v in variants:
                ok, why, d = V.verify(v, tpl, sr)
                if ok:
                    out.append((f"{name}_sp{speed}{tag}", v, sr, d))
    if wide:
        for fam, seg, sr, d in sorted(out, key=lambda r: r[3])[:5]:
            for tag, f0r, fmt in (("_warm", 0.97, 1.03), ("_bright", 1.03, 0.97)):
                try:
                    w2 = world_shift(seg, sr, f0r, fmt)
                    ok, _, d2 = V.verify(w2, tpl, sr)
                    if ok:
                        out.append((fam + tag, w2, sr, d))
                except Exception:
                    pass
    return out, sr


def diverse(c, n):
    c.sort(key=lambda r: r[3])
    picked, feats, fams = [], [], {}
    for fam, seg, sr, d in c:
        base = fam.split("_sp")[0]
        if fams.get(base, 0) >= 2:
            continue
        f = wc.logmel(seg, sr).mean(axis=0)
        if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.985 for g in feats):
            continue
        feats.append(f); fams[base] = fams.get(base, 0) + 1
        picked.append((fam, seg, sr, d))
        if len(picked) >= n:
            break
    return picked


items, audit = [], []
for entry in batch["items"]:
    if entry.get("kind") == "sentence":
        a, sr = say(entry["text"], 1.0)
        mp3, ms = encode(shape(a, sr), sr)
        items.append({"kind": "sentence", "id": entry["id"], "text": entry["text"],
                      "note": entry.get("note", ""),
                      "arms": [{"id": entry["id"], "family": "sentence", "ms": ms,
                                "b64": base64.b64encode(mp3).decode(),
                                "sha": hashlib.sha256(mp3).hexdigest()}]})
        audit.append((entry["id"], "sentence", ms, round(float(np.abs(a).max()), 3)))
        print(f"{entry['id']}: sentence"); continue
    word = entry["text"]
    cands, sr = build(word, entry.get("phoneme"), entry.get("hard", False))
    arms = []
    for fam, seg, sr2, d in diverse(cands, 14 if entry.get("hard") else 8):
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
(OUT / "batch-data.json").write_text(json.dumps({"title": batch["title"], "items": items}))
print("wrote", OUT / "batch-data.json")
