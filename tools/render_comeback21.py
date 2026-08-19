# The comeback round for batch 21: words the owner marked "closest" or "none".
#
# WHY A DIFFERENT RECIPE. Round 1 and round 2 measured 57 accepts, and the
# carrier split is an exact tie: say 28, listen 28. Speed does not discriminate
# (11/10/7 across three speeds). So a comeback built from more speeds of the
# same two frames is a speed sweep, and docs/settled.md records that a speed
# sweep is not a round - the word "as" refused one twice.
#
# THE REAL FAULT, found by the owner's verdicts rather than by a gate: the
# builder in render_batch21.py stops adding carriers once four arms survive.
# Every word in this comeback passed on its first two frames, so it NEVER MET
# "Here is the word {w}." or "The word is {w}." - two of the four frames the
# recipe owns. They are offered first here, at four speeds, before anything the
# word has already refused.
#
# Usage: python3 tools/render_comeback21.py <out_dir>
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

# Every arm ever offered, so nothing already refused can come back wearing a
# new label. This is the guard that stopped round 8 recurring.
PRIOR_SHAS = set()
for f in list(OUT.glob("batch*-audio.json")) + list(OUT.parent.glob("batch*-audio.json")):
    try:
        for arms in json.loads(f.read_text(encoding="utf-8")).values():
            PRIOR_SHAS |= {a["sha256"] for a in arms}
    except Exception:
        pass
print("hash guard loaded %d prior arms" % len(PRIOR_SHAS), flush=True)

WORDS = json.loads((OUT.parent / "comebacks.json").read_text(encoding="utf-8"))
print("comeback words: %s" % " ".join(WORDS), flush=True)


def say(t, sp=0.85, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


def shape(a, sr, tail_ms=TAIL_MS):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(tail_ms / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def located(clean, carrier, csr, word):
    st, en, score = wc.template_match(clean, carrier, csr)
    if st is None or score < 0.5:
        return None
    st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=15, max_walk_ms=30)
    if V.onset_class(word) == "stop":
        st = max(0, st - int(0.06 * csr))
    return carrier[st:en]


def gate_ok(cut, word, clean, sr):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + (1 if V.onset_class(word) == "stop" else 0):
            ok = True
    if not ok:
        return False
    if V.onset_class(word) == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False
    return True


def offer(word, arms, family, seg, sr, gate=True):
    if seg is None or len(seg) < 0.08 * sr:
        return
    s0, s1, _, _ = wc.speech_span(seg, sr)
    cut = seg[s0:s1]
    if gate and not gate_ok(cut, word, arms["_clean"], sr):
        return
    mp3, ms = encode(shape(cut, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR_SHAS:
        print("    %s/%s: identical to a prior arm - refused by the hash guard" % (word, family), flush=True)
        return
    PRIOR_SHAS.add(sha)
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


# The two frames these words have never met, first and at four speeds. Then the
# two they have, at speeds those rounds did not use - not as a sweep, but so the
# field is not thin if the new frames fail the gate.
UNMET = [("here", "Here is the word {w}."), ("word", "The word is {w}.")]
MET   = [("say", "Say {w}, everybody."), ("listen", "Listen—{w}.")]


def plan(word, arms):
    for tag, frame in UNMET:
        for sp in (0.65, 0.7, 0.75, 0.8):
            if len(arms["list"]) >= 10:
                return
            car, csr = say(frame.format(w=word), sp)
            offer(word, arms, "%s_sp%s" % (tag, sp), located(arms["_clean"], car, csr, word), csr)
    for tag, frame in MET:
        for sp in (0.6, 0.9):
            if len(arms["list"]) >= 10:
                return
            car, csr = say(frame.format(w=word), sp)
            offer(word, arms, "%s_sp%s" % (tag, sp), located(arms["_clean"], car, csr, word), csr)


def build():
    out = {}
    part = OUT / "comeback21-audio.json"
    for word in WORDS:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        plan(word, arms)
        for i, a in enumerate(arms["list"][:10], 1):
            a["id"] = "%s_c%d" % (word, i)
        out[word] = arms["list"][:10]
        part.write_text(json.dumps(out), encoding="utf-8")
        print("  %s: %d arms  (%d/%d)" % (word, len(out[word]), len(out), len(WORDS)), flush=True)
    return out


if __name__ == "__main__":
    r = build()
    thin = [w for w, a in r.items() if len(a) < 3]
    print("wrote comeback21-audio.json; %d arms over %d words%s"
          % (sum(len(a) for a in r.values()), len(r),
             ("; THIN FIELDS: " + " ".join(thin)) if thin else ""), flush=True)
