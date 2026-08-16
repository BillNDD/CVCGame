Feature: Level promotion
  A level is won when 80 percent of its words are solid at box 3 or more.

  # The 10-and-10 curriculum (owner-approved 2026-08-15) put ten decodables in
  # each early level, so a level CAN sit exactly on the threshold again for the
  # first time since "gob" left the old Level 5: 80 per cent of 10 is 8 exactly.
  # The rule is "80 per cent OR MORE", so 8 of 10 promotes and 7 of 10 does not
  # — the pair below holds the boundary from both sides, and the mutation gate
  # (">=" to ">") is what it protects against. Level 8 carries no heart words,
  # so its ten words are the whole denominator.
  Scenario: Exactly 80 percent promotes
    Given a player on Level 8 with 8 of the 10 words at box 3
    When the session ends
    Then the player is promoted to Level 9

  Scenario: Just under 80 percent does not promote
    Given a player on Level 8 with 7 of the 10 words at box 3
    When the session ends
    Then the player stays on Level 8

  Scenario: Box 2 words are not solid
    Given a player on Level 1 with 14 of the 14 words at box 2
    When the session ends
    Then the player stays on Level 1

  # Level 1 holds its ten decodables plus the four seated heart words, and the
  # hearts count toward promotion exactly as the old Level 2's sixteen did:
  # 80 per cent of 14 is 11.2, so 12 promotes and 11 does not.
  Scenario: The starter level needs 12 of its 14 words
    Given a player on Level 1 with 12 of the 14 words at box 3
    When the session ends
    Then the player is promoted to Level 2

  Scenario: Eleven of the starter level's 14 words is not enough
    Given a player on Level 1 with 11 of the 14 words at box 3
    When the session ends
    Then the player stays on Level 1

  Scenario: The last level has no promotion
    Given a player on Level 21 with 14 of the 14 words at box 5
    When the session ends
    Then the player stays on Level 21

  Scenario: Two perfect sessions in a row promote
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 1
    When the session ends with every word correct
    Then the player is promoted to Level 3
    And the perfect-session streak is 0

  Scenario: One perfect session is not enough
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 0
    When the session ends with every word correct
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: An imperfect session resets the streak
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 1
    When the session ends with a missed word
    Then the player stays on Level 2
    And the perfect-session streak is 0

  Scenario: A session stopped early leaves the streak unchanged
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 1
    When the session stops early
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: A session stopped early with a miss also leaves the streak unchanged
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 1
    When the session stops early with a missed word
    Then the player stays on Level 2
    And the perfect-session streak is 1

  Scenario: A box promotion on a perfect session still resets the streak
    Given a player on Level 1 with 12 of the 14 words at box 3
    And a perfect-session streak of 1
    When the session ends with every word correct
    Then the player is promoted to Level 2
    And the perfect-session streak is 0

  Scenario: A stored streak alone never promotes without a completed session
    Given a player on Level 2 with 5 of the 12 words at box 3
    And a perfect-session streak of 2
    When the session ends
    Then the player stays on Level 2
