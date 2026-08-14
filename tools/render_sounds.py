# A sound round for the sound-out reveal's phoneme library.
#
# Testing the strategies the owner brought back, adapted to the sounds this
# project actually has open (ch, th_thin, long_e, schwa, oo_book):
#
#   A. DONOR FROM THE SHIPPED PACK. The clips for she, the, push, much and
#      math are already approved by the owner's ear, byte for byte. Cutting a
#      sound out of audio a person accepted beats generating new audio nobody
#      has heard, and it is what tools/voice-sounds.csv already specifies for
#      five of the nine open rows.
#   B. CROSS-WORD GEMINATION ("with thin", "much cheese"). Where the same
#      consonant ends one word and begins the next, the model holds it long
#      and steady, and a cut from the middle of that hold has no neighbouring
#      vowel in it at all. This is the strongest of the suggested ideas for a
#      continuant.
#   C. PRE-BOUNDARY WORD-FINAL DONORS ("Say math."). A word-final consonant
#      before a pause gets a full release and nothing follows it to cut into.
#   D. LONG CARRIER, SOUND MID-PHRASE. More context renders more naturally,
#      and mid-phrase keeps the utterance-final creak away.
#   E. SUSTAINED PHONEME STRINGS. Only for a continuant, where a held sound is
#      what a teacher actually makes; never for a stop.
#
# Not attempted, with reasons: onset-centre-release splicing (three donors
# crossfaded) risks audible joins in a 300 ms clip, and this project has no
# listener time to spend proving that; morpheme-boundary donors add nothing
# the gemination frames do not already give.
#
# Every clip is padded and peak-lifted, because a sub-second clip cannot be
# judged otherwise - settled 2026-08-04 after two wasted rounds.
import base64
import hashlib
import io
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
PACK = pathlib.Path("/home/user/CVCFame/app/public/voice")
VOICE = "af_heart"
PAD_LEAD_MS, PAD_TAIL_MS, PEAK_DBFS = 150, 400, -3.0

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def load_mp3(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def say(t, sp=0.85, ph=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


def polish(a, sr):
    """Pad and lift to a judgeable level — the settled treatment for a
    sub-second clip."""
    a = np.asarray(a, np.float32)
    n = int(0.008 * sr)
    if len(a) > 2 * n:
        a = a.copy(); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    peak = float(np.abs(a).max()) or 1.0
    a = a * (10 ** (PEAK_DBFS / 20) / peak)
    return np.concatenate([np.zeros(int(PAD_LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(PAD_TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def tail_of(a, sr, ms, back_ms=0):
    """The last ms of speech — where a word-final consonant lives."""
    s0, s1, _, _ = wc.speech_span(a, sr)
    end = s1 - int(back_ms / 1000 * sr)
    return a[max(s0, end - int(ms / 1000 * sr)):end]


def middle_of(a, sr, frac_start, frac_end):
    s0, s1, _, _ = wc.speech_span(a, sr)
    n = s1 - s0
    return a[s0 + int(n * frac_start):s0 + int(n * frac_end)]


def gemination_hold(a, sr, ms=170):
    """In a geminate ("with thin") the longest steady low-energy stretch
    between the two vowels IS the doubled consonant. Take its centre."""
    _, _, db, n = wc.speech_span(a, sr)
    # frames that are speech but well below the vowel peaks: the consonant
    band = [(i, v) for i, v in enumerate(db) if -34 < v < -12]
    if not band:
        return None
    runs, cur = [], [band[0][0]]
    for i, _ in band[1:]:
        if i == cur[-1] + 1:
            cur.append(i)
        else:
            runs.append(cur); cur = [i]
    runs.append(cur)
    best = max(runs, key=len)
    if len(best) < 6:
        return None
    mid = (best[0] + best[-1]) // 2
    half = int(ms / 20 / 10)
    return a[max(0, (mid - half)) * n:(mid + half) * n]


SOUNDS = {
    "ch": dict(
        label="ch — the t-click into shush, as ending much",
        pack_donors=["much", "rich", "such"],
        finals=["Say much.", "The word is much.", "Listen—rich."],
        gem=["much cheese", "rich cheese", "such choice"],
        long_carrier=["Class, the word much ends with a ch.", "Say much, everybody, much."],
        phoneme=None),
    "th_thin": dict(
        label="th (quiet) — tongue between teeth, air only, as in math",
        pack_donors=["math", "bath", "moth", "with"],
        finals=["Say math.", "The word is bath.", "Listen—moth."],
        gem=["with thin", "bath thing", "math theme"],
        long_carrier=["Class, the word math ends with a quiet th.", "Say math, everybody, math."],
        phoneme="θːː"),
    "long_e": dict(
        label="long e — the letter E's name, the ee of she",
        pack_donors=["she"],
        finals=["Say she.", "The word is she."],
        gem=[],
        long_carrier=["Class, the word she ends with a long e.", "she, she, she."],
        phoneme="iːː"),
    "schwa": dict(
        label="uh (schwa) — the soft, lazy uh of the",
        pack_donors=["the"],
        finals=["Say the.", "The word is the."],
        gem=[],
        long_carrier=["Class, the word the has a lazy uh.", "the, the, the."],
        phoneme="ʌ"),
    "oo_book": dict(
        label="oo (book) — the short oo of push and bush",
        pack_donors=["push", "bush"],
        finals=["Say push.", "The word is bush."],
        gem=[],
        long_carrier=["Class, the word push has a short oo.", "push, push, push."],
        phoneme="ʊ"),
}

items, audit = [], []
for name, cfg in SOUNDS.items():
    arms = []

    def add(family, seg, sr):
        if seg is None or len(seg) < 0.05 * sr:
            return
        if len(seg) > 0.9 * sr:
            return
        mp3, ms = encode(polish(seg, sr), sr)
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{name}_{len(arms)}", family, ms))

    # A. cuts from clips the owner already approved, in the shipped pack
    for w in cfg["pack_donors"]:
        f = PACK / f"w-{w}.mp3"
        if not f.exists():
            continue
        a, sr = load_mp3(f)
        if name in ("ch", "th_thin"):
            for ms in (150, 200, 260):
                add(f"pack_{w}_tail{ms}", tail_of(a, sr, ms), sr)
        elif name == "long_e":
            for lo, hi in ((0.45, 1.0), (0.55, 1.0), (0.5, 0.9)):
                add(f"pack_{w}_{int(lo*100)}-{int(hi*100)}", middle_of(a, sr, lo, hi), sr)
        elif name == "schwa":
            for lo, hi in ((0.45, 1.0), (0.5, 0.95)):
                add(f"pack_{w}_{int(lo*100)}-{int(hi*100)}", middle_of(a, sr, lo, hi), sr)
        else:                                   # oo_book: mid-word vowel
            for lo, hi in ((0.3, 0.62), (0.35, 0.7), (0.25, 0.55)):
                add(f"pack_{w}_{int(lo*100)}-{int(hi*100)}", middle_of(a, sr, lo, hi), sr)

    # B. cross-word gemination: the doubled consonant held between two vowels
    for g in cfg["gem"]:
        a, sr = say(g)
        for ms in (140, 200):
            add(f"gem_{g.replace(' ', '-')}_{ms}", gemination_hold(a, sr, ms), sr)

    # C. word-final before a pause, and D. the same word inside a long carrier
    for text in cfg["finals"] + cfg["long_carrier"]:
        a, sr = say(text)
        if name in ("ch", "th_thin"):
            for ms in (170, 230):
                add(f"say_{text.split()[0].lower()}{len(text)}_tail{ms}", tail_of(a, sr, ms), sr)

    # E. a sustained phoneme, for a continuant only
    if cfg["phoneme"]:
        a, sr = say(cfg["phoneme"], 0.85, ph=True)
        add("sustained_phoneme", a, sr)

    items.append({"kind": "word", "text": name, "note": cfg["label"], "arms": arms})
    print(f"{name}: {len(arms)} arms")

short = [a for a in audit if a[2] < 400]
print(f"audit: {len(audit)} clips; all padded to at least 550 ms, {len(short)} under 400 ms")
(OUT / "batch-data.json").write_text(json.dumps(
    {"title": "Sound round 1 — ch, quiet th, long e, schwa, book-oo", "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
