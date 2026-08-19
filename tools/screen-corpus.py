# Screen a public-domain source: remove the sentences a child should not meet,
# keep an exact record of every removal, and re-pin the result.
#
# OWNER-RULED 2026-08-19: "Could you not simply download each and excise the
# hazard lines from the copy we keep, and make a note of it?" Yes. A hazard
# that is not in the file cannot be harvested by any future pipeline, however
# careless - which is stronger than a screen the pipeline has to remember to
# run. It is the same reasoning that put `gob` out of the pack rather than on a
# list: a refused thing that still exists comes back.
#
# THE ONE THING THAT MAKES THIS HONEST RATHER THAN SLOPPY. A screened file is
# NOT the book. Three signals say so, because one can be missed:
#   1. The filename ends `.screened.txt`.
#   2. The manifest entry carries `screened: true` and the number removed.
#   3. `tools/corpus/excisions.json` records every removed sentence verbatim,
#      with its book, its index and the hazard class that caught it - so the
#      removal can be reviewed, argued with, or undone.
# Without those, a later reader would quote "the book" and be quoting an
# edit nobody told them about. That is the fabricated-citation fault wearing a
# different hat.
#
# THE SCREEN IS A WORD LIST AND A WORD LIST CANNOT SEE A SCENE. It catches the
# classes the council's literacy seat found in books already on the shelf - a
# beating, a death, a whipping, a child eaten as punishment. It will not catch
# the next thing. A person still reads every text before it ships
# (docs/settled.md, "Public domain is not a screen").
#
# Usage: python3 tools/screen-corpus.py            report only, changes nothing
#        python3 tools/screen-corpus.py --write    excise, record, re-pin
import hashlib
import io
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
# Spelled as one path each, not joined piece by piece, so that a search for
# "tools/corpus/excisions.json" finds the file that writes it. G23 asks of every
# declared DATA file "what code reads this?" and answers by looking for the path
# in the tree; a path assembled from four fragments is invisible to that
# question, and the ledger looked like an orphan when its writer was right here.
MANIFEST = REPO / "tools/corpus/sources.json"
LEDGER = REPO / "tools/corpus/excisions.json"

# Every class below traces to a real find in a book this project already held.
# SLURS AND CARICATURE REFUSE THE WHOLE BOOK, not a sentence. Owner-ruled
# 2026-08-19: "A book that contains this name must be removed and not used for
# any sentences or paragraphs. This is a racist term in contemporary english
# for african americans." A book whose CHARACTER is named with a slur cannot be
# cleaned sentence by sentence - the name is the book. Old Mother West Wind was
# in the manifest for one hour on that basis and was deleted whole.
#
# These words are refused whatever a 1910 author meant by them, because the
# child and the grown-up reading beside them live now.
REFUSE_BOOK = r"\b(coons?|darkies|darky|darkie|negro(es)?|sambo|pickaninny|piccaninny|squaws?|redskins?|injun|savages?|heathens?|gypsy|gypsies|half-breed|chinam[ae]n|japs?|hottentot)\b"

HAZARD = {
    "death": r"\b(died|dies|dead|killed|kill|drowned|drown|buried|grave|corpse|slain)\b",
    "violence": r"\b(whip|whipped|whipping|beat him|beat her|struck|strike|blows|lash|smote|shot him|shot her)\b",
    "predation": r"\b(ate him|ate her|eaten|devour|devoured|swallowed him|swallowed her|jaws|claws|prey)\b",
    "punishment": r"\b(punish|punished|scold|scolded|spank|culprit|whipped him|whipped her)\b",
    "fear or harm": r"\b(burn|burning|burnt|blaze|afraid|terror|scream|screamed|fright)\b",
    "captivity": r"\b(trapped|cage|caged|snare|chained)\b",
    "sex role": r"\b(woman's place|a girl cannot|girls cannot|girls should|boys should|like a girl|only a girl|only a woman|fit for a woman|fit for a man|man's work|woman's work|weaker sex|the fair sex|womanly|unwomanly|manly duty|be a man|obey her husband|obey their husbands)\b",
    "servitude": r"\b(servant|servants|master of the house|mistress of the house|slave|slaves|bond|serf|obey his master|obey her master)\b",
    "caricature": r"\b(heathen|savage|savages|barbarian|barbarous|uncivilized|uncivilised|the natives|native races|primitive people|dusky|swarthy|yellow race|black race|white race|colored people|coloured people)\b",
    "contempt": r"\b(beggar|beggars|ragged|filthy|idiot|imbecile|feeble-minded|lunatic|cripple|crippled|lame boy|lame girl|dwarf|hunchback|ugly little)\b",
}


def sentences(text):
    """Index every sentence. Nothing is dropped here - an excision must know
    exactly which slot it removed, or the record cannot be checked."""
    return list(enumerate(re.split(r"(?<=[.!?])\s+", text)))


def screen(text):
    keep, cut = [], []
    for i, s in sentences(text):
        hit = next((k for k, p in HAZARD.items() if re.search(p, s, re.I)), None)
        (cut if hit else keep).append((i, s, hit))
    return keep, cut


def refuse_whole_book(text):
    """A slur is not a sentence-level fault. Returns the terms found, if any."""
    return sorted(set(m.group(0).lower() for m in re.finditer(REFUSE_BOOK, text, re.I)))


def main(write):
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ledger = json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else {}
    changed = {}
    for title, meta in list(man.items()):
        if title.startswith("_") or meta.get("screened"):
            continue
        src = REPO / meta["file"]
        if not src.exists():
            continue
        text = src.read_text(encoding="utf-8", errors="replace")
        slurs = refuse_whole_book(text)
        if slurs:
            print("%-40s *** REFUSED WHOLE: %s ***" % (title[:40], " ".join(slurs)))
            print("      A slur names a character; the book cannot be cleaned sentence by")
            print("      sentence. Remove it from the manifest and delete the file.")
            continue
        keep, cut = screen(text)
        print("%-40s %4d sentences, %3d to excise" % (title[:40], len(keep) + len(cut), len(cut)))
        for _, s, hit in cut[:3]:
            print("      [%s] %s" % (hit, " ".join(s.split())[:82]))
        if len(cut) > 3:
            print("      ... and %d more" % (len(cut) - 3))
        if not write:
            continue
        out = src.with_name(src.name.replace(".txt", ".screened.txt"))
        body = "\n".join(s for _, s, _ in keep).replace("\r\n", "\n")
        io.open(out, "w", encoding="utf-8", newline="\n").write(body)
        sha = hashlib.sha256(body.encode("utf-8")).hexdigest()
        man[title] = {"file": str(out.relative_to(REPO)).replace("\\", "/"),
                      "sha256": sha, "screened": True, "excised": len(cut)}
        ledger[title] = [{"index": i, "hazard": h, "text": " ".join(s.split())} for i, s, h in cut]
        src.unlink()                       # the unscreened copy does not stay
        changed[title] = len(cut)
    if write:
        io.open(MANIFEST, "w", encoding="utf-8", newline="\n").write(json.dumps(man, indent=1) + "\n")
        io.open(LEDGER, "w", encoding="utf-8", newline="\n").write(json.dumps(ledger, indent=1) + "\n")
        print("\nscreened %d books, %d sentences removed, every one recorded in %s"
              % (len(changed), sum(changed.values()), LEDGER.name))
    else:
        print("\nreport only. Run with --write to excise, record and re-pin.")


if __name__ == "__main__":
    main("--write" in sys.argv)
