Feature: Saved data survives anything
  Old saves migrate one time. Damaged saves repair before any use.

  # The 10-and-10 curriculum re-cut the levels on 2026-08-15, so a stored level
  # number from before it points at a different place than the child earned.
  # The owner's ruling (curriculum decision 5) is that the new level is computed
  # from the child's own words: the first level whose words are not yet secure,
  # by the same rule promotion uses. One mastered word secures no level.
  Scenario: A version 2 save recomputes its level from the child's words
    Given a version 2 save at level 3 with a log row at level 1
    When the save loads
    Then the player is on level 1
    And the log row shows level 2
    And the word data is unchanged

  Scenario: An old save lands where the child's words put it
    Given a version 2 save whose words have mastered the first two levels
    When the save loads
    Then the player is on level 3

  Scenario: Migration runs only once
    Given a version 2 save at level 3
    When the save loads twice
    Then both results are identical

  Scenario: A hostile level heals to the start
    Given a version 3 save with level "abc"
    When the save loads
    Then the player is on level 1

  Scenario: An out-of-range level clamps to the top
    Given a version 4 save with level 99
    When the save loads
    Then the player is on level 20

  Scenario: An out-of-range box clamps
    Given a save where the word "cat" sits in box 99
    When the save loads
    Then the word "cat" sits in box 5

  Scenario: A broken log row is dropped
    Given a save whose log contains one null row
    When the save loads
    Then the load does not fail
    And the log has 0 rows
