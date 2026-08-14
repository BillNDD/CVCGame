# Round 2 for the words round 1 could not settle.
#
# WHAT ROUND 1 PROVED (13 winners, 6 rejects, owner's ear):
#   - every accepted clip came from a carrier sentence; no plain render won;
#   - carrier_double ("of. of.") produced three of the six rejects.
#
# THE FAULT THE OWNER NAMED: "crackling at the end", "a zzzz at the end", "a
# small crackle at the end". A phrase's last syllable goes CREAKY in human
# speech - subglottal pressure falls at the end of a breath group - and a
# model trained on human speech reproduces it. Every round-1 carrier put the
# target word LAST, so every candidate inherited that creak.
#
# TWO REPAIRS, OFFERED SIDE BY SIDE:
#   1. bracketed frames - "up-of-up." - where the word sits MID-phrase and a
#      throwaway word takes the phrase-final creak instead;
#   2. the round-1 winning families with the creaky tail TRIMMED off.
# Plus explicit phonemes, because these irregular function words are exactly
# what a phonemiser reads wrongly from spelling.
#
# NO MEASUREMENT DECIDES WHAT THE OWNER HEARS. A creak screen was tried and
# withdrawn: it would have refused sand_3 and and_6, which the owner called
# perfect. Only the two settled refusals apply - a clip too quiet or too short
# to judge, and a "word" that is really most of its carrier.
#
# Usage: python render_batch2.py <batch.json> <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
WORD_SPEED = 0.85
LEAD_MS = 80
TAIL_MS = 300
FADE_MS = 10

batch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def frames_db(a, sr):
    n = int(0.01 * sr)
    fr = [a[i:i + n] for i in range(0, len(a) - n + 1, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    return 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9)), n


def shape(a, sr, fade_out_ms=FADE_MS):
    a = np.clip(np.asarray(a, dtype=np.float32), -1.0, 1.0).copy()
    ni, no = int(FADE_MS / 1000 * sr), int(fade_out_ms / 1000 * sr)
    if len(a) > ni + no + 10:
        a[:ni] *= np.linspace(0, 1, ni)
        a[-no:] *= np.linspace(1, 0, no)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr, bitrate=96):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder()
    e.set_bit_rate(bitrate); e.set_in_sample_rate(sr); e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def say(text, speed, phonemes=False):
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, dtype=np.float32), sr


def gap_list(a, sr, floor_db, gap_ms):
    db, n = frames_db(a, sr)
    sp = np.nonzero(db > -45)[0]
    if not len(sp):
        return [], 0, 0, n
    s0, s1 = int(sp.min()), int(sp.max())
    gaps, run = [], 0
    for i in range(s0, s1 + 1):
        if db[i] < floor_db:
            run += 1
        else:
            if run >= max(1, gap_ms // 10):
                gaps.append((i - run, i))
            run = 0
    return gaps, s0, s1, n


def cut_mid(text, speed, floor_db=-20, gap_ms=30, margin_ms=60):
    """Keep the segment between the first two gaps: in a bracketed frame
    (up-WORD-up) that segment is the target word, and it never carries the
    phrase's final creak."""
    a, sr = say(text, speed)
    gaps, s0, s1, n = gap_list(a, sr, floor_db, gap_ms)
    if len(gaps) < 2:
        return None, sr, 1.0
    start, end = gaps[0][1], gaps[1][0]
    if end - start < 12:
        return None, sr, 1.0
    seg = a[max(0, start - margin_ms // 10) * n:(end + 1) * n]
    return seg, sr, len(seg) / max(1, len(a))


def cut_final(text, speed, margin_ms=80, floor_db=-30, gap_ms=40):
    """Round 1's own cut, so a known-good shape stays on the table."""
    a, sr = say(text, speed)
    db, n = frames_db(a, sr)
    end = int(np.max(np.nonzero(db > -45)))
    run, start = 0, 0
    for i in range(end):
        run = run + 1 if db[i] < floor_db else 0
        if run >= max(1, gap_ms // 10) and (end - i) * 10 >= 200:
            start = i + 1
    seg = a[max(0, start - margin_ms // 10) * n:(end + 1) * n]
    return seg, sr, len(seg) / max(1, len(a))


def tail_trim(a, sr, ms):
    """Cut the last ms of SPEECH: where the creak or a fricative buzz lives."""
    db, n = frames_db(a, sr)
    sp = np.nonzero(db > -45)[0]
    end = (int(sp.max()) + 1) * n if len(sp) else len(a)
    return a[:max(int(0.12 * sr), end - int(ms / 1000 * sr))]


MID_FRAMES = [
    ("mid_up",    "up—{w}—up."),
    ("mid_now",   "Now—{w}—now."),
    ("mid_ready", "Ready—{w}—ready."),
    ("mid_listen", "Listen—{w}—now."),
    ("mid_it",    "it—{w}—it."),
]
END_FRAMES = [
    ("end_listen", "Listen—{w}."),
    ("end_spell",  "The printed word is “{w}”."),
]


def build(word, phoneme):
    out = []
    for name, frame in MID_FRAMES:
        for speed, tag in ((WORD_SPEED, ""), (1.0, "_s1")):
            seg, sr, kept = cut_mid(frame.replace("{w}", word), speed)
            if seg is not None and kept <= 0.60 and len(seg) > 0.16 * sr:
                out.append((name + tag, seg, sr, kept))
    for name, frame in END_FRAMES:
        for speed, tag in ((WORD_SPEED, ""), (1.0, "_s1")):
            seg, sr, kept = cut_final(frame.replace("{w}", word), speed)
            if seg is None or kept > 0.60 or len(seg) <= 0.16 * sr:
                continue
            out.append((name + tag, seg, sr, kept))
            # the same clip with the creaky tail taken off - the direct repair
            for ms in (50, 90):
                t = tail_trim(seg, sr, ms)
                if len(t) > 0.16 * sr:
                    out.append((f"{name}{tag}_trim{ms}", t, sr, kept))
    if phoneme:
        a, sr = say(phoneme, WORD_SPEED, phonemes=True)
        out.append(("phoneme", a, sr, 1.0))
        a, sr = say(phoneme, 1.0, phonemes=True)
        out.append(("phoneme_s1", a, sr, 1.0))
    return out


items, audit = [], []
for entry in batch["items"]:
    word = entry["text"]
    arms = []
    for family, seg, sr, kept in build(word, entry.get("phoneme")):
        # a longer fade for a trimmed tail, so the cut edge cannot click
        fade = 25 if "trim" in family else FADE_MS
        mp3, ms = encode(shape(seg, sr, fade), sr)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{word}_{len(arms)}", family, ms, round(float(np.abs(seg).max()), 3)))
    items.append({"kind": "word", "text": word, "note": entry.get("note", ""), "arms": arms})
    print(f"{word}: {len(arms)} arms")

bad = [a for a in audit if a[2] < 250 or a[3] < 0.05]
print(f"audit: {len(audit)} clips, {len(bad)} unusable")
for b in bad:
    print("  UNUSABLE", b)
if bad:
    raise SystemExit("round refused: clips a listener could not judge")
(OUT / "batch-data.json").write_text(json.dumps({"title": batch["title"], "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
