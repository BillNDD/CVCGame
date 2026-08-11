# Does this clip contain the target word, and NOTHING else?
# Round 3 shipped clips full of neighbouring words because length was checked
# and content never was. This is the check that was missing.
#
# Batch 8 (2026-08-10) found the check that was STILL missing: af_heart puts
# an 85-115 ms voiced blob at the start of every isolated word render - even
# for words whose accepted pack clips start clean. That blob poisoned the
# canonical template itself, so template match aligned blob frames onto the
# preceding carrier word (dragging "a big sound or a word in front" into
# every cut) and verify() accepted the junk because its reference carried
# the same junk. clean_onset() strips the blob from the template, and
# lead_voiced_ms() is the gate check that refuses a candidate whose front
# carries voiced material before an unvoiced-initial word's frication.
# Calibrated against the owner-refused silk/slip arms (all must be refused)
# and the owner-accepted s/f-initial pack words (0-30 ms lead, all pass).
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

def onset_class(word):
    """How a word's first phoneme can be checked by voicing: "fricative"
    (s, f, sh, ch, th - a sustained unvoiced run), "stop" (t, k, c, p - a
    brief unvoiced burst), or None (voiced onsets and h, where voicing
    cannot see the boundary)."""
    w = word.lower()
    if w.startswith(("sh", "ch", "th", "s", "f")):
        return "fricative"
    if w.startswith(("t", "k", "p")) or (w.startswith("c") and not w.startswith(("ci", "ce", "ch"))):
        return "stop"
    return None


def starts_unvoiced(word):
    return onset_class(word) is not None


def lead_voiced_ms(a, sr, min_run=4):
    """Energetic VOICED milliseconds before the first sustained unvoiced
    energetic run of min_run 5 ms frames. An unvoiced-initial word spoken
    cleanly measures 0-30 ms (the accepted pack words); af_heart's
    utterance-initial blob measures 85-115 ms; a smuggled preceding word
    more. A stop burst is brief, so stop-initial words use min_run=2.
    Returns -1 when the clip has no unvoiced run at all."""
    s0, s1, _, _ = wc.speech_span(a, sr)
    seg = a[s0:s1]
    hop, win = int(sr * 0.005), int(sr * 0.025)
    if len(seg) < win + hop:
        return -1
    w = np.hanning(win).astype(np.float32)
    frames = np.stack([seg[i:i + win] * w for i in range(0, len(seg) - win, hop)])
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    f = np.fft.rfftfreq(frames.shape[1], 1 / sr)
    tot = spec.sum(axis=1)
    lf = spec[:, f < 1000].sum(axis=1) / (tot + 1e-12)
    db = 10 * np.log10(np.maximum(tot, 1e-12) / max(float(tot.max()), 1e-12))
    run = 0
    for i, (v, e) in enumerate(zip(lf, db)):
        if v <= 0.20 and e > -35:
            run += 1
            if run >= min_run:
                return (i - run + 1) * 5
        else:
            run = 0
    return -1


def clean_onset(solo, sr, word):
    """The canonical template with af_heart's utterance-initial blob removed:
    for an unvoiced-initial word, everything before the first sustained
    frication run goes; for a voiced-initial word the blob fuses with the
    onset, so a fixed 100 ms (the measured blob range) goes instead."""
    s0, s1, _, _ = wc.speech_span(solo, sr)
    core = solo[s0:s1]
    cls = onset_class(word)
    if cls == "fricative":
        lead = lead_voiced_ms(core, sr)
        if lead > 30:
            return core[int(lead / 1000 * sr):]
        return core
    if cls == "stop":
        # voicing sees a stop onset only sometimes: clap's first measurable
        # unvoiced run is its final p (485 ms in), twin's blob hides below
        # the energy floor. Use the measured lead only when it is sane;
        # otherwise strip the measured blob range.
        lead = lead_voiced_ms(core, sr)
        if 30 < lead <= 250 and (len(core) / sr * 1000 - lead) >= 250:
            return core[int(lead / 1000 * sr):]
        return core[int(0.1 * sr):]
    return core[int(0.1 * sr):]


def word_islands(a, sr, min_ms=80, merge_ms=90):
    """Loud runs of min_ms or more, merging dips shorter than merge_ms.

    A word is one island even when its own inside dips: "dogs" is a vowel and
    then a /z/, "beds" a vowel and then /dz/, and a plain loud-frame count
    reads each as two. That made the gate refuse every located cut of those
    words while their TEMPLATES - front-trimmed by clean_onset - read as one,
    so the owner was offered only the frames that never win (batch 11: dogs,
    beds, lids). A neighbouring WORD is separated by a longer gap than a
    word's own internal dip, so merging short dips refuses neighbours and
    accepts words. Same rule the sound gate already uses.
    """
    _, _, db, n = wc.speech_span(a, sr)
    hop_ms = 1000 * n / sr
    need = max(1, int(min_ms / hop_ms))
    loud = db > -22
    runs, start = [], None
    for i, v in enumerate(loud):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= need:
                runs.append([start, i])
            start = None
    if start is not None and len(loud) - start >= need:
        runs.append([start, len(loud)])
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * hop_ms < merge_ms:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return len(merged)


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
    nuc = word_islands(cut, sr)
    solo_nuc = max(1, word_islands(solo, sr))
    ratio = (len(cut) / sr) / max(1e-6, len(solo) / sr)
    if d > 0.34:  return False, f"content differs (dtw {d:.2f})", d
    if nuc > solo_nuc: return False, f"extra syllable island ({nuc} vs {solo_nuc})", d
    if ratio > 1.45: return False, f"too long ({ratio:.2f}x)", d
    if ratio < 0.72: return False, f"clipped ({ratio:.2f}x)", d
    return True, "ok", d


def _self_test():
    """Controls for word_islands, on synthetic audio so anyone can run them.

    E5: a counter that is only ever shown clean input looks identical to a
    counter that always answers 1. Each case names the fault it catches.
    The real-audio calibration is recorded in docs/settled.md: against the
    owner-refused silk and slip arms of batch 8 this counter refuses 8 of 8
    and 8 of 8, and it un-refuses dog and bell, whose own internal dip the
    old loud-frame count read as a second word.
    """
    sr = 24000
    def tone(ms):
        t = np.arange(int(sr * ms / 1000)) / sr
        return (0.5 * np.sin(2 * np.pi * 200 * t)).astype(np.float32)
    def gap(ms):
        return np.zeros(int(sr * ms / 1000), np.float32)
    cases = [
        ("one plain word", np.concatenate([gap(50), tone(250), gap(50)]), 1,
         "a single loud run is one island"),
        ("a word with its own dip", np.concatenate(
            [gap(50), tone(200), gap(50), tone(150), gap(50)]), 1,
         "dog's /g/ closure and bell's held /l/ must not read as a second word"),
        ("a neighbouring word", np.concatenate(
            [gap(50), tone(200), gap(150), tone(200), gap(50)]), 2,
         "the fault the gate exists for: a smuggled second word must still be seen"),
        ("two neighbours", np.concatenate(
            [gap(50), tone(150), gap(150), tone(150), gap(150), tone(150)]), 3,
         "counting does not saturate at two"),
        ("a click is not a word", np.concatenate(
            [gap(50), tone(20), gap(150), tone(250)]), 1,
         "a run shorter than 80 ms is noise, not an island"),
        ("a quiet gap is still a gap", np.concatenate(
            [gap(50), tone(200), 0.01 * tone(150), tone(200), gap(50)]), 2,
         "room tone between two words is quiet, not silent: a loudness floor "
         "loose enough to call it speech joins every neighbour to its word"),
    ]
    bad = 0
    for name, a, want, why in cases:
        got = word_islands(a, sr)
        mark = "ok  " if got == want else "FAIL"
        if got != want:
            bad += 1
        print(f"{mark} {name}: {got} island(s), expected {want} — {why}")
    # The counter must be able to fail. If a stub that always answers 1 also
    # passes these cases, they prove nothing about the shipped counter.
    stub = lambda a, sr, **k: 1
    stub_passes = all(stub(a, sr) == want for _, a, want, _ in cases)
    if stub_passes:
        print("FAIL control: an always-1 stub passes every case, so they test nothing")
        bad += 1
    else:
        print("ok   control: an always-1 stub fails these cases")
    print(f"\nverify.py word_islands controls: {len(cases) + 1 - bad} passed, {bad} failed")
    return 1 if bad else 0


if __name__ == "__main__":
    import sys
    if "--self-test" in sys.argv:
        raise SystemExit(_self_test())
    raise SystemExit("usage: python3 tools/verify.py --self-test")
