# Handoff: build the standalone app

This document tells a coding agent what to build. `SPEC.md` is the master source for behavior.
Read `SPEC.md` first. This document gives the work items, the limits, and the acceptance gates.

This document obeys ASD-STE100 Simplified Technical English.

## 1. What is complete

Do not do this work again:

- The game logic and the interface, in one reference file: `reference/word-quest.jsx`.
- 132 words in seven levels, with the schedule engine, the early-exit rules, and the data
  migration from version 2 to version 3.
- Four design reviews and three destructive reviews. All findings are corrected.
- A test suite: `tests/engine.test.js`. The suite has 42 tests. Run `npm test`.
- A mutation gate: `tools/mutants.mjs`. The gate has 28 mutants. Run `npm run test:mutants`.
- An icon set: `icons/`. The set has PNG files, an Apple touch icon, and a Windows ICO file.
- Documents: `SPEC.md`, `README.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore`.

The reference file must stay one file. The file must operate as a chat artifact. The tool
`tools/extract-engine.mjs` makes `src/engine.js` from the reference file. The test suite and the
new app both use the generated module.

## 2. Work items

**W1. Scaffold.** Make a Vite, React, and Tailwind project. Move the interface from the
reference file into components. Import the logic from `src/engine.js`. Do not copy the logic.

**W2. Progressive web app.** Add a manifest, a service worker, and the icons from `icons/`. The
app must operate offline after the first load. A user must be able to install the app on a
Windows desktop and on an iOS home screen. Use these icon files:

- `icon-192.png` and `icon-512.png`: standard icons.
- `icon-maskable-192.png` and `icon-maskable-512.png`: maskable icons.
- `apple-touch-icon.png`: iOS home screen.
- `favicon.ico`, `favicon-16.png`, `favicon-32.png`: browser and desktop shortcut.

**W3. Storage.** Change the storage adapter to IndexedDB. Keep the same one-object schema. Keep
these behaviors from `SPEC.md`, section 7:

- The repair function runs before any other function reads the document.
- Damaged data goes to a separate key. The app does not overwrite it.
- A storage timeout stops all writes for that visit.

Add JSON export and import of the full state.

**W4. Microphone.** Use the standard permission flow. Use `webkitSpeechRecognition` where
necessary. If speech recognition is not available, use adult mode and keep that setting. Design
rule 1 applies in all modes.

**W5. Repository structure.** Use one code base. Put the platform difference in the documents,
not in the code:

```
app/          the Vite project
src/          the generated engine module
tests/        the test suite
tools/        the extractor and the mutation gate
icons/        the icon set
docs/install-windows.md
docs/install-ios.md
reference/    the single-file artifact build
```

Do not make one folder for each platform. Two code bases become different code bases.

**W6. Install documents.** Write `docs/install-windows.md` and `docs/install-ios.md`. Each
document gives the steps to install the app and to make a shortcut. Test each set of steps on a
real device. Write the documents in Simplified Technical English.

**W7. Hosting.** Publish the app with GitHub Pages or an equivalent static host. The app makes
no network calls after the first load.

## 3. Limits

These limits are mandatory. `SPEC.md`, section 1 gives the full list.

- The app never records a wrong result by itself. This applies in all modes, and it applies if
  you add a pronunciation-score service later.
- The child reads the word first. The app does not say the word before the attempt.
- The adult controls need a hold gesture of 450 ms with a pointer. A keyboard operates them
  directly.
- The app makes no network calls. The app has no accounts and no analytics.
- Child controls are 56 px or more. Adult controls are 44 px or more.
- The page does not scroll in a session at standard text sizes. At 200 percent text size, the
  stage can scroll.
- Do not put a personal name in the repository. The name field is a setting.

## 4. Acceptance gates

All gates must pass before you publish:

1. `npm test` gives 42 tests passed.
2. `npm run test:mutants` gives 0 survivors. If you change the engine, add tests until the gate
   is clean again. Do not delete a mutant.
3. Each item in `SPEC.md`, section 10 is complete.
4. The documents obey Simplified Technical English. Keep sentences at 25 words or fewer.
5. No file contains a personal name.
6. The app operates offline. The app installs on Windows and on iOS.

## 5. Device tests

| Device | Test |
|---|---|
| iPad Safari, iPadOS 15.4 or later | Install, offline start, microphone permission, hold gesture |
| iPhone Safari | Layout in portrait and landscape, home-indicator area |
| Windows Chrome or Edge | Install to desktop, icon quality, own window |
| Any browser, 200 percent text | The stage scrolls. No content is cut off |
| Any browser, reduced motion | No animation |

The minimum platform is iPadOS 15.4. Earlier versions do not have `structuredClone`.

## 6. Out of scope

- A cloud pronunciation-score service. `SPEC.md`, section 8, item 4 gives the interface. Make a
  stub only.
- A native iOS application. The progressive web app gives the same functions.
- New words or new levels. Send a proposal first.

## 7. Start prompt

> Read `SPEC.md` and `HANDOFF.md`. Build work items W1 to W7. Import the logic from
> `src/engine.js`. Do not copy the logic into the new components. Run `npm test` and
> `npm run test:mutants` after each change. Both must stay clean. Then check each item in
> `SPEC.md`, section 10, and each gate in `HANDOFF.md`, section 4.
