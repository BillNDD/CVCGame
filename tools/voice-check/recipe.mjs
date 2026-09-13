/* G13, rule 3: the recipe inside the pack matches the approved values, knob
   by knob and word by word. Audio quality is the one thing no automated
   check can judge, so what a machine can do instead is refuse a pack rendered
   with settings no person ever heard. Every number below was set by a
   listener on 2026-07-27, first after clips were found saying "at" for "cat"
   and "n" for "an", then after a spot-check heard "hip-uh" for "hip" and a
   slurred sh in "dish". The tables are this gate's oracle. */

/* The approved recipe, as literal values (rule E4). A pack rendered with
   anything else has not been listened to. */
const APPROVED = {
  voice: "af_heart", bitrate: 96, word_speed: 0.85, sentence_speed: 1,
  lead_ms: 80, tail_ms: 300, fade_ms: 10,
};

/* The tables as they stood before the keepers: three words end with an
   extra syllable the synthesiser adds after a final plosive, and one has a
   fricative that runs too long, and the listener chose how much to cut from
   each. Two blind rounds, 2026-07-27 and 2026-07-28: four words are spoken
   with a full stop after them, because a word standing alone gets no
   sentence shape and the voice never finishes its last consonant; one has
   what precedes its first burst removed; one has the low frequencies taken
   out of its first 70 ms so its s cannot read as a z. Each won a numbered,
   shuffled round in which the build of the day was one of the candidates -
   and the same treatment was REFUSED for the bank at large, because four of
   five words already judged perfect came back worse. This is NOT the carrier
   cut: a full stop is appended to the word and the whole utterance ships.
   "hop" left the period list for that treatment when a listener failed its
   full-stop rendering outright. Round 13 bank: hen stays energy-gap;
   remediation hop moved to ASR+head_trim (packs 2-3). man is NOT one of the
   57 keepers: the handoff grades its own man "marginal pass, accept if best
   of 6"; this clip was heard the same day as "almost perfect" in round 14
   and stands; 250 ms was tried in that round and reaches into the carrier -
   "word man". Energy carriers and ASR pins merge from keepers-treatments.json. */
function seed() {
  return {
    trim: { cub: 130, hip: 130, dish: 120 },
    period: new Set(["cup", "had", "jug", "pop", "rub"]),
    onset: new Set(["ham", "tap"]),
    bright: { sip: 70, jam: 40 },
    lead: { am: 150, an: 150, had: 150 },
    speed: { hat: 0.82 },
    head: {},
    carrier: { hen: ["hen, hen.", 150, -30, 40], man: ["Here is the word, man.", 150, -20, 20] },
    asr: {},
  };
}

/* A treatment sets what it asks for and REMOVES what it does not ask for, so
   the gate and the renderer read the pins the same way: sip's 70 ms brighten,
   tap's onset trim and hip's 130 ms trim all predate these keepers. */
function applyKnobs(a, w, t) {
  if (Math.abs((t.speed ?? 0.85) - 0.85) > 1e-9) a.speed[w] = t.speed;
  if ((t.lead_ms ?? 80) !== 80) a.lead[w] = t.lead_ms;
  if (t.period) a.period.add(w); else a.period.delete(w);
  if (t.onset_trim) a.onset.add(w); else a.onset.delete(w);
  applyCuts(a, w, t);
}
function applyCuts(a, w, t) {
  if ((t.bright_head_ms ?? 0) > 0) a.bright[w] = t.bright_head_ms; else delete a.bright[w];
  if ((t.head_trim_ms ?? 0) > 0) a.head[w] = t.head_trim_ms; else delete a.head[w];
  if ((t.trim_ms ?? 0) > 0) a.trim[w] = t.trim_ms; else delete a.trim[w];
}
function applyCarrier(a, w, t) {
  const mode = (t.carrier_cut_mode || "energy").toLowerCase();
  const carrier = t.carrier;
  if (!carrier) return;
  if ((mode === "asr" || mode === "asr_pinned") && t.asr_start != null) {
    a.asr[w] = [String(carrier[0]).replaceAll("{w}", w), t.asr_start, t.asr_end];
  } else if (mode === "energy") {
    a.carrier[w] = [String(carrier[0]).replaceAll("{w}", w), carrier[1], carrier[2], carrier[3]];
  }
}
/** The approved tables, with every keeper's treatment merged in. */
export function approvedTables(treatments) {
  const a = seed();
  for (const [w, t] of Object.entries(treatments)) { applyKnobs(a, w, t); applyCarrier(a, w, t); }
  return a;
}

/* One per-word table against its approved counterpart: a value that differs
   is a drift, a word the approved table lacks is a treatment nobody heard. */
function tableProblems(approved, got, wording, deep = false) {
  const same = (x, y) => (deep ? JSON.stringify(x) === JSON.stringify(y) : x === y);
  const out = [];
  for (const [w, want] of Object.entries(approved)) if (!same(got[w], want)) out.push(wording.drift(w, got[w], want));
  for (const w of Object.keys(got)) if (!(w in approved)) out.push(wording.extra(w));
  return out;
}
const WORDING = {
  trim: { drift: (w, g, want) => `recipe trims ${w} by ${JSON.stringify(g)} ms, approved is ${want} ms`, extra: (w) => `recipe trims a word nobody approved: ${w}` },
  bright: { drift: (w, g, want) => `recipe brightens ${w} over ${JSON.stringify(g)} ms, approved is ${want} ms`, extra: (w) => `recipe brightens a word nobody approved: ${w}` },
  lead: { drift: (w, g, want) => `recipe lead_override ${w} is ${JSON.stringify(g)}, approved is ${want}`, extra: (w) => `recipe lead_override for a word nobody approved: ${w}` },
  speed: { drift: (w, g, want) => `recipe word_speed_override ${w} is ${JSON.stringify(g)}, approved is ${want}`, extra: (w) => `recipe word_speed_override for a word nobody approved: ${w}` },
  head: { drift: (w, g, want) => `recipe head_trim ${w} is ${JSON.stringify(g)}, approved is ${want}`, extra: (w) => `recipe head_trim for a word nobody approved: ${w}` },
  carrier: { drift: (w, g, want) => `recipe cuts ${w} from ${JSON.stringify(g)}, approved is ${JSON.stringify(want)}`, extra: (w) => `recipe cuts a word out of a carrier nobody approved: ${w}` },
  asr: { drift: (w, g, want) => `recipe asr_pinned ${w} is ${JSON.stringify(g)}, approved is ${JSON.stringify(want)}`, extra: (w) => `recipe asr_pinned a word nobody approved: ${w}` },
};
function listProblem(name, want, got) {
  const have = [...(got || [])].sort().join(" ");
  return have === want.join(" ") ? [] : [`recipe ${name} is [${have}], approved is [${want.join(" ")}]`];
}

/** The recipe `r` inside the pack against the approved tables `a`. */
export function checkRecipe(r, a) {
  const problems = [];
  for (const [k, want] of Object.entries(APPROVED))
    if (r[k] !== want) problems.push(`recipe ${k} is ${JSON.stringify(r[k])}, approved is ${JSON.stringify(want)}`);
  problems.push(...tableProblems(a.trim, r.trim_ms || {}, WORDING.trim));
  problems.push(...listProblem("period_words", [...a.period].sort(), r.period_words));
  problems.push(...listProblem("onset_trim_words", [...a.onset].sort(), r.onset_trim_words));
  problems.push(...tableProblems(a.bright, r.bright_head_ms || {}, WORDING.bright));
  problems.push(...tableProblems(a.lead, r.lead_override || {}, WORDING.lead));
  problems.push(...tableProblems(a.speed, r.word_speed_override || {}, WORDING.speed));
  problems.push(...tableProblems(a.head, r.head_trim_ms || {}, WORDING.head));
  problems.push(...tableProblems(a.carrier, r.carrier_cut || {}, WORDING.carrier, true));
  problems.push(...tableProblems(a.asr, r.asr_pinned || {}, WORDING.asr, true));
  return problems;
}

/* The guard is part of the cut. [asr_start, asr_end] alone reproduces
   nothing - learned by sweeping 31 accepted clips to byte identity - so a
   pack that declares different guards, or none, was not rendered from the
   accepted recipe. */
export function checkGuards(r, treatments) {
  const problems = [];
  const guards = r.asr_guard_ms || {};
  for (const [w, t] of Object.entries(treatments)) {
    if (t.asr_guard_lead_ms == null) continue;
    const want = [t.asr_guard_lead_ms, t.asr_guard_tail_ms];
    if (JSON.stringify(guards[w]) !== JSON.stringify(want))
      problems.push(`recipe asr guard for ${w} is ${JSON.stringify(guards[w])}, approved is ${JSON.stringify(want)}`);
  }
  for (const w of Object.keys(guards))
    if (!(treatments[w] && treatments[w].asr_guard_lead_ms != null))
      problems.push(`recipe declares an asr guard nobody approved: ${w}`);
  return problems;
}
