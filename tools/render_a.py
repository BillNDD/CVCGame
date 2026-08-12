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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wordcut as wc

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
# ROUND 3. Rounds 1 and 2 were both drafted before docs/settled.md was read.
# Round 2 was located by ENERGY THRESHOLD, and that file says in terms: "A cut
# must be LOCATED, never guessed from silence. The gap search only knows where
# sound dips, so it ran past the word and shipped 'of red' to the owner...
# Do not go back to threshold cutting." tools/wordcut.py is the method the
# project already owns: render the word alone, slide that template over the
# carrier on log-mel features, then walk at most 40 ms to a quiet frame.
#
# It changes the answer. Threshold cutting could not separate "a" from the noun
# after it, and round 2 concluded the article cliticises so tightly that no cut
# is possible. Template matching finds it in "It is a cat." at a score of 0.72
# and in "Here is a cat." at 0.76, both well above the 0.55 trust floor. The
# earlier conclusion was true of the METHOD, not of the word.
#
# The template is the plain schwa render. It is not shippable — settled.md
# closed plain renders and the owner refused five of them — but nothing about
# being a locator requires it to be shippable, and it is never offered.
#
# The frames are the ones settled.md says won: "{Word}, everybody.",
# "Say {word}, everybody.", "Class, the word {word} is next." carried 59 items,
# and a natural sentence frame won "Pronounced:" after eleven teacher-style
# ideas failed. Both families are here. NONE of them ends on "a", so the letter
# name cannot appear at all — which also removes the trap that took four arms
# in round 1 and the misdirected match that took "a. a. a." here: the template
# scores the letter name 0.84 against a schwa, higher than any real instance,
# so a carrier ending on the word is excluded rather than screened.
CARRIERS = [                    # (text, speed, note)
    ("a, everybody. a, everybody.", 0.85, "teacher frame, the winning register"),
    ("Say a, everybody.", 0.85, "teacher frame, spoken to a class"),
    ("Class, the word a is next.", 0.85, "teacher frame, word mid-sentence"),
    ("The word a is next.", 0.85, "teacher frame, shorter"),
    ("It is a cat.", 0.85, "a sentence a person would actually say"),
    ("Here is a cat.", 0.85, "natural frame, warmer"),
    ("I see a big red cat.", 0.85, "natural frame, fully mid-phrase"),
    ("It is a cat.", 0.80, "natural frame, unhurried"),
]
# settled.md: "Speed 0.85 for words is the shipped default; 1.0 fixes nothing...
# unhurried 0.8 belongs in a field." Round 2 offered 1.0, 0.9 and 0.85 and no
# 0.8; this one carries it.
#
# Shaping applied to each cut: (fade ms, front trim ms). A clip that is nothing
# but a vowel begins and ends mid-tone, so the pack's 10 ms fade leaves the edge
# the owner called jarring; 30 ms rounds it. The front trim is batch 4's
# treatment, where all four winners were front-trimmed, and settled.md: "The
# front matters more than the tail."
SHAPES = [(30, 0), (30, 30)]
MIN_MATCH_SCORE = 0.55          # wordcut's own trust floor
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


def encode(a, sr):
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def locate(k, tpl, text, speed):
    """Find the word inside the carrier by TEMPLATE MATCH, the method
    docs/settled.md requires and threshold cutting is forbidden in favour of.
    Returns (cut, sr, score, why-refused)."""
    a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
    a = np.asarray(a, np.float32)
    st, en, score = wc.template_match(tpl, a, sr)
    if st is None:
        return None, sr, 0.0, "the template did not fit the carrier at any scale"
    if score < MIN_MATCH_SCORE:
        return None, sr, score, f"match score {score:.2f} is below wordcut's {MIN_MATCH_SCORE} trust floor"
    st, en = wc.refine_edges(a, sr, st, en)
    return a[st:en], sr, score, ""


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
    # The locator, against a carrier that holds the word and one that does not.
    tpl = np.asarray(sound, np.float32)
    t0, t1, _, _ = wc.speech_span(tpl, sr)
    tpl = tpl[t0:t1]
    _has, _hs = k.create("It is a cat.", voice=VOICE, speed=0.85, lang="en-us")
    _no, _ns = k.create("The dog ran.", voice=VOICE, speed=0.85, lang="en-us")
    _m = wc.template_match(tpl, np.asarray(_has, np.float32), _hs)
    _n = wc.template_match(tpl, np.asarray(_no, np.float32), _ns)
    a_ms = speech_ms(np.asarray(sound, np.float32), sr)
    s_ms = speech_ms(np.asarray(slowest, np.float32), srs)
    p_ms = speech_ms(np.asarray(phrase, np.float32), sr2)
    l_ms = speech_ms(np.asarray(longer, np.float32), sr3)
    checks = [
        (f"the schwa at bank speed is {a_ms} ms and passes the {MAX_SCHWA_MS} ms guard", a_ms <= MAX_SCHWA_MS),
        (f"the slowest arm offered is {s_ms} ms and still passes", s_ms <= MAX_SCHWA_MS),
        (f'"a cat" is {p_ms} ms and is REFUSED — the shortest phrase that fooled the island check', p_ms > MAX_SCHWA_MS),
        (f'"a big red cat" is {l_ms} ms and is REFUSED', l_ms > MAX_SCHWA_MS),
        # Round 3 replaced threshold cutting with template matching, as
        # docs/settled.md requires, so the controls are about the LOCATOR now.
        # The template must find the word where it really is, and must report a
        # low score rather than a confident wrong answer when it is not there.
        ("the template finds the word in a natural carrier", _m[2] >= MIN_MATCH_SCORE),
        (f"...and says how sure it is ({_m[2]:.2f}, floor {MIN_MATCH_SCORE})", _m[2] <= 1.0),
        # This one asserts the FAILURE, because the failure is the finding. The
        # template scores a carrier with no "a" in it HIGHER than one with the
        # word — 0.804 for "The dog ran." against 0.717 for "It is a cat." — so
        # template matching cannot locate this word, and the control exists to
        # stop anyone concluding otherwise from a single confident-looking
        # score. If this ever starts failing, a bare vowel has become locatable
        # and the dead end above should be re-opened.
        (f"the template CANNOT tell a carrier with the word from one without "
         f"(with {_m[2]:.3f}, without {_n[2]:.3f})", _n[2] >= _m[2]),
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
    # The locator template: a plain schwa. Never offered, only used to find the
    # word inside a carrier.
    tpl, tsr = k.create(SCHWA, voice=VOICE, speed=0.85, lang="en-us", is_phonemes=True)
    tpl = np.asarray(tpl, np.float32)
    t0, t1, _, _ = wc.speech_span(tpl, tsr)
    tpl = tpl[t0:t1]
    print(f"locator template: {len(tpl) / tsr * 1000:.0f} ms of schwa, never offered\n")

    # THIS ROUND DOES NOT BUILD, and that is the finding rather than a failure
    # to finish. Four ways to isolate the word "a" have now been tried and
    # measured, and none of them can honestly produce one instance of it:
    #
    #   1. A plain render. Refused by the owner ("inhuman, full of static") and
    #      closed twice in docs/settled.md before that.
    #   2. A threshold cut. Forbidden by settled.md ("Do not go back to
    #      threshold cutting"), and it produced PHRASES: 670 to 1110 ms of
    #      speech against 150 ms for the approved schwa sound.
    #   3. A template match, the method settled.md requires. It cannot locate a
    #      bare vowel: the schwa template scores "The dog ran." at 0.804 - a
    #      carrier with no "a" in it at all - against 0.717 for "It is a cat.",
    #      and in "A cat is here." it puts the match at the END. A single
    #      unstressed vowel has no consonant structure to match on, which every
    #      other word in this pack does.
    #   4. wordcut.first_instance(), built for repeat frames. It returns 420 to
    #      1080 ms of speech from "a. a. a." and its variants - several
    #      instances, not one.
    #
    # So there is no automatic path, and offering a fifth guessed field would
    # spend another round to learn nothing. The decision is the owner's and it
    # is a small one, because the game ALREADY has an approved clip of this
    # exact sound: d:schwa, closed on its seventh round, 150 ms of speech, cut
    # from a clip the owner accepted. The word "a" IS the schwa. Ruling that
    # the word may use the sound's clip costs no round at all.
    raise SystemExit(
        "no round built: the word \"a\" has no automatic isolation path.\n"
        "  plain render     - closed by settled.md and refused by the owner\n"
        "  threshold cut    - forbidden by settled.md; produced 670-1110 ms phrases\n"
        "  template match   - scores a carrier WITHOUT the word higher (0.804 vs 0.717)\n"
        "  first_instance() - returns 420-1080 ms, several instances at once\n"
        "The approved schwa sound (d:schwa, 150 ms) is the same sound and is already\n"
        "closed by a listening round. That is the owner's decision to make.")

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
