/* Negative-control fixture for the shape gate (G31, tools/shape.mjs).
   One block sits at nesting depth 5, so the gate must count exactly one
   block deeper than 4.
   Excluded from the real lint run, like every file in this folder. */
function planted_deep_nesting(list) {
  let hits = 0;
  for (const a of list) {
    if (a) {
      for (const b of a) {
        if (b) {
          while (hits < b) {
            hits += 1;
          }
        }
      }
    }
  }
  return hits;
}
