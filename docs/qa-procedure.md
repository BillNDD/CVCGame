# Manual QA procedure

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
5. Turn Airplane Mode off. Start a session. Tap "Start Recording".
   Expected: iPadOS asks for microphone permission, one time only.
6. Tap "Allow". Say the word on the screen, clearly.
   Expected: The app shows "Great job! That is ...", and says one praise sentence, then,
   "The word was ...". Praise varies over several words. The same sentence can
   repeat by chance.
7. On the next word, say a different word on purpose.
   Expected: The app shows "Nice try! Grown-up will check." and records no result.
8. On a fresh install, tap "Don't Allow" for the microphone.
   Expected: The app changes to grown-up mode, says so, and keeps that setting.

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
23. Turn on the reduced-motion system setting. Reload the app.
    Expected: No animation plays anywhere. The hold fill jumps instead of sweeping.

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

## Microphone resilience

32. Open the game link from a Messages chat, so it opens in the in-app browser. Start a session and tap "Start Recording".
    Expected: Within about 10 seconds the message "Didn’t catch that — tap to try again."
    appears and stays on screen. A second silent attempt switches to grown-up grading for
    this visit, with the reason on screen. Nothing freezes. Opening the game later in
    Safari brings the microphone back.

## Updates

33. While online with the latest version, open the "Grown-ups corner" and tap "Check for updates".
    Expected: "You have the latest version." Nothing else changes.
34. Turn on Airplane Mode and tap "Check for updates".
    Expected: "Couldn’t check. Are you online?" Nothing else changes.
35. After the next release, tap "Check for updates", then "Update now", and let the app restart.
    Expected: The new version number shows, and all progress and settings are exactly as
    before the update.

## Audio after the microphone

37. On the iPhone or iPad, grade a word with sound on and listen. Then tap "Start Recording" on the next word, let it finish, and listen to that reveal.
    Expected: Both reveals sound the same. The second is not quieter, thinner, or tinny. Repeat once more: the third reveal still sounds the same as the first.

## Assistive technology

36. On the iPad, turn VoiceOver on. Start a session, swipe to the "✓ got it" control, double-tap it, then repeat with "✗ not yet".
    Expected: Each double-tap records the result once and starts the feedback phase, exactly
    as a 450 ms hold does. Turn VoiceOver off: a stray single tap on a result control still
    records nothing.
