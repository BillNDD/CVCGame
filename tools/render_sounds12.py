# Sound round 12: the fourteen sounds that still depend on the owner's voice.
#
# The owner ruled on 2026-08-11: no recording of their own voice ships in the
# game. Nineteen owner-recorded WAVs sit in `app/public/sounds/`, and 26 rows
# of `tools/voice-sounds.csv` are sourced `owner_recording`. Of the 29 sounds
# the 349-word bank actually needs, 15 already have a synthesised clip the
# owner has approved. These are the other fourteen:
#
#   b d e g h j n ng sh u v w y z
#
# THE RECIPE IS NOT NEW, and that is the point. Round 9 closed schwa and round
# 11 closed oo (book) by cutting the sound out of an ALREADY-SHIPPED, owner-
# approved WORD clip rather than out of a fresh render, then giving it the
# amplitude envelope a spoken sound has. Six rounds of invention had failed
# first. Every sound here comes from a word in the bank whose clip the owner
# has already called perfect, so each starts with warmth that was accepted
# rather than having to earn it from nothing.
#
# WHERE IN THE WORD. An initial consonant is cut from the word's onset, a vowel
# from its loudest run, and ng from the tail, because that is where each sound
# actually lives. A stop (b, d, g) is a silent closure and a burst, so a cut of
# only the burst is 30 ms and reads as a click; each stop is therefore offered
# both tight and with a little of the voiced onset that follows, which is the
# "buh" a teacher says. The owner's ear picks between them.
#
# Usage: python render_sounds12.py <out_dir>
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


def envelope(a, sr, rise_ms=20, fall_ms=70):
    """The shape a spoken sound has. A fragment cut from inside a word begins
    and ends at full amplitude, because its own rise and fall belong to its
    neighbours; alone that reads as a blip rather than a voice."""
    a = np.asarray(a, np.float32).copy()
    r, f = int(sr * rise_ms / 1000), int(sr * fall_ms / 1000)
    if r + f >= len(a):
        return None
    if r:
        a[:r] *= np.linspace(0, 1, r) ** 0.6
    if f:
        a[-f:] *= np.linspace(1, 0, f) ** 1.4
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


def loudest_run(core, sr, floor_db=-14):
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
    return (int(best[0] * n), int(best[1] * n)) if best else None


# sound -> (IPA for the content template, voiced or not, source words, where it lives)
SOUNDS = [
    ("b",  "b",  "voiced",   ["bus", "bib", "bat", "bed", "big"],      "onset"),
    ("d",  "d",  "voiced",   ["dad", "did", "dog", "den", "dot"],      "onset"),
    ("g",  "ɡ",  "voiced",   ["gap", "gum", "got", "gas", "gob"],      "onset"),
    ("j",  "dʒ", "voiced",   ["jam", "jet", "job", "jug", "jig"],      "onset"),
    ("n",  "n",  "voiced",   ["net", "nap", "nut", "nod", "nag"],      "onset"),
    ("v",  "v",  "voiced",   ["van", "vet", "vex"],                    "onset"),
    ("w",  "w",  "voiced",   ["web", "win", "wag", "wet", "wig"],      "onset"),
    ("y",  "j",  "voiced",   ["yes", "yak", "yam", "yap", "yet"],      "onset"),
    ("z",  "z",  "voiced",   ["zip", "zap", "zig", "zag"],             "onset"),
    ("sh", "ʃ",  "unvoiced", ["ship", "shop", "shut", "shed", "shin"], "onset"),
    ("h",  "h",  "unvoiced", ["hat", "hum", "hen", "hop", "hid"],      "onset"),
    ("ng", "ŋ",  "voiced",   ["ring", "sing", "king", "bang", "long"], "tail"),
    ("e",  "ɛ",  "voiced",   ["hen", "bed", "pen", "ten", "wet"],      "middle"),
    ("u",  "ʌ",  "voiced",   ["bus", "cup", "sun", "mud", "hut"],      "middle"),
]
HOW = {
    "b": ("a quick b-push, as in bus", "a full 'buh' with a long uh after it, or any other sound"),
    "d": ("a quick d-tap, as in dad", "a full 'duh' with a long uh after it, or any other sound"),
    "g": ("a quick g-catch, as in gap", "a full 'guh' with a long uh after it, or any other sound"),
    "j": ("a soft j-push, as in jam", "a full 'juh' with a long uh after it, or any other sound"),
    "n": ("a humming n, as in net", "a full 'nuh', or any other sound around it"),
    "v": ("a buzzing v, as in van", "a full 'vuh', or any other sound around it"),
    "w": ("a rounded w, as in web", "a full 'wuh', or any other sound around it"),
    "y": ("a y-glide, as in yes", "a full 'yuh', or any other sound around it"),
    "z": ("a buzzing z, as in zip", "a full 'zuh', or any other sound around it"),
    "sh": ("a quiet shush, as in ship", "a voiced 'shuh', a hiss, or any other sound around it"),
    "h": ("a soft breath, as in hat", "a voiced 'huh', or any other sound around it"),
    "ng": ("a humming ng, as in ring", "the g heard separately, or any other sound around it"),
    "e": ("the short e of hen, bed", "the letter name 'ee', or any other sound around it"),
    "u": ("the short u of bus, cup", "the letter name 'you', or any other sound around it"),
}

import kokoro_onnx
k = kokoro_onnx.Kokoro(f"{SCRATCH}/kokoro-v1.0.onnx", f"{SCRATCH}/voices-v1.0.bin")

ROUNDS = pathlib.Path(SCRATCH) / "rounds"
ALREADY = {}
for d in sorted(ROUNDS.glob("out-*")):
    if d.resolve() == OUT.resolve():
        continue                                   # never read this round's own output
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
for name, ipa, kind, words, where in SOUNDS:
    tp, sr0 = k.create(ipa, voice="af_heart", speed=0.85, lang="en-us", is_phonemes=True)
    tp = G.core(np.asarray(tp, np.float32), sr0)
    m0 = int(len(tp) * 0.2)
    tpl = tp[m0:len(tp) - m0] if len(tp) - 2 * m0 > int(0.04 * sr0) else tp

    cands, seen = [], []

    def add(family, seg, seg_sr):
        if seg is None or len(seg) < int(0.04 * seg_sr):
            return
        cut = G.core(np.asarray(seg, np.float32), seg_sr)
        ok, why, d = G.verify_sound(cut, tpl, seg_sr, kind=kind)
        if not ok:
            failures.append((name, family, why)); return
        f = wc.logmel(cut, seg_sr).mean(axis=0)
        f = f / (np.linalg.norm(f) + 1e-9)
        ms = len(cut) / seg_sr * 1000
        # shaped and unshaped are the comparison this round is asking for,
        # so they must never dedup against each other.
        cls = family.split("-")[0] + ("|shaped" if "shaped" in family else "|plain")
        if any(c == cls and float(np.dot(f, g)) > 0.995 and abs(ms - m2) / max(ms, m2) < 0.12
               for g, m2, c in seen):
            failures.append((name, family, "duplicate")); return
        seen.append((f, ms, cls))
        cands.append((family, cut, seg_sr, d))

    for word in words:
        p = PACK / f"w-{word}.mp3"
        if not p.exists():
            failures.append((name, word, "no shipped clip")); continue
        pack, psr = decode_file(p)
        s0, s1, _, _ = wc.speech_span(pack, psr)
        span = pack[s0:s1]
        if where == "onset":
            # a stop needs its burst AND a little of what follows, or it is a
            # click; a continuant can be taken long. Both are offered.
            for hold in (70, 100, 130, 170, 210):
                seg = span[:int(psr * hold / 1000)]
                add(f"{word}-on{hold}", seg, psr)
                add(f"{word}-on{hold}-shaped", envelope(seg, psr), psr)
        elif where == "tail":
            for hold in (110, 150, 190, 230):
                seg = span[max(0, len(span) - int(psr * hold / 1000)):]
                add(f"{word}-tail{hold}", seg, psr)
                add(f"{word}-tail{hold}-shaped", envelope(seg, psr), psr)
        else:                                        # a vowel: its loudest run
            r = loudest_run(span, psr)
            if r is None:
                failures.append((name, word, "no loud run")); continue
            a, b = r
            for pad in (0, 20, 40):
                n = int(psr * pad / 1000)
                seg = span[max(0, a - n):min(len(span), b + n)]
                add(f"{word}-vowel{pad}", seg, psr)
                add(f"{word}-vowel{pad}-shaped", envelope(seg, psr), psr)

    by_family = {}
    for c in sorted(cands, key=lambda r: r[3]):
        by_family.setdefault(c[0].split("-")[0], []).append(c)
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
            failures.append((name, fam, "already offered")); continue
        tmp = OUT / "_tmp.mp3"; tmp.write_bytes(mp3)
        dec, dsr = decode_file(tmp)
        ok, why, _ = G.verify_sound(G.core(dec, dsr), tpl, dsr, kind=kind)
        if not ok:
            failures.append((name, fam, f"after encode: {why}")); continue
        arms.append({"id": f"{name}_{len(arms) + 1}", "family": fam, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(), "sha": sha})
        if len(arms) >= 10:
            break
    how, rej = HOW[name]
    print(f"{name:4} {len(arms):2} arms from {len(cands):3} gated  sources {words}")
    items.append({"kind": "word", "text": name,
                  "note": (f"cut from your own approved clips for {', '.join(words)} — the "
                           f"recipe that closed schwa and oo. Half the options carry a "
                           f"natural rise and fall, half do not."),
                  "how": how, "reject": rej, "arms": arms})

tmp = OUT / "_tmp.mp3"
if tmp.exists():
    tmp.unlink()
print(f"\nrefused: {len(failures)}")
for n, fam, why in failures[:14]:
    print(f"  {n:4} {fam:24} {why}")

thin = [i["text"] for i in items if len(i["arms"]) < 4]
if thin:
    print(f"\nTHIN FIELDS: {thin}")

(OUT / "batch-data.json").write_text(json.dumps({
    "title": "Sound round 12 — the last fourteen, so no recording of your voice ships",
    "tally": ("Sounds: the bank needs 29; 15 are already synthesised and approved; these 14 "
              "are the ones still standing on your own recordings. Words: 349 shipped + 115 "
              "approved. Sentences: 42 approved."),
    "items": items}), encoding="utf-8")
print("wrote", OUT / "batch-data.json")
