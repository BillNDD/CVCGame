/* G16, rule 8: every floor the gate specification quotes is the floor the
   gauntlet actually enforces. Seven of them had drifted by 2026-08-10 - the
   numbers were written once and never moved when the floors rose - so the
   document told a reader the suite was smaller and weaker than it is. A
   review found it; this rule means no one has to find it again.

   A RETIRED floor may still be quoted, and should be: the document explains
   why a gate went, and the number it went with is part of the explanation.
   It is checked against the retirement record, so the record cannot drift
   from the prose either. What is refused is a key that is neither live nor
   retired - a floor quoted from nowhere.

   TWO BLIND SPOTS, both found by the release sweep on 2026-08-23 and one of
   them hiding a LIVE drift. The first: the closing backtick had to sit
   BETWEEN the key and the number, so a line writing the whole thing inside
   one pair - `g25_proofs (25)` - was invisible, and that line said 25 while
   the baseline enforced 28. The second: the key had to begin g<digits> or
   census, so seven keys quoted in this document were never checked at all.
   Both forms are read now, and every key the baseline holds is in scope. */
function quotedFloor(baseline, retired, key, stated) {
  if (key in retired) {
    return Number(stated) !== retired[key].was ? `the gate specification says ${key} retired at ${stated}, the baseline records ${retired[key].was}` : null;
  }
  if (!(key in baseline)) return `the gate specification quotes ${key}, which is neither a live floor nor a retired one`;
  if (Number(stated) !== baseline[key]) return `the gate specification says ${key} is ${stated}, the baseline enforces ${baseline[key]}`;
  return null;
}
export function checkFloors(d) {
  const baseline = JSON.parse(d.baseline);
  const retired = baseline._retired || {};
  const found = [];
  for (const m of d.gauntletDoc.matchAll(/`([a-z][a-z0-9_]*)`\s*\((\d+)\)|`([a-z][a-z0-9_]*)\s*\((\d+)\)`/g)) {
    const key = m[1] || m[3];
    const stated = m[2] || m[4];
    /* a number beside a word that is not a floor is not this rule's business */
    if (!(key in baseline) && !(key in retired)) continue;
    const problem = quotedFloor(baseline, retired, key, stated);
    if (problem) found.push(problem);
  }
  return found;
}
