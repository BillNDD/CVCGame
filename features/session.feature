Feature: Building a session
  Target 20 words, no duplicates, a probable success first.

  Scenario: The first session serves the whole starter level
    Given a brand-new player
    When a session is built
    Then it has exactly 12 words
    And every word is a Level 1 word
    And no word repeats

  Scenario: A full level fills the target
    Given a player on Level 2 who has mastered every Level 1 word
    When a session is built
    Then it has exactly 20 words
    And no word repeats

  Scenario: Overdue reviews from lower levels are capped
    Given a player on Level 3 in session 10 with all 64 lower-level words overdue in box 1
    When a session is built
    Then at most 5 words come from lower levels

  Scenario: No mastered words return before the third session
    Given a player on Level 3 with every lower-level word mastered and none due
    And the player has completed 1 sessions
    When a session is built
    Then it contains exactly 0 mastered words

  Scenario: At most two mastered words return for confidence
    Given a player on Level 3 with every lower-level word mastered and none due
    And the player has completed 5 sessions
    When a session is built
    Then it contains exactly 2 mastered words

  Scenario: The session opens with the most secure word
    Given a player on Level 2 whose Level 1 words are all due in box 1
    And the word "at" is due in box 5
    When a session is built
    Then the first word is "at"

  Scenario: No peeking while fresh words remain
    Given a player on Level 1 who has seen 11 of the 12 words
    When a session is built
    Then every word is a Level 1 word

  Scenario: Peeking starts when the level is fully seen
    Given a player on Level 1 who has seen all 12 words
    When a session is built
    Then at least one word is a Level 2 word
    And no word is above Level 2

  Scenario: A level seen but not learned keeps the next level closed
    Given a player on Level 1 who has seen all 12 words and read none correctly
    When a session is built
    Then it has exactly 12 words
    And every word is a Level 1 word

  Scenario: The next level opens at 10 of the 12 words read correctly
    Given a player on Level 1 who has read 10 of the 12 words correctly
    When a session is built
    Then at least one word is a Level 2 word
    And it has exactly 20 words

  Scenario: Nine of the 12 words does not open the next level
    Given a player on Level 1 who has read 9 of the 12 words correctly
    When a session is built
    Then every word is a Level 1 word
    And it has exactly 12 words

  Scenario: A word the child has already read comes back, whatever its level
    Given a player on Level 1 who has seen all 12 words and read none correctly
    And the Level 2 word "cat" was read wrong in an earlier session
    When a session is built
    Then the session contains the word "cat"
    And it has exactly 13 words

  Scenario: Above-level review never takes over the session
    Given a player on Level 1 who has seen all 12 words and read none correctly
    And 5 Level 2 words were read wrong in earlier sessions
    When a session is built
    Then exactly 2 words come from higher levels
    And it has exactly 14 words
