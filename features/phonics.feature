Feature: Sound units and feedback text
  Digraphs are one sound. Feedback is positive and character-exact.

  Scenario Outline: A word splits into sound units
    When the app shows the sound tiles for "<word>"
    Then the tiles read "<tiles>"
    And the dashed form is "<dashed>"

    Examples:
      | word | tiles   | dashed |
      | cat  | c,a,t   | c-a-t  |
      | ship | sh,i,p  | sh-i-p |
      | duck | d,u,ck  | d-u-ck |
      | sing | s,i,ng  | s-i-ng |
      | when | wh,e,n  | wh-e-n |
      | this | th,i,s  | th-i-s |
      | ax   | a,x     | a-x    |

  Scenario: Feedback for a correct reading
    When the app gives feedback for a "correct" reading of "cat"
    Then the feedback lead is "Great job! That is "
    And the feedback shows "c-a-t" and the word "cat"

  Scenario: Feedback for a close reading
    When the app gives feedback for a "close" reading of "ship"
    Then the feedback lead is "Good try! The correct pronunciation is "
    And the feedback shows "sh-i-p" and the word "ship"

  Scenario: Feedback for a missed reading
    When the app gives feedback for a "wrong" reading of "sun"
    Then the feedback lead is "Let’s try that again. The correct pronunciation is "
    And the feedback shows "s-u-n" and the word "sun"

  Scenario: The tricky word "was" carries its note
    Then the word "was" carries the note "Tricky word! The a sounds like “uh” — wuz."

  Scenario: The tricky word "is" carries its note
    Then the word "is" carries the note "Tricky word! The s sounds like “z” — iz."
