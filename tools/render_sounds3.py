# Sound round 3. Round 2 cut donors at blind fractions and verified nothing,
# so the owner heard "the sound + a long piece of a sentence" on card after
# card (docs/settled.md: the content gate applies to EVERY round type). This
# generator does not know how to make an unverified arm:
#
#   - every candidate is LOCATED - the word by its own render's template
#     match inside the carrier, the sound by its phoneme template match
#     inside the word - never taken at a blind fraction;
#   - every candidate passes tools/soundgate.py against the sound's phoneme
#     template before it can become an arm (the gate was calibrated against
#     the accepted sounds and round 2's recreated wreckage first);
#   - the built round is then re-verified independently: every arm's mp3 is
#     decoded back and gated again, and the build refuses to ship if one
#     fails.
#
# The owner's round-2 rulings drive the card list: iterate on the accepted
# long_a and aw clips (not a fresh hunt); solve th_quiet's static - the
# suspect is the flat -3 dBFS peak lift, which turns quiet frication into
# loud hiss, so th arms come at gentler peaks and band-limited; proper
# located candidates for long_i, long_o, long_u, schwa, oo_book; and oi and
# ow re-offered after the round the owner gave up marking.
#
# Usage: python render_sounds3.py <out_dir>
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
REPO = pathlib.Path(__file__).resolve().parent.parent
P45 = REPO / "tools/pending-sounds"
PENDING = REPO / "tools/pending-words"
PACK = REPO / "app/public/voice"
VOICE = "af_heart"
PAD_LEAD, PAD_TAIL = 150, 400

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


def polish(a, sr, peak_db=-3.0):
    a = np.asarray(a, np.float32)
    n = int(0.008 * sr)
    if len(a) > 2 * n:
        a = a.copy(); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    a = a * (10 ** (peak_db / 20) / (float(np.abs(a).max()) or 1.0))
    return np.concatenate([np.zeros(int(PAD_LEAD / 1000 * sr), np.float32), a,
                           np.zeros(int(PAD_TAIL / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def world_shift(a, sr, f0r, fmt):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def lowpass(a, sr, hz):
    F = np.fft.rfft(np.asarray(a, np.float64))
    f = np.fft.rfftfreq(len(a), 1 / sr)
    hi = f > hz
    F[hi] *= np.exp(-(((f[hi] - hz) / 1500.0) ** 2))
    return np.fft.irfft(F, len(a)).astype(np.float32)


def locate(tpl, container, sr, scales, walk_ms=30):
    """Template-located cut - never a blind fraction."""
    st, en, score = wc.template_match(tpl, container, sr, scales=scales)
    if st is None or score < 0.55:
        return None
    st, en = wc.refine_edges(container, sr, st, en, pad_ms=10, max_walk_ms=walk_ms)
    return container[st:en]


def card_template(ph, kind, tpl_ph=None):
    """The canonical template every candidate is judged against: the sound
    rendered alone from its phonemes. Kokoro cannot render a lone unvoiced
    phoneme (its θ is a voiced 'thuh' - the gate's metrics proved it), so an
    unvoiced template renders the sound in an explicit phoneme context
    (tpl_ph, e.g. θɪn) and takes the frication run out of it."""
    if kind == "unvoiced":
        a, sr = say(tpl_ph or ph, 0.85, ph=True)
        t = G.unvoiced_run(G.core(a, sr), sr)
        if t is None:
            raise SystemExit(f"no frication run in the template render for {ph}")
        return t, sr
    a, sr = say(ph, 0.85, ph=True)
    return G.core(a, sr), sr


def theta_cut(word_audio, sr):
    """The θ inside a donor word: the longest energetic unvoiced run - m,
    vowels and codas are voiced, so in math/bath/moth the run IS the θ."""
    return G.unvoiced_run(word_audio, sr)


CARDS = [
    dict(name="long_a", ph="eɪ", kind="voiced",
         note="owner ruled: iterate on the accepted clip — option 1 IS that clip",
         how="the letter A saying its own name, one clean glide — the vowel of cake and day",
         reject="a chopped start or end, another word's sounds around it, or a robotic tone"),
    dict(name="aw", ph="ɔ", kind="voiced",
         note="owner ruled: iterate on the accepted clip — option 1 IS that clip",
         how="the open relaxed 'aw' of saw and paw",
         reject="sounds like 'ah' or 'oh' instead, or carries extra sounds"),
    dict(name="th_quiet", ph="θ", kind="unvoiced", tpl_ph="θɪn",
         note="new candidates at gentler volume and band-limited, against the static",
         how="a soft puff of air between the teeth, no voice at all — the start of thin, the end of math",
         reject="any hum or vowel in it, an 'uh' before or after, a hissy 'sss', or crackling static"),
    dict(name="long_i", ph="aɪ", kind="voiced",
         how="the letter I saying its name — the vowel of time and my, one glide from 'ah' to 'ee'",
         reject="any m, t or other consonant left on it, or more than the one sound"),
    dict(name="long_o", ph="oʊ", kind="voiced",
         how="the letter O saying its name — the vowel of go, one round glide",
         reject="a g or other consonant at the front, or extra sounds"),
    dict(name="long_u", ph="juː", kind="voiced",
         how="the letter U saying its name — sounds exactly like the word 'you'",
         reject="chopped, or carrying sounds that are not 'you'"),
    dict(name="schwa", ph="ə", kind="voiced",
         how="the lazy little 'uh' of 'the' — short, soft and relaxed",
         reject="too long, stressed like 'UH', or carrying th or other sounds"),
    dict(name="oo_book", ph="ʊ", kind="voiced",
         how="the short 'oo' of book and push — quick and rounded",
         reject="the long 'oo' of moon instead, or consonants left on it"),
    dict(name="oi", ph="ɔɪ", kind="voiced",
         how="the glide of coin and boy — 'aw' rolling into 'ee' as one sound",
         reject="consonants left on it, or the two halves sounding like two separate sounds"),
    dict(name="ow", ph="aʊ", kind="voiced",
         how="the glide of cow and out — 'ah' rolling into 'oo' as one sound",
         reject="consonants left on it, or a chopped glide"),
]

# where each sound's fresh candidates come from: shipped pack words, accepted
# pending words, and mid-phrase teacher carriers (never phrase-final: creak)
PACK_DONORS = {"th_quiet": ["math", "bath", "moth"], "oo_book": ["push", "bush"],
               "schwa": ["the"]}
PENDING_DONORS = {"long_i": ["my"], "long_u": ["you"]}
CARRIER_WORDS = {"long_a": ["cake", "day"], "aw": ["saw", "paw"],
                 "long_i": ["time", "my"], "long_o": ["go", "so"],
                 "long_u": ["you"], "oo_book": ["push"],
                 "oi": ["coin", "boy"], "ow": ["cow", "out"],
                 "th_quiet": ["math", "bath"], "schwa": ["about"]}
FRAME = "Say {w}, everybody."

# the sound inside a word is faster than a drawled solo phoneme render
IN_WORD_SCALES = (0.4, 0.5, 0.62, 0.75, 0.9, 1.05)
# schwa is barely 70 ms inside a word - search smaller
SCALES_FOR = {"schwa": (0.22, 0.3, 0.4, 0.5, 0.62)}


items, failures = [], []
for card in CARDS:
    name, ph, kind = card["name"], card["ph"], card["kind"]
    tpl, sr = card_template(ph, kind, card.get("tpl_ph"))
    arms, seen = [], []

    def add(family, seg, seg_sr, peak_db=-3.0, raw_bytes=None):
        """Gate first; an arm that cannot be verified does not exist."""
        if raw_bytes is None:
            if seg is None:
                failures.append((name, family, "not located"))
                return
            cut = G.core(np.asarray(seg, np.float32), seg_sr)
            ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind)
            if not ok:
                failures.append((name, family, why))
                return
            # near-dupe drop - but the features are gain-invariant, so a
            # deliberate level or bandwidth probe (same sound, different
            # loudness) is only a dupe against its own treatment
            f = wc.logmel(cut, seg_sr).mean(axis=0)
            if any(pk == peak_db and
                   float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
                   for g, pk in seen):
                return
            seen.append((f, peak_db))
            mp3, ms = encode(polish(cut, seg_sr, peak_db), seg_sr)
            # gate what the listener will actually hear: the DECODED mp3 -
            # codec framing can split an island the raw cut did not have
            dec, dsr = load_bytes(mp3)
            ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind)
            if not ok:
                failures.append((name, family, f"after encode: {why}"))
                return
        else:
            mp3 = raw_bytes
            a, _sr = load_bytes(raw_bytes)
            ms = int(len(a) * 1000 / _sr)
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})

    def load_bytes(raw):
        tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
        return load(tmp)

    # option 1: the accepted clip, byte for byte, where one exists
    p45 = P45 / f"s-{name}.mp3"
    if name in ("long_a", "aw") and p45.exists():
        add("P45 ACCEPTED (the iterate target)", None, sr, raw_bytes=p45.read_bytes())

        # iterations OF the accepted bytes: trims and colour, never a re-hunt
        acc, asr = load(p45)
        core = G.core(acc, asr)
        for tag, seg in (("tail-40", core[:-int(0.04 * asr)]),
                         ("tail-70", core[:-int(0.07 * asr)]),
                         ("front+30", core[int(0.03 * asr):])):
            add(f"iterate_{tag}", seg, asr)
        for tag, f0r, fmt in (("warm", 0.97, 1.03), ("bright", 1.03, 0.97),
                              ("lower", 0.94, 1.0), ("higher", 1.06, 1.0)):
            try:
                add(f"iterate_{tag}", world_shift(core, asr, f0r, fmt), asr)
            except Exception as e:
                failures.append((name, f"iterate_{tag}", f"world: {e}"))

    # located cuts from shipped pack words the owner already approved
    for w in PACK_DONORS.get(name, []):
        f = PACK / f"w-{w}.mp3"
        if not f.exists():
            continue
        a, wsr = load(f)
        if name == "th_quiet":
            t = theta_cut(a, wsr)
            if t is None:
                failures.append((name, f"pack_{w}", "no frication run found"))
            else:
                for tag, pk in (("soft", -6.0), ("softer", -9.0), ("softest", -12.0)):
                    add(f"pack_{w}_{tag}", t, wsr, peak_db=pk)
                add(f"pack_{w}_lp8k_soft", lowpass(t, wsr, 8000), wsr, peak_db=-6.0)
                add(f"pack_{w}_short_soft", t[:int(0.14 * wsr)], wsr, peak_db=-6.0)
        else:
            add(f"pack_{w}", locate(tpl, G.core(a, wsr), wsr,
                                    SCALES_FOR.get(name, IN_WORD_SCALES)), wsr)

    # located cuts from accepted pending words (my, you)
    for w in PENDING_DONORS.get(name, []):
        f = PENDING / f"w-{w}.mp3"
        if not f.exists():
            continue
        a, wsr = load(f)
        cor = G.core(a, wsr)
        if name == "long_u":
            # the word IS the sound: offer its core and gentle variants
            add("you_asis", cor, wsr)
            add("you_tail-50", cor[:-int(0.05 * wsr)], wsr)
            for tag, f0r, fmt in (("warm", 0.97, 1.03), ("bright", 1.03, 0.97)):
                try:
                    add(f"you_{tag}", world_shift(cor, wsr, f0r, fmt), wsr)
                except Exception as e:
                    failures.append((name, f"you_{tag}", f"world: {e}"))
        else:
            add(f"accepted_{w}", locate(tpl, cor, wsr,
                                        SCALES_FOR.get(name, IN_WORD_SCALES)), wsr)

    # located cuts from mid-phrase teacher carriers: find the word by its own
    # render, then the sound inside the word by its phoneme template
    for w in CARRIER_WORDS.get(name, []):
        wtpl_raw, csr = say(w, 0.85)
        wtpl = G.core(wtpl_raw, csr)
        for sp in (0.85, 0.95):
            car, csr = say(FRAME.replace("{w}", w), sp)
            word = locate(wtpl, car, csr, (0.85, 0.925, 1.0, 1.08, 1.18), walk_ms=40)
            if word is None:
                failures.append((name, f"carrier_{w}_sp{sp}", "word not located"))
                continue
            if name == "th_quiet":
                add(f"carrier_{w}_sp{sp}", theta_cut(word, csr), csr, peak_db=-6.0)
            else:
                add(f"carrier_{w}_sp{sp}", locate(tpl, word, csr,
                                                  SCALES_FOR.get(name, IN_WORD_SCALES)), csr)

    # the sound rendered alone from its phonemes, plus colour - kokoro
    # cannot render a lone UNVOICED phoneme (its θ is a voiced "thuh"; the
    # gate's own metrics proved it), so for those the frication run is
    # pulled from a phoneme-context render instead
    for sp in (0.85, 0.7):
        a, psr = say(card.get("tpl_ph", ph) if kind == "unvoiced" else ph, sp, ph=True)
        seg = G.core(a, psr)
        if kind == "unvoiced":
            seg = G.unvoiced_run(seg, psr)
            if seg is None:
                failures.append((name, f"phoneme_sp{sp}", "no frication run"))
                continue
            for tag, pk in (("soft", -6.0), ("softer", -9.0)):
                add(f"phoneme_sp{sp}_{tag}", seg, psr, peak_db=pk)
        else:
            add(f"phoneme_sp{sp}", seg, psr)
    if kind == "voiced":
        a, psr = say(ph, 0.85, ph=True)
        base = G.core(a, psr)
        for tag, f0r, fmt in (("warm", 0.97, 1.03), ("bright", 1.03, 0.97)):
            try:
                add(f"phoneme_{tag}", world_shift(base, psr, f0r, fmt), psr)
            except Exception as e:
                failures.append((name, f"phoneme_{tag}", f"world: {e}"))

    items.append({"kind": "word", "text": name, "note": card.get("note", ""),
                  "how": card["how"], "reject": card["reject"], "arms": arms})
    print(f"{name}: {len(arms)} arms")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused by the gate during build: {len(failures)}")
for name, fam, why in failures:
    print(f"  {name:9s} {fam:24s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    raise SystemExit(f"round refused: too few verified arms for {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 3 — every option located and content-verified",
    "tally": ("Sounds: 35 of 45 done — these 10 are what's left. "
              "Words: 349 shipped + 59 approved and waiting; 19 more in the open batch-8 round. "
              "Sentences: 21 shipped + 1 approved; 1 more in batch 8."),
    "items": items}))
print("wrote", OUT / "batch-data.json")

# ---- independent self-verification: decode every arm back and gate it ----
data = json.loads((OUT / "batch-data.json").read_text())
bad = []
for item in data["items"]:
    card = next(c for c in CARDS if c["name"] == item["text"])
    tpl, tsr = card_template(card["ph"], card["kind"], card.get("tpl_ph"))
    for arm in item["arms"]:
        raw = base64.b64decode(arm["b64"])
        tmp.write_bytes(raw)
        a, asr = load(tmp)
        if float(np.abs(a).max()) < 0.05:
            bad.append((arm["id"], "inaudible")); continue
        if arm["ms"] < 250:
            bad.append((arm["id"], "too short to judge")); continue
        ok, why, d = G.verify_sound(G.core(a, asr), tpl, asr, card["kind"])
        if not ok:
            bad.append((arm["id"], f"decoded arm fails the gate: {why}"))
    print(f"self-verify {item['text']}: {len(item['arms'])} arms checked")
if tmp.exists():
    tmp.unlink()
if bad:
    for b in bad:
        print("  FAIL", *b)
    raise SystemExit("round refused: an arm a listener would get failed verification")
print("self-verify OK: every shipped arm decodes, is audible, and passes the gate")
