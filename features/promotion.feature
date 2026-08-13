Feature: Level promotion
  A level is won when 80 percent of its words are solid at box 3 or more.

  # Level 5 held 50 words until 2026-08-13, when the owner ruled "gob" out and it
  # became 49. No level's size is now a multiple of five, so no scenario can sit
  # EXACTLY on the threshold: 80 per cent of 49 is 39.2. These two straddle it —
  # 40 of 49 is 81.6 per cent and promotes, 39 is 79.6 and does not — which is
  # what the rule has to get right. The scenario name says so rather than
  # claiming an exactness the bank can no longer provide.
  Scenario: Just over 80 percent promotes
    Given a player on Level 5 with 40 of the 49 words at box 3
    When the session ends
    Then the player is promoted to Level 6

  Scenario: Just under 80 percent does not promote
    Given a player on Level 5 with 39 of the 49 words at box 3
    When the session ends
    Then the player stays on Level 5

  Scenario: Box 2 words are not solid
    Given a player on Level 1 with 12 of the 12 words at box 2
    When the session ends
    Then the player stays on Level 1

  Scenario: The starter level needs 10 of its 12 words
    Given a player on Level 1 with 10 of the 12 words at box 3
    When the session ends
    Then the player is promoted to Level 2

  Scenario: The last level has no promotion
    Given a player on Level 11 with 29 of the 29 words at box 5
    When the session ends
    Then the player stays on Level 11

  Scenario: Two perfect sessions in a row promote
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 1
    When the session ends with every word correct
    Then the player is promoted to Level 3
    And the perfect-session streak is 0

  Scenario: One perfect session is not enough
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 0
    When the session ends with every word correct
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: An imperfect session resets the streak
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 1
    When the session ends with a missed word
    Then the player stays on Level 2
    And the perfect-session streak is 0

  Scenario: A session stopped early leaves the streak unchanged
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 1
    When the session stops early
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: A session stopped early with a miss also leaves the streak unchanged
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 1
    When the session stops early with a missed word
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: A box promotion on a perfect session still resets the streak
    Given a player on Level 1 with 10 of the 12 words at box 3
    And a perfect-session streak of 1
    When the session ends with every word correct
    Then the player is promoted to Level 2
    And the perfect-session streak is 0

  Scenario: A stored streak alone never promotes without a completed session
    Given a player on Level 2 with 5 of the 55 words at box 3
    And a perfect-session streak of 2
    When the session ends
    Then the player stays on Level 2
