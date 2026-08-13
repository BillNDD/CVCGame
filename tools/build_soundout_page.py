# Build the listening page for the three "sound out one word" lines.
#
# The page follows the owner's standing form: every arm gets
# perfect / good / iterate on this / no good, a free-text note that outranks the
# buttons, and a copy-all at the end. It embeds the audio as data URIs because
# the page must work with no network, the same promise the app makes (S6).
#
# Usage: python3 tools/build_soundout_page.py <round_dir> <out.html>
import json
import pathlib
import sys

CARD = """
  <section class="card" data-id="{id}">
    <p class="job">{why}</p>
    <p class="line">{text}</p>
    <button class="play" type="button" data-src="{id}">
      <span class="tri" aria-hidden="true"></span><span class="pl">Play</span>
      <span class="ms">{ms} ms</span></button>
    <audio id="a-{id}" preload="auto" src="data:audio/mpeg;base64,{b64}"></audio>
    <div class="verdicts">
      <button type="button" data-v="perfect">perfect</button>
      <button type="button" data-v="good">good</button>
      <button type="button" data-v="iterate">iterate on this</button>
      <button type="button" data-v="no good">no good</button>
    </div>
    <input class="note" type="text" placeholder="Your words about this line — these outrank the buttons">
  </section>
"""

HTML = """<title>Sound-Out Lines</title>
<style>
  :root{{--bg:#F7F9FC;--surface:#fff;--sunk:#EEF3FA;--ink:#16203A;--muted:#5B6B85;
    --rule:#DCE4F0;--blue:#1F4FD8;--green:#1B7A4B;--amber:#9A6206;--red:#C62828;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}}
  @media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0E1420;--surface:#161E2E;
    --sunk:#1B2536;--ink:#E7ECF5;--muted:#9AA9C0;--rule:#2A3446;--blue:#8FB0FF;
    --green:#6DD3A0;--amber:#E8B45C;--red:#FF8A80}}}}
  :root[data-theme="dark"]{{--bg:#0E1420;--surface:#161E2E;--sunk:#1B2536;--ink:#E7ECF5;
    --muted:#9AA9C0;--rule:#2A3446;--blue:#8FB0FF;--green:#6DD3A0;--amber:#E8B45C;--red:#FF8A80}}
  *{{box-sizing:border-box}}
  body{{background:var(--bg);color:var(--ink);font-family:var(--sans);margin:0;
    padding:2rem 1rem 5rem;font-size:16px;line-height:1.5;-webkit-text-size-adjust:100%}}
  main{{max-width:40rem;margin:0 auto;display:flex;flex-direction:column;gap:1.1rem}}
  .eyebrow{{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 .4rem}}
  h1{{font-family:var(--serif);font-size:clamp(1.9rem,7vw,2.6rem);font-weight:600;
    margin:0 0 .5rem;line-height:1.1;letter-spacing:-.01em}}
  .lede{{color:var(--muted);margin:0 0 .3rem}}
  .lede b{{color:var(--ink);font-weight:600}}
  .card{{background:var(--surface);border:1px solid var(--rule);border-radius:14px;padding:1.1rem}}
  .job{{font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin:0 0 .5rem}}
  .line{{font-family:var(--serif);font-size:1.35rem;margin:0 0 .9rem;line-height:1.35;text-wrap:balance}}
  button.play{{display:flex;align-items:center;gap:.7rem;width:100%;min-height:64px;
    border:0;border-radius:12px;background:var(--blue);color:#fff;font-family:var(--sans);
    font-size:1.05rem;font-weight:650;padding:0 1.1rem;cursor:pointer}}
  button.play .tri{{width:0;height:0;border-left:15px solid #fff;border-top:10px solid transparent;
    border-bottom:10px solid transparent;flex:none}}
  button.play[data-playing="1"] .tri{{border:0;width:14px;height:16px;background:#fff}}
  button.play .ms{{margin-left:auto;font-family:var(--mono);font-size:.78rem;opacity:.8;font-weight:400}}
  button.play[data-heard="1"]{{background:var(--muted)}}
  .verdicts{{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.7rem}}
  .verdicts button{{min-height:52px;border:2px solid var(--rule);border-radius:10px;
    background:var(--sunk);color:var(--ink);font-family:var(--sans);font-size:.95rem;
    font-weight:600;cursor:pointer}}
  .verdicts button[aria-pressed="true"][data-v="perfect"]{{border-color:var(--green);color:var(--green)}}
  .verdicts button[aria-pressed="true"][data-v="good"]{{border-color:var(--blue);color:var(--blue)}}
  .verdicts button[aria-pressed="true"][data-v="iterate"]{{border-color:var(--amber);color:var(--amber)}}
  .verdicts button[aria-pressed="true"][data-v="no good"]{{border-color:var(--red);color:var(--red)}}
  .verdicts button[aria-pressed="true"]{{background:var(--surface)}}
  input.note{{width:100%;margin-top:.6rem;min-height:48px;padding:.6rem .7rem;border-radius:10px;
    border:2px solid var(--rule);background:var(--surface);color:var(--ink);
    font-family:var(--sans);font-size:1rem}}
  input.note:focus{{outline:3px solid var(--blue);outline-offset:1px;border-color:var(--blue)}}
  button.copy{{width:100%;min-height:60px;border:0;border-radius:12px;background:var(--ink);
    color:var(--bg);font-weight:700;font-size:1.02rem;font-family:var(--sans);cursor:pointer}}
  button.copy[data-done="1"]{{background:var(--green);color:#fff}}
  pre#out{{margin:.7rem 0 0;padding:.8rem;background:var(--sunk);border:1px solid var(--rule);
    border-radius:10px;font-family:var(--mono);font-size:.78rem;white-space:pre-wrap;color:var(--muted)}}
  footer{{color:var(--muted);font-size:.8rem;border-top:1px solid var(--rule);padding-top:1rem}}
  footer code{{font-family:var(--mono);font-size:.76rem}}
</style>
<main>
  <header>
    <p class="eyebrow">Word Quest · listening round · 2026-08-13</p>
    <h1>Three lines, never heard</h1>
    <p class="lede">After a child reads a sentence, the game sounds out <b>one</b> word and says
      why. You chose these three from eight on 2026-08-12 and they take turns. The words are
      approved; <b>the audio has never been rendered or heard by anyone</b> — until now.</p>
    <p class="lede">All three are <code>af_heart</code> at speed 1.0, whole and plain, which is
      the settled recipe for a sentence rather than a choice I made. Listen with the sound up;
      they are about two seconds each.</p>
  </header>
{cards}
  <button class="copy" id="copy" type="button">Copy my verdicts</button>
  <pre id="out">Play one, then mark it.</pre>
  <footer>
    Rendered by <code>tools/render_soundout_lines.py</code>. Nothing is recorded anywhere until
    you send this back — a verdict that lives only in a chat log is one this project loses, so
    it goes into <code>tools/voice-words.csv</code>, <code>docs/voice-pack.md</code> and
    <code>docs/settled.md</code> the same day.
  </footer>
</main>
<script>
  const LINES = {lines};
  let current = null;
  document.querySelectorAll("button.play").forEach((b) => {{
    b.addEventListener("click", () => {{
      const a = document.getElementById("a-" + b.dataset.src);
      if (current && current !== a) {{ current.pause(); current.currentTime = 0;
        document.querySelectorAll('button.play').forEach(x => x.dataset.playing = "0"); }}
      if (!a.paused) {{ a.pause(); b.dataset.playing = "0"; return; }}
      current = a; a.currentTime = 0; a.play();
      b.dataset.playing = "1"; b.dataset.heard = "1";
      b.querySelector(".pl").textContent = "Playing";
      a.onended = () => {{ b.dataset.playing = "0"; b.querySelector(".pl").textContent = "Play again"; }};
    }});
  }});
  document.querySelectorAll(".verdicts button").forEach((b) => {{
    b.addEventListener("click", () => {{
      b.closest(".verdicts").querySelectorAll("button")
        .forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      build();
    }});
  }});
  document.querySelectorAll("input.note").forEach(i => i.addEventListener("input", build));
  function build() {{
    let t = "Word Quest — listening round, the three sound-out lines (2026-08-13)\\n";
    t += "af_heart, speed 1.0, whole and plain.\\n\\n";
    for (const l of LINES) {{
      const card = document.querySelector(`.card[data-id="${{l.id}}"]`);
      const v = card.querySelector('.verdicts button[aria-pressed="true"]');
      const note = card.querySelector("input.note").value.trim();
      t += `${{l.id}} — "${{l.text}}"\\n  verdict: ${{v ? v.dataset.v : "(not marked)"}}\\n`;
      if (note) t += `  my words: ${{note}}\\n`;
      t += `  sha256: ${{l.sha256}}\\n\\n`;
    }}
    document.getElementById("out").textContent = t;
    return t;
  }}
  document.getElementById("copy").addEventListener("click", (e) => {{
    const t = build(), btn = e.currentTarget, was = btn.textContent;
    const done = () => {{ btn.textContent = "Copied — paste it to me"; btn.dataset.done = "1";
      setTimeout(() => {{ btn.textContent = was; delete btn.dataset.done; }}, 2400); }};
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done, () => fb(t, btn, done));
    else fb(t, btn, done);
  }});
  function fb(t, btn, done) {{
    const ta = document.createElement("textarea");
    ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try {{ ok = document.execCommand("copy"); }} catch {{ ok = false; }}
    document.body.removeChild(ta);
    if (ok) return done();
    const r = document.createRange(); r.selectNodeContents(document.getElementById("out"));
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    btn.textContent = "Selected — press copy";
  }}
  build();
</script>
"""


def main():
    items = json.loads((pathlib.Path(sys.argv[1]) / "round.json").read_text())
    shas = {i["sha256"] for i in items}
    if len(shas) != len(items):
        raise SystemExit("two arms share a sha256 — round 8 offered a listener two identical "
                         "files as different candidates and wasted the round; refusing")
    cards = "".join(CARD.format(**i) for i in items)
    meta = [{"id": i["id"], "text": i["text"], "sha256": i["sha256"]} for i in items]
    out = pathlib.Path(sys.argv[2])
    out.write_text(HTML.format(cards=cards, lines=json.dumps(meta)))
    print(f"{len(items)} arms, {len(shas)} distinct clips -> {out} "
          f"({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
