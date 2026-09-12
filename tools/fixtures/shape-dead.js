/* Negative-control fixture for the shape gate (G31, tools/shape.mjs).
   Two exports: nothing names the first, and shape-long.js imports the
   second - so the gate must count exactly one dead export here.
   Excluded from the real lint run, like every file in this folder. */
export function planted_dead_export() { return 1; }
export function planted_live_export() { return 2; }
