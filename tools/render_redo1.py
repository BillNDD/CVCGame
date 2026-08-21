# The owner's 2026-08-21 sentence-edit round: four approved texts re-rendered
# with their ruled fixes, on the standing recipe (af_heart, speed 1.0, lame
# 96 kbps mono q2 - render_sbatch18.py's, verbatim). The ids are the shipped
# ids: each take REPLACES its text and audio together when the owner accepts
# it, never one without the other. No text here carries a homograph, and the
# guard that would catch one is inherited unchanged.
#
#   l44-01  "I filled the tub with mom."  ->  "Mom filled the tub."
#   l74-02  "I can see every leaf"        ->  "I did see every leaf" (house did-past, ruled kept the same morning)
#   l66-02  "a sack of yam"               ->  "a sack" (yams is banked nowhere; the yam added nothing)
#   l43-01  "Mom asked, milk?"            ->  "Mom asked if I want milk."
#
# Every rewrite was checked by the decodable arbiter at its level before this
# script existed; the fresh words each level teaches are unchanged.
import base64
import io
import json
import pathlib
import sys

import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "tools" / "pending-words"
VOICE = "af_heart"

TEXTS = [
    {"level": 44, "seq": 1, "text": "Mom filled the tub. I got in with my duck. Then I did a splash. I yelled to mom, and she got wet! We had fun."},
    {"level": 74, "seq": 2, "text": "It was late, and Mom let me stay up to see the moon. We sat on the step, and it was cold. The moon was big and white, and it was so bright that I did see every leaf on the shrub. Soon a fox went by, right in the light of it! Mom said hush, and the fox went on up the hill and did not see us. Then it got too cold to sit, and we went in. From my bed I can see the moon, and it is in my room as well."},
    {"level": 66, "seq": 2, "text": "Five kids came to my home to play. I had to hide, and the best spot was inside the shed. I sat on a sack and did not let them see me. Then a hen came inside and sat on my hat. I had to jump up, and then they all ran in. It was a fine game, and the hen was the best of us all."},
    {"level": 43, "seq": 1, "text": "We packed the backpack. Mom asked if I want milk. I picked milk. Dad helped us zip it up."},
]

AMBIGUOUS = ["read", "live", "wind", "tear", "lead", "bow", "row", "close"]


def main():
    for row in TEXTS:
        words = [w.strip(".,!?").lower() for w in row["text"].split()]
        hits = [w for w in words if w in AMBIGUOUS]
        if hits:
            raise SystemExit("a homograph reached the plain renderer: %s - it needs a say row, not this script" % hits)
    print("homograph guard: none of the four texts carries one", flush=True)

    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))
    out = {}
    import lameenc
    for row in TEXTS:
        sid = "s:v3-l%02d-%02d" % (row["level"], row["seq"])
        a, sr = k.create(row["text"], voice=VOICE, speed=1.0, lang="en-us")
        pcm = np.asarray(a, dtype=np.float32)
        ms = int(round(len(pcm) / float(sr) * 1000))
        enc = lameenc.Encoder()
        enc.set_bit_rate(96)
        enc.set_in_sample_rate(sr)
        enc.set_channels(1)
        enc.set_quality(2)
        buf = io.BytesIO()
        buf.write(enc.encode((pcm * 32767).astype(np.int16).tobytes()))
        buf.write(enc.flush())
        out[sid] = [{"id": sid, "family": "sentence_sp1.0", "ms": ms, "text": row["text"],
                     "level": row["level"], "kind": "sentence",
                     "b64": base64.b64encode(buf.getvalue()).decode("ascii")}]
        print("  %s  %5d ms  %s" % (sid, ms, row["text"][:70]), flush=True)
    io.open(OUT / "redo1-audio.json", "w", encoding="utf-8", newline="\n").write(json.dumps(out))
    print("wrote redo1-audio.json; %d takes" % len(out))


if __name__ == "__main__":
    main()
