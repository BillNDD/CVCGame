# Round 4. Nothing reaches the owner that has not been verified to contain the
# target word and nothing else.
#
# WHAT WENT WRONG IN ROUND 3, plainly: every cut was checked for LENGTH and
# never for CONTENT. A 600 ms window starting 200 ms late is still 600 ms, so
# clips holding half of "ready" passed the check and went to the owner, who
# had to listen to them. That was my failure, not the synthesiser's.
#
# THE GATE (verify.py), proven both ways before use: it passes 6 of 6 clips
# the owner called perfect, and refuses 14 of 18 "of" arms and 15 of 16 "said"
# arms from round 3 - the very clips the owner rejected. Three tests, all
# about CONTENT, none about quality:
#   - DTW distance to the word's own solo render (is this that word at all?)
#   - syllable-island count (did a neighbouring word come along?)
#   - length ratio (clipped, or carrying company?)
# Quality remains the ear's alone.
#
# Also here: the owner's own instruction for "said" - said_4's word "sounds
# right and human but there are extra sounds at the front" - as a family of
# front-trims of exactly that clip.
#
# Usage: python render_batch4.py <batch.json> <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc
import verify as V

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

batch = json.loads(pathlib.Path(sys.argv[1]).read_text())
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(t, sp):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us")
    return np.asarray(a, np.float32), sr


def shape(a, sr, fade_out=FADE_MS):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    ni, no = int(FADE_MS / 1000 * sr), int(fade_out / 1000 * sr)
    if len(a) > ni + no + 10:
        a[:ni] *= np.linspace(0, 1, ni); a[-no:] *= np.linspace(1, 0, no)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def head_trim(a, sr, ms):
    """Take ms off the FRONT of the speech — the owner's instruction for said."""
    s0, s1, _, _ = wc.speech_span(a, sr)
    cut = s0 + int(ms / 1000 * sr)
    return a[cut:s1] if s1 - cut > 0.15 * sr else None


# Frames: the two that produced all thirteen round-1 winners, plus the teacher
# frames, at three speeds. The gate decides which survive.
FRAMES = [
    ("listen",     "Listen—{w}."),
    ("spell",      "The printed word is “{w}”."),
    ("everybody",  "{W}, everybody."),
    ("withme",     "{W}, say it with me."),
    ("again",      "{W}, and again, {w}."),
    ("say",        "Say {w}, everybody."),
    ("now",        "Now read {w}, everybody."),
    ("next",       "Class, the word {w} is next."),
    ("quoted",     "The word is “{w}”, everybody."),
    ("twice",      "{W}. {W}."),
]
SPEEDS = ((0.85, ""), (0.95, "_s95"), (1.0, "_s1"))


def candidates(word):
    out = []
    for speed, tag in SPEEDS:
        solo, sr = say(word, speed)
        s0, s1, _, _ = wc.speech_span(solo, sr)
        tpl = solo[s0:s1]
        for name, frame in FRAMES:
            text = frame.replace("{W}", word.capitalize()).replace("{w}", word)
            car, _ = say(text, speed)
            for margin, walk in ((25, 40), (10, 20), (40, 60)):
                st, en, score = wc.template_match(tpl, car, sr)
                if st is None:
                    continue
                st2, en2 = wc.refine_edges(car, sr, st, en, pad_ms=margin, max_walk_ms=walk)
                seg = car[st2:en2]
                ok, why, d = V.verify(seg, tpl, sr)
                if ok:
                    out.append((f"{name}{tag}_m{margin}", seg, sr, d))
                # the owner's front-trim instruction, applied to every family
                for tms in (30, 60, 90):
                    t = head_trim(seg, sr, tms)
                    if t is None:
                        continue
                    ok2, _, d2 = V.verify(t, tpl, sr)
                    if ok2:
                        out.append((f"{name}{tag}_m{margin}_front{tms}", t, sr, d2))
    # keep the closest matches, but spread across families so the owner is not
    # offered ten versions of one idea
    out.sort(key=lambda r: r[3])
    picked, fams = [], {}
    for fam, seg, sr, d in out:
        base = fam.split("_m")[0]
        if fams.get(base, 0) >= 2:
            continue
        fams[base] = fams.get(base, 0) + 1
        picked.append((fam, seg, sr, d))
        if len(picked) >= 12:
            break
    return picked


items, audit, refused = [], [], 0
for entry in batch["items"]:
    word = entry["text"]
    arms, seen = [], set()
    for fam, seg, sr, d in candidates(word):
        h = hashlib.sha256(np.ascontiguousarray(seg).tobytes()).hexdigest()
        if h in seen:
            continue
        seen.add(h)
        mp3, ms = encode(shape(seg, sr), sr)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{word}_{len(arms)}", fam, ms, round(float(np.abs(seg).max()), 3), round(d, 3)))
    items.append({"kind": "word", "text": word, "note": entry.get("note", ""), "arms": arms})
    print(f"{word}: {len(arms)} arms passed the content gate")

bad = [a for a in audit if a[2] < 250 or a[3] < 0.05]
print(f"audit: {len(audit)} clips, {len(bad)} unusable")
if bad:
    raise SystemExit("round refused: clips a listener could not judge")
(OUT / "batch-data.json").write_text(json.dumps({"title": batch["title"], "items": items}))
print("wrote", OUT / "batch-data.json")
