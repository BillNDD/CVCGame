# Sentence batch 4, round 7: the twelve sentences of Level 21, Cats and Dogs.
#
# WHY THIS BATCH EXISTS. The plural level was ruled on 2026-08-16 (docs/settled.md,
# "Level 21, the plural level - five verdicts on one page"): a 14-word roster of
# plurals the owner approved by ear in batches 9-11, romp seated in Level 19, and
# a sentence pool culled by the owner on two page rounds - seven drafts survived
# round one, the owner wrote one of their own ("The maps rest on the desk."), and
# four eight-word candidates survived round two. Those twelve sentences have never
# been rendered; this batch gives each one clip at sentence speed for the owner's
# ear, the same treatment every shipped sentence had.
#
# THE SEAT CHECK. tools/decodable.mjs is the arbiter for the shipped bank, but the
# plurals are not IN the bank yet - that is the point of the round - so this batch
# carries the same arithmetic inline: every word must be taught (bank, heart, one
# of the 14 ruled plurals at Level 21, or romp at its ruled Level 19 seat), and
# every sentence must seat at Level 21. A sentence that fails does not render.
# When the level ships, decodable.mjs re-checks the same sentences against the
# real bank, so this inline check is a scaffold, not a replacement.
#
# Usage: python tools/render_sentences4.py <out_dir>
import base64
import hashlib
import json
import pathlib
import subprocess
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
SPEED = 1.0
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

PLURALS = ["cats", "hats", "pots", "maps", "cups", "hens", "pigs",
           "bugs", "pens", "kids", "dogs", "beds", "tops", "lids"]

# The pool the owner's two page rounds left standing, in the order ruled.
SENTENCES = [
    "The kids grab the cups.",
    "The dogs dig in the sand.",
    "The kids get red hats.",
    "The lids fit on the pots.",
    "Six hens sat in the mud.",
    "The bugs hop on the pots.",
    "The pigs dig in the mud.",
    "The maps rest on the desk.",          # the owner's own sentence
    "The dogs run to the pond to swim.",
    "The kids grab the cups and the pens.",
    "The bugs hop on the pots and lids.",
    "Pigs and hens romp in the wet mud.",
]


def check_all():
    """Same arithmetic the decision page verified, run again before any render."""
    script = (
        "import('./src/engine.js').then(e => {"
        "  const wl = {};"
        "  e.LEVELS.forEach(l => l.words.forEach(w => wl[w] = l.n));"
        f"  {json.dumps(PLURALS)}.forEach(p => wl[p] = 21);"
        "  wl['romp'] = 19;"
        "  const sents = JSON.parse(process.argv[1]);"
        "  let bad = 0;"
        "  for (const s of sents) {"
        "    const toks = s.toLowerCase().replace(/[.!?,]/g, '').split(/\\s+/);"
        "    const unknown = toks.filter(t => !(t in wl));"
        "    const seat = Math.max(...toks.map(t => wl[t] ?? 0));"
        "    if (unknown.length || seat !== 21 || toks.length > 8) {"
        "      console.error('REFUSE ' + s + ' unknown=' + unknown + ' seat=' + seat + ' words=' + toks.length);"
        "      bad++;"
        "    }"
        "  }"
        "  process.exit(bad ? 1 : 0);"
        "})"
    )
    r = subprocess.run(["node", "-e", script, json.dumps(SENTENCES)],
                       cwd=REPO, capture_output=True, text=True)
    if r.stderr.strip():
        print(r.stderr.strip())
    if r.returncode != 0:
        raise SystemExit("batch refused: a sentence failed the seat check")
    print(f"seat check: all {len(SENTENCES)} sentences seat at Level 21, every word taught")


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder()
    e.set_bit_rate(96)
    e.set_in_sample_rate(sr)
    e.set_channels(1)
    e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


if __name__ == "__main__":
    OUT = pathlib.Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    check_all()
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

    out = {}
    for text in SENTENCES:
        audio, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
        mp3, ms = encode(shape(np.asarray(audio, np.float32), sr), sr)
        out[text] = {"b64": base64.b64encode(mp3).decode(),
                     "sha256": hashlib.sha256(mp3).hexdigest(), "ms": ms}
        print(f"  {ms}ms  {text}")
    path = OUT / "r7-audio.json"
    path.write_text(json.dumps(out), encoding="utf-8")
    print(f"wrote {path} ({len(out)} clips)")
