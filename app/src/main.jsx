import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* The service worker exists only in the production build. It precaches the
   full app, so the app operates offline after the first load. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  /* An installed app must not keep running a superseded bundle: when a new
     worker takes control of a page an OLD worker controlled, reload once so
     the running code matches the new cache. A first install has no prior
     controller and never reloads. */
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
