# Batch 22, the thin fields: hot, hat and in refused the closure frame at the
# gate, so their third mechanism is the one the record keeps for exactly this
# - frames the sweep has never used ("One {w}.", "Look-{w}."), which took notes
# and socks from an EMPTY field to an accept on the first offer (batch 19).
# Reads the batch's audio file and appends one arm per thin word.
#
# Usage: py -3.12 tools/render_batch22_thin.py <out_dir>
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import render_batch22 as B

OUT = pathlib.Path(sys.argv[1])
data = json.loads((OUT / "batch22-audio.json").read_text(encoding="utf-8"))
for word, arms in data.items():
    if len(arms) >= 3:
        continue
    solo, sr = B.say(word, 0.85)
    clean = B.V.clean_onset(solo, sr, word)
    best = None
    for tag, frame in (("count", "One {w}."), ("point", "Look—{w}."), ("pair", "{W}. {W}.")):
        for sp in (0.72, 0.8):
            car, csr = B.say(frame.format(w=word, W=word.capitalize()), sp)
            seg, score = B.located(clean, car, csr, word)
            arm = B.finish(word, seg, csr, clean, f"D_{tag}_sp{sp}")
            if arm and (best is None or score > best[0]):
                best = (score, arm)
    if best:
        best[1]["id"] = f"{word}_{len(arms) + 1}"
        arms.append(best[1])
    print(f"  {word}: {len(arms)} arms  " + " ".join(a["family"] for a in arms), flush=True)
(OUT / "batch22-audio.json").write_text(json.dumps(data), encoding="utf-8")
print("thin fields filled where a new frame passed the gate")
