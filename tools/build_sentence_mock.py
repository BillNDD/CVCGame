# Build the sentence-reveal prototype for the owner's approval.
#
# WHAT IT IS, AND WHAT IT IS NOT. This is a MOCKUP of a presentation, not the
# running game: the app has no sentence support at all yet. It is honest in the
# one way that matters for judging a presentation — every sound in it is REAL
# APPROVED AUDIO from the pack, not a placeholder and not a fresh render:
#   - the sentence is s:mode-s01, graded perfect in sentence batch 1;
#   - the invitation is soundout-2, graded PERFECT by the owner today;
#   - the per-sound and per-word clips are the shipped pack's own files.
# Nothing here is offered as evidence that the feature works, because it does
# not exist. It is offered so a person can tap it and say yes or no.
#
# THE DESIGN IS THE OWNER'S, given 2026-08-13 and answered the same day:
#   1. the sentence is read whole;
#   2. an invitation line plays, and the LEVEL'S NEW WORD takes the tile ring,
#      its pieces appear, and the voice says the sounds then the word;
#   3. after that it is child-driven: tapping any other word shows its pieces
#      SILENTLY — answer 1 and 3, "just pieces", "taps only show pieces";
#   4. exactly one word is ever open; opening another closes the last;
#   5. the sentence reads again to close, and a tap during that read INTERRUPTS
#      it — answer 4.
# The ring is the existing .wq-tile.wq-pop outline, not a new circle — answer 2.
#
# Usage: python3 tools/build_sentence_mock.py <out.html>
import base64
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
VOICE = REPO / "app/public/voice"
PENDING = REPO / "tools/pending-words"

SENTENCE = "The cat sat on the mat."
NEW_WORD = "cat"                       # the word Level 2 is teaching in this sentence
# The engine's own split, so the mock cannot disagree with the game about tiles.
PIECES = {
    "the": [("th", "d-th_this"), ("e", "d-short_e")],
    "cat": [("c", "d-k"), ("a", "d-short_a"), ("t", "d-t")],
    "sat": [("s", "d-s"), ("a", "d-short_a"), ("t", "d-t")],
    "on": [("o", "d-short_o"), ("n", "d-n")],
    "mat": [("m", "d-m"), ("a", "d-short_a"), ("t", "d-t")],
}


def b64(p):
    return base64.b64encode(pathlib.Path(p).read_bytes()).decode()


def main():
    out = pathlib.Path(sys.argv[1])
    clips = {
        "sentence": b64(PENDING / "s-mode-s01.mp3"),
        "invite": b64("/tmp/soundout/soundout-2.mp3"),
    }
    missing = []
    for word, parts in PIECES.items():
        clips[f"w:{word}"] = b64(VOICE / f"w-{word}.mp3") if (VOICE / f"w-{word}.mp3").exists() else ""
        if not clips[f"w:{word}"]:
            missing.append(f"w-{word}.mp3")
        for _, sid in parts:
            if sid in clips:
                continue
            f = VOICE / f"{sid}.mp3"
            if f.exists():
                clips[sid] = b64(f)
            else:
                missing.append(f"{sid}.mp3")
    if missing:
        raise SystemExit("refusing to build a mock with silent gaps in it: " + ", ".join(missing))

    data = {"sentence": SENTENCE, "newWord": NEW_WORD,
            "pieces": {w: [{"t": t, "s": s} for t, s in p] for w, p in PIECES.items()}}
    html = TEMPLATE.replace("__DATA__", json.dumps(data)).replace("__CLIPS__", json.dumps(clips))
    out.write_text(html)
    print(f"prototype -> {out} ({out.stat().st_size // 1024} KB), "
          f"{len(clips)} real approved clips, 0 placeholders")


TEMPLATE = r"""<title>Sentence Reveal</title>
<style>
  :root{--ink:#17356B;--ink2:#4A6491;--sun:#FFD766;--line:#DCE4F0;--green:#1B7A4B;
    --bg:#F7F9FC;--surface:#fff;--muted:#5B6B85;--blue:#1F4FD8;
    --round:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;
    --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --bg:#0E1420;--surface:#161E2E;--muted:#9AA9C0;--line:#2A3446;--blue:#8FB0FF;--green:#6DD3A0}}
  :root[data-theme="dark"]{--bg:#0E1420;--surface:#161E2E;--muted:#9AA9C0;--line:#2A3446;
    --blue:#8FB0FF;--green:#6DD3A0}
  *{box-sizing:border-box}
  body{background:var(--bg);margin:0;padding:1.5rem 1rem 4rem;font-family:var(--sans);
    color:var(--ink);-webkit-text-size-adjust:100%}
  main{max-width:34rem;margin:0 auto;display:flex;flex-direction:column;gap:1rem}
  .eyebrow{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 .3rem}
  h1{font-family:var(--round);font-size:1.7rem;margin:0 0 .4rem;color:var(--ink)}
  .lede{color:var(--muted);font-size:.95rem;margin:0;line-height:1.5}
  .lede b{color:var(--ink)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) h1,
    :root:not([data-theme="light"]) .lede b{color:#E7ECF5}}
  :root[data-theme="dark"] h1,:root[data-theme="dark"] .lede b{color:#E7ECF5}

  /* The stage, in the game's own colours and shapes. */
  .phone{background:linear-gradient(160deg,#8fd0fa 0%,#b9c3fb 55%,#d9c6fb 100%);
    border-radius:20px;padding:1.1rem .9rem 1.3rem;box-shadow:0 8px 30px rgba(23,53,107,.18);
    font-family:var(--round);color:#17356B}
  .cue{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#4A6491;
    text-align:center;margin:0 0 .8rem;min-height:1.1em}
  .sent{display:flex;flex-wrap:wrap;gap:.35rem .5rem;justify-content:center;margin:0 0 .5rem}
  .w{display:flex;flex-direction:column;align-items:center;gap:.35rem;background:none;
    border:0;padding:.15rem .2rem;font-family:var(--round);color:#17356B;cursor:pointer}
  .wt{font-size:1.85rem;font-weight:700;line-height:1.05;border-bottom:3px solid transparent;
    border-radius:3px;padding:0 .06em}
  .w[data-open="1"] .wt{border-bottom-color:#17356B}
  .w[data-new="1"] .wt{text-decoration:underline dotted rgba(23,53,107,.35);text-underline-offset:5px}
  .tiles{display:flex;gap:5px;min-height:34px;align-items:center}
  .tile{background:#FFD766;color:#17356B;border-radius:9px;padding:3px 8px;font-size:.95rem;
    font-weight:700;box-shadow:0 1px 3px rgba(23,53,107,.18)}
  /* The EXISTING ring, copied from app/src/wq-css.js: a hard outline for as long
     as that sound plays, no movement and no scaling. */
  .tile.pop{animation:wqpop var(--wqpop,420ms) steps(1,end)}
  @keyframes wqpop{0%,99%{outline:4px solid #17356B;outline-offset:3px}100%{outline:0 solid transparent}}
  .msg{min-height:2.6em;display:flex;align-items:center;justify-content:center;text-align:center;
    font-size:1rem;font-weight:600;color:#17356B;margin-top:.4rem;line-height:1.35}
  .rail{margin-top:.7rem}
  .next{display:block;width:100%;min-height:56px;border:0;border-radius:999px;background:#1B7A4B;
    color:#fff;font-family:var(--round);font-size:1.05rem;font-weight:700;cursor:pointer}
  .next:disabled{background:#9fb4c4;color:#17356B;cursor:default}

  .ctl{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
  .ctl button{min-height:54px;border:2px solid var(--line);border-radius:11px;background:var(--surface);
    color:var(--ink);font-family:var(--sans);font-weight:650;font-size:.95rem;cursor:pointer}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ctl button{color:#E7ECF5}}
  :root[data-theme="dark"] .ctl button{color:#E7ECF5}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:1rem}
  .card h2{font-size:1.02rem;margin:0 0 .5rem;font-family:var(--sans);color:var(--ink)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .card h2{color:#E7ECF5}}
  :root[data-theme="dark"] .card h2{color:#E7ECF5}
  ol{margin:0;padding-left:1.15rem;color:var(--muted);font-size:.92rem;line-height:1.55}
  ol b{color:var(--ink)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) ol b{color:#E7ECF5}}
  :root[data-theme="dark"] ol b{color:#E7ECF5}
  .verdicts{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.3rem}
  .verdicts button{min-height:54px;border:2px solid var(--line);border-radius:11px;
    background:var(--bg);color:var(--ink);font-family:var(--sans);font-weight:650;font-size:.95rem;cursor:pointer}
  .verdicts button[aria-pressed="true"]{border-color:var(--green);color:var(--green);background:var(--surface)}
  input.note{width:100%;margin-top:.55rem;min-height:48px;padding:.6rem .7rem;border-radius:10px;
    border:2px solid var(--line);background:var(--surface);color:var(--ink);font-size:1rem;font-family:var(--sans)}
  button.copy{width:100%;min-height:58px;border:0;border-radius:12px;background:var(--ink);
    color:#fff;font-weight:700;font-size:1rem;font-family:var(--sans);cursor:pointer}
  button.copy[data-done="1"]{background:var(--green)}
  pre#out{margin:.6rem 0 0;padding:.75rem;background:var(--bg);border:1px solid var(--line);
    border-radius:10px;font-family:var(--mono);font-size:.76rem;white-space:pre-wrap;color:var(--muted)}
  footer{color:var(--muted);font-size:.78rem;border-top:1px solid var(--line);padding-top:.9rem;line-height:1.5}
  footer code{font-family:var(--mono);font-size:.74rem}
</style>
<main>
  <header>
    <p class="eyebrow">Word Quest · presentation prototype · 2026-08-13</p>
    <h1>The sentence reveal</h1>
    <p class="lede">Your design, built. <b>Every sound in it is real approved audio</b> — the
      sentence graded perfect in batch 1, the invitation you graded perfect an hour ago, and the
      pack's own sound and word clips. <b>It is a mockup, not the game</b>: the app has no
      sentence support yet, so nothing here proves the feature works. It exists so you can tap
      it and say yes or no.</p>
  </header>

  <div class="phone">
    <p class="cue" id="cue">tap Play to begin</p>
    <div class="sent" id="sent"></div>
    <div class="msg" id="msg"></div>
    <div class="rail"><button class="next" id="next" disabled>Next word ➡️</button></div>
  </div>

  <div class="ctl">
    <button id="play" type="button">▶︎ Play the reveal</button>
    <button id="reset" type="button">↻ Start over</button>
  </div>

  <div class="card">
    <h2>What you are looking at</h2>
    <ol>
      <li>The sentence is read whole.</li>
      <li>An invitation plays, and <b>cat</b> — the word this level teaches — takes the ring,
        its pieces appear, and the voice says the sounds then the word.</li>
      <li>After that it is the child's: tap any word to see its pieces, <b>silently</b>.</li>
      <li><b>Only one word is ever open.</b> Opening another closes the last.</li>
      <li>The sentence reads again to close — and <b>a tap interrupts it</b>.</li>
    </ol>
  </div>

  <div class="card">
    <h2>Your verdict on the presentation</h2>
    <div class="verdicts">
      <button type="button" data-v="approved">approved, build it</button>
      <button type="button" data-v="close">close — change one thing</button>
      <button type="button" data-v="iterate">iterate on this</button>
      <button type="button" data-v="no">no, try again</button>
    </div>
    <input class="note" id="note" type="text" placeholder="Your words — these outrank the buttons">
  </div>

  <button class="copy" id="copy" type="button">Copy my verdict</button>
  <pre id="out">Play it, then mark it.</pre>

  <footer>
    Built by <code>tools/build_sentence_mock.py</code>. The tile ring is the app's own
    <code>.wq-tile.wq-pop</code> outline, not a new shape. One question is still open and I have
    not assumed an answer: <b>what ends the item</b> — the grown-up's control whenever they
    like, or must the closing read finish first? The mock lets you advance at any time.
  </footer>
</main>
<script>
const DATA = __DATA__, CLIPS = __CLIPS__;
const el = (id) => document.getElementById(id);
const sentEl = el("sent"), cue = el("cue"), msg = el("msg"), next = el("next");
let open = null, phase = "idle", audio = null, seq = 0;

const src = (k) => "data:audio/mpeg;base64," + CLIPS[k];
function play(k) {
  return new Promise((res) => {
    if (!CLIPS[k]) return res();
    if (audio) { audio.pause(); audio.currentTime = 0; }
    audio = new Audio(src(k));
    audio.onended = res; audio.onerror = res;
    audio.play().catch(res);
  });
}
function stop() { if (audio) { audio.pause(); audio.currentTime = 0; audio = null; } }

const WORDS = DATA.sentence.replace(/[.]/g, "").split(" ");
function build() {
  sentEl.innerHTML = "";
  WORDS.forEach((raw, i) => {
    const key = raw.toLowerCase();
    const b = document.createElement("button");
    b.className = "w"; b.dataset.key = key; b.dataset.i = i;
    b.setAttribute("aria-label", raw);
    if (key === DATA.newWord) b.dataset.new = "1";
    b.innerHTML = `<span class="wt">${raw}</span><span class="tiles"></span>`;
    b.addEventListener("click", () => tap(b));
    sentEl.appendChild(b);
  });
}
function closeAll() {
  sentEl.querySelectorAll(".w").forEach((w) => {
    w.dataset.open = "0"; w.querySelector(".tiles").innerHTML = "";
  });
  open = null;
}
function reveal(b) {
  closeAll();
  const parts = DATA.pieces[b.dataset.key] || [];
  const box = b.querySelector(".tiles");
  parts.forEach((p) => {
    const t = document.createElement("span");
    t.className = "tile"; t.textContent = p.t; box.appendChild(t);
  });
  b.dataset.open = "1"; open = b;
  return parts;
}
/* A TAP INTERRUPTS. Answer 4: if the child taps while the sentence is reading
   again, the read stops. Nothing is spoken for a tapped word — answers 1 and 3,
   "just pieces". */
function tap(b) {
  if (phase === "idle") return;
  seq += 1; stop();
  cue.textContent = "the child is looking";
  msg.textContent = "";
  if (open === b) { closeAll(); return; }
  reveal(b);
}
async function run() {
  const mine = ++seq;
  phase = "reading"; closeAll(); next.disabled = true;
  cue.textContent = "reading the sentence";
  msg.textContent = "";
  await play("sentence");
  if (mine !== seq) return;

  cue.textContent = "one word, together";
  msg.textContent = "Let’s sound out one word together.";
  await play("invite");
  if (mine !== seq) return;

  const b = sentEl.querySelector('.w[data-new="1"]');
  const parts = reveal(b);
  next.disabled = false;
  const tiles = [...b.querySelectorAll(".tile")];
  for (let i = 0; i < parts.length; i++) {
    if (mine !== seq) return;
    tiles[i].classList.add("pop");
    await play(parts[i].s);
    tiles[i].classList.remove("pop");
    await new Promise((r) => setTimeout(r, 90));
  }
  if (mine !== seq) return;
  await play("w:" + b.dataset.key);
  if (mine !== seq) return;

  phase = "open";
  cue.textContent = "reading it again";
  await play("sentence");
  if (mine !== seq) return;
  cue.textContent = "tap any word to see its pieces";
  msg.textContent = "";
}
el("play").addEventListener("click", run);
el("reset").addEventListener("click", () => {
  seq += 1; stop(); phase = "idle"; closeAll();
  cue.textContent = "tap Play to begin"; msg.textContent = ""; next.disabled = true;
});
next.addEventListener("click", () => { seq += 1; stop(); cue.textContent = "…on to the next word"; });

document.querySelectorAll(".verdicts button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".verdicts button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  outText();
}));
el("note").addEventListener("input", outText);
function outText() {
  const v = document.querySelector('.verdicts button[aria-pressed="true"]');
  const n = el("note").value.trim();
  let t = "Word Quest — the sentence reveal, presentation verdict (2026-08-13)\n\n";
  t += "verdict: " + (v ? v.dataset.v : "(not marked)") + "\n";
  if (n) t += "my words (these win): " + n + "\n";
  el("out").textContent = t;
  return t;
}
el("copy").addEventListener("click", (e) => {
  const t = outText(), btn = e.currentTarget, was = btn.textContent;
  const done = () => { btn.textContent = "Copied — paste it to me"; btn.dataset.done = "1";
    setTimeout(() => { btn.textContent = was; delete btn.dataset.done; }, 2400); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done, () => fb(t, btn, done));
  else fb(t, btn, done);
});
function fb(t, btn, done) {
  const ta = document.createElement("textarea");
  ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  if (ok) return done();
  btn.textContent = "Select the box above and copy";
}
build(); outText();
</script>
"""

if __name__ == "__main__":
    main()
