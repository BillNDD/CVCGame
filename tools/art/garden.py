# THE GARDEN'S MOTIFS AND HOW THEY ARE DRAWN - art step 6, opened 2026-09-03.
#
# Every pixel of the garden comes from this file. Nothing here is random and
# nothing is sampled from anywhere: each motif is a hand-authored map or an
# authored row table, so a rendering on any machine on any day is byte for byte
# the rendering pinned in tools/art/provenance.json. That is the whole point of
# keeping it here rather than in a scratch directory - the art is reproducible
# from tracked source, and the check that proves it is tools/art-render.mjs.
#
# WHERE THE SHAPES CAME FROM. The owner supplied a reference painting on
# 2026-09-03 (his own or licensed - he ruled it so on the decision page, which
# is why colours measured from it are legitimate under bible 18.1). Six pixel
# artists then read the bible and that picture and prescribed each motif; their
# prescriptions and the owner's own notes are what these maps encode. His notes
# in order: the first attempt was "black blobs", the second's ears were "horns",
# the arbutus had "chicken pox", the rabbit was a "circle with rabbit ears".
# Each is answered in the comment of the motif it belongs to.
#
# THE RULES EVERY MOTIF OBEYS, all owner-ruled on 2026-09-03:
#   the key light is UPPER RIGHT, and it is irreversible across all eleven states
#   no outlines: a 1-2 px lit rim does the contour's work
#   three values for a leaf, four for a flower, and no fifth
#   no dithering, hard edges, no anti-aliasing ramp
#   nothing detached: every motif is one 8-connected island, checked below
import argparse
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------- the palette
# The five the owner ruled, plus the sixth he approved for the ox-eye's lit ray
# and the three the arbutus needs. Every one is measured from his own reference.
SHADE = (13, 30, 35)          # gardenShade  #0d1e23
STEM = (69, 83, 43)           # gardenStem   #45532b
TIP = (179, 179, 72)          # gardenTip    #b3b348
BARK = (155, 95, 39)          # gardenBark   #9b5f27
HEART = (204, 133, 60)        # gardenHeart  #cc853c
RAY = (204, 212, 196)         # gardenRay    #ccd4c4 - capped under the word's own contrast
COOL = (161, 182, 198)        # the cool petal, already in the palette as `disabled`
PEEL = (168, 53, 18)          # gardenPeel   - the arbutus's hallmark, freshly bared
RIM = (235, 179, 18)          # gardenRim    - its sunlit edge
BERRY = (193, 47, 33)         # gardenBerry  - the fruit
STONE = (185, 177, 160)       # stone, already in the palette


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def ramp(a, b, steps, i):
    """A material's ramp: three to five steps whose ends are named tokens
    (bible stage 5). Everything that varies across a form quantises through
    here, so no shipped pixel is an unnamed in-between colour."""
    return mix(a, b, i / max(1, steps - 1))


# ------------------------------------------------------------------ the inks
WEATHERED = mix(STEM, STONE, .18)     # bark that has not shed in years (the obvious
                                      # name for this colour is also a person's name, which S9 refuses)
COPPER = mix(PEEL, HEART, .45)        # a season on from the peel
OLD = mix(COPPER, WEATHERED, .55)         # older still
INNER = mix(mix(HEART, STONE, .45), mix(BARK, STONE, .55), .25)
BODY = mix(BARK, STONE, .55)
LIT = mix(BODY, RAY, .45)
BELLY = mix(BODY, SHADE, .30)
DARK = mix(BARK, SHADE, .62)
FAR = mix(BODY, SHADE, .38)
FARD = mix(DARK, SHADE, .30)

PAL = {
    # ALL LOWERCASE, deliberately. S9's stranger scan reads a capitalised token
    # anywhere in the repository as a possible personal name, and a sprite row
    # is a string of legend letters, and one beginning with a capital was refused -
    # correctly - by the guard that keeps a child's name out of this tree. No
    # legend character is a capital now, so a map cannot look like a name.
    "d": SHADE, "s": STEM, "t": TIP, "b": BARK, "h": HEART, "w": RAY, "c": COOL,
    "g": mix(STEM, TIP, .50), "v": mix(STEM, SHADE, .35), "p": PEEL, "m": RIM,
    "y": BERRY, "n": STONE,
    "1": (30, 37, 74), "2": (89, 94, 147), "3": COOL,
    "r": BODY, "a": LIT, "u": BELLY, "k": DARK, "i": INNER, "f": FAR, "j": FARD,
    "o": mix(BODY, SHADE, .15), "e": SHADE,
    ".": None,
}


def stamp(d, rows, x, y, pal=PAL):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = pal.get(ch)
            if c:
                d.point((x + i, y + j), fill=c)


def island(rows, diagonal=True):
    """How many pixels are not attached to the whole.

    THE OWNER FOUND THE FLAW IN THIS CHECK BY LOOKING, twice - "Green orbs
    unconnected to anything on right" and "Two blades break up then connect
    again" - on two sprites that passed it. It counted a CORNER touch as
    attachment, which is topologically true and visually false: a single
    diagonal pixel is invisible at 1:1, so a leaf hanging off one reads as a
    leaf floating in the air. One of the sprites he caught was eleven separate
    pieces to the eye and one piece to this function.

    So it takes a `diagonal` flag. With it, the old 8-connected question: is
    anything wholly adrift. Without it, the strict one the eye actually asks.
    Both matter, because 4-connection is too harsh as a blanket rule - a bare
    winter twig steps diagonally and reads perfectly well as a line - which is
    why the useful measure is masses(), below.
    """
    on = {(i, j) for j, r in enumerate(rows) for i, c in enumerate(r) if c != "."}
    if not on:
        return 0
    start = min(on, key=lambda p: (-p[1], p[0]))
    seen, stack = set(), [start]
    while stack:
        p = stack.pop()
        if p in seen:
            continue
        seen.add(p)
        x, y = p
        nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        if diagonal:
            nb += [(x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)]
        for q in nb:
            if q in on and q not in seen:
                stack.append(q)
    return len(on) - len(seen)


def masses(rows, floor=6):
    """The check his eye was actually running: a MASS of `floor` pixels or more
    that reaches the rest of the sprite only through a corner. A twig may step
    diagonally and still read as a twig; a leaf may not, and a leaf is what he
    saw floating. Returns the sizes of the offending masses, largest first."""
    on = {(i, j) for j, r in enumerate(rows) for i, c in enumerate(r) if c != "."}
    seen, groups = set(), []
    for p in sorted(on):
        if p in seen:
            continue
        grp, stack = 0, [p]
        while stack:
            q = stack.pop()
            if q in seen:
                continue
            seen.add(q)
            grp += 1
            x, y = q
            for r in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if r in on and r not in seen:
                    stack.append(r)
        groups.append(grp)
    groups.sort(reverse=True)
    return [n for n in groups[1:] if n >= floor]


# ------------------------------------------------------------------ the maps
# THE OX-EYE, 9 x 6. Two colours per bloom - a cool ray and a warm heart - is
# the reference's entire sparkle mechanism, and the cheapest mark in the set.
OXEYE = ["...w.ww..", ".ww.wh.w.", "cc.hhh.ww", ".ccbb.ww.", "..cc.cc..", "...c.c..."]

# THE LEAF CLUSTER, 16 x 13: a fistful with holes for the sky, never a scatter.
CLUSTER = ["................", "......tt........", "..tt..sst..ttt..", "..sss.sss.tsttt.",
           "...ssssss.sssd..", "....sssssd......", "......ssss.ttt..", ".......ssssssst.",
           ".......sssdsss..", "...sssthsstsd...", "..sssssbssstt...", "..dss..b..ss....",
           ".......b........"]

# THE CROCUS, 9 x 18: a goblet closing to a tube, the stigma inside it.
CROCUS = ["...233...", ".1222333.", "112hh2233", "1122h2233", ".1122223.", ".1122223.",
          "..11223..", "..11223..", "...123...", "...123...", "....sg...", "..d.sg.g.",
          "..d.sgsg.", "...dsgsg.", "...dsgsg.", "...dsssg.", "...dssss.", "...dssss."]

# THE RABBIT, upright. Built to the pixel artist's prescription after the owner
# called the ears horns: widths 2-3-4-4-4-4-3-2, the darkest pixel in the pocket
# where the ear meets the skull and never at the tip, no dark seam in the bottom
# row, the far ear set back and darker with no inner surface, and the inner ear
# a field rather than a line. No neck, a blunt nose, a high haunch, and the
# cotton tail breaking the back line - which is what a rabbit has and a gerbil
# does not.
RABBIT = ["......rr......", "...ff.krr.....", "..jff.kirr....", "..jff.kiir....",
          "..jff.kiir....", "..jff.kirr....", "...jf..krr....", "...krraarrk...",
          "..kraaaaaark..", "..kraaaaaaerk.", "..kraaaaaaaar.", "...kraaaaarrk.",
          "...krraaaark..", "..krraaaaaark.", ".kruaaaaaaaark", "wkruu aaaaaaaar".replace(" ", ""),
          "wwkruuaaaaaaar", ".kruuuaaaaaark", "..kruuuaaaark.", "..kruuooooork.",
          "...kroooork...", "....kk..kk...."]

RABBIT_LOW = ["..........rr....", ".......ff.krr...", "....jjff.kirr...", "...kkrrr.kiir...",
              ".wkrruuuuukrr...", "wwkruaaaaaaaarer", ".wkruu aaaaaaaar".replace(" ", ""),
              "..kruuuaaaaaaaar", "...kkruookaaaark", ".....kook.koork.", "..............k."]


# ---------------------------------------------------- the drawn (not stamped)
# THE CONIFER. Owner: the first one "looks too much like a child's drawing of a
# basic tree shape". Thirty-eight authored rows with whorl spikes and pinches,
# four values, shade inside the mass, gold needle-tips on the sun side, and five
# thin places where a bare limb carries on past the foliage - his own note:
# "add some random bare sections where branches poke through. Like a real tree".
CONIFER_ROWS = [
    (0,0,0),(0,1,0),(1,1,1),(0,1,0),(1,2,0),(2,2,1),(1,2,0),(2,3,0),
    (3,3,1),(2,2,0),(2,3,0),(3,4,0),(4,4,1),(3,3,0),(3,4,0),(4,5,0),
    (5,4,1),(3,4,0),(4,5,0),(5,5,0),(6,5,1),(4,5,0),(5,6,0),(5,5,0),
    (6,7,1),(5,6,0),(6,6,0),(7,6,0),(7,8,1),(5,7,0),(6,7,0),(7,8,0),
    (8,7,1),(6,7,0),(7,8,0),(8,8,0),(9,8,1),(6,7,0),
]
CONIFER_BARE = ((10, 1, 2, 3), (17, -1, 2, 3), (23, 1, 3, 4), (29, -1, 2, 4), (33, 1, 3, 3))
DEEP = mix(SHADE, STEM, .35)
MASS = mix(SHADE, STEM, .78)
NEEDLE = mix(STEM, TIP, .38)
GOLD = mix(STEM, TIP, .80)


def conifer(d, x, y, ground, cx=9):
    for j, (L, R, whorl) in enumerate(CONIFER_ROWS):
        x0, x1 = x + cx - L, x + cx + R
        for i in range(x0, x1 + 1):
            d.point((i, y + j), fill=MASS)
        d.point((x0, y + j), fill=DEEP if whorl else mix(SHADE, STEM, .55))
        if R >= 1:
            d.point((x1, y + j), fill=NEEDLE)
        if whorl:
            for i in range(x0, min(x1, x + cx)):
                d.point((i, y + j + 1), fill=DEEP)
            if R >= 3:
                d.point((x1 - 1, y + j), fill=GOLD)
                d.point((x1, y + j - 1), fill=GOLD)
        if j % 5 in (1, 2) and L >= 3:
            for i in range(x0 + 1, x0 + 1 + max(1, L // 2)):
                d.point((i, y + j), fill=DEEP)
        if j % 4 == 3 and R >= 3:
            d.point((x1 - 2, y + j), fill=mix(STEM, TIP, .18))
    for (ry, side, pull, reach) in CONIFER_BARE:
        L, R = CONIFER_ROWS[ry][0], CONIFER_ROWS[ry][1]
        edge = R if side > 0 else L
        for k in range(pull):
            d.point((x + cx + side * (edge - k), y + ry), fill=ground)
            if k == 0:
                d.point((x + cx + side * (edge - k), y + ry - 1), fill=ground)
        for k in range(reach):
            d.point((x + cx + side * (edge - pull + 1 + k), y + ry), fill=mix(BARK, SHADE, .40 + .10 * k))
        d.point((x + cx + side * (edge - pull + reach), y + ry - 1), fill=mix(STEM, TIP, .55))
    for j in range(len(CONIFER_ROWS), len(CONIFER_ROWS) + 3):
        d.point((x + cx, y + j), fill=mix(BARK, SHADE, .5))
        d.point((x + cx + 1, y + j), fill=mix(BARK, SHADE, .15))


# THE FROND. The owner: "some of it looks disconnected. Maybe the lightest of
# yellowing green to make sure the stem connects to the base of the leaves".
# So the rachis is one unbroken chain in the lightest green, every pinna starts
# ON it, and island() proves nothing is adrift.
def frond_chain(x0, y0, h=28, run=13):
    import math
    pts = []
    for k in range(0, 106, 2):
        th = math.radians(k)
        px = x0 + run * (1 - math.cos(th))
        py = y0 - (h * math.sin(th) if k <= 90 else h * (1 - (th - math.pi / 2) * .30))
        pts.append((round(px), round(py)))
    chain = []
    for p in pts:
        if not chain:
            chain.append(p); continue
        ax, ay = chain[-1]
        while (ax, ay) != p:
            if ax != p[0]:
                ax += 1 if p[0] > ax else -1
            if ay != p[1]:
                ay += 1 if p[1] > ay else -1
            chain.append((ax, ay))
    bx, by = chain[0]
    chain[0:0] = [(bx, by + k) for k in range(6, 0, -1)]
    return chain


def frond(d, x0, y0, h=28, run=13):
    import math
    SPINE, LEAF = mix(STEM, TIP, .62), STEM
    LEAF_LIT, LEAF_DARK = mix(STEM, TIP, .42), mix(STEM, SHADE, .35)
    chain = frond_chain(x0, y0, h, run)
    for (px, py) in chain:
        d.point((px, py + 1), fill=LEAF_DARK)
    for (px, py) in chain:
        d.point((px, py), fill=SPINE)
    n = len(chain)
    for i, (px, py) in enumerate(chain):
        t = i / max(1, n - 1)
        if i % 2 or t < .16 or t > .97:
            continue
        a, b = chain[min(n - 1, i + 2)], chain[max(0, i - 2)]
        vx, vy = a[0] - b[0], a[1] - b[1]
        m = max(1e-6, (vx * vx + vy * vy) ** .5)
        vx, vy = vx / m, vy / m
        for ang, ln, lit in ((math.radians(52), max(2, round(7 * (1 - t) ** .5)), True),
                             (math.radians(-52), max(2, round(5 * (1 - t) ** .5)), False)):
            ca, sa = math.cos(ang), math.sin(ang)
            dx, dy = vx * ca - vy * sa, vx * sa + vy * ca
            last = None
            for k in range(ln):
                q = (round(px + dx * k), round(py + dy * k))
                if last and abs(q[0] - last[0]) == 1 and abs(q[1] - last[1]) == 1:
                    d.point((last[0], q[1]), fill=LEAF if lit else LEAF_DARK)
                d.point(q, fill=(LEAF_LIT if k >= ln - 2 else LEAF) if lit else LEAF_DARK)
                last = q


# THE ARBUTUS, the frame's one hero. The owner locked its treatment on
# 2026-09-03: age-graded from red-orange in the young crown to a weathered grey-green at
# the old base, with two sheets of bark lifting on the mid trunk, berries in
# the canopy, and flecks of copper through the weathered foot.
#
# ITS RAMP IS FIVE STEPS, NOT A GRADIENT. His approved version bled smoothly
# and measured 93 colours, which bible stage 5 refuses - "every material is a
# ramp of three to five steps whose end colours are named tokens". Reducing
# to five keeps the bleed he asked for, because the ramp runs over 44 rows and
# each step is nine rows deep, while giving stage 8 a pixel that equals a
# declared colour.
AGE_RAMP = [WEATHERED, OLD, COPPER, mix(COPPER, PEEL, .55), PEEL]
LIMB_TRUNK = [(43,4,6),(42,4,6),(41,5,6),(40,5,6),(39,5,6),(38,5,6),(37,5,6),(36,5,6),(35,5,6),
              (34,5,6),(33,6,6),(32,6,5),(31,6,5),(30,7,5),(29,7,5),(28,8,5),(27,8,5),(26,9,5),
              (25,10,4),(24,11,4),(23,11,4),(22,12,4),(21,12,4),(20,12,4),(19,12,4)]
LIMB_A = [(18,12,4),(17,11,4),(16,11,3),(15,10,3),(14,10,3),(13,9,3),(12,9,3),(11,9,3),(10,10,3),(9,10,3),(8,11,3)]
LIMB_A1 = [(7,10,2),(6,9,2),(5,9,2),(4,8,2),(3,8,1),(2,7,1),(1,7,1),(0,6,1)]
LIMB_A2 = [(7,12,2),(6,13,2),(5,13,2),(4,14,1),(3,14,1),(2,15,1)]
LIMB_B = [(18,15,3),(17,16,3),(16,17,3),(15,18,2),(14,19,2),(13,19,2),(12,20,2),(11,21,2),(10,21,1),(9,22,1)]
SHEETS = [(24, 35, 1, 4, 3), (13, 20, 2, 3, 2)]
BERRIES = ((-3,1),(2,-2),(-1,4),(10,2),(14,-1),(12,5),(5,10),(8,13),(3,12),(18,8),(21,12),(17,14),(-1,9),(1,15))
CANOPY = ((4,2),(16,6),(9,14),(21,11),(2,12))


def _age(ry):
    """One step of the five-rung ramp, chosen by height. The steps are wide -
    nine rows each - so the change still reads as a bleed and not as a band."""
    t = 1 - (ry / 44)
    return AGE_RAMP[min(4, max(0, int(t * 5)))]


def _sheet(k, ry):
    """How much of this pixel is freshly bared bark, quantised to the same
    five rungs. The owner circled two hard edges on an earlier draft, so a
    sheet ramps in and out over its feather rows rather than having a border."""
    best = 0.0
    for (top, bottom, l, sw, feather) in SHEETS:
        if not (top - feather <= ry <= bottom + feather):
            continue
        w = 1.0 if top <= ry <= bottom else (
            (ry - (top - feather)) / feather if ry < top else ((bottom + feather) - ry) / feather)
        if k < l:
            w *= max(0.0, 1 - (l - k) / 2)
        elif k >= l + sw:
            w *= max(0.0, 1 - (k - (l + sw - 1)) / 2)
        best = max(best, w)
    return best


def arbutus(d, x, y):
    for r, run in enumerate((LIMB_TRUNK, LIMB_A, LIMB_A1, LIMB_A2, LIMB_B)):
        for (ry, c, w) in run:
            left = c - w // 2
            for k in range(w):
                px = x + left + k
                base = _age(ry)
                if k == 0 and w >= 3:
                    col = mix(base, SHADE, .55)
                elif k >= w - 1 and w >= 2:
                    col = mix(RIM, base, .25 if (ry + r) % 3 else .55)
                else:
                    sw = _sheet(k, ry) if r == 0 else 0.0
                    col = AGE_RAMP[4] if sw > .55 else (mix(base, PEEL, .5) if sw > .2 else base)
                    if ry > 33 and (px * 3 + ry * 5) % 13 < 2:
                        col = mix(col, COPPER, .55)
                d.point((px, y + ry), fill=col)
    for (fx, fy) in CANOPY:
        stamp(d, CLUSTER, x + fx - 8, y + fy - 6)
    for (bx, by) in BERRIES:
        d.point((x + 6 + bx, y + 2 + by), fill=BERRY)
        d.point((x + 7 + bx, y + 2 + by), fill=mix(BERRY, RIM, .30))


# ------------------------------------------------------------ the composition
# GARDEN STATE 0, placed by hand. Every position below was chosen, not
# generated: the owner's verdict on a generated layout was that it "is
# obviously mechanical and ai as it is incredibly repetitive", and he was right.
#
# WHAT GOES WHERE, and why. The sun is upper right, so the LIT corner is the
# top right and it carries the hero - the arbutus. The top left is the shade
# corner and also the busiest, since the home button and the counter already
# sit in it, so it gets the least: two cropped conifers. The bands are 13-16 px
# and the only motif natively that size is the far islands' saw-tooth crown.
# The bottom corners, which the owner ruled back on 2026-09-03, carry the
# ground: rocks where the frame turns, the crocus, the ox-eyes and the rabbit.
def saw(d, x0, x1, y, up):
    """The far treeline: a crown of spires 3-8 px tall, the one motif natively
    the size of a band. Hand-irregular - the pitch and the height both vary,
    and no two spires match."""
    heights = (5, 3, 7, 4, 6, 3, 8, 5, 4, 7, 3, 6, 4, 8, 5, 3, 7, 4, 6, 5, 3, 8, 4, 6, 3, 7, 5, 4)
    step = (4, 5, 4, 6, 5, 4, 5, 6, 4, 5)
    x, i = x0, 0
    while x < x1:
        h = heights[i % len(heights)]
        col = mix(SHADE, STEM, .38 if i % 2 else .22)
        for k in range(h):
            wide = max(0, (h - k) // 3)
            yy = y - k if up else y + k
            for w in range(-wide, wide + 1):
                if x0 <= x + w < x1:
                    d.point((x + w, yy), fill=col)
        x += step[i % len(step)]
        i += 1


def corner_tl(d, x, y, size, ground):
    """The shade corner: least incident in the frame."""
    conifer(d, x + 2, y + size - 44, ground, cx=6)
    conifer(d, x + 20, y + size - 34, ground, cx=5)


def corner_tr(d, x, y, size, ground):
    """The lit corner: the hero, and only the hero."""
    arbutus(d, x + size - 34, y + size - 50)


def corner_bottom(d, x, y, size, ground, left=True):
    """The ground where the frame turns: rocks, a crocus, ox-eyes, and on one
    side the rabbit."""
    for (rx, ry, w, h) in ((6, size - 12, 14, 7), (26, size - 9, 10, 5), (16, size - 18, 11, 6)):
        px = x + (rx if left else size - rx - w)
        d.ellipse([px, y + ry, px + w, y + ry + h], fill=mix(SHADE, STONE, .22))
        d.ellipse([px + w // 3, y + ry, px + w, y + ry + h - 3], fill=mix(SHADE, STONE, .34))
    stamp(d, CROCUS, x + (10 if left else size - 22), y + size - 30)
    for (ox, oy) in ((26, 24), (38, 30), (18, 36)):
        stamp(d, OXEYE, x + (ox if left else size - ox - 9), y + oy)
    if left:
        stamp(d, RABBIT, x + 34, y + size - 26)


PROFILES = {
    # name: (width, height, corner, band, side panel)
    "phone": (390, 844, 70, 16, 0),
    "phone-small": (320, 568, 58, 13, 0),
    "tablet": (810, 1080, 0, 0, 97),
    "desktop": (1280, 800, 0, 0, 160),
}
SKY = ((143, 208, 250), (185, 195, 251), (217, 198, 251))


def ground_image(W, H):
    """The app's own ground, which the garden is painted on: the root gradient
    through the three sky tokens at 160 degrees."""
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / max(1, H - 1)
        a, b, u = (SKY[0], SKY[1], t / .55) if t < .55 else (SKY[1], SKY[2], (t - .55) / .45)
        d.line([(0, y), (W, y)], fill=mix(a, b, u))
    return im


def compose(profile):
    W, H, corner, band, side = PROFILES[profile]
    im = ground_image(W, H)
    d = ImageDraw.Draw(im)
    ground = im.getpixel((W // 2, H // 2))
    if band:
        d.rectangle([0, 0, W, band], fill=SHADE)
        d.rectangle([0, H - band, W, H], fill=SHADE)
        saw(d, 2, W - 2, band, up=False)
        saw(d, 2, W - 2, H - band, up=True)
    if corner:
        for (cx, cy, sx, sy) in ((0, 0, 1, 1), (W, 0, -1, 1), (0, H, 1, -1), (W, H, -1, -1)):
            for yy in range(corner):
                for xx in range(corner):
                    if xx * xx + yy * yy <= corner * corner:
                        im.putpixel((min(W - 1, max(0, cx + sx * xx)), min(H - 1, max(0, cy + sy * yy))), SHADE)
        corner_tl(d, 0, 0, corner, ground)
        corner_tr(d, W - corner, 0, corner, ground)
        corner_bottom(d, 0, H - corner, corner, ground, left=True)
        corner_bottom(d, W - corner, H - corner, corner, ground, left=False)
    if side:
        for (x0, left) in ((0, True), (W - side, False)):
            d.rectangle([x0, 0, x0 + side, H], fill=SHADE)
            for (cx, cy) in ((18, 300), (54, 480), (30, 700), (70, 200), (44, 900)):
                if cy < H - 40:
                    conifer(d, x0 + (cx if left else side - cx - 12), cy, SHADE, cx=7)
            arbutus(d, x0 + (12 if left else side - 46), H - 260)
            frond(d, x0 + (10 if left else side - 30), H - 120)
            for (ox, oy) in ((20, H - 190), (60, H - 150), (36, H - 90), (74, H - 230)):
                if 0 < oy < H - 12:
                    stamp(d, OXEYE, x0 + (ox if left else side - ox - 9), oy)
            stamp(d, CROCUS, x0 + (28 if left else side - 40), H - 70)
            if left:
                stamp(d, RABBIT, x0 + 46, H - 52)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="phone", choices=sorted(PROFILES))
    ap.add_argument("--out", default=None)
    ap.add_argument("--scale", type=int, default=1)
    a = ap.parse_args()
    im = compose(a.profile)
    if a.scale > 1:
        im = im.resize((im.width * a.scale, im.height * a.scale), Image.NEAREST)
    out = pathlib.Path(a.out or (ROOT / f"garden-{a.profile}.png"))
    im.save(out)
    print(f"{a.profile}: {im.width} x {im.height}, {len({c for _, c in im.getcolors(1 << 20)})} colours -> {out}")


if __name__ == "__main__":
    main()


# ------------------------------------------------------- the tree library
# Twenty-three trees, designed 2026-09-03 by five pixel artists reading the
# bible and the owner's reference: four more arbutus, four Garry oaks, five
# conifers, five broadleaves and five snags. Every map is theirs, hand-
# authored; the legend is lowercased so no row can read as a name.
TREES = {
    # --- arbutus
    "arbutus_young": {  # 16 x 28: A sapling for a side panel's mid height, or the tablet/desktop panel below the hero, where a bare stretch of gardenShade needs something small and vertical. ITERATED 2026-09-03 on the owner's note, "arbutus a famously bendy tree": the first one ran straight up, and a straight arbutus is not an arbutus. It now leans right out of the ground for two thirds of its height, recovers left under the crown, and carries one long arm out of its left flank that reaches away and lifts at the wrist with a small tuft on the end. The crown is heavy on the lit side and thin on the shaded one, which is why the arm has room to be seen. Two px wider and two taller than the version it replaces, because the lean needs the room
        "map": [
            "........sttt....",
            ".......ssssttt..",
            "......ssssssttt.",
            "......sssssssttt",
            ".....ssst..sssst",
            ".....dsssttsst..",
            "....ssssssssyttt",
            "...ssssssssssst.",
            ".....sst.ssssst.",
            "......dsssssst..",
            "......dsssssst..",
            ".stt...dsssst...",
            "ssttt.pmssst....",
            "dysst..pmst.....",
            "dsst...pm.......",
            "sst.....pm......",
            "..pm....phm.....",
            "...pm..phm......",
            "....pmphm.......",
            ".....mphm.......",
            ".....phm........",
            ".....phm........",
            "....phm.........",
            "....bphm........",
            "...bbhm.........",
            "...bbhm.........",
            "..bbbhm.........",
            "..bbbhm.........",
        ]},
    "arbutus_bluff": {  # 34 x 50: The hero for a tablet or desktop side panel (97 and 160 px wide), standing on the ground line at the panel's foot. REDRAWN FROM NOTHING 2026-09-03: the owner rejected the first outright, and the whole species note - bendy - is the answer. One swollen root flare throws a trunk that falls away left almost at once; what is left of it climbs and forks a SECOND time, high up, into the leader and a third that sweeps right and lifts late. Two forks at two heights, three crowns of three sizes at three heights, and one limb that is dead, bare and stops blunt in the gap - a tree that has lost a branch and carried on. Nothing on it is straight for four rows together
        "map": [
            "............ssssssttttttt.........",
            "...........ssssssssssssstt........",
            "..........ssssssssssttssst........",
            ".........sssssssssssssttstt.......",
            ".........ssssssssssssssst.........",
            "........ssst..ssssssssssttt.......",
            "........ssssssssssssssssytt.......",
            ".........ssssssssssssssssst.......",
            ".........sssssssssssssssst........",
            ".........dsssssssssst..sst........",
            ".sstttt...sssssssssstttst.........",
            ".sssssttt..dsssssssssssst.........",
            "sssssssstt.dssssssssst............",
            ".ssssssttt..dssssssssttt..........",
            "sst..sssstt..pm..pm...............",
            "sssysssssst..pm..pm.........ssttt.",
            "dsssssssst....pm.pm.......sssssst.",
            ".sssssssstt...pm.pm......ssssssstt",
            ".dsssssssstt...pm.pm.....ssssttyt.",
            "..dssssssst.....pmpm....ssst..sst.",
            "....dssst........ppm....ssssttsst.",
            "....pm...........pm.....sdsssssst.",
            "...pm............pm....ssdsssst...",
            "...pm............phm....ssdssstt..",
            "...phm..........phm........ssst...",
            "...phm.......bh.phm.........spm...",
            "...phm....bhbh.phm..........phm...",
            "....phm.bh.....phm.........phm....",
            "....phmb.......phm........phm.....",
            ".....phm........phm.....phm.......",
            ".....phm........phm....phm........",
            "......phm.......phm...phm.........",
            "......bphm.......phm.phm..........",
            ".......bphm......phmphm...........",
            "........bphm......bphm............",
            "........bphm......bphm............",
            ".........bphm.....bphm............",
            "..........bphm....bbbhm...........",
            "..........bbbhm..bbbhm............",
            "...........bbbhm.bbbhm............",
            "...........bbbhm.bbbhm............",
            "............bbbhmbbbhm............",
            ".............bbbbbhm..............",
            ".............bbbbbhm..............",
            ".............bbbbhhm..............",
            "............bbbbbhhm..............",
            "............bbbbbbhhm.............",
            "...........bbbbbdbbhm.............",
            "..........bbdbbbbdbbbhm...........",
            "........bbbdbbbbbdbbbbhm..........",
        ]},
    "arbutus_wind": {  # 40 x 30: The bottom-right corner of a phone frame, or the foot of a right-hand side panel, rooted at its own bottom-left and leaning out across the corner over
        "map": [
            ".................................stt....",
            "................................sstt....",
            "...............................sssyt....",
            "..............................sssssst...",
            ".............................ssssssstt..",
            "............................ssssssssstt.",
            "...........................ssssssssssttt",
            "...........................sssssysssstt.",
            "............................sssssssssttt",
            ".............................dssssssstt.",
            "..............................ssssssstt.",
            "...............................sssstt...",
            "..................ssssysssst....hm.sstt.",
            "..................sssssssssttt..pm..stt.",
            ".................ssssssssssttt.pm....hm.",
            "................ssssssssssttt..pm..pphm.",
            "................dsssssssstt...sbppphhhm.",
            "......ssst......sssssssssbppppphhhhhm...",
            "....sssssst........sbpppphhhhhm.........",
            "...ssssstt.....sbppphhhhm...............",
            "...ssssyst..sbppphhhm...................",
            "....dsssssbbpphhhm......................",
            ".......sbbpphhm.........................",
            ".....sbbbphhm...........................",
            "....sbbbhhm.............................",
            "...sbbbhhm..............................",
            "..ssbbbhm...............................",
            ".sssbbhm................................",
            "sssbbhm.................................",
            "dssbhm..................................",
        ]},
    "arbutus_far": {  # 10 x 16: The 16 px band on a phone, standing on the band's inner edge among the saw-tooth treeline, where its warm trunk is the one thing in that strip that is
        "map": [
            "...stt....",
            "..ssttt...",
            ".sssstt...",
            ".ssssstt..",
            ".ssss.stt.",
            "..ssssstt.",
            ".dsssssstt",
            "..ssssytt.",
            "...dsstt..",
            "...sspmt..",
            "....spmt..",
            ".....pm...",
            ".....pm...",
            ".....pm...",
            "....bpm...",
            "...sbhm...",
        ]},
    # --- garry-oak
    # The lower right branch, which the owner called weird on 2026-09-03, was a closed loop - a
    # limb that left the root flare, arced up and rejoined the crown, so it read as a handle. It
    # is now a limb that leaves the crotch, runs out level, elbows down and forks: no loop, and
    # thickest where it leaves the trunk. Nothing else in this map was touched; he called the rest
    # perfect.
    "garry-mature": {  # 44 x 40: The wide corner tree — as broad as it is tall, so it belongs where the frame has room: the top-left shade corner of a phone (replacing one of the two
        "map": [
            "....................ttt.....................",
            "..................tssstt....................",
            ".................dssssst..tt...ttt..........",
            ".........ttttt...dsssssstsstttsssst.........",
            "........sssssstttddsssdssssddssssstt........",
            ".......ddsssssssssdddsddssssdssssss.........",
            "........dsssdsssssstddddsssssdddss..........",
            ".........dddddssssstt..dddsssd..ttt.........",
            "............ddsssssssttttddd..tsssttt.......",
            ".............ddssssssssstd....sssssst.......",
            "......ttt..tttdddddsssss..t..ddssssstt......",
            "....tssst..ssstt..ddssst..dtttdsssssst......",
            "....ssssdtssssstt.ddssst..ssstdddssssttt....",
            ".ttddsssddssssstt..ddssdtsssssttddsssssst...",
            ".sssdsssddssssssttt..ddddssssstd.ddssssstt..",
            "dsssddddsddssssssbt...dddsssss....dsssssstt.",
            ".dssss..dsdddddddsstt.b.ddssst.....dddsssst.",
            ".ddddt..sssss...dssstt.t..dddstttts..dddsst.",
            "...dddtssssst...ssssssst..t.sssssst..ssdssst",
            "...dddssssssbttddssssssststddssssdstssstddd.",
            "...ssddsddsbssssdddddsssbsttdssbsdssssssb...",
            ".tdsssdddddsssssssssdssbsstttdbdssdddssst...",
            "..dddsssssdddsssssssddddsssssdtdb..ddssstt..",
            "....dssssb...ddssssssbbddssssstb...bdssss...",
            ".....ddddbh..bddsssssbbbddsssssbhhbbbddd....",
            ".........dbhbbbddddd.dbb..dddbbbbbbb........",
            "..........dbbbbb......dbh..bbbbbbb..........",
            "...........bdbbbhhb....dbhbbbbb.............",
            ".............dbbbbbh...bbbbbbbb.............",
            "..............bddbbbhhbbbbbbb.bhhh..........",
            ".................dbbbbbbbbb...bbbbh....h....",
            "..................dbbbbbbb....dbbbbh..b.....",
            "...................dbbbbbh........bbhh......",
            "....................bbbbbbhh.......dbbb.....",
            "...................bbbbbbbbbbb..............",
            "...................dbbbb.bddb...............",
            "...................dbbbh....................",
            "...................dbbbh....................",
            "...................bbbbh....................",
            "..................bbdddbb...................",
        ]},
    # Iterated 2026-09-03 on the owner's "should have more bare dead branches": a stag-headed
    # veteran now, with a long bare limb out to the left whose far end sags and whose back carries
    # one fine twig, a second bare limb up out of the crown's top right corner, a bite out of the
    # crown's right shoulder with the snapped stub of the limb that used to fill it still in it,
    # and a third limb broken off short low on the trunk. The dead wood's lit rim starts as
    # gardenHeart where it is still barked and weathers to stone further out.
    "garry-veteran": {  # 40 x 44: The one with a story in it, so it wants to be seen: the bottom of a tablet or desktop side panel, where a child's eye rests between words, or a phone'
        "map": [
            ".................ttttttt................",
            "................dssss..dt...............",
            "................ddsst..tt.......nn......",
            "...............dddssstsssttt.nnnb.......",
            "...............dsddddssssshhnbb.........",
            "......n........ddsssdsdsssbbb...........",
            "......n.........dddsssddssbbt...........",
            ".nnnn..n......ttt.dddssddds.............",
            "n..bbnnn....tssstttdsssssshnnn..........",
            ".....bbbnnndsssssstddssshhbbb...........",
            ".......bbbbhhhsssstddsssbbbb............",
            "........bbbbbbssssstdddsbb..............",
            "....dstddssbbbdsbss...ddds..............",
            "....dssddssssddddt.b..dbdd..............",
            "....ddssddss...dsttt..dtt..dstss........",
            "...dsdddsddt...ssssstssst..ddss.........",
            "...dssssssssttssssddsssssttbdsstt.......",
            "...ssddssssssdssssddssssssttsssst.......",
            ".tdsssdssssssddds..dddbsssssdsssstt.....",
            "dsdddsddddbssssdt..sbbddssssddsssst.....",
            "dsssssss..dsssssstssdbdddssssddddd.....n",
            "dssdssst..ssssdssssss...ddddd.......nnn.",
            ".ddddssstdddssddsssst..............bbbn.",
            "....dddssb..dssddddddhhb........nnbnbb..",
            "...b...dbh..bsss.....bbh.......bbbbb....",
            "........dbtdsssst...bbbh.....nbnbddn..nn",
            "........bbbdssss...bbbbb....bbbb....nb..",
            ".........bdbdddh..bbbbb..nnnbbd.........",
            "...........dbbbbhbbbbbbnbbbbb..n........",
            "............bdbbbbbbbbbbdbbb....n.......",
            "..............dbbbbbbbbbbdb......n......",
            "...............dbbbbbbbb.........n......",
            "...............hhhbbbb............n.....",
            "...........nhhbddbhbbh..................",
            "..........bbbbbdddbbbh..................",
            "..............bdddbbbh..................",
            "...............bdbbbbh..................",
            "...............bbbbbbh..................",
            "..............bbbbbbbh..................",
            "..............dbbbbbbb..................",
            "..............dbbbbbb...................",
            "..............dbbbbbh...................",
            "..............bbbbbbh...................",
            ".............bbdddddbb..................",
        ]},
    "garry-young": {  # 16 x 26: The filler that gives the frame depth without competing: tuck two or three of them at different heights along a tablet or desktop side panel, between 
        "map": [
            "......ttttt.....",
            "......dssst.....",
            "......ddsst.....",
            "....ttt.sst.ttt.",
            "...ssssdsssdssst",
            "....ssstdsssdss.",
            "..tdsssssddstt..",
            "tsssdd.dsssssst.",
            "dsssst.sssdssst.",
            "ddsddsssssbssst.",
            "..dsdssss..dd...",
            "..dsdddsstsst...",
            "..dsssddbssst...",
            "..dssbs.dssst...",
            "...ddd..bddd....",
            "...b....b..b....",
            "...b....bbb.....",
            "....b...b.......",
            "....b...b.......",
            ".....bb.b.......",
            ".......b........",
            "......bbb.......",
            "......dbh.......",
            "......dbh.......",
            "......dbh.......",
            "......bdb.......",
        ]},
    "garry-winter": {  # 34 x 34: The quiet one — no green at all, so it never pulls the eye off the word
        "map": [
            "....................b.............",
            ".............b.....b..............",
            ".............b....b...............",
            "..............b...b...............",
            ".......b......b...b......b........",
            "........b......b.b......b.........",
            "........b.......db......b.........",
            "........b........b......b....b....",
            ".........b.b......b....b....b.....",
            ".........b..b.....h.b.b.....b.....",
            "........b...b....bbbbb......b....b",
            "....b...b...b.....bbb......b.....b",
            "b...b...b....b...bbb.......b...bb.",
            ".b...b..b.....b.bbbh........h.b.b.",
            ".b....b..b.....dbbbh.......dbb..b.",
            "..b...b..bh.....dbb........dbbhb..",
            "..b....bdbbh.....dbh.......bbb....",
            "..b......dbh.....dbh...b..dbb.....",
            "...b.....dbh.....dbbhbb...bbh.....",
            "...b......dbh....dbbb....bbbh.....",
            "....b......dbh...dbbh...bbbb......",
            "....b......dbbh..bbbbhhbbbd.......",
            "....b.......dbbhbbbbbbbbb.........",
            ".....b.......bbbbbbbbbbdb.........",
            "......b...hhbbbbbbbbbb............",
            "......h.hbbbbbbbbbbbb.............",
            ".....bbbbbbbbbbbbbbb..............",
            "......bbbddd.dbbbbb...............",
            "....bb.b.....dbbbbh...............",
            ".............dbbbbh...............",
            ".............dbbbb................",
            ".............dbbbh................",
            ".............bbbbh................",
            "............bdddddb...............",
        ]},
    # --- conifers
    "shore pine": {  # 18 x 30: The two bottom phone corners, on the rocks beside the crocus - it is the one conifer short enough to stand whole in a 70 px corner, and its open crown
        "map": [
            "..................",
            "........ttt.......",
            "......tsssstt.....",
            "......sssssss.....",
            "......dsssssstt...",
            "........dsssssstt.",
            "...ttt....sssssss.",
            ".tsssst...dsssss..",
            ".dssssst...bbss...",
            "..dsssss...bh.....",
            "...sssbbb.dbb.ttt.",
            "...sss...bbh.sssst",
            ".tsssstt.dbb.sssss",
            ".sssssss..dbbsssss",
            ".dssssss..dbb.dss.",
            "...dss..b.dbb.....",
            ".........bbh......",
            ".........dbb......",
            ".........bh.......",
            "........bh........",
            ".......dbb........",
            "........dbb.......",
            "........dbb.......",
            "........bh........",
            ".......dbb........",
            ".......bh.........",
            "......bh..........",
            ".....dbb..........",
            "......dbb.........",
            "......dbb.........",
        ]},
    "young fir": {  # 8 x 18: Scattered at the feet of the big trees - two or three per side panel and one in the top-left phone corner - to break the repeat of full-size conifers  ITERATED 2026-09-03 on the owner's "too perfect": it was a symmetric zigzag. It is now three tufts, not five, and the top one has NO right limb at all; the middle reaches further right than left and the bottom further left than right; the leader stands over the trunk's right side.
        "map": [
            "...st...",
            "...sst..",
            "..dsst..",
            "...ss...",
            "...bh...",
            ".ttt....",
            ".ssss...",
            ".dss....",
            "...bh...",
            ".sssttt.",
            "ssssssss",
            "dsssssss",
            ".dsssss.",
            "...bh...",
            "sssttt..",
            "ssssssss",
            "dssssss.",
            ".dbbh...",
        ]},
    "far conifer": {  # 5 x 12: The 13-16 px top and bottom bands on phones, standing on the band's inner edge among the saw-tooth crown - it is the only conifer that fits a band who Revised 2026-09-03, unjudged but caught by the same note as its neighbours: it was a perfect zigzag hung on a one-pixel thread. The left edge now steps 2/2/2/1/1/1/1/0/0/0/0 and the right 2/3/3/3/3/4/3/3/4/3/3, so neither side repeats; the light lands as four separate glints rather than a staircase; and the foot is bark two pixels wide instead of a hanging thread.
        "map": [
            "..s..",
            "..st.",
            "..ss.",
            ".sst.",
            ".sss.",
            ".ssst",
            ".sss.",
            "ssss.",
            "sssst",
            "ssss.",
            "ssss.",
            ".bh..",
        ]},
    # --- broadleaves
    "red alder": {  # 20 x 40: A side panel, standing in twos and threes at different heights: it is the only tree here that is mostly trunk, so it does the job of a vertical in a 6 REDRAWN FROM NOTHING 2026-09-03; the owner rejected the first. The trunk IS this tree - the only pale-barked thing in the set - so it gets the drawing and the crown gets out of its way, and nothing on the bole is warm now: gardenShade on the shaded flank, stone for the barrel, gardenRay on the lit edge. It leans, stepping right TWICE as it rises. The pale face is mottled in RUNS and never a chequer - lichen washes the full width at r20-22 and r30-31, the sunlit edge goes dull at r17-18, r26-28 and r35-36 - and four dark LENTICEL dashes cross it at four unequal heights, which is the mark that says alder and nothing else. Two dead stubs carry no leaf. Above, the branches go from bark to dark twig as they thin, so the crown is nine sprays hung in the dark and not a bundle of orange sticks.
        "map": [
            "........ttt.........",
            "........sssst.......",
            ".......ssssstt......",
            "..........d.sst..ttt",
            "..ttt.....d.....ssst",
            ".sssst....d.....dss.",
            "..dss.....d...ttttd.",
            ".....d.....d.ssssst.",
            ".....dttt..d..dsss..",
            ".....sssst.t.tttd...",
            "...tt.dss.ssssstd...",
            "..ssss..d..dsssb....",
            "....ttt..d.b..bttt..",
            "...sssst..bb.bssst..",
            "....dss...bnb..dss..",
            ".....d....dbw.......",
            "......d...dnw.......",
            ".......d..dnn.......",
            "........bbnn........",
            ".........dbd........",
            ".........dww........",
            ".........dww........",
            ".........dww........",
            ".........ddd........",
            "......bbbbnw........",
            "........dnnw........",
            "........dnnn........",
            "........dnnn........",
            "........dnnn........",
            "........ddnw........",
            "........dwww........",
            "........dwww........",
            ".....bbbbnnw........",
            ".......dnnw.........",
            ".......dndd.........",
            ".......dnnn.........",
            ".......dnnn.........",
            ".......dnnw.........",
            ".....dnnnnww........",
            "....dnnnnnnww.......",
        ]},
    "pacific dogwood": {  # 24 x 30: The lit top-right corner or the sunny side panel, and only ONE of them anywhere in a frame - it is the brightest sprite in the set and a second copy w ITERATED 2026-09-03 on the owner's "close, centre too empty". The flower was the fault: four bracts around a HOLE. A dogwood flower is four white bracts around a small green BUTTON of true flowers, so every bloom now carries that button - gardenTip over gardenStem at its heart - and the sinus between the two upper bracts is cut, which is what tells a bract from a petal. Five blooms, not seven, at five heights and in two sizes, each set ON the leaf mass the way a dogwood flowers at its branch tips. The leaves went up and the bare armature came down, so the white has something to be bright against instead of empty ground.
        "map": [
            "..............nww.......",
            "......nww....nwwww......",
            ".....nwwww.ttcwttwt.....",
            ".....cwttw.tttcwwnt.....",
            "......cwwntssssccstt....",
            "....btsccstbbssssst.....",
            "......sssssbbssssstnww..",
            ".......ssstbb.sst.nwwww.",
            ".nww......tbb.t...cwttw.",
            "nwwww..ttttbh.tt..tcwwn.",
            "cwttwttnwwtbhtttttsscct.",
            ".cwwndnwwwwbbssttssssst.",
            "..ccsscwttwbbsssttssst..",
            ".sssssscwwnbb...sssnww..",
            "..sss...sssbb....tnwwww.",
            "..nww....ssbb.....cwttw.",
            ".nwwww..sssbhttt.ttcwwn.",
            ".cwttwsssssbhsnwwssscc..",
            "..cwwnsssssbbnwwwwssstt.",
            ".ssccssssssbbcwttwssst..",
            "..ssssssnwwbbscwwn.sst..",
            "...ssssnwwwwbss.........",
            ".......cwttwbbss........",
            "........cwwnbh..........",
            ".........ccbbh..........",
            "...........bbh..........",
            "...........bbb..........",
            "..........bbbb..........",
            "..........bbbbb.........",
            ".........bbbbbbb........",
        ]},
    "cascara": {  # 16 x 28: The understorey filler: tucked behind and between the bigger trees in a side panel, or standing alone in a phone corner where 16 px is all the width t REDRAWN FROM NOTHING 2026-09-03; the owner rejected the first, which was a generic bush. This one is drawn as what it is, an understorey tree: it LEANS towards the light, foot at col 3 and head at col 9, and it is mostly air, because a small tree standing under big ones is. Its leaf is the species cue - a large oblong blade, not a maple's hand and not an alder's spray - so there are only nine of them, hung ALTERNATELY and never opposite, on twigs of four different lengths that darken to gardenShade as they thin. One twig is dead and bare. The berries hang as a loose cluster of three on the sunlit side, not a ring.
        "map": [
            "........sttt....",
            ".......sssst....",
            ".....stdss......",
            "....sssstd......",
            "....dsss.d......",
            "........d.ssttt.",
            "...sstt.d.ssssst",
            "...ssst.b..dsss.",
            "ssttds..b...sttt",
            "sssst.dbb..sssst",
            ".dss..dbb..dsss.",
            "..d...dbbbb.....",
            "ssttt.dbb...sttt",
            "sssstdb....sssst",
            ".dss.bb....dy...",
            ".....dbb.bdyd...",
            "sstttdbbb...y...",
            ".ssssds.........",
            "...bbbs.........",
            "....dbb.........",
            "....db..........",
            "....db..........",
            "....db..........",
            "...db...........",
            "...db...........",
            "...dbbh.........",
            "..dbbbh.........",
            "..dbbbbh........",
        ]},
    "filbert with catkins": {  # 18 x 24: Low and at the front, where a shrub belongs: the bottom of a side panel or a phone's bottom corner, in front of a conifer or beside the rocks, so its 
        "map": [
            "......ttttt.......",
            "......sssst.......",
            "......sssst.......",
            ".....tsssstttttt..",
            "...ttssssssssstt..",
            "..ssdsssssssssstt.",
            ".ssssssssssssssstt",
            ".sssssssssssssssst",
            ".sssssst...ssssttt",
            ".sssssdt...sssstmt",
            ".tmsssds...ssssttt",
            ".ttssssssttssssttt",
            ".ttstm..sssttm.tt.",
            ".ttstt...ss.tt..t.",
            "..t.tt...s..tt..t.",
            "..t.ttb..b..tt....",
            ".....tbh.bh..th...",
            ".....t.bhbh.bt....",
            ".......bhbh.bh....",
            ".......bhbh.bh....",
            "........bbhbh.....",
            "........bbhbh.....",
            "........bbhbh.....",
            ".........bbh......",
        ]},
    # --- snags
    "the broken snag": {  # 16 x 52: The tablet and desktop side panels, standing behind the conifers where its 52 px of height has room; on a phone it crops into the top-left shade corner. Revised 2026-09-03 after the owner's "too perfect": the crown is a splintered break, not a cut - a tall spike right of centre, a blunt torn one beside it, a hanging sliver, and a deep notch between them. The bark is gone in plates, not in a gradient: it stops at one column for a run of rows and then steps, four times up the trunk, and comes off entirely across the middle where the wood is silvered. Two shakes, neither plumb and neither full length; a woodpecker hole in the lit face; one broken limb stub on the right only.
        "map": [
            ".........dbnw...",
            ".........dbnw...",
            "........dbhnw...",
            "........dbhnw.hw",
            "...b....dbhnw.hw",
            "...bh...dbhnw.nw",
            "..dbh...dbhnw.nw",
            "..dbhn..dbhnnnnw",
            "..dbhnw.dbhnnnw.",
            "..dbhnwdbbhnnnw.",
            "..dbbbbhnnnnnw..",
            "..dbbbbhnnnnnw..",
            "..dbbbdhnnnnnw..",
            "..dbbbdbhnnnnw..",
            "..dbbbdbbhnnnnw.",
            "..dbbbbdhnnnnnw.",
            "..dbbbhdnnnnnnbb",
            "..dbbbhdnnnnnnbh",
            "..dbbbhnnnnnnnw.",
            "..dbbbbhhnnnnnw.",
            "..dbbbbhhnnnnnw.",
            "..dbbbbbbbbhnnw.",
            "..dbbbbbbbbhnnw.",
            "..dbbbbbbbdnhnw.",
            "..dbbbbbbdddnnw.",
            "..dbbbbbbdddnnw.",
            "..dbbbbbbbdhnnw.",
            "..dbbbbbbbhnnnw.",
            "..dbbbbbhnnnnnw.",
            "..dbbbbbhnnnnnw.",
            ".dbbbbbhnnnnnnw.",
            ".dbbbbbhnnnnnnw.",
            ".dbbbbbbhnnnnnw.",
            ".dbbbbbhnnnnnnw.",
            ".dbbbhhnnnnnnnw.",
            ".dbbbhhnnnnnnnw.",
            ".dbbbbbbhnnnnnw.",
            ".dbbbbbhnnnnnnw.",
            ".dbbbbbbhnnnnnw.",
            ".dbbbbbbhnnnnnw.",
            ".dbbbbbbhnndnnw.",
            ".dbbbbbbhnndnnw.",
            ".dbbbbhhnnnndnw.",
            ".dbbbbhhnnnndnw.",
            ".dbbbbbbbbhnnnw.",
            ".dbbbbbbbhnnnnnw",
            "dbbbbbbbbbhnnnnw",
            "dbbbnnbbbbhnnnnw",
            "dbbbnwbbbbbhnnnw",
            "dbbbnbbbbbbhnnnw",
            "dbbbbbbbbbhnnnnw",
            "dbbbbbbbbbbhnnnw",
        ]},
    "the leaner, caught in its neighbours": {  # 30 x 40: Mid-height in a tablet or desktop side panel, its foot on the shadow side and its head reaching into the light; it also fits a 70 px phone corner if t
        "map": [
            "..........................n...",
            ".........................bn...",
            ".........................bnw..",
            ".........................dnw..",
            ".........................dnw..",
            "........................dnw...",
            "........................dbwt..",
            ".......................dtw.stt",
            ".....................s.ssssstt",
            "...................sssssssssst",
            "..................tssbbbbbbbss",
            "...................dssbsssssd.",
            ".....................dbss.d...",
            "....................nwnd......",
            "...................bdnw.......",
            "...................dbnw.......",
            "..................dbnw........",
            "..................dbbw........",
            ".................dbnw.........",
            ".................dnnw.........",
            "................dnnw..........",
            "...............dbnw...........",
            "...............dbbw...........",
            "..............dbnw............",
            "..............dbnw............",
            ".....ss..st..dnnw.............",
            "..ssssssssstdbnw..............",
            ".ssbbbbbbbssdbbw..............",
            "..dsss.sssddbnw...............",
            "....ds.ss.dnnw................",
            ".....d.d.dbnnw................",
            ".........dbbnw................",
            "........dbbnw.................",
            ".......dbbbw..................",
            ".......dbbnw..................",
            "......dbnnw...................",
            "...bnnbbnnw...................",
            "..bbnnbbnnw...................",
            ".bbnndbbbnw...................",
            "bbddbbbbnw....................",
        ]},
    "the nurse stump": {  # 24 x 22: The bottom corners of the phone frame and the foot of a side panel, sitting on the ground beside the rocks and the crocus - it is a ground motif and its foot must meet the ground line. Redrawn 2026-09-03; the owner rejected the first. This one did not get sawn, it broke, and it broke on a slant - splintered high on the shaded left, rotted away low on the lit right, so no two columns of its crown agree for long. The bite out of its left edge is a springboard notch, cut by a logger a lifetime ago, with its roof in shadow and its floor taking the light. Two seedlings of two sizes and moss on the low shoulder are what makes it a nurse.
        "map": [
            "...........g............",
            "..........sg............",
            ".........vssg...........",
            "..........ssg....g......",
            "........vvssgg..sg......",
            "..........ssg..vssg.....",
            ".......vvsssgg..sg......",
            "..........vsg..vssgg....",
            "...........b.....b......",
            "...........b.....b......",
            ".........nhn.....b......",
            ".......bhbbbhh.h.b......",
            "......svbbbbhhnhnh......",
            "......ddbbbbhhbhhhn.....",
            "......ddbbbbhhbhhhn.....",
            "......vsbhbbhhhhhhn.....",
            "......svbbbbhhhhbhn.....",
            "......vdbbbbhhhhbhhn....",
            ".....ddbbhbbhhhhbhhn....",
            "....ddbbhbbhhhhhhhhhn...",
            "....ddbbbbbhhhhhhhhhn...",
            "...dddddddddddddddddd...",
        ]},
    "the fire-scarred trunk": {  # 12 x 36: Tucked between two conifers in a side panel or the top-left shade corner, where its narrow 12 px slots into a gap; the scarred face must be turned int
        "map": [
            ".....dbw....",
            "....dbnm....",
            "....dbbnm...",
            "....dbnnw...",
            "...dbbbnw...",
            "...dbbbnw...",
            "...dbbnnw...",
            "...dbbnnw...",
            "...dbbbnw...",
            "...dbbbnnw..",
            "...dbbnnnnw.",
            "...dbbbnndb.",
            "..dbbbbbnw..",
            "..dbbbbnnw..",
            "..dbbdbnnw..",
            "..dpbdnnnw..",
            "..dpbdbnnw..",
            "..dpbdbbnw..",
            "pbdpbbbbnnw.",
            ".ddpbbbbnnw.",
            "..dpbbbnnnw.",
            "..dppbbbnnw.",
            ".dpdphbbbnw.",
            ".dpdpphbnnw.",
            ".ddppphbdnw.",
            ".ddppphbdnw.",
            ".ddppphbdnw.",
            ".ddppphbdnw.",
            ".ddppphbnnw.",
            ".ddppphbnnw.",
            "dpdppphbbnw.",
            "dpdppphbbnw.",
            "dpdppphbbbnw",
            "dpdppphbbbnw",
            "dpdpppphbbbw",
            "dpdpppphbbbw",
        ]},
    "the driftwood log": {  # 48 x 12: The bottom band of the phone frame, which is 13-16 px, and the only place a motif this flat is native; it lies along the shoreline below the far trees. Revised 2026-09-03 for the owner's "more variety": the sea has worked three things into it that a straight cylinder had not. The left end is a splintered break, two splinters of two lengths with air between them. The middle is hollow, and the hollow's floor catches the low light. The right end forks, and the wedge between the two limbs widens all the way to the tip. Its grey varies along its length in runs, never column by column - the sand-stained end keeps some bark, the sunlit end has none left.
        "map": [
            "............................................www.",
            "...........................wwnn........wwwwwnnnw",
            ".........wwwwww.....wwnnnwnnhhhwwwwwwwwnnnnnhhhn",
            "......wwwnnnnnnwwwwwndddddhhhhhnnnnnnnnhhhhhb...",
            "..wwwwnnnnnnnnnnnnnnddddddhbbbbhnnnnnhhbbb......",
            "..nnnnhhhhhhhhhhhhhhhdddhhbbbbbnnnnnhbbb........",
            "....hhbbbbbbbbbbbbbbbhhhbbbbbbbbhhhbbb..........",
            "......bbbbhhbbbbbbbbbbbbbbbbbbbbbbbb............",
            ".......bbbhhbbbdddddbbbbbbbbbbbbbbbbwww.........",
            "....hhh.bbbbbbbbbbbbbbbbbbbbbbdddddbnnnwww......",
            "....bbbb.bbbbbbbbbbbbbbbbbbbdbbbbbbbnhhnndw.....",
            ".............ddddbbbbbdddddd......bbhbddd.......",
        ]},
}


# CUT BY THE OWNER, 2026-09-03, after two rounds each: bracket_fungus and
# cone_scatter ("Let's just leave it out"), the coast fir ("Weird part in
# middle"), the western red cedar and the big-leaf maple ("Leave out"). Five
# passes on a bracket fungus is worse art economics than not having one, and a
# garden with 73 good sprites is better than one with 78 of which five are
# arguable. Nothing here depends on them: the drawn conifer, the shore pine, the
# young fir and the far conifer cover the conifers between them.

# --------------------------------------------------- the ground library
# Forty-eight sprites, designed 2026-09-03 by six pixel artists: ground
# cover, flowers, shrubs, deadwood and fungi, fauna, and stone and water.
# Each carries the layer it belongs to - back, mid or front - because the
# composition rule is that the carpets go down first as a continuous field
# and everything else sits on top of them.
SPRITES = {
    # --- ground-cover
    "moss_carpet": {  # back, 16 x 6: The primary carpet
        "layer": "back", "map": [
            ".......sg.......",
            ".sg...sssg......",
            "sssg.ssssg.sg..s",
            "ssssvsssssvssvss",
            "vvssssvsssssssvs",
            "sssvssssvvvssvss",
        ]},
    "moss_cushions": {  # back, 12 x 5: The second carpet, at a 12 px pitch against the carpet's 16, so alternating courses only repeat every 48 px instead of 1
        "layer": "back", "map": [
            ".g..........",
            "ss....sgg...",
            "ssg.ssssg..s",
            "sssvsssssvss",
            "svvssssvssvs",
        ]},
    "grass_low": {  # mid, 7 x 5: The shortest of the three tufts
        "layer": "mid", "map": [
            ".....g...",
            ".....g...",
            "ss..s...g",
            "..s.s..s.",
            "...ss.s..",
            "...vsss..",
        ]},
    "grass_mid": {  # mid, 9 x 9: The middle tuft
        "layer": "mid", "map": [
            ".......g...",
            ".......g...",
            ".s.....s...",
            ".s....s...g",
            "..s...s..s.",
            "...s.s...s.",
            "s..s.s..s..",
            ".s..ss..s..",
            "..s.ss.s...",
            "...vsss....",
        ]},
    "grass_tall": {  # front, 11 x 14: The tallest tuft, and the only ground-cover sprite that breaks the skyline of a carpet course
        "layer": "front", "map": [
            "......g....",
            "......g....",
            ".s....g....",
            ".ss..ss.g..",
            "..s..s..g..",
            "..ss.s..g..",
            "s..s.s.ss.g",
            "ss.s.s.s..g",
            ".s.s.s.s.ss",
            ".v.vvsss.s.",
            ".vv.vss.ss.",
            "..vvvssss..",
            "...vvvss...",
            "....vvv....",
        ]},
    "sedge_clump": {  # mid, 12 x 12: Side panels and the bottom corners, on wetter-looking ground beside the rocks
        "layer": "mid", "map": [
            "......bh....",
            ".....bb.....",
            ".....s.....g",
            ".s...s....g.",
            "..s..s....s.",
            "..s..s...s..",
            "...s.s...s..",
            "...s.s..s...",
            "....ss..s...",
            "....ss.s....",
            "....sss.....",
            "...dssss....",
        ]},
    "wood_sorrel": {  # mid, 9 x 7: A trefoil: two upper lobes with a real notch between them at column 4, one lower lobe, one stalk
        "layer": "mid", "map": [
            ".ss...sg.",
            "ssss.sssg",
            ".dss.sss.",
            "...sss...",
            "..ssssg..",
            "...dss...",
            "...ds....",
        ]},
    "deer_fern": {  # mid, 13 x 9: A low rosette of three fronds from one crown
        "layer": "mid", "map": [
            "......g......",
            "......sg.....",
            "s....ss.....g",
            ".ss...sg...g.",
            "..s..ss..sg..",
            "...ss.ss.ss..",
            "....sss.s....",
            ".....ssss....",
            ".....dss.....",
        ]},
    "salal_spray": {  # mid, 13 x 8: Four leathery ovals in two ranks on a woody stem rising to the upper right
        "layer": "mid", "map": [
            "...........gg..",
            "..........ssgg.",
            "..........vssg.",
            "....gg....vvv..",
            "...ssgg...s....",
            "..vsssg...v....",
            "...vvss..sv....",
            ".....vvsss.....",
            "........sv.....",
            "..ggg...vssgg..",
            ".sssg..vv.sssg.",
            "vssssvvb..vsssg",
            ".vvv...b...vvv.",
        ]},
    # --- flowers
    "trillium": {  # mid, 11 x 13: Bottom third of a side panel, and the bottom corners on a phone, always sitting ON the leaf mat with its lowest two rows
        "layer": "mid", "map": [
            "....www....",
            "...cwwww...",
            "..cwwwwww..",
            "..ccwwwww..",
            "...ccwww...",
            ".cwwchhwww.",
            "ccwwccwwwww",
            ".ccww.cwww.",
            "..ccw..cww.",
            "..dsssstt..",
            ".dssssssst.",
            ".ssdsssdst.",
            "..sssssst..",
        ]},
    "camas": {  # back, 7 x 16: Stands up out of the mat in the middle band of a side panel; its bottom four rows go behind the mid layer so only the sp
        "layer": "back", "map": [
            "...c...",
            "..vcc..",
            "..vcc..",
            "..vcc..",
            ".v.c.c.",
            ".vchcc.",
            "..vcc..",
            "v.c.c..",
            "vchcc..",
            ".vcc...",
            ".v.c.c.",
            "vvchccc",
            ".vvccc.",
            "..dst..",
            ".dsssst",
            ".dsstt.",
        ]},
    "shooting_star": {  # front, 9 x 12: A nodding bloom on a pedicel — its top two stem rows MUST be buried in taller foliage or a mat course, or it hangs from 
        "layer": "front", "map": [
            "...s...",
            "p..s.y.",
            "pp.s.yy",
            ".ppsyyy",
            ".ppyyyy",
            "..pyyy.",
            "..pyy..",
            "..pyw..",
            "..pmy..",
            "..pp...",
            "...p...",
        ]},
    "red_currant": {  # mid, 15 x 12: replaces bleeding_heart, which its own artist could
        # not make read - the bloom is rose-pink and the palette has no pink, so three
        # lockets came out as three red berries. Red-flowering currant instead, which is
        # this coast's own and which the palette can actually paint. THE OWNER SHOULD RULE
        # ON THE SUBSTITUTION: it is a different plant, not a fix.
        "layer": "mid", "map": [
            "..hhhh.........",
            "bbb..bbh.......",
            "........b......",
            ".....pywb......",
            ".....pyybbpyy..",
            "......hhb.py...",
            ".........b.h...",
            "......pyyb.....",
            ".......y.bpyy..",
            ".......h.b.h...",
            ".......pyb.....",
            "........h.py...",
        ]},
    "salmonberry": {  # mid, 11 x 12: A woody twig, so it belongs at the back of the mid layer where a shrub would be — behind the trillium and the buttercups
        "layer": "mid", "map": [
            ".....ppw...",
            "....q.pww..",
            "...qpphpww.",
            "...qpphhpw.",
            "....qpppww.",
            ".....q.pw..",
            "......qp...",
            "......b....",
            "..dsssbt...",
            ".dssstbsst.",
            ".dsst.bsst.",
            "..ds..bst..",
        ]},
    "oregon_grape": {  # mid, 12 x 14: The densest sprite in the set and the workhorse — use it wherever the mat alone leaves a thin patch, through the whole m
        "layer": "mid", "map": [
            ".........m......",
            "........tmm.....",
            "........thm.....",
            ".......tmmmm....",
            ".......thmhm....",
            ".......ttmmm....",
            "........tmm.....",
            ".....m...v..g...",
            "....tmm..ssssg..",
            "....thm..vssv...",
            "...ttmm..s.v....",
            "......ssvv..g..g",
            "........vvvssssg",
            ".g.g.g..v..vvvv.",
            "ssssssvvs....v..",
            ".vvvvv.vv.......",
            "..v.v..v........",
        ]},
    "dandelion": {  # front, 9 x 10: The lowest courses of the panel, at the frame's inner edge where the reading area begins — its yellow is the brightest m
        "layer": "front", "map": [
            "...m.mm..m.",
            "..mmmmm.mm.",
            ".tmmmmmmmm.",
            "tmmmmmmmmmm",
            "ttmmhhmmmm.",
            ".ttmhhmmmmm",
            "..tttmmmm..",
            "...ttmmm...",
            "....dst....",
            "....st.....",
            "...dsst....",
        ]},
    "dandelion_clock": {  # front, 9 x 13: Beside a dandelion, never alone — the pair tells the story
        "layer": "front", "map": [
            "...nww..w",
            "..nnwwww.",
            ".cnnnwww.",
            ".cnn.nww.",
            "ccnnnnnw.",
            ".ccnn.nw.",
            "..ccnnw..",
            "...chh...",
            "....st...",
            "....st...",
            "....st...",
            ".dssstt..",
            "..ds.st..",
        ]},
    "buttercup": {  # front, 7 x 9: The filler flower — small, cheap, and repeatable
        "layer": "front", "map": [
            "...m..mm.",
            "..tmm.mmm",
            ".tmmmmmmm",
            "ttmhhhmmm",
            ".tthbhmmm",
            ".ttmhhmm.",
            "..ttmmm..",
            "...tmm...",
            "....st...",
            "...dst...",
            "..dsstt..",
        ]},
    "closed_bud": {  # back, 5 x 9: sown between the camas spikes in the back layer to break their rhythm, and one or two at the very top of the flower band
        "layer": "back", "map": [
            "..c..",
            "..cw.",
            ".vccw",
            ".vccc",
            "vvccc",
            ".vccc",
            ".vcc.",
            ".vcc.",
            "..vc.",
            "..st.",
            ".dst.",
            ".dstt",
        ]},
    "flower_mat": {  # back, 16 x 7: NOT a flower — the basal rosette cushion that dandelions, buttercups and violets make, drawn so it tiles edge to edge
        "layer": "back", "map": [
            "..t...t....t..t.",
            ".dsst.sst.dsstt.",
            "dssssdssstdsssst",
            "ssssssssttssssst",
            "ssdssssssssssstt",
            "ssssssdssssssstt",
            "ssssssssssssssst",
        ]},
    # --- shrubs
    "salal": {  # mid, 17 x 31: Side panels at every width, and the two bottom corners on phone
        "layer": "mid", "map": [
            "..........st.....",
            ".........sst.....",
            ".........sst.....",
            "......stdsst.....",
            "...sssstdsssttt..",
            "..ssssssdsssssst.",
            ".dssssss.dssssst.",
            "..ddsss..vddssst.",
            "....dd...v.vsstt.",
            ".........v.ssssst",
            ".........b.dssss.",
            "..sstt..vssttd.st",
            ".ssssstvsssssstst",
            "dsssss.dsssssstst",
            ".ddss...dssssssss",
            "........vddd.dss.",
            "....stt.b..stts..",
            "..sssstv.ssssst..",
            ".ssssstvdssssst..",
            ".dsss.vv.dssss..t",
            ".std...v..dd...st",
            "sssst..v.stt...ss",
            ".ssssstbsssstt.ds",
            "..dssst..dssssttd",
            ".sttddv...dssssst",
            "sssstttvv..ssttst",
            "dsssssst.sssssstd",
            ".dssssstssssssst.",
            "..ddsssdsssssss..",
            "...vsssbdsssss...",
            "....dssb.ddsss...",
        ]},
    "huckleberry": {  # mid, 22 x 28: Side panels and the bottom corners, always with something behind it - its twiggy gaps are meant to show another sprite's
        "layer": "mid", "map": [
            "............st........",
            "............tt........",
            ".............h........",
            ".............b........",
            ".............b..st....",
            ".........st..b.sstt...",
            "........sstt.bsssst...",
            "........dssssb.ddsb...",
            ".........dds.h....b.st",
            "......st....b..bbb.sst",
            "..st.sstt...b.b.stssss",
            ".ssttdssss..bb.symtdds",
            ".dssssdds...b.ssyyt...",
            ".sdds.......b..dds....",
            "ssstt.......h..stt....",
            "dsssssb....b..ssstt...",
            ".ddss..b...bymsssst...",
            ".....sttb..byyddss....",
            "....sssymb.b..........",
            "....dssyysbbstt.......",
            ".....ddss.hssstt......",
            "....stt..bssssst......",
            "...ssstt.b.ddss.......",
            "...dsssssb..stt.......",
            "....ddss.b.ssstt......",
            ".........bssssst......",
            ".........h.ddss.......",
            ".........b............",
        ]},
    "alder_sapling": {  # back, 20 x 37: The tallest thing in the shrub set and the only one that reads as a small tree, so it belongs in the BACK of the side pa
        "layer": "back", "map": [
            "............stt.....",
            ".......ssttssstst...",
            "......sssstsssts....",
            ".....ddss.ddssst....",
            "........sttsdssst...",
            "......sssstss.dd....",
            ".....ssdssddn.......",
            "....ssss...vv.......",
            "...sddstv..vn...stt.",
            "...stt...vnvn.sssst.",
            "..ssst.....nndsssst.",
            "..dd.......vsssts...",
            "...stt.....vvsssstt.",
            "..ssst....vn.dsssst.",
            "..ddtt....vnnv.dstt.",
            ".ssssst...vn..sssst.",
            "dssssst...vn..dds...",
            ".ddstt....vn........",
            ".sssstst..vv........",
            ".dds.ssvn.vn....stt.",
            ".........nvn..sssst.",
            ".......st.vn.dsssst.",
            ".....sss.vn..sdst...",
            "....stttnvn.ssssst..",
            "..sssststnvsssdssst.",
            "..dds.sstvndds..dstt",
            ".....sss.vv.....ssst",
            ".....dd..vn.....dd..",
            "...stt...vn..stt....",
            ".sssstst.vnnsssstt..",
            ".dds.sstvnn.dsssst..",
            ".sttssstnn...ddsst..",
            "ssstsssttn.....ss...",
            "ddsssssstn..........",
            "...ddssdbn..........",
            ".......dbn..........",
            ".......dbn..........",
        ]},
    "filbert_catkins": {  # back, 21 x 34: Back of the side panels, paired with the alder but never adjacent to it - two brown-trunked small trees side by side rea
        "layer": "back", "map": [
            ".....sstt............",
            "....sssstt..db.......",
            "...ssssssst.dh.......",
            "..dssssssst.dbs.tt...",
            "...dsssssss.dsssstt..",
            "....ddssss..sssssss..",
            ".....ddssb.dssssssst.",
            "..........b.dssssss..",
            "...........bddd.sst..",
            "............dbdsssstt",
            "...sstt....db.dssssst",
            "..sssstt...dbbbdsssss",
            ".ssssssst..db...ddhm.",
            "dssssssst..bb.....hh.",
            ".dsssssss..db.sstthm.",
            "..ddssss...dbssssthh.",
            "...ddss....dsssssshm.",
            "...bbbb....dsssssssh.",
            "..hm...b..dbdsssssss.",
            "..hh....b.db.ddssss..",
            "..hmt....bdb.bddss...",
            ".shhstt...dbb...hm...",
            "dshmsst...db....hh...",
            ".dshsss...bb....hm...",
            "..ddss....db..sshh...",
            ".......sstb..ssshmt..",
            "......ssssttdssssht..",
            ".....dssssst.dsssss..",
            "......dsssss..ddss...",
            ".......ddss..........",
            ".........db..........",
            ".........db..........",
            ".........dh..........",
            ".........db..........",
        ]},
    "swordfern_crown": {  # mid, 34 x 35: The biggest sprite in the set and the panel's anchor: three fronds from one crown, roughly four times the mass of the ex
        "layer": "mid", "map": [
            "........................ss........",
            ".......................ttt........",
            "....................ssttdtt.......",
            "....................dttdsdtt......",
            "...................sstdsssdt......",
            "...................dtdsss..d......",
            "..................sstsst......s.ss",
            "..................dtdsss...s.ttttd",
            ".................s.tsst....tttdddt",
            ".................dtdssss.stdddsssd",
            ".................dtsss.dttd.ssss..",
            "s.t.t............dtsssttddst......",
            "tttts.t........ssdtsssstssss......",
            "ddddtts........ddtdssttdsss.......",
            "ddddddtt.t.....sstsssstsss........",
            ".....ddt.s.t...ddtssstdst.........",
            "......sttsss..ssstsssssss.........",
            "......dddtss..ddstsstsst..........",
            ".......sstt.stsstdssssss..........",
            ".......dddtsssdstssstsss..........",
            ".........ddtsttstssssss...........",
            ".........sstsssstssssss...........",
            ".........ddtssdstsssstt...........",
            "..........sdtsdstssssss...........",
            "..........sstsssssssst............",
            "..........dddtsstsssss............",
            "...........ddtssssssst............",
            "..........ssstssstssss............",
            "..........ddstssssssss............",
            "...........ssdtssdsss.............",
            "...........ddststs................",
            ".............sttt.................",
            "..............ttt.................",
            "..............ssst................",
            "..............sss.................",
        ]},
    "swordfern_frond": {  # front, 20 x 26: One arching frond, about half again the existing one
        "layer": "front", "map": [
            "..............s.ss..",
            "............s.tttt..",
            "........sss.ttdddtt.",
            "........ddttddsssddt",
            ".......ssttdtss..s.d",
            "......sdtddss.......",
            "......dttsst........",
            ".....sstdsss........",
            ".....dtdsss.........",
            "....sstsst..........",
            "...sdtdsss..........",
            "...dstssss..........",
            "...dtdsss...........",
            ".ss.tssss...........",
            ".ddstsss............",
            ".sstdsss............",
            ".dstsss.............",
            ".dstss.st...........",
            ".ddtsssss...........",
            "ssstssss............",
            "ddtdssss............",
            ".stssss.............",
            "..ts................",
            "..t.................",
            "..t.................",
            "..t.................",
        ]},
    "bracken_frond": {  # back, 27 x 27: Held flat and twice-divided, so it fills DIAGONALLY where everything else in the set fills vertically
        "layer": "back", "map": [
            ".....................ttsst.",
            "..................ttss..sts",
            "..............st.ss.stsss..",
            "..............stsstss..ss..",
            "...........ttss.ss.sttttt..",
            "..........ss.stsststddddd..",
            "..........stss.ss.td...d...",
            ".......stss.stssstdd.......",
            ".......ststssttttd.........",
            "......ssss.stdddd..........",
            "......stststd.ss...........",
            ".....ssss.tds.dd...........",
            ".....ststtds...............",
            "....ss.tddss...............",
            "....sttds.d................",
            "...sstds...................",
            "...stdss...................",
            "...tdss....................",
            "...dsdd....................",
            "..sst......................",
            "..ss.......................",
            ".ss........................",
            ".sd........................",
            ".ds........................",
            ".ds........................",
            ".dt........................",
            "ds.........................",
        ]},
    "bramble_arch": {  # front, 34 x 20: A cane that arches over other sprites instead of standing among them, so it is the set's only true FOREGROUND accent
        "layer": "front", "map": [
            "............bbhbbb................",
            "...........bbbbbbbb...............",
            "..........bb..t...sstbbhbb........",
            ".........bb......ssssttbbbb.......",
            ".........b...sttdssssst.sttb......",
            ".......sst..sssttdssssssssttb.....",
            "......sssstssssst.ddymssssstbb....",
            ".....dssssstddss....yy.ddss..bb...",
            ".....bdsssss...............sstbb..",
            "....bb.ddss...............sssstth.",
            "...bb....................dssssstbb",
            "...b......................dssssstb",
            "...stt.....................ddym..b",
            "..ssstt......................yy..b",
            "..dsssss.st.................stt..b",
            "...ddss.sstt...............ssstt.b",
            "...h...sssst...............dsssss.",
            "..bb....dds.................ddss..",
            ".bbt..............................",
            "bb................................",
        ]},
    # --- deadwood
    "mossy_log": {  # mid, 36 x 13: Side panels, lower two thirds, and the two bottom corners. Redrawn 2026-09-03 - the first one was a capsule with a lighter top, which is a bun. This one is snapped open at one end, kinked in the middle, torn bare in one patch, and mossed only where moss would sit
        "layer": "mid", "map": [
            "..................g.................",
            "..................ss.g..............",
            ".................ss.ss.....sg.......",
            "......sg........vsssssg....vsg......",
            "..nb.vssg..vg.hhppbbbbbhhhhbbb......",
            "..nbbbbbbbbbbhhhhbbbbbbbbpppbphhhh..",
            ".bnbbbbbssbhppbbbbbbbbbbnnnnnbbbbbhh",
            "pnpbbbbbbsvbpbbbbbbbbbbbbbnnbbbbpppp",
            "nnnbbbbbbvbbbbbbbbbbbbbppvvvvppp.ddd",
            "npnvsbbbbbbbbbbbbppvvpp..dddd.......",
            ".nnvvppppppbbbppp.ddddd.............",
            ".pppppvvvppppv......................",
            "...ddddddddd........................",
        ]},
    "cut_stump": {  # mid, 18 x 16: Side panels' lower half and the bottom corners, sitting ON the ground line so the flared foot reads. The sawn face faces the sky but is end grain, so it stays duller and darker than the sunlit side (owner, 2026-09-03)
        "layer": "mid", "map": [
            ".....bpbbbbpb.....",
            "...pbbbpbbpbbbp...",
            "..pbbbpbppbbpbbp..",
            "..bpbbbpbbpbbpbh..",
            "..pbbppppbpppphh..",
            "..pbbbbbpbhhbhhh..",
            "..pbbpbbpbhhhhhh..",
            "..pbbpbbpbhhhhbh..",
            "..pbbpbbpbhbhhbh..",
            "..pbbpbbpbhbhhbh..",
            "..pbbpbnnbhbhhbh..",
            "..pbbpnnbbhbhhhh..",
            "..vbbpbbbbhbhhhh..",
            ".vssbbbbbbhbhhhh..",
            ".vbbbbbbbbbhhhhh..",
            "ddbbdddbbbdddbbddd",
        ]},
    "nurse_log": {  # mid, 34 x 20: The hero of this set. Redrawn 2026-09-03 to earn its name: four seedlings of four heights rooted along its back, bark sloughed in two scars, two rot hollows, and a rotted end
        "layer": "mid", "map": [
            "..................................",
            ".......g..........................",
            ".......s..........................",
            "......ssg.............g...........",
            ".......sg.............sg..........",
            ".....sssgg...........ssg..........",
            "......ssg.....g.......sg..........",
            "....vsssgg...ssg....vssgg.........",
            "......sssg...ssg..s..sssg.........",
            "....vssssgg.vsssgvsgvsssg...sg....",
            "..vssgvss..hhbbbbpbbhpbb.vg.vs....",
            "..bbbbpbbbhhhhppphhhhhhhhbbhbb....",
            ".nbbbbbbbhhbbnnnnnnbbbbbbbbbbhhh..",
            "nnpbbbbbbbbbbbnnnnbbbbbbbppbbbbbhh",
            "npbvsbbbbppbbbbbbbbbbbbbbnnnbbbbbb",
            "pnnvbbbbbbpbbbbbbbbbbpbbbbbpppvvvp",
            "nnpppppppbbbbbbbbbppvvppppp.dddd..",
            ".ppppppvvvvppppppp.dddddd.........",
            "....ddddddddddd...................",
            "..................................",
        ]},
    "mushroom_cluster": {  # front, 16 x 11: The forest floor proper: the bottom 30 px of a side panel and the two bottom corners
        "layer": "front", "map": [
            "......bbh.......",
            ".bbh.bbbhh......",
            "bbbhh.sss.......",
            ".sss..nn...bbh..",
            ".nn...nn..bbbhh.",
            ".nn.h.nn...sss..",
            ".nnbhhnn...nn...",
            ".nn.s.nn...nn...",
            ".nnnn.nn...nn...",
            "sttssssttsssttss",
            ".dddd..ddd..ddd.",
        ]},
    "red_mushroom": {  # front, 9 x 12: One per screen, and no more
        "layer": "front", "map": [
            "...yymm..",
            "..yynnym.",
            ".yyynnyym",
            "ynnyyyyym",
            ".dddddd..",
            "...nww...",
            "...nww...",
            "...nww...",
            "...nww...",
            "..nnww...",
            "..nnwww..",
            ".ddnnndd.",
        ]},
    "fallen_branch": {  # back, 25 x 11: Thrown across a gap, at the back, wherever two masses do not quite meet. Thick and snapped at one end, whippy at the other, kinked in the middle, and its four twigs are four lengths at four angles
        "layer": "back", "map": [
            ".......................hh",
            "....................hhh..",
            "..........hh......hhp....",
            ".........b.....hhhp......",
            "........h....hhpp.b......",
            "...p...hh..hhpp....hb....",
            "pbbbbbhhbnnnpb.......p...",
            "nbbbbpppppp...p..........",
            "nbppp....................",
            "pp.......................",
            ".ddd.....................",
        ]},
    "bark_litter": {  # back, 22 x 6: The mat that closes the last holes. Redrawn 2026-09-03 - flat angular chips, since the curled ones read as snails
        "layer": "back", "map": [
            "..............bhh.....",
            "..bhhh.......bbbhh....",
            ".bbbbhhh.bh.pbbbbbh...",
            "pbbbbbbhpbbh.ppppbb...",
            "pppppphbpppb..dd...bh.",
            ".dddd....dd........ppb",
        ]},
    # --- fauna
    "slug": {  # front, 11 x 5: Ground zone only - the lowest 6 px of a side panel, or the phone's bottom band, crossing a stone or the base of a fern
        "layer": "front", "map": [
            ".............m",
            "....mmmmm...m.",
            "..mmhdhhdmmm..",
            "mmhdhhhhdhhhmm",
            ".bbb.bbbbb.b..",
        ]},
    "bee": {  # front, 6 x 4: Flower zone - within 3 px of a crocus goblet or an ox-eye head, in the open, never overlapping the bloom itself
        "layer": "front", "map": [
            "..www.....",
            "...wwww...",
            ".....ccc..",
            "..mdmdhh..",
            ".mmdmdhhdm",
            ".hhdmdhhdd",
            "..hdhdhh..",
        ]},
    "butterfly_rest": {  # front, 5 x 8: Foliage zone - the outer edge of the leaf cluster, or a frond pinna, or the arbutus trunk
        "layer": "front", "map": [
            "...dd...dd...",
            ".....d.d.....",
            ".cc..d.d..cw.",
            ".cccccdccccw.",
            "dcccccdcccccw",
            "..dcccdcccw..",
            ".dccccdccccw.",
            ".dcdccdccdcw.",
            "..dcccdcccw..",
            "...dccdccw...",
            ".....ddd.....",
        ]},
    "butterfly_fly": {  # front, 9 x 7: Open air between the flower bank and the canopy, upper-mid of a panel, over a gap in the vegetation
        "layer": "front", "map": [
            ".......d...",
            "....d.d....",
            "..hh.d.hh..",
            ".phhhdhhhm.",
            ".phhhdhhhhm",
            "..phhdhhhm.",
            ".phhhdhhhm.",
            "..phhdhhh..",
            "...p..hh...",
        ]},
    "ladybird": {  # front, 7 x 5: Foliage zone - sitting on the upper surface of a leaf-cluster leaf or a frond pinna, mid to low height
        "layer": "front", "map": [
            "...ddd...",
            "..ndddd..",
            ".yyyyymm.",
            "yydydydym",
            "pyyydyyym",
            "pdyyyyydy",
            "pyyydyyyy",
            ".pdyyydy.",
            "..pyyyy..",
        ]},
    "wren": {  # front, 9 x 8: Perched: its two foot pixels must land on an arbutus branch or one of the conifer's bare limbs, upper-mid height
        "layer": "front", "map": [
            "bh.........",
            "bbh........",
            ".bbh..hhh..",
            "..bbbbnhhh.",
            "..bbbbbdhdd",
            "..bbbbbhn..",
            "...bbbhh...",
            "...bbhh....",
            "...dd.dd...",
        ]},
    "bird_far": {  # front, 9 x 4: Sky zone only - the top sixth of a tall panel or the phone's top band, above every canopy
        "layer": "front", "map": [
            "dd...............ss",
            "vvd.............dvv",
            "..vdd....dd...ddv..",
            "...vvdddddddddvv...",
            ".....vvvdddvvv.....",
            "........ddd........",
            "........vdv........",
            ".........v.........",
        ]},
    "squirrel": {  # front, 12 x 12: Trunk or stone zone - sitting on an arbutus limb, a boulder or the path edge, mid to low height
        "layer": "front", "map": [
            "...bhh......",
            "..bbh...h...",
            ".bbh..bbh...",
            "bbh...bbbbhh",
            "bbh...bbdbhh",
            "bbh....bbbhh",
            ".bbh..bbbbbh",
            "..bbh.bbbbnh",
            "...bbbbbbbnh",
            "....bbbbbnnh",
            ".....bbbnnh.",
            ".....dd.dd..",
        ]},
    "dragonfly": {  # front, 12 x 5: Open air low down, over the water band or across a gap at the bottom third of a panel, horizontal
        "layer": "front", "map": [
            "..ww............",
            "...www........ww",
            ".....www....ww..",
            ".......cc.cc....",
            "gsssssssggsgd...",
            ".......cc.cc....",
            ".....ccc....cc..",
            "...ccc........c.",
        ]},
    # --- stone-water
    "rock_boulder": {  # mid, 26 x 14: A glacial erratic, and the owner's "too perfect" answered. It is no longer a shell of concentric bands round an egg: three flat planes meet along straight arrises - a lit top, a mid right face, a shaded front - inside an eight-sided outline whose segments are all different lengths. One straight break has taken the crown's right shoulder clean off and left a narrow fresh face turned from the light, and the lichen crust is on the shaded flank only, because that is the damp one
        "layer": "mid", "map": [
            "................nn........",
            "..............nnnnnn......",
            ".............nnnnnnnn.....",
            ".........nnnnnnnnnnnnnn...",
            ".......nnnnnnnnnnnnnnnoo..",
            ".....fffffnnnnnnnooooooon.",
            "...fffffffffffoooooooooon.",
            "..fffffffffffffooooooooff.",
            ".fvvvgffffffffffooooooofff",
            "ffvvvvgfffffffffoooooooff.",
            "foovvvfffffffffffoooooff..",
            "kkkovfffffvffffffooofff...",
            "..kkkffffvkkfffkkooff.....",
            "...kkkkkkkkkkkkkkkkk......",
        ]},
    "rock_cobble": {  # mid, 17 x 10: The middle of the three, and deliberately not a scaled boulder - a scatter of the two must never rhyme. It lies flatter, its lit plane is a thin band rather than a cap, its left end is one clean fracture face where the boulder's is a knocked corner, and its lichen is a streak where the boulder's is a crust
        "layer": "mid", "map": [
            "........nnnn.....",
            ".....nnnnnnnnnn..",
            "...nnonnooooooon.",
            "..ooooooooooooon.",
            ".ffffooooooooooon",
            ".fffffffoooooooon",
            "kfffvgfffooooooo.",
            ".kffvvgfffooooo..",
            "..kkkvffkkoook...",
            "...kkkkkkkkkk....",
        ]},
    "rock_chip": {  # front, 9 x 5: The smallest, and a flake rather than a small boulder: two planes and a contact line, tipped the other way from the other two so three of them in one panel share no angle
        "layer": "front", "map": [
            "...nnn...",
            ".nnonnnn.",
            "fffooonnn",
            "kffffoon.",
            ".kkkkko..",
        ]},
    "moss_rock": {  # mid, 20 x 12: The moss is on the shaded flank because that is where moss grows, which makes it the one rock that must NOT be mirrored. It is thickest at the foot where the water sits and thins as it climbs; its upper edge is lobed, not level, and only the sunward crown of each cushion is lit, which is what keeps it from reading as a flat green half
        "layer": "mid", "map": [
            "............nnn.....",
            ".........nnnnnnnn...",
            "......nnnnnnooononn.",
            "....nnonnoooooooooon",
            "...fooooooooooooooon",
            "..ffgsogooooooooooon",
            ".fggssssfooooooooon.",
            "fsssssssgffooooooon.",
            ".sssssssssffoooooo..",
            ".ssssssssssfoookk...",
            "..sssssssssgook.....",
            "...ssssssssssk......",
        ]},
    "pebble_mat": {  # mid, 26 x 11: TILES HORIZONTALLY, 26 px pitch, left to right - a cobble is cut across the x=25 to x=0 seam on purpose so a long run has no repeat to see. The owner's "doesnt look lke anything" was a field of noise with no stone in it; this is eleven stones, no two the same size or roundness, each with its own lit cap up-right and its own shadow down-left, lying in a matrix of wet grit
        "layer": "mid", "map": [
            "...fffffffffffffffff......",
            ".fffffffffnnfffffffffffff.",
            "fffnnffffonnofffnnffffffkf",
            "ffoonnoffoooofffnnnffffnff",
            "fooooooffkkoofffkooffnnnff",
            "fkkooonnffffffffffffoonnof",
            "ffffffooffffnnnffffffkooof",
            "fffnnnfffffoonnfffffffffff",
            "ffooonfffffkooofffffffnnff",
            ".fkkooffffffffffffofffoo..",
            ".....ffffffffffffooff.....",
        ]},
    "stream_edge": {  # back, 18 x 20: TILES VERTICALLY, 20 px pitch, top to bottom. Water, then the wet line, then the sand margin, then the bank's gravel. The margin is what the owner asked for - "a small amount of sand bordering and blending two parts" - so its width changes row by row, grains are carried out into the water and water lies in the sand, and no edge in it is a straight seam between two materials
        "layer": "back", "map": [
            "cccccvkoooffffffff",
            "cwwwcvkonnofffonnf",
            "cccccockonnfffooof",
            "ccccccckoofffkffff",
            "ccccvkooocffffffff",
            "ccwwvkonnnoffffonn",
            "cccccckonoofffffoo",
            "cccccccckoooffkfff",
            "cccccccvkoofffffff",
            "ccwwwcvkonnffoonnn",
            "cccccvkonnnfffooof",
            "ccccckoooocfffffff",
            "cccwokoooofffffffk",
            "cccccvkonnffffffff",
            "ccccccvkonnffffonf",
            "cccccccckoofffooof",
            "cwwwccckcoofffffff",
            "cccccvkonooffkffff",
            "ccwwwvkonnnfffffon",
            "cccccckooooffffkff",
        ]},
    "puddle": {  # back, 20 x 7: Flat, because a puddle is flat: the far rim holds the bank's reflection, the near rim the bank's own darkness, and the sky lies in it in three broken streaks of three lengths on three rows. Two stones stand out of it, on one side only
        "layer": "back", "map": [
            "......vvvvvvvv......",
            "...vvccccvccccccvn..",
            ".vcccwwwwwccccccccn.",
            "kcconccccccccwwwccck",
            ".kkkcccwwcconcccckk.",
            "....kkkkcccccckkk...",
            "........kkkkkk......",
        ]},
    "earth_bank": {  # back, 40 x 14: TILES HORIZONTALLY, 40 px pitch, left to right - the crest is 5 px down at both x=0 and x=39, so copies abut with no ste
        "layer": "back", "map": [
            "........................................",
            ".......h.........bh.....................",
            ".....bbbh......h.bbh....bh.....h........",
            "..bh.bbnbh...bbbbnnbh..bbbh...bbh..h....",
            ".bbbbnnnnbh.bbbnbnnnbbbbnnb.bbbnbbbbh...",
            "bbnnbnnnnnbbbnnnnnnnnbbnnnnbbbnnnbbnbbbb",
            "bnnnnnnnnnebnnnnnnnnnnnnnnnbnnnnnnnnnbbb",
            "nnnnnnnnnnneennnnnnnnnnnnnnnnennnnnnnnnn",
            "nnnnnnnnnnnnennnnnkgknnnnnnnnnennnnnnenn",
            "nnnnkgggnnnnnnnnnnnnnnnnnnnnnnngknnnnnen",
            "eeeekkggkeeeeeeeeeeeeeeeenneeeeeeeeeeeee",
            "eeeeeeeeeeeeenneeeeeeeeekggneeeeeeeennee",
            "eeeeeeeeenneegkeeeeeeeeekkgkenneeeekgkee",
            "eeeeeeeeegkeeeeeeeeeeeeeeeeekggneeeeeeee",
        ]},
    "bared_roots": {  # mid, 22 x 10: An undercut bank: the earth has washed out and one thick root bridges the hollow, with a rootlet hanging in it and a sma
        "layer": "mid", "map": [
            ".......h..............",
            "......bbbbh...........",
            "....bbbbbbbb.h........",
            "..bbbbbeebbbbb........",
            ".bbbbee.beebbbb..bbbh.",
            "bbbee...b..ebbbbbbebb.",
            "bbe.....bb..bebbbbnebb",
            "bennn...eb..bbebbennee",
            "eeennnnnnenneeneeeennn",
            "eeeeennnnnnneeeeeeeeee",
        ]},
}

# HOW THEY STACK. The carpets go down first as a continuous field, each
# course overlapping the one above by three rows so no dark line survives
# between them, and each course's horizontal offset chosen independently so
# the flecks cannot line up into diagonals. Then the accents, each with a
# one-pixel contact shadow down and left of it - without that shadow a tuft
# in the same three values as the carpet beneath it is invisible. Then the
# shrubs, then the trees, and the flowers last.

