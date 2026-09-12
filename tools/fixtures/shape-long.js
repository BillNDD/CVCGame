/* Negative-control fixture for the shape gate (G31, tools/shape.mjs).
   This function runs to more than 80 lines with blanks and comments
   skipped, so the gate must count it once as over the 80-line bar.
   It also names the two live exports, so the dead-export control has a
   live neighbour beside the planted dead one.
   Excluded from the real lint run, like every file in this folder. */
import { overlyComplex } from "./complexity-over.js";
import { planted_live_export } from "./shape-dead.js";

function planted_long_function(n) {
  let a = 0;
  a += 1;
  a += 2;
  a += 3;
  a += 4;
  a += 5;
  a += 6;
  a += 7;
  a += 8;
  a += 9;
  a += 10;
  a += 11;
  a += 12;
  a += 13;
  a += 14;
  a += 15;
  a += 16;
  a += 17;
  a += 18;
  a += 19;
  a += 20;
  a += 21;
  a += 22;
  a += 23;
  a += 24;
  a += 25;
  a += 26;
  a += 27;
  a += 28;
  a += 29;
  a += 30;
  a += 31;
  a += 32;
  a += 33;
  a += 34;
  a += 35;
  a += 36;
  a += 37;
  a += 38;
  a += 39;
  a += 40;
  a += 41;
  a += 42;
  a += 43;
  a += 44;
  a += 45;
  a += 46;
  a += 47;
  a += 48;
  a += 49;
  a += 50;
  a += 51;
  a += 52;
  a += 53;
  a += 54;
  a += 55;
  a += 56;
  a += 57;
  a += 58;
  a += 59;
  a += 60;
  a += 61;
  a += 62;
  a += 63;
  a += 64;
  a += 65;
  a += 66;
  a += 67;
  a += 68;
  a += 69;
  a += 70;
  a += 71;
  a += 72;
  a += 73;
  a += 74;
  a += 75;
  a += 76;
  a += 77;
  a += 78;
  a += 79;
  a += 80;
  a += 81;
  a += 82;
  return a + overlyComplex(n) + planted_live_export();
}
