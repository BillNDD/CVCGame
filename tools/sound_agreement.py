# Does the sound-out teach what the word actually says?
#
# THE FAULT THIS ANSWERS (B2). `WORD_SOUND` names an exception for thirteen
# words. The other 419 take the general grapheme mapping, and the general
# mapping is right for almost all of them — cat really is /k/ /a/ /t/. But a
# sweep is a point in time, and the next word that needs an exception, the next
# "was", takes the general rule silently and is wrong. No gate sees it, because
# a wrong sound is still a valid clip id.
#
# Re-sweeping 419 words by ear costs days of the owner's listening, which is
# the wrong price for a guard. So the expectation is DERIVED instead.
#
# HOW. The synthesiser publishes the phoneme string it is about to speak, and
# tools/phoneme_timings.py reads the duration of each one. So for any word we
# have both sides of the comparison without a listener:
#
#   what the sound-out CLAIMS  -> soundIdsFor(word), the tiles a child sees
#   what the voice SAYS        -> the phoneme sequence the model renders
#
# Map each sound id to the phonemes it stands for, line the two up, and a
# disagreement is a word where the tiles and the voice teach different things.
# That is exactly the "was" fault: the screen said "wuz", the tiles played
# /w/ /a/ /s/.
#
# WHAT THIS CANNOT DO, stated because it decides how far to trust a green run.
# It compares the sound-out against WHAT THE SYNTHESISER SAID, not against
# correct English. If the model mispronounces a word consistently, both sides
# agree and both are wrong. It would have caught "was" and "what"; it will not
# catch a word the voice says wrongly in the first place. It is a refusal, not
# a proof — the same rule every other measurement in this project lives by.
#
# Usage:
#   python3 tools/sound_agreement.py            every disagreement in the bank
#   python3 tools/sound_agreement.py --self-test
import json
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "tools"))

# Which phonemes each sound id stands for. Alternatives are separated by "|";
# a sound is satisfied if the voice used any of them. These are the model's own
# symbols (espeak IPA as kokoro's tokenizer emits them), not a phonetics
# textbook's, because the point is to compare like with like.
SOUND_PHONEMES = {
    "short_a": "æ|a", "short_e": "ɛ|e", "short_i": "ɪ|i", "short_o": "ɑ|ɒ|ɔ",
    "short_u": "ʌ|ɐ", "schwa": "ə|ɐ", "long_e": "i|iː", "oo_book": "ʊ|u",
    "b": "b", "ch": "tʃ", "d": "d", "f": "f", "g": "ɡ|g", "h": "h", "j": "dʒ",
    "k": "k", "l": "l", "m": "m", "n": "n", "ng": "ŋ", "p": "p", "qu": "kw",
    "r": "ɹ|r", "s": "s", "sh": "ʃ", "t": "t|ɾ", "th_quiet": "θ", "th_this": "ð",
    "v": "v", "w": "w", "x": "ks", "y": "j", "z": "z",
}


def engine():
    """Every word, its tiles, and the sound ids the reveal will play."""
    out = subprocess.run(
        ["node", "-e",
         "import('./src/engine.js').then(m=>console.log(JSON.stringify("
         "m.LEVELS.flatMap(l=>l.words).map(w=>({w,tiles:m.chunkWord(w),ids:m.soundIdsFor(w)})))))"],
        cwd=REPO, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def spoken(word):
    """The phoneme string the model renders for this word, stress marks and
    length marks removed — they are prosody, not identity."""
    import phoneme_timings as pt
    sess, k, tok = pt._load()
    ph = tok.phonemize(word, lang="en-us")
    return [c for c in ph if c not in "ˈˌː.,!? "]


def compare(row, said):
    """Line the tiles up against the phonemes. Returns a reason, or None when
    they agree. Only a length match is attempted: where the counts differ the
    alignment is a guess, and a guess is not evidence of a fault."""
    ids = [i[2:] for i in row["ids"]]
    want = [SOUND_PHONEMES.get(s) for s in ids]
    if any(w is None for w in want):
        return f"no phoneme recorded for sound {[s for s, w in zip(ids, want) if w is None]}"
    if len(said) != len(want):
        return None                     # counts differ: cannot align without guessing
    bad = [(t, s, p) for t, s, p, w in zip(row["tiles"], ids, said, want)
           if p not in w.split("|")]
    if not bad:
        return None
    return "; ".join(f'tile "{t}" plays {s} but the voice says /{p}/' for t, s, p in bad)


def sweep():
    rows = engine()
    out, skipped = [], 0
    for r in rows:
        said = spoken(r["w"])
        why = compare(r, said)
        if why is None and len(said) != len([1 for _ in r["ids"]]):
            skipped += 1
        if why:
            out.append((r["w"], why, "".join(said)))
    return rows, out, skipped


def self_test():
    """The check must catch a planted disagreement and pass the real ones the
    owner has already ruled on. Without the first half it is decoration; without
    the second it would report every tricky word as a fault."""
    checks = []
    # "was" is the fault this exists for, and it is FIXED: WORD_SOUND makes it
    # short_u and z. Restore the general mapping and the check must object.
    was = {"w": "was", "tiles": ["w", "a", "s"], "ids": ["d:w", "d:short_a", "d:s"]}
    said = spoken("was")
    r = compare(was, said)
    checks.append((f'a "was" with the GENERAL mapping is caught ({r})', r is not None))
    fixed = {"w": "was", "tiles": ["w", "a", "s"], "ids": ["d:w", "d:short_u", "d:z"]}
    r2 = compare(fixed, said)
    checks.append((f'the shipped "was" agrees with the voice', r2 is None))
    # And a plain word must not be reported.
    cat = {"w": "cat", "tiles": ["c", "a", "t"], "ids": ["d:k", "d:short_a", "d:t"]}
    checks.append(("a plain word raises nothing", compare(cat, spoken("cat")) is None))
    for name, ok in checks:
        print(("ok   " if ok else "FAIL ") + name)
    failed = sum(1 for _, ok in checks if not ok)
    print(f"\nsound-agreement controls: {len(checks) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    rows, bad, skipped = sweep()
    print(f"{len(rows)} words checked against what the voice actually says\n")
    for w, why, said in bad:
        print(f"  {w:8} /{said}/   {why}")
    print(f"\n{len(bad)} disagreement(s). {skipped} word(s) could not be aligned "
          "(the tile count and the phoneme count differ) and are not evidence either way.")
