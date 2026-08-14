# Natural sentence, or the same sentence stitched from its approved word clips?
#
# The owner ruled on 2026-08-12 that a sentence ships as ONE natural recording,
# on the strength of a measurement: over 40 approved sentences the concatenated
# word clips run 1.79 to 2.46 times the length of the recording, median 2.07,
# because a word said on its own is a citation form. They then asked to hear
# it rather than read it. This builds that comparison — every sentence of batch
# 3 both ways, side by side, on one page.
#
# WHAT THE STITCH IS. Each word's approved clip, cut back to its own speech
# using the lead and tail the pack already declares (tools/voice-edges.py), and
# butted straight together with no gap added. That is the BEST case for
# stitching, not a strawman: any gap between words would only make it longer
# and more mechanical. The whole is then given the pack's standard 80 ms lead
# and 300 ms tail, exactly as a natural sentence gets.
#
# WHAT IS NOT APPROVED IN IT. The article "a" has no approved clip in any
# round — it is the word batch 3 exists to close. The stitch needs one, so it
# borrows arm a_2 from that same batch, which nobody has yet judged. Twelve of
# the thirty-two sentences use it and every one of them says so on its card. A
# clip nobody has heard is never presented as if it were settled.
#
# Usage: python compare_stitch.py <batch3_dir> <out.html>
import base64
import hashlib
import json
import pathlib
import sys

import av
import lameenc
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
PEND = REPO / "tools" / "pending-words"
LEAD_MS, TAIL_MS, FADE_MS = 80, 300, 10


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def speech(a, sr, floor_db=-45.0):
    """The clip without its own leading and trailing silence — the same rule
    tools/voice-edges.py measures the pack with."""
    n = max(1, int(sr * 0.010))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > floor_db)[0]
    return a if not len(on) else a[int(on.min()) * n:(int(on.max()) + 1) * n]


def encode(a, sr):
    a = np.clip(np.asarray(a, np.float32), -1, 1).copy()
    n = int(FADE_MS / 1000 * sr)
    if len(a) > 2 * n + 10:
        a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    a = np.concatenate([np.zeros(int(LEAD_MS / 1000 * sr), np.float32), a,
                        np.zeros(int(TAIL_MS / 1000 * sr), np.float32)])
    pcm = (a * 32767).astype(np.int16)
    e = lameenc.Encoder(); e.set_bit_rate(96); e.set_in_sample_rate(sr)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush(), int(len(pcm) * 1000 / sr)


def main():
    batch = pathlib.Path(sys.argv[1])
    data = json.loads((batch / "batch-data.json").read_text(encoding="utf-8"))
    manifest = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    # The unapproved stand-in for "a", taken from batch 3's own word card.
    a_arm = next(x for it in data["items"] if it["kind"] == "word"
                 for x in it["arms"] if x["id"] == "a_2")
    a_bytes = base64.b64decode(a_arm["b64"])
    (batch / "a_2.mp3").write_bytes(a_bytes)

    def clip_for(w):
        if "w:" + w in manifest:
            return PACK / manifest["w:" + w]["file"], True
        if (PEND / f"w-{w}.mp3").exists():
            return PEND / f"w-{w}.mp3", True
        if w == "a":
            return batch / "a_2.mp3", False       # rendered, never judged
        return None, False

    rows, skipped = [], []
    for item in data["items"]:
        if item["kind"] != "sentence":
            continue
        text, level = item["text"], item["note"]
        words = text.lower().replace(",", " ").replace(".", " ").replace("?", " ") \
                    .replace("!", " ").replace("“", " ").replace("”", " ").split()
        parts, sr, unapproved = [], None, []
        for w in words:
            p, approved = clip_for(w)
            if p is None:
                skipped.append((text, w)); parts = None; break
            a, s = load(p)
            sr = s if sr is None else sr
            parts.append(speech(a, s))
            if not approved:
                unapproved.append(w)
        if parts is None:
            continue
        stitched = np.concatenate(parts)
        mp3, ms = encode(stitched, sr)
        nat = item["arms"][0]
        rows.append({
            "text": text, "level": level,
            "nat_b64": nat["b64"], "nat_ms": nat["ms"],
            "st_b64": base64.b64encode(mp3).decode(), "st_ms": ms,
            "sha": hashlib.sha256(mp3).hexdigest(),
            "unapproved": sorted(set(unapproved)), "words": len(words),
        })
    if skipped:
        for t, w in skipped:
            print(f"SKIPPED (no clip for '{w}'): {t}")
    ratios = [r["st_ms"] / r["nat_ms"] for r in rows]
    print(f"{len(rows)} sentences built both ways")
    print(f"stitched / natural: min {min(ratios):.2f}  median {sorted(ratios)[len(ratios)//2]:.2f}  max {max(ratios):.2f}")
    shas = {r["sha"] for r in rows}
    print(f"distinct stitched clips: {len(shas)} of {len(rows)}"
          + ("  <-- DUPLICATES, do not offer this" if len(shas) != len(rows) else ""))
    return rows, ratios


if __name__ == "__main__":
    rows, ratios = main()
    med = sorted(ratios)[len(ratios) // 2]
    cards = "".join(f'''
<section class="card" data-item="{r["text"]}">
  <div class="head"><h2>{r["text"]}</h2><span class="lv">{r["level"]} &middot; {r["words"]} words</span></div>
  {'<p class="warn">Uses <b>' + ", ".join(r["unapproved"]) + '</b>, which has no approved clip in any round. The stitch borrows arm a_2 from batch 3, which nobody has judged yet.</p>' if r["unapproved"] else ''}
  <div class="ab">
    <div class="side"><button class="play" data-b64="{r["nat_b64"]}">&#9654; Natural</button>
      <span class="ms">one recording &middot; {r["nat_ms"]} ms</span></div>
    <div class="side"><button class="play" data-b64="{r["st_b64"]}">&#9654; Stitched</button>
      <span class="ms">{r["words"]} word clips &middot; {r["st_ms"]} ms &middot; <b>{r["st_ms"]/r["nat_ms"]:.2f}&times;</b></span></div>
  </div>
  <div class="marks">
    <button class="mark" data-item="{r["text"]}" data-v="natural">natural is better</button>
    <button class="mark" data-item="{r["text"]}" data-v="stitched">stitched is fine</button>
    <button class="mark" data-item="{r["text"]}" data-v="either">no real difference</button>
  </div>
  <div class="cmt"><input data-item="{r["text"]}" placeholder="what you heard (optional)"></div>
</section>''' for r in rows)

    page = f'''<title>Natural or stitched</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{{color-scheme:light dark}}
body{{margin:0;background:#faf9f6;color:#1a1a2e;font:15px/1.55 ui-serif,Georgia,serif}}
header{{position:sticky;top:0;background:#fff;border-bottom:1px solid #d8d4c8;padding:12px 16px;z-index:5}}
h1{{margin:0;font-size:17px}}
.sub{{font-size:13px;color:#5a5a6e;margin-top:4px}}
main{{padding:0 16px 140px;max-width:720px;margin:0 auto}}
.card{{background:#fff;border:1px solid #e3dfd4;border-radius:12px;padding:14px;margin:14px 0}}
.head{{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px}}
h2{{margin:0;font-size:19px;font-weight:600}}
.lv{{font-size:12px;color:#6b6b80;background:#f3f1ea;border-radius:20px;padding:2px 9px}}
.warn{{font-size:12.5px;color:#8a4b00;background:#fff5e6;border:1px solid #f0d9b0;border-radius:8px;padding:7px 9px;margin:9px 0 0}}
.ab{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}}
@media(max-width:520px){{.ab{{grid-template-columns:1fr}}}}
.side{{display:flex;flex-direction:column;gap:5px}}
.play{{min-height:56px;font:600 16px/1.2 inherit;border:1px solid #c9c3b2;background:#f7f5ef;border-radius:10px;cursor:pointer}}
.play.on{{background:#1a1a2e;color:#fff}}
.ms{{font-size:12px;color:#6b6b80;text-align:center}}
.marks{{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}}
.mark{{min-height:44px;padding:0 12px;font:14px/1.2 inherit;border:1px solid #c9c3b2;background:#fff;border-radius:8px;cursor:pointer}}
.mark.chosen{{background:#1a5c3a;color:#fff;border-color:#1a5c3a}}
.cmt input{{width:100%;margin-top:9px;padding:9px;font:14px inherit;border:1px solid #ddd8cc;border-radius:8px;box-sizing:border-box}}
footer{{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #d8d4c8;padding:10px 16px}}
#copy{{min-height:52px;width:100%;font:600 15px inherit;border:0;border-radius:10px;background:#1a1a2e;color:#fff;cursor:pointer}}
#status{{font-size:12.5px;color:#5a5a6e;margin-top:6px}}
#out{{width:100%;height:130px;margin-top:8px;font:12px ui-monospace,monospace;box-sizing:border-box}}
@media(prefers-color-scheme:dark){{
 body{{background:#12121a;color:#e8e6df}} header,footer,.card{{background:#1b1b26;border-color:#33323f}}
 .play{{background:#242433;color:#e8e6df;border-color:#3a3a4a}} .lv{{background:#26263a;color:#b9b7c8}}
 .warn{{background:#3a2a10;border-color:#6b5220;color:#f0d9b0}}
 .mark{{background:#1b1b26;color:#e8e6df;border-color:#3a3a4a}} .cmt input{{background:#12121a;color:#e8e6df;border-color:#3a3a4a}}}}
</style>
<header>
  <h1>Natural or stitched?</h1>
  <div class="sub">{len(rows)} sentences, each one both ways. <b>Natural</b> is one recording of the whole sentence.
  <b>Stitched</b> is the same sentence built from the approved clip of each word, trimmed to its own speech and
  butted together with no gap — the best case, not a strawman. Median cost: <b>{med:.2f}&times; longer</b>.</div>
</header>
<main>{cards}</main>
<footer>
  <button id="copy">Show my answers</button>
  <div id="status"></div>
  <textarea id="out" hidden readonly></textarea>
</footer>
<script>
const answers = JSON.parse(localStorage.getItem("stitchAB") || "{{}}");
let audio = null, lastTap = 0;
function play(btn) {{
  document.querySelectorAll(".play.on").forEach((b) => b.classList.remove("on"));
  if (audio) {{ audio.pause(); audio = null; }}
  const bin = Uint8Array.from(atob(btn.dataset.b64), (c) => c.charCodeAt(0));
  audio = new Audio(URL.createObjectURL(new Blob([bin], {{type: "audio/mpeg"}})));
  btn.classList.add("on");
  audio.onended = () => btn.classList.remove("on");
  audio.play().catch(() => btn.classList.remove("on"));
}}
/* Touch as well as click: a tap inside an embedded viewer does not always
   arrive as a click, and a page wired to click alone can be dead on a phone
   while working on a laptop. */
const handle = (e) => {{
  if (e.type === "pointerup") lastTap = Date.now();
  else if (Date.now() - lastTap < 700) return;
  const t = e.target.closest("button");
  if (!t) return;
  if (t.classList.contains("play")) {{ play(t); return; }}
  if (t.classList.contains("mark")) {{
    const item = t.dataset.item;
    const card = document.querySelector(`.card[data-item="${{CSS.escape(item)}}"]`);
    card.querySelectorAll(".mark").forEach((b) => b.classList.remove("chosen"));
    t.classList.add("chosen");
    answers[item] = {{v: t.dataset.v, c: (card.querySelector(".cmt input").value || "").trim()}};
    localStorage.setItem("stitchAB", JSON.stringify(answers));
    return;
  }}
  if (t.id === "copy") {{
    const lines = [...document.querySelectorAll(".card")].map((c) => {{
      const k = c.dataset.item, a = answers[k];
      return a ? `${{k}} | ${{a.v}} | ${{a.c || ""}}` : `${{k}} | UNMARKED |`;
    }});
    const tally = {{}};
    Object.values(answers).forEach((a) => {{ tally[a.v] = (tally[a.v] || 0) + 1; }});
    const text = lines.join("\\n") + "\\n\\nTALLY: " + JSON.stringify(tally);
    const box = document.getElementById("out");
    box.hidden = false; box.value = text; box.focus(); box.setSelectionRange(0, text.length);
    let copied = false;
    try {{ navigator.clipboard.writeText(text); copied = true; }} catch {{}}
    document.getElementById("status").textContent = copied
      ? "Copied. The text is also below, already selected — paste it back in the chat."
      : "The clipboard is blocked here. The text below is selected: copy it and paste it back in the chat.";
  }}
}};
document.addEventListener("pointerup", handle);
document.addEventListener("click", handle);
document.addEventListener("input", (e) => {{
  if (!e.target.matches(".cmt input")) return;
  const k = e.target.dataset.item;
  if (answers[k]) {{ answers[k].c = e.target.value.trim(); localStorage.setItem("stitchAB", JSON.stringify(answers)); }}
}});
window.addEventListener("DOMContentLoaded", () => {{
  Object.keys(answers).forEach((k) => {{
    const card = document.querySelector(`.card[data-item="${{CSS.escape(k)}}"]`);
    if (!card) return;
    const b = card.querySelector(`.mark[data-v="${{answers[k].v}}"]`);
    if (b) b.classList.add("chosen");
    if (answers[k].c) card.querySelector(".cmt input").value = answers[k].c;
  }});
}});
</script>'''
    pathlib.Path(sys.argv[2]).write_text(page, encoding="utf-8")
    print(f"wrote {sys.argv[2]} ({len(page)//1024} KB)")
