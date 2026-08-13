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
/* The word sits at the stage's visual centre, not the block's. The block
   carries two reserved rows BELOW the word (tiles 52+8, message 52+4 = 116px)
   and only the small label above it (~22px), so centring the block leaves the
   word riding high - measured at 42 percent of the stage. The top spacer takes
   the difference (116 - 22 = 94px) as extra basis, which drops the word's
   midline onto the stage's midline. On a short stage the basis shrinks with
   the spacer, so nothing is ever pushed out of reach; the shift is constant
   within a session, so the word still never moves between phases (P0-2).
   Chosen by the owner from measured candidates, 2026-08-03. */
.wq-stage::before{flex-basis:94px}
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
/* The sound-out pop (owner-ruled 2026-08-04, shape chosen 2026-08-11 from four
   treatments heard against the real audio). A tile takes a hard outline for as
   long as its own sound plays, then drops it — no movement, no flash, no
   scaling. The owner chose this over a spring hop and a glow: the ring says
   "this piece, now" without pulling the eye off the letters, which are the
   thing being taught. steps(1,end) means the outline appears and disappears
   whole rather than fading, so the edge of the sound is the edge of the mark.
   The outline sits OUTSIDE the box, so nothing on the row moves or reflows
   when it appears (P0-2).
   --wqpop is that sound's own measured speech length, handed down by the
   player. A fixed length was wrong in both directions: it outlived the four
   short plosives, leaving two tiles ringed at once, and it ran out 236 ms
   before /w/ finished in "win".

   THERE IS NO LONGER A FALLBACK LENGTH, and that is the fix (B5, 2026-08-12).
   This rule used to read var(--wqpop, 700ms), so a source that could not
   report a length — a family pack, whose clips nobody has measured — got the
   exact fault that was fixed on 2026-08-11 handed straight back to it. A ring
   of the wrong length is worse than no ring: it teaches the child that a
   different piece of the word is sounding. With no default, a missing
   --wqpop makes the shorthand invalid and no animation runs at all, which is
   the behaviour wanted; the component declines to add the class in the first
   place, and this is the second lock on the same door. */
.wq-tile.wq-pop{animation:wqpop var(--wqpop) steps(1,end)}
@keyframes wqpop{0%,99%{outline:4px solid ${C.ink};outline-offset:3px}
  100%{outline:0 solid transparent}}
.wq-slot-msg{height:52px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}
/* A3-014 — the dashed form is the teaching payload of the feedback sentence,
   so it never breaks across a line: "sh-i-" on one row and "p, ship." on the
   next reads as two fragments rather than one word split into its sounds.
   It moves to the next line whole instead. The text itself does not change,
   so SPEC section 5 is untouched.
   Found by an audit of the running build, 2026-07-29. */
.wq-dashed{white-space:nowrap}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:#fff;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px rgba(23,53,107,.18);min-height:56px;position:relative;overflow:hidden;isolation:isolate}
/* A2-011 — an inert control keeps a readable label. White on the pale grey
   measured 2.14:1, and 2.87:1 where the fill band crosses it; the ink reads
   5.57:1 and 4.14:1 in the same two places. WCAG exempts an inactive control,
   which is why the contrast walker skips it, but this control waits about six
   seconds on every word and it is the one the grown-up is watching. The label
   turning white as the control wakes is one more sign that it is now live. */
.wq-cta:disabled{cursor:default;box-shadow:none;color:${C.ink}}
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
.wq-ctafill{position:absolute;inset:0;z-index:-1;width:var(--wqfillfrom,0%);background:rgba(23,53,107,.2);
  animation:wqfill var(--wqfill,400ms) linear forwards}
@keyframes wqfill{from{width:var(--wqfillfrom,0%)}to{width:100%}}
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
.wq-mark{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

/* progress (P1-6: colour + pattern) */
/* The session path, owner-ruled 2026-08-12: one dot per word, at a size a
   child can count, on its own row with a label. It replaced a 6 px bar that
   was made for a grown-up — a pre-reader cannot read "7/20" but can see six
   dots behind them.

   IT WRAPS, and that is the whole engineering of it. Twenty 13 px dots need
   336 px and a phone header has 263 px beside the home and level controls, so
   a single row overflows on every phone — which the first drawing of this did,
   off the right edge. flex-wrap lets the row become two or three lines on a
   narrow screen and stay one line where it fits, and the label holds its place
   at the start of the first line rather than wrapping with the dots. Measured
   at real device widths by the G7 gate, not left to look right. */
.wq-track{display:flex;align-items:flex-start;gap:8px;padding:0 12px 7px}
/* Longhands, not the font shorthand: "font:700 9px/1.45 inherit" is invalid
   CSS — the shorthand takes no inherit — so the browser dropped the whole
   declaration and the label rendered at the inherited size, 126.6 px wide on a
   320 px screen where it should be about 65. Measured, not spotted. */
.wq-tracklbl{font-weight:700;font-size:9px;line-height:1.45;letter-spacing:.11em;
  text-transform:uppercase;color:${C.strip};white-space:nowrap;flex:0 0 auto;padding-top:1px}
/* A GRID of fixed columns, not a wrapping flex row. Both wrap; only the grid
   wraps EVENLY. Left to flex-wrap, twenty dots broke 19 and 1 on a 430 px
   phone — a single orphan dot on its own line, which reads as a mistake. Ten
   columns give two rows of ten on every phone, and a child counts in tens.
   The breakpoints are the widths at which the rows actually fit, measured:
   twenty dots need 336 px and the widest track offers that from 446 px up, so
   one row from 480; ten need 166 px, which the narrowest phone has; seven need
   115 px, the floor for anything narrower than a phone this app supports. */
.wq-prog{display:grid;grid-template-columns:repeat(20,13px);gap:4px;
  justify-content:start;flex:0 1 auto;min-width:0}
@media (max-width:479px){.wq-prog{grid-template-columns:repeat(10,13px)}}
@media (max-width:319px){.wq-prog{grid-template-columns:repeat(7,13px)}}
.wq-seg{width:13px;height:13px;border-radius:50%}
.wq-seg-todo{background:${C.chip};box-shadow:inset 0 0 0 1px ${C.line}}
.wq-seg-now{background:${C.sun};box-shadow:inset 0 0 0 1px #e0ac2b}
.wq-seg-ok{background:${C.green}}
.wq-seg-mid{background:repeating-linear-gradient(135deg,${C.sun} 0 3px,#fff 3px 6px)}
.wq-seg-bad{background:repeating-linear-gradient(90deg,${C.red} 0 2px,#fff 2px 4px)}

/* home stage sizing lives here, not inline, so the short-screen rules below
   can reach it */
.wq-home-title{font-size:clamp(2rem,7dvh,3rem);line-height:1.1;margin:0}
.wq-home-hi{margin:8px 0 0;font-weight:700;font-size:16px}
.wq-home-card{margin-top:18px;padding:16px}
/* The update row: a second strip line on a phone; inline on a wide screen,
   where the strip has room on one line and the home stage needs the height
   back. */
.wq-updrow{flex-basis:100%;display:flex;align-items:center;gap:8px}
@media (min-width:640px){.wq-updrow{flex-basis:auto;margin-left:auto}}
/* A short HOME stage: a desktop window half-snapped, or a heavy zoom. The
   session stage shrinks to FIT at 520 rather than asking for a scroll; the
   home stage clips earlier, because two 56 px child controls and the strip
   sit under it - measured: the level card overflowed a 920x410 window by
   53 px and cleared a 1280x560 one by 6. So the home furniture starts
   shrinking at 620, decoration first: the big title repeats what the header
   already says. Below what fitting can save, the stage still scrolls (N-4). */
/* The 94 px word-centering offset belongs to the session's reserved slots;
   on the home stage it only pushed the level card toward the action rail. */
.wq-stage-home::before{flex-basis:0}
@media (max-height:620px){
  .wq-home-title{font-size:clamp(1.4rem,6dvh,2rem)}
  .wq-home-hi{margin-top:2px;font-size:14px}
  .wq-home-card{margin-top:8px;padding:10px 16px}
}
/* Shorter still, the decoration goes in tiers: first the big title (the
   header already says Word Quest), then the greeting, while the level card
   compacts - it is the one thing a hand needs. With the header, two 56 px
   child controls (S7) and the strip, the chrome alone stands about 250 px,
   so below roughly 330 px nothing can make the screen fit; there the stage
   still scrolls, the same honest fallback the 200% text size uses (N-4). */
@media (max-height:460px){
  .wq-home-title{display:none}
}
@media (max-height:400px){
  .wq-home-hi{display:none}
  .wq-home-card{margin-top:4px;padding:8px 12px}
  /* The 18 px base under the strip clears a phone's swipe band (N-5); a
     400 px-short window is a desktop or a notch phone, and a notch phone
     brings its own env() inset. */
  .wq-strip{padding-bottom:calc(8px + env(safe-area-inset-bottom))}
}

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
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:44px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2 / A1-005: the toast sits above the action rail, never over the header.
   The offset it needs is measured, not guessed — Frame publishes the real
   height of the rail and the strip as --wq-bottomzones, because that height
   differs on every screen and moves with the device's safe area. The 112px
   fallback is the old constant, kept only for a first paint before the
   measurement lands; the safe-area term below it covers the "Grown-ups corner",
   which has neither zone and so measures zero. */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);
  bottom:calc(var(--wq-bottomzones,112px) + 12px + env(safe-area-inset-bottom));
  background:${C.ink};color:#fff;padding:10px 16px;border-radius:999px;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:rgba(23,53,107,.42);border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:#fff;border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px rgba(23,53,107,.3)}

/* NO TEXT SELECTION ON THE CHILD'S SCREEN.
   Reported by the owner from a real iPhone 13 on 2026-08-13, with a screenshot:
   touching between "skip" and "got it" started an iOS text selection — blue
   handles, highlighted label, the lot — across the grown-up strip.

   It is not an edge case, and the cause is the app's own core gesture. Every
   adult result control needs a 450 ms POINTER HOLD (S5), and a 450 ms press on
   a touch screen is precisely the gesture iOS reads as "select this text". So
   the one interaction a grown-up performs twenty times a session was fighting
   the operating system on every touch device, from the day the hold was built,
   and no rule in this stylesheet had ever said otherwise. No gate saw it
   either: every browser check this project runs drives a mouse.

   The callout is off with it, because the same long press raises the
   copy/look-up bubble over any text it lands on.

   A grown-up must still be able to select the backup text they came for, so
   the inputs opt back in. That is the one place in this app where selecting
   text is the point, and it is why this is two rules rather than one. */
.wq-root{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.wq-root input,.wq-root textarea,.wq-root .wq-input{-webkit-user-select:text;user-select:text}

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
  .wq-ctafill{animation:wqfill var(--wqfill,400ms) linear forwards!important}
  /* And the sound-out ring, for the same reason: it is the teaching, not
     decoration. It is what tells a child which piece of the word the sound
     they are hearing belongs to, and a reduced-motion setting that removed it
     would leave the sounds attached to nothing. It is already the calmest
     form there is — a static outline, no movement of any kind — which is why
     the owner chose it over the hop and the glow. */
  /* Reduced motion keeps the ring — it carries information — but it kept it
     at a FIXED 700 ms, which meant that on every device with reduced motion
     switched on, every ring was the wrong length. The same B5 fault, hiding in
     the exception. It now takes the sound's own length like everything else. */
  .wq-tile.wq-pop{animation:wqpop var(--wqpop) steps(1,end)!important}}

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
