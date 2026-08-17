# Batch 17: five seat-bound words, five heart candidates, and cage's third
# try - cut from the owner's own approved passage clip.
#
# WHY THIS BATCH EXISTS. The owner approved the tier list on 2026-08-16
# ("Go"): as, than, which, from and want seat straight into levels on
# approval; they, for, out, one and there are the heart candidates sentences
# starve without. The listen sweep STARTS AT 0.7 now - batch 16's finding:
# all three of its winners came from listen_sp0.7, a speed batch 15 never
# offered. cage gets the strongest mechanism this project owns, named at its
# second refusal: the word cut from the owner's OWN approved passage clip
# (s:r8-p09s1 says cage twice, graded perfect in round 8), the sound-round-9
# recipe. Every arm hash-guarded against batches 15 AND 16.
#
# Usage: python3 tools/render_batch17.py <out_dir>
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

try:
    import pyworld
    HAS_WORLD = True
except Exception:
    HAS_WORLD = False

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

def prior_shas(out_dir):
    shas = set()
    for f in ("batch15-audio.json", "batch16-audio.json"):
        p = out_dir / f
        if p.exists():
            j = json.loads(p.read_text(encoding="utf-8"))
            for arms in j.values():
                for a in arms:
                    shas.add(a["sha256"])
    return shas

WORDS = ["as", "than", "which", "from", "want",
         "they", "for", "out", "one", "there"]

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))


def say(t, sp=0.85):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us")
    return np.asarray(a, np.float32), sr


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def world_colour(a, sr, f0r=1.0, fmt=1.0, breath=1.0):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    if breath != 1.0:
        ap = np.ascontiguousarray(np.clip(ap * breath, 0.0, 1.0))
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def trim_to_onset(cut, sr):
    lead = V.lead_voiced_ms(cut, sr)
    if lead <= 0:
        return None
    n = int(lead / 1000 * sr)
    return cut[n:] if len(cut) - n > 0.15 * sr else None


def widen_for_stop(carrier, sr, st, en):
    return max(0, st - int(0.06 * sr)), en


def gate(cut, word, clean, sr, allow_islands=0):
    cls = V.onset_class(word)
    ok, why, d = V.verify(cut, clean, sr)
    if not ok and why.startswith("extra syllable island"):
        nuc = V.word_islands(cut, sr)
        base = max(1, V.word_islands(clean, sr))
        if nuc <= base + allow_islands + (1 if cls == "stop" else 0):
            ok, why = True, "ok (burst island allowed)"
    if not ok:
        return False, why, d
    if cls == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False, f"voiced lead {lead}ms", d
    return True, "ok", d


LISTEN_SPEEDS = (0.7, 0.75, 0.8, 0.85, 0.9, 1.0)
OTHER = [("everybody", "{W}, everybody."), ("say", "Say {w}, everybody.")]

failures = []


def located(clean, carrier, csr, word, family):
    st, en, score = wc.template_match(clean, carrier, csr)
    if st is None or score < 0.55:
        failures.append((word, family, f"no match ({score if score else 0:.2f})"))
        return None
    st, en = wc.refine_edges(carrier, csr, st, en, pad_ms=15, max_walk_ms=30)
    if V.onset_class(word) == "stop":
        st, en = widen_for_stop(carrier, csr, st, en)
    return carrier[st:en]


def build_word(word):
    solo_raw, sr = say(word, 0.85)
    clean = V.clean_onset(solo_raw, sr, word)
    # A multi-syllable word allows its own islands: amused is three.
    own_islands = max(0, V.word_islands(clean, sr) - 1)
    cands = []

    def offer(family, seg, seg_sr, recover=True):
        if seg is None or len(seg) < 0.08 * seg_sr:
            return
        s0, s1, _, _ = wc.speech_span(seg, seg_sr)
        cut = seg[s0:s1]
        ok, why, d = gate(cut, word, clean, seg_sr, allow_islands=own_islands)
        if ok:
            cands.append((family, cut, seg_sr, d)); return
        if recover and why.startswith("voiced lead"):
            t = trim_to_onset(cut, seg_sr)
            if t is not None:
                ok2, why2, d2 = gate(t, word, clean, seg_sr, allow_islands=own_islands)
                if ok2:
                    cands.append((family + "_onset", t, seg_sr, d2)); return
                failures.append((word, family + "_onset", why2)); return
        failures.append((word, family, why))

    for sp in LISTEN_SPEEDS:
        car, csr = say(f"Listen—{word}.", sp)
        offer(f"listen_sp{sp}", located(clean, car, csr, word, f"listen_sp{sp}"), csr)
    for fam, frame in OTHER:
        for sp in (0.8, 0.85):
            car, csr = say(frame.replace("{W}", word.capitalize()).replace("{w}", word), sp)
            offer(f"{fam}_sp{sp}", located(clean, car, csr, word, f"{fam}_sp{sp}"), csr)
    if not cands:
        # The voiced-th words refused every gated arm. The closure frame
        # located by the carrier's own silences (the two-letter words' cure)
        # and ungated solos let the ear judge what the gates cannot.
        for sp in (0.6, 0.7, 0.8):
            car, csr = say(f"Stop. {word.capitalize()}. Stop.", sp)
            _, _, db, n = wc.speech_span(car, csr)
            hop = 1000 * n / csr
            loud = db > -32
            runs, st0 = [], None
            for i, v in enumerate(loud):
                if v and st0 is None: st0 = i
                elif not v and st0 is not None: runs.append((st0, i)); st0 = None
            if st0 is not None: runs.append((st0, len(loud)))
            runs = [r for r in runs if (r[1] - r[0]) * hop >= 120]
            if len(runs) == 3:
                a, b = runs[1][0] * n, runs[1][1] * n
                cands.append((f"stop_sp{sp}", car[max(0, a - int(0.05 * csr)):b], csr, 5))
        for sp in (0.7, 0.8, 0.85):
            a2, sr2 = say(word, sp)
            cands.append((f"solo_sp{sp}", a2, sr2, 6))
    if HAS_WORLD:
        best = [c for c in sorted(cands, key=lambda r: r[3]) if c[0].startswith("listen")][:2]
        for fam, cut, csr, d in best:
            for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)), ("low", dict(f0r=0.94))):
                try:
                    offer(f"{fam}_{tag}", world_colour(cut, csr, **kw), csr, recover=False)
                except Exception as ex:
                    failures.append((word, f"{fam}_{tag}", f"world: {ex}"))
    return cands


def cage_from_passage():
    """cage, cut from the owner's own approved passage clip - twice."""
    import av as _av
    src_mp3 = REPO / "tools" / "pending-words" / "s-r8-p09s1.mp3"
    c = _av.open(str(src_mp3)); st = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(st)]).astype(np.float32)
    sr = st.codec_context.sample_rate; c.close()
    if np.abs(x).max() > 2:
        x = x / 32768.0
    solo, ssr = say("cage", 0.85)
    clean = V.clean_onset(solo, ssr, "cage")
    cands = []
    hop = int(sr * 5 / 1000)
    C = wc.logmel(x, sr)
    T = wc.logmel(clean, ssr)
    if len(C) > len(T) + 2:
        scores = np.array([float(np.mean(np.sum(C[i:i + len(T)] * T, axis=1)))
                           for i in range(len(C) - len(T) + 1)])
        order = np.argsort(scores)[::-1]
        found = []
        for i in order[:60]:
            a, b = int(i) * hop, (int(i) + len(T)) * hop
            if scores[i] < 0.5:
                break
            if all(b <= f[0] or a >= f[1] for f in found):
                found.append((a, b))
            if len(found) == 2:
                break
        for k, (a, b) in enumerate(sorted(found), 1):
            for pad_ms, tag in ((20, ""), (60, "_wide")):
                pad = int(pad_ms / 1000 * sr)
                cands.append((f"passage_cut{k}{tag}", x[max(0, a - pad):min(len(x), b + pad)], sr, k))
    for sp in (0.65, 0.7):
        car, csr = say("Listen—cage.", sp)
        seg = located(clean, car, csr, "cage", f"listen_sp{sp}")
        if seg is not None:
            cands.append((f"listen_sp{sp}", seg, csr, 9))
    return cands


if __name__ == "__main__":
    global PRIOR
    PRIOR = prior_shas(OUT)
    out = {}
    for w in WORDS + ["cage"]:
        cands = cage_from_passage() if w == "cage" else build_word(w)
        arms = []
        for i, (fam, cut, csr, d) in enumerate(sorted(cands, key=lambda r: r[3])[:9], 1):
            mp3, ms = encode(shape(cut, csr), csr)
            sha = hashlib.sha256(mp3).hexdigest()
            if sha in PRIOR:
                print(f"    {w}/{fam}: identical to an earlier arm - refused by the hash guard")
                continue
            arms.append({"id": f"{w}_{len(arms) + 1}", "family": fam, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(), "sha256": sha})
        out[w] = arms
        print(f"  {w}: {len(arms)} arms" + ("" if arms else "  <-- EMPTY FIELD"))
    (OUT / "batch17-audio.json").write_text(json.dumps(out), encoding="utf-8")
    thin = [w for w, a in out.items() if len(a) < 3]
    print(f"wrote batch17-audio.json; {sum(len(a) for a in out.values())} arms over {len(out)} words"
          + (f"; THIN FIELDS: {' '.join(thin)}" if thin else ""))
    if failures:
        print(f"({len(failures)} refusals logged; a thin field is offered anyway, per the batch-11 lesson)")
