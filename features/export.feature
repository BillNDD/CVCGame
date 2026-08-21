Feature: The reading log export
  The export is a Markdown report for the adult, never for the child.

  Scenario: Box 3 does not count as mastered
    Given a fresh player whose words "cat" and "dog" sit in box 3
    When the log is exported
    Then the export contains "0/1123"

  Scenario: Box 4 counts as mastered
    Given a fresh player whose words "cat" and "dog" sit in box 4
    When the log is exported
    Then the export contains "2/1123"

  Scenario: A short session is marked
    Given a fresh player with one logged session marked as partial
    When the log is exported
    Then the export contains "partial"

  Scenario: A name with an emoji at the limit stays whole
    Given the reader's name is 19 letters followed by the chick emoji
    When the log is exported
    Then the export contains the chick emoji
    And the export contains no broken character
