import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { installRefresh } from "./swrefresh.js";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* The service worker exists only in the production build. It precaches the
   full app, so the app operates offline after the first load. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  installRefresh({
    nav: navigator.serviceWorker,
    reload: () => window.location.reload(),
    onScreen: (fn) => window.addEventListener("wq-screen", (e) => fn(e.detail)),
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
