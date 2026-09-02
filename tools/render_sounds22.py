# Sound round 22: the ten SOUNDS with the most evidence against them, three
# mechanisms each - from the record's own winning shapes, not from processing.
#
# THE TEN: b j qu d g x y w h p (open fault BA, 2026-09-02). The sound ledger
# already records its doubts about them: b "marginal: still rather fuzzy",
# j and qu "marginal", d g y h "half blend", w "three-quarter blend", p and t
# "full cut"; the shipped files show abrupt edges on most.
#
# WHAT THE RECORD SAYS WORKS for a sound, in order of strength:
#   1. A sound is cut from an approved WORD CLIP the owner has called perfect
#      ("look at the pack first, always"): long_e from she, ch from such.
#   2. A sound is spoken in a PHONEME CARRIER SENTENCE and lifted from its
#      last energy island - citation "here is the sound: X", contrastive,
#      minimal pair "bin, pin, tin." (the P45 bake's method).
#   3. Match duration and level to the accepted clips; a citation sound runs
#      110-620 ms; -3 dB peak; a 12 ms fade and, for a sound excised mid-word,
#      a natural rise and a slower fall (the one honest envelope).
# What is CLOSED and not done here: formant warps, time-stretch, second
# voices, blends, loops - "warmth is not a transform".
#
# THE THREE MECHANISMS:
#   P  pack cut: the sound's onset lifted from an approved word clip that
#      begins with it (three source words tried, the cleanest kept) - for a
#      stop, the closure release and the first 40 ms of transition; for a
#      glide or /h/, the onset run; for x, the ks tail of box/fox/six;
#   C  citation carrier: "hˈɪɹ ɪz ðə sˈaʊnd: X." rendered as phonemes at 1.0,
#      the last island lifted;
#   M  minimal-pair carrier: "Xˈɪn, tˈɪn, Xˈɪn." - the target twice around a
#      neighbour, the LAST instance's onset lifted (never the first island).
#
# Usage: py -3.12 tools/render_sounds22.py <out_dir>
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
import soundgate as G
import wordcut as wc

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
VOICE = "af_heart"
PAD_HEAD_MS, PAD_TAIL_MS, GAIN_DB, FADE_MS = 150, 400, -3.0, 12
k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

SOUNDS = {
    # sound: (ipa, kind, source words, neighbour for the minimal pair)
    "b": ("b", "stop", ["bat", "bag", "big"], "t"),
    "j": ("ʤ", "stop", ["jam", "jug", "jog"], "t"),
    "qu": ("kw", "stop", ["quit", "quiz", "quick"], "t"),
    "d": ("d", "stop", ["dog", "dig", "dad"], "t"),
    "g": ("ɡ", "stop", ["got", "gap", "gum"], "t"),
    "x": ("ks", "tail", ["box", "fox", "six"], "t"),
    "y": ("j", "glide", ["yes", "yam", "yet"], "t"),
    "w": ("w", "glide", ["wet", "web", "win"], "t"),
    "h": ("h", "breath", ["hat", "hop", "hum"], "t"),
    "p": ("p", "stop", ["pat", "pig", "pot"], "b"),
}

PRIOR = set()
for p in PACK.glob("d-*.mp3"):
    PRIOR.add(hashlib.sha256(p.read_bytes()).hexdigest())
_pend = json.loads((REPO / "tools/pending-sounds/pending-sounds.json").read_text(encoding="utf-8"))
PRIOR |= {v["sha256"] for v in _pend.values() if isinstance(v, dict) and v.get("sha256")}


def load(p):
    c = av.open(str(p)); s = c.streams.audio[0]
    fr = [f.to_ndarray() for f in c.decode(s)]
    sr = s.codec_context.sample_rate; c.close()
    x = np.concatenate([f.mean(axis=0) if f.ndim > 1 else f for f in fr]).astype(np.float32)
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def say(t, sp=1.0, phonemes=False):
    a, sr = k.create(t, voice=VOICE, speed=sp, lang="en-us", is_phonemes=phonemes)
    return np.asarray(a, np.float32), sr


def encode(a, sr):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def envelope(a, sr, rise_ms=FADE_MS, fall_ms=None):
    """The one honest envelope: a quick rise and a slower fall, the shape a
    spoken sound has when its consonant neighbours are gone."""
    a = np.asarray(a, np.float32).copy()
    fall_ms = fall_ms or max(FADE_MS, int(len(a) / sr * 1000 * 0.25))
    ri = min(int(sr * rise_ms / 1000), len(a) // 3); fo = min(int(sr * fall_ms / 1000), len(a) // 2)
    if ri > 1:
        a[:ri] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, ri))).astype(np.float32)
    if fo > 1:
        a[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))).astype(np.float32)
    return a


def pad(a, sr):
    a = a * ((10 ** (GAIN_DB / 20)) / max(float(np.abs(a).max()), 1e-6))
    return np.concatenate([np.zeros(int(sr * PAD_HEAD_MS / 1000), np.float32), a,
                           np.zeros(int(sr * PAD_TAIL_MS / 1000), np.float32)])


def islands(a, sr, floor_db=-38, min_gap_ms=50, min_ms=40):
    s0, s1, db, n = wc.speech_span(a, sr)
    out, run, start = [], 0, None
    for i in range(len(db)):
        if db[i] > floor_db:
            if start is None:
                start = i
            run = 0
        elif start is not None:
            run += 1
            if run >= max(1, min_gap_ms // 10):
                end = i - run + 1
                if (end - start) * 10 >= min_ms:
                    out.append((start * n, end * n))
                start, run = None, 0
    if start is not None and (len(db) - start) * 10 >= min_ms:
        out.append((start * n, len(db) * n))
    return out


def onset_piece(x, sr, kind):
    """The sound's own piece at the front of a word: for a stop the release
    and the first 40 ms of transition; for a glide or breath the onset run."""
    s0, s1, _, _ = wc.speech_span(x, sr)
    core = x[s0:s1]
    if kind == "stop":
        run = G.unvoiced_run(core, sr)
        n = int(sr * 0.04)
        if run is not None and len(run) >= int(sr * 0.015):
            return np.concatenate([run, core[len(run):len(run) + n]])
        return core[:int(sr * 0.09)]
    if kind == "breath":
        run = G.unvoiced_run(core, sr)
        return run if run is not None and len(run) >= int(sr * 0.03) else core[:int(sr * 0.12)]
    return core[:int(sr * 0.14)]     # glide: the transition IS the sound


def tail_piece(x, sr):
    """x: the ks at the end of box/fox/six - from the vowel's fall to the end."""
    s0, s1, _, _ = wc.speech_span(x, sr)
    core = x[s0:s1]
    return core[max(0, len(core) - int(sr * 0.22)):]


def arm(sound, family, piece, sr, band=(60, 620)):
    if piece is None or len(piece) < sr * band[0] / 1000 or len(piece) > sr * band[1] / 1000:
        return None
    mp3, ms = encode(pad(envelope(piece, sr), sr), sr)
    sha = hashlib.sha256(mp3).hexdigest()
    if sha in PRIOR:
        print(f"    {sound}/{family}: identical to bytes already judged - refused")
        return None
    PRIOR.add(sha)
    return {"family": family, "ms": ms, "b64": base64.b64encode(mp3).decode(), "sha": sha, "sha256": sha}


def build():
    items = []
    for sound, (ipa, kind, words, nb) in SOUNDS.items():
        arms = []
        # P - the pack, first
        best = None
        for w in words:
            p = PACK / f"w-{w}.mp3"
            if not p.exists():
                continue
            x, sr = load(p)
            piece = tail_piece(x, sr) if kind == "tail" else onset_piece(x, sr, kind)
            a = arm(sound, f"P_from-{w}", piece, sr)
            if a and (best is None or abs(a["ms"] - 200 - PAD_HEAD_MS - PAD_TAIL_MS) < abs(best["ms"] - 200 - PAD_HEAD_MS - PAD_TAIL_MS)):
                best = a
        if best:
            arms.append(best)
        # C - the citation carrier. The sound sits at the END of the carrier
        # and never gets its own island (a stop's release is 20 ms; measured
        # 2026-09-02: one island of 1,020 ms), so the tail of the speech span
        # is taken and the gate's core() trims it to the energetic part.
        car, csr = say(f"hˈɪɹ ɪz ðə sˈaʊnd: {ipa}.", 1.0, phonemes=True)
        s0, s1, _, _ = wc.speech_span(car, csr)
        tail = car[max(s0, s1 - int(csr * 0.26)):s1]
        a = arm(sound, "C_citation", G.core(tail, csr), csr)
        if a:
            arms.append(a)
        # M - the minimal pair "bin, tin, bin": the LAST instance is the last
        # ~320 ms of the span, and its onset is the sound
        car, csr = say(f"{ipa}ˈɪn, {nb}ˈɪn, {ipa}ˈɪn.", 1.0, phonemes=True)
        s0, s1, _, _ = wc.speech_span(car, csr)
        last = car[max(s0, s1 - int(csr * 0.32)):s1]
        piece = onset_piece(last, csr, "stop" if kind in ("stop", "tail") else kind)
        a = arm(sound, "M_minimal-pair", piece, csr)
        if a:
            arms.append(a)
        for i, a in enumerate(arms, 1):
            a["id"] = f"{sound}_{i}"
        items.append({"kind": "word", "text": sound, "arms": arms})
        print(f"  {sound}: {len(arms)} arms  " + " ".join(a["family"] for a in arms), flush=True)
    (OUT / "sounds22-audio.json").write_text(json.dumps({i["text"]: i["arms"] for i in items}), encoding="utf-8")
    return items


if __name__ == "__main__":
    items = build()
    print("wrote sounds22-audio.json;", sum(len(i["arms"]) for i in items), "arms over", len(items), "sounds")
