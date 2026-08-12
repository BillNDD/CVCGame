# A ship review: hear what is IN the game, side by side.
#
# WHY THIS EXISTS. On 2026-08-12 the owner heard ten shipped sounds together
# for the first time and called two of them poor — th_this and h. Both had been
# graded "perfect (owner)" in their own rounds, th_this after twenty-two of
# them. A verdict given to a clip heard ALONE did not survive hearing it in
# company. That is a fault in how rounds are run, not in two clips.
#
# Every batch this project has ever run had the same shape: a dozen candidates
# for one word, judged against each other, then never heard again beside
# anything else. The 83 words that shipped into Levels 10 and 11 on 2026-08-12
# were approved that way across fourteen batches between 7 and 11 August. As a
# set they have never been heard at all.
#
# So this builds the other kind of page: not candidates for one thing, but
# everything that ships, in the order a child meets it, one verdict each.
#
# NOTE ON WHAT THIS TOOL CANNOT DO. It cannot listen. It arranges audio the
# owner has already approved so that a person can hear it in context; it makes
# no judgement about any clip and must never be described as having checked
# one.
#
# Usage:
#   python3 tools/ship_review.py <out.html> --levels 10 11
#   python3 tools/ship_review.py <out.html> --sounds
import base64
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"

CSS = """
:root{color-scheme:light dark}
body{margin:0;background:#faf9f6;color:#1a1a2e;font:15px/1.5 ui-serif,Georgia,serif}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #d8d4c8;padding:11px 15px;z-index:5}
h1{margin:0;font-size:16px} .sub{font-size:12.5px;color:#5a5a6e;margin-top:4px}
main{padding:0 15px 150px;max-width:760px;margin:0 auto}
h2.grp{font-size:14px;margin:22px 0 6px;color:#5a5a6e;text-transform:uppercase;letter-spacing:.08em}
.row{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;
  background:#fff;border:1px solid #e3dfd4;border-radius:10px;padding:7px 9px;margin:6px 0}
.w{font:600 19px/1.2 inherit}
.play{min-height:44px;min-width:70px;font:600 14px inherit;border:1px solid #c9c3b2;background:#f7f5ef;border-radius:8px;cursor:pointer}
.play.on{background:#1a1a2e;color:#fff}
.mark{min-height:44px;min-width:44px;padding:0 10px;font:14px inherit;border:1px solid #c9c3b2;background:#fff;border-radius:8px;cursor:pointer}
.mark.ok.chosen{background:#1a5c3a;color:#fff;border-color:#1a5c3a}
.mark.bad.chosen{background:#8a2b12;color:#fff;border-color:#8a2b12}
footer{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #d8d4c8;padding:9px 15px}
#copy{min-height:50px;width:100%;font:600 15px inherit;border:0;border-radius:10px;background:#1a1a2e;color:#fff;cursor:pointer}
#status{font-size:12.5px;color:#5a5a6e;margin-top:5px}
#out{width:100%;height:110px;margin-top:7px;font:12px ui-monospace,monospace;box-sizing:border-box}
@media(prefers-color-scheme:dark){body{background:#12121a;color:#e8e6df}
 header,footer,.row{background:#1b1b26;border-color:#33323f}
 .play,.mark{background:#242433;color:#e8e6df;border-color:#3a3a4a}
 #out{background:#12121a;color:#e8e6df}}
"""

SCRIPT = """
const answers=JSON.parse(localStorage.getItem(KEY)||"{}");
let audio=null,lastTap=0;
function play(b){document.querySelectorAll(".play.on").forEach(x=>x.classList.remove("on"));
 if(audio){audio.pause();audio=null;}
 const bin=Uint8Array.from(atob(b.dataset.b64),c=>c.charCodeAt(0));
 audio=new Audio(URL.createObjectURL(new Blob([bin],{type:"audio/mpeg"})));
 b.classList.add("on");audio.onended=()=>b.classList.remove("on");
 audio.play().catch(()=>b.classList.remove("on"));}
/* Touch as well as click: a tap inside an embedded viewer does not always
   arrive as a click, and a page wired to click alone can be dead on a phone. */
const handle=(e)=>{
 if(e.type==="pointerup")lastTap=Date.now(); else if(Date.now()-lastTap<700)return;
 const t=e.target.closest("button"); if(!t)return;
 if(t.classList.contains("play")){play(t);return;}
 if(t.classList.contains("mark")){const k=t.dataset.item;
  const row=t.closest(".row");row.querySelectorAll(".mark").forEach(b=>b.classList.remove("chosen"));
  t.classList.add("chosen");answers[k]=t.dataset.v;
  localStorage.setItem(KEY,JSON.stringify(answers));return;}
 if(t.id==="copy"){
  const bad=[],good=[],un=[];
  document.querySelectorAll(".row").forEach(r=>{const k=r.dataset.item,a=answers[k];
   if(!a)un.push(k); else if(a==="ok")good.push(k); else bad.push(k+" ("+a+")");});
  const text="NEEDS WORK ("+bad.length+"): "+bad.join(", ")+
   "\\n\\nfine ("+good.length+")\\nnot marked ("+un.length+"): "+un.join(", ");
  const box=document.getElementById("out");
  box.hidden=false;box.value=text;box.focus();box.setSelectionRange(0,text.length);
  let ok=false;try{navigator.clipboard.writeText(text);ok=true;}catch{}
  document.getElementById("status").textContent=ok?
   "Copied \\u2014 paste it back in the chat. Only what needs work is listed.":
   "Clipboard blocked. The text below is selected: copy it and paste it back.";}
};
document.addEventListener("pointerup",handle);document.addEventListener("click",handle);
window.addEventListener("DOMContentLoaded",()=>{Object.keys(answers).forEach(k=>{
 const r=document.querySelector('.row[data-item="'+CSS.escape(k)+'"]');if(!r)return;
 const b=r.querySelector('.mark[data-v="'+answers[k]+'"]');if(b)b.classList.add("chosen");});});
"""


def rows_for(items):
    out = []
    for label, cid in items:
        f = PACK / json.loads((PACK / "manifest.json").read_text())[cid]["file"]
        b64 = base64.b64encode(f.read_bytes()).decode()
        out.append(f'''<div class="row" data-item="{label}">
  <span class="w">{label}</span>
  <button class="play" data-b64="{b64}">&#9654;</button>
  <button class="mark ok" data-item="{label}" data-v="ok">fine</button>
  <button class="mark bad" data-item="{label}" data-v="poor">poor</button>
</div>''')
    return "\n".join(out)


def build(groups, title, blurb, key, out):
    body = "".join(f'<h2 class="grp">{name} &mdash; {len(items)}</h2>\n{rows_for(items)}'
                   for name, items in groups)
    total = sum(len(i) for _, i in groups)
    pathlib.Path(out).write_text(f'''<title>{title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>{CSS}</style>
<header><h1>{title}</h1><div class="sub">{blurb}</div></header>
<main>{body}</main>
<footer><button id="copy">Show what needs work</button><div id="status"></div>
<textarea id="out" hidden readonly></textarea></footer>
<script>const KEY="{key}";{SCRIPT}</script>''')
    print(f"wrote {out}: {total} clips in {len(groups)} group(s), "
          f"{pathlib.Path(out).stat().st_size // 1024} KB")


if __name__ == "__main__":
    out = sys.argv[1]
    man = json.loads((PACK / "manifest.json").read_text())
    if "--sounds" in sys.argv:
        ids = sorted(k for k in man if k.startswith("d:"))
        build([("every sound in the library", [(k[2:], k) for k in ids])],
              "Sound ship review", "Every sound the game can say, in one place.",
              "soundReview", out)
    else:
        import subprocess
        levels = [int(x) for x in sys.argv[sys.argv.index("--levels") + 1:] if x.isdigit()]
        data = json.loads(subprocess.run(
            ["node", "-e", "import('./src/engine.js').then(m=>console.log(JSON.stringify("
             "m.LEVELS.map(l=>({n:l.n,name:l.name,words:l.words})))))"],
            cwd=REPO, capture_output=True, text=True, check=True).stdout)
        groups = [(f'Level {l["n"]} — {l["name"]}', [(w, "w:" + w) for w in l["words"]])
                  for l in data if l["n"] in levels]
        build(groups, "New words ship review",
              "Every word that entered the game on 2026-08-12. Each was approved alone inside a "
              "batch, weeks apart; none has been heard beside the others. Mark only what needs "
              "work — the export lists just those.", "wordReview", out)
