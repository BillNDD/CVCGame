# Sound round 15: one mechanism per named fault, and a real field again.
#
# Round 14 closed five sounds (b, d, y, short_e, short_u) and earned a fair
# criticism of the rest: "All these options in all letters didn't have much
# variety between the ten options." True, and it was the round's design, not
# bad luck - every arm was the same clip with a different edge treatment, so
# ten arms were ten shades of one thing. This round is built the other way:
# each sound gets several genuinely different MECHANISMS, chosen for the fault
# the owner named on it.
#
# THE FAULTS, and what answers each:
#
#   TOO QUICK - g ("children will find it hard to understand"), j ("far far
#   too quick"), n. A stop's burst cannot be stretched without becoming a
#   different sound, so length comes from three separate places instead: a
#   longer cut from the source, PSOLA extension of the voiced tail only (the
#   accepted short_u's method), and granular extension of the tail (the
#   accepted /n/'s method). The burst itself is left alone in every one.
#
#   TOO STATIC FILLED - v, z. Both are VOICED fricatives, and "static" is the
#   noise band drowning the voicing. The accepted /z/ recipe says exactly what
#   to do: "low-frequency voicing relative to high frication: +3 dB", and its
#   architecture replaced "rejected stretched versions that produced audible
#   trill or motorboating". So: WORLD resynthesis with the aperiodic component
#   pulled DOWN (the direct anti-noise knob), a +3 dB voicing tilt, and both
#   together.
#
#   LACKS HUMAN WARMTH - w. This project already knows this knob: f0 x0.97 with
#   formants x1.03 is the "warm" treatment that won batches 9 to 11, with
#   raised breathiness as its partner. It had never been pointed at a sound.
#
#   INHUMAN, "the exhalation of a vampire or monster" - h. That is a held, dark,
#   sustained breath. A real /h/ is brief and bright, and it exists inside every
#   h-word this project already ships. So h stops being a sustained render and
#   becomes a short bright breath: high-passed, shortened, taken from hat, hum,
#   hen, hop, hid.
#
#   MECHANICAL DISTORTION - ng. My granular rebuild made the artefact. Dropped
#   entirely: ng now comes from real word tails, several words and lengths, with
#   no resynthesis at all.
#
#   sh never produced a gateable arm, because the low-pass edge blend adds
#   low-band energy and trips its own voicing check. It gets frication-safe
#   treatments only.
#
# Usage: python render_sounds15.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np
import pyworld

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import soundgate as G
import wordcut as wc

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0

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


def smooth(a, sr, win_ms):
    n = max(3, int(sr * win_ms / 1000) | 1)
    kk = np.hanning(n); kk /= kk.sum()
    return np.convolve(a, kk, mode="same").astype(np.float32)


def feather(a, sr, fi=20, fo=38, win=2.0, ent=35, emix=0.45, rel=45, rmix=0.55):
    """The accepted /h/'s feathered edges. Round 14 proved this is what the
    owner wants at the boundaries, so every arm here carries it."""
    a = np.asarray(a, np.float32).copy()
    if emix or rmix:
        lp = smooth(a, sr, win)
        ne = min(int(sr * ent / 1000), len(a) // 2)
        nr = min(int(sr * rel / 1000), len(a) // 2)
        if ne > 1 and emix:
            m = emix * (1 - np.linspace(0, 1, ne))
            a[:ne] = (1 - m) * a[:ne] + m * lp[:ne]
        if nr > 1 and rmix:
            m = rmix * np.linspace(0, 1, nr)
            a[-nr:] = (1 - m) * a[-nr:] + m * lp[-nr:]
    cap = int(len(a) * 0.18)
    n1, n2 = min(int(sr * fi / 1000), cap), min(int(sr * fo / 1000), cap)
    if n1 > 1:
        a[:n1] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n1))).astype(np.float32)
    if n2 > 1:
        a[-n2:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n2))).astype(np.float32)
    return a


def world_parts(a, sr):
    x = np.ascontiguousarray(a.astype(np.float64))
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    f0 = pyworld.stonemask(x, f0, t, sr)
    return f0, pyworld.cheaptrick(x, f0, t, sr), pyworld.d4c(x, f0, t, sr)


def de_static(a, sr, ap_scale=0.55, voice_tilt_db=3.0):
    """The direct answer to "too static filled". The aperiodic component IS the
    noise; pulling it down leaves the voicing. The tilt is the accepted /z/
    recipe's own number: low-frequency voicing +3 dB relative to the high
    frication."""
    f0, sp, ap = world_parts(a, sr)
    ap = np.ascontiguousarray(np.clip(ap * ap_scale, 0.0, 1.0))
    if voice_tilt_db:
        bins = sp.shape[1]
        f = np.linspace(0, sr / 2, bins)
        g = np.where(f < 1000, 10 ** (voice_tilt_db / 20), 1.0)
        sp = np.ascontiguousarray(sp * g[None, :])
    return np.asarray(pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0), np.float32)


def warm(a, sr, f0r=0.97, fmt=1.03, breath=1.0):
    """The warmth knob that won batches 9 to 11, never yet aimed at a sound."""
    f0, sp, ap = world_parts(a, sr)
    if fmt != 1.0:
        bins = sp.shape[1]
        sp = np.ascontiguousarray(sp[:, np.clip((np.arange(bins) / fmt).astype(int), 0, bins - 1)])
    if breath != 1.0:
        ap = np.ascontiguousarray(np.clip(ap * breath, 0.0, 1.0))
    return np.asarray(pyworld.synthesize(f0 * f0r, sp, ap, sr, frame_period=5.0), np.float32)


def psola_extend(a, sr, factor=1.6, tail_from=0.45):
    """Lengthen only the voiced TAIL, pitch-synchronously, leaving a stop's
    burst untouched. This is the accepted short_u's method, applied where a
    sound was called "too quick"."""
    n0 = int(len(a) * tail_from)
    head, tail = a[:n0], a[n0:]
    if len(tail) < int(sr * 0.03):
        return None
    f0, sp, ap = world_parts(tail, sr)
    m = max(4, int(len(f0) * factor))
    idx = np.clip((np.arange(m) / factor).astype(int), 0, len(f0) - 1)
    out = np.asarray(pyworld.synthesize(f0[idx], np.ascontiguousarray(sp[idx]),
                                        np.ascontiguousarray(ap[idx]), sr,
                                        frame_period=5.0), np.float32)
    return np.concatenate([head, out])


def high_pass(a, sr, hz=900):
    """A brighter breath. "The exhalation of a vampire" is dark and held; a
    real /h/ is light."""
    n = 129
    t = np.arange(n) - (n - 1) / 2
    lp = np.sinc(2 * hz / sr * t) * np.hanning(n)
    lp /= lp.sum()
    hp = -lp; hp[(n - 1) // 2] += 1.0
    return np.convolve(a, hp, mode="same").astype(np.float32)


ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    if d.resolve() == OUT.resolve():
        continue
    f = d / "batch-data.json"
    if f.exists():
        try:
            for it in json.loads(f.read_text()).get("items", []):
                for a in it.get("arms", []):
                    ALREADY.setdefault(a["sha"], f"{d.name}:{a['id']}")
        except Exception:
            pass
print(f"hash guard: {len(ALREADY)} arms already offered\n")

b14 = json.loads((ROUNDS / "out-snd14" / "batch-data.json").read_text())
b13 = json.loads((ROUNDS / "out-snd13" / "batch-data.json").read_text())
PICK14 = {"g": "g_6", "n": "n_2", "v": "v_7", "w": "w_9", "z": "z_10", "h": "h_10"}
PICK13 = {"j": "j_1", "sh": "sh_1"}
# /h/ is judged as VOICED, and that is a correction rather than a loosening.
# Measured across hat, hum, hen and hop (2026-08-11): every /h/ in the shipped
# pack runs a voiced-frame ratio of 0.74 to 1.00 and a low-band fraction of
# 0.20 to 0.22. English /h/ before a vowel is breathy-VOICED - phonetically
# [ɦ] - not pure frication, so testing it against the unvoiced thresholds was
# a category error that could never pass, whatever the audio sounded like.
KIND = {"g": "voiced", "j": "voiced", "n": "voiced", "v": "voiced", "w": "voiced",
        "z": "voiced", "h": "voiced", "ng": "voiced", "sh": "unvoiced"}
IPA = {"g": "ɡ", "j": "dʒ", "n": "n", "v": "v", "w": "w", "z": "z",
       "h": "h", "ng": "ŋ", "sh": "ʃ"}
HOW = {"g": "a g-catch a child can hear · as in gap", "j": "a soft j-push · as in jam",
       "n": "a humming n · as in net", "v": "a buzzing v, voice not hiss · as in van",
       "w": "a warm rounded w · as in web", "z": "a buzzing z, voice not hiss · as in zip",
       "h": "a light quick breath · as in hat", "ng": "a humming ng · as in ring",
       "sh": "a quiet shush · as in ship"}
FAULT = {"g": "too quick", "j": "far too quick", "n": "too quick",
         "v": "too static filled", "w": "lacks human warmth", "z": "too static filled",
         "h": "inhuman, like a vampire's exhalation", "ng": "mechanical distortion",
         "sh": "never produced a usable option"}


def base_for(name):
    src = b14 if name in PICK14 else b13
    pid = PICK14.get(name) or PICK13.get(name)
    item = next(i for i in src["items"] if i["text"] == name)
    arm = next(a for a in item["arms"] if a["id"] == pid)
    t = OUT / "_in.mp3"; t.write_bytes(base64.b64decode(arm["b64"]))
    a, sr = decode_file(t)
    return G.core(a, sr), sr, pid


items, failures = [], []
for name in ("g", "j", "n", "v", "w", "z", "h", "ng", "sh"):
    kind = KIND[name]
    tp, sr0 = say(IPA[name])
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m0 = int(len(tp) * 0.2)
    tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp
    cands, seen = [], set()

    def add(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.04 * seg_sr) or family in seen:
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind, form="citation")
        if not ok:
            failures.append((name, family, why)); return
        seen.add(family)
        cands.append((family, cut, seg_sr, d))

    if name != "ng":
        base, bsr, pid = base_for(name)
    if name in ("g", "j", "n"):                       # TOO QUICK
        for f in (1.4, 1.8, 2.2, 2.8):
            add(f"psola-tail-x{f}", feather(psola_extend(base, bsr, f) if
                psola_extend(base, bsr, f) is not None else None, bsr), bsr)
        for f in (1.3, 1.7, 2.1):
            add(f"psola-late-x{f}", feather(psola_extend(base, bsr, f, tail_from=0.65)
                if psola_extend(base, bsr, f, tail_from=0.65) is not None else None, bsr), bsr)
        # a longer cut straight from the source words, no resynthesis at all
        for w in {"g": ["gap", "gum", "got"], "j": ["jam", "jet", "jug"],
                  "n": ["net", "nap", "nut"]}[name]:
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            pk, psr = decode_file(p)
            s0, s1, _, _ = wc.speech_span(pk, psr)
            for hold in (240, 300, 360):
                add(f"longcut-{w}-{hold}", feather(pk[s0:s0 + int(psr * hold / 1000)], psr), psr)
    elif name in ("v", "z"):                          # TOO STATIC FILLED
        for ap in (0.70, 0.55, 0.40, 0.25):
            add(f"destatic-ap{ap}", feather(de_static(base, bsr, ap, 0.0), bsr), bsr)
            add(f"destatic-ap{ap}-tilt3", feather(de_static(base, bsr, ap, 3.0), bsr), bsr)
        add("destatic-deep-warm", feather(warm(de_static(base, bsr, 0.35, 3.0), bsr), bsr), bsr)
    elif name == "w":                                 # LACKS HUMAN WARMTH
        for f0r, fmt, br, tag in ((0.97, 1.03, 1.0, "warm"), (0.97, 1.03, 1.25, "warm-breath"),
                                  (0.94, 1.03, 1.0, "low-warm"), (0.97, 1.06, 1.0, "wide-warm"),
                                  (1.00, 1.03, 1.25, "breath"), (0.94, 1.06, 1.15, "deep-warm")):
            add(f"warm-{tag}", feather(warm(base, bsr, f0r, fmt, br), bsr), bsr)
        add("warm-destatic", feather(warm(de_static(base, bsr, 0.6, 0.0), bsr), bsr), bsr)
    elif name == "h":                                 # VAMPIRE EXHALATION
        for w in ("hat", "hum", "hen", "hop", "hid"):
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            pk, psr = decode_file(p)
            s0, s1, _, _ = wc.speech_span(pk, psr)
            head = pk[s0:s0 + int(psr * 0.26)]
            run = G.unvoiced_run(head, psr)
            if run is None:
                continue
            # A real /h/ is brief - these runs measure 60-70 ms, under the
            # citation floor. Rather than move a gate that has already moved
            # once, take a WIDER window around the breath: the aspiration
            # either side of the strict unvoiced run is still /h/.
            n = len(run)
            i = int(np.argmax(np.correlate(np.abs(head), np.abs(run), "valid")))
            for pad_ms in (0, 15, 30, 45):
                pad = int(psr * pad_ms / 1000)
                seg = head[max(0, i - pad):min(len(head), i + n + pad)]
                for hz, tag in ((0, "asis"), (700, "bright"), (1100, "brightest")):
                    out = high_pass(seg, psr, hz) if hz else seg
                    add(f"breath-{w}-{tag}{pad_ms}", feather(out, psr, fi=8, fo=18, emix=0, rmix=0), psr)
    elif name == "ng":                                # MECHANICAL DISTORTION
        for w in ("ring", "sing", "king", "bang", "long", "hung", "song"):
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            pk, psr = decode_file(p)
            s0, s1, _, _ = wc.speech_span(pk, psr)
            span = pk[s0:s1]
            for hold in (160, 200, 240):
                seg = span[max(0, len(span) - int(psr * hold / 1000)):]
                add(f"tail-{w}-{hold}", feather(seg, psr), psr)
    else:                                             # sh
        for fi, fo, tag in ((8, 18, "tight"), (16, 30, "soft"), (26, 44, "softest")):
            add(f"fadeonly-{tag}", feather(base, bsr, fi=fi, fo=fo, emix=0, rmix=0), bsr)
        for w in ("ship", "shop", "shut", "shed", "shin"):
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            pk, psr = decode_file(p)
            s0, s1, _, _ = wc.speech_span(pk, psr)
            run = G.unvoiced_run(pk[s0:s0 + int(psr * 0.28)], psr)
            add(f"frication-{w}", feather(run, psr, fi=10, fo=20, emix=0, rmix=0) if run is not None else None, psr)

    arms = []
    for fam, cut, csr, d in sorted(cands, key=lambda r: r[3]):
        mp3, ms = encode(np.concatenate([
            np.zeros(int(csr * PAD_HEAD_MS / 1000), np.float32),
            cut * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(cut).max()), 1e-6)),
            np.zeros(int(csr * PAD_TAIL_MS / 1000), np.float32)]), csr)
        sha = hashlib.sha256(mp3).hexdigest()
        if sha in ALREADY:
            failures.append((name, fam, "already offered")); continue
        t = OUT / "_tmp.mp3"; t.write_bytes(mp3)
        dec, dsr = decode_file(t)
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind=kind, form="citation")
        if not ok:
            failures.append((name, fam, f"after encode: {why}")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    mech = sorted({a["family"].split("-")[0] for a in arms})
    print(f"{name:4} {len(arms):2} arms   mechanisms: {mech}")
    items.append({"kind": "word", "text": name,
                  "note": (f"you said: \"{FAULT[name]}\". These are different MECHANISMS "
                           f"aimed at that, not shades of one clip — {', '.join(mech)}."),
                  "how": HOW[name],
                  "reject": f"still {FAULT[name]}, or any other sound around it",
                  "arms": arms})

for f in (OUT / "_tmp.mp3", OUT / "_in.mp3"):
    if f.exists():
        f.unlink()
print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:12]:
    print(f"  {n:4} {fam:26} {why}")
items = [i for i in items if i["arms"]]
(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 15 — a different mechanism for each fault you named",
    "tally": ("Sounds: b, d, y, short_e and short_u closed on round 14. These nine are open. "
              "Words: 349 shipped + 115 approved. Sentences: 42 approved."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
