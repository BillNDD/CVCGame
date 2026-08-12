# The heart-word sound-out round.
#
# WHAT THIS ROUND IS FOR, precisely. Every one of these six word clips is
# already graded "perfect" by the owner's ear; round_guard confirms it. So the
# question is NOT how the word sounds. It is:
#   1. two SOUNDS the owner has never heard - oo_moon and long_i - which exist
#      as candidates in tools/pending-sounds/ with no verdict on the ledger;
#   2. how each word BREAKS INTO TILES, and which sound each tile plays.
#
# The second question is the one that matters and the one no measurement can
# settle. Left to the general mapping these words teach: "of" says off, "to"
# says tot, "said" says s-a-i-d in four sounds. Every id resolves and every
# clip exists, so no gate objects; a child is simply taught the wrong thing.
#
# The audio is assembled the way the APP assembles it (clipPlan): the word,
# "Pronounced:", each sound in turn, then the word again - with the same
# speech-to-speech spacing, which means each clip is pulled back over the
# previous one's trailing silence and its own leading silence so that what is
# heard between two sounds is the 500 ms the owner approved on 2026-08-11.
# Anything else would be judging a rhythm the game does not play.
#
# Usage: kokoro-env/bin/python3 tools/build_heart_round.py <out.html>
import base64
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = ROOT / "app/public/voice"
PENDING_W = ROOT / "tools/pending-words"
PENDING_S = ROOT / "tools/pending-sounds"
MANIFEST = json.loads((VOICE / "manifest.json").read_text())
SEAM2_MS = 500          # the approved speech-to-speech gap

# [word, [(tile, sound-id, how it reads)], note, what is being asked]
CASES = [
    ("of", [("o", "d:short_u", "u"), ("f", "d:v", "v")],
     "Two tiles, two sounds, and both letters lie. Every sound here already ships.",
     "Does “o” saying u and “f” saying v teach this word honestly?"),
    ("to", [("t", "d:t", "t"), ("o", "d:oo_moon", "oo")],
     "Needs oo_moon, which you have never heard. It is question 1 on this page.",
     "Does “o” saying oo work here?"),
    ("do", [("d", "d:d", "d"), ("o", "d:oo_moon", "oo")],
     "The same oo_moon, in a second word.",
     "Same question, second word — does it hold?"),
    ("my", [("m", "d:m", "m"), ("y", "d:long_i", "eye")],
     "Needs long_i. That sound IS the name of the letter I, which safety rule "
     "S4 forbids the app from saying — but you ruled on 2026-08-06 that the "
     "letter-name vowels join the library as SOUNDS. This is that ruling meeting a real word.",
     "Is “y” saying eye a sound, or is it a letter name?"),
    ("you", [("y", "d:y", "y"), ("ou", "d:oo_moon", "oo")],
     "TWO tiles, not three. “ou” would become a new multi-letter unit, which is "
     "a change to safety rule S8 and needs your approval.",
     "Should “ou” be one tile?"),
    ("said", [("s", "d:s", "s"), ("ai", "d:short_e", "e"), ("d", "d:d", "d")],
     "THREE tiles, not four. “ai” would become a new multi-letter unit — another S8 change.",
     "Should “ai” be one tile, saying e?"),
]


def clip(cid):
    """(bytes, lead_ms, tail_ms, ms) for a shipped or candidate clip."""
    if cid in MANIFEST:
        m = MANIFEST[cid]
        return (VOICE / m["file"]).read_bytes(), m.get("lead", 0), m.get("tail", 0), m["ms"]
    name = cid.replace(":", "-").replace("d-", "s-", 1) if cid.startswith("d:") else cid.replace(":", "-")
    for base in (PENDING_S, PENDING_W):
        p = base / (name + ".mp3")
        if p.exists():
            # a candidate carries no measured edges; measured below from the audio
            return p.read_bytes(), None, None, None
    raise SystemExit(f"no clip for {cid}")


def measure(raw):
    """lead, tail, ms for a candidate, by the shipped pack's own method:
    10 ms frames, RMS in dB against the clip's own peak, -45 dB floor."""
    import numpy as np, av, io
    c = av.open(io.BytesIO(raw))
    s = c.streams.audio[0]
    a = np.concatenate([f.to_ndarray().ravel() for f in c.decode(s)]).astype(np.float64)
    sr = s.codec_context.sample_rate
    c.close()
    if np.abs(a).max() > 2:
        a = a / 32768.0
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > -45.0)[0]
    total = len(a) / sr * 1000
    if not len(on):
        return 0, 0, round(total)
    lead = round(int(on.min()) * n / sr * 1000)
    end = (int(on.max()) + 1) * n / sr * 1000
    return lead, round(max(0.0, total - end)), round(total)


def entry(cid):
    raw, lead, tail, ms = clip(cid)
    if lead is None:
        lead, tail, ms = measure(raw)
    return {"id": cid, "b64": base64.b64encode(raw).decode(), "lead": lead, "tail": tail, "ms": ms}


def plan_for(word, tiles):
    """The app's own reveal order, as clipPlan builds it."""
    ids = ["w:" + word, "s:pronounced"] + [sid for _, sid, _ in tiles] + ["w:" + word]
    return [entry(i) for i in ids]


data = []
for word, tiles, note, asks in CASES:
    data.append({
        "word": word,
        "tiles": [{"t": t, "reads": r, "id": s} for t, s, r in tiles],
        "note": note, "asks": asks,
        "plan": plan_for(word, tiles),
    })
sounds = [{"id": i, "label": lab, "asks": q, **entry(i)} for i, lab, q in [
    ("d:oo_moon", "oo — as in moon, food, boot", "Is this the oo of moon?"),
    ("d:long_i", "eye — as in time, my", "Is this a SOUND you are happy for the game to say?"),
]]

page = pathlib.Path(sys.argv[1])
page.write_text("""<!doctype html><meta charset="utf-8">
<title>Heart words: the sound-out round</title>
<style>
 :root{--ink:#17356b;--line:#dfe6f3;--chip:#eef3fb;--ok:#2e9e5b;--amber:#e2a32b}
 body{font:16px/1.55 ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
   max-width:760px;margin:0 auto;padding:24px 18px 80px;background:#fff}
 h1{font-size:24px;margin:0 0 4px} h2{font-size:17px;margin:34px 0 6px}
 .sub{color:#5a6b8c;margin:0 0 20px}
 .card{border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}
 .word{font-size:40px;font-weight:700;letter-spacing:.02em}
 .tiles{display:flex;gap:6px;margin:10px 0 4px;flex-wrap:wrap}
 .tile{background:#ffd76a;border-radius:12px;padding:6px 14px;font-size:20px;font-weight:700;
   box-shadow:0 1px 3px rgba(23,53,107,.18);text-align:center}
 .tile small{display:block;font-size:11px;font-weight:700;color:#7a6320;letter-spacing:.06em}
 .note{background:var(--chip);border-radius:10px;padding:10px 12px;font-size:14px;margin:10px 0}
 .asks{font-weight:700;margin:8px 0 12px}
 button{font:inherit;font-weight:700;border:0;border-radius:999px;background:var(--ink);color:#fff;
   padding:11px 20px;cursor:pointer;min-height:44px}
 button.ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
 code{background:var(--chip);border-radius:5px;padding:1px 5px;font-size:13px}
 .warn{border-left:4px solid var(--amber);padding-left:12px}
</style>
<h1>Heart words: the sound-out round</h1>
<p class="sub">Every word clip here you have already graded <b>perfect</b>. This round is only
about <b>two sounds you have never heard</b> and <b>how each word breaks into tiles</b>.
Play each one and say yes or no. The spacing is the app's own 500&nbsp;ms.</p>

<h2>1. Two sounds, alone</h2>
<div id="sounds"></div>

<h2>2. The six sound-outs, as a child would hear them</h2>
<div id="words"></div>

<script>
const SOUNDS = SOUNDS_JSON, WORDS = WORDS_JSON, SEAM = SEAM_MS;
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const cache = new Map();
const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)).buffer;
async function buf(e){ if(!cache.has(e.id+e.b64.length)) cache.set(e.id+e.b64.length, await ctx.decodeAudioData(bytes(e.b64))); return cache.get(e.id+e.b64.length); }
async function play(plan){
  await ctx.resume();
  const bufs = await Promise.all(plan.map(buf));
  let at = ctx.currentTime + 0.05;
  plan.forEach((e,i)=>{
    const s = ctx.createBufferSource(); s.buffer = bufs[i]; s.connect(ctx.destination); s.start(at);
    at += bufs[i].duration;
    if (i < plan.length-1) at += SEAM/1000 - (e.tail + plan[i+1].lead)/1000;
  });
}
document.getElementById("sounds").innerHTML = SOUNDS.map((s,i)=>`
 <div class="card"><div class="row"><button data-s="${i}">▶ play</button>
 <b>${s.label}</b> <code>${s.id}</code></div>
 <p class="asks">${s.asks}</p></div>`).join("");
document.getElementById("words").innerHTML = WORDS.map((w,i)=>`
 <div class="card"><div class="word">${w.word}</div>
 <div class="tiles">${w.tiles.map(t=>`<div class="tile">${t.t}<small>${t.reads}</small></div>`).join("")}</div>
 <div class="note${w.note.indexOf("S8")>=0||w.note.indexOf("S4")>=0?" warn":""}">${w.note}</div>
 <p class="asks">${w.asks}</p>
 <div class="row"><button data-w="${i}">▶ play the whole reveal</button></div></div>`).join("");
document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.s!==undefined) play([SOUNDS[+b.dataset.s]]);
  if (b.dataset.w!==undefined) play(WORDS[+b.dataset.w].plan);
});
</script>
""".replace("SOUNDS_JSON", json.dumps(sounds))
   .replace("WORDS_JSON", json.dumps(data))
   .replace("SEAM_MS", str(SEAM2_MS)))
print(f"wrote {page} ({page.stat().st_size // 1024} KB): {len(sounds)} sounds, {len(data)} sound-outs")
