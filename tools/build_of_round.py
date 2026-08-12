# The "of" round: four ways to say a word whose letters both lie.
#
# The owner heard o->short_u, f->v on 2026-08-12 and said "iterate on this".
# This builds the arms, and the diagnosis that chose them is written down here
# so nobody has to guess why these four and not four others.
#
# WHAT THE MEASUREMENTS SAY, before any ear is spent:
#   d:short_u  speech 280 ms   - healthy, in the band the owner's top five sit in
#   d:v        speech 250 ms   - length is fine, and the length is not the problem
#
# The problem is that d:v was never heard in company. Its ledger entry in
# tools/pending-sounds/pending-sounds.json is family match-vex260-most1, round
# SND16 on 2026-08-11, verdict "perfect (owner)": the first 260 ms of the
# approved word "vex" with its formant envelope warped at the ORIGINAL pitch.
# Graded on its own, and never once placed beside another sound. Open-faults
# B11 is exactly this story: th_this and h were both graded perfect ALONE and
# turned out poor in company.
#
# READ THE LEDGER, NOT THE CSV ROW. The first version of this file blamed a
# six-semitone pitch shift, taken from tools/voice-sounds.csv's "v" row - which
# is marked superseded_by_synthesis and describes the owner's own RECORDING,
# deleted from the repository on 2026-08-11. Two rows, one sound id, and the
# wrong one turned a clip the owner had passed into a clip they had tolerated.
# The measurement below was made on the real shipped bytes and stands.
#
# WHY NOT THE OBVIOUS ARM. The tempting change is o->schwa, since "of" unstressed
# is /ev/. It is offered here as arm D because the owner asked for it, but B12
# measures d:schwa and d:short_u as THE SAME VOWEL by formant - they differ by
# stress, not quality - and d:schwa carries only 150 ms of speech against
# short_u's 280. Offering two arms a listener cannot tell apart is the round-8
# mistake, so the page says so plainly rather than letting it be discovered.
#
# THE ARMS:
#   A  what shipped        the control: short_u + the pitched synthetic
#   B  v from a real word  cut from the approved "van" clip at the model's own
#                          boundary. Real speech, no pitch shift, and SHORT -
#                          a /v/ inside a word is only 75 ms
#   C  v held              rendered from repeated phonemes, which is the only
#                          way to ask this synthesiser for a held sound, and
#                          the recipe that closed schwa, long_e and oo_book
#   D  o->schwa            the owner's third arm, with the caution stated
#
# Usage: kokoro-env/bin/python3 tools/build_of_round.py <out.html>
import base64
import csv
import io
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from phoneme_timings import timings, find            # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
MANIFEST = json.loads((PACK / "manifest.json").read_text())
SEAM2_MS = 500
FADE_MS = 10


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    if np.abs(x).max() > 2:
        x = x / 32768.0
    return x, sr


def encode(pcm, sr):
    e = lameenc.Encoder()
    e.set_bit_rate(96); e.set_in_sample_rate(sr); e.set_channels(1); e.set_quality(2)
    p16 = (np.clip(pcm, -1, 1) * 32767).astype(np.int16)
    return e.encode(p16.tobytes()) + e.flush()


def edges(x, sr):
    """lead, tail, ms by the pack's own method: 10 ms frames, -45 dB floor."""
    n = max(1, int(sr * 0.010))
    fr = [x[i:i + n] for i in range(0, max(1, len(x) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > -45.0)[0]
    total = round(len(x) / sr * 1000)
    if not len(on):
        return 0, 0, total
    lead = round(int(on.min()) * n / sr * 1000)
    end = (int(on.max()) + 1) * n / sr * 1000
    return lead, round(max(0.0, total - end)), total


def shape(x, sr, pad_lead=80, pad_tail=300):
    """Give a bare cut the pack's own padding and fades, so it is judged the
    way the pack's clips are judged and not as a raw fragment."""
    out = np.concatenate([np.zeros(int(sr * pad_lead / 1000), np.float32), x,
                          np.zeros(int(sr * pad_tail / 1000), np.float32)])
    f = int(sr * FADE_MS / 1000)
    out[:f] *= np.linspace(0, 1, f); out[-f:] *= np.linspace(1, 0, f)
    return out


def entry(raw, sr=24000):
    x, s = (raw, sr) if isinstance(raw, np.ndarray) else load(raw)
    if isinstance(raw, np.ndarray):
        mp3 = encode(x, s)
    else:
        mp3 = pathlib.Path(raw).read_bytes()
    lead, tail, ms = edges(x, s)
    return {"b64": base64.b64encode(mp3).decode(), "lead": lead, "tail": tail, "ms": ms,
            "speech": ms - lead - tail}


def pack_entry(cid):
    m = MANIFEST[cid]
    e = entry(PACK / m["file"])
    e["id"] = cid
    return e


SHIP = "--ship" in sys.argv

# --- B: the /v/ of "van", at the model's own boundary -----------------------
# Skipped when shipping: arms B and C need the synthesiser, and the winning arm
# does not. A ship must not depend on a model being installed.
rows = {} if SHIP else {r["word"]: r for r in csv.DictReader(open(REPO / "tools/voice-words.csv"))}
v_cut = v_held = None
van_sr = held_sr = 24000
v_ms = 75
if not SHIP:
    van_speed = float(rows["van"]["speed"])
    _, _, tl = timings("van", speed=van_speed)
    v_ms = find(tl, "v")["ms"]                  # 75 ms, the model's own answer
    van_x, van_sr = load(PACK / MANIFEST["w:van"]["file"])
    van_lead = MANIFEST["w:van"].get("lead", 0)
    a = int(van_sr * van_lead / 1000)
    b = a + int(van_sr * v_ms / 1000)
    v_cut = shape(van_x[a:b].copy(), van_sr)

    # --- C: a held /v/, the only way to ask this synthesiser for one --------
    # "vv" at 1.4 carries 280 ms of speech: dead centre of the 231-309 ms band
    # the owner's top five sit in, and the same length as d:short_u, which it
    # has to stand beside. Chosen by measuring six combinations, not by taste -
    # "vvvvvv" at 0.9 was the first try and ran 670 ms, twice the band.
    held_audio, held_sr, _ = timings("vv", speed=1.4, is_phonemes=True)
    hx = np.asarray(held_audio, np.float32).ravel()
    hl, ht, _ = edges(hx, held_sr)
    hx = hx[int(held_sr * hl / 1000): len(hx) - int(held_sr * ht / 1000)]
    v_held = shape(hx.copy(), held_sr)

def gain_db(x, db):
    return x * (10 ** (db / 20.0))


def soften(x, sr, cutoff_hz):
    """A gentle one-pole low-pass: takes the edge off without hollowing the
    sound out. "Rounder" is the owner's word for what a lower centroid does."""
    a = np.exp(-2.0 * np.pi * cutoff_hz / sr)
    out = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        out[i] = acc
    return out.astype(np.float32)


def fades(x, sr, ms):
    n = min(int(sr * ms / 1000), len(x) // 2)
    if n < 2:
        return x
    y = x.copy()
    y[:n] *= np.linspace(0, 1, n); y[-n:] *= np.linspace(1, 0, n)
    return y


def remake_v(db=0.0, cutoff=None, fade_ms=10):
    """The shipped v, made quieter and rounder by measured amounts."""
    x, sr = load(PACK / MANIFEST["d:v"]["file"])
    lead, tail = MANIFEST["d:v"]["lead"], MANIFEST["d:v"]["tail"]
    body = x[int(sr * lead / 1000): len(x) - int(sr * tail / 1000)].copy()
    if cutoff:
        body = soften(body, sr, cutoff)
        peak = np.abs(body).max()
        if peak > 0:
            body = body / peak * 0.668            # back to the pack's -3.5 dBFS peak
    body = gain_db(body, db)
    return shape(fades(body, sr, fade_ms), sr), sr


# --- The ship: the arm the owner chose, written into the pack ---------------
# Round 3 (2026-08-12) ended "A · the original o, the roundest v | perfect".
# That arm is d:short_u beside the round-2 arm-D v, so the only audio that
# changes is the v: quieter by 7 dB, the top rolled off at 1800 Hz, 40 ms
# fades. Both shas below are literal (rule E4) and both are checked: the SOURCE
# must still be the clip the round was built from, and the RESULT must be the
# bytes the owner actually heard. If either fails, nothing is written - a
# re-render nobody listened to is the trap this project keeps falling into.
SOURCE_V_SHA = "7a650b4bf6f4b1c45bfa68f2e50d59164cd59a03cb5856a63ec8b8d0635dda63"
APPROVED_V_SHA = "0489d6c0e1bf964389f75b35f904e629794acf708831299a092d50d10412a85e"
V_TARGETS = [PACK / "d-v.mp3", REPO / "tools" / "pending-sounds" / "s-v.mp3"]


def ship():
    import hashlib
    have = hashlib.sha256((PACK / "d-v.mp3").read_bytes()).hexdigest()
    if have == APPROVED_V_SHA:
        print("d:v is already the approved v. Nothing to do.")
        return 0
    if have != SOURCE_V_SHA:
        print(f"REFUSED: d-v.mp3 hashes {have[:12]}, and this recipe was measured\n"
              f"         against {SOURCE_V_SHA[:12]}. Re-cutting an unknown clip would\n"
              f"         produce audio nobody has heard.")
        return 2
    pcm, sr = remake_v(db=-7.0, cutoff=1800, fade_ms=40)
    mp3 = encode(pcm, sr)
    got = hashlib.sha256(mp3).hexdigest()
    if got != APPROVED_V_SHA:
        print(f"REFUSED: the recipe produced {got[:12]}, not the approved\n"
              f"         {APPROVED_V_SHA[:12]}. These are not the bytes the owner graded.")
        return 3
    for t in V_TARGETS:
        t.write_bytes(mp3)
    # Measured from the ENCODED file, not from the samples that went into it:
    # that is what tools/voice-edges.py does for every other clip, and the
    # sound-out spacing is computed from these numbers. Measuring the PCM
    # instead reads 90/310 here, because the encoder's own delay and the 40 ms
    # fades fall either side of the -45 dB floor.
    lead, tail, ms = edges(*load(V_TARGETS[0]))
    man = json.loads((PACK / "manifest.json").read_text())
    man["d:v"] = {"file": "d-v.mp3", "lead": lead, "ms": ms, "tail": tail}
    (PACK / "manifest.json").write_text(json.dumps(man, indent=1) + "\n")
    led_path = REPO / "tools" / "pending-sounds" / "pending-sounds.json"
    led = json.loads(led_path.read_text())
    led["v"] = {**led["v"], "sha256": got, "ms": ms,
                "family": "of3-quieter-rounder",
                "round": "of round 3 (2026-08-12)",
                "verdict": "perfect (owner), judged in company inside “of”",
                "how": "a buzzing v · as in van",
                "note": "The SND16 v, re-cut after the owner called it “shouting” beside its "
                        "neighbour: measured 6.2 dB louder and 400 Hz brighter than the vowel it "
                        "stands next to. Recipe, from the shipped clip's own body: gain -7 dB, "
                        "one-pole low-pass at 1800 Hz, re-peaked to -3.5 dBFS, 40 ms fades, then "
                        "the pack's 80/300 ms padding. Reproduce with "
                        "tools/build_of_round.py --ship, which refuses unless the bytes match. "
                        "Every /v/ in the bank takes this clip, not only “of”."}
    led_path.write_text(json.dumps(led, indent=1) + "\n")
    print(f"shipped d:v  {got[:12]}  {ms} ms file, {ms - lead - tail} ms of speech "
          f"(lead {lead}, tail {tail})")
    print("wrote: " + ", ".join(str(t.relative_to(REPO)) for t in V_TARGETS)
          + ", app/public/voice/manifest.json, tools/pending-sounds/pending-sounds.json")
    return 0


if SHIP:
    sys.exit(ship())


ROUND2 = [
    ("A", "quieter", "d:schwa + v at −4 dB",
     "The vowel is settled — you chose schwa. This is the same v, simply turned down 4 dB.",
     -4.0, None, 10),
    ("B", "quieter still", "d:schwa + v at −6 dB",
     "Down 6 dB, which is the measured gap: the shipped v sits <b>6.2 dB louder</b> than the "
     "schwa beside it. This makes the two sounds the same loudness.",
     -6.0, None, 10),
    ("C", "quieter and rounder", "d:schwa + v at −6 dB, softened",
     "The same 6 dB, plus the brightness taken off. The v's energy sits at 1817 Hz against "
     "schwa's 1413 — measurably harsher. This rolls the top off so the two match.",
     -6.0, 2600, 20),
    ("D", "roundest", "d:schwa + v at −7 dB, softened more, long fades",
     "The furthest of the four: quieter again, more of the top rolled off, and 40 ms fades "
     "at each end so the sound arrives and leaves gently rather than switching on.",
     -7.0, 1800, 40),
]

ARMS_R1 = [
    ("A", "what ships today", "d:short_u + d:v",
     "The control. d:v is the first 260 ms of your approved “vex”, formant-warped at its "
     "own pitch, graded <i>perfect</i> ALONE in round SND16 and never heard beside another "
     "sound since. This is what you said iterate on.", ["d:short_u", "V_CURRENT"]),
    ("B", "the v of a real word", "d:short_u + v cut from “van”",
     f"Cut from your approved “van” clip at the model's own boundary — {int(v_ms)} ms, which "
     "is all a /v/ actually is inside a word. Real speech, no pitch shift, no formant bend. "
     "It will sound <b>short</b> beside its neighbours; that is the honest length.", ["d:short_u", "V_VAN"]),
    ("C", "a held v", "d:short_u + v held",
     "Rendered from repeated phonemes, which is the only way to ask this synthesiser for a "
     "held sound — and the recipe that closed schwa, long_e and oo_book. Tuned to <b>280 ms</b> "
     "of speech: the centre of the band your top five sit in, and the same length as the "
     "short_u it stands beside. Real voice, stretched by the model rather than by a tool.", ["d:short_u", "V_HELD"]),
    ("D", "o says schwa instead", "d:schwa + d:v",
     "Your third arm. <b>A caution, stated rather than discovered:</b> schwa and short_u are "
     "measured as the SAME vowel — they differ by stress, not quality — and schwa carries "
     "150 ms of speech against short_u's 280. If A and D sound identical to you, that is the "
     "measurement showing up, not your ears.", ["d:schwa", "V_CURRENT"]),
]

DIAG1 = """<div class="diag"><b>The diagnosis.</b> Both sounds are the right LENGTH — short_u carries
280&nbsp;ms of speech, v carries 250, and your best sounds sit at 231–309. The problem is that
<code>d:v</code> was accepted <b>alone</b> in round SND16 and never once heard next to another
sound.</div>"""

DIAG2 = """<div class="diag"><b>Round 2, and your words chose the arms.</b> You picked D — so the
vowel is settled: <b>o says schwa</b>. The only complaint left was that the v “sounds like it
is shouting… needs more rounding and quieter”, and that turns out to be measurable rather
than a matter of taste.<br><br>
The shipped v sits <b>6.2&nbsp;dB louder</b> than the schwa it stands beside (−16.6 against
−22.8), and its energy sits at <b>1817&nbsp;Hz</b> against schwa's 1413 — louder and brighter,
which is what shouting is. It was graded <b>perfect</b> in round SND16 — but alone, never
beside the sound it now has to stand next to.<br><br>
So these four are a gradient of exactly what you asked for — quieter, then rounder — with the
measured gap as the middle of the range rather than a guess. Nothing else changes.</div>"""

DIAG3 = """<div class="diag"><b>Almost done.</b> You said of round 2: “the v sound is now
perfect, I just want to bring back the o sound from the original rounds, together they will be
perfect.”<br><br>
So the v is settled — arm D's, at −7&nbsp;dB with the top rolled off and 40&nbsp;ms fades — and
the only thing left is which vowel stands beside it. <b>A</b> is the swap you asked for.
<b>B</b> is round 2's arm D exactly as you heard it, unchanged, so you can check that the swap
is the one you meant rather than one I read into your words. The v clip is byte-identical in
both; only the vowel differs.</div>"""

ROUND3 = [
    ("A", "the original o, the roundest v", "d:short_u + v at −7 dB, softened, long fades",
     "What you asked for: the v from round 2 arm D, which you called perfect, put back with "
     "the <b>o sound from the original round</b> — d:short_u, the vowel “of” was first "
     "offered with.", "d:short_u"),
    ("B", "the same v, with schwa", "d:schwa + the same v",
     "Round 2's arm D exactly as you heard it, unchanged, so you can be sure the swap above "
     "is the one you meant and not one I read into it. The v is byte-identical between these "
     "two — only the vowel differs.", "d:schwa"),
]

ROUND = 3 if "--round3" in sys.argv else (2 if "--round2" in sys.argv else 1)
if ROUND == 3:
    ARMS = [(k, n, r, note, [vowel, "V_FINAL"]) for k, n, r, note, vowel in ROUND3]
elif ROUND == 2:
    ARMS = []
    for key, name, recipe, note, db, cut, fm in ROUND2:
        ARMS.append((key, name, recipe, note, ["d:schwa", "V_" + key]))
else:
    ARMS = ARMS_R1

clips = {"V_CURRENT": pack_entry("d:v"), "V_VAN": entry(v_cut, van_sr), "V_HELD": entry(v_held, held_sr)}
if ROUND == 2:
    for key, _, _, _, db, cut, fm in ROUND2:
        pcm, sr = remake_v(db=db, cutoff=cut, fade_ms=fm)
        clips["V_" + key] = entry(pcm, sr)
if ROUND == 3:
    # The winning v, owner-graded perfect on 2026-08-12: round 2 arm D. 
    pcm, sr = remake_v(db=-7.0, cutoff=1800, fade_ms=40)
    clips["V_FINAL"] = entry(pcm, sr)
for cid in ["d:short_u", "d:schwa", "s:pronounced", "w:of"]:
    clips[cid] = pack_entry(cid) if cid in MANIFEST else None
if clips["w:of"] is None:
    e = entry(REPO / "tools/pending-words/w-of.mp3"); e["id"] = "w:of"; clips["w:of"] = e

data = []
for key, name, recipe, note, sounds in ARMS:
    plan = ["w:of", "s:pronounced"] + sounds + ["w:of"]
    data.append({"key": key, "name": name, "recipe": recipe, "note": note,
                 "plan": [clips[p] for p in plan]})

page = (REPO / "tools" / "_of_page.html")
html = """<!doctype html><meta charset="utf-8">
<title>“of” — four ways</title>
<style>
 :root{--ink:#17356b;--ink2:#4a5f85;--line:#dfe6f3;--chip:#eef3fb;--ok:#2e9e5b;--amber:#e2a32b}
 body{font:16px/1.55 ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
   max-width:800px;margin:0 auto;padding:26px 18px 100px;background:#fff}
 h1{font-size:26px;margin:0 0 4px} .sub{color:var(--ink2);margin:0 0 8px}
 .diag{background:var(--chip);border-radius:12px;padding:14px 16px;margin:16px 0 24px;font-size:14.5px}
 .card{border:1px solid var(--line);border-radius:14px;padding:17px;margin:15px 0}
 .arm{font-size:19px;font-weight:800;margin:0 0 2px}
 .rec{font-size:13.5px;color:var(--ink2);margin:0 0 9px;font-family:ui-monospace,Menlo,monospace}
 .note{font-size:14.5px;margin:0 0 12px}
 .tiles{display:flex;gap:6px;margin:0 0 12px}
 .tile{background:#ffd76a;border-radius:12px;padding:6px 15px;font-size:20px;font-weight:700;
   box-shadow:0 1px 3px rgba(23,53,107,.18);text-align:center}
 .tile small{display:block;font-size:11px;font-weight:700;color:#7a6320;letter-spacing:.06em}
 button{font:inherit;font-weight:800;border:0;border-radius:999px;background:var(--ink);color:#fff;
   padding:12px 20px;min-height:48px;cursor:pointer}
 .verdicts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
 .v{font-size:14px;font-weight:800;border:0;border-radius:999px;padding:9px 14px;min-height:44px;
   cursor:pointer;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .v[aria-pressed="true"]{background:var(--ok);color:#fff;box-shadow:none}
 .bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);padding:13px 0 15px;
   margin-top:26px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
 textarea{width:100%;min-height:120px;font:13px/1.5 ui-monospace,Menlo,monospace;
   border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
 .ms{font-size:12.5px;color:var(--ink2);margin-top:7px}
</style>
<h1>“of” — HEADLINE</h1>
<p class="sub">You said <b>iterate on this</b>. Here is what the measurements found and the
four arms it chose. Same spacing the game uses.</p>
DIAGBLOCK
<div id="arms"></div>
<script>
const ARMS = ARMS_JSON, SEAM = SEAM_MS;
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)).buffer;
const cache = new Map();
async function buf(e,k){ if(!cache.has(k)) cache.set(k, await ctx.decodeAudioData(bytes(e.b64))); return cache.get(k); }
async function play(plan, tag){
  await ctx.resume();
  const bs = await Promise.all(plan.map((e,i)=>buf(e, tag+":"+i)));
  let at = ctx.currentTime + 0.05;
  plan.forEach((e,i)=>{
    const s = ctx.createBufferSource(); s.buffer = bs[i]; s.connect(ctx.destination); s.start(at);
    at += bs[i].duration;
    if (i < plan.length-1) at += SEAM/1000 - (e.tail + plan[i+1].lead)/1000;
  });
}
const answers = {};
document.getElementById("arms").innerHTML = ARMS.map((a,i)=>`
 <div class="card">
  <p class="arm">${a.key} · ${a.name}</p>
  <p class="rec">${a.recipe}</p>
  <div class="tiles"><div class="tile">o<small>${a.plan[2].id==="d:schwa"?"uh":"u"}</small></div><div class="tile">f<small>v</small></div></div>
  <p class="note">${a.note}</p>
  <button data-p="${i}">▶ play the whole reveal</button>
  <p class="ms">the v in this arm: ${a.plan[3].speech} ms of speech</p>
  <div class="verdicts" data-key="${a.key} · ${a.name}">
    ${["perfect","good","iterate on this","no good option"].map(v=>`<button class="v" data-v="${v}" aria-pressed="false">${v}</button>`).join("")}
  </div>
 </div>`).join("");
document.body.insertAdjacentHTML("beforeend", `<div class="bar">
  <button id="copy">📋 copy all answers</button><span id="count"></span></div>
  <textarea id="out" readonly></textarea>`);
function render(){
  const NL = String.fromCharCode(10);
  const lines = Object.keys(answers).map(k=>k+" | "+answers[k]);
  const missing = ARMS.map(a=>a.key+" · "+a.name).filter(k=>!answers[k]);
  let t = "OF ROUND" + NL + NL + (lines.join(NL) || "(nothing yet)");
  if (missing.length) t += NL + NL + "NOT ANSWERED ("+missing.length+"):" + NL + missing.join(NL);
  document.getElementById("out").value = t;
  document.getElementById("count").textContent = Object.keys(answers).length+" of "+ARMS.length+" answered";
}
render();
document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.p!==undefined) return play(ARMS[+b.dataset.p].plan, b.dataset.p);
  if (b.classList.contains("v")) {
    const row=b.closest(".verdicts"), k=row.dataset.key, on=b.getAttribute("aria-pressed")==="true";
    row.querySelectorAll(".v").forEach(x=>x.setAttribute("aria-pressed","false"));
    if(on) delete answers[k]; else { b.setAttribute("aria-pressed","true"); answers[k]=b.dataset.v; }
    return render();
  }
  if (b.id==="copy"){ const t=document.getElementById("out"); t.select();
    navigator.clipboard.writeText(t.value).then(()=>{b.textContent="✓ copied";
      setTimeout(()=>b.textContent="📋 copy all answers",1600);},()=>{}); }
});
</script>
"""
for arm in data:
    for e in arm["plan"]:
        e.setdefault("id", "cut")
out = pathlib.Path(sys.argv[1])
out.write_text(html.replace("ARMS_JSON", json.dumps(data)).replace("SEAM_MS", str(SEAM2_MS))
           .replace("HEADLINE", {1: "four ways", 2: "rounder and quieter", 3: "the last swap"}[ROUND])
           .replace("DIAGBLOCK", {1: DIAG1, 2: DIAG2, 3: DIAG3}[ROUND]))
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
for arm in data:
    print(f"  {arm['key']}  {arm['name']:22} v speech {arm['plan'][3]['speech']:4} ms")
