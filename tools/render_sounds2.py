# Sound round 2. The owner's instruction: the sidecar's accepted bake is
# option 1 for every sound it covers, and iteration continues beside it.
#
# So arm 1 of a covered sound is the P45 clip the owner marked ok, byte for
# byte, labelled so it is recognisable; arms 2+ are fresh candidates from this
# repository's own strategies. A sound the P45 review put on its "revisit"
# list has no arm 1 - it gets candidates only.
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
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
P45 = pathlib.Path("/home/user/CVCFame/tools/pending-sounds")
PACK = pathlib.Path("/home/user/CVCFame/app/public/voice")
VOICE = "af_heart"
PAD_LEAD, PAD_TAIL, PEAK = 150, 400, -3.0

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def say(t, sp=0.85, ph=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


def polish(a, sr):
    a = np.asarray(a, np.float32)
    n = int(0.008 * sr)
    if len(a) > 2 * n:
        a = a.copy(); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    a = a * (10 ** (PEAK / 20) / (float(np.abs(a).max()) or 1.0))
    return np.concatenate([np.zeros(int(PAD_LEAD / 1000 * sr), np.float32), a,
                           np.zeros(int(PAD_TAIL / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def tail_of(a, sr, ms, back=0):
    s0, s1, _, _ = wc.speech_span(a, sr)
    end = s1 - int(back / 1000 * sr)
    return a[max(s0, end - int(ms / 1000 * sr)):end]


def mid_of(a, sr, lo, hi):
    s0, s1, _, _ = wc.speech_span(a, sr)
    n = s1 - s0
    return a[s0 + int(n * lo):s0 + int(n * hi)]


def gem_hold(a, sr, ms=170):
    _, _, db, n = wc.speech_span(a, sr)
    band = [i for i, v in enumerate(db) if -34 < v < -12]
    if not band:
        return None
    runs, cur = [], [band[0]]
    for i in band[1:]:
        if i == cur[-1] + 1: cur.append(i)
        else: runs.append(cur); cur = [i]
    runs.append(cur)
    best = max(runs, key=len)
    if len(best) < 6:
        return None
    mid = (best[0] + best[-1]) // 2; half = int(ms / 20 / 10)
    return a[max(0, mid - half) * n:(mid + half) * n]


# sound -> (label, phoneme, donor words in the shipped pack, gemination frames,
#           whether the sound is a word's tail or its middle)
SOUNDS = [
    ("ch",      "ch — t-click into shush, as ending much", "ʧ", ["much", "rich", "such"], ["much cheese", "rich cheese"], "tail"),
    ("th_quiet", "th (quiet) — air only, as in math", "θ", ["math", "bath", "moth", "with"], ["with thin", "bath thing"], "tail"),
    ("long_a",  "long a — the letter A's name", "eɪ", [], [], "solo"),
    ("long_e",  "long e — the ee of she", "iː", ["she"], [], "mid"),
    ("long_i",  "long i — the letter I's name", "aɪ", ["my"], [], "mid"),
    ("long_o",  "long o — the letter O's name", "oʊ", [], [], "solo"),
    ("long_u",  "long u — the letter U's name, 'you'", "juː", ["you"], [], "mid"),
    ("schwa",   "uh (schwa) — the lazy uh of the", "ə", ["the"], [], "mid"),
    ("oo_book", "oo (book) — the short oo of push", "ʊ", ["push", "bush"], [], "mid"),
    ("ar",      "ar — the vowel of car, star", "ɑɹ", [], [], "solo"),
    ("or",      "or — the vowel of for, corn", "ɔɹ", [], [], "solo"),
    ("er",      "er — the vowel of her, bird", "ɜɹ", [], [], "solo"),
    ("aw",      "aw — the vowel of saw, paw", "ɔ", [], [], "solo"),
    ("oi",      "oi — the glide of coin, boy", "ɔɪ", [], [], "solo"),
    ("ow",      "ow — the glide of cow, out", "aʊ", [], [], "solo"),
    ("zh",      "zh — the buzzing sh of measure", "ʒ", [], ["beige zhaner"], "solo"),
    ("oo_moon", "oo (moon) — the long oo of moon, food", "uː", [], [], "solo"),
]
# words that carry each vowel, for a carrier-cut candidate
VOWEL_WORDS = {"long_a": ["say", "day", "cake"], "long_o": ["go", "so", "home"],
               "ar": ["car", "star"], "or": ["for", "corn"], "er": ["her", "bird"],
               "aw": ["saw", "paw"], "oi": ["coin", "boy"], "ow": ["cow", "out"],
               "oo_moon": ["moon", "food"], "zh": ["measure", "treasure"],
               "long_i": ["time", "my"], "long_u": ["use", "cube"]}

items, audit = [], []
led = json.loads((P45 / "pending-sounds.json").read_text(encoding="utf-8"))
for name, label, ph, donors, gems, kind in SOUNDS:
    arms = []

    def add(family, seg, sr, first=False):
        if seg is None or len(seg) < 0.05 * sr or len(seg) > 0.95 * sr:
            return
        mp3, ms = encode(polish(seg, sr), sr)
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{name}_{len(arms)}", family, ms))

    # ARM 1: the sidecar's accepted clip, exactly as the owner marked it ok
    p45 = P45 / f"s-{name}.mp3"
    if p45.exists():
        a, sr = load(p45)
        mp3 = p45.read_bytes()
        # shipped as-is: it is already the owner's accepted, padded artefact
        ms = int(len(a) * 1000 / sr)
        arms.append({"id": f"{name}_1", "family": "P45 ACCEPTED BAKE (sidecar)", "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        audit.append((f"{name}_1", "p45", ms))

    sr = 24000
    # cuts from clips the owner already approved in the shipped pack
    for w in donors:
        f = PACK / f"w-{w}.mp3"
        if not f.exists():
            continue
        a, sr = load(f)
        if kind == "tail":
            for ms in (150, 200, 260):
                add(f"pack_{w}_tail{ms}", tail_of(a, sr, ms), sr)
        elif kind == "mid":
            for lo, hi in ((0.45, 1.0), (0.5, 0.92), (0.3, 0.62)):
                add(f"pack_{w}_{int(lo*100)}", mid_of(a, sr, lo, hi), sr)
    # gemination
    for g in gems:
        a, sr = say(g)
        for ms in (140, 200):
            add(f"gem_{g.split()[0]}_{ms}", gem_hold(a, sr, ms), sr)
    # cut from a word that carries the sound, in a teacher frame
    for w in VOWEL_WORDS.get(name, []):
        for frame in (f"{w.capitalize()}, everybody.", f"Say {w}, everybody."):
            a, sr = say(frame)
            if kind == "tail":
                add(f"word_{w}_tail", tail_of(a, sr, 200), sr)
            else:
                for lo, hi in ((0.25, 0.7), (0.35, 0.8)):
                    add(f"word_{w}_{int(lo*100)}", mid_of(a, sr, lo, hi), sr)
    # the sound itself, and held
    for tag, text, sp in ((f"phoneme", ph, 0.85), ("phoneme_slow", ph, 0.7),
                          ("phoneme_held", ph + ph[-1] if len(ph) else ph, 0.85)):
        try:
            a, sr = say(text, sp, ph=True)
            add(tag, a, sr)
        except Exception:
            pass

    items.append({"kind": "word", "text": name, "note": label, "arms": arms})
    print(f"{name}: {len(arms)} arms" + ("  (arm 1 = P45 accepted)" if p45.exists() else ""))

print(f"audit: {len(audit)} clips")
(OUT / "batch-data.json").write_text(json.dumps(
    {"title": "Sound round 2 — P45 accepted bake as option 1, plus fresh candidates", "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
