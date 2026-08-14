# The refusals that stop a listening round re-proving something already known.
#
# WHY THIS EXISTS. On 2026-08-12 round 1 for the word "a" offered the owner five
# plain phoneme renders. docs/settled.md already held both halves of the answer
# — "Phoneme renders are robotic and are not offered again" and "A new word is
# cut from a carrier, never rendered plain" — and tools/voice-words.csv already
# held, for all 432 bank words, which family had actually won. Neither was read.
# A round of the owner's listening time was spent re-proving it.
#
# A checklist cannot fix that: a declaration that a file was read is worth
# nothing. So the mechanical parts of those two records become refusals here,
# and a round builder calls them before it offers anything. Each refusal below
# would have stopped round 1 on its own.
#
# WHAT IS MECHANICAL AND WHAT IS NOT. Only rules that can be checked live here.
# "The register is a teacher's" is a judgement and stays prose in
# docs/settled.md. "Never offer a bare render" is a rule and lives here.
#
# Run: python3 tools/round_guard.py --self-test
import csv
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "tools" / "voice-words.csv"
LEDGER = REPO / "tools" / "pending-words" / "pending-words.json"


def history(word):
    """Every family this word has already been through, from the two records
    that hold them: the bank's permanent repository and the waiting room. The
    CSV keeps the winner in ear_notes as "family <name>"; the ledger keeps it
    as a field. Returns {family: verdict}."""
    out = {}
    if CSV_PATH.exists():
        for r in csv.DictReader(CSV_PATH.open(encoding="utf-8")):
            if r["word"].strip().lower() != word:
                continue
            m = re.search(r"family ([^;]+)", r.get("ear_notes", ""))
            if m:
                out[m.group(1).strip()] = r.get("verdict", "").strip()
    if LEDGER.exists():
        d = json.loads(LEDGER.read_text(encoding="utf-8"))
        rec = d.get(word)
        if isinstance(rec, dict) and rec.get("family"):
            out[rec["family"]] = rec.get("verdict", "")
    return out


def refuse_plain(arm):
    """settled.md: "A new word is cut from a carrier, never rendered plain. Do
    not spend an arm on a bare render again." All thirteen of batch 1's winners
    came from a carrier; not one plain render was ever accepted, and the two
    phoneme arms of batch 2 were called "terribly robotic"."""
    if not arm.get("carrier"):
        return ("a bare render with no carrier — settled.md closed this family; "
                "every winner in the pack came from a carrier")
    return None


def refuse_letter_name(arm, phonemise):
    """A word that is also the name of a letter says that name when it is
    utterance-final, and S4 forbids the app ever saying a letter name. The
    phonemiser knows before anything is rendered. `phonemise` is passed in
    rather than imported, because it is only reachable after the synthesiser
    has set up its library path."""
    carrier = arm.get("carrier")
    if not carrier:
        return None
    ph = phonemise(carrier).split()
    if not ph or ph[-1] != "eɪ":
        return None
    # The carrier ENDS on the letter name. That does not condemn the carrier —
    # "Listen. a. a. a." is lɪsən ɐ ɐ eɪ, and its first two instances are the
    # real word. It condemns the LAST instance only. An arm that does not say
    # which instance it takes cannot be shown to be safe, so it is refused too:
    # a cut whose position is unknown is a guess, and this file exists to stop
    # guesses reaching a listener.
    idx, n = arm.get("index"), arm.get("instances")
    if idx is None or n is None:
        return (f'"{carrier}" ends on the letter name ({" ".join(ph)}) and this arm does '
                "not say which instance it takes")
    if idx >= n - 1:
        return (f'"{carrier}" ends on the letter name ({" ".join(ph)}) and this arm takes '
                f"instance {idx} of {n} — the last one, which S4 forbids")
    return None


def refuse_repeat(arm):
    """A family this word has already been offered and refused. The round
    history is in the two records; re-offering a refusal spends a round to
    learn nothing. A family that was ACCEPTED is not refused here — a word may
    legitimately be re-cut in the same family."""
    seen = history(arm["word"])
    v = seen.get(arm.get("family", ""))
    if v and v not in ("perfect", "very good", "ok", "almost perfect"):
        return (f'family {arm["family"]!r} was already offered for "{arm["word"]}" '
                f"and came back {v!r}")
    return None


REFUSALS = [("bare render", refuse_plain), ("letter name", refuse_letter_name),
            ("already refused", refuse_repeat)]

SETTLED = REPO / "docs" / "settled.md"
# Each refusal is ANCHORED to the sentence in docs/settled.md that justifies it.
# The guard is not allowed to enforce a rule the record no longer holds, and it
# is not allowed to paraphrase one either: if an anchor stops appearing —
# reworded, softened, deleted — every round refuses to build until a person
# reconciles the two. This is the same shape as the doc-truth gate, applied to
# the one record that says what does NOT work.
ANCHORS = {
    "bare render": "A new word is cut from a carrier, never rendered plain.",
    "letter name": "An isolated English article IS the letter name",
    "already refused": "Phoneme renders are robotic and are not offered again.",
}


def check_anchors(text=None):
    """Every refusal must still be backed by docs/settled.md. Returns the list
    of anchors that have gone missing."""
    t = text if text is not None else SETTLED.read_text(encoding="utf-8")
    return [f'{name}: settled.md no longer says "{a}"' for name, a in ANCHORS.items() if a not in t]


def closed_notes(text=None):
    """Every closed claim in docs/settled.md, as a list. A round builder prints
    these before it offers anything, so the record of what does NOT work is in
    front of whoever designs the round rather than in a file they meant to
    open. The owner's instruction, 2026-08-12: consulting what does not work is
    a MUST, not a courtesy."""
    t = text if text is not None else SETTLED.read_text(encoding="utf-8")
    return [re.sub(r"\s+", " ", m.group(1)).strip()
            for m in re.finditer(r"^- \*\*(.+?)\*\*", t, re.M | re.S)]


def screen(arms, phonemise=None):
    """Returns (kept, refused). A round builder calls this and offers only what
    comes back kept. Refusals are reported, never silently dropped: a field
    that quietly shrank is a field nobody can reason about.

    Refuses to run at all if docs/settled.md has stopped backing one of these
    rules — enforcing a rule the record does not hold is as wrong as ignoring
    one it does."""
    missing = check_anchors()
    if missing:
        raise SystemExit("round guard refuses to screen anything:\n  " + "\n  ".join(missing))
    kept, refused = [], []
    for arm in arms:
        why = None
        for name, fn in REFUSALS:
            why = fn(arm, phonemise) if fn is refuse_letter_name else fn(arm)
            if why:
                why = f"[{name}] {why}"
                break
        (refused if why else kept).append((arm, why) if why else arm)
    return kept, refused


def self_test():
    """Each refusal must fire on its own target and stay silent otherwise. The
    fixtures are the real cases from 2026-08-12, not invented ones."""
    fake_ph = {"Listen—a.": "lɪsən eɪ ", "Listen. a. a. a.": "lɪsən ɐ ɐ eɪ ",
               "The printed word is “a”.": "ðə pɹɪntᵻd wɜːd ɪz eɪ "}
    ph = lambda t: fake_ph.get(t, "")
    cases = [
        ("a bare render is refused", refuse_plain({"word": "a"}) is not None),
        ("a carrier render is not", refuse_plain({"word": "a", "carrier": "Listen. a. a. a."}) is None),
        ("a carrier ending on the word is refused as the letter name",
         refuse_letter_name({"word": "a", "carrier": "Listen—a."}, ph) is not None),
        ("taking the LAST instance of a repeat carrier is refused",
         refuse_letter_name({"word": "a", "carrier": "Listen. a. a. a.", "index": 2, "instances": 3}, ph) is not None),
        ("an arm that does not say which instance it takes is refused",
         refuse_letter_name({"word": "a", "carrier": "Listen. a. a. a."}, ph) is not None),
        ("the quoted carrier is refused too",
         refuse_letter_name({"word": "a", "carrier": "The printed word is “a”."}, ph) is not None),
        ("an earlier instance of the same carrier is allowed",
         refuse_letter_name({"word": "a", "carrier": "Listen. a. a. a.", "index": 1, "instances": 3}, ph) is None),
        ("a word with no carrier cannot trip the letter-name check",
         refuse_letter_name({"word": "a"}, ph) is None),
    ]
    # The history reader must find what the records actually hold. "and" won
    # carrier_listen_s1 in batch 1 and is now a Level 10 bank word, so its row
    # carries that family; a word nobody has ever offered has no history.
    h = history("and")
    cases.append((f'the round history for "and" is found ({len(h)} family/ies: {", ".join(h) or "none"})', len(h) >= 1))
    cases.append(("a word with no history returns none", history("zzzz") == {}))
    # And the repeat refusal must use it: a family recorded as accepted is
    # allowed back, an invented refusal is not.
    fam = next(iter(h), None)
    if fam:
        cases.append((f'an accepted family ({fam!r}) may be offered again',
                      refuse_repeat({"word": "and", "family": fam, "carrier": "x"}) is None))
    # The anchors must hold against the real file, and the check must FIRE when
    # the record stops saying what a refusal claims it says.
    cases.append(("every refusal is still backed by settled.md", check_anchors() == []))
    gutted = SETTLED.read_text(encoding="utf-8").replace(ANCHORS["bare render"], "(this sentence was removed)")
    cases.append(("a refusal whose sentence vanished from settled.md is caught",
                  len(check_anchors(gutted)) == 1))
    notes = closed_notes()
    cases.append((f"the closed-claims list is readable ({len(notes)} claims in settled.md)", len(notes) > 20))
    kept, refused = screen([{"word": "a"},
                            {"word": "a", "carrier": "Listen. a. a. a.", "index": 1, "instances": 3}], ph)
    cases.append(("screen keeps the good arm and reports the bad one",
                  len(kept) == 1 and len(refused) == 1))
    for name, passed in cases:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in cases if not p)
    print(f"\nround-guard controls: {len(cases) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    if len(sys.argv) > 1:
        w = sys.argv[1]
        h = history(w)
        print(f'"{w}" has been through {len(h)} family/ies:' if h else f'"{w}" has no recorded round')
        for fam, v in sorted(h.items()):
            print(f"  {v or '(no verdict)':14} {fam}")
