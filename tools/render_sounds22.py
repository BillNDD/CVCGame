# Sound round 22: the voiced th, the one sound the sound-out is still missing.
#
# Found by an audit of the reveal on 2026-08-11, not by a gate. The tile map
# sent every `th` to `th_quiet`, which is the VOICELESS th of "thin" - a soft
# puff of air with no voice in it. Six bank words take the VOICED th of "this":
# this, that, then, them, the, and with. Those six were being sounded out with
# the wrong sound, which is the opposite of teaching.
#
# tools/voice-sounds.csv already carries a th_this row (ipa ð, as_in "this")
# from round S7, but no synthesised clip exists for it, so nothing could ship.
# This round produces one.
#
# Three sources, because the two that have worked before disagree about what a
# citation th should be, and the ear settles it:
#
#   A  CUT FROM AN APPROVED WORD. The pack already holds this, that, then,
#      them, the and with, every one of them listened to and accepted. The
#      opening ð is right there in audio the owner has already passed. This is
#      the method the 2026-08-06 ruling itself named for three of its seven
#      sounds, and it cannot drift from the voice the rest of the pack uses.
#   B  THE CARRIER SENTENCE, tripled. kokoro will not render a lone consonant
#      phoneme but renders a held one, so the carrier says "here is the sound:
#      ððð" and the last energy island is cut. This closed b, d, g, j, n, v, w,
#      z and h.
#   C  THE CONTRAST. "θθθ? no. ððð." puts the wrong sound beside the right one
#      in the same breath, which pushed the synthesiser off the voiceless
#      neighbour it kept sliding into. This closed v against f.
#
# An onset ð is short - 60 to 110 ms in the pack - so each cut is also offered
# lengthened by grain extension, the treatment that made /g/ and /n/ speakable
# when their bursts were "still too quick".
#
# Usage: python render_sounds22.py <out_dir>
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

SCRATCH = "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad"
ROUNDS = pathlib.Path(SCRATCH) / "rounds"
REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB = 150, 400, -3.0
SR = 24000


def decode_file(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate; c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush()


def present(a, sr):
    """Padded and levelled for a listening round, never for the pack."""
    a = a * (10 ** (GAIN_DB / 20) / max(float(np.abs(a).max()), 1e-6))
    f = int(sr * 0.008)
    a = a.copy(); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


def islands(a, sr, floor_db=-38, min_ms=45, merge_ms=60):
    n = int(sr * 0.010)
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = db > floor_db
    runs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            runs.append([i, j]); i = j
        else:
            i += 1
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * 10 < merge_ms:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [(s * n, e * n) for s, e in merged if (e - s) * 10 >= min_ms]


def onset(a, sr, ms):
    """The word's first sound, from where speech begins."""
    isl = islands(a, sr)
    if not isl:
        return None
    s = isl[0][0]
    return a[s:s + int(sr * ms / 1000)]


def grain_extend(seed, sr, target_ms, grain_ms=22, hop_ms=7):
    """Lengthen by overlapping short grains of the sound's own steady middle,
    so a held version is made of the sound itself rather than a stretch."""
    target = int(sr * target_ms / 1000)
    if len(seed) >= target:
        return seed
    g = int(sr * grain_ms / 1000); hop = int(sr * hop_ms / 1000)
    mid = seed[max(0, len(seed) // 2 - g):max(0, len(seed) // 2 - g) + g]
    if len(mid) < 8:
        return seed
    win = np.hanning(len(mid)).astype(np.float32)
    out = np.zeros(target + g, np.float32)
    out[:len(seed)] += seed
    at = max(0, len(seed) - g)
    while at < target:
        out[at:at + len(mid)] += mid * win
        at += hop
    out = out[:target]
    return out / max(float(np.abs(out).max()), 1e-6) * float(np.abs(seed).max())


import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")

# Every arm any earlier round has offered, so a candidate the owner has
# already heard and rejected is never sent back with a new label.
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

# The template the gate measures content against: a plain held ð.
tp, sr0 = k.create("ðððð", voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
tp = G.core(np.asarray(tp, np.float32), sr0)
m0 = int(len(tp) * 0.2)
tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

CARRIERS = [
    ("carrier-citation", "hˈɪɹ ɪz ðə sˈaʊnd: ðððð."),
    ("carrier-citation-slow", "hˈɪɹ ɪz ðə sˈaʊnd: ððððð."),
    ("contrast-thin-this", "θθθ? nˈoʊ. ðððð."),
    ("carrier-spelling", "ðə lˈɛtɚz TH kæn sˈeɪ ðððð."),
]
WORDS = ["this", "that", "then", "them", "the"]

cands, failures = [], []


def add(family, seg, seg_sr):
    if seg is None or len(seg) < int(0.04 * seg_sr):
        failures.append((family, "nothing to cut")); return
    cut = G.core(np.asarray(seg, np.float32), seg_sr)
    ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind="voiced", form="citation")
    if not ok:
        failures.append((family, why)); return
    cands.append((family, cut, seg_sr, d))


# A — the sound cut out of a word the owner has already accepted.
for w in WORDS:
    p = PACK / f"w-{w}.mp3"
    if not p.exists():
        continue
    a, sr = decode_file(p)
    for ms in (110, 150):
        seg = onset(a, sr, ms)
        add(f"pack-{w}-{ms}ms", seg, sr)
        if seg is not None:
            add(f"pack-{w}-{ms}ms-held", grain_extend(seg, sr, 220), sr)

# B and C — the carrier sentences, cut at their last energy island.
for fam, ipa in CARRIERS:
    au, sr = k.create(ipa, voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
    au = np.asarray(au, np.float32)
    isl = islands(au, sr)
    if not isl:
        failures.append((fam, "no islands")); continue
    s, e = isl[-1]
    add(fam, au[s:e], sr)
    add(f"{fam}-held", grain_extend(au[s:e], sr, 240), sr)

# Round-robin by METHOD, not by distance. Sorting the field by likeness to
# one reference is how rounds 12 and 13 wasted arms: every slot went to the
# family that happened to resemble the template, and the family that actually
# won the sound was never offered. Each method sends its best first.
def method(f):
    return "pack" if f.startswith("pack-") else "contrast" if f.startswith("contrast") else "carrier"


buckets = {}
for c in sorted(cands, key=lambda c: c[3]):
    buckets.setdefault(method(c[0]), []).append(c)
ordered, i = [], 0
while any(buckets.values()):
    for m in ("pack", "carrier", "contrast"):
        if buckets.get(m):
            ordered.append(buckets[m].pop(0))

arms, seen_sha = [], set()
for family, cut, sr, d in ordered:
    mp3 = encode(present(cut, sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in seen_sha or sha in ALREADY:
        continue
    seen_sha.add(sha)
    arms.append({"id": f"th_this_{len(arms) + 1}", "family": family, "sha": sha,
                 "ms": round(len(cut) / sr * 1000), "dtw": round(d, 3),
                 "b64": base64.b64encode(mp3).decode()})
    if len(arms) >= 10:
        break

data = {"title": "Sound round 22 — the voiced th",
        "items": [{
            "kind": "word", "text": "th (voiced)",
            "note": "the th in this, that, then, them, the",
            "how": "a buzzing th with the voice ON, as in <b>this</b> — the tongue between the teeth and the throat humming",
            "reject": "it sounds like the quiet th of <b>thin</b> (no voice), or like a d, or like a v, or it is too short to hear",
            "arms": arms}]}
(OUT / "batch-data.json").write_text(json.dumps(data))
print(f"th (voiced): {len(arms)} arms")
for a in arms:
    print(f"  {a['id']:12} {a['family']:28} {a['ms']:4}ms  dtw {a['dtw']}")
if failures:
    print("\nrefused by the gate:")
    for f, why in failures:
        print(f"  {f:28} {why}")
