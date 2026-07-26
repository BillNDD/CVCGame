Feature: Level promotion
  A level is won when 80 percent of its words are solid at box 3 or more.

  Scenario: Exactly 80 percent promotes
    Given a player on Level 2 with 16 of the 20 words at box 3
    When the session ends
    Then the player is promoted to Level 3

  Scenario: Just under 80 percent does not promote
    Given a player on Level 2 with 15 of the 20 words at box 3
    When the session ends
    Then the player stays on Level 2

  Scenario: Box 2 words are not solid
    Given a player on Level 1 with 12 of the 12 words at box 2
    When the session ends
    Then the player stays on Level 1

  Scenario: The starter level needs 10 of its 12 words
    Given a player on Level 1 with 10 of the 12 words at box 3
    When the session ends
    Then the player is promoted to Level 2

  Scenario: The last level has no promotion
    Given a player on Level 7 with 20 of the 20 words at box 5
    When the session ends
    Then the player stays on Level 7

  Scenario: Two perfect sessions in a row promote
    Given a player on Level 2 with 5 of the 20 words at box 3
    And a perfect-session streak of 1
    When the session ends with every word correct
    Then the player is promoted to Level 3
    And the perfect-session streak is 0

  Scenario: One perfect session is not enough
    Given a player on Level 2 with 5 of the 20 words at box 3
    And a perfect-session streak of 0
    When the session ends with every word correct
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: An imperfect session resets the streak
    Given a player on Level 2 with 5 of the 20 words at box 3
    And a perfect-session streak of 1
    When the session ends with a missed word
    Then the player stays on Level 2
    And the perfect-session streak is 0

  Scenario: A session stopped early leaves the streak unchanged
    Given a player on Level 2 with 5 of the 20 words at box 3
    And a perfect-session streak of 1
    When the session stops early
    Then the player stays on Level 2
    And the perfect-session streak is 1
