# Sound round 4: the humanising round. Round 3 proved the pipeline can cut
# the RIGHT sound (ow_4: "the 'right' sound, but no human would say it this
# way") and that clean is not enough ("none sound human or have any
# warmth"). The design answer, recorded in docs/voice-pack.md: cut the vowel
# sounds from real INTERJECTION WORDS that consist of the sound alone - eye,
# oh, uh, ow - spoken mid-phrase in a natural sentence, so the model gives
# them the accent, pitch movement and modal edges a human would; and treat
# the best cuts with the warmth knobs (WORLD colour, breathiness).
#
# th_quiet gets a different repair: round 3's verdict was "a hissing snake"
# at every level, so the puff is SHAPED - short, soft, band-limited, with a
# gentle attack and decay - and if this round fails too, the owner records
# it (the nine-sound precedent in docs/settled.md).
#
# Every arm still passes tools/soundgate.py against the sound's phoneme
# template, on the DECODED mp3. The gate is calibrated; the ear is the judge.
#
# Usage: python render_sounds4.py <out_dir>
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
import verify as V
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
REPO = pathlib.Path(__file__).resolve().parent.parent
P45 = REPO / "tools/pending-sounds"
VOICE = "af_heart"
PAD_LEAD, PAD_TAIL = 150, 400

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


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


def decode(raw):
    tmp = OUT / "_tmp.mp3"; tmp.write_bytes(raw)
    c = av.open(str(tmp)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


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


def lowpass(a, sr, hz):
    F = np.fft.rfft(np.asarray(a, np.float64))
    f = np.fft.rfftfreq(len(a), 1 / sr)
    hi = f > hz
    F[hi] *= np.exp(-(((f[hi] - hz) / 1200.0) ** 2))
    return np.fft.irfft(F, len(a)).astype(np.float32)


def shape_puff(a, sr, ms=None, attack=15, decay=45):
    """A short th puff with soft edges - a long flat frication is a hiss."""
    if ms is not None and len(a) > int(ms / 1000 * sr):
        a = a[:int(ms / 1000 * sr)]
    a = a.copy()
    na, nd = int(attack / 1000 * sr), int(decay / 1000 * sr)
    if len(a) > na + nd + 10:
        a[:na] *= np.linspace(0, 1, na)
        a[-nd:] *= np.linspace(1, 0, nd)
    return a


def locate_word(word, carrier, sr, family, failures, name):
    """The word inside the carrier, by its own CLEANED render (the blob
    lesson, docs/settled.md)."""
    solo, ssr = say(word, 0.85)
    clean = V.clean_onset(solo, ssr, word)
    st, en, score = wc.template_match(clean, carrier, sr)
    if st is None or score < 0.55:
        failures.append((name, family, f"word not located ({score:.2f})"))
        return None
    st, en = wc.refine_edges(carrier, sr, st, en, pad_ms=15, max_walk_ms=30)
    return carrier[st:en]


IN_WORD_SCALES = (0.4, 0.5, 0.62, 0.75, 0.9, 1.05)

CARDS = [
    dict(name="long_i", ph="aɪ", kind="voiced",
         note="cut from the word 'eye' — a real word that IS the sound",
         how="the letter I saying its name — the vowel of eye, my and time, one glide from 'ah' to 'ee'",
         reject="any consonant left on it, robotic flatness, or more than the one sound",
         pure=[("eye", "My eye is blue."), ("eye", "Keep an eye on it.")],
         inside=[("my", "Say my, everybody.")]),
    dict(name="long_o", ph="oʊ", kind="voiced",
         note="cut from the word 'oh' — a real word that IS the sound",
         how="the letter O saying its name — one round glide, like saying 'oh' to a friend",
         reject="a g or other consonant, robotic flatness, or a chopped glide",
         pure=[("oh", "Oh, I see it now."), ("oh", "Oh, that was fun.")],
         inside=[("go", "We go home now.")]),
    dict(name="schwa", ph="ə", kind="voiced",
         note="cut from a natural 'uh' — short and lazy, never stressed",
         how="the lazy little 'uh' of 'the' and 'about' — soft, short, relaxed",
         reject="too long, stressed like 'UH!', or carrying other sounds",
         pure=[("uh", "I, uh, forgot it."), ("uh", "It was, uh, big.")],
         inside=[]),
    dict(name="oo_book", ph="ʊ", kind="voiced",
         note="cut from good and book — no English word is this sound alone",
         how="the short 'oo' of book, good and push — quick and rounded",
         reject="the long 'oo' of moon instead, or consonants left on it",
         pure=[],
         inside=[("good", "A good book helps."), ("book", "The book is open."),
                 ("push", "We push it gently.")]),
    dict(name="oi", ph="ɔɪ", kind="voiced",
         note="cut from boy and toy",
         how="the glide of coin and boy — 'aw' rolling into 'ee' as one sound",
         reject="consonants left on it, or two separate halves",
         pure=[],
         inside=[("boy", "The boy is here."), ("toy", "Her toy is red."),
                 ("coin", "Say coin, everybody.")]),
    dict(name="ow", ph="aʊ", kind="voiced",
         note="ow_4 was 'the right sound' — these humanise it, plus cuts from the word 'ow' itself",
         how="the glide of cow and out — 'ah' rolling into 'oo', like saying 'ow' when something stings",
         reject="consonants left on it, a chopped glide, or robotic flatness",
         pure=[("ow", "He said ow again."), ("ow", "She said ow, then laughed.")],
         inside=[("cow", "The cow is out.")]),
    dict(name="th_quiet", ph="θ", kind="unvoiced", tpl_ph="θɪn",
         note="shaped puffs — short, soft, rounded edges. If this field fails too, you record it (the nine-sound precedent)",
         how="one soft short puff of air between the teeth — the start of thin. Under a quarter second, quiet, gentle",
         reject="anything that hisses like a snake, any static, any hum or vowel",
         pure=[], inside=[]),
]


items, failures = [], []
for card in CARDS:
    name, ph, kind = card["name"], card["ph"], card["kind"]
    if kind == "unvoiced":
        a, sr = say(card["tpl_ph"], 0.85, ph=True)
        tpl = G.unvoiced_run(G.core(a, sr), sr)
    else:
        a, sr = say(ph, 0.85, ph=True)
        tpl = G.core(a, sr)
    arms, seen = [], []

    def add(family, seg, seg_sr, peak_db=-3.0):
        if seg is None or len(seg) < 0.05 * seg_sr:
            failures.append((name, family, "nothing to offer"))
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind)
        if not ok:
            failures.append((name, family, why))
            return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        if any(pk == peak_db and
               float(np.dot(f, g) / (np.linalg.norm(f) * np.linalg.norm(g) + 1e-9)) > 0.997
               for g, pk in seen):
            return
        mp3, ms = encode(polish(cut, seg_sr, peak_db), seg_sr)
        dec, dsr = decode(mp3)
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind)
        if not ok:
            failures.append((name, family, f"after encode: {why}"))
            return
        seen.append((f, peak_db))
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": family, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})

    # a word that IS the sound, spoken mid-phrase in a natural sentence:
    # the located word, plus its warmth treatments
    for w, sentence in card["pure"]:
        for sp in (0.85, 0.95):
            car, csr = say(sentence, sp)
            word = locate_word(w, car, csr, f"{w}_sp{sp}", failures, name)
            if word is None:
                continue
            add(f"{w}_sp{sp}", word, csr)
            for tag, kw in (("warm", dict(f0r=0.97, fmt=1.03)),
                            ("breath", dict(breath=1.25)),
                            ("low", dict(f0r=0.94))):
                try:
                    add(f"{w}_sp{sp}_{tag}", world_colour(word, csr, **kw), csr)
                except Exception as e:
                    failures.append((name, f"{w}_sp{sp}_{tag}", f"world: {e}"))

    # the sound inside a carrier word, located twice: word in sentence,
    # then sound in word
    for w, sentence in card["inside"]:
        car, csr = say(sentence, 0.85)
        word = locate_word(w, car, csr, f"in_{w}", failures, name)
        if word is None:
            continue
        st, en, score = wc.template_match(tpl, word, csr, scales=IN_WORD_SCALES)
        if st is None or score < 0.55:
            failures.append((name, f"in_{w}", f"sound not located ({score:.2f})"))
            continue
        st, en = wc.refine_edges(word, csr, st, en, pad_ms=10, max_walk_ms=25)
        seg = word[st:en]
        add(f"in_{w}", seg, csr)
        try:
            add(f"in_{w}_warm", world_colour(seg, csr, f0r=0.97, fmt=1.03), csr)
        except Exception as e:
            failures.append((name, f"in_{w}_warm", f"world: {e}"))

    # th: shaped puffs from the one clean donor and the context render
    if name == "th_quiet":
        srcs = []
        wa, wsr = decode((REPO / "app/public/voice/w-moth.mp3").read_bytes())
        r = G.unvoiced_run(G.core(wa, wsr), wsr)
        if r is not None:
            srcs.append(("moth", r, wsr))
        a2, psr = say(card["tpl_ph"], 0.85, ph=True)
        r2 = G.unvoiced_run(G.core(a2, psr), psr)
        if r2 is not None:
            srcs.append(("thin", r2, psr))
        for tag, seg, ssr in srcs:
            for ms, pk in ((110, -9.0), (90, -12.0), (140, -9.0)):
                add(f"puff_{tag}_{ms}ms", shape_puff(seg, ssr, ms=ms), ssr, peak_db=pk)
            add(f"puff_{tag}_lp6k", shape_puff(lowpass(seg, ssr, 6000), ssr, ms=120), ssr, peak_db=-9.0)

    items.append({"kind": "word", "text": name, "note": card.get("note", ""),
                  "how": card["how"], "reject": card["reject"], "arms": arms})
    print(f"{name}: {len(arms)} arms")

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()

print(f"\nrefused during build: {len(failures)}")
for n, fam, why in failures:
    print(f"  {n:9s} {fam:22s} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    raise SystemExit(f"round refused: too few verified arms for {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 4 — sounds cut from real words, warmth first",
    "tally": ("Sounds: 38 of 45 done — these 7 are what's left. "
              "Words: 349 shipped + 59 approved and waiting; the 19 rebuilt blends are in batch 9. "
              "Sentences: 21 shipped + 2 approved."),
    "items": items}))
print("wrote", OUT / "batch-data.json")

# independent self-verification on the built file
data = json.loads((OUT / "batch-data.json").read_text())
bad = []
for item in data["items"]:
    card = next(c for c in CARDS if c["name"] == item["text"])
    if card["kind"] == "unvoiced":
        a, tsr = say(card["tpl_ph"], 0.85, ph=True)
        tpl = G.unvoiced_run(G.core(a, tsr), tsr)
    else:
        a, tsr = say(card["ph"], 0.85, ph=True)
        tpl = G.core(a, tsr)
    for arm in item["arms"]:
        raw = base64.b64decode(arm["b64"])
        aud, asr = decode(raw)
        if float(np.abs(aud).max()) < 0.05:
            bad.append((arm["id"], "inaudible")); continue
        if arm["ms"] < 250:
            bad.append((arm["id"], "too short to judge")); continue
        ok, why, _ = G.verify_sound(G.core(aud, asr), tpl, asr, card["kind"])
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
