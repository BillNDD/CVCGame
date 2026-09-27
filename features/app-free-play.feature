Feature: Free play plays forever and writes nothing
  The header counts up with never a block total; the last slot still says Next
  word and the block rolls into a new one. Truly random draws come from the
  whole bank through the dice door, and the level door serves its own. Random
  play writes nothing across grades or exits. A spent block renews at the
  guarded boundary, one index from coincidence.
  (E2b — replaces safety 42, 43, 45, 46, 47. Sentence 11 stays unit.)
  # The 0.9999999/0.955 pins and their re-derivation rule move verbatim: the
  # bank's moves are re-simulated, never inherited — recompute every number
  # when the bank moves, run them, never take the paragraph's word for it.

  Scenario: The header counts and the block rolls over without ending
    Given free play is entered through "🎯 Level"
    Then the header counts "FREE PLAY"
    And the header counts "0 words"
    When a free-play word is graded "got it"
    Then the header counts "1 word"
    And no block total is shown
    When a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And a free-play word is graded "got it"
    And the last word is graded "got it"
    Then the last slot still says Next word
    When the block rolls into a new one
    Then the header counts "12 words"

  Scenario: Truly random draws come from the whole bank
    Given random is pinned high
    And free play is entered through "🎲 Any word"
    Then the served word is "teacher"
    When the app restarts fresh
    And free play is entered through "🎯 Level"
    Then the served word is one of Level 1

  Scenario: Random play writes nothing and the boundary renews
    Given random is pinned high
    And free play is entered through "🎲 Any word"
    Then the header counts "FREE PLAY"
    And the dice chip names the mode
    When a save window opens
    And the pinned block is walked collecting every word
    Then the block opens on "teacher" and closes on "mouthful" with no repeats
    When random is pinned to the boundary
    And a free-play word is graded "got it"
    Then the header counts "20 words"
    And the served word is "ancient"
    When a free-play word is graded "got it"
    Then the served word is "motion"
    And no save was written in the window
    When free play is left straight home
    Then no save was written in the window
