# Put the approved sounds into the pack the app ships.
#
# The engine decides which sounds exist: soundInventory() walks the whole word
# bank, applies the tile map and the tricky-word overrides, and returns exactly
# the ids the sound-out can ask for. This copies each one from the approved
# set in tools/pending-sounds/ and writes it into the manifest. A sound the
# engine asks for and the approved set does not have is an error, never a
# silent omission - a missing sound would drop the whole reveal to system
# speech with nothing on screen to say so.
#
# Nothing is re-encoded: the file that ships is byte-for-byte the file the
# owner listened to, which is what makes the sha in tools/pending-sounds/
# meaningful. Run tools/voice-edges.py --write afterwards to record where the
# speech sits inside each one.
#
# Usage: python ship-sounds.py
import hashlib
import io
import json
import pathlib
import shutil
import subprocess

import av

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = REPO / "tools" / "pending-sounds"
PACK = REPO / "app" / "public" / "voice"
MANIFEST = PACK / "manifest.json"

approved = json.loads((SRC / "pending-sounds.json").read_text(encoding="utf-8"))


def length_ms(p):
    """Measured from the audio. Some approved rows carry a length and some do
    not, and a row's number is a note about the file rather than the file."""
    c = av.open(str(p))
    s = c.streams.audio[0]
    n = sum(f.to_ndarray().shape[-1] for f in c.decode(s))
    sr = s.codec_context.sample_rate
    c.close()
    return round(n / sr * 1000)

wanted = json.loads(subprocess.run(
    ["node", "--input-type=module", "-e",
     "import {soundInventory} from './src/engine.js';"
     "console.log(JSON.stringify(soundInventory()))"],
    cwd=REPO, capture_output=True, text=True, check=True).stdout)

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
missing, shipped = [], 0
for cid in wanted:
    sound = cid[2:]
    src = SRC / f"s-{sound}.mp3"
    if sound not in approved or not src.exists():
        missing.append(sound)
        continue
    got = hashlib.sha256(src.read_bytes()).hexdigest()
    want = approved[sound].get("sha256")
    if want and got != want:
        raise SystemExit(f"{sound}: the file on disk is not the one that was approved\n"
                         f"  approved {want}\n  on disk  {got}")
    dst = PACK / f"d-{sound}.mp3"
    if not dst.exists() or dst.read_bytes() != src.read_bytes():
        shutil.copyfile(src, dst)
    manifest[cid] = {"file": dst.name, "ms": length_ms(dst)}
    shipped += 1

# Any d: clip the engine no longer asks for is an orphan, and the voice gate
# refuses a pack that carries one.
for cid in [k for k in manifest if k.startswith("d:") and k not in wanted]:
    (PACK / manifest[cid]["file"]).unlink(missing_ok=True)
    del manifest[cid]

if missing:
    raise SystemExit("no approved clip for: " + ", ".join(sorted(missing))
                     + "\nEach one needs a listening round before it can ship.")

# newline pinned to LF: write_text uses the platform default, and on Windows
# that put 7,680 CRLF pairs into the manifest on 2026-08-19
io.open(MANIFEST, "w", encoding="utf-8", newline="\n").write(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
print(f"shipped {shipped} sounds; manifest now holds {len(manifest) - 1} clips")
print("next: python3 tools/voice-edges.py --write")
