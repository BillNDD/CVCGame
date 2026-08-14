# The word "a", from the owner's schwa handoff.
#
# WHAT ARRIVED. A complete package: an af_heart schwa the owner accepted
# (option D), 363 ms of speech, 24 kHz mono PCM16 WAV, with its recipe, its
# inputs and a hash for every file. All seven hashes verify. The recipe is
# explicit that a rebake CANNOT be byte-identical - Praat's overlap-add varies
# run to run - and that the accepted WAV is the production authority. So this
# tool never re-bakes anything. It takes those exact samples and asks the three
# questions the package cannot answer by itself.
#
# WHY A ROUND AT ALL, when the owner has already accepted the sound:
#
#   1. LEVEL. The clip sits at -18.0 dBFS RMS. The vowels it will stand beside
#      sit at -20.5 (short_u), -22.7 (short_a) and -22.8 (the schwa it would
#      replace). That is 2.5 to 4.8 dB louder than its neighbours - and 6.2 dB
#      is exactly what the owner heard as "shouting" from d:v on 2026-08-12.
#      A sound is judged in the company it keeps (open-faults B11), so the
#      arms are the same clip at three levels.
#   2. FORMAT. The owner accepted a lossless WAV. The pack is 96 kbps MP3, and
#      that is what a child hears. Every arm here is encoded exactly as the
#      pack encodes, so the thing being judged is the thing that would ship.
#   3. SHAPE. "a" is one letter, one sound. The reveal that ships today would
#      play the word, "Pronounced:", the sound, then the word again - and for
#      this word the word and the sound are THE SAME RECORDING. That is either
#      fine or silly, and only an ear can say which.
#
# The human reference recording in the handoff is NOT used and must never be
# committed: the owner ruled on 2026-08-11 that no recording of their voice
# ships. The recipe confirms no human samples are mixed into the sound; the
# human file is an amplitude-envelope target only.
#
# Usage: kokoro-env/bin/python3 tools/build_a_round.py <out.html> [handoff_dir]
import base64
import json
import pathlib
import sys
import wave

import av
import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
MANIFEST = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
SEAM_MS, SEAM2_MS = 700, 500
DEFAULT_HANDOFF = pathlib.Path(
    "/tmp/claude-0/-home-user-CVCFame/e6f72ac3-eaf2-5b4a-aa69-540f121df052/scratchpad/"
    "schwa-handoff/SCHWA_D_AF_HEART_COMPLETE_HANDOFF")


def load_wav(p):
    w = wave.open(str(p))
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768.0
    return x, w.getframerate()


def load_mp3(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def encode(pcm, sr):
    e = lameenc.Encoder()
    e.set_bit_rate(96); e.set_in_sample_rate(sr); e.set_channels(1); e.set_quality(2)
    p16 = (np.clip(pcm, -1, 1) * 32767).astype(np.int16)
    return e.encode(p16.tobytes()) + e.flush()


def edges(x, sr):
    """The pack's own method: 10 ms frames, -45 dB below the clip's own peak."""
    n = max(1, int(sr * 0.010))
    fr = [x[i:i + n] for i in range(0, max(1, len(x) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > -45.0)[0]
    total = round(len(x) / sr * 1000)
    if not len(on):
        return 0, 0, total
    return (round(int(on.min()) * n / sr * 1000),
            round(max(0.0, total - (int(on.max()) + 1) * n / sr * 1000)), total)


def rms_dbfs(x):
    return 20 * np.log10(max(np.sqrt(np.mean(x.astype(np.float64) ** 2)), 1e-9))


def entry(pcm, sr, cid="cut"):
    lead, tail, ms = edges(pcm, sr)
    return {"id": cid, "b64": base64.b64encode(encode(pcm, sr)).decode(),
            "lead": lead, "tail": tail, "ms": ms, "speech": ms - lead - tail,
            "rms": round(rms_dbfs(pcm[int(sr * lead / 1000):len(pcm) - int(sr * tail / 1000)]), 1)}


def pack_entry(cid):
    x, sr = load_mp3(PACK / MANIFEST[cid]["file"])
    e = entry(x, sr, cid)
    e["b64"] = base64.b64encode((PACK / MANIFEST[cid]["file"]).read_bytes()).decode()
    return e


HANDOFF = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_HANDOFF
review, SR = load_wav(HANDOFF / "accepted" / "schwa_D_review.wav")
sentence, _ = load_wav(HANDOFF / "accepted" / "schwa_D_sentence.wav")

# The three levels. Measured, not chosen by taste: as delivered, matched to the
# loudest vowel it will stand beside, and matched to the schwa it replaces.
NEIGHBOURS = {"short_u": -20.5, "schwa (today)": -22.8}
lead0, tail0, _ = edges(review, SR)
body0 = review[int(SR * lead0 / 1000):len(review) - int(SR * tail0 / 1000)]
BASE_RMS = rms_dbfs(body0)
LEVELS = [
    ("1", "as delivered", 0.0,
     "The accepted clip, untouched but encoded as the pack encodes. It sits "
     f"<b>{BASE_RMS:.1f} dBFS</b>, which is 2.5 dB above short_u and 4.8 dB above the schwa it "
     "would replace."),
    ("2", "matched to short_u", NEIGHBOURS["short_u"] - BASE_RMS,
     "Turned down to the level of <b>short_u</b>, the loudest vowel it will stand beside."),
    ("3", "matched to today's schwa", NEIGHBOURS["schwa (today)"] - BASE_RMS,
     "Turned down to the level of the schwa now in the game, so swapping one for the other "
     "changes the sound and nothing else."),
]


def at_level(db):
    out = review * (10 ** (db / 20.0))
    return entry(out, SR, "d:schwa (new)")


NEW = {k: at_level(db) for k, _, db, _ in LEVELS}
OLD = pack_entry("d:schwa")
WORD_A = {k: {**v, "id": "w:a (new)"} for k, v in NEW.items()}   # same bytes, other role

P = {cid: pack_entry(cid) for cid in ["w:the", "s:pronounced", "d:th_this", "w:to", "d:t", "d:oo_moon"]}

CARDS = [
    {"h": "1 · The sound, inside a word you have already passed",
     "note": "“the” is the one bank word that uses the schwa today. Same reveal the game plays: "
             "the word, “Pronounced:”, each sound, the word again — with only the schwa swapped.",
     "arms": [{"key": "CONTROL", "name": "the schwa in the game today",
               "why": f"What a child hears now. {OLD['speech']} ms of sound at {OLD['rms']} dBFS.",
               "plan": [P["w:the"], "seam2", P["s:pronounced"], "seam2", P["d:th_this"],
                        "seam2", OLD, "seam2", P["w:the"]]}]
     + [{"key": k, "name": f"new schwa · {name}",
         "why": why + f" {NEW[k]['speech']} ms of sound at {NEW[k]['rms']} dBFS.",
         "plan": [P["w:the"], "seam2", P["s:pronounced"], "seam2", P["d:th_this"],
                  "seam2", NEW[k], "seam2", P["w:the"]]} for k, name, _, why in LEVELS]},
    {"h": "2 · The word “a”, on its own",
     "note": "The whole reason this matters: “a” is on the first page of every book and is not "
             "in the game, because the only pronunciation the voice offered was the letter name, "
             "which safety rule S4 forbids. This clip is the word.",
     "arms": [{"key": k, "name": f"“a” · {name}", "why": why,
               "plan": [WORD_A[k]]} for k, name, _, why in LEVELS]},
    {"h": "3 · The word “a”, with the reveal that ships today",
     "note": "One letter, one sound — so the word clip and the sound clip are the SAME "
             "recording, and the reveal plays it three times. Compare it with “to”, a two-sound "
             "word, to hear whether that is fine or silly.",
     "arms": [{"key": "A-FULL", "name": "“a” with the full reveal",
               "why": "Word, “Pronounced:”, the sound, the word again — exactly what every other "
                      "word gets.",
               "plan": [WORD_A["2"], "seam2", P["s:pronounced"], "seam2", NEW["2"], "seam2",
                        WORD_A["2"]]},
              {"key": "A-SHORT", "name": "“a” with no sound-out",
               "why": "The word, then the word again. What a one-sound word arguably deserves "
                      "instead of hearing itself three times.",
               "plan": [WORD_A["2"], "seam", WORD_A["2"]]},
              {"key": "TO", "name": "“to” — the reference",
               "why": "A two-sound heart word you graded perfect today, played the same way, so "
                      "you can hear what the reveal is supposed to feel like.",
               "plan": [P["w:to"], "seam2", P["s:pronounced"], "seam2", P["d:t"], "seam2",
                        P["d:oo_moon"], "seam2", P["w:to"]]}]},
    {"h": "4 · Reference only — the handoff's own sentence",
     "note": "“It was a red sunset.”, lossless, from the package. NOT a game asset: that sentence "
             "is not in the bank and nobody has graded it as one. It is here because it is the "
             "context the sound was accepted in.",
     "arms": [{"key": "REF", "name": "the sentence from the handoff",
               "why": "Played as delivered, encoded as the pack encodes.",
               "plan": [entry(sentence, SR, "reference")]}]},
]

for c in CARDS:
    for a in c["arms"]:
        a["plan"] = [{"seam": SEAM2_MS if p == "seam2" else SEAM_MS} if isinstance(p, str) else p
                     for p in a["plan"]]

page = """<!doctype html><meta charset="utf-8">
<title>The word “a”</title>
<style>
 :root{--ink:#17356b;--ink2:#4a5f85;--line:#dfe6f3;--chip:#eef3fb;--ok:#2e9e5b}
 body{font:16px/1.55 ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
   max-width:840px;margin:0 auto;padding:26px 18px 110px;background:#fff}
 h1{font-size:25px;margin:0 0 4px} .sub{color:var(--ink2);margin:0 0 14px}
 .note{background:var(--chip);border-radius:12px;padding:13px 15px;font-size:14.5px;margin:0 0 22px}
 h2{font-size:19px;margin:30px 0 4px} .h2n{color:var(--ink2);font-size:14.5px;margin:0 0 10px}
 .card{border:1px solid var(--line);border-radius:14px;padding:15px;margin:11px 0}
 .arm{font-size:17px;font-weight:800;margin:0 0 4px}
 .why{font-size:14.5px;color:var(--ink2);margin:0 0 11px}
 button{font:inherit;font-weight:800;border:0;border-radius:999px;background:var(--ink);color:#fff;
   padding:12px 20px;min-height:48px;cursor:pointer}
 .verdicts{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
 .v{font-size:14px;font-weight:800;border:0;border-radius:999px;padding:9px 14px;min-height:44px;
   cursor:pointer;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .v[aria-pressed="true"]{background:var(--ok);color:#fff;box-shadow:none}
 .bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);padding:13px 0 15px;
   margin-top:26px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
 textarea{width:100%;min-height:130px;font:13px/1.5 ui-monospace,Menlo,monospace;
   border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
</style>
<h1>The word “a”</h1>
<p class="sub">Your schwa handoff, in the game's own voice pack, at the game's own spacing.</p>
<div class="note"><b>Nothing here was re-baked.</b> All seven hashes in the package verify, and its
own recipe says a rebake cannot be byte-identical — so these are the exact samples you accepted,
encoded at 96 kbps as the pack encodes, which is what a child would hear.<br><br>
<b>The one thing measurement flags:</b> the clip sits at −18.0 dBFS, which is 2.5 dB above short_u
and 4.8 dB above the schwa it would replace. 6.2 dB is what you heard as shouting from the v this
morning, so the level arms are the same clip turned down by measured amounts — not by taste.<br><br>
The human recording in your package is used for nothing here and will never be committed: no
recording of your voice ships (2026-08-11).</div>
<div id="cards"></div>
<script>
const CARDS = CARDS_JSON;
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)).buffer;
const cache = new Map();
async function buf(c,k){ if(!cache.has(k)) cache.set(k, await ctx.decodeAudioData(bytes(c.b64))); return cache.get(k); }
let stop = null;
async function play(plan, tag){
  if (stop) stop();
  await ctx.resume();
  const bs = new Map();
  for (let i=0;i<plan.length;i++) if(!plan[i].seam) bs.set(i, await buf(plan[i], tag+":"+i));
  let at = ctx.currentTime + 0.05; const live = [];
  plan.forEach((c,i)=>{
    if (c.seam) return;
    const s = ctx.createBufferSource(); s.buffer = bs.get(i); s.connect(ctx.destination); s.start(at);
    live.push(s); at += bs.get(i).duration;
    const next = plan[i+1]; if(!next) return;
    const gap = next.seam ? next.seam : 0, after = next.seam ? plan[i+2] : next;
    if (after && !after.seam) at += gap/1000 - c.tail/1000 - after.lead/1000;
  });
  stop = () => { live.forEach(s=>{try{s.stop();}catch(e){}}); stop = null; };
}
const answers = {};
document.getElementById("cards").innerHTML = CARDS.map((c,ci)=>`
 <h2>${c.h}</h2><p class="h2n">${c.note}</p>
 ${c.arms.map((a,ai)=>`<div class="card">
   <p class="arm">${a.name}</p><p class="why">${a.why}</p>
   <button data-c="${ci}" data-a="${ai}">▶ play</button>
   <div class="verdicts" data-key="${c.h.split(" · ")[0]} ${a.key} ${a.name}">
     ${["perfect","good","iterate on this","no good option"].map(v=>
       `<button class="v" data-v="${v}" aria-pressed="false">${v}</button>`).join("")}
   </div></div>`).join("")}`).join("");
document.body.insertAdjacentHTML("beforeend", `<div class="bar">
  <button id="copy">📋 copy all answers</button><span id="count"></span></div>
  <textarea id="out" readonly></textarea>`);
const KEYS = CARDS.flatMap(c=>c.arms.map(a=>c.h.split(" · ")[0]+" "+a.key+" "+a.name));
function render(){
  const NL = String.fromCharCode(10);
  const lines = Object.keys(answers).map(k=>k+" | "+answers[k]);
  const missing = KEYS.filter(k=>!answers[k]);
  let t = "THE WORD A" + NL + NL + (lines.join(NL) || "(nothing yet)");
  if (missing.length) t += NL + NL + "NOT ANSWERED ("+missing.length+"):" + NL + missing.join(NL);
  document.getElementById("out").value = t;
  document.getElementById("count").textContent = Object.keys(answers).length+" of "+KEYS.length+" answered";
}
render();
document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.c!==undefined) return play(CARDS[+b.dataset.c].arms[+b.dataset.a].plan, b.dataset.c+"_"+b.dataset.a);
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
out = pathlib.Path(sys.argv[1])
out.write_text(page.replace("CARDS_JSON", json.dumps(CARDS)), encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
print(f"  base clip: {NEW['1']['speech']} ms of speech, {BASE_RMS:.1f} dBFS RMS")
for k, name, db, _ in LEVELS:
    print(f"  level {k}: {name:26} {db:+5.1f} dB -> {NEW[k]['rms']} dBFS")
print(f"  control  : shipped d:schwa {OLD['speech']} ms, {OLD['rms']} dBFS")
