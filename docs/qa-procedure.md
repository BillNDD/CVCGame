# Manual QA procedure

**This document owns** the numbered script a person runs on a real device for gate G12, and
the reason each step exists.
**It does not own** what the app should do at any step — that is `SPEC.md` — and every
sentence it quotes is checked against the app by gate G16.

This is the numbered device script for gate G12 (`docs/testing-gauntlet.md`). A person runs it
on real hardware before each release. The robots cannot judge these steps.

Each step has an action and an expected result. Mark each step pass or fail. A failed step
blocks the release.

This document follows the Microsoft Writing Style Guide.

## iPad — Safari, iPadOS 15.4 or later

1. Open the app address in Safari.
   Expected: The home screen shows "Word Quest", the beta chip, and the "Begin Session" control.
2. Tap the share control, then "Add to Home Screen", then "Add".
   Expected: The "Word Quest" symbol appears on the home screen.
3. Open the app from the home screen symbol.
   Expected: The app opens in its own window, without the Safari controls.
4. Turn on Airplane Mode. Close the app fully. Open it again.
   Expected: The app starts, and a session begins normally, with no network.
5. Turn Airplane Mode off. Start a session and look at the whole screen before touching it.
   Expected: The app asks for no permission of any kind. There is no record control. The
   rail says "Say the word out loud! 📣".
6. Have the child read the word, then press and hold "✓ got it".
   Expected: The app shows "Great job! That is ...", and says one praise sentence, then,
   "The word was ...". Praise varies over several words. The same sentence can
   repeat by chance.
7. On the next word, press and hold "↻ not yet".
   Expected: The app shows "Good try!" and invites another go. It never says the child was
   wrong, and the word comes back later in the session.
7b. Keep grading until five words are done, and watch what arrives next.
   Expected: A sentence appears in SILENCE — the app speaks nothing. The stage says
   "Read this sentence" and the rail says "Read the sentence out loud! 📣". The three
   grade controls are live, and there is no "Next word" control anywhere: the only way
   forward is your hold. Have the child read the sentence, then press and hold
   "✓ got it". Only then does the app speak — a praise line, the whole sentence, an
   invitation, one word sounded out, and the sentence again. "Next word" appears with
   the reveal and works at once.
8. Leave the next word on screen and touch nothing for a full minute.
   Expected: Nothing is recorded, the word does not change, and the app never grades by
   itself. Only your hold records anything, ever.

## Adult controls — hold gesture

9. Rest a finger briefly on "✓ got it", less than half a second.
   Expected: Nothing happens. The fill bar does not complete.
10. Hold "✓ got it" until the fill completes.
    Expected: The result records, and the feedback phase starts.
11. Before an attempt ends, look at the speaker control in the strip.
    Expected: The speaker control is dimmed, and a tap makes no sound.
12. During feedback, tap the speaker control.
    Expected: The app says the full word clearly, at a natural speed, never letter names.
13. With a keyboard attached, press Tab to a result control, then Enter.
    Expected: The result records at once, with no hold.

## iPhone — Safari

14. Run a session in portrait.
    Expected: The page does not scroll. The word, tiles, and message keep fixed places.
15. Look at the bottom strip near the home indicator.
    Expected: The adult controls sit clear of the swipe area and respond to holds.
16. Rotate to landscape on a small phone.
    Expected: The single-column layout stays. Nothing overlaps or is cut off.
17. Rotate to landscape on an iPad or a large screen, 640 by 420 px or more.
    Expected: One centred column stays, with a larger word. The tiles and the message sit
    directly under the word. Nothing sits off to one side.

## Windows — Chrome or Edge

18. Open the app address. Find the install control in the address bar. Install.
    Expected: The app opens in its own window. "Word Quest" appears in the Start menu.
19. Look at the Start menu entry and the taskbar icon.
    Expected: The icon is sharp, not blurred, at every size.
20. Disconnect the network. Open the installed app.
    Expected: The app starts and plays a full session offline.

## Any browser — text size and motion

21. Set the text size or zoom to 200 percent. Open the "Grown-ups corner".
    Expected: The stage scrolls. No content is cut off. No horizontal scroll appears.
22. Keep 200 percent. Run a session.
    Expected: The word stays fully visible. The stage can scroll if needed.
23. Turn on the reduced-motion system setting. Reload the app. Grade one word.
    Expected: No animation plays anywhere, and the hold fill jumps instead of sweeping. One
    exception: the fill on "Next word" still crosses the control while the word is spoken. It
    tells the child how much of the word is left, so it is information, not decoration.

## Data safety

24. Complete one full session. Close the app fully. Open it again.
    Expected: The session count and the word progress are kept.
25. Start a session, grade three words, then refresh the page.
    Expected: The three results are kept. The app returns to the home screen.
26. In the "Grown-ups corner", tap "Save backup file".
    Expected: A .json file downloads, named with today's date.
27. Reset all progress, then load the backup file.
    Expected: The progress returns exactly as before the reset.
28. With sound on, grade a miss in adult mode.
    Expected: The app says "Let's try again. The word is ...", with no letter names.

## Promotion

29. In grown-up mode, complete two sessions in a row and mark every word "✓ got it".
    Expected: After the second session, the app says "Amazing! Level up!" and the level
    increases by 1.

## Voice

30. With sound on, grade a word correct and listen to the whole feedback.
    Expected: A warm recorded voice speaks, not the robotic system voice. The praise, a
    clear pause, "The word was", another clear pause, then the word. The words
    never crush together.
31. Turn on Airplane Mode and repeat the previous step.
    Expected: The same recorded voice speaks. Offline changes nothing.

## The recorded voice falls back honestly

32. In the "Grown-ups corner", read the screen from top to bottom before playing anything.
    Expected: There is no "The recorded voice" box, because nothing has fallen back. Grade
    one word with sound on, listen to the whole reveal, and come back: still no box, and the
    sound-out lit up letter by letter as each sound played.

## Updates

33. While online with the latest version, on the first screen give "Check for updates" in the grown-up strip a quick tap, then press and hold it.
    Expected: The quick tap does nothing at all. The held press fills the control, then
    "You have the latest version." appears in the strip. Nothing else changes.
34. Turn on Airplane Mode and press and hold "Check for updates".
    Expected: "Couldn’t check. Are you online?" Nothing else changes.
35. After the next release, press and hold "Check for updates", then press and hold "Update now", and let the app restart.
    Expected: The new version number shows in the strip, and all progress and settings are
    exactly as before the update.
40. In the "Grown-ups corner", switch "Automatic update check" to Off, fully close and reopen the app, and return to the corner.
    Expected: The switch is still Off. "Check for updates" on the first screen still
    answers when held, and nothing else about the corner changed.

## Audio after a recording — PARKED until the family recorder ships

37. Grade two words in a row with sound on and listen to both reveals.
    Expected: Both reveals sound the same. The second is not quieter, thinner, or tinny.

    This step used to open the microphone between the two reveals, because iOS moves the
    whole audio session to "play and record" whenever any capture device opens and leaves
    playback on the narrow route it wants for a call — a real fault, caught on a real iPhone.
    The microphone went on 2026-08-12, so nothing on the device can trigger it today. The
    repair (`reclaimOutput`) is deliberately kept in the code, because the family voice-pack
    recorder will open a capture device when it ships, and this step goes back to opening one
    between the reveals on the day it does.

## Leaving a session early

38. On the first word of a session, tap the home control, then look at the dialog without touching it.
    Expected: The dialog shows three controls: an inert "Save as a short session", "Discard
    and go home", and "Keep reading". Nothing moves while it is open, and no control appears
    or disappears underneath your finger. "Keep reading" returns to the same word.

## Skipping a reveal

41. Grade a word correct, and while the praise is still speaking give the "⏭ skip" control in the grown-up strip a quick tap, then press and hold it.
    Expected: The tap does nothing — the voice keeps speaking and the "Next word" control
    keeps its fill. The held press fills the skip control, the voice stops at once, and the
    next word appears with no sound carrying over.

## Keyboard

39. On the Windows laptop, start a session, hold or press a result control, and wait for the reveal to finish without touching the mouse. Then press Enter.
    Expected: "Next word ➡️" gains the focus ring the moment it becomes active, and Enter moves
    to the next word. No Tab press is needed.

## Assistive technology

36. On the iPad, turn VoiceOver on. Start a session, swipe to the "✓ got it" control, double-tap it, then repeat with "✗ not yet".
    Expected: Each double-tap records the result once and starts the feedback phase, exactly
    as a 450 ms hold does. VoiceOver says "got it" and "not yet" - the words on the control
    and nothing else: no symbol read aloud, no "hold" (art project step 0a, 2026-08-22).
    Turn VoiceOver off: a stray single tap on a result control still records nothing.

## The address bar

43. On the iPhone in Safari, start a session with the address bar expanded, then while a word is on the screen swipe so the bar collapses, and expand it again.
    Expected: The word, the tile row and the controls stay exactly where and how large they
    were. Nothing resizes or shifts as the bar moves (the stylesheet uses the small viewport
    height, `svh`, everywhere; art project step 0b, 2026-08-22). A headless browser has no
    bar, so only a real phone can prove this.
