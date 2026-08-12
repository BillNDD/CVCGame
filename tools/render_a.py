# The word "a", and the trap that nearly shipped inside it.
#
# "a" is the last word the sentence plan lacks. It has never been rendered in
# any round. Batch 3 carried it as a word card with six arms, and FOUR OF THOSE
# SIX SAY THE LETTER NAME — which S4 forbids the app from ever saying.
#
# The phonemiser settles it without an ear, and this is why the check is worth
# more than a careful listen:
#
#   "a"                        -> eɪ            the letter name, "ay"
#   "a."                       -> eɪ
#   "Listen—a."                -> lɪsən eɪ
#   "The printed word is “a”." -> ðə pɹɪntᵻd wɜːd ɪz eɪ
#   "Say a."                   -> seɪ eɪ
#   "a. a."                    -> ɐ eɪ          only the FIRST one is the word
#   "a cat"                    -> ɐ kæt         the word
#   "It is a cat."             -> ɪɾ ɪz ɐ kæt
#
# An isolated English article IS the letter name. Every carrier that ends on
# "a" therefore renders "ay", and every carrier that keeps a noun after it
# renders the schwa. This is not a preference: a clip that says "ay" teaches a
# child that this squiggle says the name of the letter, which is the one thing
# the whole sound library exists to avoid.
#
# CUTTING FROM A CARRIER DOES NOT WORK FOR THIS WORD, and that is measured
# rather than assumed. Six cut arms were built from the front of "a cat",
# "a bag", "a big red cat" and two longer carriers, and every survivor was a
# PHRASE: 670, 640, 900 and 1110 ms of speech against 330 ms for the same word
# rendered from its sound. An article cliticises onto the noun after it — there
# is no gap in "a cat" to cut at — so the island the cut lands on is the whole
# phrase, and the loud-run check cannot see it because the merge that stops a
# word's own dip reading as two words also joins the article to its noun. This
# is round 10's fault wearing a different coat: "the cut never cut". Every cut
# family is therefore excluded, and the guard below refuses any arm whose
# speech runs past what the sound itself can occupy, so the mistake cannot be
# made again quietly.
#
# What remains is the explicit schwa, rendered at a spread of speeds, plus the
# approved schwa from the sound library as a labelled REFERENCE — not a
# candidate, so the owner can hear what the game already says for this sound
# and judge whether the word should match it.
#
# Usage: python render_a.py <out_dir>
import base64
import hashlib
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "tools"))
VOICE = "af_heart"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10
SCHWA = "ɐ"

# Two families, and no third. Anything that puts "a" last is excluded by
# construction rather than rendered and screened out afterwards.
PHONEME_ARMS = [                      # (id, note, speed)
    ("a_p70", "the uh sound, slow", 0.70),
    ("a_p80", "the uh sound", 0.80),
    ("a_p85", "the uh sound, bank speed", 0.85),
    ("a_p95", "the uh sound, quick", 0.95),
    ("a_p105", "the uh sound, quickest", 1.05),
]
# The guard, taken from two measurements rather than invented. The game's own
# approved schwa speaks for 150 ms (d:schwa, 576 ms total less its 120 ms lead
# and 306 ms tail). The shortest contaminated cut — "a cat", where the article
# runs straight into its noun — speaks for 670 ms. 500 ms sits between them
# with room on both sides, and the controls below prove it separates the two.
#
# A first attempt put this at 700 ms, chosen by eye from the arm lengths and
# not from anything. It let "a cat" straight through at 670 ms: the guard
# failed its own control on the very case it was written for. That is why the
# number is derived here and the control runs against real renders.
MAX_SCHWA_MS = 500


def shape(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def islands(a, sr, floor_db=-32.0, min_ms=60, merge_ms=90):
    """Loud runs, merging dips shorter than merge_ms — the same shape as the
    project's word gate, which exists so a word's own inside dip does not read
    as a second word."""
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    loud = db > floor_db
    runs, i = [], 0
    while i < len(loud):
        if loud[i]:
            j = i
            while j < len(loud) and loud[j]:
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
    return [r for r in merged if (r[1] - r[0]) * 10 >= min_ms], n


def speech_ms(a, sr, floor_db=-45.0):
    """How long the arm actually SPEAKS for, ignoring its padding. Counting
    islands is not enough on its own: "a cat" is one island, because the merge
    that stops a word's inside dip reading as two words also joins an article
    to its noun. Length is what separates a sound from a phrase."""
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    return 0 if not len(on) else int((int(on.max()) - int(on.min()) + 1) * 10)


def self_test():
    """The guard must refuse a phrase and accept the sound. Both cases are real
    renders, not fixtures: the phrase is the exact carrier whose cut fooled the
    island check on 2026-08-12."""
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))
    sound, sr = k.create(SCHWA, voice=VOICE, speed=0.85, lang="en-us", is_phonemes=True)
    slowest, srs = k.create(SCHWA, voice=VOICE, speed=0.70, lang="en-us", is_phonemes=True)
    phrase, sr2 = k.create("a cat", voice=VOICE, speed=0.85, lang="en-us")
    longer, sr3 = k.create("a big red cat", voice=VOICE, speed=0.85, lang="en-us")
    a_ms = speech_ms(np.asarray(sound, np.float32), sr)
    s_ms = speech_ms(np.asarray(slowest, np.float32), srs)
    p_ms = speech_ms(np.asarray(phrase, np.float32), sr2)
    l_ms = speech_ms(np.asarray(longer, np.float32), sr3)
    checks = [
        (f"the schwa at bank speed is {a_ms} ms and passes the {MAX_SCHWA_MS} ms guard", a_ms <= MAX_SCHWA_MS),
        (f"the slowest arm offered is {s_ms} ms and still passes", s_ms <= MAX_SCHWA_MS),
        (f'"a cat" is {p_ms} ms and is REFUSED — the shortest phrase that fooled the island check', p_ms > MAX_SCHWA_MS),
        (f'"a big red cat" is {l_ms} ms and is REFUSED', l_ms > MAX_SCHWA_MS),
        ("the schwa is one island", len(islands(np.asarray(sound, np.float32), sr)[0]) == 1),
        ("control: the island count alone cannot tell a sound from a phrase",
         len(islands(np.asarray(phrase, np.float32), sr2)[0]) == 1),
    ]
    for name, passed in checks:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in checks if not p)
    print(f"\nrender_a controls: {len(checks) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))

    import phonemizer                       # reachable only after Kokoro loads
    def says_letter_name(t):
        return "eɪ" in phonemizer.phonemize([t], language="en-us", backend="espeak")[0]

    # The control that gives the whole field its meaning: prove the phonemiser
    # really does split these two ways, so "excluded by construction" is a fact
    # and not a claim.
    bad, good = "Listen—a.", "It is a cat."
    assert says_letter_name(bad), "the letter-name check found nothing in " + bad
    assert not says_letter_name(good), "the letter-name check fired wrongly on " + good
    print(f'control: "{bad}" says the letter name, "{good}" does not — the check discriminates\n')

    arms, rejected = [], []
    for aid, note, speed in PHONEME_ARMS:
        audio, sr = k.create(SCHWA, voice=VOICE, speed=speed, lang="en-us", is_phonemes=True)
        audio = np.asarray(audio, np.float32)
        runs, _ = islands(audio, sr)
        if len(runs) != 1:
            rejected.append((aid, f"{len(runs)} islands, expected one")); continue
        spoken = speech_ms(audio, sr)
        if spoken > MAX_SCHWA_MS:
            rejected.append((aid, f"{spoken} ms of speech — too long to be one sound")); continue
        mp3, ms = encode(shape(audio, sr), sr)
        arms.append({"id": aid, "family": note, "ms": ms,
                     "b64": base64.b64encode(mp3).decode(),
                     "sha": hashlib.sha256(mp3).hexdigest()})
        print(f"  {aid}: {ms:4} ms  {note}")

    # The approved schwa from the sound library, so the owner can hear what the
    # game already says for this sound beside the candidates. Labelled
    # REFERENCE on its own face: build_page.py marks any family beginning with
    # that word, because on round 16 a blind label let a non-shippable arm be
    # chosen.
    ref = REPO / "app" / "public" / "voice" / "d-schwa.mp3"
    if ref.exists():
        arms.append({"id": "a_ref", "family": "REFERENCE — the approved schwa sound the game already uses",
                     "ms": 576, "b64": base64.b64encode(ref.read_bytes()).decode(),
                     "sha": hashlib.sha256(ref.read_bytes()).hexdigest()})
        print("  a_ref:  576 ms  REFERENCE, the approved schwa sound (not a candidate)")

    shas = {a["sha"] for a in arms}
    if len(shas) != len(arms):
        raise SystemExit("refused: two arms are the same file — round 8's fault, never again")
    if rejected:
        print("\nrefused before anyone listened:")
        for aid, why in rejected:
            print(f"  {aid}: {why}")

    (OUT / "batch-data.json").write_text(json.dumps({
        "title": "The word “a” — the last word the sentence plan lacks",
        "tally": (f"{len(arms)} arms, blind, all distinct files. Every arm is the SCHWA, "
                  "the sound “a” makes inside a sentence. Arms that would have said the "
                  "letter name “ay” were refused before rendering: an isolated English "
                  "article is the letter name, so every carrier ending on “a” says it, "
                  "and S4 forbids the app ever saying a letter name."),
        "items": [{"kind": "word", "text": "a",
                   "note": "12 of batch 3's 32 sentences need this word",
                   "arms": arms}]}).replace("\\u", "\\u"))
    print(f"\nwrote {OUT / 'batch-data.json'}: {len(arms)} arms, {len(rejected)} refused")
