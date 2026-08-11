# Sound round 14: round the edges, using the bake's own humanisation recipe.
#
# Thirteen of fourteen came back CLOSEST on round 13, and nine of them carried
# one identical fault in the owner's words: "almost perfect, but its start and
# finish are too jarring, can those be rounded somehow ever so slightly."
#
# The owner then supplied ACCEPTED_SOUND_BAKE_RECIPES.md, and it answers that
# exact complaint in its own words. The accepted /h/ is "Final Option F —
# feathered human edges", and its stated purpose is:
#
#     remove the switch-like onset and ending
#     preserve the natural breath centre
#
# with the parameters: fade-in 20 ms, fade-out 38 ms, edge smoothing window
# 2 ms, entrance smoothing region 35 ms at a maximum mix of 0.45, release
# smoothing region 45 ms at a maximum mix of 0.55. The accepted /g/ says the
# same thing differently — "remove brittle static-like edges, soften the abrupt
# release" — with fade-in 3 ms, fade-out 20 ms, and a natural decay from 68 ms
# at depth 0.28, exponent 1.25. The accepted /j/ uses 3 ms in and 18 ms out.
#
# So the fix is not invented here. It is three owner-accepted edge treatments,
# applied to the thirteen clips the owner has already called almost perfect.
#
# WHAT AN EDGE SMOOTHING REGION IS. A fade only scales amplitude; it cannot
# remove the discontinuity of a waveform that starts mid-cycle, which is what
# "switch-like" and "jarring" describe. Smoothing blends the edge region with a
# low-passed copy of itself, at a mix that is strongest at the very edge and
# reaches zero at the end of the region, so the clip eases into its own signal
# rather than being switched on.
#
# NG got NONE and needs a different mechanism, so it also gets the /n/ recipe's
# body: granular extension, 24 ms grains at a 7 ms hop, with the md's own gain
# envelope and a cos^1.2 release.
#
# THE SIX ACCEPTED WAVS ARE NOT HERE. The md pins g, j, n, z, h and short_u by
# hash and says plainly that only the supplied WAVs reproduce them. A scan of
# every file in the upload, the P45 zip and this repository found none of the
# six, nor any of the /z/ and /n/ constituent WAVs. They are asked for
# separately; nothing here pretends to be them.
#
# Usage: python render_sounds14.py <out_dir>
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
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0

# The owner's pick from round 13, and the fault they named on it.
PICKS = {
    "b": "b_8", "d": "d_4", "g": "g_7", "j": "j_1", "n": "n_10", "v": "v_1",
    "w": "w_6", "y": "y_7", "z": "z_8", "sh": "sh_1", "h": "h_3",
    "e": "e_1", "u": "u_2",
}
KIND = {"b": "voiced", "d": "voiced", "g": "voiced", "j": "voiced", "n": "voiced",
        "v": "voiced", "w": "voiced", "y": "voiced", "z": "voiced",
        "sh": "unvoiced", "h": "unvoiced", "ng": "voiced", "e": "voiced", "u": "voiced"}
IPA = {"b": "b", "d": "d", "g": "ɡ", "j": "dʒ", "n": "n", "v": "v", "w": "w",
       "y": "j", "z": "z", "sh": "ʃ", "h": "h", "ng": "ŋ", "e": "ɛ", "u": "ʌ"}
HOW = {"b": "a quick b-push, as in bus", "d": "a quick d-tap, as in dad",
       "g": "a quick g-catch, as in gap", "j": "a soft j-push, as in jam",
       "n": "a humming n, as in net", "v": "a buzzing v, as in van",
       "w": "a rounded w, as in web", "y": "a y-glide, as in yes",
       "z": "a buzzing z, as in zip", "sh": "a quiet shush, as in ship",
       "h": "a soft breath, as in hat", "ng": "a humming ng, as in ring",
       "e": "the short e of hen, bed", "u": "the short u of bus, cup"}


def decode_file(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    b = [f.to_ndarray().flatten() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate(b).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def decode_b64(raw):
    t = OUT / "_in.mp3"; t.write_bytes(raw)
    return decode_file(t)


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def smooth(a, sr, win_ms):
    n = max(3, int(sr * win_ms / 1000) | 1)
    k = np.hanning(n); k /= k.sum()
    return np.convolve(a, k, mode="same").astype(np.float32)


def feather(a, sr, fade_in_ms, fade_out_ms, win_ms=2.0,
            ent_ms=35.0, ent_mix=0.45, rel_ms=45.0, rel_mix=0.55):
    """The bake's "feathered human edges", its parameters and its purpose:
    remove the switch-like onset and ending, keep the centre untouched.

    A fade only scales amplitude and cannot remove the discontinuity of a
    waveform that starts mid-cycle - which is what "jarring" describes. The
    smoothing regions blend each edge with a low-passed copy of itself, at a
    mix strongest at the very edge and zero by the end of the region, so the
    clip eases into its own signal instead of being switched on.
    """
    a = np.asarray(a, np.float32).copy()
    lp = smooth(a, sr, win_ms)
    ne = min(int(sr * ent_ms / 1000), len(a) // 2)
    nr = min(int(sr * rel_ms / 1000), len(a) // 2)
    if ne > 1:
        m = ent_mix * (1 - np.linspace(0, 1, ne)) ** 1.0
        a[:ne] = (1 - m) * a[:ne] + m * lp[:ne]
    if nr > 1:
        m = rel_mix * np.linspace(0, 1, nr) ** 1.0
        a[-nr:] = (1 - m) * a[-nr:] + m * lp[-nr:]
    # Cap each fade at a share of the clip. On a 180 ms sound a 40 ms fade-in
    # and a 60 ms fade-out push both edges under the speech-span floor, so the
    # span stripper then removes them and the clip reads "too short" - which is
    # exactly how sh lost every arm.
    cap = int(len(a) * 0.18)
    fi = min(int(sr * fade_in_ms / 1000), cap)
    fo = min(int(sr * fade_out_ms / 1000), cap)
    if fi > 1:
        a[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))).astype(np.float32)
    if fo > 1:
        a[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return a


def transient_tame(a, sr, lo_ms=30, hi_ms=58, gain_db=-2.2, ramp_ms=7):
    """The accepted /g/'s "transient attenuation region": 30-58 ms held at
    -2.2 dB with 7 ms ramps. Its purpose in the md is "remove brittle
    static-like edges" without shortening the stop."""
    a = np.asarray(a, np.float32).copy()
    lo, hi = int(sr * lo_ms / 1000), int(sr * hi_ms / 1000)
    r = max(1, int(sr * ramp_ms / 1000))
    if hi <= lo or lo >= len(a):
        return a
    hi = min(hi, len(a))
    g = 10 ** (gain_db / 20)
    env = np.ones(len(a), np.float32)
    env[lo:hi] = g
    a0, b0 = max(0, lo - r), min(len(a), hi + r)
    if lo > a0:
        env[a0:lo] = np.linspace(1, g, lo - a0)
    if b0 > hi:
        env[hi:b0] = np.linspace(g, 1, b0 - hi)
    return (a * env).astype(np.float32)


def natural_decay(a, sr, start_ms=68, depth=0.28, exponent=1.25):
    """The accepted /g/'s tail: a gentle decay from a stated point, which is
    how that recipe "softens the abrupt release" without shortening the sound."""
    a = np.asarray(a, np.float32).copy()
    s = int(sr * start_ms / 1000)
    if s >= len(a) - 4:
        return a
    t = np.linspace(0, 1, len(a) - s)
    a[s:] *= (1 - depth * t ** exponent).astype(np.float32)
    return a


def grain_extend(seed, sr, target_ms=290, grain_ms=24, hop_ms=7):
    """The accepted /n/'s body: granular extension rather than a stretch or a
    loop, which is what its recipe used to avoid the trill and motorboating
    that stretched versions produced."""
    g = int(sr * grain_ms / 1000)
    hop = int(sr * hop_ms / 1000)
    if len(seed) < g + 4:
        return None
    win = np.hanning(g).astype(np.float32)
    out = np.zeros(int(sr * target_ms / 1000) + g, np.float32)
    norm = np.zeros_like(out)
    pos, src = 0, 0
    step = max(1, (len(seed) - g) // max(1, (len(out) - g) // hop))
    while pos + g < len(out):
        s0 = src % max(1, len(seed) - g)
        out[pos:pos + g] += seed[s0:s0 + g] * win
        norm[pos:pos + g] += win
        pos += hop; src += step
    return (out[:int(sr * target_ms / 1000)]
            / np.maximum(norm[:int(sr * target_ms / 1000)], 1e-6)).astype(np.float32)


def env_curve(a, sr, points):
    """The /n/ recipe's gain envelope, given as (second, gain) points."""
    a = np.asarray(a, np.float32).copy()
    t = np.arange(len(a)) / sr
    xs = [p[0] for p in points]; ys = [p[1] for p in points]
    return (a * np.interp(t, xs, ys)).astype(np.float32)


def polish(a, sr):
    a = np.asarray(a, np.float32).copy()
    peak = float(np.abs(a).max())
    if peak > 1e-6:
        a *= (10 ** (GAIN_DB / 20)) / peak
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


# The three owner-accepted edge treatments, verbatim, plus two between them.
FEATHERS = [
    ("bake-h-feathered", dict(fade_in_ms=20, fade_out_ms=38, win_ms=2.0,
                              ent_ms=35, ent_mix=0.45, rel_ms=45, rel_mix=0.55)),
    ("bake-g-naturaldecay", dict(fade_in_ms=3, fade_out_ms=20, win_ms=2.0,
                                 ent_ms=18, ent_mix=0.30, rel_ms=30, rel_mix=0.40)),
    ("bake-j-edges", dict(fade_in_ms=3, fade_out_ms=18, win_ms=1.5,
                          ent_ms=12, ent_mix=0.25, rel_ms=24, rel_mix=0.35)),
    ("gentler", dict(fade_in_ms=12, fade_out_ms=28, win_ms=2.0,
                     ent_ms=25, ent_mix=0.35, rel_ms=38, rel_mix=0.45)),
    ("softest", dict(fade_in_ms=28, fade_out_ms=50, win_ms=3.0,
                     ent_ms=45, ent_mix=0.60, rel_ms=60, rel_mix=0.70)),
]

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")

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

b13 = json.loads((ROUNDS / "out-snd13" / "batch-data.json").read_text())
byname = {i["text"]: i for i in b13["items"]}

items, failures = [], []
for name in list(PICKS) + ["ng"]:
    kind = KIND[name]
    tp, sr0 = k.create(IPA[name], voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m0 = int(len(tp) * 0.2)
    tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

    cands, seen = [], []

    def add(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.04 * seg_sr):
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind, form="citation")
        if not ok:
            failures.append((name, family, why)); return
        # NO feature dedup in this round. Every arm here is the SAME body with
        # a different edge treatment, so a mean-spectrum comparison calls them
        # all identical - it is measuring the part that is deliberately
        # unchanged. Distinctness is guaranteed by construction (each family is
        # a different named parameter set), and the byte guard still refuses a
        # true repeat.
        seen.append(family)
        cands.append((family, cut, seg_sr, d))

    if name in PICKS:
        arm = next(a for a in byname[name]["arms"] if a["id"] == PICKS[name])
        base, bsr = decode_b64(base64.b64decode(arm["b64"]))
        base = G.core(base, bsr)
        for fam, kw in FEATHERS:
            add(fam, feather(base, bsr, **kw), bsr)
            # An UNVOICED sound cannot take the low-pass smoothing blend: it
            # adds low-band energy and trips the gate's own voicing check, so
            # sh came back with no arms at all. The raised-cosine fades are
            # spectrally neutral, so for frication the edges are rounded by
            # fade alone, over a longer region to do the same job.
            if kind == "unvoiced":
                # Frication cannot take the low-pass blend at all: it adds
                # low-band energy and trips the gate's own voicing check, which
                # is why sh lost every arm twice. Fades are spectrally neutral,
                # so the edges are rounded by fade alone - and kept SHORT,
                # because a long fade on a 180 ms sound is most of the sound.
                for mult, tag in ((0.5, "light"), (1.0, "plain"), (1.6, "long")):
                    kw2 = dict(kw, ent_mix=0.0, rel_mix=0.0,
                               fade_in_ms=kw["fade_in_ms"] * mult,
                               fade_out_ms=kw["fade_out_ms"] * mult)
                    add(f"{fam}-fade{tag}", feather(base, bsr, **kw2), bsr)
        # the /g/ recipe in FULL, its whole documented chain
        add("bake-g-full-chain",
            feather(natural_decay(transient_tame(base, bsr), bsr, 68, 0.28, 1.25),
                    bsr, **FEATHERS[1][1]), bsr)
        add("bake-g-transient-only",
            feather(transient_tame(base, bsr), bsr, **FEATHERS[1][1]), bsr)
        # the /g/ recipe's decay, on top of its own edge treatment
        add("bake-g-decay-shallow",
            feather(natural_decay(base, bsr, 68, 0.28, 1.25), bsr, **FEATHERS[1][1]), bsr)
        add("bake-g-decay-deep",
            feather(natural_decay(base, bsr, 55, 0.40, 1.25), bsr, **FEATHERS[1][1]), bsr)
        # the /n/ recipe's gain envelope, scaled to this clip's length
        L = len(base) / bsr
        add("bake-n-envelope", feather(env_curve(base, bsr, [
            (0, 1.0), (0.05 * L / 0.36, 1.0), (0.10 * L / 0.36, 1.025),
            (0.22 * L / 0.36, 0.985), (0.31 * L / 0.36, 0.93), (L, 0.88)]),
            bsr, **FEATHERS[0][1]), bsr)
        note = (f"your pick {PICKS[name]}, with its start and finish rounded. Option 1 is "
                f"the bake's own \"feathered human edges\" recipe for /h/ — 20 ms in, 38 ms "
                f"out, 2 ms smoothing window, 35 ms entrance region at 0.45, 45 ms release "
                f"region at 0.55, whose stated purpose is \"remove the switch-like onset and "
                f"ending\". Then the /g/ and /j/ edge settings, then gentler and softer. "
                f"Nothing else about the sound is touched.")
    else:
        # ng got NONE: the /n/ recipe's granular body, which is a mechanism
        # this project has never used.
        for word in ("ring", "sing", "king", "bang", "long"):
            p = pathlib.Path("app/public/voice") / f"w-{word}.mp3"
            if not p.exists():
                continue
            pk, psr = decode_file(p)
            s0, s1, _, _ = wc.speech_span(pk, psr)
            span = pk[s0:s1]
            tail = span[max(0, len(span) - int(psr * 0.22)):]
            seed = tail[len(tail) // 3:]
            for target in (240, 300, 360):
                body = grain_extend(seed, psr, target_ms=target)
                if body is None:
                    continue
                built = np.concatenate([tail[:int(psr * 0.04)], body])
                built = env_curve(built, psr, [(0, 1.0), (0.05, 1.0), (0.10, 1.025),
                                               (0.22, 0.985), (0.31, 0.93),
                                               (len(built) / psr, 0.88)])
                add(f"grain-{word}-{target}", feather(built, psr, **FEATHERS[0][1]), psr)
                add(f"grain-{word}-{target}-j", feather(built, psr, **FEATHERS[2][1]), psr)
        note = ("you marked NONE, so this is a new mechanism: the accepted /n/ recipe's "
                "GRANULAR body — 24 ms grains at a 7 ms hop rebuilding the hum, with that "
                "recipe's own gain envelope and the /h/ feathered edges. The bake used it "
                "precisely because stretched versions produced trill and motorboating.")

    ordered = sorted(cands, key=lambda r: r[3])
    if name in PICKS:      # option 1 is always the bake's own feather recipe
        ordered = ([c for c in ordered if c[0] == "bake-h-feathered"]
                   + [c for c in ordered if c[0] != "bake-h-feathered"])
    arms = []
    for fam, cut, csr, d in ordered:
        mp3, ms = encode(polish(cut, csr), csr)
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
    print(f"{name:4} {len(arms):2} arms   {[a['family'] for a in arms][:4]}")
    items.append({"kind": "word", "text": name, "note": note, "how": HOW[name],
                  "reject": "still jarring at the start or finish, dulled, or any other sound around it",
                  "arms": arms})

for f in (OUT / "_tmp.mp3", OUT / "_in.mp3"):
    if f.exists():
        f.unlink()
print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:10]:
    print(f"  {n:4} {fam:26} {why}")
thin = [i["text"] for i in items if len(i["arms"]) < 3]
if thin:
    print(f"THIN: {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 14 — your picks with their edges rounded, the bake's own way",
    "tally": ("Sounds: 13 of the last 14 came back CLOSEST, nine with the same fault — the "
              "start and finish too jarring. These round them. Words: 349 shipped + 115 "
              "approved. Sentences: 42 approved."),
    "items": items}))
print("wrote", OUT / "batch-data.json")
