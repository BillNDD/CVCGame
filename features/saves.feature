Feature: Saved data survives anything
  Old saves migrate one time. Damaged saves repair before any use.

  # The 10-and-10 curriculum re-cut the levels on 2026-08-15, so a stored level
  # number from before it points at a different place than the child earned.
  # The owner's ruling (curriculum decision 5) is that the new level is computed
  # from the child's own words — and the result is FLOORED at the level the
  # child already held, mapped to where its old stage now begins, because
  # promotion has a second path (two perfect sessions) that leaves few boxes
  # behind, and a parent can set a level by hand. A migration never demotes.
  # This save held old level 3, bumped to 4 by the v3 step; old 4's short-e
  # stage begins at new level 11.
  Scenario: A version 2 save keeps the ground its level had earned
    Given a version 2 save at level 3 with a log row at level 1
    When the save loads
    Then the player is on level 11
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
