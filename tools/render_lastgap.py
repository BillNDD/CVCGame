# The last-gap cutter: third, royal, soil - the three words every windowed cut
# has failed. Owner-ruled 2026-08-18: "Please give new tries for soil and royal
# too" - overriding the earlier plan to send them to the sidecar.
#
# WHY EVERY EARLIER CUT FAILED, in one sentence: the cutter used FIXED WINDOWS
# (back up 90 ms, walk 70 ms), and a fixed window either eats the onset or
# swallows a neighbour - the owner's "adge" and his "extra sounds" are the two
# ends of the same blunt instrument.
#
# THE NEW CUT USES NO WINDOWS. The target word is always the LAST word of the
# carrier, and the carrier is written so a real pause precedes it ("Third.
# Third." - a sentence boundary). The cut is: find the last silence gap in the
# energy envelope, cut from the MIDDLE of that gap to the end of speech. The
# onset is safe because actual silence precedes it; the tail is safe because
# nothing follows the word; no constant can be wrong because there are none.
# A carrier that yields no real gap yields no arm - it cannot produce a bad cut.
#
# Pronunciation axes carried in from what the verdicts proved: the British G2P
# path (third's only "closest"), phoneme pairs (those/toy winners), and the
# GB path is offered for royal - "royal" is about as common as words get in
# British text, and that path has never had a slot for it.
#
# Usage: python3 tools/render_lastgap.py <out_dir>
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
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

PRIOR = set()
for f in list(OUT.glob("*audio.json")) + list(OUT.parent.glob("*audio.json")):
    try:
        for arms in json.loads(f.read_text(encoding="utf-8")).values():
            PRIOR |= {a["sha256"] for a in arms}
    except Exception:
        pass
print("hash guard: %d prior arms" % len(PRIOR), flush=True)


def say(t, sp, lang="en-us", phonemes=False):
    try:
        a, sr = k.create(t, voice=VOICE, speed=sp, lang=lang, is_phonemes=phonemes)
        return np.asarray(a, np.float32), sr
    except Exception as e:
        print("    synth failed (%s): %r" % (e.__class__.__name__, t[:40]), flush=True)
        return None, None


def envelope(a, sr, frame_ms=10):
    n = max(1, int(frame_ms / 1000 * sr))
    m = len(a) // n
    if not m:
        return np.zeros(1), n
    return np.sqrt((a[:m * n].reshape(m, n) ** 2).mean(axis=1)), n


def last_gap_cut(a, sr, min_gap_ms=60, tail_keep_ms=40):
    """Cut from the middle of the LAST real silence gap to the end of speech.
    No fixed windows: silence decides the onset edge, the utterance end decides
    the tail. Returns None when the carrier left no real gap - a frame that
    cannot be cut safely produces nothing rather than something wrong."""
    env, n = envelope(a, sr)
    thr = env.max() * 10 ** (-35 / 20)
    speech = env > thr
    idx = np.where(speech)[0]
    if not len(idx):
        return None
    end_f = idx[-1]
    # walk backwards from the end of speech to the start of the final speech run
    run_start = end_f
    while run_start > 0 and speech[run_start - 1]:
        run_start -= 1
    # the gap immediately before that run
    gap_end = run_start
    gap_start = gap_end
    while gap_start > 0 and not speech[gap_start - 1]:
        gap_start -= 1
    gap_frames = gap_end - gap_start
    if gap_frames * 10 < min_gap_ms or gap_start == 0:
        return None                          # no real pause: no arm
    cut_f = gap_start + gap_frames // 2
    end = min(len(a), (end_f + 1) * n + int(tail_keep_ms / 1000 * sr))
    return a[cut_f * n:end]


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    out = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                          np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    n = int(FADE_MS / 1000 * sr)
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


# Every carrier ENDS on the target, behind a written-in pause.
PLANS = {
    "third": [
        ("gb_pair",    "Third. Third.",           "en-gb", False),
        ("gb_ordinal", "First, second, third.",   "en-gb", False),
        ("gb_listen",  "Listen. Third.",          "en-gb", False),
        ("us_pair",    "Third. Third.",           "en-us", False),
        ("ph_pair",    "θˈɝd. θˈɝd.", "en-us", True),
    ],
    "royal": [
        ("gb_pair",    "Royal. Royal.",           "en-gb", False),
        ("gb_loyal",   "Loyal. Royal.",           "en-gb", False),
        ("gb_listen",  "Listen. Royal.",          "en-gb", False),
        ("ph_pair",    "ɹˈɔɪəl. ɹˈɔɪəl.", "en-us", True),
        ("us_loyal",   "Loyal. Royal.",           "en-us", False),
    ],
    "soil": [
        ("gb_pair",    "Soil. Soil.",             "en-gb", False),
        ("gb_boil",    "Boil. Soil.",             "en-gb", False),
        ("gb_listen",  "Listen. Soil.",           "en-gb", False),
        ("ph_pair",    "sˈɔɪl. sˈɔɪl.", "en-us", True),
        ("us_boil",    "Boil. Soil.",             "en-us", False),
    ],
}
SPEEDS = (0.6, 0.7, 0.8)

out = {}
part = OUT / "lastgap-audio.json"
for word, plans in PLANS.items():
    arms = []
    for tag, frame, lang, ph in plans:
        for sp in SPEEDS:
            if len(arms) >= 12:
                break
            car, csr = say(frame, sp, lang=lang, phonemes=ph)
            if car is None:
                continue
            seg = last_gap_cut(car, csr)
            if seg is None or len(seg) < 0.10 * csr:
                print("    %s/%s_sp%s: no real gap - no arm" % (word, tag, sp), flush=True)
                continue
            mp3, ms = encode(shape(seg, csr), csr)
            sha = hashlib.sha256(mp3).hexdigest()
            if sha in PRIOR:
                print("    %s/%s_sp%s: identical to a prior arm - refused" % (word, tag, sp), flush=True)
                continue
            PRIOR.add(sha)
            arms.append({"family": "%s_sp%s" % (tag, sp), "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})
    for i, a in enumerate(arms[:12], 1):
        a["id"] = "%s_v%d" % (word, i)
    out[word] = arms[:12]
    part.write_text(json.dumps(out), encoding="utf-8")
    print("  %s: %d arms" % (word, len(out[word])), flush=True)

thin = [w for w, a in out.items() if len(a) < 4]
print("wrote lastgap-audio.json; %d arms over %d words%s"
      % (sum(len(a) for a in out.values()), len(out),
         ("; UNDER FOUR: " + " ".join(thin)) if thin else ""), flush=True)
