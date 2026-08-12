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
# ROUND 2. The owner refused all five arms of round 1 — "these are all inhuman,
# full of static, jarring intro and outro without rounding" — and named the way
# out: cut it out of a sentence where "a" is read three times in a row.
#
# That works, and the phonemiser says why. "a a a." renders as ɐ ɐ eɪ: only the
# LAST one is the letter name, because only the last one is utterance-final.
# The first two are ordinary unstressed articles, spoken in a real sentence
# with real prosody. "a a a, a a a." gives five clean ones. And unlike "a cat",
# repeated articles have gaps between them, so there is something to cut at.
#
# Round 1 was built entirely from plain phoneme renders. docs/settled.md has
# said since batch 1 that a new word is always cut from a CARRIER and never
# rendered plain — every one of the fifty-six keepers came from a carrier —
# and round 1 offered a field made only of the family that has never won. The
# static and the inhumanity are what a bare synthesised vowel sounds like.
#
# The intro and outro are treated too. The pack's 10 ms fade is tuned for words
# that begin and end on a consonant; a clip that is nothing but a vowel starts
# and stops mid-tone, which is the jarring edge the owner heard. Arms here
# carry longer fades, and some carry a front trim, the treatment that won for
# every one of batch 4's winners.
# The separator matters, and it was measured. "a a a." and "a - a - a." run the
# three together into ONE island at every floor and merge setting tried — there
# is nothing to cut at. "a, a, a." splits into two, not three. Only a FULL STOP
# between them gives three: at a -25 dB floor with a 20 ms merge, "a. a. a."
# breaks into 280, 190 and 280 ms, every one of them inside the guard. So the
# carriers here are stopped, and the island settings below are the ones that
# were shown to work rather than the gate's defaults.
CUT_FLOOR_DB, CUT_MERGE_MS = -25.0, 20
# Each entry is (carrier, which spoken instance, speed, why it is safe). Every
# one was found by sweeping carriers and speeds and keeping only those where
# the ISLANDS the audio breaks into equal the SOUNDS the phonemiser says are in
# it. Where they disagree the instances have partly merged, a cut would be a
# guess, and the guess can be two schwas offered as one word — which is what
# the first attempt at this round was quietly doing for eight of its twelve
# arms.
CARRIERS = [                    # (text, instance, speed, note)
    ("a. a. a.", 0, 1.00, "first of three, bare"),
    ("a. a. a.", 1, 1.00, "middle of three, bare"),
    ("a. a. a.", 1, 0.85, "middle of three, slower"),
    ("Listen. a. a. a.", 1, 1.00, "after a teacher's lead-in"),
    ("Here. a. a. a.", 2, 1.00, "third, after a lead-in"),
    ("Ready. a. a. a.", 1, 1.00, "after a warmer lead-in"),
    ("Now. a. a. a.", 2, 0.90, "third, slower, after a lead-in"),
    ("Listen. a. a. a. a.", 2, 1.00, "third of four, most settled into the rhythm"),
]
# Shaping applied to each cut: (fade ms, front trim ms). A clip that is nothing
# but a vowel begins and ends mid-tone, so the pack's 10 ms fade leaves the
# edge the owner called jarring; 30 ms rounds it. The front trim is batch 4's
# treatment, where all four winners were front-trimmed.
SHAPES = [(30, 0), (30, 30)]
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


def shape(a, sr, fade_ms=FADE_MS, front_trim_ms=0):
    """Round the edges and pad. A clip that is nothing but a vowel begins and
    ends mid-tone, so the 10 ms fade the pack uses for words that start on a
    consonant leaves an audible edge — the "jarring intro and outro" the owner
    heard in round 1. The front trim is batch 4's treatment: all four of its
    winners were front-trimmed."""
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    if front_trim_ms:
        a = a[int(front_trim_ms / 1000 * sr):]
    n = int(fade_ms / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                           np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])


def cut_instance(k, text, index, speed=1.0, expect=None):
    """Take the index-th spoken island out of a carrier, with a margin. The
    carrier must break into MORE islands than the index asks for, and the cut
    itself must hold exactly one — a cut that guessed is a cut nobody can
    trust. The last island of a carrier ending in "a" is never offered: that
    is the letter name."""
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
    a = np.asarray(a, np.float32)
    runs, n = islands(a, sr, floor_db=CUT_FLOOR_DB, merge_ms=CUT_MERGE_MS, min_ms=40)
    if len(runs) <= index:
        return None, sr, f"broke into {len(runs)} island(s), needed more than {index}"
    # The islands must line up with the SOUNDS the phonemiser says are in the
    # carrier. Without this, a carrier whose instances partly merge still hands
    # back a plausible-looking cut, and that cut can be two schwas rather than
    # one - "uh-uh" offered as the word. Counting islands alone cannot see it,
    # and neither can the length guard when two short ones fit inside it.
    if expect is not None and len(runs) != expect:
        return None, sr, (f"{len(runs)} island(s) for {expect} spoken sound(s) - "
                          "they do not line up, so a cut would be a guess")
    if index == len(runs) - 1 and text.rstrip().rstrip(".").endswith("a"):
        return None, sr, "that is the last one, which is the letter name"
    s0, e0 = runs[index]
    m = int(0.060 * sr)
    cut = a[max(0, s0 * n - m):min(len(a), e0 * n + m)]
    got, _ = islands(cut, sr, floor_db=CUT_FLOOR_DB, merge_ms=CUT_MERGE_MS, min_ms=40)
    if len(got) != 1:
        return None, sr, f"the cut holds {len(got)} islands — something came with it"
    return cut, sr, ""


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
    def phonemise(t):
        return phonemizer.phonemize([t], language="en-us", backend="espeak")[0]
    def says_letter_name(t):
        return "eɪ" in phonemise(t)

    # MUST, owner-ruled 2026-08-12: consult what does not work BEFORE the round,
    # not after it comes back "none". tools/round_guard.py reads
    # docs/settled.md and tools/voice-words.csv and refuses what they already
    # closed, and it refuses to run at all if settled.md has stopped saying
    # what a refusal claims it says.
    import round_guard as guard
    missing = guard.check_anchors()
    if missing:
        raise SystemExit("round refused - settled.md and the guard disagree:\n  " + "\n  ".join(missing))
    seen = guard.history("a")
    print(f'round history for "a": ' + (", ".join(f"{f} -> {v}" for f, v in seen.items()) if seen else "none"))
    print(f"docs/settled.md holds {len(guard.closed_notes())} closed claims; "
          "the ones that bear on this round are enforced below\n")

    # The control that gives the whole field its meaning: prove the phonemiser
    # really does split these two ways, so "excluded by construction" is a fact
    # and not a claim.
    bad, good = "Listen—a.", "It is a cat."
    assert says_letter_name(bad), "the letter-name check found nothing in " + bad
    assert not says_letter_name(good), "the letter-name check fired wrongly on " + good
    print(f'control: "{bad}" says the letter name, "{good}" does not — the check discriminates\n')

    arms, rejected = [], []
    n_arm = 0
    for text, index, speed, why in CARRIERS:
        expect = len(phonemise(text).split())
        # Every arm goes through the guard before it is rendered, not after.
        stop = guard.screen([{"word": "a", "carrier": text, "index": index,
                              "instances": expect, "family": why}], phonemise)[1]
        if stop:
            rejected.append((f'"{text}" #{index}', stop[0][1])); continue
        cut, sr, err = cut_instance(k, text, index, speed=speed, expect=expect)
        if cut is None:
            rejected.append((f'"{text}" #{index}', err)); continue
        spoken = speech_ms(cut, sr)
        if spoken > MAX_SCHWA_MS:
            rejected.append((f'"{text}" #{index}', f"{spoken} ms of speech — a phrase, not the word")); continue
        for fade, trim in SHAPES:
            n_arm += 1
            aid = f"a_{n_arm:02d}"
            mp3, ms = encode(shape(cut, sr, fade, trim), sr)
            note = f'{why} · fade {fade} ms' + (f" · front trim {trim} ms" if trim else "")
            arms.append({"id": aid, "family": note, "ms": ms,
                         "b64": base64.b64encode(mp3).decode(),
                         "sha": hashlib.sha256(mp3).hexdigest()})
            print(f"  {aid}: {ms:4} ms ({spoken} ms spoken)  {note}")

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
