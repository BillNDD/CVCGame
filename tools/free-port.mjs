/* FREE THE CENSUS PORT BEFORE A RUN, AND SAY SO.
 *
 * playwright.config.mjs sets `reuseExistingServer: false` on purpose: a preview
 * server already on this port is serving some OTHER build, and attaching to it
 * means measuring an app nobody built for this run. That happened twice — once
 * during a review, and once in the first full census, which spent an hour
 * measuring a build made before "a" and the split v existed.
 *
 * The cost of that rule is a zombie. When a census run is interrupted — a
 * killed process, a container restart, a cell that times out — the preview it
 * started outlives it and keeps the port. The NEXT run then either refuses to
 * start ("Port 4187 is already in use") or, worse, starts, has its server torn
 * down under it, and reports ERR_CONNECTION_REFUSED on the cells that had not
 * run yet. Both were seen on 2026-08-13, and the second reads exactly like a
 * flaky app: a handful of cells failing for no reason a person can see, which
 * is the noise a real finding hides inside.
 *
 * So the port is cleared BEFORE the runner starts, deliberately and loudly,
 * rather than reused silently. A killed listener is printed with its command
 * line, because "something was already there" is a fact worth reading.
 *
 * Run: node tools/free-port.mjs 4187      Controls: node tools/free-port.mjs --self-test
 */
import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { createServer } from "node:net";

/* Every process holding a listening socket on this port, by walking /proc.
   lsof and fuser are not guaranteed present in a container, and a tool that
   silently does nothing when its helper is missing is the whole problem this
   file exists to solve. */
function listenersOn(port) {
  const hex = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let text = "";
    try { text = readFileSync(table, "utf8"); } catch { continue; }
    for (const line of text.split("\n").slice(1)) {
      const f = line.trim().split(/\s+/);
      /* st === "0A" is TCP_LISTEN. A connection TO the port is not a listener
         and must not be killed: that would shoot the browser, not the server. */
      if (f.length > 9 && f[1].endsWith(":" + hex) && f[3] === "0A") inodes.add(f[9]);
    }
  }
  if (!inodes.size) return [];
  const found = [];
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    let fds = [];
    try { fds = readdirSync(`/proc/${pid}/fd`); } catch { continue; }
    for (const fd of fds) {
      let link = "";
      try { link = readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { continue; }
      const m = /^socket:\[(\d+)\]$/.exec(link);
      if (m && inodes.has(m[1])) {
        let cmd = "";
        try { cmd = readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim(); } catch { /* gone */ }
        found.push({ pid: Number(pid), cmd });
        break;
      }
    }
  }
  return found;
}

function free(port) {
  const held = listenersOn(port);
  if (!held.length) { console.log(`port ${port} is free`); return 0; }
  for (const { pid, cmd } of held) {
    console.log(`port ${port} was held by pid ${pid}: ${cmd.slice(0, 120)}`);
    try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
  }
  return held.length;
}

function selfTest() {
  const ok = [];
  const PORT = 4919;                                   // not the census port
  return new Promise((resolve) => {
    const server = createServer(() => {});
    server.listen(PORT, "127.0.0.1", () => {
      /* This process IS the listener, so it must find itself. A scan that
         finds nothing looks exactly like a port that is free, which is the
         only way this tool can fail: it would then let a zombie through and
         the run would report ERR_CONNECTION_REFUSED as if the app were at
         fault. */
      const held = listenersOn(PORT);
      ok.push(["a listening port is found, with the process that holds it",
        held.some((h) => h.pid === process.pid)]);
      ok.push(["the command line of the holder is reported, not just a number",
        held.some((h) => h.pid === process.pid && h.cmd.length > 0)]);
      /* AND A PORT NOBODY HOLDS REPORTS NOBODY. Without this the scan could
         return every process on the machine and both checks above would still
         pass — and the tool would kill the whole container. */
      ok.push(["a port nobody is listening on reports no holder", listenersOn(4920).length === 0]);
      server.close(() => {
        ok.push(["a closed port reports no holder", listenersOn(PORT).length === 0]);
        for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
        const failed = ok.filter(([, p]) => !p).length;
        console.log(`\nfree-port controls: ${ok.length - failed} passed, ${failed} failed`);
        resolve(failed ? 1 : 0);
      });
    });
    server.on("error", () => { console.error("FAIL could not open a control port"); resolve(1); });
  });
}

if (process.argv.includes("--self-test")) process.exit(await selfTest());

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error("usage: node tools/free-port.mjs <port>");
  process.exit(1);
}
if (free(port)) await new Promise((r) => setTimeout(r, 500));   // let the socket close
