# Does this clip contain the target SOUND, and nothing else?
#
# Sound round 2 (2026-08-10) offered "the sound + a long piece of a sentence"
# on card after card, because the sound generator cut donors at blind
# fractions and verified nothing - the fourth form of the content-not-length
# mistake (docs/settled.md). This gate is the sound-round counterpart of
# verify.py, and the rule it enforces is the settled one: a round tool must
# not render its first candidate until it can verify one.
#
# The template MUST be the sound rendered alone from its explicit phonemes -
# never a candidate's own render (a gate that compares a thing to itself
# proves nothing). What calibration taught, and the checks it left:
#
#   - DTW against a single-phoneme template is a WEAK check: a vowel
#     template has almost no internal structure, so a three-syllable slice
#     of "everybody" matched aI at dtw 0.086 - better than the accepted
#     long_a clip matched its own template. DTW stays as a coarse content
#     screen; it must never carry the verdict alone.
#   - The load-bearing check for voiced sounds is the MAJOR-ISLAND count:
#     loud runs of 80 ms or more. Every accepted sound has exactly one
#     (an r-coloured vowel may trail a 40-50 ms blip, under the bar); every
#     sentence slice has two or more runs of 150 ms and up, whatever its
#     DTW says.
#   - The load-bearing checks for unvoiced sounds (th_quiet, ch) are the
#     voicing metrics: the LOW-BAND fraction of the normalized features
#     (accepted f 0.161, s 0.162, ch 0.170; anything smuggling a vowel sits
#     at 0.21+; ceiling 0.19) and the VOICED-RATIO of energetic raw frames
#     (accepted 0.00-0.22; vowel-bearing slices 0.63-1.00; ceiling 0.35).
#     This is what round 2 could never catch: slices of "with thin things"
#     matched the th template by DTW while carrying whole voiced words.
#     Kokoro cannot render a lone unvoiced phoneme at all - its θ is a
#     voiced "thuh" (raw low-band 0.80) - so unvoiced templates and arms
#     are pulled from renders and donors with unvoiced_run().
#
# Calibrated 2026-08-10 against controls, per the settled rule that a
# validation not run against its own controls is not a validation: the 15
# af_heart-derived accepted sounds (P45 ship review + sound round 2 winners)
# all pass, and round 2's recreated wreckage - mid-fraction and tail slices
# of teacher sentences, and whole sentences, seven target sounds - is all
# refused. The calibration run lives with the round workspace and must pass
# before a generator imports this module.
import numpy as np

import verify as V
import wordcut as wc


def core(a, sr):
    """Strip padding and silence to the speech span - accepted clips are
    stored as padded artefacts, and the gate judges content, not padding."""
    s0, s1, _, _ = wc.speech_span(a, sr)
    return a[s0:s1]


def major_islands(a, sr, min_ms=80):
    """Count loud runs of min_ms or more. One sound has one, however it
    sags mid-way; a smuggled neighbouring word or syllable is a second."""
    _, _, db, n = wc.speech_span(a, sr)
    hop_ms = 1000 * n / sr
    need = max(1, int(min_ms / hop_ms))
    loud = db > -22
    count, cur = 0, 0
    for v in loud:
        if v:
            cur += 1
        else:
            if cur >= need:
                count += 1
            cur = 0
    if cur >= need:
        count += 1
    return count


def _frame_power(a, sr, hz=1000):
    """Per 5 ms frame: (raw power fraction below hz, energy in dB rel max).
    The fraction is a physical voicing proxy - frication sits near zero, a
    vowel well above - but it is only meaningful on frames with real energy:
    near-silent frames read as rumble."""
    hop, win = int(sr * 0.005), int(sr * 0.025)
    if len(a) < win + hop:
        return np.zeros(1, np.float32), np.zeros(1, np.float32)
    w = np.hanning(win).astype(np.float32)
    frames = np.stack([a[i:i + win] * w for i in range(0, len(a) - win, hop)])
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    f = np.fft.rfftfreq(frames.shape[1], 1 / sr)
    tot = spec.sum(axis=1)
    lo = spec[:, f < hz].sum(axis=1)
    db = 10 * np.log10(np.maximum(tot, 1e-12) / max(float(tot.max()), 1e-12))
    return (lo / (tot + 1e-12)).astype(np.float32), db.astype(np.float32)


def voiced_ratio(a, sr):
    """Of the frames that carry real energy (within 30 dB of the loudest),
    the fraction that are voiced. Near zero for clean frication; high for
    anything carrying a vowel or a word."""
    lf, db = _frame_power(a, sr)
    m = db > -30
    if not m.any():
        return 1.0
    return float((lf[m] > 0.20).mean())


def unvoiced_run(a, sr):
    """The longest contiguous frication run: frames that carry real energy
    (within 35 dB of the loudest) and are not voiced. This is how a real θ
    or ʧ is pulled out of a render or a donor word - kokoro cannot say a
    lone θ (its render is a voiced 'thuh'; this gate's own metrics proved
    it), but inside a word the frication is real and this finds it. Returns
    None when no run is long enough to be a sound."""
    lf, db = _frame_power(a, sr)
    hop = int(sr * 0.005)
    best, cur = None, None
    for i, (v, e) in enumerate(zip(lf, db)):
        if v <= 0.20 and e > -35:
            cur = [i, i + 1] if cur is None else [cur[0], i + 1]
        else:
            if cur and (best is None or cur[1] - cur[0] > best[1] - best[0]):
                best = cur
            cur = None
    if cur and (best is None or cur[1] - cur[0] > best[1] - best[0]):
        best = cur
    if best is None or (best[1] - best[0]) * hop < 0.06 * sr:
        return None
    return a[best[0] * hop:best[1] * hop]


def voiced_run(a, sr):
    """The longest contiguous VOICED energetic run - the dual of
    unvoiced_run, and the round-5 silence-flank principle generalised: a
    voiced sound is verifiably isolated when its flanks are unvoiced or
    silent, because the join is measurable either way. This is how a vowel
    is pulled out of a word whose consonants are unvoiced (cup: k-ʌ-p,
    push: p-ʊ-ʃ) - including owner-approved pack words, so the vowel comes
    from audio an ear already accepted. Returns None when no run is long
    enough to be a sound."""
    lf, db = _frame_power(a, sr)
    hop = int(sr * 0.005)
    best, cur = None, None
    for i, (v, e) in enumerate(zip(lf, db)):
        if v > 0.20 and e > -30:
            cur = [i, i + 1] if cur is None else [cur[0], i + 1]
        else:
            if cur and (best is None or cur[1] - cur[0] > best[1] - best[0]):
                best = cur
            cur = None
    if cur and (best is None or cur[1] - cur[0] > best[1] - best[0]):
        best = cur
    if best is None or (best[1] - best[0]) * hop < 0.06 * sr:
        return None
    return a[best[0] * hop:best[1] * hop]


def low_band_fraction(a, sr):
    """Energy below ~1 kHz over total energy: near zero for unvoiced
    frication, high for anything carrying a vowel."""
    M = wc.logmel(a, sr)
    if len(M) == 0:
        return 1.0
    E = np.exp(M)          # back to linear-ish energy per mel band
    return float(E[:, :5].sum() / (E.sum() + 1e-9))


def verify_sound(cut, tpl, sr, kind="voiced"):
    """Returns (ok, reason, dist). `cut` is a candidate, `tpl` the canonical
    phoneme render of the sound, both already stripped to speech. `kind` is
    "voiced" for vowels, glide-vowels, r-vowels and voiced frication, and
    "unvoiced" for pure frication and affricates."""
    if len(cut) < 0.06 * sr:
        return False, "too short", 9.9
    if len(cut) > 0.80 * sr:
        return False, f"too long for one sound ({len(cut) / sr:.2f}s)", 9.9
    A = wc.logmel(cut, sr)
    B = wc.logmel(tpl, sr)
    if len(A) < 3 or len(B) < 3:
        return False, "no features", 9.9
    d = V.dtw_distance(A, B)
    ratio = len(cut) / max(1, len(tpl))
    if kind == "unvoiced":
        # frication is elastic in length, so the ratio cap is looser; the
        # voicing checks carry the verdict
        if ratio > 3.5:
            return False, f"too long vs sound ({ratio:.2f}x)", d
        lb = low_band_fraction(cut, sr)
        if lb > 0.19:
            return False, f"voiced content in an unvoiced sound ({lb:.2f})", d
        vr = voiced_ratio(cut, sr)
        if vr > 0.35:
            return False, f"voiced frames in an unvoiced sound ({vr:.2f})", d
        if d > 0.50:
            return False, f"content differs (dtw {d:.2f})", d
        if major_islands(cut, sr) > 1:
            return False, "extra speech around the sound", d
        return True, "ok", d
    if ratio > 2.1:
        return False, f"too long vs sound ({ratio:.2f}x)", d
    if ratio < 0.40:
        return False, f"clipped ({ratio:.2f}x)", d
    if d > 0.32:
        return False, f"content differs (dtw {d:.2f})", d
    nuc = major_islands(cut, sr)
    tpl_nuc = max(1, major_islands(tpl, sr))
    if nuc > tpl_nuc:
        return False, f"extra islands ({nuc} vs {tpl_nuc})", d
    return True, "ok", d
