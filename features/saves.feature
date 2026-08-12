Feature: Saved data survives anything
  Old saves migrate one time. Damaged saves repair before any use.

  Scenario: A version 2 save opens one level up
    Given a version 2 save at level 3 with a log row at level 1
    When the save loads
    Then the player is on level 4
    And the log row shows level 2
    And the word data is unchanged

  Scenario: Migration runs only once
    Given a version 2 save at level 3
    When the save loads twice
    Then both results are identical

  Scenario: A hostile level heals to the start
    Given a version 3 save with level "abc"
    When the save loads
    Then the player is on level 1

  Scenario: An out-of-range level clamps to the top
    Given a version 3 save with level 99
    When the save loads
    Then the player is on level 11

  Scenario: An out-of-range box clamps
    Given a save where the word "cat" sits in box 99
    When the save loads
    Then the word "cat" sits in box 5

  Scenario: A broken log row is dropped
    Given a save whose log contains one null row
    When the save loads
    Then the load does not fail
    And the log has 0 rows
