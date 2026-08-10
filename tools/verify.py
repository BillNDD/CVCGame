# Does this clip contain the target word, and NOTHING else?
# Round 3 shipped clips full of neighbouring words because length was checked
# and content never was. This is the check that was missing.
import numpy as np
import wordcut as wc

def dtw_distance(A, B):
    """Frame-wise cosine distance under DTW: how well the clip matches the
    word's own render when both are allowed to stretch."""
    D = 1.0 - (A @ B.T)
    n, m = D.shape
    acc = np.full((n + 1, m + 1), np.inf, dtype=np.float32)
    acc[0, 0] = 0
    for i in range(1, n + 1):
        prev, cur = acc[i - 1], acc[i]
        for j in range(1, m + 1):
            cur[j] = D[i - 1, j - 1] + min(prev[j], cur[j - 1], prev[j - 1])
    return float(acc[n, m] / (n + m))

def syllable_nuclei(a, sr):
    """Count loud islands separated by real dips: a one-syllable word has one.
    Two means a neighbouring word came along for the ride."""
    _, _, db, n = wc.speech_span(a, sr)
    loud = db > -22
    runs, cur = [], 0
    for v in loud:
        if v: cur += 1
        else:
            if cur >= 4: runs.append(cur)
            cur = 0
    if cur >= 4: runs.append(cur)
    return len(runs)

def verify(cut, solo, sr):
    """Returns (ok, reason, dist).

    `solo` MUST be the CANONICAL word rendered alone - never a variant's own
    render. Batch 5 shipped clips saying "u v" because alternate spellings
    (uv, ov, uhv) were each verified against themselves: the gate proved they
    were self-consistent, which they were, and never asked whether they were
    the word. A gate that compares a thing to itself proves nothing."""
    if len(cut) < 0.15 * sr:
        return False, "too short", 9.9
    A = wc.logmel(cut, sr); B = wc.logmel(solo, sr)
    if len(A) < 4 or len(B) < 4:
        return False, "no features", 9.9
    d = dtw_distance(A, B)
    nuc = syllable_nuclei(cut, sr)
    solo_nuc = max(1, syllable_nuclei(solo, sr))
    ratio = (len(cut) / sr) / max(1e-6, len(solo) / sr)
    if d > 0.34:  return False, f"content differs (dtw {d:.2f})", d
    if nuc > solo_nuc: return False, f"extra syllable island ({nuc} vs {solo_nuc})", d
    if ratio > 1.45: return False, f"too long ({ratio:.2f}x)", d
    if ratio < 0.72: return False, f"clipped ({ratio:.2f}x)", d
    return True, "ok", d
