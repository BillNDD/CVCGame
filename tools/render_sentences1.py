# Sentence batch 1: the first proofing batch for sentence mode, on the
# owner's 2026-08-10 instruction. Sentence mode's rule (SPEC section 12):
# decodable sentences built only from taught words plus the tricky roster.
#
# Every sentence here is validated mechanically before it renders: every
# word must be in the shipped bank (tools/voice-words.csv), a shipped
# tricky word, or an owner-approved heart word waiting in
# tools/pending-words/ (of, to, do, you, said, my, and). A sentence with
# any other word refuses to build. Sentences render whole at speed 1.0 -
# the pack's sentence speed - one clip per card, perfect / needs work.
#
# Usage: python render_sentences1.py <out_dir>
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
with open(REPO / "tools/voice-words.csv") as f:
    for row in csv.DictReader(f):
        bank.add(row["word"].strip().lower())
pending = json.loads((REPO / "tools/pending-words/pending-words.json").read_text())
HEART = {w for w in ("of", "to", "do", "you", "said", "my", "and") if w in pending}
ALLOWED = bank | HEART

SENTENCES = [
    "The cat sat on the mat.",
    "My dog can run.",
    "The hen is in the pen.",
    "You can dig in the mud.",
    "The pig sat in the sun.",
    "Dad had ham and jam.",
    "The sun is hot.",
    "You can hop to the top.",
    "The fish is in the net.",
    "Mom said yes to you.",
    "The duck is wet.",
    "Can you get the box?",
    "The king can sing.",
    "This bug is big.",
    "That cup is red.",
    "The kid can zip and run.",
    "Dad can pack the bag.",
    "The moth is on the rock.",
    "When can you nap?",
    "The doll is on the bed.",
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
    "title": "Sentence batch 1 — twenty decodable sentences for sentence mode",
    "tally": ("Sentences: 21 feedback clips shipped + 2 approved; these 20 are "
              "the first sentence-mode proofing batch. Words: 349 shipped + 77 "
              "approved. Sounds: 45 of 47 done; uh and book-oo in round 7."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
