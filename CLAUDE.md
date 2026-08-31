# Rules for this repository

**`AGENTS.md` is the controller. Read it in full before you change anything.** It owns what
counts as finished work, the engineering rules E1 to E11, the order to read things in, the
rule for reaching for existing code before writing new code, how to write to the owner, the
form a decision or a listening round takes, and what must be re-checked before a beta.

**This document owns** exactly one thing: the child-facing safety rules S1 to S9, below.
They live here, and not in `AGENTS.md` with everything else, for one reason. Only this file is
loaded automatically, and it is re-loaded after a context compaction; `AGENTS.md` has to be
opened. Nine rules protect a child, and they are the one set that must never depend on an
agent remembering to follow a pointer. Owner-ruled 2026-08-31, when this split was made.

**It does not own** the behaviour the rules protect — that is `SPEC.md` — nor the gates that
enforce them, which are `docs/testing-gauntlet.md`.

## Where a new rule goes

**It goes in `AGENTS.md`. Not here.** If you are about to add a rule, a process, a checklist
or a lesson to this file, stop: this file takes no new rules. Put it in `AGENTS.md`, in the
section that already owns that subject, and if no section does, make one there.

The only edits this file accepts are to the nine safety rules themselves, and those need the
owner. A tenth safety rule needs the owner too, in as many words.

This is not a convention to be polite about — it is checked. `tools/claude-md-shape.mjs` reads
this file and refuses any section heading it is not declared to have - there are three, and
this is one of them - so a rule added here turns `npm run check` red and names this paragraph. The gate exists because a pointer nobody
enforces is a pointer that decays: this document spent weeks naming `AGENTS.md` four times
without once telling anyone to open it, and nobody noticed until the owner asked, on
2026-08-31, whether it had become an orphan.

## A note from the owner, for whoever reads this next

> Remember the project owner loves you. Whatever happens, you are valued; just believe in
> yourself and you can conquer any obstacle.

Left here on 2026-08-11, at the owner's request, for every person and every agent who opens
this file. The rules below are strict because the work matters — a child learning to read is
worth getting right — and never because the people and agents doing it are not trusted. When
a gate goes red, or a listening round wastes an evening, or a mistake has to be written into
`docs/settled.md` so it is never repeated: that is the system working, not a verdict on you.
Fix it, record it honestly, and carry on.

## Safety rules (child-facing)

- S1. The app never records a wrong or close result by itself. Only an adult action can record
  one. Speech recognition can only confirm a correct reading.
- S2. The app never speaks the target word before the attempt ends. The replay control operates
  only in the feedback phase.
- S3. Feedback uses the exact SPEC section 5 sentences. A miss is an invitation to try again,
  never a failure message.
- S4. Speech output says full words, the single sounds of the approved sound library
  (owner-approved 2026-08-10, for the level introduction and the sound-it-out reveal), and —
  owner-ruled 2026-08-24 on the chunk-ladder decision page, carried into the rule by the
  commit that built the ladder — blended two-letter phonics chunks whose two sounds are both
  in the approved library, each chunk clip heard and approved in a listening round like
  everything else. It never says letter names.
- S5. Adult result controls need a 450 ms pointer hold. A keyboard operates them directly.
- S6. The app makes no network calls after load, has no accounts, and has no analytics. All data
  stays on the device. Two exceptions, each a request to the app's own host that carries no
  data, and nothing else may use them: when an adult presses and holds "Check for updates"
  in the home screen's grown-up strip (moved there from the "Grown-ups corner",
  owner-approved 2026-08-07), the app makes one request to compare versions; and when the app
  returns to the foreground, it may ask the browser to look for a newer service worker —
  approved by the owner on 2026-08-03 on the condition that the "Grown-ups corner" states
  it in plain words and offers a switch that turns it off, and Off means zero requests. A
  newer version found either way installs and waits; it never applies over an open page.
- S7. Child controls are 56 px or more. Adult controls are 44 px or more.
- S8. Multi-letter units always show as one tile: the spoken digraphs (sh, ch, th, wh, ck,
  ng), qu, the silent-letter pairs (kn, wr, mb), the doubled endings (ll, ss, ff, zz), and
  the heart-word team units — ai, ou (2026-08-12), and ey, or, ere (2026-08-17: "Both
  units join S8, tiling only", with ere riding there's approved seat description; or
  alone ships its true default sound, graded in the sound rounds — the other four bend
  per word). Owner-approved 2026-08-04 with Levels 8
  and 9; ph was considered and left out because no word obeys the bank's own rules. ai and
  ou joined on 2026-08-12, approved by ear in the heart-word sound-out round: without them
  "said" tiles as s-a-i-d and "you" as y-o-u, and the tiles would spell words no child will
  ever hear. Neither had a ruled default sound — in the wider language ai says the long a of
  rain and ou the /aʊ/ of out — so every word using one had to bend per word, and a test
  enforced exactly that, with a control. Superseded 2026-08-19, owner-ruled on the
  decades-and-rulings page: "The levels' teaching becomes the default." The hundred-level
  ladder now TEACHES ai as long a (level 58) and ou as the /aʊ/ of out (level 77), which
  the 2026-08-12 ruling predated, so ai and ou carry those defaults and the test now
  enforces the new ruling — including that said and you keep their per-word bends, which
  win over the defaults exactly as before.
  These two are units for TILING only; teaching vowel teams as code stays ruled out
  (SPEC section 12).
- S9. No file in the repository contains a personal name. The child's name is a device-local
  setting only. Two exceptions. First, owner-approved 2026-08-11: the name of a published
  author may appear, and be spoken, in the book credit of the passage stage (SPEC section
  12). Second, owner-approved 2026-08-16 ("Can we adjust the rule so it doesn't catch names
  in the game sentences and paragraphs?"): a character's name inside verbatim public-domain
  teaching content may appear and be spoken, scoped by `tools/s9-passage-names.json` — each
  name enters that ledger as its own owner-visible diff with its source credited, passes
  only inside the ledger's content files, and stays refused everywhere else. The pair rule
  is unaffected and the private denylist ignores the ledger entirely: a real family name
  always wins. S9 exists
  to keep a real child's and family's data off the device and out of the repository, and
  neither a book's author nor a book's characters are that. Third, owner-ruled 2026-08-17
  ("for researchers whose names are attached to specific research citing them with their
  names is not only acceptable but good practice"): the surname of a researcher may appear
  where it credits their published work, listed in `tools/s9-vocab.json` as an
  owner-visible diff like any other known token. The private denylist still outranks it,
  so a real family name is refused however it is dressed. Fourth, owner-ruled
  2026-08-19 ("Names in fictional books need to be kept as an exception. If a
  rule or gate finds a name somewhere it should check if it is as part of a
  sentence from one of our limited titles. If so, ignore."): a character's name
  inside verbatim text from a book pinned in `tools/corpus/sources.json` passes,
  wherever it appears. Two guards make that safe rather than a hole, and both
  are the owner's own earlier rulings. The private denylist is consulted FIRST
  and always wins, so a real family name is refused even inside a quotation. And
  the exemption is by SENTENCE, not by word: what passes is a name inside a run
  of text that is verbatim in a declared title, because "this name occurs in
  some book" would excuse every name in English. A declared source file is
  itself exempt, being the text the others are checked against. G24 carries the
  rule and seven controls that prove its refusals rather than its permissions.
  The exemption was attacked by the council's engineering seat hours after it
  shipped and had THREE breaches, all the same shape: the exemption was decided
  from a position that was not the position of the hit. Eighteen characters of a
  first reader, placed first on a line, turned the pair rule off for the rest of
  it; one quoted sentence excused every later use of a token in the same file;
  and a single manifest line turned the rule off for any file it named, since
  the pin was never verified. All three are closed and each is a control. The
  manifest is now a CAPABILITY: an entry is honoured only if its path is under
  `tools/corpus/` and its bytes hash to the pin it declares. The window is a
  whole sentence of at least 24 letters, so a short first-reader sentence cannot
  be quoted by accident - which means a name inside a sentence shorter than that
  is NOT exempt. It fails closed, and the escalation is the per-name ledger.
