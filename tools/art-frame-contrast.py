"""The frame gate: nothing in the RENDERED garden out-contrasts the word, anywhere.

WHY IT EXISTS. tests/tokens.test.js measures each garden colour against
gardenShade, on the assumption that gardenShade IS the garden's ground. Once
the ground is a world - four masses of mosaic lit from the page - that
assumption is gone, and nothing in the repository looks at the picture that
actually ships. It showed: the composed garden of 2026-09-03 had 2160 adjacent
pixel pairs above the teaching word's 11.36:1, all at the seam where gardenShade
met the reading field at 16.27:1, and no gate noticed for two days. The garden's
own boundary would have been 43 per cent louder than the word it sits behind.

Owner-ruled 2026-09-04 ("yes, both"), two rules measured on the RENDER:

  1. NO ADJACENT PAIR OVER THE WORD. With the reading field painted in, no two
     4-adjacent pixels anywhere in the frame - the seam included - may exceed
     11.36:1, the word's own contrast on its field. Art bible 8.3, finally
     checked where it applies.

  2. THE SEAM IS GROUND. No sprite pixel lies within MARGIN pixels of the
     reading field, so the pixel that touches the page is always a mass ink or
     sky, never a lead, never a petal. This one needs to know which pixels are
     sprites, which the render alone cannot say: compose() may expose
     sprite_mask(profile) returning a boolean array, and if it does not, rule 2
     is reported as UNCHECKED rather than silently passed. A gate that passes
     what it cannot see is worse than none.

THE WORD'S RATIO IS COMPUTED, NOT TYPED. It is contrast(ink, surfaceReading)
from the same WCAG arithmetic tests/tokens.test.js uses, taken from the tokens
in src/engine.js at run time, so that if the word's ink ever moves the ceiling
moves with it. The value today is 11.358.

NOT WIRED INTO check YET, deliberately: today's compose() fails rule 1 by 2160
pairs and the scene that replaces it is being composed now. It goes in with
that scene, like tools/art-frame-repeats.py. --self-test runs the controls.
"""

import json
import re
import subprocess
import sys

import numpy as np

sys.path.insert(0, "D:/CVCGame/tools/art")

FIELD = (255, 249, 232)     # surfaceReading, the page
MARGIN = 3                  # rule 2: no sprite pixel this close to the field


def _lin(a):
    c = a.astype(np.float64) / 255
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)


def luminance(a):
    l = _lin(a)
    return .2126 * l[..., 0] + .7152 * l[..., 1] + .0722 * l[..., 2]


def ceiling():
    """The teaching word's own contrast, read from the engine so it cannot drift."""
    out = subprocess.run(
        ["node", "--input-type=module", "-e",
         "import {C} from './src/engine.js'; console.log(JSON.stringify([C.ink, C.surfaceReading]))"],
        capture_output=True, text=True, cwd="D:/CVCGame")
    ink, field = json.loads(out.stdout.strip())
    def lum(h):
        v = np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.uint8)
        return float(luminance(v[None, None])[0, 0])
    a, b = lum(ink) + .05, lum(field) + .05
    return max(a, b) / min(a, b)


def field_box(W, H, side, band):
    return (side, 0, W - side, H) if side else (0, band, W, H - band)


def pairs_over(im, W, H, side, band, limit):
    """Rule 1: adjacent pairs over the limit, with the field painted in."""
    a = np.asarray(im.convert("RGB"), dtype=np.uint8).copy()
    x0, y0, x1, y1 = field_box(W, H, side, band)
    a[y0:y1, x0:x1] = FIELD
    y = luminance(a) + .05
    right = np.maximum(y[:, :-1], y[:, 1:]) / np.minimum(y[:, :-1], y[:, 1:])
    down = np.maximum(y[:-1, :], y[1:, :]) / np.minimum(y[:-1, :], y[1:, :])
    return int((right > limit).sum() + (down > limit).sum()), float(max(right.max(), down.max()))


def sprites_near_field(mask, W, H, side, band, margin=MARGIN):
    """Rule 2: sprite pixels within `margin` of the field. mask is a bool array."""
    x0, y0, x1, y1 = field_box(W, H, side, band)
    near = np.zeros_like(mask)
    near[max(0, y0 - margin):min(H, y1 + margin), max(0, x0 - margin):min(W, x1 + margin)] = True
    near[y0:y1, x0:x1] = False
    return int((mask & near).sum())


def check(listing=False):
    import garden

    limit = ceiling()
    problems = []
    for profile in sorted(garden.PROFILES):
        W, H, corner, band, side = garden.PROFILES[profile]
        im = garden.compose(profile)
        over, worst = pairs_over(im, W, H, side, band, limit)
        if listing:
            print(f"  {profile:12} pairs over {limit:.2f}: {over}   worst {worst:.2f}:1")
        if over:
            problems.append(f"{profile}: {over} adjacent pixel pairs exceed the word's {limit:.2f}:1 "
                            f"(worst {worst:.2f}) - the garden out-contrasts the word it sits behind (bible 8.3)")
        if hasattr(garden, "sprite_mask"):
            n = sprites_near_field(garden.sprite_mask(profile), W, H, side, band)
            if n:
                problems.append(f"{profile}: {n} sprite pixels lie within {MARGIN} px of the reading field - "
                                f"what touches the page must be ground or sky")
        elif listing:
            print(f"  {profile:12} rule 2 UNCHECKED: garden.sprite_mask(profile) does not exist yet")
    print(f"Art frame contrast: {len(garden.PROFILES)} profiles, ceiling {limit:.3f}:1, {len(problems)} problems")
    for p in problems:
        print("PROBLEM: " + p)
    return len(problems)


def self_test():
    from PIL import Image

    ok = []
    W, H, side, band = 60, 40, 10, 0
    limit = 11.358

    # a lit mid-green panel beside the page: under the ceiling, no problem
    a = np.full((H, W, 3), (94, 128, 87), dtype=np.uint8)
    n, worst = pairs_over(Image.fromarray(a), W, H, side, band, limit)
    ok.append(("a lit panel beside the page is under the ceiling", n == 0 and worst < limit))

    # gardenShade beside the page: the 2026-09-03 seam, refused
    b = np.full((H, W, 3), (13, 30, 35), dtype=np.uint8)
    n, worst = pairs_over(Image.fromarray(b), W, H, side, band, limit)
    ok.append(("gardenShade against the page is refused", n > 0 and worst > 16))
    ok.append(("and the count is exactly the seam: two edges by the height", n == 2 * H))

    # a violation INSIDE a panel, away from the seam, is still caught
    c = np.full((H, W, 3), (94, 128, 87), dtype=np.uint8)
    c[20, 3] = (13, 30, 35)
    c[20, 4] = (255, 249, 232)
    n, worst = pairs_over(Image.fromarray(c), W, H, side, band, limit)
    ok.append(("a violation inside the panel is caught too", n >= 1))

    # rule 2: a sprite pixel two from the field is refused, four is not
    m = np.zeros((H, W), bool)
    m[5, side - 2] = True
    ok.append(("a sprite pixel two from the field is refused", sprites_near_field(m, W, H, side, band) == 1))
    m2 = np.zeros((H, W), bool)
    m2[5, side - 5] = True
    ok.append(("a sprite pixel five from the field is not", sprites_near_field(m2, W, H, side, band) == 0))

    # the ceiling is read from the engine, and it is the word's real number
    ok.append(("the ceiling is the word's own contrast, from the engine", abs(ceiling() - 11.358) < 0.01))

    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"art-frame-contrast controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    sys.exit(1 if check(listing="--list" in sys.argv) else 0)
