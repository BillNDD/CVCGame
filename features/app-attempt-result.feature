Feature: One attempt records one result, whatever the hands do
  A screen reader's activation records; a stray touch and an early release
  record nothing; no gesture grades twice but a real second activation counts;
  a disabled control answers to nothing; two controls held at once record one
  result. The session keeps focus on the live advance control unless the
  grown-up moved it, and the home screen counts its sessions honestly.
  (E7 — replaces adult-controls 20/21, 22/23, 24, 25/26, 27/28.)
  # The audit's fault: the hold listened for pointer and keyboard only, so a
  # grown-up on VoiceOver or Voice Control could record nothing at all. An
  # assistive activation is deliberate — focused, then activated — so it counts
  # as the keyboard does. A stray finger still does not.

  Scenario: One attempt records one result, whatever the hands do
    Given the app boots with a level 1 save
    And the session opens on its first word
    When the screen reader activates it
    Then the advance control appears
    When the app restarts fresh
    And the app boots with a level 1 save
    And the session opens on its first word
    And a stray touch lands on it
    Then the advance control stays absent
    When an early release lets go of it
    Then the advance control stays absent
    When the app restarts fresh
    And a lone hold button is rendered
    And a full hold fires it once
    Then it fired 1 time
    When Enter plus its click fires it again
    Then it fired 2 times
    When past the guard window a real second activation counts
    Then it fired 3 times
    When the app restarts fresh
    And a lone disabled hold button is rendered
    And nothing at all fires the disabled one
    Then it fired 0 times
    When the app restarts fresh
    And the app boots with a level 1 save
    And the session opens on its first word
    And both result controls are held at once
    Then the early exit counts "1 word has been read"

  Scenario: The session keeps the grown-up's place and counts honestly
    Given the app boots with a level 1 save
    And the session opens on its first word
    When the grown-up marks it with Enter
    Then focus falls to the page body
    When the reveal wait passes
    Then the live advance control holds focus
    When activating the focused control readies the next word
    Then the advance control stays absent
    When the app restarts fresh
    And the app boots with a level 1 save
    And the session opens on its first word
    And the grown-up marks it with Enter
    And the grown-up moves focus away mid-wait
    Then the control comes alive but their choice stands
    When the app restarts fresh
    And home opens with 1 session completed
    Then one session counts singular
    When the app restarts fresh
    And home opens with 2 sessions completed
    Then two sessions count plural
