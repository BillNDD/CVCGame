import { useEffect, useState } from "react";
import { onAudio } from "../voicepacks.js";

/* THE GLOWSEED (art step 2, bible 7): one small object in the child's field,
   lit exactly while recorded teaching audio plays and dark otherwise. It reads
   the player's own start and end events (voicepacks.js onAudio) and no clock
   of its own: lit at the utterance's schedule, idle when its last node has
   ended or stopClips() has ended it; an end for some other utterance's token
   is not its end. Three looks by class - idle, lit, muted (sound off) - all
   hard-edged: nothing animates or transitions, so reduced motion changes
   nothing. It is decoration to assistive technology (aria-hidden, no role,
   no tab stop, pointer-events none in the stylesheet) and never a control:
   the speaker controls in the grown-up strip keep their names and their
   44 px. A token-drawn PLACEHOLDER for the pixel seed the garden's step
   draws to the locked camera (the owner's page on the order, 2026-08-23);
   the place, the three looks and the timing are what a child learns, and
   those do not change when the paint does. */
/* quiet: a screen asks the object to stay idle through a run of short plays
   it would otherwise blink to (Build-it's scaffold); the lit state is still
   tracked underneath, so the look is right the moment quiet ends. */
export default function Glowseed({ muted = false, quiet = false }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    let current = null;
    return onAudio((e) => {
      if (e.state === "start") { current = e.token; setLit(true); }
      else if (e.state === "end" && e.token === current) { current = null; setLit(false); }
    });
  }, []);
  const look = muted ? "muted" : lit && !quiet ? "lit" : "idle";
  return <span className={"wq-glowseed wq-glowseed-" + look} data-wq-glowseed={look} aria-hidden="true" />;
}
