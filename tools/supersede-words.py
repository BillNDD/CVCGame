# Replace a SHIPPED word clip with a take the owner has just accepted over it.
#
# WHY A SEPARATE TOOL. tools/record-takes.py refuses to mint over a banked,
# owner-approved take, and it is right to: an approved take is approved until
# the owner says otherwise. This is the path for exactly that saying-otherwise -
# a re-listening round (open fault BA, 2026-09-02: the fifty hardest clips, ten
# at a time) in which the owner accepts a NEW take for a word that already
# ships. Nothing here re-renders: the bytes written are the bytes the page
# offered under the id the owner marked, refused unless they hash to what the
# round's audio file recorded.
#
# WHAT IT WRITES, in one pass after a dry run that touches nothing:
#   - app/public/voice/w-{word}.mp3          the new bytes
#   - app/public/voice/manifest.json         file and ms (lead and tail are
#                                            re-measured by voice-edges --write)
#   - tools/voice-words.csv                  verdict, ear_notes naming the new
#                                            family AND what it supersedes,
#                                            round, speed, byte pin
#   - tools/pending-words/pending-words.json the waiting-room record, where the
#                                            word has one, and its w-{word}.mp3 copy
#   - tools/pending-words/round-verdicts.json every judgement of the round
# Then run: node tools/gen-voice-lock.mjs; py tools/voice-edges.py --write;
# node tools/voice-check.mjs.
#
# Usage:
#   py -3.12 tools/supersede-words.py <audio.json> <round-label> [--write] < verdicts.txt
#   py -3.12 tools/supersede-words.py --self-test
# Verdict lines are record-takes.py's: "word: perfect word_3", "word: none are
# right - a comment". Only accepts write; every line is logged.
import base64
import csv
import hashlib
import io
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
CSV_PATH = REPO / "tools" / "voice-words.csv"
LEDGER = REPO / "tools" / "pending-words" / "pending-words.json"
VERDICT_LOG = REPO / "tools" / "pending-words" / "round-verdicts.json"
LINE = re.compile(r"^\s*(?P<id>[A-Za-z0-9:'_-]+)\s*:\s*(?P<verdict>perfect|either-is-fine|accept|closest|none are right|no verdict)"
                  r"(?:\s+(?P<arm>[^\s-][^\s]*))?(?:\s*-\s*(?P<note>.*))?\s*$")


def duration_ms(mp3):
    import av
    c = av.open(io.BytesIO(mp3)); s = c.streams.audio[0]
    n = sum(f.to_ndarray().shape[-1] for f in c.decode(s)); sr = s.codec_context.sample_rate; c.close()
    return int(round(n * 1000 / sr))


def family_speed(fam):
    m = re.search(r"sp(0\.\d+|1\.0)", fam or "")
    return m.group(1) if m else ""


def plan(audio, text, csv_rows, ledger):
    items, refusals, accepts = [], [], []
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = LINE.match(line)
        if not m:
            refusals.append(f"line {n} is not a verdict line: {line}"); continue
        word, verdict, arm, note = m.group("id"), m.group("verdict"), m.group("arm"), (m.group("note") or "").strip()
        items.append({"id": word, "verdict": verdict, "arm": arm or "", "note": note})
        if verdict not in ("perfect", "either-is-fine", "accept"):
            continue
        arms = audio.get(word)
        if not arms:
            refusals.append(f"{word}: not in the round's audio file"); continue
        a = next((x for x in arms if x.get("id") == arm), None)
        if a is None:
            refusals.append(f"{word}: arm {arm} is not on the page"); continue
        mp3 = base64.b64decode(a["b64"])
        sha = hashlib.sha256(mp3).hexdigest()
        if sha != (a.get("sha256") or a.get("sha")):
            refusals.append(f"{word}: {arm}'s bytes do not hash to what the page offered"); continue
        row = next((r for r in csv_rows if r["word"] == word), None)
        if row is None or not (PACK / f"w-{word}.mp3").exists():
            refusals.append(f"{word}: not a shipped word - use record-takes.py and ship-words.py for a new word"); continue
        if sha == row.get("byte_pin_sha256"):
            refusals.append(f"{word}: {arm} is byte-identical to the clip that already ships"); continue
        accepts.append({"word": word, "arm": arm, "family": a.get("family", ""), "mp3": mp3, "sha": sha, "row": row, "note": note})
    return items, refusals, accepts


def apply(accepts, items, round_label, csv_rows, header, ledger, manifest):
    for acc in accepts:
        w, row = acc["word"], acc["row"]
        (PACK / f"w-{w}.mp3").write_bytes(acc["mp3"])
        # The waiting room keeps its own copy of every ledgered clip, and its
        # rule 1 hashes THAT copy against the ledger's pin. The first run of
        # this tool re-pinned the ledger and left the copy stale, so the check
        # went red on seven words (2026-09-02). The copy follows the pack.
        if (LEDGER.parent / f"w-{w}.mp3").exists():
            (LEDGER.parent / f"w-{w}.mp3").write_bytes(acc["mp3"])
        manifest[f"w:{w}"] = {"file": f"w-{w}.mp3", "ms": duration_ms(acc["mp3"])}
        old = re.search(r"family ([^;]+)", row.get("ear_notes", "")); old_round = row.get("round", "")
        row["verdict"] = "perfect"
        row["ear_notes"] = (f'owner perfect {acc["arm"]} [R50]; family {acc["family"]}; recipe in tools/render_batch22.py; '
                            f'supersedes {old.group(1).strip() if old else "the prior clip"} of {old_round}'
                            + (f'; {acc["note"]}' if acc["note"] else ""))
        row["round"] = round_label
        row["listen_context"] = "clip"
        sp = family_speed(acc["family"])
        if sp:
            row["speed"] = sp
        row["byte_pin_sha256"] = acc["sha"]
        # the recipe's speed override follows the CSV, as ship-words.py keeps it:
        # an override equal to the default is removed, a deviating one recorded
        rec = manifest.setdefault("__recipe", {}); ov = rec.setdefault("word_speed_override", {})
        if sp and float(sp) != float(rec.get("word_speed", 0.85)):
            ov[w] = float(sp)
        else:
            ov.pop(w, None)
        rec["word_speed_override"] = dict(sorted(ov.items()))
        if w in ledger and isinstance(ledger[w], dict):
            ledger[w] = {**ledger[w], "arm": acc["arm"], "family": acc["family"], "ms": manifest[f"w:{w}"]["ms"],
                         "sha256": acc["sha"], "round": round_label, "verdict": "perfect"}
    # LINE-LEVEL: only the superseded rows are rewritten; every other line stays
    # byte-identical. A whole-file DictWriter pass dropped five byte pins from
    # ragged rows on the first run of this tool (2026-09-02) - the ledger's
    # other 1,114 rows are not this tool's to touch.
    raw = CSV_PATH.read_text(encoding="utf-8").split("\n")
    changed = {a["word"]: a["row"] for a in accepts}
    for i, line in enumerate(raw):
        w = line.split(",", 1)[0]
        if w in changed:
            out = io.StringIO(newline="")
            wr = csv.DictWriter(out, fieldnames=header, lineterminator="", extrasaction="ignore")
            wr.writerow({k: v for k, v in changed[w].items() if k is not None})
            raw[i] = out.getvalue()
    CSV_PATH.write_text("\n".join(raw), encoding="utf-8")
    ordered = {k: manifest[k] for k in sorted(manifest) if k != "__recipe"}
    if "__recipe" in manifest:
        ordered["__recipe"] = manifest["__recipe"]
    (PACK / "manifest.json").write_text(json.dumps(ordered, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    LEDGER.write_text(json.dumps(ledger, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    log = json.loads(VERDICT_LOG.read_text(encoding="utf-8")) if VERDICT_LOG.exists() else {}
    log[round_label] = [{"id": i["id"], "verdict": i["verdict"] + (f' {i["arm"]}' if i["arm"] else ""), "note": i["note"]} for i in items]
    VERDICT_LOG.write_text(json.dumps(log, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def self_test():
    """E5: the refusals that matter, on fixtures."""
    fake = base64.b64encode(b"not-an-mp3").decode()
    sha = hashlib.sha256(b"not-an-mp3").hexdigest()
    audio = {"cat": [{"id": "cat_1", "b64": fake, "sha256": sha, "family": "A_listen_sp0.75"}]}
    rows = [{"word": "cat", "ear_notes": "family old", "round": "r0", "byte_pin_sha256": "x" * 64}]
    _, ref, acc = plan(audio, "cat: perfect cat_1", rows, {})
    assert not acc and any("not a shipped word" in r for r in ref) or (PACK / "w-cat.mp3").exists(), "an unshipped word is refused"
    _, ref, _ = plan(audio, "cat: perfect cat_2", rows, {})
    assert any("not on the page" in r for r in ref), "an arm the page never offered is refused"
    bad = {"cat": [{"id": "cat_1", "b64": fake, "sha256": "0" * 64, "family": "A"}]}
    _, ref, _ = plan(bad, "cat: perfect cat_1", rows, {})
    assert any("do not hash" in r for r in ref), "bytes that do not hash to the page's are refused"
    same = [{"word": "cat", "ear_notes": "", "round": "", "byte_pin_sha256": sha}]
    _, ref, _ = plan(audio, "cat: perfect cat_1", same, {})
    assert any("byte-identical" in r for r in ref), "the clip that already ships is refused as a change"
    _, ref, acc = plan(audio, "cat: none are right - too fast", rows, {})
    assert not ref and not acc, "a refusal writes nothing and refuses nothing"
    print("supersede-words self-test: 5 controls, all caught")


def main(argv):
    if "--self-test" in argv:
        return self_test() or 0
    if len(argv) < 3:
        print(__doc__); return 2
    audio = json.loads(pathlib.Path(argv[1]).read_text(encoding="utf-8"))
    round_label = argv[2]
    text = sys.stdin.read()
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rd = csv.DictReader(f); header = rd.fieldnames; csv_rows = list(rd)
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    manifest = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    items, refusals, accepts = plan(audio, text, csv_rows, ledger)
    for a in accepts:
        print(f'  {a["word"]:8} {a["arm"]:10} {a["family"]:32} {a["sha"][:12]}  supersedes {a["row"].get("round","")[:30]}')
    for r in refusals:
        print("  !!", r)
    if refusals:
        print("REFUSED - the tree has not been touched"); return 1
    if "--write" not in argv:
        print(f"dry run: {len(accepts)} supersessions ready, {len(items)} judgements to log; add --write"); return 0
    apply(accepts, items, round_label, csv_rows, header, ledger, manifest)
    print(f"round {round_label}: {len(accepts)} clips superseded, {len(items)} judgements logged")
    print("now run: node tools/gen-voice-lock.mjs && py -3.12 tools/voice-edges.py --write && node tools/voice-check.mjs")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
