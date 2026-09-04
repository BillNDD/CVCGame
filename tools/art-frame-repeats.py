"""The repeat gate at SCENE scale: no composed frame may stamp the same pixels twice.

WHY A SECOND TOOL. tools/art-repeats.py asks the question inside one sprite and
it cannot be pointed at a frame: it is O(area x block area), it takes 23 seconds
on a 60 x 60 corner, and a tablet frame is three hundred times that area. So the
question is the same and the algorithm has to be different. This one hashes a
fixed window in one pass - O(area) - which finds the fault a SCENE actually has,
which is not a subtle self-similarity but the same stamp put down twice.

WHAT IT FOUND THE FIRST TIME IT RAN, on the frame as composed today:
  tablet 810 x 1080: 183 distinct duplications
  the largest at offset (770, 0) - which is the left panel and the right panel
  being mirror images of each other, exactly as compose() writes them
  and below that, the ox-eye stamped at four positions with identical pixels
That is the owner's own worry, measured: "the repeated patterns is one of the
most common tropes of ai art".

WHY CLUSTERING IS THE WHOLE USABILITY OF IT. One duplicated object produces a
CLOUD of overlapping window hits, all sharing the same offset vector between the
two copies. Reported raw, a tablet frame gives 3252 hits and no human can read
that. Grouped by offset and then by locality, it gives 183 duplications, each of
which is one object copied - a number a person can act on.

WHAT IS NOT A FAULT, and the tool must not cry wolf about it:
  - A window of flat sky or flat ground matches everywhere. Those are excluded
    by requiring at least four distinct colours in the tile.
  - Two placements that OVERLAP are one object seen twice by the sliding window,
    not two copies.
  - A deliberate tiling motif - the saw-tooth band edge, a mat laid in courses -
    repeats by design. Those go in the ledger with a reason, like the sprite
    gate's, and the ledger is a ratchet keyed on the measurement.

THE HONEST LIMIT. Two grass clumps of the SAME sprite drawn at different seeds
are not caught, and should not be: they are two grass clumps. What is caught is
two that are pixel-identical, which is what stamping without varying produces.
The fix for those is vary(seed) in tools/art/garden.py, which steps each pixel
one rung along its own ramp - so the answer to a hit here is usually to seed the
instance, not to move it.

Run it plain to check every profile. Run it with --list to see each duplication.
Run it with --self-test for the controls.
"""

import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "art"))

LEDGER = ROOT / "tools" / "art-frame-repeats.json"

WINDOW = 14          # the tile side, in pixels
STEP = 2             # sample every other pixel; a stamped object is far larger
MIN_COLOURS = 4      # below this a tile is flat sky or flat ground
REFUSE_AT = 1        # a frame may contain no undeclared duplication at all


def duplications(im, k=WINDOW, step=STEP):
    """Every k x k tile appearing twice at disjoint places, grouped per object.

    Returns a list of (offset_vector, [(first, second, colours), ...]) sorted
    with the largest duplication first.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.uint8)
    height, width, _ = a.shape
    if height < k or width < k:
        return []
    flat = ((a[:, :, 0].astype(np.uint64) << np.uint64(16))
            | (a[:, :, 1].astype(np.uint64) << np.uint64(8))
            | a[:, :, 2].astype(np.uint64))
    prime = np.uint64(1000003)

    rows = np.zeros((height, width - k + 1), dtype=np.uint64)
    for y in range(height):
        h = np.zeros(width - k + 1, dtype=np.uint64)
        for i in range(k):
            h = h * prime + flat[y, i:i + width - k + 1]
        rows[y] = h
    wins = np.zeros((height - k + 1, width - k + 1), dtype=np.uint64)
    for y in range(height - k + 1):
        h = np.zeros(width - k + 1, dtype=np.uint64)
        for j in range(k):
            h = h * prime + rows[y + j]
        wins[y] = h

    seen, hits = {}, []
    for y in range(0, height - k + 1, step):
        for x in range(0, width - k + 1, step):
            value = int(wins[y, x])
            prev = seen.get(value)
            if prev is None:
                seen[value] = (x, y)
                continue
            px, py = prev
            if abs(px - x) < k and abs(py - y) < k:
                continue                      # one object, seen twice by the window
            tile = a[y:y + k, x:x + k].reshape(-1, 3)
            colours = len(np.unique(tile, axis=0))
            if colours < MIN_COLOURS:
                continue                      # flat sky or flat ground
            hits.append(((px, py), (x, y), colours))

    by_offset = {}
    for (px, py), (x, y), colours in hits:
        by_offset.setdefault((x - px, y - py), []).append(((px, py), (x, y), colours))
    out = []
    for offset, group in by_offset.items():
        group.sort()
        run = [group[0]]
        for hit in group[1:]:
            near = (abs(hit[0][0] - run[-1][0][0]) <= k
                    and abs(hit[0][1] - run[-1][0][1]) <= k)
            if near:
                run.append(hit)
            else:
                out.append((offset, run))
                run = [hit]
        out.append((offset, run))
    return sorted(out, key=lambda o: -len(o[1]))


def key(profile, offset, first):
    """The ledger key: profile, offset and where it starts, so a recomposed
    scene loses its exemption and has to earn a new one."""
    return f"{profile}|{offset[0]},{offset[1]}|{first[0]},{first[1]}"


def ledger():
    if not LEDGER.exists():
        return {}
    return json.loads(LEDGER.read_text(encoding="utf-8")).get("allowed", {})


def check(listing=False):
    import garden

    allowed = ledger()
    problems, seen_keys, total = [], set(), 0
    for profile in sorted(garden.PROFILES):
        found = duplications(garden.compose(profile))
        total += len(found)
        if listing:
            print(f"  {profile}: {len(found)} duplications")
        for offset, group in found:
            first = group[0][0]
            k = key(profile, offset, first)
            seen_keys.add(k)
            if listing:
                print(f"     offset {offset}, about {len(group) * STEP * STEP} px, "
                      f"at {first} and {group[0][1]}")
            if k not in allowed:
                problems.append(
                    f"{profile}: a region of about {len(group) * STEP * STEP} pixels at "
                    f"{first} is repeated exactly at offset {offset} - the same stamp twice "
                    f"in one scene, which is the most common tell of generated art. Seed the "
                    f"instance with vary() rather than moving it.")
    for k in sorted(allowed):
        if k not in seen_keys:
            problems.append(
                f"the ledger allows '{k}' and that duplication is not in any frame - "
                f"a stale exemption is a lie about the drawing, so it must go")
    print(f"Art frame repeats: {len(garden.PROFILES)} profiles, {total} duplications, "
          f"{len(allowed)} allowed by the ledger, {len(problems)} problems")
    for p in problems[:12]:
        print("PROBLEM: " + p)
    if len(problems) > 12:
        print(f"PROBLEM: ...and {len(problems) - 12} more")
    return len(problems)


def self_test():
    """The controls. A gate nobody has watched fail is a gate nobody can trust."""
    from PIL import Image, ImageDraw

    ok = []

    def blank(w, h, c=(30, 40, 35)):
        return Image.new("RGB", (w, h), c)

    def blob(im, x, y):
        d = ImageDraw.Draw(im)
        # DELIBERATELY ASYMMETRIC. The first fixture here was symmetric top to
        # bottom, so its own two halves matched and the controls "one object
        # alone" and "one changed pixel" both went red - the tool was right and
        # the test object was the fault. A symmetric shape IS repeated pixels,
        # which is the sprite gate's question, not this one's.
        for i, row in enumerate(["..##..", ".#@@#.", "#@%%@#", "#@%@##", ".#%@#.", "..#@.."]):
            for j, ch in enumerate(row):
                if ch != ".":
                    d.point((x + j, y + i),
                            fill={"#": (200, 80, 40), "@": (120, 200, 90), "%": (250, 230, 60)}[ch])

    # A stamp put down twice IS caught.
    im = blank(80, 40); blob(im, 4, 6); blob(im, 50, 20)
    ok.append(("the same stamp twice is caught", len(duplications(im, k=6, step=1)) >= 1))

    # A flat field is NOT a duplication, however large.
    ok.append(("a flat field is not a duplication", duplications(blank(80, 40), k=6, step=1) == []))

    # A single object is not a duplication of itself.
    im = blank(80, 40); blob(im, 20, 10)
    ok.append(("one object alone is not a duplication", duplications(im, k=6, step=1) == []))

    # WHAT vary(seed) PRODUCES is caught as two objects rather than a copy, and
    # the control says SEVERAL pixels rather than one on purpose. One pixel is
    # NOT enough and the first version of this control claimed it was: a window
    # smaller than the object still matches over the parts that did not change,
    # so a single edit leaves plenty of identical tiles. The tool was right and
    # the claim was too strong. vary() steps pixels all across a sprite, which
    # is what actually breaks every window - so that is what is tested.
    im = blank(80, 40); blob(im, 4, 6); blob(im, 50, 20)
    d = ImageDraw.Draw(im)
    for px, py in ((51, 21), (53, 22), (52, 24), (54, 25), (51, 23)):
        d.point((px, py), fill=(90, 160, 70))
    ok.append(("a varied copy is two objects, not one stamped twice",
               duplications(im, k=6, step=1) == []))

    # ...and the counterpart, so the pair measures something: the SAME two
    # objects, unvaried, are still caught.
    im2 = blank(80, 40); blob(im2, 4, 6); blob(im2, 50, 20)
    ok.append(("...while the unvaried pair is still caught",
               len(duplications(im2, k=6, step=1)) >= 1))

    # The ledger key moves when the duplication moves.
    ok.append(("a moved duplication changes its ledger key",
               key("p", (10, 0), (1, 1)) != key("p", (10, 0), (2, 1))))

    # An image smaller than the window is not a crash.
    ok.append(("a tiny image is not a crash", duplications(blank(4, 4), k=6, step=1) == []))

    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"art-frame-repeats controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    sys.exit(1 if check(listing="--list" in sys.argv) else 0)
