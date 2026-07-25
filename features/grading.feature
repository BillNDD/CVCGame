Feature: Grading a reading attempt
  The schedule engine scores the first attempt of a word in a session.

  Scenario: A new word read correctly at first sight moves fast
    Given a word the child has never attempted
    When the child reads it correctly in session 1
    Then the word is in box 3
    And the word is due again in session 5

  Scenario: A known word read correctly moves up one box
    Given a word in box 1 with 2 attempts
    When the child reads it correctly in session 10
    Then the word is in box 2
    And the word is due again in session 12

  Scenario: A word at the top box stays at the top
    Given a word in box 5 with 9 attempts
    When the child reads it correctly in session 10
    Then the word is in box 5
    And the word is due again in session 22

  Scenario: A close attempt lifts a word out of the bottom box
    Given a word in box 0 with 1 attempts
    When the child is close in session 5
    Then the word is in box 1
    And the word is due again in session 6

  Scenario: A close attempt never demotes a strong word
    Given a word in box 4 with 4 attempts
    When the child is close in session 5
    Then the word is in box 4

  Scenario: A miss drops the word two boxes
    Given a word in box 4 with 3 attempts
    When the child misses it in session 7
    Then the word is in box 2
    And the word is due again in session 9

  Scenario: A miss never drops below the bottom box
    Given a word in box 1 with 3 attempts
    When the child misses it in session 7
    Then the word is in box 0
    And the word is due again in session 8

  Scenario Outline: The review ladder by box
    Given a word in box <box> with 2 attempts
    When the child is close in session 100
    Then the word is due again in session <due>

    Examples:
      | box | due |
      | 0   | 101 |
      | 1   | 101 |
      | 2   | 102 |
      | 3   | 104 |
      | 4   | 107 |
      | 5   | 112 |
