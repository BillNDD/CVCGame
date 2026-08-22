/* What happens AFTER "got it" when the thing on screen is a sentence.
 *
 * The word reveal is settled and shipped: praise, the word, "Pronounced:",
 * each sound on its own tile's moment, then the word again (SPEC section 5a).
 * A sentence cannot simply inherit it. Nine words sounded out one at a time is
 * a different experience from one word sounded out, and the difference is
 * mostly LENGTH — which is exactly the thing a page of prose cannot settle and
 * an ear can. So this builds the three candidate shapes out of real approved
 * bytes, at the app's own seams, and prints how long each one actually runs.
 *
 * NOTHING HERE IS A MOCK. Every clip is a file the owner has already graded:
 * the sentence recordings and "Let's sound it out." from tools/pending-words/,
 * the word clips and the sound clips from the shipped pack. The play order and
 * the two seams (700 ms between clips, 500 ms between sounds) are read from
 * the engine, not retyped. What the page cannot show is the tile animation,
 * which is driven by the same plan in the app.
 *
 * This is a PROPOSAL for an unbuilt mode. Sentence mode is not in the game;
 * SPEC section 12 has it as ruled and not built. Do not read a verdict here as
 * a shipped feature.
 *
 * Usage: node tools/build-sentence-reveal.mjs <out.html>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chunkWord, soundIdsFor, seamMs, isSeam } from "../src/engine.js";

const OUT = process.argv[2] || "sentence-reveal.html";
const PACK = "app/public/voice";
const PEND = "tools/pending-words";
const MAN = JSON.parse(readFileSync(`${PACK}/manifest.json`, "utf8"));
const LEDGER = JSON.parse(readFileSync(`${PEND}/pending-words.json`, "utf8"));

/* The two sentences: the longest approved one whose every word is in the pack,
   and a shorter one for contrast. Both are graded "perfect" in the ledger. */
const WANT = ["The hen and the pig ran to the pen.", "The king said yes to the quiz."];
/* The word a sentence would be sounding out if it sounded out only ONE: the
   last word that is not a heart word, which is where a sentence's new teaching
   normally sits. Named per sentence rather than computed, because "which word
   is the new one" is a teaching decision and not a rule this tool may invent. */
const TARGET = { "The hen and the pig ran to the pen.": "pen", "The king said yes to the quiz.": "quiz" };

const words = (t) => t.toLowerCase().replace(/[.,!?]/g, " ").split(/\s+/).filter(Boolean);

function clip(id) {
  if (MAN[id]) {
    const m = MAN[id];
    return { id, b64: readFileSync(`${PACK}/${m.file}`).toString("base64"),
             lead: m.lead || 0, tail: m.tail || 0, ms: m.ms };
  }
  const rec = Object.entries(LEDGER).find(([k]) => k === id);
  if (rec) {
    const f = `${PEND}/${rec[1].file || (id.startsWith("s:") ? id.replace("s:", "s-") + ".mp3" : "")}`;
    if (existsSync(f))
      return { id, b64: readFileSync(f).toString("base64"), lead: 80, tail: 300, ms: rec[1].ms };
  }
  throw new Error(`no approved clip for ${id} — a clip nobody has heard is never offered`);
}

/* The word reveal, exactly as clipPlan() builds it, minus the praise clip:
   the word, "Pronounced:", each sound, the word again. */
const wordReveal = (w) => ["w:" + w, "seam2", "s:pronounced",
  ...soundIdsFor(w).flatMap((id) => ["seam2", id]), "seam2", "w:" + w];

function arms(text) {
  const sentenceId = Object.keys(LEDGER).find((k) => LEDGER[k].text === text);
  const ws = words(text);
  const target = TARGET[text];
  return [
    { key: "A", name: "every word sounded out",
      why: "The word reveal, repeated for each word in the sentence. Nothing is left to chance and the child hears every letter do its job.",
      plan: ["p:0", "seam", sentenceId, "seam",
        ...ws.flatMap((w) => ["s:sound-it-out", "seam2", ...wordReveal(w), "seam"]),
        sentenceId] },
    { key: "B", name: `one word sounded out — “${target}”`,
      why: `The sentence, then the reveal for the one word the sentence is teaching, then the sentence again so it lands back in place.`,
      plan: ["p:0", "seam", sentenceId, "seam", "s:sound-it-out", "seam2",
        ...wordReveal(target), "seam", sentenceId] },
    { key: "C", name: "no sound-out — the sentence again",
      why: "Praise, then the sentence read back. The shape a fluency round would use once the words inside are already known.",
      plan: ["p:0", "seam", sentenceId, "seam", sentenceId] },
  ];
}

const cards = WANT.map((text) => {
  const built = arms(text).map((a) => {
    /** @type {Array<{ seam?: number, id?: string, b64?: string, lead?: number, tail?: number, ms?: number }>} */
    const clips = a.plan.map((p) => (isSeam(p) ? { seam: seamMs(p) } : clip(p)));
    let ms = 0;
    clips.forEach((c, i) => {
      if (c.seam) return;
      ms += c.ms;
      const next = clips[i + 1];
      if (!next) return;
      const gap = next.seam ? next.seam : 0;
      const after = next.seam ? clips[i + 2] : next;
      if (after && !after.seam) ms += gap - c.tail - after.lead;
    });
    return { ...a, clips, ms: Math.round(ms) };
  });
  return { text, words: words(text).length, arms: built,
           tiles: words(text).map((w) => ({ w, g: chunkWord(w), s: soundIdsFor(w).map((s) => s.slice(2)) })) };
});

const page = `<!doctype html><meta charset="utf-8">
<title>A sentence, after “got it”</title>
<style>
 :root{--ink:#17356b;--ink2:#4a5f85;--line:#dfe6f3;--chip:#eef3fb;--ok:#2e9e5b}
 body{font:16px/1.55 ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
   max-width:840px;margin:0 auto;padding:26px 18px 100px;background:#fff}
 h1{font-size:25px;margin:0 0 4px} .sub{color:var(--ink2);margin:0 0 14px}
 .note{background:var(--chip);border-radius:12px;padding:13px 15px;font-size:14.5px;margin:0 0 22px}
 .say{font-size:24px;font-weight:800;margin:26px 0 8px}
 .tiles{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 16px}
 .wd{display:flex;gap:4px}
 .tile{background:#ffd76a;border-radius:10px;padding:5px 11px;font-size:18px;font-weight:800;
   box-shadow:0 1px 3px rgba(23,53,107,.18);text-align:center;min-width:14px}
 .tile small{display:block;font-size:10px;font-weight:700;color:#7a6320;letter-spacing:.05em}
 .card{border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0}
 .arm{font-size:18px;font-weight:800;margin:0 0 3px}
 .why{font-size:14.5px;color:var(--ink2);margin:0 0 11px}
 button{font:inherit;font-weight:800;border:0;border-radius:999px;background:var(--ink);color:#fff;
   padding:12px 20px;min-height:48px;cursor:pointer}
 .len{font-size:13.5px;color:var(--ink2);margin-top:9px}
 .len b{font-variant-numeric:tabular-nums}
 .verdicts{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
 .v{font-size:14px;font-weight:800;border:0;border-radius:999px;padding:9px 14px;min-height:44px;
   cursor:pointer;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
 .v[aria-pressed="true"]{background:var(--ok);color:#fff;box-shadow:none}
 .bar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);padding:13px 0 15px;
   margin-top:26px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
 textarea{width:100%;min-height:120px;font:13px/1.5 ui-monospace,Menlo,monospace;
   border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
</style>
<h1>A sentence, after “got it”</h1>
<p class="sub">Three shapes for the same moment, built from clips you have already graded.</p>
<div class="note"><b>What you are hearing.</b> Every sound is a real file from the pack, at the
app's own seams — 700&nbsp;ms between clips, 500&nbsp;ms between sounds — and the word reveal is
the one that ships today: the word, “Pronounced:”, each sound, the word again.
<b>The length under each button is the real length</b>, and it is the thing to judge: the same
sentence runs from a few seconds to most of a minute depending on which shape wins.<br><br>
Sentence mode is <b>not built</b>. This is a proposal, so a verdict here chooses a design, not a
release.</div>
<div id="cards"></div>
<script>
const CARDS = ${JSON.stringify(cards)};
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0)).buffer;
const cache = new Map();
async function buf(c, k){ if(!cache.has(k)) cache.set(k, await ctx.decodeAudioData(bytes(c.b64))); return cache.get(k); }
let stopAll = null;
async function play(clips, tag){
  if (stopAll) stopAll();
  await ctx.resume();
  const real = clips.map((c,i)=>({c,i})).filter(x=>!x.c.seam);
  const bs = new Map();
  for (const {c,i} of real) bs.set(i, await buf(c, tag+":"+i));
  let at = ctx.currentTime + 0.05;
  const live = [];
  clips.forEach((c,i)=>{
    if (c.seam) return;
    const s = ctx.createBufferSource(); s.buffer = bs.get(i); s.connect(ctx.destination); s.start(at);
    live.push(s);
    at += bs.get(i).duration;
    const next = clips[i+1]; if (!next) return;
    const gap = next.seam ? next.seam : 0;
    const after = next.seam ? clips[i+2] : next;
    if (after && !after.seam) at += gap/1000 - c.tail/1000 - after.lead/1000;
  });
  stopAll = () => { live.forEach(s=>{ try{ s.stop(); }catch(e){} }); stopAll = null; };
}
const answers = {};
document.getElementById("cards").innerHTML = CARDS.map((c,ci)=>\`
 <p class="say">\${c.text}</p>
 <div class="tiles">\${c.tiles.map(t=>\`<div class="wd">\${t.g.map((g,i)=>
    \`<div class="tile">\${g}<small>\${t.s[i]||""}</small></div>\`).join("")}</div>\`).join("")}</div>
 \${c.arms.map((a,ai)=>\`<div class="card">
   <p class="arm">\${a.key} · \${a.name}</p>
   <p class="why">\${a.why}</p>
   <button data-c="\${ci}" data-a="\${ai}">▶ play what the child hears</button>
   <p class="len"><b>\${(a.ms/1000).toFixed(1)} seconds</b> · \${a.clips.filter(x=>!x.seam).length} clips</p>
   <div class="verdicts" data-key="\${c.text} — \${a.key} \${a.name}">
     \${["perfect","good","iterate on this","no good option"].map(v=>
       \`<button class="v" data-v="\${v}" aria-pressed="false">\${v}</button>\`).join("")}
   </div></div>\`).join("")}\`).join("");
document.body.insertAdjacentHTML("beforeend", \`<div class="bar">
  <button id="copy">📋 copy all answers</button><span id="count"></span></div>
  <textarea id="out" readonly></textarea>\`);
const KEYS = CARDS.flatMap(c=>c.arms.map(a=>c.text+" — "+a.key+" "+a.name));
function render(){
  const NL = String.fromCharCode(10);
  const lines = Object.keys(answers).map(k=>k+" | "+answers[k]);
  const missing = KEYS.filter(k=>!answers[k]);
  let t = "SENTENCE REVEAL" + NL + NL + (lines.join(NL) || "(nothing yet)");
  if (missing.length) t += NL + NL + "NOT ANSWERED ("+missing.length+"):" + NL + missing.join(NL);
  document.getElementById("out").value = t;
  document.getElementById("count").textContent = Object.keys(answers).length+" of "+KEYS.length+" answered";
}
render();
document.body.addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if (b.dataset.c!==undefined) return play(CARDS[+b.dataset.c].arms[+b.dataset.a].clips, b.dataset.c+"_"+b.dataset.a);
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
`;
writeFileSync(OUT, page);
console.log(`wrote ${OUT} (${Math.round(page.length / 1024)} KB)`);
for (const c of cards)
  for (const a of c.arms)
    console.log(`  ${a.key}  ${(a.ms / 1000).toFixed(1)}s  ${a.clips.filter((x) => !x.seam).length} clips  ${c.text}`);
