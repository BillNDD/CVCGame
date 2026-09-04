"""G-gate: no sprite may contain the same block of pixels twice.

WHY THIS EXISTS. The owner looked at a ring of mushrooms on 2026-09-03 and said
"Two of the mushrooms are exactly the same. Too much like an ai pixel drawing",
and then, before he had seen any output from this tool, named the next one:
"Even to double check the ones we already approved. The individual repeating
parts of each. Like two apples on a branch." He was right on both. The ring had
a 7x7 block appearing twice, 23 columns apart, and `apple_bough` had a 6x5 block
of 21 pixels appearing twice. Both had been approved by eye.

That is the case for a gate rather than a rule: copy-paste inside a sprite is
the single most reliable tell of generated art, it is invisible at 1:1 to the
person who drew it, and it survives every review a human eye can give - because
the eye that approved the first apple is the eye that approves the second.

WHAT COUNTS AS A REPEAT, and the two mistakes the first version made.

  1. THE PLACEMENTS MUST BE DISJOINT. A straight trunk matches itself one row
     down; a flat turf band matches itself one column over. That is not
     copy-paste, that is what a uniform material IS, and refusing it would
     refuse every tree in the garden. So two placements count only if they do
     not overlap. Before that rule, this tool's top finding was a trunk
     matching itself at (0,10) and (0,11), which is nothing at all.

  2. IT MUST BE MEASURED IN LIT PIXELS, NOT AREA. A 25x3 block that is 90 per
     cent transparent is three twigs and a lot of sky, and its "repeat" is the
     sky. Counting only the drawn pixels is what separates a stamped limb from
     two thin branches that happen to sit in similar space.

  3. IT MUST NOT BE TRANSLATION-INVARIANT, and this is the one the controls
     caught rather than the author. Requiring the two placements to be disjoint
     stops a trunk matching itself ONE row down - but a long uniform trunk also
     matches itself TEN rows down, which is disjoint, and the first version
     refused it. The difference between a material and a stamp is not distance,
     it is that a uniform material matches at EVERY offset and a stamp matches
     at exactly one. So a candidate is thrown out if the same block also sits
     one pixel to the right or one pixel down from where it was first found:
     that is a region that repeats because of what it is made of, not because
     somebody copied it.

The floor is in LIT PIXELS and it is deliberately not zero. A berry is four
pixels and a plant that grows two berries has not been copy-pasted; it has
grown two berries. Somewhere above that a repeat stops being a material and
starts being a stamp, and the honest thing is to say where that line is and let
it be argued with, rather than to pretend the tool knows.

THE LEDGER, tools/art-repeats.json, is a RATCHET and not an amnesty. Every
entry names a sprite, the exact repeat that was found, and a reason a person
wrote. It is keyed on the measurement, so a sprite that is redrawn loses its
exemption automatically and has to earn a new one - an exemption that survives
a redraw is how a gate rots. A ledger entry for a sprite that no longer repeats
is reported too, because a stale exemption is a lie about the tree.

Run it plain to check the tree. Run it with --list to see everything above the
reporting floor, ledger or no ledger, which is what you want when deciding what
to redraw. Run it with --self-test for the controls.
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "art"))

LEDGER = ROOT / "tools" / "art-repeats.json"

# The finder lives in tools/art/garden.py, with the sprites it reads, so the
# gate and the fixer beside it cannot disagree about what a repeat is.
from garden import REFUSE_AT, REPORT_AT, repeats  # noqa: E402



def key(name, found):
    """The ledger key: the sprite AND the exact repeat, so a redraw loses it."""
    bh, bw, lit, a, b = found
    return f"{name}|{bw}x{bh}|{lit}|{a[0]},{a[1]}|{b[0]},{b[1]}"


def sprites():
    import garden

    out = {}
    for family in ("SPRITES", "TREES"):
        for name, entry in getattr(garden, family).items():
            out[name] = entry["map"]
    return out


def ledger():
    if not LEDGER.exists():
        return {}
    return json.loads(LEDGER.read_text(encoding="utf-8")).get("allowed", {})


def check(listing=False):
    allowed = ledger()
    found, problems, seen_keys = [], [], set()
    for name, rows in sorted(sprites().items()):
        hit = repeats(rows)
        if not hit:
            continue
        found.append((name, hit))
        k = key(name, hit)
        seen_keys.add(k)
        if hit[2] >= REFUSE_AT and k not in allowed:
            bh, bw, lit, a, b = hit
            problems.append(
                f"{name}: a {bw}x{bh} block of {lit} drawn pixels appears at "
                f"{a} and again at {b} - the same pixels twice in one sprite, "
                f"which is the copy-paste an eye cannot see at 1:1")
    for k in sorted(allowed):
        if k not in seen_keys:
            problems.append(
                f"the ledger allows '{k}' and that repeat is not in the tree - "
                f"a stale exemption is a lie about the drawing, so it must go")
    if listing:
        for name, (bh, bw, lit, a, b) in sorted(found, key=lambda f: -f[1][2]):
            mark = "REFUSED" if lit >= REFUSE_AT and key(name, (bh, bw, lit, a, b)) not in allowed else \
                   "allowed" if lit >= REFUSE_AT else "under the floor"
            print(f"  {name:28} {bw}x{bh}  {lit:3} px  at {a} and {b}   {mark}")
    print(f"Art repeats: {len(sprites())} sprites, {len(found)} with a repeat at or above "
          f"{REPORT_AT} drawn pixels, {len(allowed)} allowed by the ledger, {len(problems)} problems")
    for p in problems:
        print("PROBLEM: " + p)
    return len(problems)


def self_test():
    """The controls. A gate nobody has watched fail is a gate nobody can trust."""
    ok = []

    # A planted stamp IS caught: one 4x4 shape, drawn twice, well apart.
    stamp = ["bbhhb......bbhhb", "bhhbh......bhhbh", "hbbhb......hbbhb",
             "hhbbh......hhbbh", "bhbhb......bhbhb"]
    hit = repeats(stamp)
    ok.append(("a block stamped twice is caught", bool(hit) and hit[2] >= REFUSE_AT))
    ok.append(("and it reports both places", bool(hit) and hit[3] != hit[4]))

    # A uniform column matching ITSELF one row down is NOT a repeat - it is what
    # a trunk is. This is the mistake the first version made on every tree.
    trunk = ["..bb.." for _ in range(20)]
    ok.append(("a uniform trunk is not copy-paste", repeats(trunk) is None))

    # Mostly-transparent blocks must not qualify on area alone.
    sparse = ["b" + "." * 28 + "b" for _ in range(9)]
    ok.append(("a sparse block does not qualify on area", repeats(sparse) is None))

    # Below the floor, two small parts are a plant growing two of something.
    berries = ["...yy......yy...", "...yy......yy..."]
    hit = repeats(berries)
    ok.append(("two berries are under the refusal floor", not hit or hit[2] < REFUSE_AT))

    # The ledger is keyed on the measurement, so a redraw cannot inherit it.
    a = repeats(stamp)
    moved = ["bbhhb.......bbhhb", "bhhbh.......bhhbh", "hbbhb.......hbbhb",
             "hhbbh.......hhbbh", "bhbhb.......bhbhb"]
    b = repeats(moved)
    ok.append(("moving a repeat changes its ledger key", key("x", a) != key("x", b)))

    # THE CONTROL FOR RULE 3, which the first version of this tool failed: a
    # long uniform trunk matches itself ten rows down, which IS disjoint. It is
    # still not copy-paste, and a gate that says it is refuses every tree.
    long_trunk = ["..bb.." for _ in range(20)]
    ok.append(("a long uniform trunk is a material, not a stamp", repeats(long_trunk) is None))

    # ...but a stamp INSIDE an otherwise uniform run is still caught.
    with_stamp = ["..bb.." for _ in range(8)] + ["mhbhm.", "hbmbh.", "mhbhm."] +                  ["..bb.." for _ in range(4)] + ["mhbhm.", "hbmbh.", "mhbhm."]
    hit = repeats(with_stamp)
    ok.append(("a stamp hidden in a uniform run is still caught", bool(hit)))

    # An empty sprite is not a crash.
    ok.append(("an empty map is not a repeat", repeats([]) is None))

    # And the real tree is readable.
    ok.append(("the real tree parses", len(sprites()) > 60))

    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"art-repeats controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    sys.exit(1 if check(listing="--list" in sys.argv) else 0)
