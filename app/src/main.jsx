import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { install as installErrorRing } from "./errors.js";
import { installRefresh } from "./swrefresh.js";
import "./styles.css";

/* The error ring (app/src/errors.js): every uncaught throw and every
   unhandled rejection is written to the device, never sent. The screen name
   comes from the same wq-screen event the update module listens to. */
let currentScreen = "home";
window.addEventListener("wq-screen", (e) => { currentScreen = String(/** @type {CustomEvent} */ (e).detail); });
installErrorRing(window, { screen: () => currentScreen, version: __APP_VERSION__ });

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary screen={() => currentScreen} version={__APP_VERSION__}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

/* The service worker exists only in the production build. It precaches the
   full app, so the app operates offline after the first load. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  installRefresh({
    nav: navigator.serviceWorker,
    reload: () => window.location.reload(),
    onScreen: (fn) => window.addEventListener("wq-screen", (e) => fn(/** @type {CustomEvent} */ (e).detail)),
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
