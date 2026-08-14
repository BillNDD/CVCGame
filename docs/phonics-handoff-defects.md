# Defects inherited from CVCGame — an audit for the PhonicsGame team

**This document owns** the defect list carried over from the phonics handoff, as a historical
record of what arrived broken and what was done about it.
**It does not own** anything found since. A fault discovered in this repository belongs in
`docs/open-faults.md`.

This document is written for an AI coding agent working on PhonicsGame.

PhonicsGame was seeded from CVCGame at commit `b299864` (released as v1.0.0-beta.2). Every
defect below was present in that commit, so unless you have already rewritten the code in
question, **you have inherited all of them**. Each was found in CVCGame after the fork,
mostly through real family testing rather than through the test suite, and each is now fixed
and pinned by a test.

Nothing here is speculative. Each entry gives the mechanism, the observable symptom, the fix,
and the assertion that keeps it fixed. Treat the "acceptance" line as the definition of done.

This document follows the Microsoft Writing Style Guide.

## How to use this

Port the tests before the code. Two of these fixes are interdependent, and applying one
without the others reintroduced the original symptom in CVCGame — twice. The suites that
matter are `tests/safety.test.js` and `tests/recognizer.test.js`. If your app has diverged,
port the *assertions* and let them fail, then make them pass.

Order of work, highest value first: section 1 (the app is unusable on a common device path),
then section 2 (data belonging to the child is silently altered), then sections 3 and 4.

---

## 1. Speech recognition: the child gets trapped, or is told they were wrong when they were right

The inherited `startRec` in `app/src/App.jsx` starts recognition and then trusts the browser
to answer. On several real devices it never does.

### 1.1 A recogniser that never answers traps the child forever

**Mechanism.** In an in-app browser view — a link opened from Messages, Facebook or any
WKWebView — `recognition.start()` succeeds, the microphone indicator appears, and no event
of any kind is ever delivered: no result, no error, no end. The app sits in the listening
phase indefinitely.

**Symptom.** The screen reads "Listening…" and nothing else responds. A child cannot leave.

**Compounding fault.** The inherited `softStop` is
`try { if (recRef.current) recRef.current.stop(); else setPhase("ready"); }`. It depends on
the dead recogniser delivering an end event, so the Stop control does nothing either.

**Fix.** Arm a watchdog when recognition starts. If it fires, stop the recogniser and return
the interface to the ready state yourself, without waiting for any event. Make Stop change
the screen *before* it touches the recogniser, so a dead engine cannot block it.

**Acceptance.** A test whose recogniser fires no events and whose `stop()` is a no-op (and a
variant that throws) must still reach the ready state with a message on screen.

### 1.2 The watchdog must not cut off a slow reader

**Mechanism.** A fixed timeout measures time-to-final-result, not liveness. A five-year-old
sounding out "d… o… g… dog" easily exceeds eight seconds, and the permission sheet on first
use runs inside that window.

**Fix.** Re-arm the watchdog on `onaudiostart`, `onsoundstart` and `onspeechstart`, so it only
fires when the engine shows no sign of life. After any stop, keep a short grace window
(CVCGame uses 2 seconds) during which a late result is still accepted: iOS commonly delivers
the finalised result only *after* `stop()`.

**Acceptance.** A test that lets 7 seconds pass, fires an audio-start event, lets 7 more pass,
and then delivers a correct result must still see that reading confirmed.

### 1.3 Silent failure paths make the record control look dead

**Mechanism.** The inherited `onerror` handles a fixed list of error codes and ends with a
bare `else { setPhase("ready"); }`. The Web Speech specification defines eight error codes.
`network` (which Chrome fires whenever it is offline, and this is an offline-first app) and
`aborted` (which iOS fires readily) both land in that silent branch. The end handler is
equally silent.

**Symptom.** Tapping record produces no sound, no message, and no visible change. The
reported words were "clicking the record button does nothing".

**Why it is invisible.** In the ready phase the message area renders nothing, and after the
first attempt the button already reads "Record again", so the post-failure screen is
pixel-identical to the pre-tap screen.

**Fix.** Every terminal path must leave a message the adult can read, and the message must
persist until the next action rather than living in a toast that clears itself. Handle
`network` with an honest offline message. Escalate: an attempt that produces no event at all
invites one retry; a second switches to adult grading for that visit.

**Acceptance.** Enumerate the full event alphabet — all eight error codes plus result,
no-match and end — fire each one at a live attempt, and assert the visible screen text
*changed* in every case. This is the single highest-value test in the suite.

### 1.4 Events from an abandoned recogniser corrupt the next attempt

**Mechanism.** The inherited `hardStopRec` detaches only `onend`. `onresult` and `onerror`
stay attached on every stopped recogniser, and browsers deliver events after `stop()`.

Three concrete failures, all observed:

1. An adult grades while recognition is live. The stopping recogniser then delivers its
   result, which grades the same word a second time. Both calls run from a closure where the
   word had no first result, so the box arithmetic and the session log both double-count.
2. A recogniser stopped before it captured speech emits a late `no-speech`. That handler sets
   the phase to ready with a plain value, destroying the feedback screen mid-praise. The
   child read the word correctly, saw "Great job", and watched it vanish. The reported words
   were "the game doesn't tell you if you got it right".
3. The child taps Stop then immediately taps Record again. The first recogniser's late end
   event clears the *new* attempt's watchdog and nulls its reference, orphaning a live
   engine that Stop can no longer reach.

**Fix.** Give every handler an identity guard — `if (recRef.current !== rec) return;` — and
detach all handlers when retiring a recogniser. Prefer `abort()` over `stop()` where the
intent is to discard. Use a functional phase update so a stale event cannot move a phase it
does not own.

**Acceptance.** A matrix test: for every way an attempt can end (child stops, adult grades,
session discarded), fire the entire event alphabet at the abandoned recogniser and assert the
screen text is unchanged and no write occurred.

### 1.5 A Stop the child chose is not a microphone fault

**Mechanism.** This one is a trap in the *fix*, not the original code, and it is worth knowing
before you write your own. Once you add failure escalation (1.3), a deliberate Stop looks
exactly like a dead recogniser: quiet end, no result. In CVCGame two quick Stops disabled the
microphone for the whole visit on a perfectly healthy device.

**Fix.** Mark user-initiated stops and treat a quiet end after one as a silent, blameless
return to ready.

### 1.6 Starting an attempt over a live one

**Mechanism.** Tapping Record while a previous recogniser is still closing constructs a second
engine over the first. Depending on the platform this throws (and, if your catch falls back to
adult grading, locks out a working microphone) or fires `aborted` on the new engine, which is
the silent path from 1.3.

**Fix.** Tear down any live attempt at the top of `startRec`, and assign the reference only
after `start()` returns so a throw cannot leave a zombie.

---

## 2. The saved answer mode belongs to the child, not to the browser

**Mechanism.** The inherited code calls `fallbackToParent` on *every* microphone problem, and
`fallbackToParent` writes `settings.mode = "parent"` to storage. It is also called at boot
whenever `SR` is absent, and in the reset and import paths.

**Symptom.** One open in an in-app browser, or one transient failure, permanently hides the
microphone control on that device. The family sees a game that used to listen and now does
not, with no explanation and no obvious way back. This was reported as "sometimes there is no
microphone button for the kid".

**Fix.** Separate the *effective* mode from the *saved* mode. Derive the effective mode at
render time — `SR && !visitBlocked ? saved : "parent"` — and never write it. Only an explicit
permission denial, or an adult's choice in the settings screen, may change what is stored.

**If you have already shipped to a device**, you also need a one-time heal at boot: if the
saved mode is adult-graded, recognition exists, and no marker records a deliberate choice,
restore the microphone once and mark the device. Be honest in your documentation that such a
heal can undo a genuine adult choice made before markers existed. Spend the marker only after
the healed save actually succeeds, or a failed write loses the heal forever.

**Acceptance.** A test that boots without speech recognition, plays a session, and asserts
that no write carries the adult mode.

---

## 3. An installed app keeps running the version it already replaced

**Mechanism.** The service worker is cache-first and calls `skipWaiting()` at install and
`clients.claim()` at activate, but nothing reloads the page. `claim()` re-controls an open
page without re-executing it, so the session that discovers an update still runs the old
bundle. On iOS, tapping a home-screen icon frequently resumes a frozen page rather than
navigating, so a device can serve stale code for days.

**Symptom.** You ship a fix, the deploy is green, and the family still reports the bug. We
lost real time to this: a tester was running a superseded bundle while we hunted a bug we had
already fixed.

**Fix.** Listen for `controllerchange` and reload once — but only when a previous controller
existed, so a first install never reloads, and only at a safe moment. A reload mid-session
takes the screen away from a child and drops the words already read from that session's total,
because grades are persisted per word while the session summary is written only at the end.
CVCGame gates the reload on the current screen and defers until the session ends.

**Acceptance.** A unit test of the decision alone (not the reload): a controller change during
a session must not reload; the same change on the home screen must; and it must fire at most
once.

---

## 4. Documents that promise behaviour the code does not have

**Mechanism.** Our manual QA script instructed a human tester to expect a fallback that the
code never implemented. A person ran the step, read the promise, saw something else, and had
no way to know which was wrong. Counting the steps — which our gate did — cannot catch this.

**Fix.** Bind the words to the code. CVCGame added a gate that reads expected values *out of*
the specification and QA script and checks them against the source: every quoted child-facing
sentence must exist verbatim in the code, and every timing named in prose must equal the
constant. It caught a real drift within a day of being written.

**Acceptance.** Reword one sentence in your specification and confirm the build goes red.

---

## 5. What I could not check, and what to be sceptical about

I do not have access to the PhonicsGame repository. Everything above is stated about the code
you inherited at `b299864`, verified against that tree. Where you have rewritten a subsystem,
the finding may not apply — but the *class* of fault probably still does.

Three cautions from our experience, offered without evidence about your code:

**Your test doubles will lie to you.** Our safety suite was green while the game was broken,
because the fake recogniser's `stop()` politely fired an end event. That single act of
politeness hid the in-app-browser rescue path for an entire release. Write a double that does
nothing unless a test explicitly makes it act.

**Measure coverage on the app, not only on the engine.** Every one of these microphone faults
lived in a file that had no coverage floor at all, because coverage was configured for the
generated engine only. The faults were literally in lines no test had ever executed.

**An audio context and a microphone compete on iOS.** We spent real effort on a wrong theory
here, so treat this as unproven rather than as a finding: our first hypothesis for a silent
microphone was that the Web Audio context, created for the voice pack and never suspended,
was starving the recogniser. Testing disproved it in our case. If you add recorded audio and
recognition starts failing, it is still worth eliminating early.

---

## 6. Fastest way to verify all of this against your own code

Ask your suite these questions. Each maps to a section above.

1. Does any test drive a recogniser that never fires an event, and whose `stop()` does not
   work? (1.1)
2. Does any test fire every one of the eight specified error codes and assert the screen
   changed? (1.3)
3. Does any test fire an event at a recogniser after the attempt it belonged to has ended?
   (1.4)
4. Does any test assert that a visit which cannot listen writes nothing to storage? (2)
5. Does any test cover the update-reload decision separately from the reload itself? (3)
6. Does anything at all check that your documents describe the code? (4)

A "no" to question 2 or 3 is the one I would act on today.
