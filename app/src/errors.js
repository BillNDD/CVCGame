/* THE ERROR RING - the on-device answer to a crash reporter.
 *
 * Owner-ruled 2026-08-22 on the bug-hunt page: "window.onerror +
 * unhandledrejection ring buffer (last 20, no URLs, no names) ... an error
 * boundary that shows the home screen rather than a blank page", with one
 * condition that outranks the rest: "I don't want the bug report to be sent
 * automatically. I want the parent to choose whether or not to send it."
 *
 * So this file records and never transmits. Every field tool the industry
 * uses phones home; S6 says the app makes no network calls, and this keeps
 * that promise to the letter: the ring lives in localStorage on the device,
 * it is NOT part of the ordinary Copy log, and it reaches a clipboard only
 * when a grown-up presses "Copy error report" in the Grown-ups corner and
 * then decides, themselves, where that text goes. Nothing here imports
 * anything that can open a connection.
 *
 * What a record holds, and what it deliberately does not: the local time to
 * the minute, the app version, the screen the child was on, the kind (a
 * thrown error, a rejected promise, a render crash), the message capped at
 * MAX_MESSAGE characters with every URL reduced to its last path segment,
 * and the top stack frame treated the same way. No query strings, no
 * origins, no child name - the name is a device setting and no error message
 * in this app interpolates it, and the URL scrub is the guard for the rest.
 */
export const KEY = "wq-errors";
export const CAP = 20;
export const MAX_MESSAGE = 200;

/* Every URL becomes its last path segment: "https://host/a/b/App.jsx?x=1"
   reads "App.jsx". The origin is where a family's copy is served from, and a
   query string is whatever a browser appended; neither belongs in a report. */
export function scrub(text) {
  return String(text ?? "")
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s)"']+/gi, (u) => {
      const path = u.replace(/[?#].*$/, "").replace(/\/+$/, "");
      return path.slice(path.lastIndexOf("/") + 1) || "(url)";
    })
    .slice(0, MAX_MESSAGE);
}

/* The first frame that names a file, scrubbed like the message. A stack is
   the most URL-dense text a browser produces, so only one line survives. */
export function topFrame(stack) {
  /* Chrome frames start "at "; Firefox and Safari frames carry "fn@file:line".
     The first line of a Chrome stack is the message itself, which is why a
     frame is recognised by its shape and never by merely mentioning a file. */
  const line = String(stack ?? "").split("\n").map((l) => l.trim())
    .find((l) => /^at /.test(l) || /@.+:\d+/.test(l)) || "";
  return scrub(line.replace(/^at /, "")).slice(0, 120);
}

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function readErrors(ls = store()) {
  try {
    const list = JSON.parse(ls?.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function clearErrors(ls = store()) {
  try { ls?.removeItem(KEY); } catch { /* storage refused - nothing to clear */ }
}

/* Newest last; the oldest drops off at CAP. A storage that refuses (quota,
   private mode) loses the record and nothing else - the game goes on. */
export function record({ kind, message, where, screen, version, when = new Date() }, ls = store()) {
  /* Local time to the minute, the clock a grown-up reads; never a UTC stamp
     that puts an evening crash on the next morning. */
  const two = (n) => String(n).padStart(2, "0");
  const entry = {
    at: `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())} ${two(when.getHours())}:${two(when.getMinutes())}`,
    v: String(version ?? "?"),
    screen: String(screen ?? "?"),
    kind: String(kind ?? "error"),
    message: scrub(message),
    where: scrub(where),
  };
  const list = readErrors(ls);
  list.push(entry);
  while (list.length > CAP) list.shift();
  try { ls?.setItem(KEY, JSON.stringify(list)); } catch { /* refused */ }
  return entry;
}

/* Wires the two browser-level catch-alls. `screen` answers "which screen is
   up right now"; App dispatches wq-screen on every change and main.jsx keeps
   the last one. Returns the remover, for tests. */
export function install(win, { screen, version }) {
  const onError = (e) => record({
    kind: "error", screen: screen(), version,
    message: e?.message || String(e?.error || e),
    where: topFrame(e?.error?.stack) || (e?.filename ? `${scrub(e.filename)}:${e.lineno || 0}` : ""),
  });
  const onRejection = (e) => record({
    kind: "rejection", screen: screen(), version,
    message: e?.reason?.message || String(e?.reason),
    where: topFrame(e?.reason?.stack),
  });
  win.addEventListener("error", onError);
  win.addEventListener("unhandledrejection", onRejection);
  return () => { win.removeEventListener("error", onError); win.removeEventListener("unhandledrejection", onRejection); };
}

/* The text a grown-up copies. Its first lines say, in plain words, what it
   is and that nothing has been sent - the owner's condition, in the report
   itself, so it survives being pasted anywhere. */
export function errorReport(list, version) {
  const head = [
    "# Word Quest bug report",
    "",
    `Version ${version}. ${list.length} problem${list.length === 1 ? "" : "s"} recorded on this device.`,
    "Nothing in this report was sent anywhere. A grown-up copied it and chooses where it goes.",
    "It carries no name, no address and no web address: only what broke, where, and when.",
    "",
  ];
  const rows = list.map((e, i) => `${i + 1}. ${e.at} · v${e.v} · ${e.screen} · ${e.kind}: ${e.message}${e.where ? `\n   at ${e.where}` : ""}`);
  return head.concat(rows.length ? rows : ["(none)"]).join("\n") + "\n";
}
