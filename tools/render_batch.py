# Renders a listening batch: several humanlike candidates per NEW word, and
# one clip per new SENTENCE, then writes a click-through page with a
# copy-all export. The candidate strategies are the treatments the shipped
# bank actually won on (see docs/voice-pack.md and tools/voice-words.csv):
# carrier cuts of several shapes, speed, and the plain render.
#
# Nothing here writes to the repository. A winner becomes a row in
# tools/voice-words.csv only after the owner's ear picks it.
#
# Usage: python render_batch.py <batch.json> <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
MODEL = f"{SCRATCH}/kokoro-v1.0.onnx"
VOICES = f"{SCRATCH}/voices-v1.0.bin"

VOICE = "af_heart"
BITRATE = 96
WORD_SPEED = 0.85
SENTENCE_SPEED = 1.0
LEAD_MS = 80
TAIL_MS = 300
FADE_MS = 10
SILENCE_FLOOR_DB = -45

batch = json.loads(pathlib.Path(sys.argv[1]).read_text())
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(MODEL, VOICES)


def shape(audio, sr, lead_ms=LEAD_MS):
    a = np.clip(np.asarray(audio, dtype=np.float32), -1.0, 1.0).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    lead = np.zeros(int(lead_ms / 1000 * sr), dtype=np.float32)
    tail = np.zeros(int(TAIL_MS / 1000 * sr), dtype=np.float32)
    return np.concatenate([lead, a, tail])


def carrier_cut(text, margin_ms, floor_db, gap_ms, speed):
    """The repo's own gap search, character for character (render-voice-pack.py):
    keep what follows the carrier's last gap, backed off by margin_ms."""
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
    a = np.asarray(a, dtype=np.float32)
    n = int(0.01 * sr)
    frames = [a[i:i + n] for i in range(0, len(a) - n + 1, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in frames])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / rms.max())
    end = int(np.max(np.nonzero(db > -45)))
    run, start = 0, 0
    for i in range(end):
        run = run + 1 if db[i] < floor_db else 0
        if run >= max(1, gap_ms // 10) and (end - i) * 10 >= 200:
            start = i + 1
    cut = a[max(0, start - margin_ms // 10) * n:(end + 1) * n]
    kept = len(cut) / max(1, len(a))
    return cut, sr, kept


def encode(audio, sr):
    pcm16 = (audio * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm16.tobytes()) + enc.flush(), int(len(pcm16) * 1000 / sr)


# The candidate families. Each is a way the shipped bank actually won a word:
# a plain render, and carrier sentences of four shapes, cut back out. The
# carrier gives a final consonant its release - the treatment that fixed hop,
# hen and man, and that 239 words now use.
def candidates(word):
    out = []

    a, sr = k.create(word, voice=VOICE, speed=WORD_SPEED, lang="en-us")
    out.append(("plain", np.asarray(a, dtype=np.float32), sr, 1.0))

    a, sr = k.create(word, voice=VOICE, speed=1.0, lang="en-us")
    out.append(("plain_speed1", np.asarray(a, dtype=np.float32), sr, 1.0))

    for name, text, margin, floor, gap, speed in [
        ("carrier_listen", f"Listen—{word}.", 80, -30, 40, WORD_SPEED),
        ("carrier_spell", f"The printed word is “{word}”.", 80, -30, 40, WORD_SPEED),
        ("carrier_double", f"{word}. {word}.", 80, -32, 40, WORD_SPEED),
        ("carrier_say", f"Say {word}.", 80, -30, 40, WORD_SPEED),
        ("carrier_listen_s1", f"Listen—{word}.", 80, -30, 40, 1.0),
        ("carrier_spell_s1", f"The printed word is “{word}”.", 80, -30, 40, 1.0),
    ]:
        try:
            cut, sr, kept = carrier_cut(text, margin, floor, gap, speed)
            # settled rule: a cut that keeps most of the carrier is a PHRASE,
            # never offer one to a listener (docs/settled.md)
            if kept <= 0.60 and len(cut) > 0.2 * sr:
                out.append((name, cut, sr, kept))
        except Exception:
            pass
    return out


items = []
audit = []
for entry in batch["items"]:
    if entry["kind"] == "word":
        word = entry["text"]
        cands = candidates(word)
        arms = []
        for i, (family, audio, sr, kept) in enumerate(cands, start=1):
            mp3, ms = encode(shape(audio, sr), sr)
            peak = float(np.abs(audio).max()) if len(audio) else 0.0
            arms.append({
                "id": f"{word}_{i}",
                "family": family,
                "ms": ms,
                "b64": base64.b64encode(mp3).decode(),
                "sha": hashlib.sha256(mp3).hexdigest(),
            })
            audit.append((f"{word}_{i}", family, ms, round(peak, 3), round(kept, 2)))
        items.append({"kind": "word", "text": word, "note": entry.get("note", ""), "arms": arms})
    else:
        text = entry["text"]
        a, sr = k.create(text, voice=VOICE, speed=SENTENCE_SPEED, lang="en-us")
        mp3, ms = encode(shape(np.asarray(a, dtype=np.float32), sr), sr)
        audit.append((entry["id"], "sentence", ms, round(float(np.abs(a).max()), 3), 1.0))
        items.append({"kind": "sentence", "id": entry["id"], "text": text,
                      "note": entry.get("note", ""),
                      "arms": [{"id": entry["id"], "family": "sentence", "ms": ms,
                                "b64": base64.b64encode(mp3).decode(),
                                "sha": hashlib.sha256(mp3).hexdigest()}]})

# The audibility audit that settled.md requires BEFORE any round ships: no
# clip may be too short or too quiet to judge.
bad = [r for r in audit if r[2] < 250 or r[3] < 0.05]
print(f"audit: {len(audit)} clips, {len(bad)} unusable")
for b in bad:
    print("  UNUSABLE", b)
if bad:
    raise SystemExit("round refused: clips a listener could not judge")

(OUT / "batch-data.json").write_text(json.dumps({"title": batch["title"], "items": items}))
print(f"rendered {len(audit)} clips for {len(items)} items")
