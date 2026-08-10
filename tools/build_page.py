# Builds the listening page from a rendered batch: one card per item, blind
# candidate buttons for a word, a single play plus perfect/needs-work for a
# sentence, and a copy-all export at the end. Audio is embedded, so the page
# works offline and can be opened from anywhere.
#
# Usage: python build_page.py <out_dir> <page.html>
import json
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1])
data = json.loads((OUT / "batch-data.json").read_text())
page = pathlib.Path(sys.argv[2])

cards = []
ordered = [i for i in data["items"] if i["kind"] == "sentence"] + \
          [i for i in data["items"] if i["kind"] != "sentence"]
for n, item in enumerate(ordered, start=1):
    if item["kind"] == "word":
        arms = "".join(
            f'<div class="arm"><button class="play" data-b64="{a["b64"]}" data-id="{a["id"]}">{a["id"]}</button>'
            f'<button class="mark perfect" data-item="{item["text"]}" data-id="{a["id"]}">accept, perfect</button>'
            f'<button class="mark close" data-item="{item["text"]}" data-id="{a["id"]}">closest, but not right</button></div>'
            for a in item["arms"])
        cards.append(f'''
<section class="card" data-item="{item["text"]}">
  <div class="head">
    <h2>{item["text"]}</h2>
    <span class="note">{item["note"]}</span>
    <span class="spacer"></span>
    <button class="none" data-item="{item["text"]}">none are right</button>
  </div>
  <div class="arms">{arms}</div>
  <label class="cmt">comment (optional)<input type="text" data-item="{item["text"]}" placeholder="what is wrong with it"></label>
  <div class="state" data-state="{item["text"]}">unmarked</div>
</section>''')
    else:
        a = item["arms"][0]
        cards.append(f'''
<section class="card sentence" data-item="{item["id"]}">
  <div class="kindtag">SENTENCE — play it, then mark perfect or needs work</div>
  <div class="head">
    <h2>“{item["text"]}”</h2>
    <span class="note">{item["note"]}</span>
  </div>
  <div class="arms">
    <div class="arm">
      <button class="play" data-b64="{a["b64"]}" data-id="{a["id"]}">▶ play</button>
      <button class="mark perfect" data-item="{item["id"]}" data-id="{a["id"]}">perfect</button>
      <button class="mark close" data-item="{item["id"]}" data-id="{a["id"]}">needs work</button>
    </div>
  </div>
  <label class="cmt">comment (optional)<input type="text" data-item="{item["id"]}" placeholder="what is wrong with it"></label>
  <div class="state" data-state="{item["id"]}">unmarked</div>
</section>''')

html = f'''<!doctype html><meta charset="utf8">
<title>{data["title"]}</title>
<style>
 body{{margin:0;background:#faf9f6;color:#1a1a2e;font:15px/1.5 ui-serif,Georgia,serif}}
 header{{position:sticky;top:0;background:#fff;border-bottom:1px solid #d8d4c8;padding:12px 18px;z-index:5}}
 h1{{margin:0 0 4px;font-size:19px}}
 .lede{{font-size:13px;color:#5a5a4a;margin:0}}
 main{{padding:16px 16px 140px;max-width:1180px;margin:0 auto}}
 .card{{background:#fff;border:1px solid #e2ded2;border-radius:10px;padding:14px 16px;margin:0 0 14px}}
 .card.done{{border-color:#0f7a4f;background:#f6fbf8}}
 .head{{display:flex;align-items:baseline;gap:12px}}
 h2{{margin:0;font-size:22px}}
 .sentence h2{{font-size:17px;font-weight:600}}
 .sentence{{border-color:#8a5a00;background:#fffdf7}}
 .kindtag{{font-size:11px;letter-spacing:.10em;text-transform:uppercase;color:#8a5a00;font-weight:700;margin-bottom:6px}}
 .note{{font-size:12.5px;color:#6b6b58;font-style:italic}}
 .spacer{{flex:1}}
 .arms{{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 6px}}
 .arm{{display:flex;flex-direction:column;gap:4px;min-width:150px}}
 button{{font:inherit;cursor:pointer;border-radius:7px;padding:7px 10px;background:#fff;border:1px solid #c9c4b4}}
 .play{{font-weight:700;border-color:#1a1a2e}}
 .play.played{{background:#eef2fb}}
 .mark{{font-size:12px;color:#4a4a3a;border-style:dashed}}
 .mark.chosen{{background:#0f7a4f;color:#fff;border-style:solid;border-color:#0f7a4f}}
 .close.chosen{{background:#8a5a00;border-color:#8a5a00}}
 .none{{font-size:12px;border-color:#8a5a00;color:#8a5a00}}
 .none.chosen{{background:#8a5a00;color:#fff}}
 .cmt{{display:block;font-size:12px;color:#6b6b58;margin-top:6px}}
 .cmt input{{display:block;width:100%;max-width:520px;font:inherit;padding:6px 8px;border:1px solid #d8d4c8;border-radius:6px;margin-top:3px}}
 .state{{font-size:12px;color:#6b6b58;margin-top:6px}}
 footer{{position:sticky;bottom:0;background:#fff;border-top:1px solid #d8d4c8;padding:12px 18px;display:flex;gap:12px;align-items:center}}
 #copy{{background:#0f7a4f;color:#fff;border-color:#0f7a4f;font-weight:700;padding:10px 16px}}
 #tally{{font-size:13px;color:#5a5a4a}}
 textarea{{width:100%;height:150px;font:12px/1.4 ui-monospace,Menlo,monospace;margin-top:10px;display:none}}
</style>
<header>
  <h1>{data["title"]}</h1>
  <p class="lede">Words: click each option to hear it, then mark ONE <b>accept, perfect</b> — or <b>closest, but not right</b> plus a comment, or <b>none are right</b>. Sentences: play, then <b>perfect</b> or <b>needs work</b>. Nothing is saved to the game until you send these back.</p>
</header>
<main>{"".join(cards)}</main>
<footer>
  <button id="copy">Copy all answers</button>
  <span id="tally">0 of {len(data["items"])} marked</span>
</footer>
<textarea id="out" readonly></textarea>
<script>
/* One shared WebAudio context with pre-decoded buffers: a per-tap Audio
   element is throttled in embedded viewers, which cost this project two
   listening rounds. */
const AC = new (window.AudioContext || window.webkitAudioContext)();
const buffers = new Map();
const bytes = (b64) => {{ const s = atob(b64); const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }};
async function play(btn) {{
  if (AC.state === "suspended") await AC.resume();
  const id = btn.dataset.id;
  if (!buffers.has(id)) buffers.set(id, await AC.decodeAudioData(bytes(btn.dataset.b64)));
  const src = AC.createBufferSource();
  src.buffer = buffers.get(id);
  src.connect(AC.destination);
  src.start();
  btn.classList.add("played");
}}
const answers = {{}};
function refresh(item) {{
  const a = answers[item] || {{}};
  const card = document.querySelector(`.card[data-item="${{item}}"]`);
  const state = card.querySelector(".state");
  state.textContent = a.verdict
    ? (a.verdict === "none" ? "marked: none are right" : `marked: ${{a.id}} — ${{a.verdict}}`)
    : "unmarked";
  card.classList.toggle("done", !!a.verdict);
  const done = Object.values(answers).filter((x) => x.verdict).length;
  document.getElementById("tally").textContent =
    done + " of " + document.querySelectorAll(".card").length + " marked";
}}
document.addEventListener("click", (e) => {{
  const t = e.target;
  if (t.classList.contains("play")) {{ play(t); return; }}
  if (t.classList.contains("mark")) {{
    const item = t.dataset.item;
    const card = document.querySelector(`.card[data-item="${{item}}"]`);
    card.querySelectorAll(".mark,.none").forEach((b) => b.classList.remove("chosen"));
    t.classList.add("chosen");
    answers[item] = {{ id: t.dataset.id, verdict: t.classList.contains("perfect") ? "perfect" : "closest",
      comment: (card.querySelector(".cmt input").value || "").trim() }};
    refresh(item);
  }}
  if (t.classList.contains("none")) {{
    const item = t.dataset.item;
    const card = document.querySelector(`.card[data-item="${{item}}"]`);
    card.querySelectorAll(".mark,.none").forEach((b) => b.classList.remove("chosen"));
    t.classList.add("chosen");
    answers[item] = {{ id: "", verdict: "none",
      comment: (card.querySelector(".cmt input").value || "").trim() }};
    refresh(item);
  }}
}});
document.addEventListener("input", (e) => {{
  if (!e.target.matches(".cmt input")) return;
  const item = e.target.dataset.item;
  if (answers[item]) answers[item].comment = e.target.value.trim();
}});
document.getElementById("copy").addEventListener("click", async () => {{
  const lines = ["BATCH: {data["title"]}"];
  document.querySelectorAll(".card").forEach((card) => {{
    const item = card.dataset.item;
    const a = answers[item];
    lines.push(a ? `${{item}} | ${{a.verdict}} | ${{a.id}} | ${{a.comment || ""}}`
                 : `${{item}} | UNMARKED | | `);
  }});
  const text = lines.join("\\n");
  const box = document.getElementById("out");
  box.value = text; box.style.display = "block";
  try {{ await navigator.clipboard.writeText(text); alert("Copied. Paste it back in the chat."); }}
  catch {{ box.select(); alert("Select the text below and copy it."); }}
}});
</script>'''
page.write_text(html)
print("wrote", page, f"({page.stat().st_size // 1024} KB)")
