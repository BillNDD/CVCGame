# The default voice pack

This document follows the Microsoft Writing Style Guide.

The app speaks through voice packs (SPEC section 5a). The default pack ships with the app in
`app/public/voice/`: one mp3 clip for every bank word, the carrier stems, the praise
sentences, the invitation leads, and the session-end lines, plus `manifest.json` with each
clip's file and duration. Gate G13 fails the build when the pack does not cover the engine's
clip inventory, so the bank can never grow past its voice.

## How the pack was made

The clips are rendered by a build tool on a developer machine. The model never ships; the
app carries only the audio files.

- Model: Kokoro-82M (Apache-2.0 weights), full-precision ONNX, voice `af_heart`.
- The recipe lives at the top of `tools/render-voice-pack.py`, with the reason for every
  number. Sentences render at speed 1.0 and words at 0.85, each clip gets 80 ms of silence
  in front and 300 ms behind, and the mp3s are 96 kbps. Every value was set by a person
  listening, over seven rounds on 26 and 27 July 2026.
- The recipe travels inside `manifest.json`, and gate G13 compares it with the approved
  values. A pack rendered with different settings fails the build, because nothing automatic
  can hear whether a word is right.
- Two-letter words render from an explicit pronunciation, not from their spelling: the
  synthesiser read "am" as the letter M. So do "tap" and "sip", which arrived as "uh tap"
  and "zip". Three words — cub, hip and dish — have the end of their speech trimmed, because
  the synthesiser adds a small extra syllable after a final plosive.
- One praise sentence renders from an explicit pronunciation for the same reason: "You read
  that word all by yourself!" was spoken with "read" as in "reed". G13 fails the build if a
  sentence containing a word with two pronunciations is left to the synthesiser.
- Known imperfect, waiting for the next listening round: cup, rub, jug, pop, hop, hen. Each
  ends with an extra sound a listener can hear and no automatic check can.
- The clip list comes from the live engine, never from a hand-kept list.

## To re-render (after the word bank grows)

```
python3 -m venv kokoro-env && kokoro-env/bin/pip install kokoro-onnx lameenc
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
node tools/extract-engine.mjs
node -e "import('./src/engine.js').then(m => console.log(JSON.stringify(m.voiceScript())))" > script.json
kokoro-env/bin/python tools/render-voice-pack.py script.json kokoro-v1.0.onnx voices-v1.0.bin app/public/voice
```

The renderer writes a review sheet (`app/public/voice-review.csv`) and flags any clip with a
suspicious duration. Listen to flagged clips before committing. Run `npm run gauntlet` — G13
verifies the result.

## How playback works

The app plays clips through one Web Audio context that the first real tap unlocks (Begin
Session, Start Recording, a result control, or replay). Clips load with `fetch` and decode
before any sound: if any part of an utterance cannot decode or play, the whole utterance
falls back to system speech, so the child never hears praise without its word. Media
elements are never used, which keeps iPadOS autoplay rules and service-worker caching out
of the picture.

## Licensing

Kokoro's weights are Apache-2.0 and its training data is permissively sourced, so the
rendered audio ships freely with this MIT-licensed game. The GPL phonemizer inside the
rendering stack runs only on the developer machine; no part of it ships.
