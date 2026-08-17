/* When a new version takes control of an installed app, the running page must
   catch up — otherwise the child keeps playing yesterday's code. It must never
   catch up mid-session: a reload under a child loses the words already read
   from the session total and takes the screen away mid-attempt. So the refresh
   waits for a safe moment, which is any screen except a live session.

   A LIVE SESSION IS THREE SCREENS, not one. "session" is the word and sentence
   loop; "pre" is the pre-letter ladder, where the child is a beginner least
   able to recover from a screen vanishing; and "build" is Build-it, which a
   session enters for its breather - a reload there loses the session around it.
   The list is here rather than at the call site so a new screen has one place
   to be added, which is the fault this had: "build" was added on 2026-08-17 and
   nothing here learned about it (open-faults Q5).

   A first install has no previous controller and never reloads: nothing is
   stale on the very first load. */
export const LIVE = ["session", "pre", "build"];

export function installRefresh({ nav, reload, onScreen }) {
  if (!nav) return;
  const hadController = !!nav.controller;
  let pending = false, done = false, inSession = false;
  const refresh = () => {
    if (done || !pending || inSession) return;
    done = true;
    reload();
  };
  nav.addEventListener("controllerchange", () => {
    if (!hadController) return;      // first install: nothing to catch up with
    pending = true;
    refresh();
  });
  onScreen((screen) => { inSession = LIVE.includes(screen); refresh(); });
}
