# Build a sound round that cannot offer what the owner has already rejected.
#
# Everything here comes from the ship review of 2026-08-12, when the owner
# heard ten shipped sounds SIDE BY SIDE for the first time and graded them:
# short_a best; short_e, short_i, short_o, short_u almost perfect; schwa,
# long_e, oo_book good; th_this and h poor. Two of those are in the game today.
#
# The gradient separates on three parameters, and on two of them the top five
# and the poor pair do not overlap at all:
#
#                 top five        "good"        poor
#   attack        5-20 ms         10-15 ms      35-45 ms
#   peak position 0.10-0.19       0.06-0.29     0.29-0.77
#   speech        240-300 ms      130-290 ms    210-220 ms
#   timbre drift  1.78-3.22       2.13-4.16     3.47-5.22
#
# A well-made sound starts fast, peaks early, and stays the same sound across
# its length. The envelope below is DERIVED from the five the owner ranked
# highest, never typed in, so it moves when their judgement moves.
#
# WHY THE MARGIN IS THE LEVER. A cut's attack and peak position are decided by
# where it starts. Begin at the phoneme's exact boundary and the sound rises
# immediately: fast attack, early peak. Include 80 ms of the silence before it
# and the attack lengthens and the peak slides late — which is exactly what
# every arm of the failed "a" rounds did, and why they measured like the poor
# pair. Exact boundaries come from tools/phoneme_timings.py, which agrees with
# the rendered audio to the millisecond.
#
# THIS REFUSES, IT DOES NOT PREDICT. docs/settled.md closes three attempts to
# predict a verdict from a number. The envelope throws out candidates that are
# plainly built wrong; what survives still goes to a person.
#
# Usage:
#   python3 tools/sound_round.py --envelope           show it, and its source
#   python3 tools/sound_round.py --self-test
#   python3 tools/sound_round.py <phoneme> <out_dir>  build a field
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "tools"))
import clip_compare as cc          # noqa: E402
import phoneme_timings as pt       # noqa: E402

PACK = REPO / "app" / "public" / "voice"
# The five the owner ranked highest on 2026-08-12. The envelope is measured
# from these, so correcting the ranking corrects the envelope.
TOP_FIVE = ["short_a", "short_e", "short_i", "short_o", "short_u"]
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10
# Which parameters the envelope is built on: the three that separated the top
# five from the poor pair, plus drift, which nearly did.
GATED = ["speech_ms", "attack_ms", "peak_at", "timbre_drift"]
# The eight vowels the owner has accepted. Shape is not identity: a candidate
# can start fast, peak early and hold its timbre while being the wrong vowel
# entirely, and the first field that ever passed the shape envelope did exactly
# that - F1 456-493 Hz against the 617-1025 every accepted vowel occupies, and
# F2 above all of them. A vowel is its formants, so for a vowel they are gated
# too. Consonants are not: /h/ and /th/ have no vowel identity to hold.
VOWELS = ["short_a", "short_e", "short_i", "short_o", "short_u", "schwa", "long_e", "oo_book"]


def envelope():
    """The acceptable range for each gated parameter, from the top five. A
    little room is allowed at each end — the five are a sample of what good
    looks like, not its boundary — except on attack and peak position, where
    the poor pair sit close enough that widening would let them back in."""
    man = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    rows = [cc.measure(PACK / man["d:" + s]["file"]) for s in TOP_FIVE]
    out = {}
    for k in GATED:
        v = np.array([r[k] for r in rows if r[k] is not None], float)
        slack = 0.0 if k in ("attack_ms", "peak_at") else 0.15
        lo, hi = v.min(), v.max()
        out[k] = (round(lo - slack * (hi - lo), 3), round(hi + slack * (hi - lo), 3))
    return out, rows


def vowel_space():
    """The F1/F2 box the owner's accepted vowels occupy."""
    man = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    rows = [cc.measure(PACK / man["d:" + s]["file"]) for s in VOWELS]
    f1 = [r["F1"] for r in rows if r["F1"]]
    f2 = [r["F2"] for r in rows if r["F2"]]
    return (min(f1), max(f1)), (min(f2), max(f2))


def inside(m, env, vowel=False):
    """Which gated parameters this candidate fails, and by how much."""
    bad = []
    if vowel:
        (f1lo, f1hi), (f2lo, f2hi) = vowel_space()
        if m.get("F1") is None:
            bad.append("formants could not be measured")
        else:
            if not f1lo <= m["F1"] <= f1hi:
                bad.append(f'F1 {m["F1"]} outside the accepted vowels\' {f1lo}-{f1hi}')
            if not f2lo <= m["F2"] <= f2hi:
                bad.append(f'F2 {m["F2"]} outside the accepted vowels\' {f2lo}-{f2hi}')
    for k, (lo, hi) in env.items():
        x = m.get(k)
        if x is None:
            bad.append(f"{k} could not be measured"); continue
        if x < lo or x > hi:
            bad.append(f"{k} {x} outside {lo}-{hi}")
    return bad


def encode(a, sr, fade_ms=FADE_MS):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(fade_ms / 1000 * sr)
    # fade_ms 0 means the caller has already shaped the edges — the feathered
    # treatment owns them, and a fade on top would undo what it did.
    if n > 1 and len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    a = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                        np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    p = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(p.tobytes()) + e.flush()


def candidates(phoneme, carriers, margins=(0, 10, 20), tails=(0, 40, 80), occurrence=-1):
    """Cut the phoneme out of each carrier at the model's own boundary.
    The lead margin is kept small on purpose: it is what decides the attack and
    the peak position, the two parameters the poor pair failed on."""
    out = []
    for text, speed, note, *rest in carriers:
        is_ph = bool(rest and rest[0])
        try:
            audio, sr, rows = pt.timings(text, speed, is_phonemes=is_ph)
        except Exception as e:                      # a carrier the tokenizer cannot take
            out.append({"why": f"{text!r} @{speed}: {e}"}); continue
        hits = [r for r in rows if r["symbol"] == phoneme]
        if not hits:
            out.append({"why": f"{text!r} @{speed}: no {phoneme!r} in this carrier"}); continue
        h = hits[occurrence] if occurrence >= 0 or len(hits) >= abs(occurrence) else hits[-1]
        for lead in margins:
            for tail in tails:
                i0 = max(0, int((h["at_ms"] - lead) / 1000 * sr))
                i1 = min(len(audio), int((h["at_ms"] + h["ms"] + tail) / 1000 * sr))
                if i1 - i0 < int(sr * 0.03):
                    continue
                out.append({"audio": audio[i0:i1], "sr": sr, "text": text, "speed": speed,
                            "note": note, "lead": lead, "tail": tail, "word_ms": h["ms"]})
    return out


def build(phoneme, carriers, out_dir, gloss, occurrence=-1):
    env, _ = envelope()
    OUT = pathlib.Path(out_dir); OUT.mkdir(parents=True, exist_ok=True)
    tmp = OUT / "tmp"; tmp.mkdir(exist_ok=True)
    kept, refused = [], []
    for i, c in enumerate(candidates(phoneme, carriers, occurrence=occurrence)):
        if "audio" not in c:
            refused.append(("-", c["why"])); continue
        mp3 = encode(c["audio"], c["sr"])
        f = tmp / f"c{i:03d}.mp3"; f.write_bytes(mp3)
        m = cc.measure(f)
        why = inside(m, env)
        label = f'{c["note"]} · {c["word_ms"]:.0f} ms + {c["lead"]}/{c["tail"]} ms'
        if why:
            refused.append((label, "; ".join(why)))
        else:
            kept.append({"mp3": mp3, "m": m, "label": label,
                         "score": abs(m["peak_at"] - 0.14) + abs(m["attack_ms"] - 12) / 100})
    kept.sort(key=lambda k: k["score"])
    return env, kept, refused


def self_test():
    """The envelope must accept what the owner ranked highest and refuse what
    they called poor. An envelope that lets the poor pair through is not a
    filter, it is decoration."""
    env, rows = envelope()
    man = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    checks = []
    for s in TOP_FIVE:
        m = cc.measure(PACK / man["d:" + s]["file"])
        checks.append((f"{s} (owner: best or almost perfect) is inside", not inside(m, env)))
    for s in ("th_this", "h"):
        m = cc.measure(PACK / man["d:" + s]["file"])
        bad = inside(m, env)
        checks.append((f"{s} (owner: poor) is REFUSED — {'; '.join(bad) if bad else 'NOT REFUSED'}", bool(bad)))
    # And the two the owner ranked lowest among the vowels should also fall
    # outside, which is the envelope predicting a ranking it was not given.
    for s in ("schwa", "oo_book"):
        m = cc.measure(PACK / man["d:" + s]["file"])
        checks.append((f"{s} (owner: weakest vowel) falls outside too", bool(inside(m, env))))
    for name, ok in checks:
        print(("ok   " if ok else "FAIL ") + name)
    failed = sum(1 for _, ok in checks if not ok)
    print(f"\nsound-round controls: {len(checks) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    if "--envelope" in sys.argv:
        env, rows = envelope()
        print("Derived from the five the owner ranked highest on 2026-08-12: "
              + ", ".join(TOP_FIVE) + "\n")
        for k, (lo, hi) in env.items():
            print(f"  {k:14} {lo} .. {hi}")
        sys.exit(0)
    print(__doc__)
