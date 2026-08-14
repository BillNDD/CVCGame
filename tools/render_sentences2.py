# Sentence batch 2: twenty more decodable sentences for sentence mode, after
# batch 1 came back twenty of twenty perfect on 2026-08-11. Sentence mode's
# rule (SPEC section 12): decodable sentences built only from taught words
# plus the tricky roster.
#
# Batch 1 settled the audio path - a sentence is spoken whole at speed 1.0 and
# never cut - so this batch changes nothing about the rendering. What it tests
# is the WRITING: longer sentences, questions, and the digraph and consonant
# blend words the later levels teach, so sentence mode has enough material to
# be a mode rather than a demonstration.
#
# Every sentence here is validated mechanically before it renders: every
# word must be in the shipped bank (tools/voice-words.csv), a shipped
# tricky word, or an owner-approved heart word waiting in
# tools/pending-words/ (of, to, do, you, said, my, and). A sentence with
# any other word refuses to build. Sentences render whole at speed 1.0 -
# the pack's sentence speed - one clip per card, perfect / needs work.
#
# WRITING THIS BATCH FOUND A GAP FOR THE OWNER TO RULE ON: the article "a" is
# not taught and not on the approved heart roster, so no sentence may use it.
# Six drafts here had to be bent into "the" or "my" - "Dad has the job in the
# shop" instead of "a job". Natural English for a five-year-old needs "a", and
# it is one letter with a schwa sound the bank cannot yet spell. Adding it is
# a word-bank decision, not a rendering one, so it stays out until ruled.
#
# Usage: python render_sentences2.py <out_dir>
import base64
import csv
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")

bank = set()
with open(REPO / "tools/voice-words.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        bank.add(row["word"].strip().lower())
pending = json.loads((REPO / "tools/pending-words/pending-words.json").read_text(encoding="utf-8"))
HEART = {w for w in ("of", "to", "do", "you", "said", "my", "and") if w in pending}
ALLOWED = bank | HEART

SENTENCES = [
    "The big dog ran up the hill.",
    "Can you get my red cap?",
    "The chick is in the shed.",
    "My mom said you can dig.",
    "The fish is in the big dish.",
    "That thin man has the long chin.",
    "The bug ran up my leg.",
    "You did not miss the bus.",
    "The king said yes to the quiz.",
    "Dad has the job in the shop.",
    "The wet duck sat on the rock.",
    "Can the kid pick up the box?",
    "My pal has my top hat.",
    "The cat had the nap on my rug.",
    "This bath is hot, and my mom is mad.",
    "The hen and the pig ran to the pen.",
    "You can wash the dish with my mom.",
    "The van is in the mud.",
    "What did you get in the bag?",
    "The moth is on the shell.",
]

problems = []
for s in SENTENCES:
    for w in s.lower().replace(",", "").replace(".", "").replace("?", "").split():
        if w not in ALLOWED:
            problems.append((s, w))
if problems:
    for s, w in problems:
        print(f"NOT DECODABLE: '{w}' in \"{s}\"")
    raise SystemExit("batch refused: a sentence uses an untaught word")
print(f"validated: {len(SENTENCES)} sentences, every word taught or approved")


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


items, audit = [], []
for n, text in enumerate(SENTENCES, start=1):
    a, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
    a = np.asarray(a, np.float32)
    mp3, ms = encode(shape(a, sr), sr)
    heart = sorted({w for w in text.lower().replace(",", "").replace(".", "")
                    .replace("?", "").split() if w in HEART})
    items.append({"kind": "sentence", "id": f"s{n:02d}", "text": text,
                  "note": ("uses approved heart words: " + ", ".join(heart)) if heart else "",
                  "arms": [{"id": f"s{n:02d}", "family": "sentence", "ms": ms,
                            "b64": base64.b64encode(mp3).decode(),
                            "sha": hashlib.sha256(mp3).hexdigest()}]})
    audit.append((f"s{n:02d}", ms, float(np.abs(a).max())))
    print(f"s{n:02d}: {ms}ms  {text}")

bad = [x for x in audit if x[1] < 600 or x[2] < 0.05]
if bad:
    raise SystemExit(f"batch refused: unusable clips {bad}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sentence batch 2 — longer sentences, questions, and the digraph words",
    "tally": ("Sentences: 21 feedback clips shipped + 22 approved (batch 1 was "
              "twenty of twenty); these 20 are in flight. Words: 349 shipped + "
              "98 approved. Sounds: 45 of 47; the last two need your voice."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
