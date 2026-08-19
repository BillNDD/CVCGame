# The rescue round: the 17 words still refused after the final batch-21 round.
#
# TWO CLASSES, TWO MECHANISMS - because the owner's comments split them cleanly:
#
# CLIPPED (12): badge fetch foxes kicked picture pitch point third these things
#   those though. "All badge are adge", "Things cut to ings". The onset backup
#   exists, but the verify gate refuses full-backup cuts (the neighbouring
#   carrier speech reads as an extra syllable), the ladder descended to smaller
#   backups, the gate passed those - and the onset was gone again. The gate is
#   structurally deaf to a missing onset; only the owner's ear hears it. So:
#   frames that surround the word with SILENCE instead of speech - the pair
#   frame and the sentence-final frame that rescued "as" - offered at full
#   backup only. The ladder never descends below 66% here: a small-backup arm
#   of a clipped word is a wasted listen, proven 17 times today.
#
# MISPRONOUNCED (5): boy toy royal soil pennies. "boy" as "bay", "royal" as
#   "riyal" - af_heart says the WORD wrong, so no cut of any carrier can be
#   right. The one mechanism that fixes pronunciation is phoneme-forced
#   synthesis, and it is the mechanism that closed "as" after three refused
#   rounds. Offered for the clipped class too as a last family: a phoneme solo
#   has no neighbours to mis-cut.
#
# E10: tools/round_guard.py history was checked for all 17 - none has a prior
# round in the permanent records (they are new words; their batch-21 history
# lives in the scratchpad side-list and none has met these families).
#
# Usage: python3 tools/render_rescue21.py <out_dir>
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
print("hash guard loaded %d prior arms" % len(PRIOR), flush=True)

PLAN = json.loads((OUT.parent / "final-comeback.json").read_text(encoding="utf-8"))
CLIPPED, SAYWRONG = PLAN["clipped"], PLAN["mispronounced"]
print("rescue: %d clipped, %d mispronounced" % (len(CLIPPED), len(SAYWRONG)), flush=True)

# Misaki-style IPA, the alphabet the "as" rescue used ("as" closed on ˈæz).
IPA = {
    "badge": "bˈædʒ", "fetch": "fˈɛtʃ", "foxes": "fˈɑksɪz", "kicked": "kˈɪkt",
    "picture": "pˈɪktʃɚ", "pitch": "pˈɪtʃ", "point": "pˈɔɪnt", "third": "θˈɜd",
    "these": "ðˈiz", "things": "θˈɪŋz", "those": "ðˈoʊz", "though": "ðˈoʊ",
    "boy": "bˈɔɪ", "toy": "tˈɔɪ", "royal": "ɹˈɔɪəl", "soil": "sˈɔɪl",
    "pennies": "pˈɛniz",
}

BACKUP_MS = {}
for c in "bdg":      BACKUP_MS[c] = 90
for c in "ptk":      BACKUP_MS[c] = 60
for c in "fsvz":     BACKUP_MS[c] = 55
for c in "mnlrwyhj": BACKUP_MS[c] = 45
DIGRAPH_BACKUP = {"th": 90, "sh": 55, "ch": 60, "wh": 45, "ph": 55}
STOP_END = tuple("bdgptk")


def backup_ms(word):
    for d, ms in DIGRAPH_BACKUP.items():
        if word.startswith(d):
            return ms
    return BACKUP_MS.get(word[0], 40)


def say(t, sp=0.85, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


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


def located(clean, carrier, csr, word, factor):
    st, en, score = wc.template_match(clean, carrier, csr)
    if st is None or score < 0.5:
        return None
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


def offer(word, arms, family, seg, sr, gate=True):
    if seg is None or len(seg) < 0.08 * sr:
        return
    cut = seg
    if gate and not gate_ok(cut, word, arms["_clean"], sr):
        return
    mp3, ms = encode(shape(cut, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print("    %s/%s: identical to a prior arm - refused" % (word, family), flush=True)
        return
    PRIOR.add(sha)
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


# The frames that closed "as": the word beside silence, not beside speech.
QUIET_FRAMES = [("pair", "{W}. {W}."), ("ends", "The word is {w}."),
                ("stressed", "Not is—{w}.")]


def phoneme_arms(word, arms, n_speeds=(0.65, 0.75, 0.85)):
    ipa = IPA.get(word)
    if not ipa:
        return
    for sp in n_speeds:
        if len(arms["list"]) >= 10:
            return
        a, sr = say(ipa, sp, phonemes=True)
        offer(word, arms, "phoneme_sp%s" % sp, V.clean_onset(a, sr, word), sr, gate=False)


def build():
    out = {}
    part = OUT / "rescue21-audio.json"
    for word in SAYWRONG:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        # pronunciation is the fault: phoneme leads, carriers are pointless
        phoneme_arms(word, arms, (0.6, 0.65, 0.7, 0.75, 0.8, 0.85))
        out[word] = arms["list"][:10]
        for i, a in enumerate(out[word], 1): a["id"] = "%s_r%d" % (word, i)
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms (phoneme)" % (word, len(out[word])), flush=True)
    for word in CLIPPED:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        for factor in (1.0, 0.66):          # never below 66% - a small-backup
            for tag, frame in QUIET_FRAMES:  # arm of a clipped word is a wasted listen
                for sp in (0.7, 0.8):
                    if len(arms["list"]) >= 8:
                        break
                    car, csr = say(frame.format(w=word, W=word.capitalize()), sp)
                    offer(word, arms, "%s_sp%s" % (tag, sp),
                          located(arms["_clean"], car, csr, word, factor), csr)
            if len(arms["list"]) >= 4:
                break
        phoneme_arms(word, arms)             # the no-neighbours fallback family
        out[word] = arms["list"][:10]
        for i, a in enumerate(out[word], 1): a["id"] = "%s_r%d" % (word, i)
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms" % (word, len(out[word])), flush=True)
    return out


if __name__ == "__main__":
    r = build()
    thin = [w for w, a in r.items() if len(a) < 3]
    empty = [w for w, a in r.items() if not a]
    print("wrote rescue21-audio.json; %d arms over %d words%s%s"
          % (sum(len(a) for a in r.values()), len(r),
             ("; THIN: " + " ".join(thin)) if thin else "",
             ("; EMPTY: " + " ".join(empty)) if empty else ""), flush=True)
