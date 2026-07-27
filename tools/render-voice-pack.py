# Renders the default voice pack (SPEC section 5a) from the engine's clip
# inventory. This is a BUILD TOOL: it runs on a developer machine, and only its
# output (mp3 clips and a manifest) ships with the app. The model never ships.
#
# Owner decisions encoded here: voice af_heart, every clip at the voice's
# natural speed (samples approved 2026-07-26; the 0.7 word slow-down was
# removed on 2026-07-27 because stretching a word distorts its sound).
#
# Usage:
#   node -e "import('./src/engine.js').then(m => console.log(JSON.stringify(m.voiceScript())))" > script.json
#   python tools/render-voice-pack.py script.json kokoro-v1.0.onnx voices-v1.0.bin app/public/voice
#
# Requires: pip install kokoro-onnx lameenc  (see docs/voice-pack.md)
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

script_path, model_path, voices_path, out_dir = sys.argv[1:5]
VOICE = "af_heart"
OUT = pathlib.Path(out_dir)
OUT.mkdir(parents=True, exist_ok=True)

k = Kokoro(model_path, voices_path)
script = json.load(open(script_path))

manifest = {}
review = ["id,text,ms,flag"]
for clip in script:
    cid, text = clip["id"], clip["text"]
    audio, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
    pcm = np.clip(audio, -1.0, 1.0)
    pcm16 = (pcm * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = enc.encode(pcm16.tobytes()) + enc.flush()
    fname = cid.replace(":", "-") + ".mp3"
    (OUT / fname).write_bytes(mp3)
    ms = int(len(pcm16) * 1000 / sr)
    # review flags: a clip under 250 ms is probably crushed; anything over
    # 6 s probably hallucinated a tail
    flag = ""
    if ms < 250:
        flag = "SHORT"
    if ms > 6000:
        flag = "LONG"
    manifest[cid] = {"file": fname, "ms": ms}
    review.append(f'{cid},"{text}",{ms},{flag}')

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
pathlib.Path(out_dir + "-review.csv").write_text("\n".join(review) + "\n")
flags = [r for r in review[1:] if r.rstrip().endswith(("SHORT", "LONG"))]
print(f"rendered {len(manifest)} clips to {OUT}; {len(flags)} flagged for review")
for f in flags:
    print("  FLAG", f)
