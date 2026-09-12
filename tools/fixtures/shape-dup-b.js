/* Negative-control fixture for the shape gate (G31, tools/shape.mjs).
   The second copy of shape-dup-a.js's function body - one region, two
   files.
   Excluded from the real lint run, like every file in this folder. */
function planted_dup_b(list) {
  let total = 0;
  for (const item of list) {
    if (item.kind === "row" && item.count > 0) total += item.count * 2;
    else if (item.kind === "col" && item.count > 1) total -= item.count;
    else if (item.kind === "gap") total += item.width + item.height;
    else total += 1;
    if (total > 1000) break;
  }
  return total;
}
