# The three "let's sound out one word" lines, rendered for a listening round.
#
# WHY THIS ROUND EXISTS. SPEC section 12 records that after a child reads a
# sentence, ONE word is sounded out and the voice says why — owner-ruled
# 2026-08-12 on measured length: sounding out every word of a nine-word sentence
# runs 65.5 seconds, one word runs 13.4, none runs 6.5, and the middle one won.
# Three lines take turns, chosen from eight the same evening. SPEC ends that
# paragraph with the sentence this script answers: "Nothing here is built, and
# no line has been recorded or heard." A grep of tools/voice-words.csv and
# tools/pending-words/pending-words.json on 2026-08-13 returns zero for all
# three. They are approved WORDS and unheard AUDIO, which are different things.
#
# THE RECIPE IS NOT A CHOICE, and that is the point of reading docs/settled.md
# first (E10). These are whole utterances, exactly like the seventeen praise
# lines and the 41 approved sentences, so they take the settled sentence recipe:
# voice af_heart, speed 1.0, rendered plain and whole. SPEC section 9 states it
# — "word clips at speed 0.85 and sentence clips at 1.0".
#
# ONE ARM EACH, DELIBERATELY. settled.md's rule that a new WORD is cut from a
# carrier and never rendered plain is about words: a word said alone is a
# citation form. A sentence is already the natural unit, and every one of the 41
# approved sentences was rendered plain and whole. Offering speed variants here
# would ask the owner to re-open a ruling rather than judge a reading.
#
# Usage: kokoro-env/bin/python tools/render_soundout_lines.py <out_dir>
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
SPEED = 1.0          # SPEC section 9: sentence clips at 1.0
LEAD_MS = 60
TAIL_MS = 320
FADE_MS = 10

# SPEC section 12, verbatim and in the owner's own order. Each is true whichever
# word the app picks and however many times the child has met it, which is the
# rule that decided the set.
# WORDS WHOSE SPELLING ALLOWS TWO PRONUNCIATIONS. SPEC section 9: "A sentence
# must carry an explicit pronunciation when its spelling allows two." The praise
# line "You read that word all by yourself!" was spoken with "read" as in "reed"
# and was replaced on 2026-08-03; tools/voice-check.mjs has refused the fault
# ever since. THIS SCRIPT RENDERED OUTSIDE THAT GATE on 2026-08-13 and put the
# same fault in front of the owner, who caught it by ear in one listen — a round
# spent on something the project had already closed and built a guard against.
# So the guard is here too now, where the audio is made.
TWO_WAY = ("read", "lead", "live", "wind", "tear", "bow", "row", "close", "use",
           "present", "record", "object", "content", "does", "sow", "wound")

LINES = [
    # The phonemes are the FIX and they are not cosmetic: rendered from spelling
    # this line says "reed", which teaches the wrong sound to a child who has
    # just read the words. Verified with the phonemiser rather than by ear —
    # from spelling it is ɹˈiːd, and this is ɹˈɛd.
    ("soundout-1", "You read them all. Let's sound out this one.",
     "gives the reason",
     "juː ɹˈɛd ðˌɛm ˈɔːl. lˈɛts sˈaʊnd ˈaʊt ðˈɪswˌʌn."),
    ("soundout-2", "Let's sound out one word together.",
     "names the grown-up: this game is a parent and a child side by side", None),
    ("soundout-3", "Here is one word to sound out.",
     "simply announces", None),
]


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


def main():
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

    items = []
    for cid, text, why, phonemes in LINES:
        # THE GATE, AT THE POINT OF MAKING. A line that contains a
        # two-pronunciation word and does not say which one it means cannot be
        # rendered at all, so the fault cannot reach a listener again.
        risky = [w for w in TWO_WAY if w in text.lower().split()
                 or f"{w}," in text.lower() or f"{w}." in text.lower()]
        if risky and not phonemes:
            raise SystemExit(
                f"refusing to render {cid}: it contains {risky} and leaves the "
                f"pronunciation to spelling (SPEC section 9). Give it explicit phonemes.")
        audio, sr = k.create(phonemes or text, voice=VOICE, speed=SPEED, lang="en-us",
                             **({"is_phonemes": True} if phonemes else {}))
        mp3, ms = encode(shape(np.asarray(audio, np.float32), sr), sr)
        (out / f"{cid}.mp3").write_bytes(mp3)
        sha = hashlib.sha256(mp3).hexdigest()
        items.append({"id": cid, "text": text, "why": why, "ms": ms,
                      "sha256": sha, "voice": VOICE, "speed": SPEED,
                      "phonemes": phonemes,
                      "b64": base64.b64encode(mp3).decode()})
        print(f"  {cid}: {ms} ms  sha {sha[:12]}  \"{text}\"")

    (out / "round.json").write_text(json.dumps(items, indent=1))
    print(f"\n{len(items)} lines rendered at {VOICE} speed {SPEED} -> {out}")


if __name__ == "__main__":
    main()
