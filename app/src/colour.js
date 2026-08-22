/* A token with an alpha, for shadows, scrims and frosted fills: the triple is
   derived from the token at run time, so ink's 23,53,107 is typed once, in C.
   tools/quality-control.mjs refuses an rgb() or rgba() literal in an app
   source (the council's re-judgement of step 0, 2026-08-22: SPEC section 9
   said nothing restates a colour while seven shadows restated ink in
   decimal). */
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
