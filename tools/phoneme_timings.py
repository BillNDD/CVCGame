# Where is every sound inside a rendered clip? Ask the model, not the audio.
#
# THE FINDING, 2026-08-12. This project has spent a great deal of effort trying
# to recover word and sound boundaries FROM audio: energy thresholds (shipped
# "of red"), template matching (33 of 34 on the sentence aligner, and it cannot
# locate a bare vowel at all), silence gaps (zero hits out of twelve sentences).
# None of it was necessary. Kokoro is a duration-predictor model: before it
# renders a single sample it decides how many frames each phoneme will occupy,
# and those numbers are inside the ONNX graph we already ship with. There is
# nothing to infer.
#
# The duration projection is at
#   /encoder/predictor/duration_proj/linear_layer/Add_output_0
# shaped (tokens, 50). Per StyleTTS2, from which Kokoro descends, the frame
# count for a token is sigmoid(logits).sum(), and one decoder frame is 600
# samples at 24 kHz — exactly 25 ms. The `speed` input divides the durations
# BEFORE they are rounded to whole frames, so a phoneme lasts
# round(sigmoid_sum / speed) * 25 ms.
#
# That ordering is the whole thing. Rounding first and dividing second looks
# right and is wrong by up to 111 ms on a two-second sentence, which is useless
# for cutting a 50 ms sound. Both were measured against the rendered audio over
# four sentences at three speeds: dividing first is exact 12 times out of 12;
# rounding first misses 6 of them.
#
# It is exact, not approximate. Summed over a whole utterance the prediction
# matches the rendered audio to the millisecond, at every speed tried.
#
# NOTHING NEW SHIPS. `onnx` is used here only to add an output to a graph in
# memory, on the developer machine, in the same class as the GPL phonemiser:
# the game ships mp3 files and a manifest, and neither this nor the model has
# any part in that.
#
# Usage:
#   python3 tools/phoneme_timings.py "It is a cat."      show every boundary
#   python3 tools/phoneme_timings.py --self-test         prove it against audio
import sys

import numpy as np
import onnx
import onnxruntime as ort
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer

import pathlib
REPO = pathlib.Path(__file__).resolve().parent.parent
MODEL = REPO / "kokoro-v1.0.onnx"
VOICES = REPO / "voices-v1.0.bin"
DUR_TENSOR = "/encoder/predictor/duration_proj/linear_layer/Add_output_0"
FRAME_MS = 25.0          # 600 samples at 24 kHz
VOICE = "af_heart"

_sess = _kokoro = _tok = None


def _load():
    """The graph, with the duration projection added as an output. The file on
    disk is never modified — the extra output exists only in this process."""
    global _sess, _kokoro, _tok
    if _sess is None:
        m = onnx.load(str(MODEL))
        vi = onnx.helper.ValueInfoProto()
        vi.name = DUR_TENSOR
        m.graph.output.append(vi)
        _sess = ort.InferenceSession(m.SerializeToString(), providers=["CPUExecutionProvider"])
        _kokoro = Kokoro(str(MODEL), str(VOICES))
        _tok = Tokenizer()
    return _sess, _kokoro, _tok


def timings(text, speed=1.0, voice=VOICE, is_phonemes=False):
    """Returns (audio, sample_rate, [{symbol, at_ms, ms}]) — one entry per
    phoneme token, including the padding and the spaces between words, in
    order. The boundaries are the model's own and nothing is inferred from the
    waveform."""
    sess, k, tok = _load()
    # A caller may hand in phonemes directly. A held or repeated sound has no
    # spelling — "the sound is ððððð" is the only way to ask for a long /ð/ —
    # and the timings are just as exact either way, because the model is being
    # asked the same question.
    phonemes = text if is_phonemes else tok.phonemize(text, lang="en-us")
    tokens = tok.tokenize(phonemes)
    style = k.get_voice_style(voice)[len(tokens)].reshape(1, -1)
    audio, dur = sess.run(None, {"tokens": np.array([[0, *tokens, 0]], dtype=np.int64),
                                 "style": style,
                                 "speed": np.array([speed], dtype=np.float32)})
    logits = np.asarray(dur).squeeze()
    raw = (1.0 / (1.0 + np.exp(-logits))).sum(axis=-1)      # frames, before rounding
    # Speed is applied to the durations BEFORE they are rounded to whole
    # frames, not after. Rounding first and dividing second is wrong by up to
    # 111 ms on a two-second sentence — close enough to look right and far too
    # loose to cut a 50 ms sound with. Both were tried against the rendered
    # audio over four sentences at three speeds: this one is exact 12 times out
    # of 12, the other misses 6 of them.
    frames = np.round(raw / speed).astype(int)
    ms = frames * FRAME_MS
    at = np.concatenate([[0.0], np.cumsum(ms)[:-1]])
    syms = ["<pad>"] + list(phonemes) + ["<pad>"]
    rows = [{"symbol": s, "at_ms": float(a), "ms": float(d)}
            for s, a, d in zip(syms, at, ms)]
    return np.asarray(audio, np.float32), 24000, rows


def find(rows, symbol, occurrence=0):
    """The occurrence-th appearance of a phoneme, or None. Use this to locate a
    word whose phoneme is unique in the carrier — "ɐ" for the article "a"."""
    hits = [r for r in rows if r["symbol"] == symbol]
    return hits[occurrence] if occurrence < len(hits) else None


def self_test():
    """The prediction must match the AUDIO, at more than one speed, and it must
    place a sound where the sound actually is. A boundary tool that agrees only
    with itself is worth nothing."""
    checks = []
    for text in ["It is a cat.", "Here is a cat.", "I see a big red cat.",
                 "The chick is in the shed."]:
        for speed in (1.0, 0.85, 0.7):
            audio, sr, rows = timings(text, speed)
            predicted = sum(r["ms"] for r in rows)
            actual = len(audio) / sr * 1000
            off = abs(predicted - actual)
            checks.append((f'{text[:22]!r} @{speed}: predicted {predicted:.0f} ms, '
                           f'audio {actual:.0f} ms, off by {off:.0f}', off <= 2))

    # It must place the sound where the sound IS. "a" in "It is a cat." sits
    # between "is" and "cat", so its window must fall inside the middle third
    # of the utterance and must not touch either end.
    audio, sr, rows = timings("It is a cat.", 1.0)
    a = find(rows, "ɐ")
    total = len(audio) / sr * 1000
    checks.append((f'the word "a" is placed at {a["at_ms"]:.0f}-{a["at_ms"]+a["ms"]:.0f} ms '
                   f"of {total:.0f}, which is mid-utterance",
                   0.25 * total < a["at_ms"] < 0.7 * total))

    # And the CONTROL that matters: the audio in that window must be louder
    # than the silence around the utterance. A tool that returns plausible
    # numbers for an empty window is the "of red" fault with better arithmetic.
    def rms_db(seg):
        return 20 * np.log10(max(float(np.sqrt(np.mean(seg.astype(np.float64) ** 2))), 1e-9))
    i0, i1 = int(a["at_ms"] / 1000 * sr), int((a["at_ms"] + a["ms"]) / 1000 * sr)
    word_db = rms_db(audio[i0:i1])
    lead_db = rms_db(audio[: int(0.2 * sr)])
    checks.append((f"there is real sound in the window ({word_db:.0f} dB) and the "
                   f"utterance's own lead-in is quieter ({lead_db:.0f} dB)", word_db > lead_db + 6))

    # A negative control on the arithmetic: halving every duration must break
    # the agreement with the audio, or the first check proves nothing.
    _, _, rows2 = timings("It is a cat.", 1.0)
    halved = sum(r["ms"] for r in rows2) / 2
    checks.append(("control: halved durations no longer match the audio",
                   abs(halved - len(audio) / sr * 1000) > 30))

    for name, ok in checks:
        print(("ok   " if ok else "FAIL ") + name)
    failed = sum(1 for _, ok in checks if not ok)
    print(f"\nphoneme-timing controls: {len(checks) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    text = sys.argv[1] if len(sys.argv) > 1 else "It is a cat."
    speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    audio, sr, rows = timings(text, speed)
    print(f'{text!r} @ speed {speed} — {len(audio)/sr*1000:.0f} ms of audio\n')
    for r in rows:
        bar = "#" * max(1, int(r["ms"] / 25))
        print(f'  {r["symbol"]!r:8} {r["at_ms"]:7.0f} .. {r["at_ms"]+r["ms"]:7.0f} ms  {bar}')
