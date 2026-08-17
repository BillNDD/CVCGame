# Batch 20: the magic-e a_e family, plus the five the owner sent back from
# batch 19 - as (refused twice now, so the speed axis is spent), notes and
# socks (new refusals), and cage and road, both CLOSEST on the same family:
# the blob-trimmed solo. That family leads for those two.
#
# WHAT CHANGED SINCE 19. The winning families are measured, not guessed: 22 of
# 23 accepts were carrier cuts and the new "Say {word}, everybody." frame won 12
# of them, more than the listen sweep that had led since batch 16. So Say goes
# FIRST here. (docs/settled.md holds the finding.)
#
# WHAT CHANGED IN 19, AND WHY. The owner refused three fields on 2026-08-17 with
# "extra sounds before or after. Poor clipping". Measured against his own
# verdicts, the story is not the one I guessed:
#
#   accepted arms          - almost all CARRIER CUTS (listen sweeps)
#   refused-field arms     - almost all SOLOS, offered when the sweep's cuts
#                            failed the gate and the field would have been thin
#   median energetic front - 90 ms on a carrier cut, 220 ms on a solo
#
# af_heart puts an 85-115 ms voiced blob at the start of every isolated render.
# verify.clean_onset strips it from the TEMPLATE, and nothing stripped it from
# what the owner was offered. A solo arm is the blob plus the word.
#
# So: no raw solo is offered here. Every solo goes through clean_onset first,
# and a thin field is answered with MORE CARRIER SHAPES rather than with an
# ungated fallback. A thin field is a real answer; a padded one is a wasted
# evening.
#
# The coverage metric I expected to gate on is NOT used, because it does not
# work: at every threshold tried it either refused most of the arms the owner
# accepted or caught none of the ones he refused. That negative result is
# recorded in docs/settled.md rather than quietly dropped.
#
# Usage: python3 tools/render_batch19.py <out_dir>
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

PRIOR_SHAS = set()
for f in OUT.glob("batch*-audio.json"):
    for arms in json.loads(f.read_text(encoding="utf-8")).values():
        PRIOR_SHAS |= {a["sha256"] for a in arms}

WORDS = ("ate cake came game gate gave hate lake late made make same save tame "
         "take").split()
COMEBACKS = ["as", "notes", "socks", "cage", "road"]


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


def gate_ok(cut, word, clean, sr, allow_islands=0):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + allow_islands + (1 if V.onset_class(word) == "stop" else 0):
            ok = True
    if not ok:
        return False
    # the fricative lead check batch 17 carried and batch 18 dropped
    if V.onset_class(word) == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False
    return True


def offer(word, arms, family, seg, sr, allow_islands=0, gate=True, tail_ms=TAIL_MS):
    if seg is None or len(seg) < 0.08 * sr:
        return
    s0, s1, _, _ = wc.speech_span(seg, sr)
    cut = seg[s0:s1]
    if gate and not gate_ok(cut, word, arms["_clean"], sr, allow_islands):
        return
    mp3, ms = encode(shape(cut, sr, tail_ms), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR_SHAS:
        print(f"    {word}/{family}: identical to a prior arm - refused by the hash guard")
        return
    PRIOR_SHAS.add(sha)
    arms["list"].append({"family": family, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})


CARRIERS = [("say", "Say {w}, everybody."), ("listen", "Listen—{w}."),
            ("here", "Here is the word {w}."), ("word", "The word is {w}.")]


def plan(word, arms, ai=0):
    """Carrier shapes first, at the speeds the rounds have taught. A thin field
    is answered with another CARRIER, never with a raw solo."""
    for tag, frame in CARRIERS:
        for sp in (0.7, 0.75, 0.8):
            if len(arms["list"]) >= 9:
                return
            car, csr = say(frame.format(w=word), sp)
            offer(word, arms, f"{tag}_sp{sp}", located(arms["_clean"], car, csr, word), csr, allow_islands=ai)
        if len(arms["list"]) >= 4:
            break
    # The blob-stripped solo: the same treatment clean_onset gives the template,
    # so what the owner hears starts where the word starts.
    for sp in (0.7, 0.8):
        solo, sr = say(word, sp)
        offer(word, arms, f"solo_trimmed_sp{sp}", V.clean_onset(solo, sr, word), sr,
              allow_islands=ai, gate=False)


def plan_as(word, arms):
    """as has now refused a speed sweep twice - 0.65 down to 0.5 - so speed is
    not the axis. Different CARRIERS instead: a word that ends the sentence, a
    word inside one, and a word the frame makes stressed."""
    frames = [("ends", "The word is as."), ("inside", "Say as, everybody."),
              ("stressed", "Not is—as."), ("pair", "As. As.")]
    for tag, frame in frames:
        for sp in (0.6, 0.75):
            car, csr = say(frame, sp)
            offer(word, arms, f"{tag}_sp{sp}", located(arms["_clean"], car, csr, word), csr, tail_ms=420)
    a, sr = say("ˈæz", 0.7, phonemes=True)
    offer(word, arms, "phoneme_sp0.7", a, sr, gate=False, tail_ms=420)


def plan_trimmed_first(word, arms):
    """cage and road were both closest on solo_trimmed. Lead with that family
    at more speeds, then the carriers behind it."""
    for sp in (0.65, 0.7, 0.75, 0.8):
        solo, sr = say(word, sp)
        offer(word, arms, f"solo_trimmed_sp{sp}", V.clean_onset(solo, sr, word), sr, gate=False)
    plan(word, arms)


def plan_fresh(word, arms):
    """notes and socks were refused in batch 19 and the standard recipe would
    hand back the same bytes - the hash guard proved it by leaving both fields
    EMPTY on the first run of this batch. So: speeds the sweep has never used,
    and frames it has never used either."""
    frames = [("ends", "The word is {w}."), ("pair", "{W}. {W}."),
              ("count", "One {w}."), ("point", "Look—{w}.")]
    for tag, frame in frames:
        for sp in (0.65, 0.85):
            if len(arms["list"]) >= 9:
                return
            car, csr = say(frame.format(w=word, W=word.capitalize()), sp)
            offer(word, arms, f"{tag}_sp{sp}", located(arms["_clean"], car, csr, word), csr)
    for sp in (0.65, 0.9):
        solo, sr = say(word, sp)
        offer(word, arms, f"solo_trimmed_sp{sp}", V.clean_onset(solo, sr, word), sr, gate=False)


def build():
    out = {}
    jobs = [("as", plan_as), ("cage", plan_trimmed_first), ("road", plan_trimmed_first)]
    jobs += [(w, plan_fresh) for w in ["notes", "socks"]]
    jobs += [(w, plan) for w in WORDS]
    for word, fn in jobs:
        solo, sr = say(word, 0.85)
        arms = {"_clean": V.clean_onset(solo, sr, word), "list": []}
        fn(word, arms)
        for i, a in enumerate(arms["list"][:9], 1):
            a["id"] = f"{word}_{i}"
        out[word] = arms["list"][:9]
        print(f"  {word}: {len(out[word])} arms")
    return out


if __name__ == "__main__":
    result = build()
    (OUT / "batch20-audio.json").write_text(json.dumps(result), encoding="utf-8")
    thin = [w for w, a in result.items() if len(a) < 3]
    print(f"wrote batch20-audio.json; {sum(len(a) for a in result.values())} arms over {len(result)} words"
          + (f"; THIN FIELDS: {' '.join(thin)}" if thin else ""))
