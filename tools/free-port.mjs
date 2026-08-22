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
 * WINDOWS, ADDED 2026-08-14 (open-faults Q), AND WHAT IT EXPOSED. This file
 * walked /proc and nothing else. On Windows /proc is ENOENT, so the scan
 * returned an empty list for every port — and an empty list means "the port is
 * free". The tool whose whole job is to refuse a silent reuse was itself
 * silently answering "free" to every question ever asked of it on this
 * platform.
 *
 * Two of its four controls failed loudly and were recorded as a Windows gap.
 * The other two — "a port nobody is listening on reports no holder" and "a
 * closed port reports no holder" — PASSED, and passed for the wrong reason:
 * they assert that nothing is found, and nothing was ever found. That is a
 * negative control that cannot fail (E5), and it is the more dangerous half,
 * because a red control gets fixed and a green one gets trusted.
 *
 * THE RULE THAT COMES OUT OF IT: a scanner that cannot tell must never answer
 * "free". `listenersOn` now throws when it cannot determine the truth, and the
 * caller refuses the run rather than waving it through. "I do not know" and
 * "nobody is there" produce the same empty list and must not produce the same
 * behaviour.
 *
 * Run: node tools/free-port.mjs 4187      Controls: node tools/free-port.mjs --self-test
 */
import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { createServer } from "node:net";
import { execFileSync } from "node:child_process";

/* Raised when the scan cannot establish the truth about a port. Its own class
   so a caller can never confuse it with "no listeners": that confusion is the
   fault this file was rebuilt around. */
class CannotTell extends Error {}

/* LINUX. Every process holding a listening socket on this port, by walking
   /proc. lsof and fuser are not guaranteed present in a container, and a tool
   that silently does nothing when its helper is missing is the whole problem
   this file exists to solve. */
function listenersOnProc(port, read = readFileSync) {
  let sawTable = false;
  const hex = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let text = "";
    try { text = read(table, "utf8"); } catch { continue; }
    sawTable = true;
    for (const line of text.split("\n").slice(1)) {
      const f = line.trim().split(/\s+/);
      /* st === "0A" is TCP_LISTEN. A connection TO the port is not a listener
         and must not be killed: that would shoot the browser, not the server. */
      if (f.length > 9 && f[1].endsWith(":" + hex) && f[3] === "0A") inodes.add(f[9]);
    }
  }
  /* Neither table readable is not an empty machine, it is a blind scan. */
  if (!sawTable) throw new CannotTell("no /proc/net/tcp table is readable on this system");
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

/* The script asks the OS twice: who is LISTENING on the port, and what is that
   process's command line. It prints one "H" line per holder and always ends
   with "END" — the sentinel is the point. Without it, a PowerShell that ran but
   whose cmdlet was missing prints nothing, which is indistinguishable from a
   free port. `$pid` is a PowerShell automatic variable holding the CURRENT
   process id, so the loop variable is `$op`; using `$pid` here would silently
   report this process as the holder of every port. */
const PS_SCAN = (port) => [
  "if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) { 'ERR" + "\t" + "Get-NetTCPConnection is unavailable'; exit }",
  `$c = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue)`,
  "foreach ($op in ($c | Select-Object -ExpandProperty OwningProcess -Unique)) {",
  "  $p = Get-CimInstance Win32_Process -Filter \"ProcessId=$op\" -ErrorAction SilentlyContinue",
  "  'H' + [char]9 + $op + [char]9 + $p.CommandLine",
  "}",
  "'END'",
].join("\n");

/* The parse is its own function so its refusals can be CONTROLLED directly.
   That is not tidiness: when this file was rebuilt on 2026-08-14 the first
   version kept the sentinel check inline, and a planted fault that replaced
   `throw` with `return []` — the exact original Windows fault, in the exact
   place it lived — passed all seven controls. The controls only ever exercised
   an injected scanner that threw on demand, never the real one's own guard.
   A refusal that no control can reach is a refusal that will be deleted by the
   next person who finds it inconvenient. */
function parseScan(out) {
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const err = lines.find((l) => l.startsWith("ERR\t"));
  if (err) throw new CannotTell(err.slice(4));
  /* The sentinel is the whole guard: no END means the script did not finish,
     and a truncated run must never read as an empty one. */
  if (!lines.includes("END")) throw new CannotTell("the port scan did not complete");
  const found = [];
  for (const line of lines) {
    if (!line.startsWith("H\t")) continue;
    const [, pidText, ...rest] = line.split("\t");
    const pid = Number(pidText);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    found.push({ pid, cmd: rest.join("\t").trim() });
  }
  return found;
}

/* WINDOWS. There is no /proc, so the OS is asked directly. */
function listenersOnWindows(port, run = null) {
  const exec = run || ((script) => execFileSync("powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  let out = "";
  try {
    out = exec(PS_SCAN(port));
  } catch (e) {
    throw new CannotTell("powershell could not be run: " + (e.message || "").split("\n")[0]);
  }
  return parseScan(out);
}

const SCAN = process.platform === "win32" ? listenersOnWindows : listenersOnProc;

function listenersOn(port, scan = SCAN) { return scan(port); }

/* Returns the number of listeners killed. It does NOT catch CannotTell: a scan
   that failed must reach the caller, because the only alternative is printing
   "port N is free" about a port nobody looked at. */
function free(port, scan = SCAN) {
  const held = listenersOn(port, scan);
  if (!held.length) { console.log(`port ${port} is free`); return 0; }
  for (const { pid, cmd } of held) {
    console.log(`port ${port} was held by pid ${pid}: ${cmd.slice(0, 120)}`);
    try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
  }
  return held.length;
}

/* Runs `fn` with console.log captured, so a control can assert on what a person
   would actually SEE rather than on a return value. The "is free" line is the
   dangerous output, and only this proves it was never printed. */
function saying(fn) {
  const real = console.log;
  const said = [];
  console.log = (...a) => said.push(a.join(" "));
  try { fn(); } catch (e) { console.log = real; return { said, threw: e }; }
  console.log = real;
  return { said, threw: null };
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

      /* THE NEGATIVE CONTROL THIS FILE LACKED (E5), and the reason it was
         rebuilt. Until 2026-08-14 a scanner that could not see anything —
         every scan on Windows — returned an empty list, and an empty list is
         reported to a person as "port is free". These two prove that a scan
         which cannot tell is refused rather than believed, and that the words
         "is free" never reach the screen on its behalf. */
      const blind = () => { throw new CannotTell("planted: the scanner cannot see"); };
      const r = saying(() => free(4920, blind));
      ok.push(["a scan that CANNOT TELL is refused, not reported as free",
        r.threw instanceof CannotTell]);
      ok.push(["and nothing on its behalf ever prints “is free”",
        !r.said.some((l) => l.includes("is free"))]);
      /* The same control from the other side: a scanner that legitimately sees
         nothing MUST still say free, or the guard above would just be a tool
         that never works. */
      const empty = saying(() => free(4920, () => []));
      ok.push(["a scan that genuinely sees nothing still reports free",
        empty.threw === null && empty.said.some((l) => l.includes("is free"))]);

      /* THE REAL SCANNERS' OWN REFUSALS, reached directly. The controls above
         all run against an injected scanner, so every one of them passed while
         `listenersOnWindows` was mutated to return [] where it should throw —
         the original fault, replanted, surviving. These reach the guards
         themselves, which is the only way they stay honest. */
      const throws = (fn) => { try { fn(); return false; } catch (e) { return e instanceof CannotTell; } };
      ok.push(["a scan cut off before its sentinel is refused, not read as empty",
        throws(() => parseScan("H\t42\tsomething"))]);
      ok.push(["a scan that printed nothing at all is refused",
        throws(() => parseScan(""))]);
      /* The ERR line carries END WITH IT, deliberately. Without the sentinel
         present this control passed while the ERR branch was deleted — the
         missing END was catching it instead, and the control was reading the
         wrong guard. Found by planting, 2026-08-14. Now only the ERR branch
         can produce this refusal, and the reason has to survive into it: an
         error the tool swallows the text of is one nobody can act on. */
      const errSaid = (() => {
        try { parseScan("ERR\tGet-NetTCPConnection is unavailable\nEND"); return null; }
        catch (e) { return e instanceof CannotTell ? e.message : null; }
      })();
      ok.push(["a COMPLETE scan reporting its own error is still refused",
        errSaid !== null]);
      ok.push(["and the reason it gave is carried, not swallowed",
        errSaid === "Get-NetTCPConnection is unavailable"]);
      /* ...and the sentinel must not be a rubber stamp: a COMPLETE scan that
         genuinely found nobody has to come back empty rather than throw. */
      ok.push(["a complete scan that found nobody returns empty",
        parseScan("END").length === 0]);
      ok.push(["a complete scan parses the holder and its command line",
        parseScan("H\t42\tnode serve.js\nEND")[0].pid === 42
        && parseScan("H\t42\tnode serve.js\nEND")[0].cmd === "node serve.js"]);
      /* The Linux guard, reachable on any platform by handing it a reader that
         can open nothing — which is precisely what Windows did to it. */
      ok.push(["a /proc scan with no readable table is refused, not read as empty",
        throws(() => listenersOnProc(4920, () => { throw new Error("ENOENT"); }))]);
      ok.push(["a Windows scan whose shell fails is refused",
        throws(() => listenersOnWindows(4920, () => { throw new Error("spawn failed"); }))]);

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

/* No argument means the census port: CENSUS_PORT, else 4187 - the same
   default playwright.config.mjs uses, so the two cannot disagree. The npm
   scripts used to pass `${CENSUS_PORT:-4187}`, a POSIX expansion that cmd.exe
   hands over as a literal string, which is Number(NaN) and a refusal - so
   `npm run census` had never once started on the owner's machine (2026-08-22). */
const port = Number(process.argv[2] ?? process.env.CENSUS_PORT ?? 4187);
if (!Number.isInteger(port) || port <= 0) {
  console.error("usage: node tools/free-port.mjs [port]   (default: CENSUS_PORT or 4187)");
  process.exit(1);
}
try {
  if (free(port)) await new Promise((r) => setTimeout(r, 500));   // let the socket close
} catch (e) {
  /* Loudly, and non-zero. The census must not start against a port whose state
     nobody established — that is how an hour was spent measuring the wrong
     build. */
  console.error(`REFUSING: cannot tell whether port ${port} is in use — ${e.message}`);
  process.exit(1);
}
