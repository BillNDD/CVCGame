/* The game stylesheet, moved from reference/word-quest.jsx.
   The color values come from the engine's C constant, so the palette has one
   source of truth. The P/N/F markers refer to the design-review findings the
   rules resolve — see CHANGELOG.md.
   One deliberate divergence from the reference: .wq-btn-plain, .wq-segbtn and
   .wq-rowbtn are 44px tall, not 40px — SPEC rule 7 sets a 44px minimum for
   every adult control, and section 10 gates on it. */
import { C } from "@engine";

const CSS = `
.wq-root{
  height:100vh; height:100dvh; width:100%; overflow:hidden;
  background:linear-gradient(160deg,#8fd0fa 0%,#b9c3fb 55%,#d9c6fb 100%);
  font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;
  color:${C.ink};
}
.wq-shell{height:100%;max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:0}
.wq-display{font-family:'Comic Sans MS','Comic Sans','Chalkboard SE','Marker Felt','Comic Neue',cursive;letter-spacing:.02em}
.wq-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}

/* zones — P0-1 / P1-8: fixed three-zone shell, page never scrolls in a session */
.wq-header{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:6px;padding:8px 12px}
/* N-4: overflow-y auto never engages at default text sizes, but gives 200% text a way out */
.wq-stage{flex:1 1 auto;min-height:0;display:flex;justify-content:center;padding:6px 14px;
  overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.wq-stage>*{margin:auto}
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
.wq-slot-msg{min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:#fff;
  font:800 clamp(1rem,2.4dvh,1.25rem)/1.1 inherit;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px rgba(23,53,107,.18);min-height:56px}
.wq-cta:disabled{cursor:default;box-shadow:none}
.wq-prompt{text-align:center;font-weight:800;color:${C.ink2};font-size:clamp(.95rem,2.2dvh,1.1rem);padding:16px 0;min-height:56px}
.wq-btn-plain{border:0;background:rgba(255,255,255,.85);color:${C.ink};font:700 13px/1 inherit;
  padding:11px 13px;border-radius:999px;cursor:pointer;min-height:44px}
.wq-chip{background:rgba(255,255,255,.85);color:${C.ink};font:800 12.5px/1 inherit;padding:7px 10px;border-radius:999px;display:inline-block}
.wq-striplabel{font:800 9.5px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:${C.strip};opacity:.85}
.wq-sbtn{background:#fff;border:1.5px solid ${C.line};border-radius:9px;color:${C.strip};
  font:700 12.5px/1 inherit;padding:0 12px;min-height:44px;min-width:44px;cursor:pointer} /* N-6 */
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
.wq-lbl{display:block;font:800 11px/1.3 inherit;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:5px}
.wq-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:${C.muted}}
.wq-input{width:100%;border:1.5px solid ${C.line};border-radius:10px;padding:11px 12px;
  font:600 15px/1.3 inherit;color:${C.ink};background:#fff;min-height:44px}
.wq-fieldrow{margin-top:14px}
.wq-seggroup{display:flex;gap:4px;background:${C.chip};border-radius:11px;padding:3px;flex-wrap:wrap}
.wq-segbtn{flex:1 1 auto;min-width:44px;min-height:44px;border:0;background:transparent;border-radius:8px;
  color:${C.strip};font:800 13px/1 inherit;cursor:pointer}
.wq-segbtn.on{background:#fff;color:${C.ink};box-shadow:0 1px 3px rgba(23,53,107,.2)}
.wq-segbtn:disabled{opacity:.4;cursor:default}
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:44px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2: toast sits above the action rail, never over the header */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(112px + env(safe-area-inset-bottom));
  background:${C.ink};color:#fff;padding:10px 16px;border-radius:999px;font:700 13px/1.3 inherit;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:rgba(23,53,107,.42);border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:#fff;border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px rgba(23,53,107,.3)}

/* a11y + motion */
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid ${C.ink};outline-offset:2px}
.wq-float{animation:wqf 2s ease-in-out infinite}
@keyframes wqf{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* landscape: word left, controls right (P2-1) */
@media (orientation:landscape) and (min-width:640px) and (min-height:420px){ /* N-7 */
  .wq-shell{max-width:960px}
  .wq-stage{padding:6px 22px}
  .wq-stagegrid{max-width:820px;display:grid;grid-template-columns:1.1fr 1fr;gap:26px;align-items:center}
  .wq-stagegrid>div{text-align:left}
  .wq-word{font-size:clamp(3rem,17dvh,7rem)}
  .wq-slot-tiles,.wq-slot-msg{justify-content:flex-start;align-items:flex-start;text-align:left}
}
`;

export default CSS;
