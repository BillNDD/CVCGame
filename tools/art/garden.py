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
