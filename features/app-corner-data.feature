Feature: The corner handles data without breaking it
  One boot: a name with astronaut emoji commits whole, the log copies on allow
  and lands in a box on refuse, a backup saves through the blob path. Then the
  error ring reports on press and clears, then a render crash shows a way back.
  (E5 — replaces faults name, clipboard, blob, ring-copy, crash tests.)
  # The name rule: 21 astronaut emoji — a byte-wise slice(0, 20) would cut one
  # in half. The clipboard fallback is the fault the owner met on his own phone
  # the same morning: the markdown lands in a select-all box instead of
  # vanishing. The blob stubs hold the contract jsdom cannot: one URL made,
  # one revoked, the download carrying the marker the import path demands back.

  Scenario: Names commit whole, logs copy both ways, backups save
    Given the app boots with a fresh seed
    And the grown-ups corner is opened
    When the child's name is entered as "  🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀🧑‍🚀  "
    Then the committed name has 20 glyphs and no cut surrogate
    When the clipboard allows copying
    Then the log copy reports "Log copied ✓"
    When the clipboard refuses copying
    Then the fallback box contains "0/1122"
    When the backup is saved through the blob path
    Then one URL is made and revoked carrying '"application": "word-quest-backup"'

  Scenario: The ring reports on press, apart from the log, and clears
    Given the device records "ring-one" and "second"
    And the app boots with a fresh seed
    And the grown-ups corner is opened
    Then the corner reports "2 problems recorded on this device."
    And the log copy carries no error text
    And the bug report heads "# Word Quest bug report" and promises "Nothing in this report was sent anywhere"
    And the bug report lists "home · error: ring-one" and "at A.js:1" and "session · rejection: second"
    And the first report item precedes the second
    When the ring is cleared to "No problems recorded on this device."

  Scenario: A render crash shows a way back, not a blank page
    When a crashing build screen renders "render boom"
    Then the way back reads "Back to the start" for "render boom" and returns to "alive again"
