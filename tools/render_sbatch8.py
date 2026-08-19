# Sentence renderer: one take per accepted text, at the pack's sentence speed.
# Owner-ruled 2026-08-18 (docs/settled.md): sentences are single takes, offered
# for a yes/no listen, never a comparison field. Rendered whole at speed 1.0,
# the speed every shipped sentence clip used.
#
# Usage: python3 tools/render_sbatch2.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

batch = json.loads((OUT.parent / "sbatch8-render.json").read_text(encoding="utf-8"))
# id counters continue from what the ledger already holds, so a level that
# banked takes in batch 1 cannot mint a colliding id here (L6 would have)
_led = json.loads((REPO / "tools/pending-words/pending-words.json").read_text(encoding="utf-8"))
texts = batch["accepted"]
print("rendering %d accepted texts, one take each" % len(texts), flush=True)


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    out = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                          np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    n = int(FADE_MS / 1000 * sr)
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


out = {}
counts = {}
import re as _re
# F3: the ledger is written by a LATER step, so it is a stale floor between a
# render and its record. Mint from the ledger UNION every take already rendered
# to disk. Same lesson as PRIOR_SHAS globbing only batch*: a guard whose source
# updates on a different schedule is a guard with a window of blindness.
_ids = set(_led)
for _f in OUT.glob("sbatch*-audio.json"):
    try:
        _ids |= set(json.loads(_f.read_text(encoding="utf-8")))
    except Exception:
        pass
for _key in _ids:
    m = _re.match(r"s:v3-l(\d+)-(\d+)$", _key)
    if m:
        n = int(m.group(1))
        counts[n] = max(counts.get(n, 0), int(m.group(2)))
for row in texts:
    n, text = row["level"], row["text"]
    counts[n] = counts.get(n, 0) + 1
    sid = "s:v3-l%02d-%02d" % (n, counts[n])
    a, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
    a = np.asarray(a, np.float32)
    pcm = (shape(a, sr) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    mp3 = e.encode(pcm.tobytes()) + e.flush()
    ms = int(len(pcm) * 1000 / sr)
    out[sid] = [{"id": sid, "family": "sentence_sp1.0", "ms": ms, "text": text,
                 "level": n, "kind": row["kind"],
                 "b64": base64.b64encode(mp3).decode(),
                 "sha256": hashlib.sha256(mp3).hexdigest()}]
    print("  %s  %4d ms  %s" % (sid, ms, text), flush=True)

(OUT / "sbatch8-audio.json").write_text(json.dumps(out), encoding="utf-8")
print("wrote sbatch8-audio.json; %d takes" % len(out), flush=True)
