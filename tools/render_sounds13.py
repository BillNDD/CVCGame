# Sound round 13: the fourteen, with the bake's own recipes as option 1.
#
# The owner supplied P45-OK-SHIP-HANDOFF, the bake behind 22 approved sounds,
# and asked whether it holds recipes for any of the fourteen still standing on
# their voice. It holds AUDIO for none of them - its 22 are all sounds this
# project already has. It holds something better: the METHOD behind every one,
# and the method is nothing this project has been doing.
#
# WHAT EVERY BAKED WINNER HAS IN COMMON. Not one is a bare render or a cut from
# a word clip. Each is a PHONEME CARRIER SENTENCE, rendered at speed 1.0 with
# is_phonemes true, with the target sound placed last and lifted out by
# `energy_island_last`. The families, verbatim from the recipes:
#
#   citation            "hˈɪɹ ɪz ðə sˈaʊnd: ˈɔ."      (Here is the sound: aw.)
#   spelling            "spˈɛl ɪt: sˈiː ˈeɪtʃ ɐ tˈiː. tʃˈæt. ðə sˈaʊnd ɪz ʧ."
#   contrastive         "vvv? nˈoʊ. fff."
#   minimal_pair_middle "bin, pin, tin."
#   continuation        "ðə sˈaʊnd ɪz : ˈɪ. ænd ðˈɛn wiː kəntˈɪnjuː."
#   seed_long_internal  a whole sentence about the sound, ending "hˈɪɹ ɪɾ ˈɪz sss."
#
# THE TRIPLING IS THE UNLOCK. `fff`, `sss`, `ɹɹɹ` — this repository had recorded
# that kokoro cannot render a lone consonant phoneme (docs/settled.md, after
# round 4 produced a voiced "thuh" for θ). The bake shows the way around it:
# ask for the consonant THREE TIMES and it renders as a real sustained
# frication or hum, which can then be cut. That single trick reopens every
# continuant here — n, v, w, y, z, sh, h, ng.
#
# AND THE STOPS HAVE THEIR OWN ANSWER. A stop cannot be tripled, and the bake
# did not try: `p` was taken from `minimal_pair_middle`, "bin, pin, tin.",
# cutting the MIDDLE word. So b, d, g and j are offered that way here — b from
# "pin, bin, tin", d from "ten, den, hen", g from "cap, gap, tap".
#
# Option 1 for every sound is the bake's own citation family, exactly as its
# recipes specify: speed 1.0, phonemes, energy_island_last, 12 ms fade, -3 dB.
# Round 12's word-clip cuts follow as later options, so the owner can hear the
# bake's method against this project's own.
#
# Usage: python render_sounds13.py <out_dir>
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
PACK = REPO / "app" / "public" / "voice"
# The bake's own polish, from every recipe's `polish` and `listen_pad_ms`.
FADE_MS, GAIN_DB, PAD_HEAD_MS, PAD_TAIL_MS = 12, -3.0, 150, 400

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")


def say(text, ph=True, speed=1.0):
    a, sr = k.create(text, voice="af_heart", speed=speed, lang="en-us", is_phonemes=ph)
    return np.asarray(a, np.float32), sr


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


def polish(a, sr):
    """The bake's polish, verbatim: a 12 ms fade and a -3 dB peak, then the
    listening pad it used to present a candidate."""
    a = np.asarray(a, np.float32).copy()
    n = int(sr * FADE_MS / 1000)
    if len(a) > 2 * n + 8:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a *= (10 ** (GAIN_DB / 20)) / peak
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


def islands(a, sr, floor_db=-34, min_ms=45, merge_ms=60):
    """Energy islands, which is what `energy_island_last` and `island_index`
    in the bake's recipes refer to."""
    _, _, db, n = wc.speech_span(a, sr)
    hop = 1000 * n / sr
    loud = db > floor_db
    runs, st = [], None
    for i, v in enumerate(loud):
        if v and st is None:
            st = i
        elif not v and st is not None:
            runs.append([st, i]); st = None
    if st is not None:
        runs.append([st, len(loud)])
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * hop < merge_ms:
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    return [(int(s * n), int(e * n)) for s, e in merged if (e - s) * hop >= min_ms]


# sound: ipa, kind, tripled form (continuants only), spelling carrier bits,
# contrastive pair, minimal-pair trio, and round-12's source words.
S = [
    ("b",  "b",  "voiced",   None,  ("bˈiː ˈjuː ˈɛs", "bˈʌs"), ("pˈɪn", "bˈɪn"), "pin, bin, tin.",  ["bus", "bib", "bat"]),
    ("d",  "d",  "voiced",   None,  ("dˈiː ˈeɪ dˈiː", "dˈæd"), ("tˈɛn", "dˈɛn"), "ten, den, hen.",  ["dad", "did", "dog"]),
    ("g",  "ɡ",  "voiced",   None,  ("dʒˈiː ˈeɪ pˈiː", "ɡˈæp"), ("kˈæp", "ɡˈæp"), "cap, gap, tap.", ["gap", "gum", "got"]),
    ("j",  "dʒ", "voiced",   None,  ("dʒˈeɪ ˈeɪ ˈɛm", "dʒˈæm"), ("tʃˈæt", "dʒˈæm"), "chat, jam, ham.", ["jam", "jet", "job"]),
    ("n",  "n",  "voiced",   "nnn", ("ˈɛn ˈiː tˈiː", "nˈɛt"), ("mmm", "nnn"), "map, nap, tap.",   ["net", "nap", "nut"]),
    ("v",  "v",  "voiced",   "vvv", ("vˈiː ˈeɪ ˈɛn", "vˈæn"), ("fff", "vvv"), "fan, van, tan.",   ["van", "vet", "vex"]),
    ("w",  "w",  "voiced",   "wwwˈʌ", ("dˈʌbəljˌuː ˈiː bˈiː", "wˈɛb"), ("jˈɛs", "wˈɛb"), "wet, get, net.", ["web", "win", "wag"]),
    ("y",  "j",  "voiced",   "jjjˈɛ", ("wˈaɪ ˈiː ˈɛs", "jˈɛs"), ("wˈɛt", "jˈɛs"), "yes, mess, less.", ["yes", "yak", "yam"]),
    ("z",  "z",  "voiced",   "zzz", ("zˈiː ˈaɪ pˈiː", "zˈɪp"), ("sss", "zzz"), "sip, zip, tip.",   ["zip", "zap", "zig"]),
    ("sh", "ʃ",  "unvoiced", "ʃʃʃ", ("ˈɛs ˈeɪtʃ ˈaɪ pˈiː", "ʃˈɪp"), ("sss", "ʃʃʃ"), "sip, ship, tip.", ["ship", "shop", "shut"]),
    ("h",  "h",  "unvoiced", "hhh", ("ˈeɪtʃ ˈeɪ tˈiː", "hˈæt"), ("ˈæt", "hˈæt"), "at, hat, mat.",  ["hat", "hum", "hen"]),
    ("ng", "ŋ",  "voiced",   "ŋŋŋ", ("ˈɑːɹ ˈaɪ ˈɛn dʒˈiː", "ɹˈɪŋ"), ("nnn", "ŋŋŋ"), "rig, ring, rip.", ["ring", "sing", "king"]),
    ("e",  "ɛ",  "voiced",   None,  ("bˈiː ˈiː dˈiː", "bˈɛd"), ("ˈæ", "ˈɛ"), "bad, bed, bid.",     ["hen", "bed", "pen"]),
    ("u",  "ʌ",  "voiced",   None,  ("bˈiː ˈjuː ˈɛs", "bˈʌs"), ("ˈɑ", "ˈʌ"), "bass, bus, boss.",   ["bus", "cup", "sun"]),
]
HOW = {
    "b": "a quick b-push, as in bus", "d": "a quick d-tap, as in dad",
    "g": "a quick g-catch, as in gap", "j": "a soft j-push, as in jam",
    "n": "a humming n, as in net", "v": "a buzzing v, as in van",
    "w": "a rounded w, as in web", "y": "a y-glide, as in yes",
    "z": "a buzzing z, as in zip", "sh": "a quiet shush, as in ship",
    "h": "a soft breath, as in hat", "ng": "a humming ng, as in ring",
    "e": "the short e of hen, bed", "u": "the short u of bus, cup",
}
REJ = {n: (f"a full '{n}uh' with a long uh after it, the letter name, "
           "or any other sound around it") for n, *_ in S}

ROUNDS = pathlib.Path(SCRATCH) / "rounds"
ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    if d.resolve() == OUT.resolve():
        continue
    f = d / "batch-data.json"
    if f.exists():
        try:
            for it in json.loads(f.read_text(encoding="utf-8")).get("items", []):
                for a in it.get("arms", []):
                    ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
        except Exception:
            pass
print(f"hash guard: {len(ALREADY)} arms already offered\n")

items, failures = [], []
for name, ipa, kind, tripled, (letters, word_ph), (foil, targ), trio, words in S:
    tp, sr0 = say(ipa)
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m0 = int(len(tp) * 0.2)
    tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

    cands, seen = [], []

    def add(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.04 * seg_sr):
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        form = "in_word" if family.startswith("wordcut") else "citation"
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind, form=form)
        if not ok:
            failures.append((name, family, why)); return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        f = f / (np.linalg.norm(f) + 1e-9)
        ms = len(cut) / seg_sr * 1000
        cls = family.split("/")[0]
        if any(c == cls and float(np.dot(f, g)) > 0.995
               and abs(ms - m2) / max(ms, m2) < 0.12 for g, m2, c in seen):
            failures.append((name, family, "duplicate")); return
        seen.append((f, ms, cls))
        cands.append((family, cut, seg_sr, d))

    def from_carrier(family, text, pick="last", ph=True):
        """Render a carrier and lift one energy island out of it, which is what
        every baked recipe does."""
        try:
            car, csr = say(text, ph=ph)
        except Exception as e:
            failures.append((name, family, f"render: {e}")); return
        isl = islands(car, csr)
        if not isl:
            failures.append((name, family, "no island")); return
        if pick == "last":
            picks = [(len(isl) - 1, "")]
        elif pick == "middle":
            picks = [(len(isl) // 2, "")]
        else:
            picks = [(i, f"@{i}") for i in range(len(isl))]
        for idx, tag in picks:
            s, e = isl[idx]
            add(f"{family}{tag}", car[s:e], csr)
            # a touch of extra tail, because a stop's release can fall just
            # past the island edge
            add(f"{family}{tag}/pad", car[s:min(len(car), e + int(csr * 0.03))], csr)

    # 1 — THE BAKE'S CITATION FAMILY, its exact carrier and parameters
    body = tripled or ipa
    from_carrier("bake-citation", f"hˈɪɹ ɪz ðə sˈaʊnd: ˈ{body}.")
    from_carrier("bake-continuation", f"ðə sˈaʊnd ɪz : ˈ{body}. ænd ðˈɛn wiː kəntˈɪnjuː.", pick="any")
    # 2 — the spelling family, for a sound the letters name
    from_carrier("bake-spelling", f"spˈɛl ɪt: {letters}. {word_ph}. ðə sˈaʊnd ɪz {body}.")
    # 3 — the contrastive family, against its most confusable neighbour
    from_carrier("bake-contrastive", f"{foil}? nˈoʊ. {targ}.")
    # 4 — the minimal pair, which is how the bake got its stop
    from_carrier("bake-minimalpair", trio, pick="middle", ph=False)
    # 5 — the instructional family, in PLAIN English: long_e was baked from
    #     "The letter sound E." rather than from any phoneme string.
    for text in (f"The letter sound {name.upper()}.", f"The sound is {name}.",
                 f"Listen. The sound is {name}."):
        from_carrier("bake-instructional", text, ph=False)
    # 6 — for an unvoiced sound, pull the frication run out of the carrier.
    #     soundgate.unvoiced_run exists for exactly this and had never been
    #     pointed at a citation carrier.
    if kind == "unvoiced" and tripled:
        for text in (f"hˈɪɹ ɪz ðə sˈaʊnd: ˈ{tripled}.", f"{tripled}."):
            try:
                car, csr = say(text)
            except Exception as e:
                failures.append((name, "bake-frication", f"render: {e}")); continue
            run = G.unvoiced_run(car, csr)
            add("bake-frication", run, csr)
            if run is not None and len(run) > int(csr * 0.16):
                add("bake-frication", run[:int(csr * 0.16)], csr)

    # 5 — round 12's word-clip cuts, so the two methods are heard side by side
    # 7 — round 12's word-clip cuts, so the two methods are heard side by side
    for w in words:
        p = PACK / f"w-{w}.mp3"
        if not p.exists():
            continue
        pack, psr = decode_file(p)
        s0, s1, _, _ = wc.speech_span(pack, psr)
        span = pack[s0:s1]
        for hold in (90, 120, 150, 180, 220):
            add(f"wordcut-{w}", span[:int(psr * hold / 1000)], psr)
        # For an unvoiced sound the onset bleeds into the vowel and the voicing
        # checks refuse it; unvoiced_run lifts the frication out cleanly. This
        # is what "h" needed - its onset is a breath, not a burst.
        if kind == "unvoiced":
            run = G.unvoiced_run(span[:int(psr * 0.30)], psr)
            add(f"wordcut-{w}", run, psr)

    by_family = {}
    for c in sorted(cands, key=lambda r: r[3]):
        by_family.setdefault(c[0].split("/")[0].split("@")[0], []).append(c)
    # option 1 is always the bake's citation family, as the owner asked
    order = ([f for f in sorted(by_family) if f == "bake-citation"]
             + [f for f in sorted(by_family) if f != "bake-citation"])
    ordered, depth = [], 0
    while any(len(by_family[f]) > depth for f in order):
        for f in order:
            if len(by_family[f]) > depth:
                ordered.append(by_family[f][depth])
        depth += 1

    arms = []
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(polish(cut, csr), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in ALREADY:
            failures.append((name, fam, "already offered")); continue
        tmp = OUT / "_tmp.mp3"; tmp.write_bytes(mp3)
        dec, dsr = decode_file(tmp)
        form = "in_word" if fam.startswith("wordcut") else "citation"
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind=kind, form=form)
        if not ok:
            failures.append((name, fam, f"after encode: {why}")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    fams = sorted({a["family"].split("/")[0].split("@")[0] for a in arms})
    print(f"{name:4} {len(arms):2} arms from {len(cands):3} gated   {fams}")
    items.append({"kind": "word", "text": name,
                  "note": ("option 1 is the BAKE's own citation recipe — \"Here is the "
                           "sound: X.\" in phonemes, cut at the last energy island, its "
                           "exact settings. Then the bake's other families (spelling, "
                           "contrastive, minimal pair), then round 12's cuts from your "
                           "approved word clips, so you hear both methods."),
                  "how": HOW[name], "reject": REJ[name], "arms": arms})

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
print(f"\nrefused: {len(failures)}")
thin = [i["text"] for i in items if len(i["arms"]) < 4]
if thin:
    print(f"THIN: {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 13 — the last fourteen, with the bake's own recipes as option 1",
    "tally": ("Sounds: the bank needs 29; 15 are approved and synthesised; these 14 are the "
              "ones still standing on your recordings. Words: 349 shipped + 115 approved. "
              "Sentences: 42 approved."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
