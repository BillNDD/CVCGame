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

WHAT IT COULD NOT SEE, found 2026-09-05. The fifth composition passed this gate
with zero duplications and the owner rejected it in one look: "two slivers that
are just mirrors almost of each other." A mirror is a copy by REFLECTION, and a
window hash matches only copies by translation - the reflected tile hashes to a
different value. The (770, 0) hit above was caught only because the old
compose() wrote the right panel as the left panel's literal flip, so the
symmetric parts of each sprite happened to match. reflections() closes that:
it hashes the frame and its horizontal flip and reports every tile that
appears mirrored at a disjoint place, clustered by mirror axis. A single
left-right symmetric object is one object and is not reported. The panel's
gatekeeper had been building this test by hand each round.

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


def _window_hashes(a, k):
    """One hash per k x k window of an RGB array, in one pass over the rows.

    TWO PRIMES, one along the columns and another along the rows. With one
    prime for both, a pixel's weight is prime to the power of (row + column)
    and depends on that sum alone, so a window hashes equal to its own
    transpose and to any shuffle along its anti-diagonals. The reflection
    controls found it on 2026-09-05: a left-right symmetric fixture reported a
    window as the mirror of another that was in fact its 180-degree rotation,
    pixel-unequal. The translation finder had carried the same blind spot from
    the day it was written, unseen because a transposed copy is rare in art."""
    height, width, _ = a.shape
    flat = ((a[:, :, 0].astype(np.uint64) << np.uint64(16))
            | (a[:, :, 1].astype(np.uint64) << np.uint64(8))
            | a[:, :, 2].astype(np.uint64))
    along = np.uint64(1000003)
    down = np.uint64(998244353)

    rows = np.zeros((height, width - k + 1), dtype=np.uint64)
    for y in range(height):
        h = np.zeros(width - k + 1, dtype=np.uint64)
        for i in range(k):
            h = h * along + flat[y, i:i + width - k + 1]
        rows[y] = h
    wins = np.zeros((height - k + 1, width - k + 1), dtype=np.uint64)
    for y in range(height - k + 1):
        h = np.zeros(width - k + 1, dtype=np.uint64)
        for j in range(k):
            h = h * down + rows[y + j]
        wins[y] = h
    return wins


def _cluster(hits, k, group_key):
    """Hits that share a group key and stand within a window of ANY hit already
    in the cluster are one object; returned largest first. The first cut
    compared each hit with the last one only, in sorted order, so a column of
    hits taller than the window split into a new cluster at every column - a
    mirrored panel of two objects reported as thirty-two. Union-find, on the
    sorted hits, so the count means objects."""
    by = {}
    for hit in hits:
        by.setdefault(group_key(hit), []).append(hit)
    out = []
    for g, group in by.items():
        group.sort()
        parent = list(range(len(group)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for i in range(len(group)):
            xi, yi = group[i][0]
            for j in range(i + 1, len(group)):
                xj, yj = group[j][0]
                if xj - xi > k:
                    break                     # sorted by x: nothing further can be near
                if abs(yj - yi) <= k:
                    parent[find(j)] = find(i)
        runs = {}
        for i, hit in enumerate(group):
            runs.setdefault(find(i), []).append(hit)
        for run in runs.values():
            out.append((g, run))
    return sorted(out, key=lambda o: -len(o[1]))


def reflections(im, k=WINDOW, step=STEP):
    """Every k x k tile that appears MIRRORED (left for right) at a disjoint
    place: the copy a translation hash cannot see. Returns a list of
    ((axis_sum, dy), [(first, second, colours), ...]) largest first, where the
    mirror axis stands at axis_sum / 2 and the second copy sits dy rows below
    the first. A single symmetric object matches only itself and is skipped."""
    a = np.asarray(im.convert("RGB"), dtype=np.uint8)
    height, width, _ = a.shape
    if height < k or width < k:
        return []
    wins = _window_hashes(a, k)
    flipped = _window_hashes(np.ascontiguousarray(a[:, ::-1]), k)
    # a tile of the flipped frame at column x is the mirror of the original's
    # tile at column width - k - x
    index = {}
    for y in range(0, height - k + 1, step):
        for x in range(0, width - k + 1, step):
            index.setdefault(int(flipped[y, x]), []).append((width - k - x, y))
    hits = []
    for y in range(0, height - k + 1, step):
        for x in range(0, width - k + 1, step):
            matches = index.get(int(wins[y, x]))
            if not matches:
                continue
            # flatness is decided ONCE per tile, before the matches are walked:
            # every flat window of a field shares one hash, so walking that
            # bucket per position is quadratic - the first cut of this loop
            # did exactly that and never finished its own self-test
            tile = a[y:y + k, x:x + k].reshape(-1, 3)
            colours = int(len(np.unique(tile, axis=0)))
            if colours < MIN_COLOURS:
                continue                      # flat sky or flat ground
            for (mx, my) in matches:
                if (mx, my) <= (x, y):
                    continue                  # each pair once, and never a tile with itself
                # ONE SYMMETRIC OBJECT, SEEN ONCE: its own left half mirrors its
                # own right half, and the two windows that show it can stand up
                # to the object's width apart - a window's worth of background on
                # one side, the object's far edge on the other. Two windows is
                # the allowance; a left-right symmetric thing wider than that is
                # reported, and that is intended: at scene scale it is the tell.
                if abs(mx - x) < 2 * k and abs(my - y) < k:
                    continue
                hits.append(((x, y), (mx, my), colours))
    return _cluster(hits, k, lambda h: (h[0][0] + h[1][0] + k, h[1][1] - h[0][1]))


def duplications(im, k=WINDOW, step=STEP):
    """Every k x k tile appearing twice at disjoint places, grouped per object.

    Returns a list of (offset_vector, [(first, second, colours), ...]) sorted
    with the largest duplication first.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.uint8)
    height, width, _ = a.shape
    if height < k or width < k:
        return []
    wins = _window_hashes(a, k)

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
    return _cluster(hits, k, lambda h: (h[1][0] - h[0][0], h[1][1] - h[0][1]))


def key(profile, offset, first):
    """The ledger key: profile, offset and where it starts, so a recomposed
    scene loses its exemption and has to earn a new one. A reflection's
    'offset' is ('mirror', axis_sum, dy) and keys apart from any translation."""
    return f"{profile}|{','.join(str(v) for v in offset)}|{first[0]},{first[1]}"


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
        mirrored = reflections(garden.compose(profile))
        total += len(mirrored)
        if listing:
            print(f"  {profile}: {len(mirrored)} reflections")
        for (axis_sum, dy), group in mirrored:
            first = group[0][0]
            k = key(profile, ("mirror", axis_sum, dy), first)
            seen_keys.add(k)
            if listing:
                print(f"     mirror axis at x={axis_sum / 2:.0f}, {dy:+d} rows, about "
                      f"{len(group) * STEP * STEP} px, at {first} and {group[0][1]}")
            if k not in allowed:
                problems.append(
                    f"{profile}: a region of about {len(group) * STEP * STEP} pixels at "
                    f"{first} appears again MIRRORED about x={axis_sum / 2:.0f} at {group[0][1]} - "
                    f"the two sides of the scene are reflections of each other, which the owner "
                    f"rejected by eye on 2026-09-05. Compose the far side as its own place.")
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

    # THE REFLECTION CONTROLS, 2026-09-05. Their fixture is asymmetric IN EVERY
    # ROW. The translation fixture above is asymmetric as a whole but its top
    # three rows are each symmetric, and a window holding those rows and the
    # background over them matched its own mirror - so the first cut of these
    # controls failed five times on the fixture, not the tool. A mirror test
    # needs a shape no part of which is its own mirror.
    ROWS = [".##...", "#.@@#.", "#@%%@.", "#@%@##", ".#%@##", "..#@.."]
    assert all(r != r[::-1] for r in ROWS)

    def ablob(im, x, y, mirrored=False):
        d = ImageDraw.Draw(im)
        for i, row in enumerate(ROWS):
            for j, ch in enumerate(row[::-1] if mirrored else row):
                if ch != ".":
                    d.point((x + j, y + i),
                            fill={"#": (200, 80, 40), "@": (120, 200, 90), "%": (250, 230, 60)}[ch])

    # A stamp and its mirror image: invisible to the translation hash, caught here.
    im = blank(80, 40); ablob(im, 4, 6); ablob(im, 50, 20, mirrored=True)
    ok.append(("a stamp and its mirror image is caught as a reflection",
               len(reflections(im, k=6, step=1)) >= 1))
    ok.append(("...and the translation hash cannot see it, which is why reflections() exists",
               duplications(im, k=6, step=1) == []))
    # The reported axis stands between the two copies.
    (axis_sum, dy), group = reflections(im, k=6, step=1)[0]
    ok.append(("the reflection reports the mirror axis between the copies",
               25 <= axis_sum / 2 <= 35 and dy == 14))

    # The same stamp twice by TRANSLATION is not a reflection (that is the
    # other finder's hit), so the two finders measure different faults.
    im = blank(80, 40); ablob(im, 4, 6); ablob(im, 50, 20)
    ok.append(("a translated copy is not reported as a reflection", reflections(im, k=6, step=1) == []))

    # One left-right symmetric object is one object, not a reflection of itself.
    im = blank(80, 40)
    d = ImageDraw.Draw(im)
    for i, row in enumerate(["..####..", ".#@@@@#.", "#@%%%%@#", "#@%@@%@#", ".#@%%@#.", "..#@@#.."]):
        for j, ch in enumerate(row):
            if ch != ".":
                d.point((30 + j, 10 + i), fill={"#": (200, 80, 40), "@": (120, 200, 90), "%": (250, 230, 60)}[ch])
    ok.append(("a single symmetric object is not a reflection of itself", reflections(im, k=6, step=1) == []))

    # A flat field and a lone object report nothing - the lone object being the
    # translation fixture with its symmetric top rows, which is exactly what
    # the two-window allowance is for.
    ok.append(("a flat field has no reflections", reflections(blank(80, 40), k=6, step=1) == []))
    im = blank(80, 40); blob(im, 20, 10)
    ok.append(("one object alone has no reflections, symmetric rows and all", reflections(im, k=6, step=1) == []))

    # THE OWNER'S CASE: a whole panel mirrored across the frame, as the fifth
    # composition was by eye. Two DIFFERENT objects on the left (the same shape
    # twice would mirror each other across the frame too, and truthfully), both
    # mirrored on the right about the frame's centre: exactly one reflection
    # cluster per object, both on the same axis.
    # ...and not a straight diagonal band either: the first second-shape was
    # one, and a diagonal band shifted a row and mirrored lands on itself, so
    # the tool truthfully reported two more tiny reflections inside it.
    ROWS2 = ["#.....", "#@#...", "#%@.#.", ".#%@#.", "..#.@#", ".#.#.."]
    assert all(r != r[::-1] for r in ROWS2)

    def bblob(im, x, y, mirrored=False):
        d = ImageDraw.Draw(im)
        for i, row in enumerate(ROWS2):
            for j, ch in enumerate(row[::-1] if mirrored else row):
                if ch != ".":
                    d.point((x + j, y + i),
                            fill={"#": (200, 80, 40), "@": (120, 200, 90), "%": (250, 230, 60)}[ch])
    im = blank(120, 60); ablob(im, 6, 8); bblob(im, 20, 40)
    ablob(im, 120 - 6 - 6, 8, mirrored=True); bblob(im, 120 - 20 - 6, 40, mirrored=True)
    found = reflections(im, k=6, step=1)
    ok.append(("a mirrored panel is caught: one cluster per object, both on the frame's axis",
               len(found) == 2 and {round(f[0][0] / 2) for f in found} == {60}))
    ok.append(("a tiny image is not a crash for reflections either", reflections(blank(4, 4), k=6, step=1) == []))
    ok.append(("a reflection's ledger key cannot collide with a translation's",
               key("p", ("mirror", 60, 0), (1, 1)) != key("p", (60, 0), (1, 1))))

    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"art-frame-repeats controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    sys.exit(1 if check(listing="--list" in sys.argv) else 0)
