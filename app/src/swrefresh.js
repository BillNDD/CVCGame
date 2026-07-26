/* When a new version takes control of an installed app, the running page must
   catch up — otherwise the child keeps playing yesterday's code. It must never
   catch up mid-session: a reload under a child loses the words already read
   from the session total and takes the screen away mid-attempt. So the refresh
   waits for a safe moment, which is any screen except a live session.

   A first install has no previous controller and never reloads: nothing is
   stale on the very first load. */
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
  onScreen((screen) => { inSession = screen === "session"; refresh(); });
}
