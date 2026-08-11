# The sound-out reveal, with its animation, as a thing the owner can watch.
#
# The reveal's shape was ruled on 2026-08-04 (bounce-and-shine on each tile as
# its sound plays, plus a silver lining on the word with a glint at the first
# pop) and its rhythm on 2026-08-11 (500 ms between clips, a low hum under the
# whole sequence). Neither has been built. Before writing it into the app, the
# owner should see it move and hear it at the same time.
#
# This emits, per word: the assembled audio at the approved rhythm, and the
# exact millisecond each tile's sound begins, computed from the clips' own
# lengths rather than guessed. `tools/build_reveal_page.py` turns that into a
# page with four visual treatments over identical audio.
#
# Every clip is one the owner has approved: the praise line and the word from
# the shipped pack, "Pronounced:" from batch 8, and each sound from
# `tools/pending-sounds/`. No owner recording is involved in any of them.
#
# Usage: python render_reveal_anim.py <out_dir>
import base64
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
SND = REPO / "tools" / "pending-sounds"
PEND = REPO / "tools" / "pending-words"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SR = 24000
GAP_MS = 500                 # owner-ruled 2026-08-11
HUM_DB = -42.0               # owner-ruled: a hum under the WHOLE sequence


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate; c.close()
    x = x / 32768.0 if np.abs(x).max() > 2 else x
    if sr != SR:
        idx = np.clip((np.arange(int(len(x) * SR / sr)) * sr / SR).astype(int), 0, len(x) - 1)
        x = x[idx]
    return x.astype(np.float32)


def trim(a, floor_db=-45, pad_ms=30):
    """Drop each clip's own padding so the GAP is what the child hears, not
    the silence a file happens to carry."""
    n = int(SR * 0.010)
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    if not len(on):
        return a
    pad = int(SR * pad_ms / 1000)
    return a[max(0, int(on.min()) * n - pad):min(len(a), (int(on.max()) + 1) * n + pad)]


def hum(n, level_db=HUM_DB):
    """A warm low drone - a fundamental and its fifth, slightly detuned so it
    breathes. Never a bare mains sine, which reads as broken equipment."""
    t = np.arange(n) / SR
    v = 1.0 + 0.004 * np.sin(2 * np.pi * 0.7 * t)
    a = (np.sin(2 * np.pi * 110 * t * v) + 0.5 * np.sin(2 * np.pi * 165 * t * v)
         + 0.25 * np.sin(2 * np.pi * 220 * t * v))
    return (a / np.abs(a).max() * (10 ** (level_db / 20))).astype(np.float32)


def encode(a):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(SR)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush()


# grapheme -> the approved sound clip it speaks. ck says /k/; a tile is one
# unit, so a digraph gets one sound and one pop (safety rule S8).
GRAPHEME = {
    "a": "short_a", "e": "short_e", "i": "short_i", "o": "short_o", "u": "short_u",
    "c": "k", "ck": "k", "ff": "f", "ll": "l", "ss": "s", "zz": "z",
    "kn": "n", "wr": "r", "mb": "m", "th": "th_quiet", "wh": "w",
}
MULTI = ["sh", "ch", "th", "wh", "ck", "ng", "qu", "kn", "wr", "mb", "ll", "ss", "ff", "zz"]


def chunks(w):
    out, i = [], 0
    while i < len(w):
        if i + 1 < len(w) and w[i:i + 2] in MULTI:
            out.append(w[i:i + 2]); i += 2
        else:
            out.append(w[i]); i += 1
    return out


WORDS = ["rock", "ship", "fish"]
items = []
for word in WORDS:
    tiles = chunks(word)
    parts = [("praise", load(PACK / "p-0.mp3")),
             ("word", load(PACK / f"w-{word}.mp3")),
             ("pronounced", load(PEND / "s-pronounced.mp3"))]
    for g in tiles:
        sid = GRAPHEME.get(g, g)
        p = SND / f"s-{sid}.mp3"
        if not p.exists():
            raise SystemExit(f"{word}: no approved clip for grapheme {g!r} (sound {sid!r})")
        parts.append((f"tile:{g}", load(p)))
    parts.append(("word2", load(PACK / f"w-{word}.mp3")))
    parts = [(n, trim(a)) for n, a in parts]

    gap = np.zeros(int(SR * GAP_MS / 1000), np.float32)
    seq, marks, at = [], [], 0
    for i, (n, a) in enumerate(parts):
        marks.append({"what": n, "at": round(at / SR * 1000), "ms": round(len(a) / SR * 1000)})
        seq.append(a); at += len(a)
        if i < len(parts) - 1:
            seq.append(gap); at += len(gap)
    body = np.concatenate(seq)

    bed = hum(len(body))
    f = int(SR * 0.25)
    bed[:f] *= np.linspace(0, 1, f); bed[-f:] *= np.linspace(1, 0, f)
    body = body + bed
    body = body * ((10 ** (-3.0 / 20)) / max(float(np.abs(body).max()), 1e-6))
    body = np.concatenate([np.zeros(int(SR * 0.08), np.float32), body,
                           np.zeros(int(SR * 0.25), np.float32)])
    lead = 80
    for m in marks:
        m["at"] += lead

    mp3 = encode(body)
    items.append({
        "word": word, "tiles": tiles,
        "ms": int(len(body) / SR * 1000),
        "marks": marks,
        "tileAt": [m["at"] for m in marks if m["what"].startswith("tile:")],
        "wordAt": marks[1]["at"],
        "b64": base64.b64encode(mp3).decode(),
    })
    print(f"{word:5} {'-'.join(tiles):10} {int(len(body)/SR*1000):5}ms   "
          f"tile pops at {[m['at'] for m in marks if m['what'].startswith('tile:')]} ms")

(OUT / "reveal.json").write_text(json.dumps({"gap_ms": GAP_MS, "items": items}))
print("\nwrote", OUT / "reveal.json")
