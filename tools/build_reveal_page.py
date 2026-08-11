# The reveal, four ways, over identical audio.
#
# The tiles, the word and the palette are the app's own values, copied from
# app/src/wq-css.js and reference/word-quest.jsx, so what the owner approves is
# what a child will see rather than a mock-up that resembles it.
#
# The four treatments:
#   A  bounce-and-shine   the 2026-08-04 ruling: a spring hop, a white flash,
#                         an outward ring on each tile as its sound plays
#   B  A + the word       the same, plus the ruled silver lining on the word's
#                         letters with a travelling glint at the first pop
#   C  lift-and-glow      a calmer alternative: the tile rises and warms, no
#                         ring, no flash
#   D  outline ring only  the reduced-motion variant the owner chose, shown at
#                         full size so it can be judged on its own terms
#
# Usage: python build_reveal_page.py <out_dir> <page.html>
import json
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1])
data = json.loads((OUT / "reveal.json").read_text())
page = pathlib.Path(sys.argv[2])

INK, SUN, INK2, AMBER = "#17356b", "#ffd166", "#3e5aa6", "#6b4600"

cards = []
for it in data["items"]:
    tiles = "".join(f'<span class="tile" data-i="{i}">{g}</span>'
                    for i, g in enumerate(it["tiles"]))
    letters = "".join(f'<span class="ltr">{c}</span>' for c in it["word"])
    cards.append(f'''
<section class="card" data-word="{it['word']}"
         data-tileat="{','.join(str(t) for t in it['tileAt'])}"
         data-wordat="{it['wordAt']}" data-b64="{it['b64']}">
  <div class="stage">
    <p class="eyebrow">READ THIS WORD</p>
    <div class="word">{letters}</div>
    <div class="tiles">{tiles}</div>
    <p class="msg">🎉 Great job! That is <b>{'-'.join(it['tiles'])}</b>, {it['word']}.</p>
  </div>
  <div class="ctrls">
    <button class="go" data-t="A">A · bounce &amp; shine</button>
    <button class="go" data-t="B">B · A + word glint</button>
    <button class="go" data-t="C">C · lift &amp; glow</button>
    <button class="go" data-t="D">D · outline ring only</button>
    <span class="dur">{it['ms']} ms</span>
  </div>
</section>''')

html = f'''<!doctype html><meta charset="utf8">
<title>The sound-out reveal — four animations over the approved audio</title>
<style>
 :root{{--ink:{INK};--sun:{SUN};--ink2:{INK2};--amber:{AMBER}}}
 *{{box-sizing:border-box}}
 body{{margin:0;background:#faf9f6;color:var(--ink);
   font:15px/1.5 ui-serif,Georgia,serif}}
 header{{position:sticky;top:0;background:#fff;border-bottom:1px solid #d8d4c8;
   padding:12px 18px;z-index:5}}
 h1{{margin:0 0 4px;font-size:19px}}
 .lede{{font-size:13px;color:#5a5a4a;margin:0}}
 main{{padding:16px;max-width:900px;margin:0 auto}}
 .card{{background:#fff;border:1px solid #e2ded2;border-radius:10px;
   padding:10px 16px 14px;margin:0 0 16px}}
 /* the stage below uses the app's own values, so this is the real thing */
 .stage{{background:linear-gradient(160deg,#cfe0ff 0%,#d9d3ff 100%);
   border-radius:8px;padding:18px 12px 14px;text-align:center;overflow:hidden}}
 .eyebrow{{margin:0;font-size:11.5px;font-weight:800;letter-spacing:.14em;
   text-transform:uppercase;color:var(--ink);
   font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif}}
 .word{{font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif;
   letter-spacing:.02em;font-size:clamp(2.25rem,9vh,4rem);font-weight:700;
   line-height:1.05;color:var(--ink);margin:4px 0 0;position:relative;
   display:inline-block}}
 .ltr{{position:relative;display:inline-block}}
 .tiles{{min-height:52px;display:flex;align-items:center;justify-content:center;
   gap:6px;margin-top:8px}}
 .tile{{background:var(--sun);color:var(--ink);border-radius:12px;padding:5px 12px;
   font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif;
   font-size:clamp(1.1rem,3dvh,1.6rem);font-weight:700;
   box-shadow:0 1px 3px rgba(23,53,107,.18);position:relative;
   transform-origin:50% 80%}}
 .msg{{margin:8px 0 0;font-size:15px;font-weight:600;color:var(--ink)}}
 .ctrls{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}}
 button{{font:inherit;cursor:pointer;border-radius:7px;padding:8px 12px;
   background:#fff;border:1px solid #c9c4b4;font-weight:700}}
 button.playing{{background:var(--ink);color:#fff;border-color:var(--ink)}}
 .dur{{font-size:12px;color:#6b6b58}}

 /* A — bounce and shine: a spring hop, a white flash, an outward ring */
 .tile.pop-A{{animation:hop .46s cubic-bezier(.34,1.56,.64,1)}}
 .tile.pop-A::before{{content:"";position:absolute;inset:0;border-radius:12px;
   background:#fff;opacity:0;animation:flash .30s ease-out}}
 .tile.pop-A::after{{content:"";position:absolute;inset:0;border-radius:12px;
   border:3px solid #fff;opacity:0;animation:ring .52s ease-out}}
 @keyframes hop{{0%{{transform:translateY(0) scale(1)}}
   35%{{transform:translateY(-14px) scale(1.14)}}
   100%{{transform:translateY(0) scale(1)}}}}
 @keyframes flash{{0%{{opacity:.85}}100%{{opacity:0}}}}
 @keyframes ring{{0%{{opacity:.9;transform:scale(1)}}
   100%{{opacity:0;transform:scale(1.55)}}}}

 /* B — A, plus the ruled silver lining and a travelling glint */
 .word.lined .ltr{{-webkit-text-stroke:1px rgba(255,255,255,.85)}}
 .word.lined::after{{content:"";position:absolute;inset:-6% -12%;pointer-events:none;
   background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.92) 50%,
     transparent 58%);transform:translateX(-120%);animation:glint 1.05s ease-out}}
 @keyframes glint{{to{{transform:translateX(120%)}}}}

 /* C — lift and glow: no flash, no ring */
 .tile.pop-C{{animation:lift .60s ease-out}}
 @keyframes lift{{0%{{transform:translateY(0);box-shadow:0 1px 3px rgba(23,53,107,.18)}}
   40%{{transform:translateY(-9px);box-shadow:0 10px 22px rgba(255,209,102,.85)}}
   100%{{transform:translateY(0);box-shadow:0 1px 3px rgba(23,53,107,.18)}}}}

 /* D — the reduced-motion choice: a static outline, no movement at all */
 .tile.pop-D{{animation:ringonly .70s steps(1,end)}}
 @keyframes ringonly{{0%,99%{{outline:4px solid var(--ink);outline-offset:3px}}
   100%{{outline:0 solid transparent}}}}
 @media (prefers-reduced-motion:reduce){{
   .tile.pop-A,.tile.pop-C{{animation:ringonly .70s steps(1,end)}}
   .tile.pop-A::before,.tile.pop-A::after{{animation:none;opacity:0}}
   .word.lined::after{{animation:none;opacity:0}}
 }}
</style>
<header>
  <h1>The sound-out reveal — four animations over the approved audio</h1>
  <p class="lede">Same sound every time: praise, the word, “Pronounced:”, each sound on its
   tile’s moment, the word again — 500&nbsp;ms apart with the hum underneath, exactly as you
   approved. Only the animation differs. Tiles, word and colours are the app’s own values.</p>
</header>
<main>{"".join(cards)}</main>
<script>
const AC = new (window.AudioContext || window.webkitAudioContext)();
const bufs = new Map();
const bytes = (b64) => {{ const s = atob(b64); const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }};
let live = [], timers = [];
function stopAll() {{
  live.forEach((s) => {{ try {{ s.stop(); }} catch {{}} }}); live = [];
  timers.forEach(clearTimeout); timers = [];
  document.querySelectorAll(".tile").forEach((t) =>
    t.classList.remove("pop-A", "pop-B", "pop-C", "pop-D"));
  document.querySelectorAll(".word").forEach((w) => w.classList.remove("lined"));
  document.querySelectorAll("button.playing").forEach((b) => b.classList.remove("playing"));
}}
async function run(card, treat, btn) {{
  stopAll();
  if (AC.state === "suspended") await AC.resume();
  const b64 = card.dataset.b64;
  if (!bufs.has(b64)) bufs.set(b64, await AC.decodeAudioData(bytes(b64)));
  const src = AC.createBufferSource();
  src.buffer = bufs.get(b64); src.connect(AC.destination); src.start();
  live.push(src); btn.classList.add("playing");
  src.onended = () => btn.classList.remove("playing");

  const at = card.dataset.tileat.split(",").map(Number);
  const tiles = [...card.querySelectorAll(".tile")];
  /* A tile pops the moment ITS sound begins. The times come from the clips'
     own lengths, computed when the audio was assembled - never guessed. */
  at.forEach((ms, i) => timers.push(setTimeout(() => {{
    const t = tiles[i]; if (!t) return;
    const cls = treat === "B" ? "pop-A" : "pop-" + treat;
    t.classList.remove(cls); void t.offsetWidth; t.classList.add(cls);
  }}, ms)));
  if (treat === "B") {{
    const w = card.querySelector(".word");
    timers.push(setTimeout(() => {{
      w.classList.remove("lined"); void w.offsetWidth; w.classList.add("lined");
    }}, at[0]));
  }}
}}
document.addEventListener("click", (e) => {{
  const b = e.target.closest("button.go"); if (!b) return;
  run(b.closest(".card"), b.dataset.t, b);
}});
</script>'''
page.write_text(html)
print("wrote", page, f"({page.stat().st_size // 1024} KB)")
