/* Negative-control fixture for the shape gate (G31, tools/shape.mjs).
   Its function body is token for token the body in shape-dup-b.js: more
   than 40 tokens, so the gate must merge the two into ONE region spanning
   both files.
   Excluded from the real lint run, like every file in this folder. */
function planted_dup_a(list) {
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
