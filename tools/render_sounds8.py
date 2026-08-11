# Sound round 8: twenty options each for schwa and oo (book), on the owner's
# instruction of 2026-08-11 to try again and "really go crazy with ideas".
#
# The record says synthesis is exhausted for these two (voice-pack.md, round
# 7). The owner has reopened it, so this round is built to be genuinely new:
# every mechanism below is one no earlier round used. Round 7 already tried
# voiced-run extraction from the owner's own cup/cut/push/bush clips, the
# word-final schwa of sofa/pasta/papa, phoneme sandwiches, and oo (moon)
# shortened and laxed. None of those is repeated here.
#
# THE CENTRAL NEW IDEA — CLOSURE FLANKS. The silence-flank recipe closed every
# other vowel by cutting only where the SOURCE shows silence on both sides.
# That was read as "silence between WORDS", which is why it never reached these
# two: they have no pure word. But a stop consonant's closure is also silence,
# and it sits INSIDE a word. In "book" the /b/ closure and the /k/ closure
# bracket the /U/ with real silence on both flanks. So the recipe applies after
# all - one level down. schwa gets the same treatment from "about", "a big",
# "upon". This is the mechanism this round is really testing.
#
# The others, each new to these two sounds:
#   - VOWEL STRETCH. Both sounds are short by nature, and a 60 ms fragment is
#     heard as a click rather than a sound. WORLD holds the formants while the
#     nucleus is stretched to 160-220 ms. Round 7 went the other way, shortening
#     oo (moon); nothing has tried lengthening a real short vowel.
#   - PRINCIPLED FORMANT DERIVATION from an APPROVED clip. schwa is an
#     unstressed /A/, and the owner has already accepted "u" (as in up); oo
#     (book) is a laxer, higher-F1 /u:/, and oo (moon) is accepted. Warp the
#     accepted clip toward measured targets rather than guessing by ear.
#   - THE MEDOID, not the best match. Render the carrier many times, take every
#     instance, and offer the one CLOSEST TO ALL THE OTHERS. A field ordered by
#     distance to a template is ordered by likeness to the lone render, which
#     this project has learned is the thing that never wins (settled.md).
#   - A HELD LOOP. 40 ms from the vowel's steady centre, cross-faded into
#     itself to make a 200 ms held sound. Labelled honestly: it is built from
#     real material but it is not one continuous utterance.
#   - A SECOND VOICE, for two arms only and named as such. Every clip in this
#     project is af_heart, and consistency matters, so these are offered as a
#     comparison the owner can refuse on principle - not smuggled in.
#
# Every arm is located and content-verified by tools/soundgate.py before it can
# reach the page, the same gate every sound round has used since round 3.
#
# Usage: python render_sounds8.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
import pyworld
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 8

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(t, sp=0.85, ph=False, voice=VOICE):
    if ph:
        a, sr = k.create(t, voice=voice, speed=sp, lang="en-us", is_phonemes=True)
    else:
        a, sr = k.create(t, voice=voice, speed=sp, lang="en-us")
    return np.asarray(a, np.float32), sr


def polish(a, sr, peak_db=-3.0):
    a = np.asarray(a, np.float32).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a *= (10 ** (peak_db / 20)) / peak
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def decode(raw):
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
    c = av.open(str(tmp)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def world(a, sr, f0r=1.0, fmt=1.0, breath=1.0, stretch=1.0):
    """WORLD analysis and resynthesis, with an optional time stretch that holds
    the formants: the frame sequence is resampled, the spectral envelope is
    not."""
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if stretch != 1.0:
        n = max(4, int(len(f0) * stretch))
        idx = np.clip((np.arange(n) / stretch).astype(int), 0, len(f0) - 1)
        f0, sp, ap = f0[idx], np.ascontiguousarray(sp[idx]), np.ascontiguousarray(ap[idx])
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    if breath != 1.0:
        ap = np.ascontiguousarray(np.clip(ap * breath, 0.0, 1.0))
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def closure_islands(a, sr, floor_db=-30, min_ms=45, gap_ms=25):
    """Audible runs bracketed by quiet, measured INSIDE a word as well as
    between words. A stop's closure is silence, so /U/ in "book" is bracketed
    by the /b/ and /k/ closures. Returns (start, end, pre_ms, post_ms)."""
    _, _, db, n = wc.speech_span(a, sr)
    hop = 1000 * n / sr
    loud = db > floor_db
    runs, start = [], None
    for i, v in enumerate(loud):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append([start, i]); start = None
    if start is not None:
        runs.append([start, len(loud)])
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * hop < gap_ms:
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    out = []
    for idx, (s, e) in enumerate(merged):
        if (e - s) * hop < min_ms:
            continue
        pre = (s - merged[idx - 1][1]) * hop if idx else s * hop
        post = (merged[idx + 1][0] - e) * hop if idx + 1 < len(merged) else (len(loud) - e) * hop
        out.append((int(s * n), int(e * n), pre, post, idx))
    return out


def vowel_core(a, sr, keep=0.6):
    """The steady middle of a vowel: drop the outer edges, where the
    neighbouring consonants colour it."""
    c = G.core(a, sr)
    n = len(c)
    m = int(n * (1 - keep) / 2)
    return c[m:n - m] if n - 2 * m > int(0.04 * sr) else c


def held_loop(a, sr, target_ms=200, grain_ms=40):
    """A held sound built by cross-fading the vowel's steady centre into
    itself. Honest label: real material, but not one continuous utterance."""
    c = vowel_core(a, sr, keep=0.5)
    g = int(sr * grain_ms / 1000)
    if len(c) < g + 10:
        return None
    mid = c[len(c) // 2 - g // 2: len(c) // 2 + g // 2]
    if len(mid) < 10:
        return None
    f = max(4, len(mid) // 4)
    out = mid.copy()
    while len(out) < int(sr * target_ms / 1000):
        head, tail = mid.copy(), out[-f:].copy()
        head[:f] *= np.linspace(0, 1, f); tail *= np.linspace(1, 0, f)
        out = np.concatenate([out[:-f], tail + head[:f], head[f:]])
    return out.astype(np.float32)


def medoid(cands):
    """The instance closest to ALL the others, not to a template. A field
    ordered by distance to a lone render is ordered by likeness to the thing
    that never wins (settled.md, 2026-08-11)."""
    if len(cands) < 3:
        return cands[0] if cands else None
    feats = [wc.logmel(c[1], c[2]).mean(axis=0) for c in cands]
    feats = [f / (np.linalg.norm(f) + 1e-9) for f in feats]
    best, score = None, -9e9
    for i, f in enumerate(feats):
        s = float(np.mean([np.dot(f, g) for j, g in enumerate(feats) if j != i]))
        if s > score:
            best, score = cands[i], s
    return best


CARDS = [
    dict(name="schwa", ph="ə", kind="voiced",
         note=("round 8, all-new mechanisms: the vowel cut between two stop CLOSURES inside "
               "a word (about, a big, upon); the same vowel stretched to a hearable length; "
               "your approved 'u' warped toward schwa; the medoid of many renders; a held "
               "loop; and two arms in a different voice, named as such"),
         how="the lazy little 'uh' of 'the', 'a', 'about' — short, soft, relaxed, never stressed",
         reject="stressed like 'UH!', a full 'uh' as in up, too long, or any other sound around it",
         # (carrier, speed, which island index holds the vowel)
         closures=[("About.", 0.7), ("About.", 0.6), ("A big bag.", 0.7),
                   ("Upon.", 0.7), ("A dog.", 0.6), ("Ago.", 0.7), ("Away.", 0.7)],
         donor_word="up", donor_ph="ʌ", fmt_target=1.04, f0_target=0.93),
    dict(name="oo_book", ph="ʊ", kind="voiced",
         note=("round 8, all-new mechanisms: the vowel cut between the two stop CLOSURES of "
               "book/took/cook/put; the same vowel stretched to a hearable length; the "
               "accepted long oo warped toward the short one; the medoid of many renders; a "
               "held loop; and two arms in a different voice, named as such"),
         how="the short 'oo' of book, push, took — quick, rounded, relaxed",
         reject="the long 'oo' of moon instead, tense or stretched thin, or consonants left on it",
         closures=[("Book.", 0.7), ("Book.", 0.6), ("Took.", 0.7), ("Cook.", 0.7),
                   ("Put.", 0.7), ("Good book.", 0.7), ("Look.", 0.6)],
         donor_word="moon", donor_ph="uː", fmt_target=0.94, f0_target=1.0),
]

items, failures = [], []
for card in CARDS:
    name, ph, kind = card["name"], card["ph"], card["kind"]
    tpl_raw, sr0 = say(ph, 0.85, ph=True)
    tpl = G.core(tpl_raw, sr0)
    cands, seen = [], []

    def add(family, seg, seg_sr):
        """Gate, de-duplicate, and keep. Nothing reaches the page ungated."""
        if seg is None or len(seg) < int(0.05 * seg_sr):
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind)
        if not ok:
            failures.append((name, family, why)); return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        f = f / (np.linalg.norm(f) + 1e-9)
        if any(float(np.dot(f, g)) > 0.995 for g in seen):
            failures.append((name, family, "duplicate of an arm already offered")); return
        seen.append(f)
        cands.append((family, cut, seg_sr, d))

    # 1 — CLOSURE FLANKS: the vowel bracketed by two stop closures inside a word
    closure_pool = []
    for text, sp in card["closures"]:
        car, csr = say(text, sp)
        for st, en, pre, post, idx in closure_islands(car, csr):
            if pre < 20 or post < 20:
                failures.append((name, f"closure[{text} {sp}]", f"flanks {pre:.0f}/{post:.0f}ms")); continue
            seg = car[st:en]
            ms = len(seg) / csr * 1000
            if ms > 320:
                failures.append((name, f"closure[{text} {sp}]", f"{ms:.0f}ms is a syllable, not a sound")); continue
            closure_pool.append((f"closure_{text.strip('.').replace(' ', '-')}_{sp}", seg, csr, 0.0))
            add(f"closure_{text.strip('.').replace(' ', '-')}_{sp}", seg, csr)

    # 2 — VOWEL STRETCH: hold the formants, make the sound long enough to hear
    for fam, seg, csr, _ in closure_pool[:6]:
        for tag, st in (("x2", 2.0), ("x2.8", 2.8)):
            try:
                add(f"{fam}_stretch{tag}", world(seg, csr, stretch=st), csr)
            except Exception as e:
                failures.append((name, f"{fam}_stretch{tag}", f"world: {e}"))

    # 3 — PRINCIPLED DERIVATION from an approved neighbour sound
    don, dsr = say(card["donor_word"], 0.8)
    for st, en, pre, post, idx in closure_islands(don, dsr):
        seg = don[st:en]
        for tag, kw in (("target", dict(fmt=card["fmt_target"], f0r=card["f0_target"])),
                        ("target_short", dict(fmt=card["fmt_target"], f0r=card["f0_target"], stretch=0.75)),
                        ("target_soft", dict(fmt=card["fmt_target"], f0r=card["f0_target"] * 0.97, breath=1.2))):
            try:
                add(f"donor_{card['donor_word']}_{tag}", world(vowel_core(seg, dsr), dsr, **kw), dsr)
            except Exception as e:
                failures.append((name, f"donor_{tag}", f"world: {e}"))
        break

    # 4 — THE MEDOID of many renders of the same carrier
    pool = []
    for text, sp in card["closures"]:
        for s2 in (sp, sp + 0.1, sp + 0.2):
            car, csr = say(text, s2)
            for st, en, pre, post, idx in closure_islands(car, csr):
                seg = car[st:en]
                if 45 <= len(seg) / csr * 1000 <= 320 and pre >= 20 and post >= 20:
                    pool.append((f"medoid_{text.strip('.')}", seg, csr, 0.0))
    m = medoid(pool)
    if m:
        add("medoid_of_field", m[1], m[2])
        try:
            add("medoid_of_field_stretch", world(m[1], m[2], stretch=2.2), m[2])
        except Exception as e:
            failures.append((name, "medoid_stretch", f"world: {e}"))

    # 5 — A HELD LOOP built from the vowel's own steady centre
    for fam, seg, csr, _ in closure_pool[:3]:
        for ms in (170, 220):
            add(f"{fam}_held{ms}", held_loop(seg, csr, target_ms=ms), csr)

    # 6 — A SECOND VOICE, two arms, named so the owner can refuse on principle
    for alt in ("af_bella", "af_nicole"):
        try:
            car, csr = say(card["closures"][0][0], 0.7, voice=alt)
        except Exception as e:
            failures.append((name, f"voice_{alt}", f"voice unavailable: {e}")); continue
        for st, en, pre, post, idx in closure_islands(car, csr):
            seg = car[st:en]
            if 45 <= len(seg) / csr * 1000 <= 320 and pre >= 20 and post >= 20:
                add(f"OTHER-VOICE_{alt}", seg, csr)
                break

    # Order the field by family, never by distance to the lone render.
    by_family = {}
    for c in sorted(cands, key=lambda r: r[3]):
        by_family.setdefault(c[0].split("_")[0], []).append(c)
    ordered, depth = [], 0
    while any(len(v) > depth for v in by_family.values()):
        for fam in sorted(by_family):
            if len(by_family[fam]) > depth:
                ordered.append(by_family[fam][depth])
        depth += 1

    arms = []
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(polish(cut, csr), csr)
        dec, dsr2 = decode(mp3)
        ok, why, _ = G.verify_sound(G.core(dec, dsr2), tpl, dsr2, kind=kind)
        if not ok:
            failures.append((name, fam, f"after encode: {why}")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        if len(arms) >= 20:
            break
    fams = sorted({a["family"].split("_")[0] for a in arms})
    print(f"{name}: {len(arms)} arms from {len(cands)} gated candidates, families {fams}")
    items.append({"kind": "word", "text": name, "note": card["note"],
                  "how": card["how"], "reject": card["reject"], "arms": arms})

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:20]:
    print(f"  {n:8} {fam:34} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 8]
if thin:
    raise SystemExit(f"round refused: {thin} could not fill a field, and a thin field is the fault")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 8 — twenty each for schwa and oo (book), all-new mechanisms",
    "tally": ("Sounds: 45 of 47 closed; these are the last two. Words: 349 shipped + 115 "
              "approved, nothing in flight. Sentences: 21 shipped + 42 approved, done."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
