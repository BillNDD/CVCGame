# Reveal demo: what the sound-out reveal SOUNDS like, before it is built.
#
# The owner ruled the reveal's shape on 2026-08-04 — praise, the word,
# "Pronounced:", each sound on its tile's moment, the word again — and it has
# never been built. Before writing the animation, the owner asked to hear the
# sequence at the accepted spacing, at other spacings, and with a low hum
# filling the gaps instead of silence.
#
# Nothing here is synthesised. Every clip is one the owner has already
# approved: the praise line and the word from the shipped pack, "Pronounced:"
# from batch 8, and each sound from `tools/pending-sounds/`. Only the SPACING
# and the optional hum are new, which is exactly what is being judged.
#
# THE SPACINGS. 700 ms is the accepted one — `SEAM_MS` in the reference build,
# the pause that stops two clips crushing together. It was set for whole words
# in a sentence, and a sound-out is a different rhythm, so 500, 350 and 250 ms
# are offered beside it.
#
# THE HUM. Two ideas, because "filling the gap" can mean either. A hum only in
# the gaps has to fade in and out around each sound, so the sequence pulses. A
# hum running under the WHOLE sequence never starts or stops where the child
# can hear it. Both are offered at a level (-42 dBFS) meant to be felt rather
# than noticed.
#
# Usage: python render_reveal_demo.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SR = 24000


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    x = x / 32768.0 if np.abs(x).max() > 2 else x
    if sr != SR:                                   # nearest-sample resample
        idx = np.clip((np.arange(int(len(x) * SR / sr)) * sr / SR).astype(int), 0, len(x) - 1)
        x = x[idx]
    return x


def trim(a, floor_db=-45, pad_ms=30):
    """Drop a clip's own lead and tail silence so the SPACING is what the
    listener hears, not the padding each file happens to carry."""
    n = int(SR * 0.010)
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    if not len(on):
        return a
    pad = int(SR * pad_ms / 1000)
    return a[max(0, int(on.min()) * n - pad):min(len(a), (int(on.max()) + 1) * n + pad)]


def hum(n, level_db=-42.0):
    """A warm low drone: a fundamental and its fifth, gently detuned so it
    breathes instead of sitting dead-still. Never a bare mains-frequency sine,
    which reads as a fault in the equipment."""
    t = np.arange(n) / SR
    v = 1.0 + 0.004 * np.sin(2 * np.pi * 0.7 * t)          # slow, tiny drift
    a = (np.sin(2 * np.pi * 110 * t * v)
         + 0.5 * np.sin(2 * np.pi * 165 * t * v)
         + 0.25 * np.sin(2 * np.pi * 220 * t * v))
    a = a / np.abs(a).max()
    return (a * (10 ** (level_db / 20))).astype(np.float32)


def fade(a, ms=120):
    a = a.copy()
    n = min(int(SR * ms / 1000), len(a) // 2)
    if n > 1:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return a


def encode(a):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(SR)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / SR)


PACK = REPO / "app" / "public" / "voice"
SND = REPO / "tools" / "pending-sounds"
PEND = REPO / "tools" / "pending-words"

# grapheme -> approved sound clip. ck says /k/; the tile is one unit (S8).
GRAPHEME = {"r": "r", "o": "short_o", "ck": "k", "c": "k", "a": "short_a",
            "t": "t", "ch": "ch", "s": "s", "i": "short_i", "p": "p",
            "l": "l", "f": "f", "x": "x", "m": "m", "k": "k", "qu": "qu"}

WORDS = [("rock", ["r", "o", "ck"]), ("cat", ["c", "a", "t"]), ("chat", ["ch", "a", "t"])]


def sequence(word, tiles, gap_ms, hum_mode):
    """praise, the word, "Pronounced:", each sound, the word again."""
    parts = [load(PACK / "p-0.mp3"), load(PACK / f"w-{word}.mp3"),
             load(PEND / "s-pronounced.mp3")]
    for g in tiles:
        parts.append(load(SND / f"s-{GRAPHEME[g]}.mp3"))
    parts.append(load(PACK / f"w-{word}.mp3"))
    parts = [trim(p) for p in parts]

    gap = np.zeros(int(SR * gap_ms / 1000), np.float32)
    out = []
    for i, p in enumerate(parts):
        out.append(p)
        if i < len(parts) - 1:
            out.append(gap)
    a = np.concatenate(out)

    if hum_mode == "under":
        bed = fade(hum(len(a)), 250)
        a = a + bed
    elif hum_mode == "gaps":
        bed = np.zeros_like(a)
        pos = 0
        for i, p in enumerate(parts):
            pos += len(p)
            if i < len(parts) - 1:
                bed[pos:pos + len(gap)] = fade(hum(len(gap)), min(90, gap_ms // 3))
                pos += len(gap)
        a = a + bed
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a = a * (10 ** (-3.0 / 20)) / peak
    return np.concatenate([np.zeros(int(SR * 0.08), np.float32), a,
                           np.zeros(int(SR * 0.25), np.float32)])


PLAN = {
    "rock": [(700, "none"), (500, "none"), (350, "none"), (250, "none"),
             (500, "under"), (350, "under"), (500, "gaps"), (350, "gaps")],
    "cat": [(500, "none"), (350, "none"), (500, "under"), (350, "gaps")],
    "chat": [(500, "none"), (350, "none"), (500, "under"), (350, "gaps")],
}
LABEL = {"none": "silence", "under": "hum under the whole sequence", "gaps": "hum in the gaps only"}

items = []
for word, tiles in WORDS:
    arms = []
    for gap_ms, mode in PLAN[word]:
        a = sequence(word, tiles, gap_ms, mode)
        mp3, ms = encode(a)
        arms.append({"id": f"{word}_{len(arms) + 1}", "ms": ms,
                     "family": f"gap{gap_ms}ms_{mode}"
                               + ("_ACCEPTED-SEAM" if gap_ms == 700 else ""),
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        print(f"{word:5} gap {gap_ms:3}ms  {LABEL[mode]:30} {ms:5}ms")
    items.append({
        "kind": "word", "text": word,
        "note": (f"the reveal for \"{word}\": praise, the word, \"Pronounced:\", "
                 f"{'-'.join(tiles)}, then the word again. Every clip is one you already "
                 f"approved — only the spacing and the hum are new. 700 ms is the accepted "
                 f"seam from the reference build."),
        "how": "an unhurried teaching rhythm — each sound its own moment, the gaps calm not dead",
        "reject": "sounds crushing together, gaps that drag, or a hum you actually notice",
        "arms": arms})

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Reveal demo — how the sound-out could sound: spacing, and hum vs silence",
    "tally": ("Sounds 47 of 47 · Words 349 shipped + 115 approved · Sentences 42 approved. "
              "Nothing is in flight; this is a design question, not a voice round."),
    "items": items}))
print("\nwrote", OUT / "batch-data.json")
