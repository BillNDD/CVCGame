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


def island(rows):
    """Nothing detached. The owner found the first frond's tip floating and
    asked that "no one piece is disconnected from the whole"; this is that,
    made checkable."""
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
        for q in ((x+1,y),(x-1,y),(x,y+1),(x,y-1),(x+1,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1)):
            if q in on and q not in seen:
                stack.append(q)
    return len(on) - len(seen)


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
    "arbutus_young": {  # 14 x 26: A sapling for a side panel's mid height, or the tablet/desktop panel below the hero, where a bare stretch of gardenShade needs something small and ver
        "map": [
            ".....sstt.....",
            "....ssstt.....",
            "..sssssstttt..",
            ".sssssssssttt.",
            ".ssss.ssssstt.",
            "..ssssssssttt.",
            ".ssssssssstt..",
            "...sssssttt...",
            "...ssssystt...",
            "....dsssst....",
            ".....sstt.....",
            ".....dpmt.....",
            "......pmt.....",
            "......pm......",
            "......pm......",
            "......pm......",
            "......pm......",
            ".....phm......",
            ".....phm......",
            ".....phm......",
            ".....phm......",
            "....bphm......",
            "....bphm......",
            "....sbhm......",
            "...ssbhm......",
            "..dssbhhm.....",
        ]},
    "arbutus_bluff": {  # 34 x 50: The hero for a tablet or desktop side panel (97 and 160 px wide), standing on the ground line at the panel's foot; at 34 x 50 it is one pixel shorter 
        "map": [
            ".................stt..............",
            "................ssstt.............",
            "...............ssssstt............",
            "...............ssssssstt..........",
            "..............ssssssstt...........",
            "..............ssssssssstt.........",
            ".............sssssssssstt.........",
            "............ssssssssssstt.........",
            "............ssssss.sssstt.........",
            "...........ssssssssssysstt........",
            "...........ssssssssssssttt........",
            "............sssysssssssstt........",
            "......st....sssssssssstt....st....",
            ".....ssst...sssdssssssstt...sst...",
            "....sssstt...ssssssssssstt.ssstt..",
            "....ssssssst..sssssssssst..sssstt.",
            "...sssssssssssssssssssst..ssssstt.",
            "...sssssytt....sssspmtt...sssssttt",
            "..sssssssstt.......pm....ssssssytt",
            "..ssssssssstt......pm...sssssssstt",
            ".ssssssssssst......pm...ssssssstt.",
            ".sssssssssstt.....pm....ssssssstt.",
            ".ssphmssssstt.....pm.....dsssssst.",
            "dsssphmsssyst.....pm......sspmstt.",
            "ssssphmsssst......pm.......spmtt..",
            ".ssssphmsstt.....phm.......phm....",
            ".sdssbphmst......phm.......phm....",
            "..sssbphmt.......phm.......phm....",
            "......bphm.......phm......phm.....",
            "...sstbphm.......phm......phm.....",
            "..sssstbphm......phm.....phm......",
            ".ssssstbphm.....sbhm.....phm......",
            ".sssst..bphm.....sbhm...phm.......",
            "..dst...bphm.....sbhm...phm.......",
            ".........bphm....sbhm..phm........",
            ".........bphm.....sbhm.phm........",
            "..........bphm.....bbphm..........",
            "..........bbhm.....bbphm..........",
            "...........bbhm....bbphm..........",
            "...........sbhm....bbbhm..........",
            "............sbhm...sbbhm..........",
            "............sbhm..sbbhm...........",
            ".............sbhm.sbbhm...........",
            ".............sbhm.ssbhm...........",
            ".............sssbbbbhm............",
            ".............sssbhbbbm............",
            "............ssssbbbbhm............",
            "............sssshbbbbhm...........",
            "...........dssssbbbbbhm...........",
            "...........dsssshbbbbhm...........",
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
            "...........bdbbbhhb....dbhbbbbbddb..........",
            ".............dbbbbbh...bbbbbbb...b..........",
            "..............bddbbbhhbbbbbbb...b.b.........",
            ".................dbbbbbbbbb....bbb..........",
            "..................dbbbbbbb....bbb...........",
            "...................dbbbbbh...bbbb...........",
            "....................bbbbbbhhbbbb............",
            "...................bbbbbbbbbbb..............",
            "...................dbbbb.bddb...............",
            "...................dbbbh....................",
            "...................dbbbh....................",
            "...................bbbbh....................",
            "..................bbdddbb...................",
        ]},
    "garry-veteran": {  # 40 x 44: The one with a story in it, so it wants to be seen: the bottom of a tablet or desktop side panel, where a child's eye rests between words, or a phone'
        "map": [
            ".................ttttttt................",
            "................dssss..dt...............",
            "................ddsst..tt...............",
            "...............dddssstsssttt............",
            "...............dsddddsssssstt...........",
            "...............ddsssdsdssssst...........",
            "................dddsssddsssst...........",
            "..............ttt.dddssddds..ttt........",
            "............tssstttdsssssst..ssstt......",
            ".........ttdsssssstddsssssttssssst......",
            "........dssddssssstddssssssddsssst......",
            ".....t..sssddsssssstdddssssstdds........",
            "....dstddsssdddsbss...dddssss..t........",
            "....dssddssssddddt.b..dbdddst..tt.......",
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
            "..............bddbhbbh..................",
            "..............bdddbbbh..................",
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
    "coast fir": {  # 20 x 60: The tablet and desktop side panels, standing full height where a 60 px tree has room - one per panel, set behind the shorter trees so its nodding lead
        "map": [
            "............st......",
            "............sst.....",
            "...........st.st....",
            "...........st.st....",
            "...........st.st....",
            "..........st..t.....",
            "..........st........",
            "..........st........",
            ".........sst........",
            ".........sst........",
            "........dst.........",
            ".......dssst........",
            ".......ssssst.......",
            "......dsssstt.......",
            ".....dssssss........",
            ".....ddssssst.......",
            "......ssssssst......",
            ".....dsssssstt......",
            "....sssssssss.......",
            "....ddssssssst......",
            ".....ssssssssst.....",
            "....ssssssssstt.....",
            "...dssssssssss......",
            "...ddssssssssst.....",
            ".....sssssssssst.t..",
            "....dsssssssssttbb..",
            "...dsssssssssss.....",
            "..ddssssssssssst....",
            "....sssssssssssst...",
            "...dssssssssssstt...",
            "..sssssssssssss.....",
            "..ddssssssssssst....",
            "....sssssssssssst...",
            "...ssssssssssssstt..",
            "..dsssssssssssss....",
            ".ddssssssssssssst...",
            "bbbsssssssssssssst..",
            "..dssssssssssssstt..",
            ".dssssssssssssss....",
            ".ddssssssssssssst...",
            "...sssssssssssssst..",
            "..dsssssssssssssstt.",
            ".ssssssssssssssss...",
            "ddssssssssssssssst..",
            "..sssssssssssssssstt",
            ".sssssssssssssssstbb",
            "dssssssssssssssss...",
            "ddssssssssssssssst..",
            "..sssssssssssssssst.",
            ".dsssssssssssssssstt",
            "dsssssssssssssssss..",
            "ddsssssssssssssssst.",
            "...sssssssssssss....",
            "........dbh.........",
            "........dbh.........",
            "........dbh.........",
            "........dbh.........",
            "........dbh.........",
            "........dbh.........",
            "........dbh.........",
        ]},
    "western red cedar": {  # 22 x 50: The tablet and desktop side panels, mid-panel where the fluted foot sits clear of other motifs and is not cropped - the flare is the species cue and c
        "map": [
            "..........st..........",
            ".........sst..........",
            ".........sst..........",
            ".........dsst.........",
            ".........ssst.........",
            ".........ssst.........",
            "..........sst.........",
            ".........ssstt........",
            "........ssssst........",
            ".......dssssts........",
            ".......sssssst........",
            ".......sssssstt.......",
            ".......sssss..t.......",
            "......ddsssstss.......",
            "......s..sssst........",
            "......sssssssstt......",
            ".......ssssss..t......",
            "......ddssssstss......",
            "......sssssssst.......",
            "......sssssssstt......",
            "......ssssssssstt.....",
            ".....ddsssssssss......",
            ".....sssssssssst......",
            ".....sssssssssstt.....",
            ".....ssssssssssst.....",
            "....ddsssssssssss.....",
            "....sssssssssssst.....",
            "....sssssssssssstt....",
            "....ssssssssssssst....",
            "..ddssssssssssssss....",
            "..ssssssssssssssstt...",
            "..sssssssssssssssstt..",
            "..ssssssssssssssssst..",
            ".ddsssssssssssssstss..",
            ".sssssssssssssssssst..",
            ".sssssssssssssssssstt.",
            ".ssssssssssssssssssst.",
            "ddsssssssssssssssssss.",
            "..sssssssssssssssssstt",
            "....sssssssssssssss...",
            "......ssssssssss......",
            ".........dbh..........",
            ".........dbh..........",
            "........dbhh..........",
            "........dbhh..........",
            "........dbhh..........",
            "........dbhbh.........",
            "........dbhbh.........",
            ".......dbhbbh.........",
            ".......dbhbbh.........",
        ]},
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
    "young fir": {  # 8 x 18: Scattered at the feet of the big trees - two or three per side panel and one in the top-left phone corner - to break the repeat of full-size conifers 
        "map": [
            "...st...",
            "...sst..",
            "..dsst..",
            "..dssst.",
            "...sst..",
            "..dssst.",
            ".dsssst.",
            "..dsst..",
            ".dsssst.",
            ".dssssst",
            "..dsst..",
            ".dsssst.",
            "dssssst.",
            "dsssssst",
            "..ssss..",
            "...bh...",
            "...bh...",
            "...bh...",
        ]},
    "far conifer": {  # 5 x 12: The 13-16 px top and bottom bands on phones, standing on the band's inner edge among the saw-tooth crown - it is the only conifer that fits a band who
        "map": [
            "..s..",
            "..st.",
            ".ss..",
            ".sst.",
            ".ss..",
            ".sst.",
            "sss..",
            "ssst.",
            "sss..",
            "sssst",
            "..s..",
            "..s..",
        ]},
    # --- broadleaves
    "big-leaf maple": {  # 40 x 44: The hero of a tablet or desktop side panel, low down where its 44 px of height can be afforded; on a phone it is the one motif big enough to own a who
        "map": [
            "...............ttttt......ttt...........",
            "...........t..tsssst.....tstt...........",
            "..........tttttsssst.....ssstt..........",
            "..........sdssttsssttt.ttsssstt...t.....",
            "..........ssssstsssstttssssssstttttt....",
            "....ttt.ttsssssssssssttttsssssssttsttt..",
            "...ssdttsdsssssssssssssttsssssssttsstt..",
            "...ssdddssssssssssssssssttssssssssssst..",
            ".ssssssssssssssssssssssssssssssssssst...",
            "sssssssssssssssssssssssssssssssssssstt..",
            "ssssssssssssssssssssssssssssssssssssst..",
            "sssssssssssssssssssssssssssssssssssssttt",
            "ssssssssssssssssssssssssssssssssssssssst",
            ".ssssssssssssssssssssssstttssssstttsssst",
            "...ssssssssssssssssssssssttttssssttttsst",
            "...ssssssssssssssssssssssstttssssssttsst",
            "....sssssssssssssssssssssssttsssssssttt.",
            ".....sssssssssssssssssssssssttsssssst...",
            "......ssssssssssssssssssssssststtssst...",
            ".....ssssssssssssssssssssssssssstt......",
            ".....sssssssssssssssssssssssssst........",
            ".....sssssssssssssssssssssssssst........",
            ".t....ssssssssssssssst.sssssssst........",
            "tst.......sssssssssss.tssssst.t.........",
            ".st...t....ssss...ssb..ssst......t......",
            "tst..tst...sss......b...sst.....st......",
            ".s...ts....sss......b..........tst......",
            ".s...tst....s.......b...........s.......",
            ".s....s.............b...........s.......",
            ".tttssss...........sb........sssttt.....",
            ".bbbbbbttsss.......b......ssttbbbbb.....",
            "........bbbbsss..bsbbhssssbbb...........",
            "............bbttsbbbbhbbbb..............",
            "...............tbbbbbh..................",
            "..............stbbbbdh..................",
            ".............tstsbbbdh..................",
            "..............s.ssbbbbh.................",
            "..............s.bbbbbbh.................",
            "...............bbbbbbbh.................",
            "...............bbbbbbdbh................",
            "...............ssbbbbdbh................",
            "..............bsbbbbbbbbh...............",
            ".............bbbbsbdbbbbsh..............",
            "............bssbbbbbbbbbbbh.............",
        ]},
    "red alder": {  # 20 x 40: A side panel, standing in twos and threes at different heights: it is the only tree here that is mostly trunk, so it does the job of a vertical in a 6
        "map": [
            "....................",
            ".......ttt..........",
            "...t..tsst.....ttt..",
            ".tttttsssttt.tbsstt.",
            ".sddddssssstttsssst.",
            ".sssssbsssssstssst..",
            "..sssssst...sstst...",
            ".ssssssdt...sssst...",
            ".ssssssdt...sssst...",
            "...sssssttttttsstt..",
            "....ssssssssstsssttt",
            "....ss...ssssstsssst",
            "....ss...sssssssbst.",
            "...sss...sssssssstt.",
            ".sssssss.ssssssssst.",
            ".ssssbssssssb...st..",
            "..ssssssssss........",
            "....s.sssssss.......",
            "......sssbwss.......",
            ".......ssbws........",
            ".........bw.........",
            ".........bw.........",
            ".........bnw........",
            ".........bbw........",
            ".........bww........",
            ".........bnw........",
            ".........bnw........",
            ".........bbw........",
            ".........bnw........",
            ".........bnw........",
            ".........bww........",
            ".........bnw........",
            "........bnnw........",
            "........bbbw........",
            "........bwnw........",
            "........bnnw........",
            "........bnnnw.......",
            ".......bnnnnw.......",
            ".......bnnwnnw......",
            "......bnnnnnnw......",
        ]},
    "pacific dogwood": {  # 24 x 30: The lit top-right corner or the sunny side panel, and only ONE of them anywhere in a frame - it is the brightest sprite in the set and a second copy w
        "map": [
            "..............nww.......",
            "......nww....nwwww......",
            ".....nwwww.ttcwhwwt.....",
            ".....cwhww.tttcwwnt.....",
            "......cwwntssssccstt....",
            "....btsccstbbssssst.....",
            "......sssssbbssssstnww..",
            ".......ssstbb.sst.nwwww.",
            ".nww......tbb.t...cwhww.",
            "nwwww..ttttbh.tt..tcwwn.",
            "cwhwwttsddtbhtttttsscct.",
            ".cwwnddssddbbssttssssst.",
            "s.ccsssssssbbsssttssst..",
            ".ssssssssssbb...sssnww..",
            "..sss...sssbb....tnwwww.",
            "..nww....ssbb.....cwhww.",
            ".nwwww..sssbhttt.ttcwwn.",
            ".cwhwwsssssbhssttssscc..",
            "..cwwnsssssbbsssssssstt.",
            ".ssccssssssbbsssssssst..",
            "..ssssssnwwbbsst...sst..",
            "...ssssnwwwwbss.........",
            ".......cwhwwbbss........",
            "........cwwnbh..........",
            ".........ccbbh..........",
            "...........bbh..........",
            "...........bbb..........",
            "..........bbbb..........",
            "..........bbbbb.........",
            ".........bbbbbbb........",
        ]},
    "cascara": {  # 16 x 28: The understorey filler: tucked behind and between the bigger trees in a side panel, or standing alone in a phone corner where 16 px is all the width t
        "map": [
            ".....ttttttt....",
            ".....ssssstt....",
            ".....sssssst....",
            "....tsssssttttt.",
            "....sssssssssstt",
            ".tttssssssssssst",
            "ssddsssssstssst.",
            "sssssst...stst..",
            "sssssdt...ssst..",
            ".ssssdt...ssst..",
            "..ssssttttssstt.",
            "..s...sdssst.st.",
            "......sssst.....",
            "......sssstt.t..",
            "..ssssssssstttt.",
            ".ssssssssssssst.",
            "..sssssbhsssyyt.",
            "...yyssbh...yy..",
            "...y...bh..y....",
            ".......bn.......",
            ".......bh.......",
            ".......bh.......",
            ".......bbh......",
            ".......bnh......",
            ".......bbh......",
            ".......nbh......",
            "......bbbh......",
            "......bbbbh.....",
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
    "the broken snag": {  # 14 x 50: The tablet and desktop side panels, standing behind the conifers where its 50 px of height has room; on a phone it crops into the top-left shade corne
        "map": [
            "......bw......",
            ".....dbw......",
            ".....dnw.dnw..",
            ".....dbw.dnw..",
            ".....dnw.dbw..",
            ".....dbbbbnw..",
            ".....dbbbnnw..",
            ".....dbbbnnw..",
            "....dbbbbbnw..",
            "....dbbbnnnw..",
            "....dbbbnnnw..",
            "....dbbbnnw...",
            "..nndbbbbnw...",
            ".bnddbbbbnnw..",
            "bb..dbbbnnnw..",
            "....dbbbbnnw..",
            "...dbbbbnnnw..",
            "...dbbbddnnw..",
            "...dbbdddnnw..",
            "...dbbbddnnw..",
            "...dbbbbbbbw..",
            "...dbbbbbbbwnw",
            "...dbbbbbbbwbd",
            "...dbbbbbbbw..",
            "...dbbbbbbnnw.",
            "...dbbbbbbnnw.",
            "...dbbbbbbnnw.",
            "...dbbbbbbnnw.",
            "...dbbbbbbbnw.",
            "...dbddbbbnnw.",
            "...dbddbbnnnw.",
            "..dbbbbbbnnnw.",
            "..dbbbbbbbnnw.",
            "..dbbbbbbbnnw.",
            "..dbbbdbbbbbw.",
            "..dbbbdbbbbbw.",
            "..dbbbdbbbbbw.",
            "..dbbbbbbbbnw.",
            "..dbbbbbddnnw.",
            "..dbbbbbbnnnw.",
            "..dbbbbbbnnnw.",
            ".dbbbbbbbbnnw.",
            ".dbbbbbbbbnnw.",
            ".dbbbbbbbbbbw.",
            ".dbbbbbbbbnbw.",
            ".dbbbbbbbbbbnw",
            ".dbbbbbbbbnbnw",
            "dbbbbbbbbbbnnw",
            "dbbbbbbbbbbbnw",
            "dbbbbbbbbbbnnw",
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
    "the nurse stump": {  # 26 x 30: The bottom corners of the phone frame and the foot of a side panel, sitting on the ground beside the rocks and the crocus - it is a ground motif and i
        "map": [
            "..........................",
            ".............ss...........",
            ".............s.st.........",
            ".............s..t.........",
            "...........dssss..........",
            "..........ssssss.t........",
            ".........dsssssst.........",
            "........tssssssss.........",
            "..........dsssssdt........",
            "........tsssssssss........",
            ".........ddsssssd.........",
            "......stssssssssstn.......",
            ".....dbbbddssbsssdnn......",
            "....dbbbbbddbbndnnntw.....",
            "....dbbbbbbbbbbnnnnnw.....",
            "....sbbbbbbbbbbbbbnnnw....",
            "....dbbbbbbbbbbbbbbnnw....",
            "...dbbbbdbbbbbbbbnnnnw....",
            "...sbbbbdbbbbbbnnnnnnw....",
            "...dbbbbdbbbbbbbnnnnnw....",
            "...dbbbbdbbbbbbbbbbnnnw...",
            "...dbbbbdbbbbbbbbbbbnnw...",
            "...dbbbbdbbbbbbbbbnnnnw...",
            "..dbbbbbdbbbbbbbnnnnnnw...",
            "..dbbbbbdbbbbbbbbnnnnnw...",
            "..dbbbbbbbbbbbbbbbbbnnnw..",
            ".dbbbbbbbbbbbbbbbbbnnnnw..",
            ".dbbbbbbbbbbbbbbbbnnnnnnw.",
            "dbdbbbbbbbbbbbbbbbbnndnnw.",
            "dbbbdbbbbbbbbdbbbbbbbnndnw",
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
    "the driftwood log": {  # 44 x 14: The bottom band of the phone frame, which is 13-16 px and is the only place a 14 px-tall motif is native; it lies along the shoreline below the far tr
        "map": [
            "....n..n....................................",
            ".n..nn..n...................................",
            "..bbbnnnnnnw................................",
            ".bbbbbnnnnnnwwww............................",
            ".bbbbbbnnnnnnnnnwwwwwwwwwwwwww...........nn.",
            "nnbbbbbbnnnnbbbbnnnnnnnnnnnnnnwwwwwwnnnnnnnb",
            "nbbbbbbbnnnnbbbbbbbbbbbbbbbbbbnnnnnnbbbbbbbb",
            ".bbbbbbbbnnnbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.",
            "..bbbbbbbnnnbbbbbbbbbbbbbbddddddbbbbddddd...",
            ".bbbdbbbbnnnbbbbbbbbbbbbbddddddddddd........",
            "bb.dbbbbbbnnbbddddddddddd...................",
            "....dbbbbbbbdd..............................",
            "....bb.db.dd................................",
            "....bbd.....................................",
        ]},
}



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
            "...sg.......ss..",
            "..ssssg.ss.sssg.",
            "ssssssssssssssss",
            "ssssssssssssssss",
            "ssssssssssssssss",
            "ssssssssssssssss",
        ]},
    "moss_cushions": {  # back, 12 x 5: The second carpet, at a 12 px pitch against the carpet's 16, so alternating courses only repeat every 48 px instead of 1
        "layer": "back", "map": [
            "...ss...s...",
            ".ssssg.ssg..",
            "ssssssssssss",
            "ssssssssssss",
            "ssssssssssss",
        ]},
    "grass_low": {  # mid, 7 x 5: The shortest of the three tufts
        "layer": "mid", "map": [
            "...g...",
            ".s.s.g.",
            "..ssg..",
            "..sss..",
            ".sssss.",
        ]},
    "grass_mid": {  # mid, 9 x 9: The middle tuft
        "layer": "mid", "map": [
            ".....g...",
            "...s.s...",
            "...s.s..g",
            ".s.s.s.g.",
            "..s.ss.s.",
            "..s.sss..",
            "..sssss..",
            "..sssss..",
            ".dsssss..",
        ]},
    "grass_tall": {  # front, 11 x 14: The tallest tuft, and the only ground-cover sprite that breaks the skyline of a carpet course
        "layer": "front", "map": [
            ".....g.....",
            ".....s.....",
            "..s..s.....",
            "...s.s....g",
            "...s.s...g.",
            "s..s.s...s.",
            ".s..ss..s..",
            ".s..ss..s..",
            "..s.ss.s...",
            "..s.ss.s...",
            "...ssss....",
            "...ssss....",
            "...dsss....",
            "..dsssss...",
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
            ".........ssg.",
            "..sss...ssssg",
            ".ssssg..ssd..",
            ".dsss..ssssg.",
            ".ssss.bsssg..",
            "sssg.b.sd....",
            "ssssb........",
            "dssb.........",
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
            "....st...",
            "....st...",
            "..p.s.w..",
            ".qppwpww.",
            "qqppwpww.",
            ".qqppwww.",
            "..qppww..",
            "..wwwww..",
            "...hhh...",
            "...qq....",
            "...qq....",
            "....q....",
        ]},
    "bleeding_heart": {  # front, 14 x 9: An arching raceme that hangs over the top edge of the foliage mass — place it so the arch crosses in front of a conifer 
        "layer": "front", "map": [
            "......stt.....",
            "....ss..sst...",
            "...s....s..t..",
            "..p.w..p.w.s..",
            "..qpw.qppw.p.w",
            "...qw.qppwqppw",
            "...w...qpwqppw",
            "........w..qpw",
            "............w.",
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
            "....gm......",
            "...hgghgm...",
            "..gmhgmgg...",
            "..gghgghgm..",
            "..hgmhgmgg..",
            "...gghggh...",
            "...hgmh.....",
            "....gg......",
            "....ss......",
            "..dsss.sstt.",
            ".dsss.sssstt",
            ".dss.sssstt.",
            "..dss..ssst.",
            "...ds...sst.",
        ]},
    "dandelion": {  # front, 9 x 10: The lowest courses of the panel, at the frame's inner edge where the reading area begins — its yellow is the brightest m
        "layer": "front", "map": [
            "...gmm...",
            ".gggmmmm.",
            "hgggmmmg.",
            ".hggggmm.",
            "..hhggm..",
            "...sst...",
            "....st...",
            "....st...",
            ".dsssstt.",
            ".ds.sst..",
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
            "..gm.m.",
            ".ggmmm.",
            "hgghgmm",
            ".hgggmm",
            ".hg.gm.",
            "..hgm..",
            "...st..",
            "..dst..",
            ".dsstt.",
        ]},
    "closed_bud": {  # back, 5 x 9: sown between the camas spikes in the back layer to break their rhythm, and one or two at the very top of the flower band
        "layer": "back", "map": [
            "...c.",
            "..ccc",
            ".vccc",
            "vvccc",
            ".vvcc",
            "..st.",
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
            "........st.......",
            "........tt.......",
            ".........s.......",
            ".........s.......",
            "......sttt.......",
            ".....ssstt..stt..",
            ".....dsssssssstt.",
            "......ddssssssst.",
            ".....stt.s.ddss..",
            "....sssttt.......",
            "....dsssss.stt...",
            ".....ddss.ssstt..",
            "........sssssst..",
            "..ssstt.s.ddss...",
            ".sssssttt........",
            ".dsssssst..ssttt.",
            ".ddssssss.ssssstt",
            "..ddsss.sssssssst",
            "..ssstt.s.ddsssss",
            ".sssssttt..ddsss.",
            ".dsssssst.ssttt..",
            ".ddssssssssssstt.",
            "..ddsss.ssssssst.",
            ".ssstt..sddsssss.",
            "sssssttt..ddsss..",
            "dsssssst..ssttt..",
            "ddssssss.ssssstt.",
            ".ddsst.sssssssst.",
            "...sstts.dstssss.",
            "...dssss.ssttss..",
            "....ddsssssst....",
        ]},
    "oregon_grape": {  # mid, 16 x 20: Side panels, mid-height, and the lower half of the phone corners
        "layer": "mid", "map": [
            "........h.......",
            "........b.s.t.t.",
            "........bssssttt",
            "..s.t.t.ssssssst",
            "ssssstt.bddssss.",
            "dsssssssb.d.s.s.",
            ".dsssss.h.......",
            ".s.s.d.b.s.t.t..",
            ".......bssssttt.",
            "..s.t.tssssssst.",
            "sssssttbddssss..",
            "dsssssss.d.s.s..",
            ".dsssssh........",
            ".s.s.db..s.t.t..",
            "......b.ssssttt.",
            "..s.t.tssssssst.",
            "ssssstt.dpsmss..",
            "dsssssssppppms..",
            ".dssssspppppm...",
            ".s.s.db.dd.p....",
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
            ".............sstt...",
            "...........dsssstt..",
            "...........ssssssst.",
            "..........dssssssst.",
            "...........dsssssss.",
            "...........bddssss..",
            "....s.tt...dbddss...",
            "...sssstt..db.......",
            "..sssssss..db.......",
            ".dssssssst.db.......",
            "..dssssss.bdh.......",
            "...dd.sss.db........",
            "....ssbh..db..s.tt..",
            "...sssbbt.db.sssstt.",
            "..dssssst.dbsssssss.",
            "...dsssss.ddssssssst",
            "....ddss..bbdssssss.",
            ".........bdb.dd.sss.",
            "...s.tt...db..dds...",
            "..sssstt.db....sst..",
            ".sssssss.dh...sssstt",
            "dssssssstdb..dssssst",
            ".dssssss.db...dsssss",
            "..dd.sssbdb..s.ddss.",
            "...dds...db.sssstt..",
            ".........dhsssssss..",
            ".........ddssssssst.",
            "........db.dsssbhs..",
            ".....sstdbb.dd.bbs..",
            "....sssstt...ddsb...",
            "...dssssst....sst...",
            "....dsssss...sssstt.",
            ".....ddssb..dssssst.",
            "........db...dsssss.",
            "........db....ddss..",
            "........dh..........",
            "........db..........",
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
    "mossy_log": {  # mid, 33 x 11: Side panels, lower two thirds, and the two bottom corners
        "layer": "mid", "map": [
            ".......t.....tt.....t...tt.......",
            "....sstttsssttttssttttsstttttt...",
            "..ssssttssssttssssttsssttttsttt..",
            ".dddssssssddsssssssddssssssssttt.",
            ".sssbbbbbbbbbbbbbhhhhhhhhhhhhhhh.",
            "ssssbbbbbbbssbbbbbbbbbbbbhhhhhhhh",
            "ssssbbbbbbbssbbbbbbbbbbbbbbhhhhhh",
            ".sssssbbbbbbbbbbbbbbbbbbbbbhhhhh.",
            "..ssssssssssssbbbbbbbbbbbbbbhhh..",
            "...sss..dd...ss....sss.....ss....",
            "....t.........t.....t........t...",
        ]},
    "cut_stump": {  # mid, 18 x 16: Side panels' lower half and the bottom corners, sitting ON the ground line so the flared foot reads
        "layer": "mid", "map": [
            "......sssmmm......",
            "...sbbbhhhhbmms...",
            ".sbbhhbbbbbbhhmbs.",
            ".sbhhbbhhhhbbhhms.",
            ".sbbhhbbbbbbhhbbs.",
            "...sbbbssbbbbbs...",
            "..sssbbbbsbbbhhh..",
            "..sssbbbbsbbbhhh..",
            "..sssbbbsbbbbhhh..",
            "..sssbbbbbbbbhhh..",
            "..sssbbbbbbbbhhh..",
            "..ssssbbbbsbbhhh..",
            ".ssssbbbbbbsbbhhh.",
            ".ssssbbbbbbsbbhhh.",
            "sssssbbbbbbbbbbhhh",
            "sss.sss..bbb..ss.h",
        ]},
    "nurse_log": {  # mid, 30 x 18: The hero of this set
        "layer": "mid", "map": [
            ".......t......................",
            "......sss.....................",
            "......dsst....................",
            "......sss.....................",
            ".....dssstt.........t.........",
            ".....sssss.........sss........",
            "....dssssstt.......dsst.......",
            "....sssssss........sss.....t..",
            "...dssssssstt.....dssstt..sss.",
            "...sssssssss......sssss...dsst",
            ".sttsssssssssssttsssssssttsss.",
            "sssssssssssssssssssssssstttttt",
            "sssbbbbbbbbbbbbbbhhhhhhhhhhhhh",
            "sssbbbbbbbssbbbbbbbbbbhhhhhhhh",
            "ssssbbbbbbssbbbbbbbbbbbbbhhhhh",
            ".ssssssssssssssssssssssbbbbbb.",
            "...ddddd...dddddd....ddddd....",
            "....ss........ts........ss....",
        ]},
    "bracket_fungus": {  # front, 15 x 18: Against a trunk, anywhere up a side panel
        "layer": "front", "map": [
            ".bbh...........",
            "sbbhbbhhhh.....",
            "sbbhbbbhhhhnn..",
            "sbbhbbbbhhhhnn.",
            "sbbhsssssssn...",
            "sbbhsssss......",
            "sssh...........",
            "sbbhbbhhhhh....",
            "sbbhbbbbhhhhnn.",
            "sbbhbbbbhhhhhnn",
            "sbbhssssssssn..",
            "sbbhssssss.....",
            "sssh...........",
            "sbbhhhh........",
            "sbbhbbhhnn.....",
            "sbbhbbhhhnn....",
            "sbbhssssn......",
            "ssshss.........",
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
    "cone_scatter": {  # front, 18 x 14: On top of a log's back, in the crook where a stump meets the ground, or loose on the floor
        "layer": "front", "map": [
            "........bh........",
            ".......hhhh.......",
            ".......bbbh...bh..",
            "..bh..hhhhhh.hhhh.",
            ".hhhh..sbbbh.bbbh.",
            ".bbbh.hhhhhhhhhhhh",
            "hhhhhh.sbbbh.sbbbh",
            ".sbbbh.hhhh.hhhhhh",
            "hhhhhh..sbh..sbbbh",
            ".sbbbh...b...hhhh.",
            ".hhhh...ddd...sbh.",
            "..sbh..........b..",
            "...b..........ddd.",
            "..ddd.............",
        ]},
    "fallen_branch": {  # back, 25 x 11: Thrown across a gap, at the back, wherever two masses do not quite meet - which on a 160 px panel is most of it
        "layer": "back", "map": [
            "..............h..........",
            ".............bb......hmmh",
            "............bb..hhhhhsss.",
            "............hhhhbssss....",
            ".......hhhhhbbsssb.......",
            "...hhhhbbbbbss....b......",
            "hhhbbbbbssss......sb.....",
            "bbbbbsss............s....",
            "bbbss....................",
            "sss......................",
            "ddddd....................",
        ]},
    "bark_litter": {  # back, 21 x 6: The mat that closes the last holes
        "layer": "back", "map": [
            ".bhh......bbhh.......",
            "bbpph....bbppph..tt..",
            "bbpph.sn.bbppph.sst..",
            "sssbh.snn.sssbbh.ssst",
            ".sssss.snn.ssssss.ss.",
            ".ddddd.ddd..dddddd...",
        ]},
    # --- fauna
    "slug": {  # front, 11 x 5: Ground zone only - the lowest 6 px of a side panel, or the phone's bottom band, crossing a stone or the base of a fern
        "layer": "front", "map": [
            ".......d.d.",
            ".......t.t.",
            "...sssstttt",
            "..ssssssstt",
            "....ddd....",
        ]},
    "bee": {  # front, 6 x 4: Flower zone - within 3 px of a crocus goblet or an ox-eye head, in the open, never overlapping the bloom itself
        "layer": "front", "map": [
            "..cc..",
            ".chhc.",
            "dhdhmm",
            ".dhhm.",
        ]},
    "butterfly_rest": {  # front, 5 x 8: Foliage zone - the outer edge of the leaf cluster, or a frond pinna, or the arbutus trunk
        "layer": "front", "map": [
            "..d..",
            ".cw..",
            ".ccw.",
            "cccw.",
            "cchcw",
            "cccw.",
            ".ccw.",
            "..c..",
        ]},
    "butterfly_fly": {  # front, 9 x 7: Open air between the flower bank and the canopy, upper-mid of a panel, over a gap in the vegetation
        "layer": "front", "map": [
            ".d.....d.",
            ".hhh.hhm.",
            "hhhhdhhhm",
            ".hh.d.hm.",
            ".hhhdhhm.",
            "..hhdhh..",
            "...h.h...",
        ]},
    "ladybird": {  # front, 7 x 5: Foliage zone - sitting on the upper surface of a leaf-cluster leaf or a frond pinna, mid to low height
        "layer": "front", "map": [
            "..ddd..",
            ".yyyym.",
            "yydydym",
            ".yyyyym",
            "..yyy..",
        ]},
    "wren": {  # front, 9 x 8: Perched: its two foot pixels must land on an arbutus branch or one of the conifer's bare limbs, upper-mid height
        "layer": "front", "map": [
            ".....bbh.",
            "....bbdhh",
            "...bbbbhd",
            ".bbbbbbhh",
            "bbbbbnnhh",
            ".bbbnnnh.",
            "..bnnnb..",
            "...d.d...",
        ]},
    "bird_far": {  # front, 9 x 4: Sky zone only - the top sixth of a tall panel or the phone's top band, above every canopy
        "layer": "front", "map": [
            "ss.....tt",
            ".sss.ttt.",
            "..sssst..",
            "...ss....",
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
            "...cccw.....",
            ".....ccw....",
            "sssssssttcc.",
            ".....cc.....",
            "...ccc......",
        ]},
    # --- stone-water
    "rock_boulder": {  # mid, 26 x 18: A glacial erratic
        "layer": "mid", "map": [
            "..........nnnnnnn.........",
            ".......nnngggnnnnnn.......",
            ".....nnggggggggggnnnn.....",
            "....kksggggggggggggnn.....",
            "...kkgssgggggggggggggnn...",
            "..kkgggggggggggggggggnn...",
            "..kkggggggggggggggggnn....",
            ".kkkgggggggggggggggggnn...",
            ".kkkgggggggggggggggggnn...",
            "kkkkggggggggggkggggggggn..",
            "kkkkkgggggggggkggggggggn..",
            "kkkkkkgggggggkgggggggggg..",
            ".kkkkkkggggggkgggggggggg..",
            ".kkkkkkkkgggkggggssgggg...",
            "..kkkkkkkkkgggggggggggg...",
            "...kkkkkkkkkkkgggggggg....",
            ".....kkkkkkkkkkkkggggg....",
            "........kkkkkkkkkkk.......",
        ]},
    "rock_cobble": {  # mid, 16 x 11: The middle of the three
        "layer": "mid", "map": [
            ".....nnnnnn.....",
            "...nnggggnnnn...",
            "..kggggggggnnn..",
            ".ksgsggggggggnn.",
            "kkkgggggkggggnn.",
            "kkkgggggkgggggnn",
            "kkkkgggkgggggggn",
            "kkkkkgggggggggg.",
            ".kkkkkkgggssggg.",
            "..kkkkkkkkgggg..",
            "....kkkkkkkk....",
        ]},
    "rock_chip": {  # front, 9 x 6: The smallest
        "layer": "front", "map": [
            "...nnnn..",
            ".knggnnnn",
            "kkgggggnn",
            "kksggggnn",
            ".kkkkggg.",
            "..kkkkk..",
        ]},
    "moss_rock": {  # mid, 20 x 14: The moss is on the shaded flank because that is where moss grows, which makes it the one rock that must NOT be mirrored
        "layer": "mid", "map": [
            ".......ggnnnnn......",
            ".....gggngggggnnn...",
            "...ggggnggggggggnn..",
            "..gggssggggggggggnn.",
            ".ggsssssggggggggggnn",
            "ggsssssgsgggggggggnn",
            "gvsssssssggggggggggn",
            "vvsssssssggggggggggn",
            "vvssssssssggggggggn.",
            "vvvsssssssggggggggn.",
            ".vvssssssssggggggg..",
            ".vvvvvgvvvggggggg...",
            "...vvvvvvggggggg....",
            ".....vvvgggggg......",
        ]},
    "pebble_mat": {  # mid, 24 x 9: TILES HORIZONTALLY, 24 px pitch, left to right - a cobble is cut across the x=23 to x=0 seam on purpose so a long run ha
        "layer": "mid", "map": [
            ".nnnnn...nnn...gggn..gn.",
            "kgggggnkkgggnkkggggkkggk",
            "kggggkkkkggkkkkggkkkkkkk",
            "nkkgggnkkkgnkkknnnkkkkkn",
            "gnkggggkkkggkkkgggnkkkkg",
            "kkkggkkkkkkkkkkggkkkkkkg",
            "kkggnkkkgggnkkkgnkkggnkk",
            "kkgggkkkggggkkkggkkgggkk",
            ".kgkkk.kggkkk.kkkkkgkkk.",
        ]},
    "stream_edge": {  # back, 14 x 20: TILES VERTICALLY, 20 px pitch, top to bottom - a cobble is cut across the y=19 to y=0 seam
        "layer": "back", "map": [
            "wwwwwwwvkgggkk",
            "wwwwwvvkkkkgnk",
            "wvvvwwwvkkkggk",
            "wwwwwwwvkgkkgk",
            "wwwcccwkkkkkkk",
            "wwwwwwwkkgggnk",
            "vvvwwwwvkggggk",
            "wwwwwwvvkggkkk",
            "wwwwwwwkkkkkkg",
            "wwvvvvwkkkkknn",
            "wwwwwwwvkkkkgg",
            "wccwwwwvgkkkgk",
            "wwwwwvvkkggnkk",
            "wwwwwwwkkgggkk",
            "wvvvwwwvkgkkkk",
            "wwwwwwwkkkgkkk",
            "wwwwwwwvkkkkkg",
            "wwwwvvvvkkkkkk",
            "wwwwwwvkkknnnk",
            "wwwwwwwkkkgggn",
        ]},
    "puddle": {  # back, 18 x 7: Flat, because a puddle is flat: the sky lies in it in bands and the near edge holds the bank's own darkness
        "layer": "back", "map": [
            ".....kkkknnnn.....",
            "..vvccccccccvcnn..",
            "vvcccccccvvvvvvvvv",
            "vvvvvvvvvvvccccccv",
            ".kwwwwwwwwvvwwwww.",
            "...kkwwwwwwwwkv...",
            "......kkkkkk......",
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

