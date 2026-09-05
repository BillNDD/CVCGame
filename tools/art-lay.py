"""The lay gate: a two-ink texture is a DITHER if it has no direction.

WHY IT EXISTS. Art bible 4.1 forbids dithering, and until 2026-09-04 the rule was
read as a blanket ban on two-ink texture - which would have forbidden an
engraver's lay, an embroiderer's stitch and a mosaicist's course, the three
techniques the owner's house style is built from. A researcher reading the
public-domain engraving manuals measured what the rule actually objects to:

  A 50% chequerboard and a 50% line lay of the SAME two inks are identical in
  mean luminance, identical in their four-band histogram and identical in
  maximum local contrast. Every photometric number agrees. The eye does not:
  the chequer is flat mud, the fake third colour the rule bans; the lines read
  as woven cloth. The only measure that separates them is ANISOTROPY - the mean
  run length of the mark along one axis divided by the other. Chequer 1.00;
  lines 48.

  Thirteen swatches judged by eye fell either side of a clean gap: rejected
  1.00 to 1.48, accepted 2.27 to 48.5, nothing between. The threshold is 2.0.

Owner-ruled 2026-09-04: "yes, the rule means isotropy." Linton (1879) said it in
older words - mechanical regularity deadens a tint, lines must be LAID - and the
Hand-book of Wood Engraving (1881) reports Bewick refusing cross-hatching for
plain parallel lines.

WHAT IT MEASURES. For every ink in a render that covers at least FLOOR pixels,
the mean run length of that ink along x and along y. An ink whose runs are
short in BOTH axes is speckle with no direction - a dither - and is refused. An
ink with a long run in either axis is a lay, or a solid field, and passes. A
solid field passes because its runs are long in both directions; a chequer
fails because its runs are one in both. The two cases that share every other
number are separated by exactly this.

WHAT IT MUST NOT MEASURE, learned on 2026-09-05 from its first real frame. Run
over the whole tablet it flagged six inks - and four were gardenShade,
gardenTip, gardenPeel and the mid-green, which are SPRITE inks. A leaf carries
one pixel of gardenTip at its tip by design, eighty-seven sprites carry a few
hundred such pixels between them, and a run-length measure over the whole
frame reads that as speckle. Rendered without sprites, every flag vanished.
So the gate measures the GROUND, which is the texture the rule governs, and
leaves sprite pixels out through the same sprite_mask(profile) hook that
tools/art-frame-contrast.py asks compose() for. Without a mask it measures
everything and says so, because a gate that passes what it cannot see is
worse than none - but it will over-report on a frame full of sprites, and
that is now a known limit rather than a verdict.

WHAT IT DOES NOT CATCH, said plainly. A dither of three or more inks, or one
laid on an irregular period, can have runs above 1.5 and slip through. The
sprite gate (tools/art-repeats.py) and the frame gate (tools/art-frame-repeats.py)
catch a different fault. This one is precise about the fault it names and
silent about others, which is what a gate should be.

NOT WIRED INTO check YET, deliberately: the scene it should judge is being
recomposed, and today's compose() draws no two-ink texture at all. It goes in
with the new scene. Run it with --self-test for the controls.
"""

import sys

import numpy as np

ROOT_INSERT = "D:/CVCGame/tools/art"
sys.path.insert(0, ROOT_INSERT)

THRESHOLD = 2.0     # the run-length ratio at which a mark has a direction
SHORT = 1.5         # a run shorter than this in BOTH axes is speckle
FLOOR = 200         # inks covering fewer pixels than this are not textures


def runs(mask, axis):
    """Mean run length of True along one axis of a boolean array."""
    m = mask if axis == 0 else mask.T
    total = count = 0
    for row in m:
        run = 0
        for v in row:
            if v:
                run += 1
            elif run:
                total += run
                count += 1
                run = 0
        if run:
            total += run
            count += 1
    return total / count if count else 0.0


def lays(im, floor=FLOOR, exclude=None):
    """Every ink in the image with its coverage, x-run, y-run and ratio.

    `exclude` is a boolean array of pixels that are NOT texture - the sprites
    - and they are left out of both the coverage and the runs."""
    a = np.asarray(im.convert("RGB"), dtype=np.uint8)
    keep = np.ones(a.shape[:2], bool) if exclude is None else ~np.asarray(exclude, bool)
    flat = a[keep].reshape(-1, 3)
    colours, counts = np.unique(flat, axis=0, return_counts=True)
    out = []
    for c, n in zip(colours, counts):
        if n < floor:
            continue
        mask = np.all(a == c, axis=2) & keep
        rx, ry = runs(mask, 0), runs(mask, 1)
        ratio = max(rx, ry) / max(1e-9, min(rx, ry))
        out.append({"ink": "#%02x%02x%02x" % tuple(int(v) for v in c), "pixels": int(n),
                    "run_x": rx, "run_y": ry, "ratio": ratio,
                    "dither": (max(rx, ry) < SHORT and ratio < THRESHOLD)})
    return out


def check(listing=False):
    import garden

    problems, total = [], 0
    for profile in sorted(garden.PROFILES):
        mask = garden.sprite_mask(profile) if hasattr(garden, "sprite_mask") else None
        if mask is None and listing:
            print(f"  {profile:12} no sprite_mask - measuring the whole frame, sprites included")
        for lay in lays(garden.compose(profile), exclude=mask):
            total += 1
            if listing:
                print(f"  {profile:12} {lay['ink']} {lay['pixels']:>7} px  "
                      f"runs {lay['run_x']:.2f} / {lay['run_y']:.2f}  ratio {lay['ratio']:.2f}"
                      f"{'   DITHER' if lay['dither'] else ''}")
            if lay["dither"]:
                problems.append(
                    f"{profile}: {lay['ink']} over {lay['pixels']} pixels has runs of "
                    f"{lay['run_x']:.2f} by {lay['run_y']:.2f} - speckle with no direction, "
                    f"which is the dither art bible 4.1 refuses. A mark that RUNS is a lay and is legal.")
    print(f"Art lay: {len(garden.PROFILES)} profiles, {total} inks measured, {len(problems)} problems")
    for p in problems:
        print("PROBLEM: " + p)
    return len(problems)


def self_test():
    """The controls - and the first two are the pair that share every other number."""
    from PIL import Image

    A, B = (13, 30, 35), (45, 60, 45)
    n = 48

    def build(kind):
        a = np.zeros((n, n, 3), dtype=np.uint8)
        for y in range(n):
            for x in range(n):
                if kind == "chequer":
                    on = (x + y) % 2 == 0
                elif kind == "lines":
                    on = y % 2 == 0
                elif kind == "dots":
                    on = x % 3 == 0 and y % 3 == 0
                elif kind == "solid":
                    on = y < n // 2
                elif kind == "diagonal":
                    on = (x + y) % 4 == 0
                a[y, x] = B if on else A
        return Image.fromarray(a)

    def verdict(kind):
        return {l["ink"]: l["dither"] for l in lays(build(kind), floor=50)}

    ok = []
    ok.append(("a chequer of two inks is a dither", verdict("chequer")["#2d3c2d"] is True))
    ok.append(("a line lay of the same two inks is not", verdict("lines")["#2d3c2d"] is False))
    ok.append(("a regular dot screen is a dither", verdict("dots")["#2d3c2d"] is True))
    ok.append(("a solid field is not", verdict("solid")["#2d3c2d"] is False))
    # a one-pixel diagonal lay: runs are 1 in both axes, so it is a dither -
    # which is what the painted-egg designers found by hand, and why the
    # lattice, zigzag and wave motifs were struck out at seven pixels wide
    ok.append(("a one-pixel diagonal is a dither at this scale", verdict("diagonal")["#2d3c2d"] is True))
    # the pair that decides it measure identically on every other axis
    ca, la = build("chequer"), build("lines")
    ma = np.asarray(ca).astype(float).mean()
    mb = np.asarray(la).astype(float).mean()
    ok.append(("the chequer and the line lay have identical mean value", abs(ma - mb) < 1e-9))
    # THE CONTROL FOR THE FIRST REAL FRAME: scattered sprite pixels on a solid
    # ground are a dither to the unmasked gate and nothing to the masked one.
    # Forty single pixels of one ink, no two adjacent, on a flat field.
    a = np.zeros((n, n, 3), dtype=np.uint8); a[:] = A
    spr = np.zeros((n, n), bool)
    for i in range(40):
        y, x = (i * 7) % n, (i * 11 + 3) % n
        a[y, x] = B; spr[y, x] = True
    tips = Image.fromarray(a)
    unmasked = {l["ink"]: l["dither"] for l in lays(tips, floor=30)}
    masked = {l["ink"]: l["dither"] for l in lays(tips, floor=30, exclude=spr)}
    ok.append(("scattered sprite pixels ARE speckle to the unmasked gate", unmasked.get("#2d3c2d") is True))
    ok.append(("...and are left out entirely once the sprite mask excludes them", "#2d3c2d" not in masked))

    # an ink under the floor is not measured at all
    ok.append(("an ink under the coverage floor is ignored", "#2d3c2d" not in {l["ink"] for l in lays(build("dots"), floor=10000)}))

    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"art-lay controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    sys.exit(1 if check(listing="--list" in sys.argv) else 0)
