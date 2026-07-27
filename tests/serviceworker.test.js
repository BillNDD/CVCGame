/* The service worker, driven rather than read (gate G14).
   The fault this file was written from, reported from a phone: a page served
   from the app's own folder — the device audio test — came up blank. The
   worker answered EVERY navigation in its scope with the app's index.html,
   and the app addresses its assets relative to the page, so under
   /CVCGame/audio-test/ they resolved to a folder that has no assets in it.
   Nothing loaded and nothing said why.
   The worker's source is app/sw-template.js; the build fills in the cache
   name and the precache list and writes it to dist/sw.js. These tests load
   that source, install doubles for caches and fetch, and dispatch real fetch
   events at the real handlers. */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const APP = "https://host.test/CVCGame/";

function bootWorker({ cached = ["./index.html"] } = {}) {
  const src = readFileSync("app/sw-template.js", "utf8")
    .replace("__CACHE_VERSION__", "test")
    .replace("__ASSETS__", JSON.stringify(cached));
  const handlers = {};
  const store = new Map(cached.map((u) => [new URL(u, APP).pathname, { body: u, cached: true }]));
  const network = [];
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    location: new URL(APP + "sw.js"),
    clients: { claim: async () => {} },
    skipWaiting: () => {},
  };
  const caches = {
    match: async (req) => {
      const url = new URL(typeof req === "string" ? req : req.url, APP);
      return store.get(url.pathname);
    },
    open: async () => ({ addAll: async () => {}, put: async () => {} }),
    keys: async () => [],
    delete: async () => true,
  };
  const fetchDouble = async (req) => {
    const url = typeof req === "string" ? req : req.url;
    network.push(new URL(url, APP).pathname);
    if (network.offline) throw new Error("offline");
    return { ok: true, body: "from the network", clone: () => ({}) };
  };
  const run = new Function("self", "caches", "fetch", "URL", src);
  run(self, caches, fetchDouble, URL);
  return { handlers, network, store };
}

/* A fetch event that captures whatever the worker answers with. */
function navigateTo(handlers, path, mode = "navigate") {
  let answered;
  handlers.fetch({
    request: { url: APP.replace("/CVCGame/", "") + path, method: "GET", mode },
    respondWith: (p) => { answered = p; },
  });
  return answered;
}

describe("G14 — the service worker answers for the app, and only for the app", () => {
  let w;
  beforeEach(() => { w = bootWorker(); });

  it("1: the app's own page is served from the cache, so it opens offline", async () => {
    const answer = await navigateTo(w.handlers, "/CVCGame/");
    expect(answer.cached).toBe(true);
    expect(answer.body).toBe("./index.html");
    expect(w.network.length).toBe(0);
  });

  it("2: another page in the same folder is NOT given the app's page", async () => {
    const answer = await navigateTo(w.handlers, "/CVCGame/audio-test/");
    /* The reported fault: this used to return the app's index.html, whose
       assets then resolved under /CVCGame/audio-test/ and did not exist. */
    expect(answer.body).toBe("from the network");
    expect(answer.cached).toBeUndefined();
    expect(w.network).toEqual(["/CVCGame/audio-test/"]);
  });

  it("3: offline, that page falls back to its OWN cached page, never the app's", async () => {
    const offline = bootWorker({ cached: ["./index.html", "./audio-test/index.html"] });
    offline.network.offline = true;
    const answer = await navigateTo(offline.handlers, "/CVCGame/audio-test/");
    expect(answer.body).toBe("./audio-test/index.html");
  });

  it("4 (control): a clip request is still served from the cache, and a miss goes to the network", async () => {
    const withClip = bootWorker({ cached: ["./index.html", "./voice/w-cat.mp3"] });
    const hit = await navigateTo(withClip.handlers, "/CVCGame/voice/w-cat.mp3", "no-cors");
    expect(hit.body).toBe("./voice/w-cat.mp3");
    const miss = await navigateTo(withClip.handlers, "/CVCGame/voice/w-dog.mp3", "no-cors");
    expect(miss.body).toBe("from the network");
  });

  it("5 (control): the version check is never intercepted, so it always sees the live host", () => {
    expect(navigateTo(w.handlers, "/CVCGame/version.json", "cors")).toBeUndefined();
    expect(navigateTo(w.handlers, "/CVCGame/voice/manifest.json", "cors")).toBeDefined();  // control
  });
});
