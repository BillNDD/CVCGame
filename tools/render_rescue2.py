# Rescue 2: the 13 words still open after the first rescue round.
#
# THE FIRST RESCUE FAILED FOR THREE REASONS, TWO OF THEM MINE:
#
# 1. clean_onset ATE THE PHONEME RENDERS. It strips af_heart's 85-115 ms
#    utterance-initial blob from solo TEMPLATES; applied to a phoneme render
#    offered as the DELIVERABLE it removed the first consonant. The owner's
#    "The word isn't there" for `those` is literally correct: its three arms
#    were all phoneme renders with the /th/ stripped off. Phoneme arms are now
#    trimmed by TRUE SILENCE only - nothing above -45 dB is ever removed.
#
# 2. THE PAIR CUT TOOK THE FIRST OCCURRENCE. "Those. Those." - occurrence one
#    sits behind the utterance blob, occurrence two behind clean pause silence.
#    template_match returns the best global hit, which was the first. The cut
#    now searches the back 60% of the carrier, so it lands on the second.
#
# 3. /oi/ IS THE MODEL, NOT THE CUT - but only in some words. Measured against
#    the owner's own verdicts: boil, spoil, loyal, enjoy and point are ACCEPTED,
#    boy, toy, royal, soil refused. So the voice can say the diphthong; it says
#    it wrongly in these four spellings. The rescue is rhyme-priming: cut the
#    word from a carrier where an accepted sibling forces the sound one syllable
#    earlier - "Enjoy the toy.", "A loyal royal.", "Boil the soil."
#
# NEW: AN ONSET DETECTOR, because the fault the owner has caught thirty times
# by ear has never been caught by a gate. Every arm's first 150 ms is matched
# against the word's reference onset (a silence-trimmed phoneme render).
# Calibrated against clips the owner accepted; negative control: an accepted
# clip with its onset chopped off MUST be refused, or the detector does not
# ship (E5). If calibration cannot separate, the detector demotes to a visible
# warning tag rather than silently gating (a wrong hard gate would refuse good
# arms, which is this batch's other failure mode).
#
# badge and third: the owner marked their phoneme_sp0.85 arms "closest - a
# little too quick". Same family, slower, leads for them.
#
# Usage: python3 tools/render_rescue2.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
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
    "though": "ðˈoʊ", "boy": "bˈɔɪ",
    "toy": "tˈɔɪ", "royal": "ɹˈɔɪəl",
    "soil": "sˈɔɪl",
}

BACKUP_MS = {}
for c in "bdg":      BACKUP_MS[c] = 90
for c in "ptk":      BACKUP_MS[c] = 60
for c in "fsvz":     BACKUP_MS[c] = 55
for c in "mnlrwyhj": BACKUP_MS[c] = 45
DIGRAPH = {"th": 90, "sh": 55, "ch": 60, "wh": 45, "ph": 55}
STOP_END = tuple("bdgptk")


def backup_ms(w):
    for d, ms in DIGRAPH.items():
        if w.startswith(d):
            return ms
    return BACKUP_MS.get(w[0], 40)


def say(t, sp=0.85, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


def trim_silence(a, sr, floor_db=-45.0, pad_ms=15):
    """Leading/trailing TRUE silence only. Nothing above the floor is removed -
    this is the fix for clean_onset eating /th/."""
    amp = np.abs(a)
    thr = 10 ** (floor_db / 20)
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


# ---------- the onset detector ----------
def onset_score(cut, ref, sr):
    """Does the reference onset appear near the front of the cut?"""
    win = int(0.15 * sr)
    probe = ref[:win]
    head = cut[:int(0.40 * sr)]
    if len(head) < len(probe) or not len(probe):
        return 0.0
    st, en, score = wc.template_match(probe, head, sr)
    return float(score or 0.0)


def decode_mp3(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    parts = [f.to_ndarray().reshape(-1) for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    a = np.concatenate(parts).astype(np.float32)
    if a.dtype == np.float32 and np.abs(a).max() > 1.5:
        a = a / 32768.0
    return a, sr


def calibrate(refs):
    """Accepted clips must pass; the same clips with the onset chopped must
    fail. If the two groups do not separate, the detector demotes to a tag."""
    led = json.loads((REPO / "tools/pending-words/pending-words.json").read_text(encoding="utf-8"))
    sample = [w for w, v in led.items()
              if isinstance(v, dict) and str(v.get("round", "")).startswith("batch 21")
              and w[0] in "bftp" and (REPO / "tools/pending-words" / ("w-%s.mp3" % w)).exists()][:12]
    good, chopped = [], []
    for w in sample:
        a, sr = decode_mp3(REPO / "tools/pending-words" / ("w-%s.mp3" % w))
        a = trim_silence(a, sr)
        solo, ssr = say(w, 0.85)
        ref = trim_silence(solo, ssr)
        good.append(onset_score(a, ref, sr))
        chopped.append(onset_score(a[int(0.17 * sr):], ref, sr))
    lo_good, hi_chop = min(good), max(chopped)
    print("calibration: accepted scores %.2f-%.2f | onset-chopped %.2f-%.2f"
          % (min(good), max(good), min(chopped), max(chopped)), flush=True)
    if lo_good > hi_chop + 0.05:
        thr = (lo_good + hi_chop) / 2
        print("SEPARATED: detector is a HARD GATE at %.2f "
              "(control: every chopped accepted clip is refused)" % thr, flush=True)
        return thr, True
    print("NOT separated: detector demotes to a visible warning tag", flush=True)
    return (lo_good + hi_chop) / 2, False


def located(clean, carrier, csr, word, second=False, factor=1.0):
    hay = carrier
    off = 0
    if second:
        off = int(len(carrier) * 0.40)
        hay = carrier[off:]
    st, en, score = wc.template_match(clean, hay, csr)
    if st is None or score < 0.5:
        return None
    st, en = st + off, en + off
    tail_stop = word.endswith(STOP_END)
    st, en = wc.refine_edges(carrier, csr, st, en,
                             pad_ms=35 if tail_stop else 20,
                             max_walk_ms=70 if tail_stop else 40)
    st = max(0, st - int(backup_ms(word) * factor / 1000 * csr))
    return carrier[st:en]


def gate_ok(cut, word, clean, sr):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + 1:
            ok = True
    return ok


THR, HARD = None, False


def offer(word, arms, family, seg, sr, ref, gate=True):
    if seg is None or len(seg) < 0.08 * sr:
        return
    if gate and not gate_ok(seg, word, arms["_clean"], sr):
        return
    osc = onset_score(seg, ref, sr)
    if HARD and osc < THR:
        print("    %s/%s: onset missing (%.2f) - refused by the onset detector"
              % (word, family, osc), flush=True)
        return
    tag = family if (HARD or osc >= THR) else family + "!onset?"
    mp3, ms = encode(shape(seg, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print("    %s/%s: identical to a prior arm - refused" % (word, family), flush=True)
        return
    PRIOR.add(sha)
    arms["list"].append({"family": tag, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


# who gets what
SLOW_PHONEME = ["badge", "third"]                       # closest at 0.85, "too quick"
CLIPPED = ["fetch", "picture", "pitch", "these", "things", "those", "though"]
PRIMED = {                                              # accepted sibling first
    "boy":   ["Enjoy! The boy.", "A loyal boy.", "Joy, joy, the boy."],
    "toy":   ["Enjoy the toy.", "Joy! A toy."],
    "royal": ["A loyal royal.", "Loyal, royal."],
    "soil":  ["Boil the soil.", "Spoil the soil."],
}


def build():
    out = {}
    part = OUT / "rescue2-audio.json"
    order = SLOW_PHONEME + CLIPPED + list(PRIMED)
    for word in order:
        solo, ssr = say(word, 0.85)
        ref = trim_silence(solo, ssr)
        arms = {"_clean": V.clean_onset(solo, ssr, word), "list": []}

        if word in SLOW_PHONEME:
            for sp in (0.55, 0.6, 0.65, 0.7, 0.75):
                a, sr = say(IPA[word], sp, phonemes=True)
                offer(word, arms, "phoneme_sp%s" % sp, trim_silence(a, sr), sr, ref, gate=False)

        if word in CLIPPED or word in PRIMED:
            W = word.capitalize()
            for sp in (0.6, 0.7, 0.8):
                car, csr = say("%s. %s." % (W, W), sp)
                offer(word, arms, "pair2_sp%s" % sp,
                      located(arms["_clean"], car, csr, word, second=True), csr, ref)

        for frame in PRIMED.get(word, []):
            for sp in (0.6, 0.7):
                if len(arms["list"]) >= 10:
                    break
                car, csr = say(frame, sp)
                offer(word, arms, "primed_sp%s" % sp,
                      located(arms["_clean"], car, csr, word, second=True), csr, ref)

        if word in CLIPPED or word in PRIMED:
            speeds = (0.5, 0.6) if word in PRIMED else (0.6, 0.7, 0.8)
            for sp in speeds:
                if len(arms["list"]) >= 10:
                    break
                a, sr = say(IPA[word], sp, phonemes=True)
                offer(word, arms, "phoneme_sp%s" % sp, trim_silence(a, sr), sr, ref, gate=False)

        out[word] = arms["list"][:10]
        for i, a in enumerate(out[word], 1):
            a["id"] = "%s_s%d" % (word, i)
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms" % (word, len(out[word])), flush=True)
    return out


if __name__ == "__main__":
    THR, HARD = calibrate(None)
    r = build()
    thin = [w for w, a in r.items() if len(a) < 3]
    empty = [w for w, a in r.items() if not a]
    print("wrote rescue2-audio.json; %d arms over %d words%s%s"
          % (sum(len(a) for a in r.values()), len(r),
             ("; THIN: " + " ".join(thin)) if thin else "",
             ("; EMPTY: " + " ".join(empty)) if empty else ""), flush=True)
