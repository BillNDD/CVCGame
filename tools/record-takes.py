# Record one listening round — words or sentences, one tool.
#
# WHY ONE TOOL. There were two, and the second never got the first's guarantee.
# On 2026-08-19 an audit found 22 owner-approved sentence takes banked by a
# script in neither the repository nor the scratchpad, with no step refusing
# bytes that failed to hash to what the owner heard. The word recorder had that
# step; the sentence path never did. The same split produced two other faults
# the same week: `render_sbatch1.py` kept an id-collision bug after
# `render_sbatch2.py` was fixed, and `comebacks.json` stayed stale after
# `final-comeback.json` was rebuilt by hand. A word row and a sentence row
# differ in three things — the key shape, the file prefix, and one field — and
# all three are one `s:` test. One recorder, one refusal path, one place to fix.
#
# THE FOUR GUARANTEES, each earned by a fault this repository has already paid
# for:
#
#   1. VERIFY, THEN WRITE, ATOMICALLY. Nothing reaches the tree until every
#      accepted take has been checked. The old word recorder wrote mp3s inside
#      its accept loop and printed "REFUSED - nothing written" afterwards, which
#      was false: a refusal partway through left orphan bytes on disk.
#   2. REFUSE AN ID THAT ALREADY EXISTS. G26 rule 3 catches two rows sharing
#      bytes; it cannot catch an overwrite, because only one row survives to be
#      compared. The recorder is the only place that can. Arm ids are minted
#      positionally and a counter can read a ledger a later step writes, so this
#      is not hypothetical: a simulation showed batch 3 rendered before batch 2
#      was recorded would reuse the live approved id `s:v3-l33-01`.
#   3. REFUSE A LINE IT CANNOT PARSE. The old recorder skipped unrecognised
#      lines silently, and its regex enumerated "no verdict" as if handled while
#      no branch touched it. A malformed line lost the owner's judgement with no
#      error — the same class as the page that silently exported "no verdict".
#   4. PERSIST THE WHOLE VERDICT. Accepts, closests, refusals and every comment.
#      The owner's notes diagnosed two clipping faults that the batch statistics
#      had hidden, and those notes lived only in terminal scrollback. E10: a
#      verdict that lives only in a chat log is a verdict this project will
#      lose, and has.
#
# WHAT THIS CANNOT DO. It cannot tell that the take it is banking is the one the
# owner meant — it can only prove the bytes are the bytes the page offered under
# that id. If the wrong audio file is passed, and that file happens to use the
# same id scheme, guarantee 2 refuses it only because the id already exists;
# a genuinely new id from the wrong render would pass. The defence there is that
# the page and the recorder read the SAME file, which is why the audio file is a
# required argument here and was optional before.
#
# Usage:
#   python3 tools/record-takes.py <audio.json> <round-label> < verdicts.txt
#   python3 tools/record-takes.py --self-test
import base64
import hashlib
import io
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
PEND = REPO / "tools" / "pending-words"
LEDGER = PEND / "pending-words.json"
VERDICT_LOG = PEND / "round-verdicts.json"

# The two values G26 rule 6 declares. `perfect` means the owner chose this clip;
# `either-is-fine` means he judged two acceptable and declined to choose. They
# are not synonyms and must not be collapsed — see tools/waiting-room.mjs.
ACCEPT_VERDICTS = ("perfect", "either-is-fine")

# One line per item. The id is a bare word or a sentence id; the verdict is one
# of the five below; an accept or a closest names the arm it refers to; anything
# after " - " is the owner's comment and is kept whatever the verdict.
LINE = re.compile(
    r"^\s*(?P<id>[A-Za-z0-9:'_-]+)\s*:\s*"
    r"(?P<verdict>perfect|either-is-fine|accept|closest|none are right|no verdict)"
    r"(?:\s+(?P<arm>[^\s-][^\s]*))?"
    r"(?:\s*-\s*(?P<note>.*))?\s*$")


def parse(text):
    """Every line becomes a record or a refusal. Nothing is skipped."""
    items, refusals = [], []
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = LINE.match(line)
        if not m:
            refusals.append("line %d is not a verdict this tool understands: %r" % (n, raw))
            continue
        v = m.group("verdict")
        if v == "no verdict":
            refusals.append("line %d records no verdict for %r — the page must not export an unmarked item, "
                            "and this tool will not guess one" % (n, m.group("id")))
            continue
        items.append({"id": m.group("id"), "verdict": "perfect" if v == "accept" else v,
                      "arm": m.group("arm"), "note": (m.group("note") or "").strip(),
                      "line": n, "kind": "accept" if v in ("perfect", "either-is-fine", "accept") else v})
    return items, refusals


def file_for(key):
    """G26 uses this same derivation; the two must agree."""
    return ("s-" + key[2:] if key.startswith("s:") else "w-" + key) + ".mp3"


def plan(items, audio, ledger):
    """Decide everything before touching the tree. Returns (writes, refusals)."""
    writes, refusals = [], []
    for it in items:
        if it["kind"] != "accept":
            continue
        key = it["id"]
        if key in ledger:
            refusals.append("%s is already in the ledger (round %r) — refusing to mint over a banked, "
                            "owner-approved take" % (key, ledger[key].get("round")))
            continue
        takes = audio.get(key) or []
        if isinstance(takes, dict):
            takes = [takes]
        take = next((t for t in takes if t.get("id") == it["arm"]), None)
        if take is None and it["arm"] is None and len(takes) == 1:
            take = takes[0]                      # a single-take render needs no arm id
        if take is None:
            refusals.append("%s names arm %r, which this audio file does not offer" % (key, it["arm"]))
            continue
        raw = base64.b64decode(take["b64"])
        got = hashlib.sha256(raw).hexdigest()
        if got != take.get("sha256"):
            refusals.append("%s: the offered bytes hash to %s, the page recorded %s — the owner judged "
                            "specific bytes and only those may be banked" % (key, got[:12], str(take.get("sha256"))[:12]))
            continue
        writes.append({"key": key, "bytes": raw, "sha": got, "take": take, "item": it})
    # two accepts for one id inside a single round
    seen = {}
    for w in writes:
        seen.setdefault(w["key"], []).append(w["item"]["line"])
    for key, lines in seen.items():
        if len(lines) > 1:
            refusals.append("%s is accepted twice in this round, at lines %s" % (key, lines))
    return writes, refusals


def row_for(w, round_label):
    """A word row records WHICH offer was accepted; a sentence row records the
    text, because the text is the thing approved and nothing else holds it."""
    t, it = w["take"], w["item"]
    row = {"ms": t["ms"], "sha256": w["sha"], "round": round_label,
           "verdict": it["verdict"], "level": t.get("level", "unseated - ladder redesign")}
    if t.get("family"):
        row["family"] = t["family"]
    if w["key"].startswith("s:"):
        row["text"] = t["text"]
        if t.get("credit"):
            row["credit"] = t["credit"]
    else:
        row["arm"] = t["id"]
    if it["note"]:
        row["note"] = it["note"]
    return row


def record(audio, ledger, text, round_label, write=None):
    """The whole decision, as a pure function so a fixture can drive it.
    `write` is a sink taking (relative_name, bytes); None means dry run."""
    items, refusals = parse(text)
    writes, more = plan(items, audio, ledger)
    refusals = refusals + more
    if refusals:
        return {"ok": False, "refusals": refusals, "written": 0, "ledger": ledger, "items": items}
    new = dict(ledger)
    for w in writes:
        if write:
            write(file_for(w["key"]), w["bytes"])
        new[w["key"]] = row_for(w, round_label)
    return {"ok": True, "refusals": [], "written": len(writes), "ledger": new, "items": items}


def verdict_log(items, round_label, prior=None):
    """GUARANTEE 4. Every judgement, not only the accepts — a closest and its
    comment are the densest information the owner produces in a round, and the
    old recorder printed them and kept nothing."""
    log = dict(prior or {})
    log[round_label] = [{"id": i["id"], "verdict": i["verdict"] if i["kind"] == "accept" else i["kind"],
                         "arm": i["arm"], "note": i["note"]} for i in items]
    return log


def main(argv):
    if len(argv) < 3:
        print(__doc__ or "usage: record-takes.py <audio.json> <round-label>")
        return 2
    audio = json.loads(pathlib.Path(argv[1]).read_text(encoding="utf-8"))
    round_label = argv[2]
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    text = sys.stdin.read()

    # DRY RUN FIRST: decide everything, touch nothing.
    dry = record(audio, ledger, text, round_label, write=None)
    if not dry["ok"]:
        print("REFUSED — the tree has not been touched:")
        for r in dry["refusals"]:
            print("   !!", r)
        return 1

    # Only now does anything reach the disk.
    written = []
    try:
        res = record(audio, ledger, text, round_label,
                     # Append FIRST, write second. The previous form used `or`, and write_bytes
        # returns a byte count - truthy for any real clip - so the append never ran,
        # the rollback list stayed empty and the success line always said zero.
        write=lambda name, data: (written.append(name), (PEND / name).write_bytes(data)))
    except Exception:
        for name in written:
            (PEND / name).unlink(missing_ok=True)
        raise
    io.open(LEDGER, "w", encoding="utf-8", newline="\n").write(json.dumps(res["ledger"], indent=1) + "\n")
    prior = json.loads(VERDICT_LOG.read_text(encoding="utf-8")) if VERDICT_LOG.exists() else {}
    VERDICT_LOG.write_text(json.dumps(verdict_log(res["items"], round_label, prior), indent=1) + "\n",
                           encoding="utf-8")
    kinds = {}
    for i in res["items"]:
        kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
    print("round %s: %d banked, %d clips written" % (round_label, res["written"], len(written)))
    print("  every judgement recorded in %s: %s" % (VERDICT_LOG.name,
          ", ".join("%s %d" % (k, n) for k, n in sorted(kinds.items()))))
    owed = [i for i in res["items"] if i["kind"] != "accept"]
    if owed:
        print("  OWED A COMEBACK:")
        for i in owed:
            print("     %-14s %-16s %s" % (i["id"], i["kind"], i["note"]))
    return 0


if __name__ == "__main__" and "--self-test" in sys.argv:
    def sha(b):
        return hashlib.sha256(b).hexdigest()
    A, B = b"take-a", b"take-b"
    AUD = {"jump": [{"id": "jump_1", "family": "say_sp0.85", "ms": 900, "b64": base64.b64encode(A).decode(), "sha256": sha(A)}],
           "s:v3-l02-01": [{"id": "s:v3-l02-01", "family": "sentence_sp1.0", "ms": 1190, "text": "I sip.",
                            "b64": base64.b64encode(B).decode(), "sha256": sha(B)}]}
    LED = {"_comment": "x", "already": {"sha256": "dead", "round": "batch 20"}}
    ok = []

    def say(cond, why):
        ok.append(cond)
        print(("ok   " if cond else "FAIL ") + why)

    # GUARANTEE 1 — verify then write, atomically
    sink = []
    r = record(AUD, LED, "jump: accept jump_1\ns:v3-l02-01: perfect s:v3-l02-01\n", "r1",
               write=lambda n, d: sink.append(n))
    say(r["ok"] and r["written"] == 2 and len(sink) == 2, "a clean round banks both takes")
    say(r["ledger"]["jump"]["arm"] == "jump_1", "a word row records which arm was accepted")
    say(r["ledger"]["s:v3-l02-01"]["text"] == "I sip.", "a sentence row records the text")
    say("arm" not in r["ledger"]["s:v3-l02-01"] and "text" not in r["ledger"]["jump"],
        "each kind carries its own field and not the other's")
    bad = dict(AUD)
    bad["jump"] = [{**AUD["jump"][0], "sha256": "0" * 64}]
    sink2 = []
    r2 = record(bad, LED, "jump: accept jump_1\ns:v3-l02-01: perfect s:v3-l02-01\n", "r1",
                write=lambda n, d: sink2.append(n))
    say(not r2["ok"], "bytes that do not hash to what the page offered are REFUSED")
    say(len(sink2) == 0, "GUARANTEE 1: a refusal writes NOTHING, not even the takes that passed")

    # GUARANTEE 2 — refuse an id that already exists
    r3 = record({"already": [{"id": "already", "ms": 1, "b64": base64.b64encode(A).decode(), "sha256": sha(A)}]},
                LED, "already: accept already\n", "r2", write=lambda n, d: None)
    say(not r3["ok"] and any("already in the ledger" in x for x in r3["refusals"]),
        "GUARANTEE 2: an id already banked is refused, never overwritten")
    r3b = record(AUD, LED, "jump: accept jump_1\njump: accept jump_1\n", "r2", write=lambda n, d: None)
    say(not r3b["ok"], "the same id accepted twice in one round is refused")

    # GUARANTEE 3 — refuse a line it cannot parse
    r4 = record(AUD, LED, "jump: accepted jump_1\n", "r3", write=lambda n, d: None)
    say(not r4["ok"] and any("not a verdict" in x for x in r4["refusals"]),
        "GUARANTEE 3: an unparsable line is refused, not skipped")
    r5 = record(AUD, LED, "jump: no verdict\n", "r3", write=lambda n, d: None)
    say(not r5["ok"] and any("no verdict" in x for x in r5["refusals"]),
        "GUARANTEE 3: 'no verdict' is refused rather than silently dropped")
    r6 = record(AUD, LED, "jump: accept jump_9\n", "r3", write=lambda n, d: None)
    say(not r6["ok"] and any("does not offer" in x for x in r6["refusals"]),
        "an arm the audio file does not hold is refused")

    # GUARANTEE 4 — persist the whole verdict
    items, _ = parse("jump: accept jump_1\nfoxes: closest foxes_2 - the f is eaten\nbadge: none are right - all clipped\n")
    log = verdict_log(items, "r4")
    say(len(log["r4"]) == 3, "GUARANTEE 4: accepts, closests and refusals are all logged")
    say(any(e["note"] == "the f is eaten" for e in log["r4"])
        and any(e["note"] == "all clipped" for e in log["r4"]),
        "GUARANTEE 4: the owner's comments are kept, not printed and lost")

    # rule 6's vocabulary, and the distinction it protects
    r7 = record(AUD, LED, "jump: either-is-fine jump_1\n", "r5", write=lambda n, d: None)
    say(r7["ok"] and r7["ledger"]["jump"]["verdict"] == "either-is-fine",
        "either-is-fine is banked as itself and never rewritten to perfect")
    r8 = record(AUD, LED, "jump: good jump_1\n", "r5", write=lambda n, d: None)
    say(not r8["ok"], "a verdict outside the declared two is refused at the door, so G26 rule 6 stays green")

    # THE CONTROL ON THE CONTROLS. A recorder that accepted everything, and one
    # that refused everything, must both fail this suite. Without this, every
    # row above can pass on a stub.
    stub_yes = record(AUD, LED, "jump: accepted jump_1\n", "meta", write=lambda n, d: None)
    stub_no = record(AUD, LED, "jump: accept jump_1\n", "meta", write=lambda n, d: None)
    say(not stub_yes["ok"] and stub_no["ok"],
        "control: the suite holds both a refusal and an acceptance, so no stub satisfies it")
    passing = sum(1 for c in ok if c)
    print("\nrecord-takes controls: %d passed, %d failed" % (passing, len(ok) - passing))
    sys.exit(0 if passing == len(ok) else 1)

if __name__ == "__main__":
    sys.exit(main(sys.argv))
