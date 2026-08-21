Feature: Saved data survives anything
  Old saves migrate one time. Damaged saves repair before any use.

  # Re-ruled 2026-08-21 on the cutover morning page: "Recompute the seat from
  # the child's own graded words." The 2026-08-15 floor (curriculum decision
  # 5) kept a stored number as earned ground; on the renumbered hundred-level
  # ladder that number skips the new teaching seated below it, so the floor
  # is gone. This save's one mastered word secures no level: the child starts
  # at the first rung with that word's mastery intact, and the log keeps the
  # number that was true when written.
  Scenario: A version 2 save seats where its own graded words put it
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

  # 99 stopped being out of range at the 2026-08-20 cutover - the ladder has
  # 100 levels - so the fault this scenario plants moved past the new top.
  Scenario: An out-of-range level clamps to the top
    Given a version 4 save with level 999
    When the save loads
    Then the player is on level 100

  Scenario: An out-of-range box clamps
    Given a save where the word "cat" sits in box 99
    When the save loads
    Then the word "cat" sits in box 5

  Scenario: A broken log row is dropped
    Given a save whose log contains one null row
    When the save loads
    Then the load does not fail
    And the log has 0 rows
