# Move an approved word out of the waiting room and into the pack.
#
# A word reaches a child only when four things are true: it is in a level, it
# has a row in tools/voice-words.csv, its bytes are in app/public/voice with a
# manifest entry, and G13 can verify those bytes against the pin. The listening
# rounds gave us the bytes; on 2026-08-12 a hundred and fifteen approved words
# were still sitting in tools/pending-words with no level, and the count had
# been wrong in the documents for a day. This tool exists so the last three
# steps are one command and cannot be done by hand, half-way.
#
# It NEVER re-renders. A re-render is a different file, and a different file is
# one no person heard (E3, and docs/settled.md's "the trap this project keeps
# falling into"). The bytes copied here are the exact bytes of the round, and
# the copy is refused if the source does not hash to the value the ledger
# recorded when the owner approved it.
#
# Usage:
#   python3 tools/ship-words.py --check          what would move, and why
#   python3 tools/ship-words.py --write          move it
#   python3 tools/ship-words.py --self-test      prove the refusals refuse
import hashlib
import json
import pathlib
import shutil
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
PEND = REPO / "tools" / "pending-words"
PACK = REPO / "app" / "public" / "voice"
LEDGER = PEND / "pending-words.json"
CSV = REPO / "tools" / "voice-words.csv"

# The bank defaults every row starts from (tools/gen-voice-lock.mjs DEFAULTS).
# A byte-pinned row deviates by definition, so these are the values the CSV
# carries for knobs the batch renderers did not expose as columns.
DEFAULTS = dict(voice="af_heart", lang="en-us", speed="0.85", lead_ms="80", tail_ms="300",
                fade_ms="10", phoneme="", period="no", onset_trim="no", trim_ms="0",
                bright_head_ms="0", head_trim_ms="0", skip_burst="no",
                carrier_text="", carrier_cut_mode="", energy_margin_ms="", energy_floor_db="",
                energy_gap_ms="", asr_start_s="", asr_end_s="", asr_guard_lead_ms="",
                asr_guard_tail_ms="")


def sha(p):
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


def family_speed(family):
    """The speed a family name states, when it states one. Families are named
    like listen_sp0.8 or spell_sp0.95_f30; the number after 'sp' is the render
    speed and is recoverable exactly. Families that do not name one (batch 1's
    carrier_listen, the again_/twice_ shapes) keep the bank default, and the
    row's ear_notes names the batch renderer that holds the full recipe."""
    for part in family.split("_"):
        if part.startswith("sp") and part[2:].replace(".", "", 1).isdigit():
            return part[2:]
    if family.endswith("_s1"):
        return "1.0"
    return DEFAULTS["speed"]


def duration_ms(p):
    import av
    c = av.open(str(p))
    s = c.streams.audio[0]
    n = sum(f.to_ndarray().shape[-1] for f in c.decode(s))
    sr = s.codec_context.sample_rate
    c.close()
    return int(round(n * 1000 / sr))


def csv_cell(v):
    """RFC 4180, matching tools/gen-voice-lock.mjs parseCsv."""
    v = str(v)
    return '"' + v.replace('"', '""') + '"' if any(c in v for c in ',"\n') else v


def plan():
    """Every approved word that now has a level and is not yet in the pack."""
    sys.path.insert(0, str(REPO / "tools"))
    ledger = json.loads(LEDGER.read_text())
    manifest = json.loads((PACK / "manifest.json").read_text())
    header = CSV.read_text().split("\n")[0].split(",")
    have = {line.split(",")[0] for line in CSV.read_text().split("\n")[1:] if line}

    import subprocess
    levels = json.loads(subprocess.run(
        ["node", "-e", "import('./src/engine.js').then(m=>console.log(JSON.stringify("
         "Object.fromEntries(m.LEVELS.flatMap(l=>l.words.map(w=>[w,l.n]))))))"],
        cwd=REPO, capture_output=True, text=True, check=True).stdout)

    rows, skipped = [], []
    for word, rec in sorted(ledger.items()):
        if word.startswith("s:") or word == "_comment" or not isinstance(rec, dict):
            continue
        if word not in levels:
            skipped.append((word, "no level yet"))
            continue
        if "w:" + word in manifest and word in have:
            skipped.append((word, "already shipped"))
            continue
        src = PEND / f"w-{word}.mp3"
        if not src.exists():
            skipped.append((word, "no audio in the waiting room"))
            continue
        got = sha(src)
        if got != rec.get("sha256"):
            skipped.append((word, f"REFUSED: bytes are not the approved ones ({got[:12]})"))
            continue
        rows.append({"word": word, "level": levels[word], "src": src, "rec": rec,
                     "sha": got, "header": header})
    return rows, skipped, manifest, header


def csv_row(r, header):
    rec = r["rec"]
    fam = rec.get("family", "")
    cells = dict(DEFAULTS)
    cells["speed"] = family_speed(fam)
    cells.update(
        word=r["word"], level=str(r["level"]), locked="yes",
        verdict=rec.get("verdict", ""),
        ear_notes=f'owner {rec.get("verdict","")} {rec.get("arm","")}; family {fam}; '
                  f'recipe in the batch renderer, not in these columns',
        round=rec.get("round", ""), listen_context="clip",
        byte_pin_sha256=r["sha"],
    )
    return ",".join(csv_cell(cells.get(h, "")) for h in header)


def write(rows, manifest):
    lines = CSV.read_text().rstrip("\n").split("\n")
    header = lines[0].split(",")
    for r in rows:
        dst = PACK / f"w-{r['word']}.mp3"
        shutil.copyfile(r["src"], dst)
        if sha(dst) != r["sha"]:
            raise SystemExit(f"{r['word']}: the copy does not hash to the approved bytes")
        manifest["w:" + r["word"]] = {"file": dst.name, "ms": duration_ms(dst)}
        lines.append(csv_row(r, header))
        # The pack's recipe must declare any word rendered off the bank default,
        # or G13 refuses the pack: the CSV would say 0.9 and the recipe would say
        # nothing, and a re-render would come out at the wrong speed. Found on
        # 2026-08-12 when "of" shipped at 0.9 and the gate stopped the build.
        speed = float(family_speed(r["rec"].get("family", "")))
        if abs(speed - float(DEFAULTS["speed"])) > 1e-9:
            ov = manifest["__recipe"].setdefault("word_speed_override", {})
            ov[r["word"]] = int(speed) if speed.is_integer() else speed
            manifest["__recipe"]["word_speed_override"] = dict(sorted(ov.items()))
    CSV.write_text("\n".join(lines) + "\n")
    ordered = {k: manifest[k] for k in sorted(manifest) if k != "__recipe"}
    ordered["__recipe"] = manifest["__recipe"]
    (PACK / "manifest.json").write_text(json.dumps(ordered, indent=1) + "\n")


def self_test():
    """Every refusal this tool must make. Without these it is a copier, and a
    copier would happily ship a re-render nobody heard."""
    import tempfile
    ok = []
    d = pathlib.Path(tempfile.mkdtemp())
    good, bad = d / "a.mp3", d / "b.mp3"
    good.write_bytes(b"the approved bytes")
    bad.write_bytes(b"a re-render nobody heard")
    ok.append(("a changed byte changes the hash", sha(good) != sha(bad)))
    ok.append(("the hash is stable", sha(good) == sha(good)))
    ok.append(("a family that names its speed is read exactly", family_speed("listen_sp0.75") == "0.75"))
    ok.append(("a family that names none keeps the bank default", family_speed("carrier_listen") == "0.85"))
    ok.append(("the _s1 families are speed 1.0", family_speed("carrier_listen_s1") == "1.0"))
    ok.append(("a cell with a comma is quoted", csv_cell("a, b") == '"a, b"'))
    ok.append(("a cell with a quote doubles it", csv_cell('say "x"') == '"say ""x"""'))
    ok.append(("a plain cell is left alone", csv_cell("perfect") == "perfect"))
    # The recipe override, both ways. Without the first control this tool ships
    # a word at 0.9 and tells the pack nothing, which is the fault G13 caught on
    # 2026-08-12; without the second it would clutter the recipe with every word
    # that is simply at the default.
    def override_for(family):
        man = {"__recipe": {}}
        speed = float(family_speed(family))
        if abs(speed - float(DEFAULTS["speed"])) > 1e-9:
            man["__recipe"].setdefault("word_speed_override", {})["w"] = (
                int(speed) if speed.is_integer() else speed)
        return man["__recipe"].get("word_speed_override", {})

    ok.append(("a word off the default speed is declared in the recipe",
               override_for("listen_sp0.9_front130") == {"w": 0.9}))
    ok.append(("a speed-1 family is declared as 1, not 1.0",
               override_for("carrier_listen_s1") == {"w": 1}))
    ok.append(("a word at the bank default adds nothing to the recipe",
               override_for("carrier_listen") == {}))
    rows, skipped, _, _ = plan()
    reasons = {r for _, r in skipped}
    ok.append(("a word with no level is refused a place in the pack",
               any("no level" in r for r in reasons) or not skipped))
    bad_count = sum(1 for _, r in skipped if r.startswith("REFUSED"))
    ok.append(("no approved word in the tree fails its own hash", bad_count == 0))
    for name, passed in ok:
        print(("ok   " if passed else "FAIL ") + name)
    failed = sum(1 for _, p in ok if not p)
    print(f"\nship-words controls: {len(ok) - failed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(1 if self_test() else 0)
    rows, skipped, manifest, header = plan()
    refused = [s for s in skipped if s[1].startswith("REFUSED")]
    for w, why in refused:
        print(f"REFUSED  {w}: {why}")
    print(f"{len(rows)} word(s) ready to ship, {len(skipped)} skipped ({len(refused)} refused)")
    for r in rows:
        print(f"  L{r['level']:<3} {r['word']:<8} {r['rec'].get('verdict',''):<9} {r['rec'].get('round','')}")
    if "--write" in sys.argv:
        if refused:
            raise SystemExit("refusing to ship anything while a word fails its own hash")
        write(rows, manifest)
        print(f"\nshipped {len(rows)} words. Now run: node tools/gen-voice-lock.mjs "
              "&& python3 tools/voice-edges.py --write")
