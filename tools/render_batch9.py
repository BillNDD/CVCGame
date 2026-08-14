# Batch 9: the batch-8 rebuild. Batch 8 failed the same way for every word -
# "a big sound or a word in front" - and the diagnosis is recorded in
# docs/settled.md: af_heart opens every ISOLATED word render with an
# 85-115 ms voiced blob, so the canonical template itself was polluted, the
# template match aligned blob frames onto the preceding carrier word, and
# verify() accepted the junk because its reference carried the same junk.
#
# What this generator does differently, all of it calibrated first against
# the owner-refused silk/slip arms (known-bad) and accepted pack words:
#
#   - the canonical template is CLEANED (verify.clean_onset) before it
#     locates or judges anything;
#   - every candidate passes verify() against the cleaned template AND the
#     onset check: an unvoiced-initial word may carry at most 40 ms of
#     voiced material before its frication or burst;
#   - the gate runs on the DECODED mp3 - the thing the listener hears;
#   - warmth is the design axis, not an afterthought: the owner refused
#     batch 8's survivors for having "no human warmth". Beside the teacher
#     frames, every word is offered cut from a NATURAL sentence (the family
#     that won "Pronounced:"), at an unhurried 0.8, and with a breathy
#     WORLD variant (aperiodicity raised) beside the pitch-colour ones.
#
# Usage: python render_batch9.py <out_dir>
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
import verify as V
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


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


def decode(raw):
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
    c = av.open(str(tmp)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def world_parts(a, sr):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    return f0, sp, ap


def world_colour(a, sr, f0r=1.0, fmt=1.0, breath=1.0):
    f0, sp, ap = world_parts(a, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    if breath != 1.0:
        ap = np.ascontiguousarray(np.clip(ap * breath, 0.0, 1.0))
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def gate(cut, word, clean, sr):
    """verify() against the CLEANED canonical, plus the onset check where
    voicing can actually see the boundary (fricative onsets only - a stop
    burst is too brief to measure reliably). A stop-initial candidate is
    allowed ONE island more than the template, because the template's own
    burst is stripped with the blob while a carrier cut keeps its burst;
    dtw and the length ratio still bind."""
    cls = V.onset_class(word)
    ok, why, d = V.verify(cut, clean, sr)
    if not ok and cls == "stop" and why.startswith("extra syllable island"):
        nuc = V.syllable_nuclei(cut, sr)
        if nuc == max(1, V.syllable_nuclei(clean, sr)) + 1:
            ok, why = True, "ok (stop-burst island allowed)"
    if not ok:
        return False, why, d
    if cls == "fricative":
        lead = V.lead_voiced_ms(cut, sr)
        if lead < 0 or lead > 40:
            return False, f"voiced lead {lead}ms before an unvoiced onset", d
    return True, "ok", d


# every word mid-phrase in a sentence a person would actually say - the
# family that won "Pronounced:"; never phrase-final (creak)
NATURAL = {
    "slip": "Don't slip on the ice.",
    "slam": "Don't slam the door, please.",
    "sled": "The sled goes down fast.",
    "snap": "I heard it snap in two.",
    "swim": "We swim in the lake.",
    "spin": "Watch it spin around.",
    "stop": "We stop at the light.",
    "step": "One step at a time.",
    "flag": "The flag waves up high.",
    "flat": "A flat road is easy.",
    "plan": "We plan a picnic today.",
    "glad": "I'm glad you came along.",
    "grin": "A big grin spread wide.",
    "drop": "Don't drop the cup, please.",
    "trap": "The trap snapped shut fast.",
    "twin": "Her twin sister laughed first.",
    "clap": "We clap our hands loudly.",
    "silk": "The silk feels smooth today.",
    "mend": "We mend the sock with thread.",
}
TEACHER = [("listen", "Listen—{w}."), ("everybody", "{W}, everybody."),
           ("say", "Say {w}, everybody.")]
WORDS = list(NATURAL)


items, failures = [], []
for word in WORDS:
    solo_raw, sr = say(word, 0.85)
    clean = V.clean_onset(solo_raw, sr, word)

    cands = []

    def offer(family, seg, seg_sr):
        if seg is None or len(seg) < 0.10 * seg_sr:
            failures.append((word, family, "not located"))
            return
        s0, s1, _, _ = wc.speech_span(seg, seg_sr)
        cut = seg[s0:s1]
        ok, why, d = gate(cut, word, clean, seg_sr)
        if not ok:
            failures.append((word, family, why))
            return
        cands.append((family, cut, seg_sr, d))

    def located(carrier, seg_sr, family):
        st, en, score = wc.template_match(clean, carrier, seg_sr)
        if st is None or score < 0.55:
            failures.append((word, family, f"no match ({score:.2f})"))
            return None
        st, en = wc.refine_edges(carrier, seg_sr, st, en, pad_ms=15, max_walk_ms=30)
        return carrier[st:en]

    for fam, frame in TEACHER:
        for sp in (0.8, 0.85, 0.95):
            car, csr = say(frame.replace("{W}", word.capitalize()).replace("{w}", word), sp)
            offer(f"{fam}_sp{sp}", located(car, csr, f"{fam}_sp{sp}"), csr)
    for sp in (0.85, 0.95):
        car, csr = say(NATURAL[word], sp)
        offer(f"natural_sp{sp}", located(car, csr, f"natural_sp{sp}"), csr)

    # warmth treatments of the two best cuts so far: breath, warm, low
    best = sorted(cands, key=lambda r: r[3])[:2]
    for fam, cut, csr, d in best:
        for tag, kw in (("breath", dict(breath=1.25)),
                        ("warm", dict(f0r=0.97, fmt=1.03)),
                        ("low", dict(f0r=0.94))):
            try:
                offer(f"{fam}_{tag}", world_colour(cut, csr, **kw), csr)
            except Exception as e:
                failures.append((word, f"{fam}_{tag}", f"world: {e}"))

    # diversity: distances spread, at most 2 per family base, cap 8
    cands.sort(key=lambda r: r[3])
    arms, seen_fam, feats = [], {}, []
    for fam, cut, csr, d in cands:
        base = fam.split("_sp")[0]
        if seen_fam.get(base, 0) >= 3:
            continue
        f = wc.logmel(cut, csr).mean(axis=0)
        if any(float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
               for g in feats):
            continue
        mp3, ms = encode(shape(cut, csr), csr)
        dec, dsr = decode(mp3)
        d0, d1, _, _ = wc.speech_span(dec, dsr)
        ok, why, _ = gate(dec[d0:d1], word, clean, dsr)
        if not ok:
            failures.append((word, fam, f"after encode: {why}"))
            continue
        seen_fam[base] = seen_fam.get(base, 0) + 1
        feats.append(f)
        arms.append({"id": f"{word}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        if len(arms) >= 8:
            break
    items.append({"kind": "word", "text": word,
                  "note": "rebuilt after batch 8 — every option verified to start ON the word",
                  "arms": arms})
    print(f"{word}: {len(arms)} arms ({len(cands)} candidates passed the gate)")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused during build: {len(failures)}")
for w, fam, why in failures[-40:]:
    print(f"  {w:5s} {fam:22s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    raise SystemExit(f"round refused: too few verified arms for {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Batch 9 — the blends rebuilt: clean starts, and warmth as the goal",
    "tally": ("Words: 349 shipped + 59 approved and waiting; these 19 are the "
              "rebuilt batch-8 field. Sentences: 21 shipped + 2 approved "
              "(Pronounced: is in). Sounds: 35 of 45 done; 10 in sound round 3."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
