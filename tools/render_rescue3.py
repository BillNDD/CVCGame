# Rescue 3: eleven words. Built from what the owner's verdicts PROVED, plus
# three mechanisms this project has never tried.
#
# WHAT THE LAST ROUND PROVED. boy was accepted on primed_sp0.6 - the
# "Enjoy! The boy." cut - so rhyme-priming fixes the diphthong when the cut
# lands right. though was accepted on pair2_sp0.7 - the second-occurrence
# pair cut works. And four words re-proved that a phoneme SOLO is never a
# deliverable: silence-trim keeps af_heart's voiced blob ("uh and weird
# cracking at front"), clean_onset eats the consonant. docs/settled.md now
# records both halves.
#
# OWNER-RULED, same evening: "Give me more than three options next time
# please." The verify gate starved four fields to three arms. In this round
# the gate does not refuse an offer - the owner's ear is the gate, which the
# calibration failure already proved is the only working onset detector.
# Hash guard and minimum length still apply; nothing already refused can
# come back.
#
# THE THREE NEW MECHANISMS:
#
# 1. PHONEME CARRIERS. The whole sentence written in IPA, the word cut from
#    inside it. Pronunciation is forced by the IPA (no English G2P to say
#    "riyal"), and the blob attaches to the carrier's first word, never the
#    target. This is the deliverable form of a phoneme-forced word.
#
# 2. PHONEME PAIRS. "{ipa}. {ipa}." - second occurrence cut, so the blob
#    lands on occurrence one and the cut is blob-free AND pronunciation-forced.
#
# 3. BRITISH G2P. lang="en-gb" runs a different grapheme-to-phoneme path over
#    the same af_heart voice. If the US path mispronounces "toy", the GB path
#    is a second, independent opinion at zero cost.
#
# For the oy words the template probe is the IPA render, not the text solo -
# the text solo PRONOUNCES THE WORD WRONG, so matching against it finds the
# wrong sound. That may be why "Enjoy the toy." failed while
# "Enjoy! The boy." landed.
#
# Usage: python3 tools/render_rescue3.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import verify as V
import wordcut as wc

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

IPA = {
    "badge": "bˈædʒ", "fetch": "fˈɛtʃ",
    "picture": "pˈɪktʃɚ", "pitch": "pˈɪtʃ",
    "third": "θˈɝd", "these": "ðˈiz",
    "things": "θˈɪŋz", "those": "ðˈoʊz",
    "toy": "tˈɔɪ", "royal": "ɹˈɔɪəl",
    "soil": "sˈɔɪl",
}
# IPA carrier sentences per word. The oy words get their accepted siblings as
# primes, in IPA; the clipped words get the two frames that won the batch.
LISTEN = "lˈɪsən — %s."
WORDIS = "ðə wˈɝd ɪz %s."
PHON_CARRIER = {
    "toy":   ["ɛndʒˈɔɪ ðə tˈɔɪ.",
              "əhˈɔɪ! ə tˈɔɪ."],
    "royal": ["ə lˈɔɪəl ɹˈɔɪəl.",
              "ɛndʒˈɔɪ ðə ɹˈɔɪəl."],
    "soil":  ["bˈɔɪl ðə sˈɔɪl.",
              "spˈɔɪl ðə sˈɔɪl."],
}
# English text primes for the GB path and for fresh US cuts - the boy winner's
# shape, with primes that are themselves accepted words (enjoy, annoy by ear
# precedent ahoy is a word not a name; no personal name may enter this file, S9)
TEXT_PRIME = {
    "toy":   ["Enjoy, enjoy - the toy.", "It can annoy. A toy."],
    "royal": ["A loyal, loyal royal.", "Enjoy the royal."],
    "soil":  ["Boil it. The soil.", "Spoil the soil."],
}
OY = ["toy", "royal", "soil"]
CLIPPED = ["badge", "fetch", "picture", "pitch", "these", "things", "third", "those"]
STOP_END = tuple("bdgptk")
BACKUP_MS = {}
for c in "bdg":      BACKUP_MS[c] = 90
for c in "ptk":      BACKUP_MS[c] = 60
for c in "fsvz":     BACKUP_MS[c] = 55
for c in "mnlrwyhj": BACKUP_MS[c] = 45
DIGRAPH = {"th": 90, "sh": 55, "ch": 60, "wh": 45, "ph": 55}


def backup_ms(w):
    for d, ms in DIGRAPH.items():
        if w.startswith(d):
            return ms
    return BACKUP_MS.get(w[0], 40)


def say(t, sp=0.85, phonemes=False, lang="en-us"):
    try:
        a, sr = k.create(t, voice=VOICE, speed=sp, lang=lang, is_phonemes=phonemes)
        return np.asarray(a, np.float32), sr
    except Exception as e:
        print("    synth failed (%s): %r" % (e.__class__.__name__, t[:40]), flush=True)
        return None, None


def trim_silence(a, sr, floor_db=-45.0, pad_ms=15):
    amp = np.abs(a); thr = 10 ** (floor_db / 20)
    idx = np.where(amp > thr)[0]
    if not len(idx):
        return a
    pad = int(pad_ms / 1000 * sr)
    return a[max(0, idx[0] - pad):min(len(a), idx[-1] + pad)]


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


def cut_from(probe, carrier, csr, word, tail_search=True):
    """Cut the word from a carrier: search the BACK of the utterance (the
    target is always last here), full onset backup, long tail for stops."""
    if carrier is None:
        return None
    off = int(len(carrier) * 0.40) if tail_search else 0
    st, en, score = wc.template_match(probe, carrier[off:], csr)
    if st is None or score < 0.45:
        return None
    st, en = st + off, en + off
    tail_stop = word.endswith(STOP_END)
    st, en = wc.refine_edges(carrier, csr, st, en,
                             pad_ms=35 if tail_stop else 20,
                             max_walk_ms=70 if tail_stop else 40)
    st = max(0, st - int(backup_ms(word) / 1000 * csr))
    return carrier[st:en]


def offer(word, arms, family, seg, sr):
    if seg is None or sr is None or len(seg) < 0.08 * sr:
        return
    mp3, ms = encode(shape(seg, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print("    %s/%s: identical to a prior arm - refused" % (word, family), flush=True)
        return
    PRIOR.add(sha)
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


def build():
    out = {}
    part = OUT / "rescue3-audio.json"
    for word in OY + CLIPPED:
        ipa = IPA[word]
        # the probe: for oy words the IPA render (the text solo says the word
        # WRONG, and a wrong probe finds the wrong sound); clipped words keep
        # the text solo probe.
        pa, psr = say(ipa, 0.8, phonemes=True)
        probe = trim_silence(pa, psr) if pa is not None else None
        if word in CLIPPED:
            ta, tsr = say(word, 0.85)
            if ta is not None:
                probe, psr = trim_silence(ta, tsr), tsr
        arms = {"list": []}

        # 1. phoneme carriers - pronunciation forced, blob on the carrier
        frames = PHON_CARRIER.get(word, []) + [LISTEN % ipa, WORDIS % ipa]
        for fr in frames:
            for sp in (0.6, 0.7, 0.8):
                if len(arms["list"]) >= 12:
                    break
                car, csr = say(fr, sp, phonemes=True)
                offer(word, arms, "phcar_sp%s" % sp, cut_from(probe, car, csr, word), csr or psr)

        # 2. phoneme pair, second occurrence - blob-free and forced
        for sp in (0.6, 0.7, 0.8):
            if len(arms["list"]) >= 12:
                break
            car, csr = say("%s. %s." % (ipa, ipa), sp, phonemes=True)
            offer(word, arms, "phpair2_sp%s" % sp, cut_from(probe, car, csr, word), csr or psr)

        # 3. the British G2P path over the same voice - a second opinion
        gb_frames = TEXT_PRIME.get(word, ["Listen — %s." % word])
        for fr in gb_frames:
            for sp in (0.65, 0.75):
                if len(arms["list"]) >= 12:
                    break
                car, csr = say(fr, sp, lang="en-gb")
                offer(word, arms, "gb_sp%s" % sp, cut_from(probe, car, csr, word), csr or psr)

        # 4. fresh US text cuts, boy's winning shape, ungated
        for fr in TEXT_PRIME.get(word, ["Listen — %s." % word, "The word is %s." % word]):
            for sp in (0.55, 0.65):
                if len(arms["list"]) >= 12:
                    break
                car, csr = say(fr, sp)
                offer(word, arms, "us_sp%s" % sp, cut_from(probe, car, csr, word), csr or psr)

        out[word] = arms["list"][:12]
        for i, a in enumerate(out[word], 1):
            a["id"] = "%s_t%d" % (word, i)
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms" % (word, len(out[word])), flush=True)
    return out


if __name__ == "__main__":
    r = build()
    thin = [w for w, a in r.items() if len(a) < 4]
    print("wrote rescue3-audio.json; %d arms over %d words%s"
          % (sum(len(a) for a in r.values()), len(r),
             ("; UNDER FOUR: " + " ".join(thin)) if thin else ""), flush=True)
