import { useState } from "react";
import { C } from "@engine";
import { checkForUpdate, applyUpdate } from "../updates.js";
import HoldButton from "./HoldButton.jsx";

/* SPEC section 7a — the home screen's update row, owner-approved 2026-08-07.
   The manual check lived at the bottom of the "Grown-ups corner" and was
   never found there; it now sits in the strip the first screen already
   reserves for adults, beside the installed version. The corner keeps the
   version chip, the "Automatic update check" switch, and the plain words.
   Both controls take the same 450 ms pointer hold as the adult result
   controls, because this strip is on the child's screen: S6's promise —
   the network is only ever touched by a deliberate adult act — has to
   survive any number of child taps, and "Update now" restarts the app, so
   it above all is never one tap away. A keyboard and assistive technology
   operate them directly, as they do every hold control. */
export default function UpdateRow() {
  const [status, setStatus] = useState("");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onCheck() {
    setBusy(true); setStatus("Checking…"); setAvailable(false);
    const r = await checkForUpdate(__APP_VERSION__, __APP_BUILD__);
    setBusy(false);
    if (r.state === "current") setStatus("You have the latest version.");
    else if (r.state === "available") {
      /* A newer build of the SAME version reads oddly as "Version x is
         ready" when the strip already says x - so it gets plain words. */
      setStatus(r.latest === __APP_VERSION__
        ? "An update is ready — press and hold."
        : `Version ${r.latest} is ready — press and hold.`);
      setAvailable(true);
    }
    else if (r.state === "offline") setStatus("Couldn’t check. Are you online?");
    else setStatus("The version check didn’t work. Try again later.");
  }

  async function onApply() {
    setBusy(true); setStatus("Updating…");
    const ok = await applyUpdate();
    if (ok) { setStatus("Restarting…"); window.location.reload(); }
    else { setBusy(false); setStatus("The update is still downloading. Try again in a moment."); }
  }

  return (
    <span className="wq-updrow">
      {status
        ? <span role="status" style={{ fontSize: 11.5, color: C.strip }}>{status}</span>
        : <span className="wq-mono" style={{ fontSize: 11, color: C.strip, opacity: 0.9 }}>{"v" + __APP_VERSION__ + " · " + __APP_BUILD__}</span>}
      <span style={{ flex: 1 }} aria-hidden="true" />
      {available
        ? <HoldButton onFire={onApply} disabled={busy} color={C.green} label="⬆️ Update now" />
        : <HoldButton onFire={onCheck} disabled={busy} color={C.strip} label="↻ Check for updates" />}
    </span>
  );
}
