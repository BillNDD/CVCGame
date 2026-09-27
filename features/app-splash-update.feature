Feature: The splash waits and the update check asks only of a grown-up
  The splash keeps its 2 seconds and lets a tap through; a tap before the read
  lands writes nothing; the version check never leaves on a child's tap, offers
  in plain words, and sends its consent message only on the adult hold; the
  foreground asks once and Off silences it. (E6 — replaces safety-splash 49-55
  and safety 48.)
  # S6's promise: the network is only ever touched by a deliberate adult act.
  # The boot's own voice-pack manifest fetch is not the subject — the property
  # is that no VERSION request ever leaves without the adult hold. The stamp's
  # whole point: a fix between named versions is an update the check can see,
  # and it must not read "Version x is ready" when the strip already says x.

  Scenario: The splash waits its 2 seconds and lets a tap through
    When the splash boots
    And 1999 ms pass
    Then Begin is hidden and the title art shows
    When 2 ms pass
    Then Begin is shown
    When the app restarts fresh
    And the splash boots
    And 0 ms pass
    And the splash is tapped
    Then Begin is shown

  Scenario: A tap before the read lands leaves the app on the read and writes nothing
    When the storage read hangs
    And the splash boots
    And 0 ms pass
    And the splash is tapped
    And 2001 ms pass
    Then Begin is hidden and the title art shows
    When the hung read resolves empty
    Then Begin is shown
    When the app restarts fresh
    And the storage read hangs
    And the splash boots
    And 0 ms pass
    And the splash is tapped
    And 2001 ms pass
    Then no save is written
    When the hung read resolves unreadable
    Then no save is written

  Scenario: The version check never leaves on a child's tap
    When the update host answers version "0.0.0-test" build "test-build"
    And the splash boots
    And 2001 ms pass
    And the child's tap and short press ask nothing
    Then the version was asked 0 times
    When the check key is pressed
    Then the version was asked 1 time
    And the request bypasses every cache
    And the app reports "You have the latest version."
    And Update now is absent
    When the app restarts fresh
    And the update host answers version "9.9.9" with no build
    And the service worker waits for consent
    And the splash boots
    And 2001 ms pass
    Then Update now is absent
    When the check key is pressed
    Then the app reports "Version 9.9.9 is ready — press and hold."
    And the child's tap on Update now sends nothing
    And the adult hold sends "wq-activate"
    When the app restarts fresh
    And the update host answers version "0.0.0-test" build "newer-build"
    And the splash boots
    And 2001 ms pass
    When the check key is pressed
    Then the app reports "An update is ready — press and hold."
    And Update now is offered

  Scenario: The foreground asks once and Off silences it
    Given the service worker only updates
    And the app boots with a level 1 save
    When the foreground returns
    Then the worker updated 1 time
    When the update switch is set Off
    And the foreground returns
    Then the worker updated 1 time
