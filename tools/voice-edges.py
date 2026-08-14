# Where the speech actually starts and ends inside every clip of the pack.
#
# Each clip carries its own silence, and no two carry the same amount: across
# the shipped pack the lead runs 40 to 200 ms and the tail 0 to 422 ms. That
# was invisible while a seam was just "wait 700 ms after the file ends" - the
# rhythm was lumpy, but consistently lumpy, and the owner has approved it as it
# sounds.
#
# The sound-out reveal cannot live with it. Its 500 ms seam was chosen on
# 2026-08-11 from a demo that trimmed every clip first, so 500 ms was the gap
# the owner actually heard between one sound and the next. Played against the
# untrimmed pack the same plan gives gaps from 540 ms (/p/, which carries no
# tail at all) to 1122 ms (/sh/, which carries 422 ms) - a rhythm the owner has
# never heard and did not approve.
#
# So the player places SPEECH 500 ms apart rather than files, and to do that it
# needs to know where the speech is. This measures it once, at pack build time,
# and records it in the manifest. No audio is re-encoded and no clip changes,
# so nothing that has been listened to or pinned moves.
#
# A manifest that declares its own edges could declare them wrongly, which is
# why this file also verifies: --check re-measures every clip from the audio
# and fails on any disagreement, and --self-test proves that check catches a
# lie in both directions.
#
# Usage:
#   python voice-edges.py --write       measure the pack and record the edges
#   python voice-edges.py --check       re-measure and fail on any disagreement
#   python voice-edges.py --self-test   prove the check catches a fabricated edge
import json
import pathlib
import sys

import av
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
PACK = REPO / "app" / "public" / "voice"
MANIFEST = PACK / "manifest.json"

FLOOR_DB = -45.0     # the demo's own floor: quieter than this is not speech
FRAME_MS = 10
TOLERANCE_MS = 12    # one frame, plus the rounding either side of it


def load(p):
    c = av.open(str(p))
    s = c.streams.audio[0]
    x = np.concatenate([f.to_ndarray().flatten() for f in c.decode(s)]).astype(np.float32)
    sr = s.codec_context.sample_rate
    c.close()
    return (x / 32768.0 if np.abs(x).max() > 2 else x), sr


def edges(a, sr):
    """(lead_ms, tail_ms): the silence before the speech and after it."""
    n = max(1, int(sr * FRAME_MS / 1000))
    fr = [a[i:i + n] for i in range(0, max(1, len(a) - n + 1), n)]
    rms = np.array([np.sqrt(np.mean(f.astype(np.float64) ** 2)) for f in fr])
    db = 20 * np.log10(np.maximum(rms, 1e-9) / max(rms.max(), 1e-9))
    on = np.nonzero(db > FLOOR_DB)[0]
    if not len(on):
        return 0, 0
    total = len(a) / sr * 1000
    lead = int(on.min()) * n / sr * 1000
    end = (int(on.max()) + 1) * n / sr * 1000
    return round(lead), round(max(0.0, total - end))


def measure(manifest):
    out = {}
    for cid, m in manifest.items():
        if cid == "__recipe":
            continue
        p = PACK / m["file"]
        if not p.exists():
            raise SystemExit(f"missing file for {cid}: {p}")
        a, sr = load(p)
        out[cid] = edges(a, sr)
    return out


def problems(manifest, measured):
    """Every way the manifest's edges can disagree with the audio."""
    out = []
    for cid, (lead, tail) in sorted(measured.items()):
        m = manifest[cid]
        if "lead" not in m or "tail" not in m:
            out.append(f"{cid}: manifest declares no edges")
            continue
        if abs(m["lead"] - lead) > TOLERANCE_MS:
            out.append(f"{cid}: manifest says lead {m['lead']} ms, the audio says {lead} ms")
        if abs(m["tail"] - tail) > TOLERANCE_MS:
            out.append(f"{cid}: manifest says tail {m['tail']} ms, the audio says {tail} ms")
        # Silence at both ends cannot exceed the file: a clip with no speech in
        # it at all would otherwise pass every arithmetic check here.
        if m["lead"] + m["tail"] >= m["ms"]:
            out.append(f"{cid}: manifest leaves no speech between its edges")
    return out


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    if "--write" in sys.argv:
        measured = measure(manifest)
        for cid, (lead, tail) in measured.items():
            manifest[cid]["lead"] = lead
            manifest[cid]["tail"] = tail
        MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n", encoding="utf-8")
        leads = [v[0] for v in measured.values()]
        tails = [v[1] for v in measured.values()]
        print(f"wrote edges for {len(measured)} clips: "
              f"lead {min(leads)}-{max(leads)} ms, tail {min(tails)}-{max(tails)} ms")
        return

    measured = measure(manifest)

    if "--self-test" in sys.argv:
        cases = []
        pick = sorted(measured)[0]
        liar = json.loads(json.dumps(manifest))
        liar[pick]["lead"] = manifest[pick]["lead"] + 200
        cases.append(("a lead that is 200 ms longer than the audio", liar, pick))
        liar2 = json.loads(json.dumps(manifest))
        liar2[pick]["tail"] = max(0, manifest[pick]["tail"] - 200)
        cases.append(("a tail that is 200 ms shorter than the audio", liar2, pick))
        liar3 = json.loads(json.dumps(manifest))
        del liar3[pick]["lead"]
        cases.append(("a clip with no edges declared at all", liar3, pick))
        liar4 = json.loads(json.dumps(manifest))
        liar4[pick]["lead"] = liar4[pick]["ms"]
        liar4[pick]["tail"] = 0
        cases.append(("edges that leave no speech between them", liar4, pick))

        failed = 0
        for what, bad, cid in cases:
            caught = any(p.startswith(cid + ":") for p in problems(bad, measured))
            print(("ok   " if caught else "FAIL ") + f"caught: {what}")
            failed += 0 if caught else 1
        # The control that proves the check is not simply always-failing.
        clean = not problems(manifest, measured)
        print(("ok   " if clean else "FAIL ") + "control: the real pack passes unchanged")
        failed += 0 if clean else 1
        print(f"\nvoice-edges controls: {len(cases) + 1 - failed} passed, {failed} failed")
        sys.exit(1 if failed else 0)

    probs = problems(manifest, measured)
    print(f"Voice edges: {len(measured)} clips measured, {len(probs)} problems")
    for p in probs:
        print("  PROBLEM: " + p)
    sys.exit(1 if probs else 0)


main()
