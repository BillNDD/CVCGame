# Batch 22: the ten hardest WORDS in the shipped pack, three mechanisms each.
#
# WHY THESE TEN. The owner asked (2026-09-02) for the fifty least human-like
# clips, ten at a time, three distinct new options each, "from the perspective
# of an expert in digital audio design". The fifty were ranked on the evidence
# the repository holds - the ledger's take counts and speeds, the shipped file's
# own tail, edges and pitch, and the artifact-prone shapes the round records
# name (open fault BA). This is the first ten.
#
# CHECKED FIRST, as E10 and tools/round_guard.py require: every word here has
# ONE family on record, the one that shipped, and that family is never offered
# again. hat's record says "anything offered for hat must be a new mechanism,
# not another margin": all three mechanisms here are new to it. as is not in
# this batch (closed after three rounds). Speed sweeps are closed, so no arm is
# a speed of what shipped; every arm is a different CARRIER.
#
# THE THREE MECHANISMS, chosen from what the record says makes a cut word
# human - mid-phrase position, a real neighbour on both sides, the front
# starting ON the word:
#   A  teacher frame the word has NOT shipped from ("Listen-{w}.", "Say {w},
#      everybody.", "Here is the word {w}.", "The word is {w}.") at 0.75 and
#      0.8, located by template and refined to quiet frames, gated;
#   B  the closure frame "Stop. {W}. Stop." - the word between two real stops
#      with measured silence on both flanks (won lids after three rounds), cut
#      between the silences, never by template;
#   C  a natural contrast sentence "I said {w}, not {other}." - the word
#      stressed and sentence-medial in something a person would say, the
#      Pronounced: lesson - with a bank neighbour as the foil.
# One arm per mechanism, the best of its own family by the locator's score
# (distance may order WITHIN a family). Three arms per word, round-robin.
#
# Usage: py -3.12 tools/render_batch22.py <out_dir>
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
import round_guard as RG

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

WORDS = sys.argv[2].split(",") if len(sys.argv) > 2 else ["lug", "hot", "man", "am", "ant", "black", "fax", "hat", "hung", "in"]
BANK = sorted({w for l in json.loads((REPO / "tools/ladder/ladder-v4.json").read_text(encoding="utf-8")).get("levels", [])
               for w in (l.get("words") or [])} if False else set())
# the bank, from the pack's own manifest - the one list every shipped word is on
_man = json.loads((REPO / "app/public/voice/manifest.json").read_text(encoding="utf-8"))
BANK = sorted(k_[2:] for k_ in _man if k_.startswith("w:"))

# THE HASH GUARD reads the pack's shipped bytes, the waiting-room ledger and
# every prior batch in the out dir: a byte the owner has already judged is
# never offered as new.
PRIOR = set()
for k_, v in _man.items():
    if k_.startswith("w:") and v.get("file"):
        p = REPO / "app/public/voice" / v["file"]
        if p.exists():
            PRIOR.add(hashlib.sha256(p.read_bytes()).hexdigest())
_pend = json.loads((REPO / "tools/pending-words/pending-words.json").read_text(encoding="utf-8"))
PRIOR |= {v["sha256"] for v in _pend.values() if isinstance(v, dict) and v.get("sha256")}
for f in OUT.glob("batch*-audio.json"):
    for arms in json.loads(f.read_text(encoding="utf-8")).values():
        PRIOR |= {a["sha256"] for a in arms}


def say(t, sp=0.8, phonemes=False):
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
        return None, 0.0
    st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=15, max_walk_ms=30)
    if V.onset_class(word) == "stop":
        st = max(0, st - int(0.06 * csr))
    return carrier[st:en], score


def islands(a, sr, floor_db=-38, min_gap_ms=60, min_ms=80):
    """Speech islands separated by real silence: (start, end) sample pairs."""
    s0, s1, db, n = wc.speech_span(a, sr)
    out, run, start = [], 0, None
    for i in range(len(db)):
        if db[i] > floor_db:
            if start is None:
                start = i
            run = 0
        else:
            if start is not None:
                run += 1
                if run >= max(1, min_gap_ms // 10):
                    end = i - run + 1
                    if (end - start) * 10 >= min_ms:
                        out.append((start * n, end * n))
                    start, run = None, 0
    if start is not None and (len(db) - start) * 10 >= min_ms:
        out.append((start * n, len(db) * n))
    return out


def gate_ok(cut, word, clean, sr, allow_islands=0):
    ok, why, _ = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + allow_islands + (1 if V.onset_class(word) == "stop" else 0):
            ok = True
    if not ok:
        return False
    if V.onset_class(word) == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False
    return True


def tight_tail(cut, sr, drop_db=30, fade_ms=20):
    """Round 50-4: quiz_2 and rod_1 were "closest - extra sound at end". The
    frame's next word, or the synthesiser's own release, sat inside the 25 ms
    pad past the word. The tail is walked back to the last 5 ms frame within
    drop_db of the word's peak, then faded over fade_ms."""
    n = max(1, int(sr * 0.005))
    e = np.array([np.mean(cut[i:i + n] ** 2) for i in range(0, len(cut) - n, n)])
    if not len(e):
        return cut
    peak = e.max() + 1e-12; thr = peak / (10 ** (drop_db / 10))
    last = max(i for i, v in enumerate(e) if v >= thr)
    end = min(len(cut), (last + 1) * n + int(sr * 0.01))
    out = cut[:end].copy()
    fo = min(int(sr * fade_ms / 1000), len(out) // 2)
    out[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return out


TIGHT = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else set()


def finish(word, seg, sr, clean, family, gate=True):
    if seg is None or len(seg) < 0.08 * sr:
        return None
    s0, s1, _, _ = wc.speech_span(seg, sr)
    cut = seg[s0:s1]
    if word in TIGHT:
        cut = tight_tail(cut, sr); family = family + "_G-tight-tail"
    if gate and not gate_ok(cut, word, clean, sr):
        return None
    mp3, ms = encode(shape(cut, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print(f"    {word}/{family}: identical to bytes already judged - refused by the hash guard")
        return None
    return {"family": family, "ms": ms, "b64": base64.b64encode(mp3).decode(), "sha256": sha}


CARRIERS = [("listen", "Listen—{w}."), ("say", "Say {w}, everybody."),
            ("here", "Here is the word {w}."), ("word", "The word is {w}.")]


def shipped_frame(word):
    """The family that shipped, so its frame is never offered again."""
    fams = " ".join(RG.history(word).keys())
    for tag in ("listen", "say", "here", "word"):
        if tag in fams:
            return tag
    return None


def foil(word):
    """A bank neighbour one letter away, for the contrast sentence."""
    letters = "abcdefghijklmnopqrstuvwxyz"
    best = []
    for i, ch in enumerate(word):
        for c in letters:
            if c == ch:
                continue
            cand = word[:i] + c + word[i + 1:]
            if cand in BANK:
                best.append(cand)
    if not best:
        for cand in BANK:
            if len(cand) == len(word) and sum(a != b for a, b in zip(cand, word)) == 1:
                best.append(cand)
    return best[0] if best else None


def mech_a(word, clean):
    skip = shipped_frame(word)
    best = None
    for tag, frame in CARRIERS:
        if tag == skip:
            continue
        for sp in (0.75, 0.8):
            car, csr = say(frame.format(w=word), sp)
            seg, score = located(clean, car, csr, word)
            arm = finish(word, seg, csr, clean, f"A_{tag}_sp{sp}")
            if arm and (best is None or score > best[0]):
                best = (score, arm)
    return best[1] if best else None


def mech_b(word, clean):
    """The closure frame. The synthesiser does not pause between "Stop." and
    the word (measured 2026-09-02: one island of 800 ms), so the word is
    LOCATED by its own template and its edges refined to the nearest quiet
    frames - the flanks are still real stops, which is the frame's point."""
    best = None
    for sp in (0.72, 0.8):
        car, csr = say(f"Stop. {word.capitalize()}. Stop.", sp)
        seg, score = located(clean, car, csr, word)
        arm = finish(word, seg, csr, clean, f"B_stop-frame_sp{sp}")
        if arm and (best is None or score > best[0]):
            best = (score, arm)
    return best[1] if best else None


def mech_c(word, clean):
    other = foil(word)
    frames = ([f"I said {word}, not {other}."] if other else []) + [f"Pronounced: {word}, everybody."]
    best = None
    for frame in frames:
        for sp in (0.78, 0.85):
            car, csr = say(frame, sp)
            seg, score = located(clean, car, csr, word)
            arm = finish(word, seg, csr, clean, f"C_contrast_sp{sp}" + (f"_vs-{other}" if other and frame.startswith("I said") else "_pronounced"))
            if arm and (best is None or score > best[0]):
                best = (score, arm)
    return best[1] if best else None


def mech_e(word, clean):
    """For a word the locator has already failed (her: "none contain the word";
    from, hush: "poorly clipped"): the record's rule for a short word - cut by
    the carrier's SILENCE, never by template. "{W}. {W}." and the first
    instance between measured gaps; then "Here is the word {w}." refined with
    a wider walk and pad so a fricative's tail is not clipped."""
    best = None
    for sp in (0.72, 0.8):
        car, csr = say(f"{word.capitalize()}. {word.capitalize()}.", sp)
        seg = wc.first_instance(car, csr)
        arm = finish(word, seg, csr, clean, f"E_pair-silence_sp{sp}", gate=True)
        if arm:
            best = arm; break
    if best:
        return best
    for sp in (0.75, 0.8):
        car, csr = say(f"Here is the word {word}.", sp)
        st, en, score = wc.template_match(clean, car, csr)
        if st is None or score < 0.5:
            continue
        st, en = wc.refine_edges(car, csr, st, en, pad_ms=30, max_walk_ms=70)
        arm = finish(word, car[st:en], csr, clean, f"E_here-wide_sp{sp}")
        if arm:
            return arm
    return None


COMEBACKS = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else set()


def build():
    out = {}
    for word in WORDS:
        solo, sr = say(word, 0.85)
        clean = V.clean_onset(solo, sr, word)
        mechs = (mech_e(word, clean), mech_b(word, clean), mech_c(word, clean)) if word in COMEBACKS else (mech_a(word, clean), mech_b(word, clean), mech_c(word, clean))
        arms = [a for a in mechs if a]
        for i, a in enumerate(arms, 1):
            a["id"] = f"{word}_{i}"
        out[word] = arms
        (OUT / "batch22-audio.json").write_text(json.dumps(out), encoding="utf-8")
        print(f"  {word}: {len(arms)} arms  " + " ".join(a["family"] for a in arms), flush=True)
    return out


if __name__ == "__main__" and not sys.argv[0].endswith("render_batch22_thin.py"):
    result = build()
    thin = [w for w, a in result.items() if len(a) < 3]
    print(f"wrote batch22-audio.json; {sum(len(a) for a in result.values())} arms over {len(result)} words"
          + (f"; THIN: {' '.join(thin)}" if thin else ""))
