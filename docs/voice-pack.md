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
- Word clips render at speed 0.7. Sentence clips render at speed 1.0. The owner approved the
  voice and the speeds by listening to samples (2026-07-26).
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

## Licensing

Kokoro's weights are Apache-2.0 and its training data is permissively sourced, so the
rendered audio ships freely with this MIT-licensed game. The GPL phonemizer inside the
rendering stack runs only on the developer machine; no part of it ships.
