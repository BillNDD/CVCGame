# Precise word extraction, replacing the silence-guessing of rounds 1 and 2.
#
# Round 2's verdict: "terrible cut positions (cut the word off or have a lot
# of extra words)". The gap search cannot know where a word starts and ends -
# it only knows where the sound dips, and in "Ready-of-ready." the dip after
# "of" is shallower than the one inside "ready", so the cut kept "of red".
#
# Two mechanisms replace it, both exact where the old one guessed:
#
# 1. FIRST-INSTANCE cut. In "Milk. Milk." the first word begins at the
#    utterance's own speech onset - a boundary that needs no search at all -
#    and ends at the first real pause. It is also not phrase-final, so it
#    carries none of the utterance-final creak diagnosed on 2026-08-07.
#    One boundary to find instead of two, and the easy one.
#
# 2. TEMPLATE MATCH. Synthesise the word alone, then slide that template over
#    the carrier on log-mel features (cosine similarity, several time scales)
#    to locate the same word inside it. The boundaries come from the audio
#    itself, not from a silence threshold, and the match score says how
#    confident the location is.
import numpy as np

MEL_N = 26


def _mel_bank(sr, n_fft, n_mel=MEL_N, fmin=60, fmax=7600):
    hz2mel = lambda f: 2595 * np.log10(1 + f / 700)
    mel2hz = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = mel2hz(np.linspace(hz2mel(fmin), hz2mel(min(fmax, sr / 2)), n_mel + 2))
    bins = np.floor((n_fft + 1) * pts / sr).astype(int)
    bank = np.zeros((n_mel, n_fft // 2 + 1), dtype=np.float32)
    for i in range(n_mel):
        l, c, r = bins[i], bins[i + 1], bins[i + 2]
        if c == l: c = l + 1
        if r == c: r = c + 1
        if r >= bank.shape[1]: r = bank.shape[1] - 1
        if c >= r: continue
        bank[i, l:c] = np.linspace(0, 1, c - l, endpoint=False)
        bank[i, c:r] = np.linspace(1, 0, r - c, endpoint=False)
    return bank


def logmel(a, sr, hop_ms=5, win_ms=25):
    hop, win = int(sr * hop_ms / 1000), int(sr * win_ms / 1000)
    n_fft = 1 << (win - 1).bit_length()
    bank = _mel_bank(sr, n_fft)
    w = np.hanning(win).astype(np.float32)
    frames = [a[i:i + win] * w for i in range(0, max(1, len(a) - win), hop)]
    if not frames:
        return np.zeros((1, MEL_N), np.float32)
    spec = np.abs(np.fft.rfft(np.stack(frames), n=n_fft, axis=1)) ** 2
    m = np.log(np.maximum(spec @ bank.T, 1e-10))
    m -= m.mean(axis=1, keepdims=True)                 # per-frame mean removal
    n = np.linalg.norm(m, axis=1, keepdims=True)
    return m / np.maximum(n, 1e-9)


def speech_span(a, sr, floor_db=-45, hop_ms=10):
    n = int(sr * hop_ms / 1000)
    fr = [a[i:i + n] for i in range(0, len(a) - n + 1, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    sp = np.nonzero(db > floor_db)[0]
    if not len(sp):
        return 0, len(a), db, n
    return int(sp.min()) * n, (int(sp.max()) + 1) * n, db, n


def first_instance(a, sr, floor_db=-32, min_gap_ms=40, tail_ms=40):
    """The first word of a repeat frame: from the utterance's speech onset to
    the first real pause after it. Returns (segment, confidence-note)."""
    s0, s1, db, n = speech_span(a, sr)
    i0 = s0 // n
    run, cut = 0, None
    for i in range(i0 + 8, s1 // n):                    # at least 80 ms of word
        if db[i] < floor_db:
            run += 1
            if run >= max(1, min_gap_ms // 10):
                cut = i - run + 1
                break
        else:
            run = 0
    if cut is None:
        return None
    end = min(len(a), cut * n + int(tail_ms / 1000 * sr))
    return a[max(0, s0 - int(0.02 * sr)):end]


def template_match(word_audio, carrier, sr, scales=(0.85, 0.925, 1.0, 1.08, 1.18)):
    """Locate the word inside the carrier by sliding its own render over it.
    Returns (start_sample, end_sample, score). The score is a cosine
    similarity in [0, 1]; below about 0.55 the location is not trustworthy."""
    C = logmel(carrier, sr)
    best = (None, None, -1.0)
    for s in scales:
        idx = np.clip((np.arange(int(len(word_audio) / s)) * s).astype(int), 0, len(word_audio) - 1)
        T = logmel(word_audio[idx], sr)
        if len(T) < 4 or len(C) <= len(T):
            continue
        # sliding cosine similarity: features are unit-norm per frame already
        scores = np.array([float(np.mean(np.sum(C[i:i + len(T)] * T, axis=1)))
                           for i in range(len(C) - len(T) + 1)])
        i = int(np.argmax(scores))
        if scores[i] > best[2]:
            hop = int(sr * 5 / 1000)
            best = (i * hop, (i + len(T)) * hop, float(scores[i]))
    return best


def refine_edges(a, sr, start, end, floor_db=-38, pad_ms=25, max_walk_ms=40):
    """Nudge a matched span out to the nearest quiet frame so a plosive's
    closure or a fricative's tail is not clipped — but only a little. An
    unbounded walk swallows the neighbouring word when no real silence lies
    between them, which is exactly how round 2 shipped "of red"."""
    n = int(sr * 0.01)
    _, _, db, _ = speech_span(a, sr)
    limit = max(1, max_walk_ms // 10)
    i, j = start // n, min(len(db) - 1, end // n)
    steps = 0
    while i > 0 and db[i] > floor_db and steps < limit:
        i -= 1; steps += 1
    steps = 0
    while j < len(db) - 1 and db[j] > floor_db and steps < limit:
        j += 1; steps += 1
    pad = int(pad_ms / 1000 * sr)
    return max(0, i * n - pad), min(len(a), (j + 1) * n + pad)
