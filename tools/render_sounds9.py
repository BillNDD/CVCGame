# Sound round 9: back to basics, on the owner's verdict that round 8's forty
# options were "truly outlandish and unreasonable".
#
# They were, and the reason is legible in hindsight. Round 8 ran six
# mechanisms and five of them PROCESSED the audio: time-stretching, formant
# warping, cross-faded loops, a medoid of a synthetic field, a second voice.
# Every one moved further from a person saying a sound. This round does the
# opposite and copies what already worked.
#
# WHAT ALREADY WORKED, read out of the record rather than invented. long_e
# closed as family `pack_she_45` and ch as `pack_such_tail150`. Those names
# mean the sound was cut OUT OF AN ALREADY-SHIPPED WORD CLIP - one of the 349
# the owner has listened to and called perfect - not out of a fresh render.
# A sound cut from an owner-approved clip starts with the warmth the owner
# already accepted. That is the proven recipe for this project, and it has
# never been swept properly for these last two sounds. Round 7 touched it, but
# only through one extraction method on four words.
#
# THE SOURCES, and there are only four, because the bank is small:
#   schwa    - the shipped clips for "the" and "was". The sound's own
#              definition in voice-sounds.csv is "as in the", so "the" is the
#              sound's home word, sitting in the pack, already approved.
#   oo_book  - the shipped clips for "push" and "bush", the only two bank
#              words that carry it, both already approved.
# That scarcity is itself the finding this round tests. If the sound cannot be
# had from the clips that DO carry it, no amount of cleverness elsewhere will
# produce it, and the owner's own voice is the answer.
#
# THE ONE NEW IDEA, and it is a small one. A vowel excised from the middle of
# a word starts and stops at full amplitude, because its natural rise and fall
# belong to the consonants either side. Played alone that reads as a machine
# blip rather than a person - which is a good description of "outlandish".
# So each cut is also offered with a natural envelope: a short rise and a
# longer fall, the shape a spoken sound actually has. Both the shaped and the
# unshaped version are offered, so the owner can hear whether it helps.
#
# No stretching, no formant warping, no loops, no medoid, no second voice.
#
# Usage: python render_sounds9.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
REPO = pathlib.Path(__file__).resolve().parent.parent
LEAD_MS, TAIL_MS = 80, 300

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)


def decode_file(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def decode_bytes(raw):
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
    return decode_file(tmp)


def envelope(a, sr, rise_ms, fall_ms):
    """The shape a spoken sound has. A vowel cut from mid-word begins and ends
    at full amplitude, because its rise and fall belong to the consonants
    either side; alone, that reads as a blip rather than a voice."""
    a = np.asarray(a, np.float32).copy()
    r, f = int(sr * rise_ms / 1000), int(sr * fall_ms / 1000)
    if r + f >= len(a):
        return None
    if r:
        a[:r] *= np.linspace(0, 1, r) ** 0.6      # quick in, as a voice starts
    if f:
        a[-f:] *= np.linspace(1, 0, f) ** 1.4     # slower out, as a voice stops
    return a


def polish(a, sr, peak_db=-3.0):
    a = np.asarray(a, np.float32).copy()
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a *= (10 ** (peak_db / 20)) / peak
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def band_db(a, sr, lo=300, hi=3000, hop_ms=5):
    hop, win = int(sr * hop_ms / 1000), int(sr * 0.020)
    if len(a) < win + hop:
        return np.zeros(1, np.float32), hop
    w = np.hanning(win).astype(np.float32)
    fr = np.stack([a[i:i + win] * w for i in range(0, len(a) - win, hop)])
    spec = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(win, 1 / sr)
    e = spec[:, (f >= lo) & (f <= hi)].sum(axis=1)
    return 10 * np.log10(np.maximum(e, 1e-12) / max(float(e.max()), 1e-12)), hop


def loudest_run(a, sr, floor_db=-14):
    """The word's loudest continuous stretch in the vowel band: for a one-
    syllable word that IS the vowel."""
    s0, s1, _, _ = wc.speech_span(a, sr)
    core = a[s0:s1]
    db, n = band_db(core, sr)
    loud = db > floor_db
    best, cur = None, None
    for i, v in enumerate(loud):
        if v and cur is None:
            cur = i
        elif not v and cur is not None:
            if best is None or (i - cur) > (best[1] - best[0]):
                best = (cur, i)
            cur = None
    if cur is not None and (best is None or (len(loud) - cur) > (best[1] - best[0])):
        best = (cur, len(loud))
    if best is None:
        return None, 0, 0
    return core, int(best[0] * n), int(best[1] * n)


CARDS = [
    dict(name="schwa", ph="ə", kind="voiced",
         note=("back to basics: the sound cut out of the SHIPPED clip for \"the\" — a clip "
               "you already called perfect — the same way long_e and ch were closed. No "
               "stretching, no warping, no loops, no second voice. Half the options add a "
               "natural rise and fall, half do not."),
         how="the lazy little 'uh' of 'the', 'a', 'about' — short, soft, relaxed, never stressed",
         reject="stressed like 'UH!', a full 'uh' as in up, too long, or any other sound around it",
         sources=[("the", "w-the.mp3"), ("was", "w-was.mp3")]),
    dict(name="oo_book", ph="ʊ", kind="voiced",
         note=("back to basics: the sound cut out of the SHIPPED clips for \"push\" and "
               "\"bush\" — clips you already called perfect — the same way long_e and ch "
               "were closed. No stretching, no warping, no loops, no second voice. Half the "
               "options add a natural rise and fall, half do not."),
         how="the short 'oo' of book, push, took — quick, rounded, relaxed",
         reject="the long 'oo' of moon instead, tense or stretched thin, or consonants left on it",
         sources=[("push", "w-push.mp3"), ("bush", "w-bush.mp3")]),
]

# Nothing the owner has already been offered may appear again.
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    f = d / "batch-data.json"
    if not f.exists():
        continue
    try:
        for it in json.loads(f.read_text(encoding="utf-8")).get("items", []):
            for a in it.get("arms", []):
                ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
    except Exception:
        continue
print(f"hash guard: {len(ALREADY)} arms already offered across earlier rounds")

items, failures = [], []
for card in CARDS:
    name, kind = card["name"], card["kind"]
    # The reference is the steady middle of the phoneme render: kokoro drawls
    # an isolated vowel, and a real short vowel measured against the whole of
    # it reads "clipped". The gate's rules are untouched.
    import kokoro_onnx
    if "k" not in dir():
        k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")
    tp, sr0 = k.create(card["ph"], voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m = int(len(tp) * 0.2)
    tpl = tp[m:len(tp) - m] if len(tp) - 2 * m > int(0.04 * sr0) else tp

    cands, seen = [], []

    def add(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.05 * seg_sr):
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind)
        if not ok:
            failures.append((name, family, why)); return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        f = f / (np.linalg.norm(f) + 1e-9)
        ms = len(cut) / seg_sr * 1000
        # Compare only within a class. A shaped arm and the unshaped arm it
        # came from share a duration and nearly a mean spectrum, and hearing
        # the two against each other is the question this round is asking.
        cls = "shaped" if "shaped" in family or "env" in family else "plain"
        if any(c == cls and float(np.dot(f, g)) > 0.995
               and abs(ms - m2) / max(ms, m2) < 0.12 for g, m2, c in seen):
            failures.append((name, family, "duplicate")); return
        seen.append((f, ms, cls))
        cands.append((family, cut, seg_sr, d))

    for word, fname in card["sources"]:
        p = REPO / "app" / "public" / "voice" / fname
        if not p.exists():
            failures.append((name, word, f"no shipped clip at {fname}")); continue
        pack, psr = decode_file(p)

        # 1 — THE PERCENTAGE CUT, exactly the shape of `pack_she_45`: take the
        #     clip's speech span and keep a window at a stated position.
        s0, s1, _, _ = wc.speech_span(pack, psr)
        span = pack[s0:s1]
        for start_pct in (20, 25, 30, 35, 40, 45, 50, 55, 60):
            for hold_ms in (90, 110, 130, 150, 170, 190):
                a = int(len(span) * start_pct / 100)
                b = min(len(span), a + int(psr * hold_ms / 1000))
                if b - a < int(psr * 0.06):
                    continue
                add(f"pack-{word}-{start_pct}-{hold_ms}", span[a:b], psr)
                sh = envelope(span[a:b], psr, 25, 80)
                add(f"pack-{word}-{start_pct}-{hold_ms}-shaped", sh, psr)

        # 2 — THE LOUDEST RUN: for a one-syllable word, its vowel.
        core, a, b = loudest_run(pack, psr)
        if core is not None:
            for pad in (0, 15, 30, 45):
                n = int(psr * pad / 1000)
                seg = core[max(0, a - n):min(len(core), b + n)]
                add(f"pack-{word}-vowel-pad{pad}", seg, psr)
                add(f"pack-{word}-vowel-pad{pad}-shaped", envelope(seg, psr, 25, 80), psr)
            for rise, fall in ((15, 60), (25, 80), (35, 110), (45, 140)):
                add(f"pack-{word}-vowel-env{rise}-{fall}",
                    envelope(core[a:b], psr, rise, fall), psr)

    # Order by family so no single source can fill the field.
    by_family = {}
    for c in sorted(cands, key=lambda r: r[3]):
        by_family.setdefault(c[0].rsplit("-", 2)[0], []).append(c)
    ordered, depth = [], 0
    while any(len(v) > depth for v in by_family.values()):
        for fam in sorted(by_family):
            if len(by_family[fam]) > depth:
                ordered.append(by_family[fam][depth])
        depth += 1

    arms = []
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(polish(cut, csr), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in ALREADY:
            failures.append((name, fam, f"already offered as {ALREADY[sha]}")); continue
        dec, dsr = decode_bytes(mp3)
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind=kind)
        if not ok:
            failures.append((name, fam, f"after encode: {why}")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 20:
            break
    print(f"{name}: {len(arms)} arms from {len(cands)} gated candidates")
    items.append({"kind": "word", "text": name, "note": card["note"],
                  "how": card["how"], "reject": card["reject"], "arms": arms})

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:15]:
    print(f"  {n:8} {fam:34} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 10]
if thin:
    raise SystemExit(f"round refused: {thin} could not fill a field from approved clips")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 9 — back to basics: cut from the clips you already approved",
    "tally": ("Sounds: 45 of 47; these are the last two. Words: 349 shipped + 115 approved, "
              "backlog zero. Sentences: 42 approved, done."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
