/* Pronunciation-score service — INTERFACE STUB ONLY (SPEC §8 item 4, HANDOFF §6).
   The real service is out of scope. Do not build it without a proposal.

   The contract, when a future build adds the service behind a server proxy:
   - The API key stays on the server only.
   - The function is opt-in. The app never transmits audio without an explicit
     adult choice.
   - 80 or more: correct. 60 to 79: suggest "close". Below 60: give the result
     to the adult.
   - Design rule 1 stays: the app never records a wrong result by itself.

   The app does not import this module. It exists so the interface has one
   agreed shape before any server work starts. */

/**
 * @param {Blob} audio    The recorded attempt.
 * @param {string} target The word the child read.
 * @returns {Promise<{ accuracyScore: number, phonemes: Array<{ phoneme: string, score: number }> }>}
 */
export async function assessPronunciation(audio, target) {
  void audio; void target;
  throw new Error("assessPronunciation is a stub. The service is out of scope (HANDOFF section 6).");
}
