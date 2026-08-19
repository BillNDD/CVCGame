# Sentence renderer with a SAY/SHOW split, at the pack's sentence speed.
#
# WHY THIS EXISTS. The owner refused three clips on 2026-08-19: "read" was
# spoken as /riːd/ where the sentence means /rɛd/. Level 69 teaches ea=short_e
# and its ONLY word is "read", so the text cannot avoid it, and the literacy
# seat's mitigation - forcing past tense with a third-person subject - guides a
# human reader and tells a text-to-speech voice nothing at all.
#
# So a row may carry a `say` field. The voice is given `say`; the child is shown
# `text`. That is the ordinary way to pronounce a homograph, and it is only
# honest if the difference is RECORDED rather than hidden: every take stores
# both, and a take where they differ also stores `say_reason`. A reader who
# meets one of these rows in a year must be able to see at a glance that the
# bytes do not spell the words on the card, and why.
#
# The trap this must never become: `say` silently editing the sentence into
# something the child never sees. The guard below refuses any `say` that is not
# a pure respelling - same word count, and every differing word is a homograph
# declared in HOMOGRAPHS. A `say` that adds, drops or reorders words is a
# different sentence, and a different sentence needs the owner's ear, not a
# code path.
import json
import pathlib
import sys

import numpy as np
from kokoro_onnx import Kokoro

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1])
VOICE = "af_heart"

# A respelling is legal only for a word listed here, with its legal targets.
HOMOGRAPHS = {
    "read": {"red", "reed"},
    "live": {"liv", "lyve"},
    "wind": {"wynd", "wind"},
    "tear": {"tair", "teer"},
    "bow": {"boh", "bau"},
    "lead": {"led", "leed"},
    "close": {"kloce", "kloze"},
    "use": {"yoos", "yooz"},
}


def check_respelling(text, say):
    """A say-text must be the same sentence, word for word, differing only at
    declared homographs. Returns the list of substitutions made."""
    tw, sw = text.split(), say.split()
    if len(tw) != len(sw):
        raise SystemExit("say has %d words, text has %d - that is a different "
                         "sentence, not a respelling:\n  %s\n  %s" % (len(sw), len(tw), text, say))
    subs = []
    for a, b in zip(tw, sw):
        if a == b:
            continue
        bare_a, bare_b = a.strip(".,!?").lower(), b.strip(".,!?").lower()
        if bare_a not in HOMOGRAPHS or bare_b not in HOMOGRAPHS[bare_a]:
            raise SystemExit("say changes %r to %r, which is not a declared "
                             "homograph respelling:\n  %s" % (a, b, text))
        subs.append("%s->%s" % (bare_a, bare_b))
    return subs


def main():
    batch = json.loads((OUT.parent / "sbatch16-render.json").read_text(encoding="utf-8"))
    texts = batch["accepted"]

    # Self-test BEFORE any render, because a guard that has never refused
    # anything is not a guard (E5).
    ok = 0
    try:
        check_respelling("I read it.", "I read it and more.")
    except SystemExit:
        ok += 1
    try:
        check_respelling("I read it.", "I ate it.")
    except SystemExit:
        ok += 1
    if check_respelling("I read it.", "I red it.") == ["read->red"]:
        ok += 1
    if check_respelling("I sat.", "I sat.") == []:
        ok += 1
    if ok != 4:
        raise SystemExit("the respelling guard failed its own controls (%d of 4)" % ok)
    print("respelling guard: 4 of 4 controls pass", flush=True)

    k = Kokoro(str(REPO / "kokoro-v1.0.onnx"), str(REPO / "voices-v1.0.bin"))
    out = {}
    print("rendering %d texts, one take each" % len(texts), flush=True)
    for row in texts:
        n, text = row["level"], row["text"]
        say = row.get("say", text)
        subs = check_respelling(text, say) if say != text else []
        seq = row.get("seq", 1)
        sid = "s:v3-l%02d-%02d" % (n, seq)
        a, sr = k.create(say, voice=VOICE, speed=1.0, lang="en-us")
        pcm = np.asarray(a, dtype=np.float32)
        ms = int(round(len(pcm) / float(sr) * 1000))
        import io as _io
        import lameenc
        enc = lameenc.Encoder()
        enc.set_bit_rate(96)
        enc.set_in_sample_rate(sr)
        enc.set_channels(1)
        enc.set_quality(2)
        buf = _io.BytesIO()
        buf.write(enc.encode((pcm * 32767).astype(np.int16).tobytes()))
        buf.write(enc.flush())
        import base64
        take = {"id": sid, "family": "sentence_sp1.0", "ms": ms, "text": text,
                "level": n, "kind": row.get("kind", "sentence"),
                "b64": base64.b64encode(buf.getvalue()).decode("ascii")}
        if subs:
            take["say"] = say
            take["say_reason"] = "homograph respelling for the voice: " + ", ".join(subs)
        out[sid] = [take]
        print("  %s  %4d ms  %s%s" % (sid, ms, text[:70], "   [say: " + ", ".join(subs) + "]" if subs else ""), flush=True)

    import io as _io2
    _io2.open(OUT / "sbatch16-audio.json", "w", encoding="utf-8", newline="\n").write(json.dumps(out))
    print("wrote sbatch16-audio.json; %d takes" % len(out))


if __name__ == "__main__":
    main()
