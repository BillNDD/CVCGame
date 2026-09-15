/* Fixture for the cognitive-complexity metric: a deeply checked shape that
   scores sixteen and nothing else over a bar. No exports: the dead-export
   control counts three total across the fixture tree. */
function checkNestedShape(node) {
  let total = 0;
  if (node.kind === "leaf") {
    total += node.size;
  } else if (node.kind === "pair") {
    if (node.left.size > node.right.size) {
      if (node.left.deep) {
        total += node.left.size + node.right.size;
      } else {
        total += node.left.size;
      }
    } else {
      total += node.right.size;
    }
  } else if (node.kind === "run") {
    for (const part of node.parts) {
      if (part.done) {
        total += part.size;
      }
    }
  } else if (node.kind === "solo") {
    total += 1;
  }
  return total;
}
