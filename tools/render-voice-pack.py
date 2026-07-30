# Renders the default voice pack (SPEC section 5a) from the engine's clip
# inventory. This is a BUILD TOOL: it runs on a developer machine, and only its
# output (mp3 clips and a manifest) ships with the app. The model never ships.
#
# THE RECIPE BELOW IS OWNER-APPROVED AUDIO. Do not change a number without a
# person listening to the result. Every value was chosen by ear over five
# rounds on 2026-07-27, and each one fixes a fault a human heard:
#
#   LEAD_MS   80  The fault that forced this rebuild. Clips rendered without
#                 leading silence lost their first fraction of a second
#                 somewhere between the file and the speaker: "cat" said "at",
#                 "duck" said "uck", "ship" said "ip", "an" said "n". The audio
#                 is measurably PRESENT in every file - the loss happens at
#                 decode or playback - so silence in front moves the onset out
#                 of the danger zone. 150 ms was tested and is worse for most
#                 words: it adds an audible "uh" before the word. Two words are
#                 the exception; see LEAD_OVERRIDE.
#   TAIL_MS  300  Lets a final consonant release. Without it the p in "up" and
#                 the t in "it" sounded swallowed.
#   FADE_MS   10  Removes the scratch heard at the end of "up" and "us", and
#                 any click at the start.
#   BITRATE   96  Raised from 48 on 2026-07-27 (round 7). A fricative is noise
#                 across the whole frequency range, which is the hardest thing
#                 for a low bitrate to carry: the sh in "dish" arrived slurred.
#                 The listener compared the same clip at both bitrates and chose
#                 96. It doubles the pack, from about 2.4 MB to about 5 MB,
#                 downloaded once.
#   WORD_SPEED 0.85  The floor. 0.80 introduces an audible click; 0.75 and
#                 below distort the vowel ("it" becomes "eee-it", "up" becomes
#                 "uhh-p"). Slower is NOT clearer. Space is clearer, which is
#                 what LEAD_MS and TAIL_MS buy.
#   SENTENCE_SPEED 1.0  Sentences and praise were judged natural as they were.
#
# PHONEMES: two-letter words are the ones a synthesiser mis-reads from
# spelling - it said "m" for "am" and "n" for "an". Giving the pronunciation
# directly fixes that, and for a phonics app it is the honest way round: we
# teach a sound, so we specify the sound. Three-letter words were verified
# correct from spelling and are rendered from spelling.
#
# Usage:
#   node -e "import('./src/engine.js').then(m => console.log(JSON.stringify(m.voiceScript())))" > script.json
#   python tools/render-voice-pack.py script.json kokoro-v1.0.onnx voices-v1.0.bin app/public/voice
#
# Requires: pip install kokoro-onnx lameenc  (see docs/voice-pack.md)
import json
import pathlib
import sys

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

script_path, model_path, voices_path, out_dir = sys.argv[1:5]
VOICE = "af_heart"
BITRATE = 96
WORD_SPEED = 0.85
SENTENCE_SPEED = 1.0
LEAD_MS = 80
TAIL_MS = 300
FADE_MS = 10

# Owner-approved pronunciations, given as phonemes instead of spelling,
# because a synthesiser reads two-letter words as letter names.
#
# NOT a lever for anything else. Measured on 2026-07-27: for a three-letter
# word the phonemiser produces exactly the string written here, and rendering
# from that string gives a sample-for-sample identical result to rendering
# from the spelling. "tap" and "sip" were briefly listed here to fix "uh tap"
# and "zip"; the two renders were byte-identical files, so nothing changed and
# the entries were removed. Only a pronunciation that DIFFERS from the
# phonemiser's own output can change a word - as with the two-letter words,
# where it reads "am" as the letter M, and with the praise sentence below.
PHONEMES = {
    "at": "æt", "an": "æn", "am": "æm", "ax": "æks",
    "in": "ɪn", "it": "ɪt", "if": "ɪf", "is": "ɪz",
    "on": "ɑn", "ox": "ɑks", "up": "ʌp", "us": "ʌs",
}

# A sentence can be mis-read too, and one of them taught the wrong sound.
# "You read that word all by yourself!" was spoken with "read" in the present
# tense - "reed" - to a child who had just read the word. In a phonics app
# that is not a rough edge: it models the wrong pronunciation of a word the
# child is learning. The whole sentence is given as sounds, with that one word
# in the past tense.
SENTENCE_PHONEMES = {
    "p:2": "juː ɹˈɛd ðæt wˈɜːd ˈɔːl baɪ jɔːɹsˈɛlf!",
}
# The two words that needed more room in front, by ear.
LEAD_OVERRIDE = {"am": 150, "an": 150}

# The three words from the spot-check of 2026-07-27, each with the last part of
# its speech removed. The synthesiser ends a word-final plosive with a small
# extra syllable: after the p in "hip" it adds 100 ms of VOICED sound at a
# third of full loudness, which is not a release burst - a listener hears
# "hip-uh". "cub" gets the same, heard as "cub + e". Measured every 20 ms, the
# closure and the release sit at 280-375 ms in "hip" and 340-430 ms in "cub",
# so cutting 130 ms from the end of the speech leaves the consonant and removes
# the syllable. The listener compared cuts of 130, 160 and 185 ms and chose the
# shortest that worked, which is the one that puts the consonant at least risk.
# "dish" is a different fault: its sh runs 260 ms, longer than the sh in "mush",
# and 120 ms shorter was judged right. Nothing else is trimmed - the pace and
# the pronunciation were both ruled out by measurement, and every other word in
# the bank was approved as it is.
TRIM_MS = {"cub": 130, "hip": 130, "dish": 120}
SILENCE_FLOOR_DB = -45  # what counts as the end of the speech, before trimming

# From two blind rounds on 2026-07-27 and 2026-07-28. Every candidate was
# numbered and shuffled, the build of the day was among them, and no two were
# the same file.
#
# PERIOD_WORDS: six words ended in a small extra vowel or a burst of noise.
# A word rendered alone gets no sentence shape and the voice never finishes
# its last consonant; rendered as a sentence, with a full stop after it, it
# does. That beat the current build for five words out of five in round 9.
# The treatment is NOT bank-wide, and that was measured, not assumed: in
# round 10, five words already judged perfect were offered the same way and
# four of the five came back worse. A word that is already right is left alone.
#
# Round 10 also tried cutting the word out of a whole carrier sentence, and
# the listener preferred it for all six. That result CANNOT BE USED as it
# stands: the cut never isolated the word. "Here is the word cup." has no
# silence in it - the quietest moment between words is -26 dB, not the -35 dB
# the cut looks for - so every "cut" candidate was the whole sentence, and the
# listener was judging the word inside it. Their notes said as much ("almost
# perfect when in a sentence"). What it proves is that sentence prosody fixes
# the ending; isolating the word from that sentence is the open problem, and
# no isolation ships until a person has heard it.
# ONSET_TRIM: "tap" arrived as "uh tap". Removing what precedes the first
# burst won its round.
# BRIGHT_HEAD_MS: "sip" arrived as "zip". Taking the low frequencies out of
# the first 70 ms, so the s cannot read as voiced, won its round.
PERIOD_WORDS = {"cup", "rub", "jug", "pop"}
ONSET_TRIM = {"tap"}
BRIGHT_HEAD_MS = {"sip": 70}

# CARRIER_CUT, from round 13 on 2026-07-29, judged 2026-07-30. This is the
# isolation that round 10 could not do and left as the open problem above: the
# word is spoken inside a carrier sentence, which is what gives its ending a
# proper release, and is then cut back out of that sentence.
#
# What makes it work now is the gap search. Round 10 looked for 40 ms below
# -35 dB and "Here is the word cup." never goes that quiet, so the cut never
# cut and the listener was rating whole sentences. These thresholds are per
# word, found by offering a listener candidates at several depths:
#   (carrier sentence, margin kept in front, gap floor dB, gap length ms)
#
# hop: the full stop it used to carry was offered blind as one of four and
# came back "unacceptable, still saying hop + uh" — so PERIOD_WORDS lost that
# word rather than gained a sibling. The comma carrier at 150 ms won at "very
# good"; the same carrier at 100 ms was only "marginally acceptable", and the
# full-stop carrier "ok". The "said twice" carrier is out for hop entirely:
# every version began with the release of the FIRST hop, heard as "an s then
# hop".
# hen: "hen, hen." at 150 ms is the round 12 winner, unchanged, at "almost
# perfect". Round 13 asked whether its remaining fuzz could be trimmed off the
# end. It cannot: trimmed by 60 ms it fell to "marginally acceptable" and by
# 100 ms to "clipped at the end, too quick". The fuzz is not separable from
# the n, so hen ships untrimmed. Do not add a trim here.
CARRIER_CUT = {
    "hop": ("Here is the word, hop.", 150, -20, 20),
    "hen": ("hen, hen.", 150, -30, 40),
}

OUT = pathlib.Path(out_dir)
OUT.mkdir(parents=True, exist_ok=True)

k = Kokoro(model_path, voices_path)
script = json.load(open(script_path))


def trim(audio, ms, sr):
    """Remove the last ms of speech, ignoring the silence the model appends."""
    a = np.asarray(audio, dtype=np.float32)
    n = int(0.01 * sr)
    frames = [a[i:i + n] for i in range(0, len(a) - n, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in frames])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / (rms.max() or 1.0))
    loud = np.nonzero(db > SILENCE_FLOOR_DB)[0]
    end = (int(loud.max()) + 1) * n if len(loud) else len(a)
    return a[: max(0, end - int(ms / 1000 * sr))]


def onset_trim(audio, sr):
    """Remove whatever precedes the word's first burst: the "uh" in "uh tap"."""
    a = np.asarray(audio, dtype=np.float32)
    n = int(0.01 * sr)
    frames = [a[i:i + n] for i in range(0, len(a) - n, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in frames])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / (rms.max() or 1.0))
    loud = np.nonzero(db > -20)[0]
    return a[max(0, (int(loud.min()) - 1) * n):] if len(loud) else a


def brighten_head(audio, sr, ms):
    """Take the low frequencies out of the first ms, so an s at the start
    cannot read as a z. One-pole difference filter, head only."""
    a = np.asarray(audio, dtype=np.float32).copy()
    n = min(int(ms / 1000 * sr), len(a))
    head = a[:n]
    filtered = np.empty_like(head)
    filtered[0] = head[0]
    filtered[1:] = head[1:] - 0.97 * head[:-1]
    a[:n] = filtered
    return a


def carrier_cut(k, text, margin_ms, floor_db, gap_ms):
    """Say the carrier sentence, then keep what follows its last gap, backed
    off by margin_ms so the word's first consonant is not clipped.

    The frame walk here must stay exactly as it is: it reproduces the clips a
    listener approved, and this file's own rule is that a re-render is
    byte-identical to what was heard. The window ends at len(a) - n + 1, not
    len(a) - n as in trim() and onset_trim() above — one frame's difference,
    but it moves the cut."""
    a, sr = k.create(text, voice=VOICE, speed=WORD_SPEED, lang="en-us")
    a = np.asarray(a, dtype=np.float32)
    n = int(0.01 * sr)
    frames = [a[i:i + n] for i in range(0, len(a) - n + 1, n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in frames])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / rms.max())
    end = int(np.max(np.nonzero(db > -45)))
    run, start = 0, 0
    for i in range(end):
        run = run + 1 if db[i] < floor_db else 0
        # a gap only counts if at least 200 ms of speech follows it, so the
        # search cannot settle on a pause inside the word itself
        if run >= max(1, gap_ms // 10) and (end - i) * 10 >= 200:
            start = i + 1
    return a[max(0, start - margin_ms // 10) * n:(end + 1) * n], sr


def shape(audio, lead_ms, sr):
    """Protect the onset, release the ending, remove clicks at both edges."""
    a = np.clip(np.asarray(audio, dtype=np.float32), -1.0, 1.0).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    lead = np.zeros(int(lead_ms / 1000 * sr), dtype=np.float32)
    tail = np.zeros(int(TAIL_MS / 1000 * sr), dtype=np.float32)
    return np.concatenate([lead, a, tail])


manifest = {}
review = ["id,text,ms,source,flag"]
for clip in script:
    cid, text = clip["id"], clip["text"]
    is_word = cid.startswith("w:")
    word = cid[2:] if is_word else None
    phoneme = PHONEMES.get(word) if is_word else SENTENCE_PHONEMES.get(cid)
    spoken = phoneme or (text + "." if word in PERIOD_WORDS else text)
    if word in CARRIER_CUT:
        audio, sr = carrier_cut(k, *CARRIER_CUT[word])
    else:
        audio, sr = k.create(
            spoken,
            voice=VOICE,
            speed=WORD_SPEED if is_word else SENTENCE_SPEED,
            lang="en-us",
            is_phonemes=bool(phoneme),
        )
    if word in ONSET_TRIM:
        audio = onset_trim(audio, sr)
    if word in BRIGHT_HEAD_MS:
        audio = brighten_head(audio, sr, BRIGHT_HEAD_MS[word])
    if word in TRIM_MS:
        audio = trim(audio, TRIM_MS[word], sr)
    pcm16 = (shape(audio, LEAD_OVERRIDE.get(word, LEAD_MS), sr) * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = enc.encode(pcm16.tobytes()) + enc.flush()
    fname = cid.replace(":", "-") + ".mp3"
    (OUT / fname).write_bytes(mp3)
    ms = int(len(pcm16) * 1000 / sr)
    # review flags: a clip under 250 ms is probably crushed; anything over
    # 6 s probably hallucinated a tail
    flag = ""
    if ms < 250:
        flag = "SHORT"
    if ms > 6000:
        flag = "LONG"
    manifest[cid] = {"file": fname, "ms": ms}
    review.append(f'{cid},"{text}",{ms},{"phonemes" if phoneme else "spelling"},{flag}')

# The recipe travels WITH the pack, so the gate can prove which settings
# produced these clips and refuse a re-render nobody listened to.
manifest["__recipe"] = {
    "voice": VOICE, "bitrate": BITRATE, "word_speed": WORD_SPEED,
    "sentence_speed": SENTENCE_SPEED, "lead_ms": LEAD_MS, "tail_ms": TAIL_MS,
    "fade_ms": FADE_MS, "phoneme_words": sorted(PHONEMES), "trim_ms": TRIM_MS,
    "phoneme_sentences": sorted(SENTENCE_PHONEMES),
    "period_words": sorted(PERIOD_WORDS), "onset_trim_words": sorted(ONSET_TRIM),
    "bright_head_ms": BRIGHT_HEAD_MS,
    # every number a listener judged, so a re-render that changes one fails G13
    "carrier_cut": {w: list(v) for w, v in sorted(CARRIER_CUT.items())},
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
pathlib.Path(out_dir + "-review.csv").write_text("\n".join(review) + "\n")
flags = [r for r in review[1:] if r.rstrip().endswith(("SHORT", "LONG"))]
print(f"rendered {len(manifest) - 1} clips to {OUT}; {len(flags)} flagged for review")
for f in flags:
    print("  FLAG", f)
