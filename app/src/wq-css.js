/* The game stylesheet, moved from reference/word-quest.jsx.
   The color values come from the engine's C constant, so the palette has one
   source of truth. The P/N/F markers refer to the design-review findings the
   rules resolve — see CHANGELOG.md.
   One deliberate divergence from the reference: .wq-btn-plain, .wq-segbtn and
   .wq-rowbtn are 44px tall, not 40px — SPEC rule 7 sets a 44px minimum for
   every adult control, and section 10 gates on it. */
import { C } from "@engine";

const CSS = `
/* No rule here uses the CSS \`font:\` shorthand. Ten of them once did, each
   ending in \`inherit\` — which is not a legal font-family, so every one of
   those declarations was invalid and the browser discarded the lot. The app
   has always rendered those labels at the inherited weight and size, which is
   the look the owner has approved throughout. The dead declarations are gone
   rather than repaired, so the sheet states what it does. Anything that wants
   a weight or a size states it as a longhand, and tools/quality-control.mjs
   fails the build if a \`font:\` shorthand ending in \`inherit\` appears again.
   Found by an audit of the running build, 2026-07-29. */
.wq-root{
  height:100vh; height:100dvh; width:100%; overflow:hidden;
  background:linear-gradient(160deg,#8fd0fa 0%,#b9c3fb 55%,#d9c6fb 100%);
  font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;
  color:${C.ink};
}
.wq-shell{height:100%;max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:0}
.wq-display{font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.02em}
.wq-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}

/* zones — P0-1 / P1-8: fixed three-zone shell, page never scrolls in a session */
.wq-header{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:6px;padding:8px 12px}
/* N-4: overflow-y auto never engages at default text sizes, but gives 200% text a way out */
.wq-stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;
  padding:6px 14px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
/* The stage centres its content with two flexible spacers rather than with auto
   margins. Auto margins centre tall content by pushing half of it outside the
   scroll area, where it cannot be reached: at 200% zoom the feedback sentence
   was rendered entirely below the stage and clipped away, with no scrollbar and
   nothing to say it was there. Spacers collapse instead, so tall content stays
   reachable. Found by an audit of the running build, 2026-07-29. */
.wq-stage::before,.wq-stage::after{content:"";flex:1 1 auto;min-height:0}
.wq-stage>*{margin:0 auto;flex:0 0 auto}
.wq-stage.wq-scroll>*{margin:10px auto}
.wq-rail{flex:0 0 auto;padding:8px 14px 6px}
/* N-5: extra bottom padding keeps controls out of the home-indicator swipe band */
.wq-strip{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:8px 12px calc(18px + env(safe-area-inset-bottom));
  background:rgba(255,255,255,.72);border-top:1px solid ${C.line};backdrop-filter:blur(6px)}
.wq-center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}

/* stage content: fixed slots so nothing shifts (P0-2) */
.wq-stagegrid{width:100%;max-width:440px}
.wq-word{font-size:clamp(2.25rem,11vh,5.5rem);font-size:clamp(2.25rem,11dvh,5.5rem);
  font-weight:700;line-height:1.05;color:${C.ink};margin:4px 0 0;word-break:break-word}
.wq-slot-tiles{min-height:52px;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}
.wq-tile{background:${C.sun};color:${C.ink};border-radius:12px;padding:5px 12px;
  font-size:clamp(1.1rem,3.2dvh,1.6rem);font-weight:700;box-shadow:0 1px 3px rgba(23,53,107,.18)}
.wq-slot-msg{height:52px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:#fff;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px rgba(23,53,107,.18);min-height:56px;position:relative;overflow:hidden;isolation:isolate}
.wq-cta:disabled{cursor:default;box-shadow:none}
/* A1-004 — the wait made visible. The advance control is inert while the reveal
   plays, about six seconds: praise, a pause, "The word was", a pause, then the
   word. It used to be a grey box with nothing happening in it, so a child had
   no way to know whether anything was coming. A fill now crosses the control
   over the reveal's own scheduled length, which the app already knows, and
   reaches the far edge as the control comes alive. No words: a beginning reader
   should not have to decode anything to understand a wait.
   The fill sits at z-index -1 inside the control's own stacking context, so it
   paints over the control's background and under its label without wrapping
   the label in anything — the label stays the control's own text.
   Found by an audit of the running build, 2026-07-29. */
.wq-ctafill{position:absolute;inset:0;z-index:-1;width:0;background:rgba(23,53,107,.2);
  animation:wqfill var(--wqfill,400ms) linear forwards}
@keyframes wqfill{from{width:0}to{width:100%}}
/* line-height matches .wq-cta exactly: the prompt REPLACES the record control,
   so any difference in its box moves the word above it. It measured 58.39px
   against the control's 56px, which shifted the word by 1.19px between an
   ordinary word and an adult-judged one. */
.wq-prompt{text-align:center;font-weight:800;color:${C.ink};padding:16px 0;min-height:56px}
.wq-btn-plain{border:0;background:rgba(255,255,255,.85);color:${C.ink};
  padding:11px 13px;border-radius:999px;cursor:pointer;min-height:44px}
.wq-chip{background:rgba(255,255,255,.85);color:${C.ink};padding:7px 10px;border-radius:999px;display:inline-block}
.wq-striplabel{letter-spacing:.12em;text-transform:uppercase;color:${C.strip};opacity:.85}
.wq-sbtn{background:#fff;border:1.5px solid ${C.line};border-radius:9px;color:${C.strip};padding:0 12px;min-height:44px;min-width:44px;cursor:pointer} /* N-6 */
.wq-hold{position:relative;overflow:hidden;touch-action:none}
.wq-holdfill{position:absolute;inset:0;width:0;opacity:.22}
.wq-hold.holding .wq-holdfill{width:100%;transition:width .45s linear}
.wq-sbtn:disabled{opacity:.38;cursor:default}
.wq-heard{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

/* progress (P1-6: colour + pattern) */
.wq-prog{display:flex;gap:2px;width:100%}
.wq-seg{flex:1;height:9px;border-radius:2px;min-width:3px}
.wq-seg-todo{background:rgba(255,255,255,.55)}
.wq-seg-ok{background:${C.green}}
.wq-seg-mid{background:repeating-linear-gradient(135deg,${C.sun} 0 3px,#fff 3px 6px)}
.wq-seg-bad{background:repeating-linear-gradient(90deg,${C.red} 0 2px,#fff 2px 4px)}

/* cards / forms */
.wq-card{background:#fff;border-radius:18px;box-shadow:0 2px 10px rgba(23,53,107,.12);text-align:center}
.wq-lbl{display:block;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:5px}
.wq-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:${C.muted}}
.wq-input{width:100%;border:1.5px solid ${C.line};border-radius:10px;padding:11px 12px;color:${C.ink};background:#fff;min-height:44px}
.wq-fieldrow{margin-top:14px}
.wq-seggroup{display:flex;gap:4px;background:${C.chip};border-radius:11px;padding:3px;flex-wrap:wrap}
.wq-segbtn{flex:1 1 auto;min-width:44px;min-height:44px;border:0;background:transparent;border-radius:8px;
  color:${C.strip};cursor:pointer}
.wq-segbtn.on{background:#fff;color:${C.ink};box-shadow:0 1px 3px rgba(23,53,107,.2)}
.wq-segbtn:disabled{opacity:.4;cursor:default}
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:44px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2: toast sits above the action rail, never over the header */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(112px + env(safe-area-inset-bottom));
  background:${C.ink};color:#fff;padding:10px 16px;border-radius:999px;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:rgba(23,53,107,.42);border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:#fff;border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px rgba(23,53,107,.3)}

/* a11y + motion */
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid ${C.ink};outline-offset:2px}
.wq-float{animation:wqf 2s ease-in-out infinite}
@keyframes wqf{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}
  /* One exception, and only one: the fill on the advance control is not
     decoration. It is the only thing that says how much of the word is still
     to come, and without it a grown-up who asks for less motion gets the
     six-second grey box back. It is a single bar crossing at a steady rate,
     which is what a progress indicator is allowed to be. */
  .wq-ctafill{animation:wqfill var(--wqfill,400ms) linear forwards!important}}

/* landscape: one centred column, the same stack as portrait (P2-1, A1-003).
   This query used to divide the stage into a 1.1fr column for the word and a
   1fr column for "the controls". The controls are not in the stage — the record
   button sits in the rail and the grading buttons in the grown-up strip — so
   the second column never held anything: it measured 378 px of empty space
   beside a 26 px gap, and the rules that left-aligned the first column put the
   tile row's centre 191 px away from the centre of the word it explains. A
   child who reads "ship" now sees sh-i-p directly underneath it, in landscape
   as in portrait. The one landscape difference left is a larger word.
   Found by an audit of the running build, 2026-07-29. */
@media (orientation:landscape) and (min-width:640px) and (min-height:420px){ /* N-7 */
  .wq-shell{max-width:960px}
  .wq-stage{padding:6px 22px}
  .wq-word{font-size:clamp(3rem,17dvh,7rem)}
}

/* A short stage, which is what 200% text size leaves behind: the word, the
   tiles and the sentence all shrink so the whole teaching payload still FITS
   rather than merely being reachable by a scroll a child will not think to
   make. At 200% on a laptop the sentence used to render 68 px below the stage;
   at 200% on a phone only a sliver of the word survived. The reserved rows
   stay equal in both phases, so the word still does not move (SPEC section 6). */
@media (max-height:520px){
  .wq-stage{padding:2px 10px}
  .wq-word{font-size:clamp(1.5rem,13dvh,2.4rem);margin:0}
  .wq-tile{padding:2px 7px;border-radius:8px;font-size:clamp(.85rem,4dvh,1.1rem)}
  .wq-slot-tiles{min-height:30px;margin-top:3px;gap:4px}
  .wq-slot-msg{height:34px;min-height:34px;margin-top:2px}
  .wq-msg{font-size:.95rem;line-height:1.2}
  .wq-note{font-size:.8rem}
  .wq-rail{padding:4px 14px 4px}
  .wq-strip{padding-top:2px}
}
`;

export default CSS;
