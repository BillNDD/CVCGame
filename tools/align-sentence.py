# Where does each word begin inside a recorded sentence?
#
# The reveal wants to walk along a sentence as the voice reads it, lighting the
# word being spoken. That needs the start time of every word inside one whole
# recording, and a recording does not carry them.
#
# Silence does not find them. In connected speech the words run together: a
# sweep of four energy-island settings over twelve approved sentences matched
# the word count ZERO times out of twelve. That measurement is why this file
# exists, and it should stop anyone trying the easy way again.
#
# So the text is aligned to the audio instead, using material this project
# already owns: every word in a decodable sentence has its OWN approved clip in
# the voice pack. Those clips are concatenated into a reference whose word
# boundaries are known exactly, and dynamic time warping between the reference
# and the real recording carries those boundaries across. It is a forced
# alignment built out of the pack.
#
# The alignment is reported with a confidence, because a bad alignment that
# looks fine would put the highlight on the wrong word, which is worse than no
# highlight at all.
#
# Usage:
#   python align-sentence.py <mp3> "The sentence text."
#   python align-sentence.py --self-test
import json
import pathlib
import sys

import av
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
MANIFEST = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
PEND = REPO / "tools" / "pending-words"
_PJ = json.loads((PEND / "pending-words.json").read_text(encoding="utf-8")) if (PEND / "pending-words.json").exists() else {}


def clip_for(w):
    """A word's approved audio, wherever it lives. The bank's words are in the
    shipped pack; the heart words and the blend words are approved and waiting
    in tools/pending-words, and a sentence may use those too."""
    if "w:" + w in MANIFEST:
        return PACK / MANIFEST["w:" + w]["file"]
    f = PEND / f"w-{w}.mp3"
    if w in _PJ and f.exists():
        return f
    return None
HOP_MS = 10.0          # wordcut.logmel's frame hop


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def speech(a, sr, floor_db=-45.0):
    """The clip without its own leading and trailing silence."""
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    if not len(on):
        return a
    return a[int(on.min()) * n:(int(on.max()) + 1) * n]


def dtw_path(A, B):
    """The warping path between two log-mel sequences, as (i, j) pairs.
    A standard accumulated-cost matrix with a backtrace; the project's
    verify.dtw_distance returns only the cost, and the PATH is what carries a
    boundary from one recording to the other."""
    na, nb = len(A), len(B)
    d = np.linalg.norm(A[:, None, :] - B[None, :, :], axis=2)
    D = np.full((na + 1, nb + 1), np.inf)
    D[0, 0] = 0.0
    for i in range(1, na + 1):
        for j in range(1, nb + 1):
            D[i, j] = d[i - 1, j - 1] + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    i, j, path = na, nb, []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        step = np.argmin([D[i - 1, j - 1], D[i - 1, j], D[i, j - 1]])
        if step == 0:
            i, j = i - 1, j - 1
        elif step == 1:
            i -= 1
        else:
            j -= 1
    return path[::-1], float(D[na, nb] / max(na + nb, 1))


def align(mp3, text):
    """Returns {word, at_ms, ms} per word, plus a confidence and any warning."""
    words = [w.strip(".,!?“”\"").lower() for w in text.split()]
    missing = [w for w in words if clip_for(w) is None]
    if missing:
        return None, f"no clip for: {', '.join(sorted(set(missing)))}"

    sent, sr = load(mp3)
    sent = speech(sent, sr)

    # The reference: every word's own approved clip, stripped and butted
    # together. Its boundaries are known to the sample.
    parts, bounds, at = [], [], 0
    for w in words:
        a, asr = load(clip_for(w))
        a = speech(a, asr)
        parts.append(a)
        bounds.append((at, at + len(a)))
        at += len(a)
    ref = np.concatenate(parts)

    A = wc.logmel(ref, sr)
    B = wc.logmel(sent, sr)
    if len(A) < 4 or len(B) < 4:
        return None, "too short to align"

    # The reference is about TWICE the recording, because a word said on its
    # own is a citation form and a word inside a sentence is not. Handed that
    # 2:1 gap, the warp spends its whole budget on a global squeeze and crushes
    # whatever comes first: "the" and "cat" both collapsed onto the opening
    # 10 ms. So the reference is scaled to the recording's length FIRST, and
    # the warp is left to correct what remains, which is local and small.
    scale = len(B) / len(A)
    idx = np.clip((np.arange(len(B)) / scale).astype(int), 0, len(A) - 1)
    A = A[idx]
    path, cost = dtw_path(A, B)

    # Carry each reference boundary across the path into the recording.
    # A reference frame maps to a RANGE of recording frames, because the two
    # run at different speeds. Taking the first j for both ends of a word
    # squashes it: an isolated "the" is half a second and a spoken one is a
    # tenth, so the first "the" was collapsing to 10 ms and flashing. The start
    # takes the FIRST j the path reaches, the end takes the LAST.
    first_j, last_j = {}, {}
    for i, j in path:
        first_j.setdefault(i, j)
        last_j[i] = j
    out = []
    for w, (s, e) in zip(words, bounds):
        fs = min(int(s / sr * 1000 / HOP_MS * scale), len(A) - 1)
        fe = min(max(int(e / sr * 1000 / HOP_MS * scale) - 1, fs), len(A) - 1)
        js, je = first_j.get(fs, 0), last_j.get(fe, len(B) - 1)
        out.append({"word": w, "at_ms": round(js * HOP_MS), "ms": max(60, round((je - js) * HOP_MS))})

    # Confidence. A good alignment is monotonic, covers the recording, and
    # gives every word a plausible share. Any of those failing means the
    # highlight would land on the wrong word.
    warn = []
    if any(out[i]["at_ms"] > out[i + 1]["at_ms"] for i in range(len(out) - 1)):
        warn.append("not monotonic")
    total = len(sent) / sr * 1000
    if out[-1]["at_ms"] + out[-1]["ms"] < total * 0.75:
        warn.append("stops well before the recording ends")
    # A floor per word class, not one number. The closed-class function words
    # really are that fast in connected speech - a spoken "the" is 60 to 120 ms
    # against half a second said on its own - and an 80 ms floor for everything
    # was a number invented here, not measured. A content word that short IS a
    # squashed alignment.
    FAST = {"the", "a", "an", "is", "in", "to", "of", "and", "on", "at", "it", "or"}
    for o in out:
        if o["ms"] < (40 if o["word"] in FAST else 90):
            warn.append(f'{o["word"]} got only {o["ms"]} ms')
    return {"words": out, "total_ms": round(total), "cost": round(cost, 4)}, "; ".join(warn)


def control(mp3, right_text, wrong_text):
    """The alignment must fit the RIGHT words better than the wrong ones.
    Without this, an alignment that simply spread the words evenly across the
    recording would look exactly as convincing as one that found them."""
    a, _ = align(mp3, right_text)
    b, _ = align(mp3, wrong_text)
    if not a or not b:
        return None
    return a["cost"], b["cost"]


if __name__ == "__main__":
    P = REPO / "tools" / "pending-words"
    if "--self-test" in sys.argv:
        d = json.loads((P / "pending-words.json").read_text(encoding="utf-8"))
        rows = [(P / f"s-{k[2:].replace(':', '-')}.mp3", v["text"])
                for k, v in d.items()
                if k.startswith("s:") and isinstance(v, dict) and v.get("text")]
        rows = [(f, t) for f, t in rows if f.exists()][:10]
        good = 0
        for f, t in rows:
            r, warn = align(f, t)
            if r is None:
                print(f"skip  {t[:34]:36} {warn}")
                continue
            ok = not warn
            good += ok
            print(("ok   " if ok else "WARN ") + f"{t[:34]:36} " +
                  " ".join(f'{o["word"]}@{o["at_ms"]}' for o in r["words"]) +
                  (f"   [{warn}]" if warn else ""))
        print(f"\naligned cleanly: {good} of {len(rows)}")

        # The control. Each recording is aligned against its own words and
        # against another sentence's; the right text must cost less every time.
        print("\nCONTROL - the right words must fit better than the wrong ones:")
        wins = 0
        pairs = [(rows[i], rows[(i + 3) % len(rows)]) for i in range(len(rows))]
        tried = 0
        for (f, t), (_, other) in pairs:
            if len(other.split()) != len(t.split()):
                continue
            c = control(f, t, other)
            if not c:
                continue
            tried += 1
            better = c[0] < c[1]
            wins += better
            print(("ok   " if better else "FAIL ") +
                  f'"{t[:26]}" fits at {c[0]:.3f}, "{other[:26]}" at {c[1]:.3f}')
        print(f"\nthe right text won {wins} of {tried}")
        sys.exit(0 if wins == tried and tried >= 3 else 1)
    r, warn = align(pathlib.Path(sys.argv[1]), sys.argv[2])
    print(json.dumps({"alignment": r, "warning": warn}, indent=1))
