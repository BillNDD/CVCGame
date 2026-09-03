import { C } from "@engine";
import HoldButton from "./HoldButton.jsx";

/* THE PORTRAIT ASK - owner-ruled 2026-09-03 ("could we solve some of these
   iphone orientation issues by just locking the game when it is on a small
   screen to only present in portrait mode?").

   WHY IT IS AN ASK AND NOT A LOCK, in two facts the owner was given before
   the ruling. First, an iPhone cannot be locked by a web app at all:
   screen.orientation.lock() is not supported in Safari, and the manifest's
   orientation field is honoured by Android installs and not by iOS
   home-screen apps. The only thing this app can do on the device the owner
   cares about is decline to draw the game sideways and ask for a turn.
   Second, WCAG 2.1 SC 1.3.4 (AA) says content must not be restricted to one
   orientation unless that is essential, and the accessibility gate runs the
   wcag21aa tag set. A grown-up whose phone is mounted, or who cannot rotate
   it, has to be able to get in - so the ask carries a way through, and the
   way through is remembered.

   WHAT IT IS FOR is open fault AG: on a landscape phone the reveal's tiles
   lose their bottom rim and the feedback sentence lies wholly below the
   stage's edge, out of view, with nothing to say it is there. Rather than
   build a second cramped layout for a shape no child holds a reading game
   in, the app asks for the shape it was drawn for.

   THE CHILD IS LEARNING TO READ, so the picture carries the message and the
   words are the grown-up's. The way through is a 450 ms hold, the same
   deliberate adult gesture as every other grown-up control (S5's shape,
   though this is not a result control), at 44 px or more (S7). */
export default function TurnPrompt({ onStay }) {
  return (
    <div className="wq-turn" data-wq-turn="ask">
      <div className="wq-turn-card">
        {/* The phone, drawn turning. Geometry only, no icon family: step 5 of
            the art plan owns the icons and will replace this mark. */}
        <div className="wq-turn-art" aria-hidden="true">
          <div className="wq-turn-phone" />
          <div className="wq-turn-arrow" />
        </div>
        <p className="wq-turn-say">Turn the phone upright to read.</p>
        <HoldButton onFire={onStay} disabled={false} label="Read this way anyway" color={C.strip} />
      </div>
    </div>
  );
}
