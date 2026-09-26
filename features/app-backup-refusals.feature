Feature: Hostile backup files are refused and nothing is written
  One boot, fifteen hostile files in a row: each is refused and the level does
  not move. Then the direct predicate checks and the genuine-restore control,
  then the picker wiring. (E4 — replaces faults battery 7 x15, 7b/7a, test 8.)
  # The marker is a signal, not a password. A file carrying it and nothing else
  # used to be accepted, and the app reported "Backup loaded." while replacing
  # every word record, the log, the level and the child's name with an empty
  # state. Found by an audit of the running build, 2026-07-29.
  # One clause at a time. Every file below is refused by SEVERAL of the
  # validator's clauses at once — except the second half of the table, where
  # each file is a valid save in every respect but one, so it can only be
  # refused by the clause it targets. (Removing any single clause changes
  # nothing against the first half alone: the app-mutation gate reported three
  # survivors on 2026-08-10. Port the table, never a sample.)

  Scenario: Eight hostile files knock and the level does not move
    Given the app boots with a level 5 save
    And the grown-ups corner is opened
    And a genuine level 5 backup is imported
    Then the backup loads and the level is 5
    When the hostile file {} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file [] is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file null is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"hello":"world"} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file <html> is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"application":"word-quest-backup"} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"application":"word-quest-backup","level":"seven","words":"oops","settings":null} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"application":"word-quest-backup","version":3,"level":5} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5

  Scenario: Seven one-clause hostile files knock and the level does not move
    Given the app boots with a level 5 save
    And the grown-ups corner is opened
    And a genuine level 5 backup is imported
    Then the backup loads and the level is 5
    When the hostile file {"version":3,"level":5,"settings":{"mode":"parent"}} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"version":3,"level":5,"words":[],"settings":{"mode":"parent"}} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"version":3,"level":5,"words":{}} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"version":3,"level":5,"words":{},"settings":[]} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"version":3,"words":{},"settings":{"mode":"parent"}} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file {"version":3,"level":null,"words":{},"settings":{"mode":"parent"}} is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5
    When the hostile file [{"version":3,"level":5,"words":{},"settings":{}}] is imported
    Then the app reports "That file is not a Word Quest backup."
    And no new save leaves level 5

  Scenario: A save-shaped array is refused directly but a genuine backup restores
    # The Array clause, tested where it can be reached. Through the file input
    # the clause is redundant — a JSON array carries no named properties, so the
    # level check refuses it first — but an array WITH properties is one line of
    # JavaScript, and the predicate decides whether a family's history is
    # replaced. Tested directly so the guard is real rather than assumed.
    Then the save-shaped array is refused and the genuine one passes
    When the app restarts fresh
    And the app boots with a level 1 save
    And the grown-ups corner is opened
    And a genuine level 4 backup is imported
    Then the backup loads and the level is 4

  Scenario: The Load backup button opens the picker from the keyboard
    # A named button that clicks a hidden input; its wiring is an element id,
    # and a typo there would leave a keyboard user a button that does nothing
    # with every gate green.
    Given the app boots with a level 1 save
    And the grown-ups corner is opened
    When the Load backup button is pressed from the keyboard
    Then the picker opens exactly 1 time
    And the hidden input has aria-hidden "true" and tab index -1
