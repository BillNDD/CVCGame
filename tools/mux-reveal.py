# Join the recording's picture and its sound into one file the owner can play.
#
# tools/record-reveal.mjs captures two things from the running app: the page,
# through the browser's own recorder, and the audio, tapped off the app's
# audio output. Both are real. This trims the video to the moment the reveal
# began and writes the pair as a single video.
#
# Usage: python mux-reveal.py <rec_dir> <out.mp4>
import json
import pathlib
import sys

from fractions import Fraction

import av

REC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
meta = json.loads((REC / "pops.json").read_text(encoding="utf-8"))
TRIM = float(meta["trim_s"])
LEN = float(meta["seconds"])

vin = av.open(str(pathlib.Path((REC / "video-path.txt").read_text(encoding="utf-8").strip())))
ain = av.open(str(REC / "audio.webm"))
vs = vin.streams.video[0]

out = av.open(str(OUT), "w")
vout = out.add_stream("libx264", rate=25)
vout.width, vout.height = vs.codec_context.width, vs.codec_context.height
vout.pix_fmt = "yuv420p"
vout.options = {"crf": "20", "preset": "medium"}
# the encoder needs a clock of its own, or the muxer refuses the first packet 
vout.codec_context.time_base = Fraction(1, 25)
aout = out.add_stream("aac", rate=48000)

n = 0
for frame in vin.decode(vs):
    t = float(frame.pts * vs.time_base)
    if t < TRIM:
        continue
    if t > TRIM + LEN:
        break
    frame.pts = n
    frame.time_base = Fraction(1, 25)
    for pkt in vout.encode(frame):
        out.mux(pkt)
    n += 1
for pkt in vout.encode():
    out.mux(pkt)

resampler = av.audio.resampler.AudioResampler(format="fltp", layout="stereo", rate=48000)
m = 0
for frame in ain.decode(ain.streams.audio[0]):
    frame.pts = None
    for r in resampler.resample(frame):
        r.pts = None
        for pkt in aout.encode(r):
            out.mux(pkt)
        m += 1
for pkt in aout.encode():
    out.mux(pkt)
out.close()
vin.close()
ain.close()

print(f"{OUT}  ({OUT.stat().st_size // 1024} KB)")
print(f"  {n} video frames from {TRIM:.2f}s, {m} audio frames")
print(f'  word "{meta["word"]}", outlines at ' +
      ", ".join(f'{p["text"]} {p["at"]}ms/{p["ms"]}' for p in meta["pops"]))
