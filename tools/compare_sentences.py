# Natural sentence, or the same sentence stitched from its approved word clips?
#
# The owner ruled on 2026-08-12 that a sentence ships as ONE natural recording,
# on a MEASUREMENT: across the approved sentences the concatenated word clips
# run about twice the length of the recording, because a word said on its own
# is a citation form. They then asked to hear it rather than read it, which is
# the right instinct - a ratio is not a rhythm.
#
# This rebuilds that comparison from what is actually in the repository, so it
# survives: the 40 approved sentence recordings in tools/pending-words/ and the
# shipped word clips. It needs no temporary batch directory, unlike the earlier
# tools/compare_stitch.py, whose input has since disappeared.
#
# WHAT THE STITCH IS, and it is the BEST case rather than a strawman. Each
# word's approved clip is cut back to its own speech using the lead and tail
# the pack already declares (tools/voice-edges.py measured them), and the words
# are butted straight together with no gap added at all. Any gap would only
# make it longer and more mechanical. The whole then gets the pack's standard
# 80 ms lead and 300 ms tail, exactly as a natural recording does.
#
# ONLY SENTENCES WHOSE EVERY WORD HAS AN APPROVED CLIP ARE OFFERED. A sentence
# needing a word nobody has heard is listed as skipped, with the missing word
# named. Round 8 offered a listener two identical files as different candidates
# and round 10 offered whole sentences as words; a clip nobody has judged is
# never presented as if it were settled.
#
# Usage: kokoro-env/bin/python3 tools/compare_sentences.py <out.html> [count]
import base64
import io
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
PEND = REPO / "tools" / "pending-words"
MANIFEST = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
PENDING = json.loads((PEND / "pending-words.json").read_text(encoding="utf-8"))
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10
SR = 24000


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    if np.abs(x).max() > 2:
        x = x / 32768.0
    return x, sr


def encode(pcm, sr=SR):
    e = lameenc.Encoder()
    e.set_bit_rate(96)
    e.set_in_sample_rate(sr)
    e.set_channels(1)
    e.set_quality(2)
    pcm16 = np.clip(pcm, -1, 1)
    pcm16 = (pcm16 * 32767).astype(np.int16)
    return e.encode(pcm16.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def words_of(text):
    return [w for w in text.lower().replace(".", " ").replace(",", " ")
            .replace("!", " ").replace("?", " ").split() if w]


def word_clip(w):
    """The approved clip for a word, and the speech edges the pack declares."""
    key = "w:" + w
    if key in MANIFEST:
        m = MANIFEST[key]
        return PACK / m["file"], m.get("lead", 0), m.get("tail", 0)
    if (PEND / f"w-{w}.mp3").exists():
        return PEND / f"w-{w}.mp3", None, None      # approved, not yet shipped
    return None, None, None


def speech_only(path, lead, tail):
    x, sr = load(path)
    if lead is None:                                 # unshipped: measure it here
        n = max(1, int(sr * 0.010))
        fr = [x[i:i + n] for i in range(0, max(1, len(x) - n + 1), n)]
        rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
        db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
        on = np.nonzero(db > -45.0)[0]
        if not len(on):
            return x, sr
        return x[int(on.min()) * n:(int(on.max()) + 1) * n], sr
    a = int(sr * lead / 1000)
    b = len(x) - int(sr * tail / 1000)
    return x[a:max(a + 1, b)], sr


def stitch(text):
    parts, sr = [], SR
    for w in words_of(text):
        p, lead, tail = word_clip(w)
        if p is None:
            return None, w
        seg, sr = speech_only(p, lead, tail)
        parts.append(seg)
    body = np.concatenate(parts)
    pad = lambda ms: np.zeros(int(sr * ms / 1000), dtype=np.float32)
    out = np.concatenate([pad(LEAD_MS), body, pad(TAIL_MS)])
    f = int(sr * FADE_MS / 1000)
    out[:f] *= np.linspace(0, 1, f)
    out[-f:] *= np.linspace(1, 0, f)
    return out, sr


def main():
    out_path = pathlib.Path(sys.argv[1])
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    cards, skipped = [], []
    for key, rec in PENDING.items():
        if not key.startswith("s:mode-") or "text" not in rec:
            continue
        text = rec["text"]
        nat_path = PEND / rec["file"]
        if not nat_path.exists():
            continue
        st, missing = stitch(text)
        if st is None:
            skipped.append((text, missing))
            continue
        nat_bytes = nat_path.read_bytes()
        nat_ms = rec["ms"]
        st_bytes, st_ms = encode(st)
        cards.append({
            "text": text,
            "words": len(words_of(text)),
            "nat": base64.b64encode(nat_bytes).decode(), "natMs": nat_ms,
            "st": base64.b64encode(st_bytes).decode(), "stMs": st_ms,
            "ratio": round(st_ms / nat_ms, 2),
        })
        if len(cards) >= want:
            break

    ratios = [c["ratio"] for c in cards]
    summary = (f"{len(cards)} sentences. Stitched runs "
               f"{min(ratios):.2f} to {max(ratios):.2f} times the natural recording, "
               f"median {sorted(ratios)[len(ratios) // 2]:.2f}.") if cards else "none"

    page = """<!doctype html><meta charset="utf-8">
<title>Sentences: read naturally, or stitched from words</title>
<style>
 :root{--ink:#17356b;--line:#dfe6f3;--chip:#eef3fb;--ok:#2e9e5b}
 body{font:16px/1.55 ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
   max-width:780px;margin:0 auto;padding:24px 18px 90px;background:#fff}
 h1{font-size:24px;margin:0 0 4px} .sub{color:#5a6b8c;margin:0 0 8px}
 .card{border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}
 .say{font-size:23px;font-weight:700;margin:0 0 12px}
 .pair{display:flex;gap:10px;flex-wrap:wrap}
 button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 18px;
   min-height:48px;cursor:pointer;background:var(--ink);color:#fff}
 button.alt{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .ms{font-size:13px;color:#5a6b8c;margin-top:8px}
 .verdicts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
 .v{font:inherit;font-weight:700;font-size:14px;border:0;border-radius:999px;padding:9px 14px;
   min-height:44px;cursor:pointer;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .v[aria-pressed="true"]{background:var(--ok);color:#fff;box-shadow:none}
 .bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);
   padding:12px 0 14px;margin-top:24px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
 textarea{width:100%;min-height:130px;font:13px/1.5 ui-monospace,Menlo,monospace;
   border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
 .note{background:var(--chip);border-radius:10px;padding:10px 12px;font-size:14px;margin:12px 0}
</style>
<h1>Sentences: read naturally, or stitched from words</h1>
<p class="sub">SUMMARY</p>
<div class="note">The stitch is the <b>best case</b>: each word cut back to its own speech
and butted straight together with no gap added. Any gap would make it longer and more
mechanical. Both get the pack's standard 80&nbsp;ms lead and 300&nbsp;ms tail.<br><br>
Only sentences whose every word has a clip you have already approved are here.
SKIPNOTE</div>
<div id="cards"></div>
<script>
const CARDS = CARDS_JSON;
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)).buffer;
const cache = new Map();
async function play(b64, key){
  await ctx.resume();
  if(!cache.has(key)) cache.set(key, await ctx.decodeAudioData(bytes(b64)));
  const s = ctx.createBufferSource(); s.buffer = cache.get(key); s.connect(ctx.destination); s.start();
}
const answers = {};
document.getElementById("cards").innerHTML = CARDS.map((c,i)=>`
 <div class="card"><p class="say">${c.text}</p>
  <div class="pair">
    <button data-n="${i}">▶ natural recording</button>
    <button class="alt" data-s="${i}">▶ stitched from words</button>
  </div>
  <p class="ms">natural ${c.natMs} ms &nbsp;·&nbsp; stitched ${c.stMs} ms &nbsp;·&nbsp;
     <b>${c.ratio}×</b> longer &nbsp;·&nbsp; ${c.words} words</p>
  <div class="verdicts" data-key="${c.text}">
    <button class="v" data-v="natural" aria-pressed="false">natural is better</button>
    <button class="v" data-v="stitched" aria-pressed="false">stitched is better</button>
    <button class="v" data-v="no difference" aria-pressed="false">no real difference</button>
  </div>
 </div>`).join("");
document.body.insertAdjacentHTML("beforeend", `<div class="bar">
  <button id="copy">📋 copy all answers</button><span id="count"></span></div>
  <textarea id="out" readonly></textarea>`);
function render(){
  const NL = String.fromCharCode(10);
  const lines = Object.keys(answers).map(k => k + " | " + answers[k]);
  const missing = CARDS.map(c=>c.text).filter(t=>!answers[t]);
  let t = "SENTENCE COMPARISON — natural vs stitched" + NL + NL + (lines.join(NL) || "(nothing yet)");
  if (missing.length) t += NL + NL + "NOT ANSWERED (" + missing.length + "):" + NL + missing.join(NL);
  document.getElementById("out").value = t;
  document.getElementById("count").textContent = Object.keys(answers).length + " of " + CARDS.length + " answered";
}
render();
document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.n!==undefined) return play(CARDS[+b.dataset.n].nat, "n"+b.dataset.n);
  if (b.dataset.s!==undefined) return play(CARDS[+b.dataset.s].st, "s"+b.dataset.s);
  if (b.classList.contains("v")) {
    const row = b.closest(".verdicts"), k = row.dataset.key;
    const on = b.getAttribute("aria-pressed")==="true";
    row.querySelectorAll(".v").forEach(x=>x.setAttribute("aria-pressed","false"));
    if (on) delete answers[k]; else { b.setAttribute("aria-pressed","true"); answers[k]=b.dataset.v; }
    return render();
  }
  if (b.id==="copy") { const t=document.getElementById("out"); t.select();
    navigator.clipboard.writeText(t.value).then(()=>{b.textContent="✓ copied";
      setTimeout(()=>b.textContent="📋 copy all answers",1600);},()=>{}); }
});
</script>
"""
    skipnote = ("" if not skipped else
                f"{len(skipped)} were left out because a word in them has no approved clip: "
                + ", ".join(sorted({m for _, m in skipped})) + ".")
    out_path.write_text(page.replace("CARDS_JSON", json.dumps(cards))
                        .replace("SUMMARY", summary).replace("SKIPNOTE", skipnote), encoding="utf-8")
    print(f"wrote {out_path} ({out_path.stat().st_size // 1024} KB)")
    print(summary)
    if skipped:
        print(f"skipped {len(skipped)}: missing {sorted({m for _, m in skipped})}")


main()
