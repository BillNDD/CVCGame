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
     "Two tiles, two sounds — no tile change needed. I told you otherwise an hour ago "
     "and I was wrong: my counting tool split the “eye” diphthong into two characters "
     "and I read that as two sounds. This word needs only long_i, nothing else. "
     "That sound IS the name of the letter I, and S4 forbids the app saying letter "
     "names — but you ruled on 2026-08-06 that the letter-name vowels join the library "
     "as SOUNDS. This is that ruling meeting its first real word.",
     "Is “y” saying eye a sound you are happy for the game to teach?"),
    ("you", [("y", "d:y", "y"), ("ou", "d:oo_moon", "oo")],
     "TWO tiles, not three — a real mismatch, unlike my. “ou” would become a new "
     "multi-letter unit, which is a change to safety rule S8 and needs your approval. "
     "No word in the bank contains “ou”, so nothing already shipped would change.",
     "Should “ou” be one tile, saying oo?"),
    ("said", [("s", "d:s", "s"), ("ai", "d:short_e", "e"), ("d", "d:d", "d")],
     "THREE tiles, not four — also a real mismatch. “ai” would become a new "
     "multi-letter unit, another S8 change. No bank word contains “ai” either. This is "
     "how the field teaches said: the “ai” is the heart part.",
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
 .verdicts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
 .v{font:inherit;font-weight:700;font-size:14px;border:0;border-radius:999px;padding:9px 14px;
   min-height:44px;cursor:pointer;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .v[aria-pressed="true"]{color:#fff}
 .v[data-v="perfect"][aria-pressed="true"]{background:var(--ok);box-shadow:none}
 .v[data-v="good"][aria-pressed="true"]{background:#4c8fd6;box-shadow:none}
 .v[data-v="iterate"][aria-pressed="true"]{background:var(--amber);box-shadow:none;color:#3a2a05}
 .v[data-v="no good option"][aria-pressed="true"]{background:#cc4747;box-shadow:none}
 .bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);
   padding:12px 0 14px;margin-top:26px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
 .count{font-size:14px;color:#5a6b8c}
 textarea{width:100%;min-height:150px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
   border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
</style>
<h1>Heart words: the sound-out round</h1>
<p class="sub">Every word clip here you have already graded <b>perfect</b>. This round is only
about <b>two sounds you have never heard</b> and <b>how each word breaks into tiles</b>.
Play each, then press a verdict. The spacing is the app's own 500&nbsp;ms. When you are done, press <b>copy all answers</b> at the bottom and paste them back to me.</p>

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
const VERDICTS = ["perfect","good","iterate on this","no good option"];
const answers = {};
const vrow = key => `<div class="verdicts" data-key="${key}">` +
  VERDICTS.map(v=>`<button class="v" data-v="${v}" aria-pressed="false">${v}</button>`).join("") + `</div>`;

document.getElementById("sounds").innerHTML = SOUNDS.map((s,i)=>`
 <div class="card"><div class="row"><button data-s="${i}">▶ play</button>
 <b>${s.label}</b> <code>${s.id}</code></div>
 <p class="asks">${s.asks}</p>${vrow("sound " + s.id)}</div>`).join("");
document.getElementById("words").innerHTML = WORDS.map((w,i)=>`
 <div class="card"><div class="word">${w.word}</div>
 <div class="tiles">${w.tiles.map(t=>`<div class="tile">${t.t}<small>${t.reads}</small></div>`).join("")}</div>
 <div class="note${w.note.indexOf("S8")>=0||w.note.indexOf("S4")>=0?" warn":""}">${w.note}</div>
 <p class="asks">${w.asks}</p>
 <div class="row"><button data-w="${i}">▶ play the whole reveal</button></div>
 ${vrow(w.word + "  [" + w.tiles.map(t=>t.t+"→"+t.reads).join(" ") + "]")}</div>`).join("");

const TOTAL = SOUNDS.length + WORDS.length;
document.body.insertAdjacentHTML("beforeend", `<div class="bar">
  <button id="copy">📋 copy all answers</button>
  <span class="count" id="count">0 of ${TOTAL} answered</span></div>
  <textarea id="out" readonly placeholder="Your answers appear here as you click. Press copy, then paste them back to me."></textarea>`);

function render(){
  const lines = [];
  for (const k of Object.keys(answers)) lines.push(k + " | " + answers[k]);
  const missing = [];
  document.querySelectorAll(".verdicts").forEach(d=>{ if(!answers[d.dataset.key]) missing.push(d.dataset.key); });
  const NL = String.fromCharCode(10);
  let text = "HEART WORD ROUND — " + new Date().toISOString().slice(0,10) + NL + NL
    + (lines.join(NL) || "(nothing answered yet)");
  if (missing.length) text += NL + NL + "NOT ANSWERED (" + missing.length + "):" + NL + missing.join(NL);
  document.getElementById("out").value = text;
  document.getElementById("count").textContent =
    Object.keys(answers).length + " of " + TOTAL + " answered";
}
render();

document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.s!==undefined) return play([SOUNDS[+b.dataset.s]]);
  if (b.dataset.w!==undefined) return play(WORDS[+b.dataset.w].plan);
  if (b.classList.contains("v")) {
    const row = b.closest(".verdicts"), key = row.dataset.key;
    const already = b.getAttribute("aria-pressed") === "true";
    row.querySelectorAll(".v").forEach(x=>x.setAttribute("aria-pressed","false"));
    if (already) delete answers[key];            // click again to clear
    else { b.setAttribute("aria-pressed","true"); answers[key] = b.dataset.v; }
    return render();
  }
  if (b.id === "copy") {
    const t = document.getElementById("out");
    t.select();
    navigator.clipboard.writeText(t.value).then(
      ()=>{ b.textContent = "✓ copied"; setTimeout(()=>b.textContent="📋 copy all answers", 1600); },
      ()=>{ document.execCommand("copy"); b.textContent = "✓ copied"; setTimeout(()=>b.textContent="📋 copy all answers", 1600); });
  }
});
</script>
""".replace("SOUNDS_JSON", json.dumps(sounds))
   .replace("WORDS_JSON", json.dumps(data))
   .replace("SEAM_MS", str(SEAM2_MS)))
print(f"wrote {page} ({page.stat().st_size // 1024} KB): {len(sounds)} sounds, {len(data)} sound-outs")
