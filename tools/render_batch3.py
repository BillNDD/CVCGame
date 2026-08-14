# Round 3: teacher register, and cuts that are located rather than guessed.
#
# THE OWNER'S TWO INSTRUCTIONS FROM ROUND 2:
#   "in the style of a school teacher educating a classroom"
#   "terrible cut positions (cut the word off or have a lot of extra words)"
#
# What changed, and why:
#
# 1. CUTS ARE LOCATED, NOT GUESSED. The silence search of rounds 1 and 2 only
#    knew where the sound dipped, so in "Ready-of-ready." it ran on into the
#    next word and shipped "of red". wordcut.template_match renders the word
#    alone and slides that template over the carrier on log-mel features to
#    find where the same word actually is; refine_edges then nudges the span
#    to a quiet frame but WALKS AT MOST 40 ms, so it can never swallow a
#    neighbour. Every candidate is checked against the solo render's own
#    length and dropped if it is much shorter (clipped) or much longer
#    (carrying company) - the same kind of refusal as the 60%-of-carrier rule,
#    about broken cuts only, never about quality.
#
# 2. THE REGISTER IS A TEACHER'S. Every frame addresses a class - "Milk,
#    everybody.", "Say milk, everybody.", "Class, the word milk is next." -
#    which is also why they work acoustically: in each one the target word is
#    followed by a comma and more speech, so it is never phrase-final and
#    never carries the utterance-final creak the owner heard as crackle.
#
# 3. WHAT IS NOT OFFERED AGAIN. Plain renders (nothing plain has ever been
#    accepted) and phoneme renders (the owner: "the last two are terribly
#    robotic" - those two were the phoneme arms).
#
# Usage: python render_batch3.py <batch.json> <out_dir>
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

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

batch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(text, speed):
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
    return np.asarray(a, dtype=np.float32), sr


def shape(a, sr, fade_out_ms=FADE_MS):
    a = np.clip(np.asarray(a, np.float32), -1.0, 1.0).copy()
    ni, no = int(FADE_MS / 1000 * sr), int(fade_out_ms / 1000 * sr)
    if len(a) > ni + no + 10:
        a[:ni] *= np.linspace(0, 1, ni)
        a[-no:] *= np.linspace(1, 0, no)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder()
    e.set_bit_rate(96); e.set_in_sample_rate(sr); e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


# Every frame speaks to a class, and in every one the target is followed by a
# comma and more speech, so it is never the phrase's last syllable.
FRAMES = [
    ("teach_everybody", "{W}, everybody.",              True),
    ("teach_withme",    "{W}, say it with me.",         True),
    ("teach_class",     "{W}, class. Say it with me.",  True),
    ("teach_again",     "{W}, and again, {w}.",         True),
    ("teach_say",       "Say {w}, everybody.",          False),
    ("teach_now",       "Now read {w}, everybody.",     False),
    ("teach_next",      "Class, the word {w} is next.", False),
    ("teach_listen",    "Listen: {w}, and again.",      False),
]
SPEEDS = ((0.85, ""), (0.95, "_s95"))


def build(word):
    """Returns [(family, segment, sr, note)] - every arm a located cut."""
    out = []
    for speed, tag in SPEEDS:
        solo, sr = say(word, speed)
        s0, s1, _, _ = wc.speech_span(solo, sr)
        tpl = solo[s0:s1]
        solo_ms = (s1 - s0) / sr * 1000
        for name, frame, word_first in FRAMES:
            text = frame.replace("{W}", word.capitalize()).replace("{w}", word)
            car, _ = say(text, speed)
            st, en, score = wc.template_match(tpl, car, sr)
            if st is None:
                continue
            st, en = wc.refine_edges(car, sr, st, en)
            seg = car[st:en]
            got = len(seg) / sr * 1000
            # a located cut must be about as long as the word itself: much
            # shorter is clipped, much longer is carrying a neighbour
            if not (0.75 * solo_ms <= got <= 1.55 * solo_ms):
                continue
            if score < 0.55:
                continue
            out.append((f"{name}{tag}", seg, sr, f"score {score:.2f}"))
            # where the word leads the frame, its own speech onset is an EXACT
            # left boundary - no search at all - so offer that cut beside it
            if word_first:
                fi = wc.first_instance(car, sr)
                if fi is not None:
                    fims = len(fi) / sr * 1000
                    if 0.75 * solo_ms <= fims <= 1.55 * solo_ms:
                        out.append((f"{name}{tag}_onset", fi, sr, "onset cut"))
    return out


items, audit = [], []
for entry in batch["items"]:
    word = entry["text"]
    arms = []
    seen = set()
    for family, seg, sr, note in build(word):
        h = hashlib.sha256(np.ascontiguousarray(seg).tobytes()).hexdigest()
        if h in seen:                      # never offer the same audio twice
            continue
        seen.add(h)
        mp3, ms = encode(shape(seg, sr), sr)
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
