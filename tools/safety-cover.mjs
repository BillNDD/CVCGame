/* SAFETY COVER (G25). Which safety rule has no executable proof?
 *
 * Owner-approved 2026-08-17. Until today nobody could answer that question
 * with a command. S1 to S9 were enforced by tests scattered over eleven files
 * plus careful human reading, and open-faults section L is the record of what
 * that costs: S9 lived without a gate until somebody happened to notice, and
 * the noticing was luck.
 *
 * ONE LEDGER. The rule-to-proof relation is NOT stated here. It lives in
 * tools/effect-declarations.mjs, beside the prose requirement it makes
 * computable, and this gate reads it. A second table of "what proves S6"
 * would drift from the first the week after it was written, which is fault F2
 * and which tools/file-map.mjs names in its own header.
 *
 * WHAT IT REFUSES, and why each one is a real failure rather than a tidiness
 * rule:
 *   1. Fewer rules parsed than the floor. If the anchor in CLAUDE.md moves,
 *      a naive gate reports "0 of 0 rules uncovered" and passes. A gate that
 *      is checking nothing must SAY so - doc-truth learned this on
 *      2026-08-15 and its lesson is copied here in behaviour, not in words.
 *   2. A rule with no proof at all. This is the fault-L detector: a tenth
 *      safety rule cannot be added without something that proves it.
 *   3. A proof naming a file that does not exist. A renamed test silently
 *      stops proving anything.
 *   4. A proof naming a gate that no scheduled step runs. This is the G22
 *      shape (open-faults C4): a detector nobody runs is not a detector, and
 *      a rule leaning on one is not proved. The schedule is read from
 *      REQUIRED_GATES in tools/gauntlet.mjs, so the two cannot disagree.
 *
 * WHAT IT REPORTS RATHER THAN REFUSES, under ceilings that may only fall:
 *   - rules whose every proof reads SOURCE text. For S9 - "no file in the
 *     repository contains a personal name" - a source scan IS the real proof,
 *     so refusing this shape would be wrong. For S7 it is a pre-filter, and
 *     the effect map has said so in prose since 2026-08-10.
 *   - rules no browser has ever observed. S8 says multi-letter units "always
 *     show as one tile", which is a claim about a rendered screen; its proofs
 *     today are engine-level. That is honest debt, recorded so it cannot grow.
 *
 * WHAT IT CANNOT DO. It reads declarations, not behaviour: it proves that
 * something claims to prove a rule, never that the claim is true. Only the
 * test itself does that, and only a person can say whether the rule is the
 * right rule. It also cannot see a proof nobody declared, which is why the
 * numbers are floors rather than equalities.
 *
 * Run: node tools/safety-cover.mjs
 *      node tools/safety-cover.mjs --self-test */
import { readFileSync, existsSync } from "node:fs";
import { DECLARED, NON_TEST_GATES } from "./effect-declarations.mjs";

const BASELINE = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const KINDS = ["unit", "source", "observed"];
const FLOORS = { rules: BASELINE.g25_rules, proofs: BASELINE.g25_proofs };

/* The safety rules, read from the file that OWNS them. Never a list typed
   here: a list typed here would be a copy of CLAUDE.md's own safety facts,
   which G23 refuses, and it would go stale the day a rule is added. */
export function parseRules(claudeText) {
  const start = claudeText.indexOf("## Safety rules");
  if (start < 0) return [];
  const rest = claudeText.slice(start + 3);
  const end = rest.indexOf("\n## ");
  const section = end < 0 ? rest : rest.slice(0, end);
  return [...section.matchAll(/^- (S\d+)\./gm)].map((m) => m[1]);
}

/* The gates a push or a release actually runs, read from the gauntlet's own
   closed list. A proof whose gate is not in here is unscheduled, however
   real its file is. */
export function parseScheduled(gauntletText) {
  const m = /const REQUIRED_GATES = \[([\s\S]*?)\];/.exec(gauntletText);
  if (!m) return [];
  return [...new Set([...m[1].matchAll(/\b(G\d+[a-z]?|E11)\b/g)].map((x) => x[1]))];
}

/* The relation, inverted: the declarations say what each FILE proves, and the
   question asks what proves each RULE. */
export function proofsByRule(declared, gates) {
  const out = {};
  const add = (rule, proof) => { (out[rule] ||= []).push(proof); };
  for (const [where, d] of Object.entries(declared))
    for (const [rule, kind] of Object.entries(d.safety || {}))
      add(rule, { where, gate: d.gate, kind });
  for (const [gate, where, , , , safety] of gates)
    for (const [rule, kind] of Object.entries(safety || {}))
      add(rule, { where, gate, kind });
  return out;
}

const looksLikePath = (where) => where.includes("/") && /\.\w+$/.test(where);

/* Every refusal in one function, so --self-test exercises the shipped path
   rather than a re-implementation of it. The effect map's own control was
   once a re-implementation and passed with the detector gone (2026-08-10). */
export function problems(rules, proofs, scheduled, fileExists, floors = FLOORS) {
  const found = [];
  if (rules.length < floors.rules)
    found.push(`only ${rules.length} safety rules parsed from CLAUDE.md, expected at least `
      + `${floors.rules} — this gate would be checking nothing`);
  const pairs = rules.reduce((n, r) => n + (proofs[r] || []).length, 0);
  if (pairs < floors.proofs)
    found.push(`${pairs} declared proofs, below the floor of ${floors.proofs}: a proof was `
      + `deleted from tools/effect-declarations.mjs and the rule it covered may still look proved`);
  for (const rule of rules) {
    const mine = proofs[rule] || [];
    if (!mine.length) {
      found.push(`${rule} has no executable proof: no test file and no gate declares it in tools/effect-declarations.mjs`);
      continue;
    }
    for (const p of mine) {
      if (!KINDS.includes(p.kind))
        found.push(`${rule} is declared in ${p.where} with kind "${p.kind}", which is not one of ${KINDS.join(", ")}`);
      if (looksLikePath(p.where) && !fileExists(p.where))
        found.push(`${rule} names ${p.where} as its proof, and that file does not exist`);
      if (!scheduled.includes(p.gate))
        found.push(`${rule}'s proof in ${p.where} runs under ${p.gate}, which no scheduled gate runs`);
    }
  }
  return found;
}

export const sourceOnly = (rules, proofs) =>
  rules.filter((r) => (proofs[r] || []).length && (proofs[r] || []).every((p) => p.kind === "source"));

export const unobserved = (rules, proofs) =>
  rules.filter((r) => !(proofs[r] || []).some((p) => p.kind === "observed"));

function report() {
  const rules = parseRules(readFileSync("CLAUDE.md", "utf8"));
  const scheduled = parseScheduled(readFileSync("tools/gauntlet.mjs", "utf8"));
  const proofs = proofsByRule(DECLARED, NON_TEST_GATES);
  const found = problems(rules, proofs, scheduled, existsSync);
  const src = sourceOnly(rules, proofs);
  const un = unobserved(rules, proofs);
  const pairs = rules.reduce((n, r) => n + (proofs[r] || []).length, 0);

  for (const r of rules) {
    const mine = proofs[r] || [];
    const by = mine.map((p) => `${p.where} (${p.kind}, ${p.gate})`).join("; ") || "NOTHING";
    console.log(`  ${r}: ${by}`);
  }
  for (const f of found) console.error(`  PROBLEM: ${f}`);
  if (src.length) console.log(`  source-only rules (${src.length}): ${src.join(" ")}`);
  if (un.length) console.log(`  no browser has ever observed (${un.length}): ${un.join(" ")}`);

  let bad = found.length;
  if (src.length > BASELINE.g25_source_only_max) {
    console.error(`  PROBLEM: ${src.length} rules are proved only by reading source, ceiling is ${BASELINE.g25_source_only_max}`);
    bad++;
  }
  if (un.length > BASELINE.g25_unobserved_max) {
    console.error(`  PROBLEM: ${un.length} rules have no observed proof, ceiling is ${BASELINE.g25_unobserved_max}`);
    bad++;
  }
  console.log(`Safety cover: ${rules.length} rules, ${pairs} declared proofs, ${bad} problems`);
  return bad;
}

/* CONTROLS. Every one calls a SHIPPED function with a planted input. The
   first four are the failure modes that would make this gate quietly stop
   working, in the order they are likely: it stops parsing rules, it counts
   instead of mapping, it trusts a name, it trusts a schedule. */
function selfTest() {
  const rules = ["S1", "S2"];
  const scheduled = ["G10", "G7"];
  const yes = () => true;
  const real = { "tests/a.test.js": { gate: "G10", safety: { S1: "unit" } } };
  const both = { ...real, "tests/b.test.js": { gate: "G10", safety: { S2: "unit" } } };
  const relabelled = { "tests/a.test.js": { gate: "G10", safety: { S6: "unit" } },
    "tests/b.test.js": { gate: "G10", safety: { S2: "unit" } } };
  const badKind = { "t/a.test.js": { gate: "G10", safety: { S1: "solid" } } };
  const mixed = { "t/a.test.js": { gate: "G10", safety: { S1: "source", S2: "unit" } } };
  const hits = (list, re) => list.filter((p) => re.test(p)).length;

  /* The planted cases are written against a DETECTOR PARAMETER, so the same
     cases can be run twice: once through the shipped problems(), which must
     answer all of them, and once through a stub that always reports nothing,
     which must answer none. A control set that cannot fail proves nothing
     about the detector it guards, and this repository has shipped two of
     those - the effect map's first self-test asked whether an absent file was
     absent, and the gauntlet's asked whether filtering left anything. */
  const none = { rules: 0, proofs: 0 };
  const planted = (detect) => [
    ["a moved anchor is a failure, not a pass",
      hits(detect([], {}, scheduled, yes, { rules: 1, proofs: 0 }), /checking nothing/) === 1,
      "a gate that parses no rules must say so; reporting 0 of 0 uncovered is how a check stops existing"],
    ["a rule with no proof is named",
      hits(detect(rules, proofsByRule(real, []), scheduled, yes, none), /^S2 has no executable proof/) === 1,
      "the fault-L detector: a safety rule nothing proves must be reported by name"],
    ["a relabelled tag is caught, not just a deleted one",
      hits(detect(rules, proofsByRule(relabelled, []), scheduled, yes, none), /^S1 has no executable proof/) === 1,
      "a counter passes a deletion control; only a mapping reports S1 when its tag was moved to S6"],
    ["a proof naming a vanished file is caught",
      hits(detect(rules, proofsByRule(both, []), scheduled, () => false, none), /does not exist/) === 2,
      "a renamed test silently stops proving anything"],
    ["a proof under an unscheduled gate is caught",
      hits(detect(rules, proofsByRule(both, []), ["G7"], yes, none), /which no scheduled gate runs/) === 2,
      "the G22 shape: a detector nobody runs is not proof (open-faults C4)"],
    ["an unknown kind is caught",
      hits(detect(["S1"], proofsByRule(badKind, []), scheduled, yes, none), /is not one of/) === 1,
      "a typo in a kind must not read as a proof of the strongest sort"],
  ];

  const cases = [
    ...planted(problems),
    ["a deleted proof is caught by the floor, in the sub-minute check",
      hits(problems(rules, proofsByRule(both, []), scheduled, yes, { rules: 0, proofs: 5 }), /below the floor/) === 1
      && problems(rules, proofsByRule(both, []), scheduled, yes, none).length === 0,
      "the gauntlet's floor only runs at a release; a tag deleted between releases must fail the push"],
    ["source-only and unobserved are told apart",
      sourceOnly(rules, proofsByRule(mixed, [])).join() === "S1"
      && unobserved(rules, proofsByRule(mixed, [])).join() === "S1,S2",
      "the two ceilings measure different debts and must not collapse into one"],
    ["the real declarations pass",
      problems(parseRules(readFileSync("CLAUDE.md", "utf8")),
        proofsByRule(DECLARED, NON_TEST_GATES),
        parseScheduled(readFileSync("tools/gauntlet.mjs", "utf8")), existsSync).length === 0,
      "a control set that only ever goes red proves nothing about a green tree"],
    ["the rules come from CLAUDE.md, not from here",
      parseRules("## Safety rules (child-facing)\n\n- S1. a\n- S2. b\n").join() === "S1,S2"
      && parseRules("nothing here").length === 0,
      "the parser must read a real section and must return nothing when there is none"],
    ["the schedule comes from the gauntlet's own list",
      parseScheduled('const REQUIRED_GATES = [\n  "G11 copy", "G1+G2 tests",\n];').join() === "G11,G1,G2"
      && parseScheduled("no list here").length === 0,
      "reading the closed list means a gate removed from the release is a gate this cannot count"],
  ];

  let bad = 0;
  for (const [name, ok, why] of cases) {
    console.log(`${ok ? "ok  " : "FAIL"} ${name} — ${why}`);
    if (!ok) bad++;
  }
  const stubAnswers = planted(() => []).filter(([, ok]) => ok).length;
  if (stubAnswers === 0) {
    console.log("ok   control: a detector that always reports nothing answers 0 of the 6 planted cases");
  } else {
    console.log(`FAIL control: an always-empty stub still answers ${stubAnswers} planted cases, so those cases test nothing`);
    bad++;
  }
  console.log(`
safety-cover controls: ${cases.length + 1 - bad} passed, ${bad} failed`);
  return bad ? 1 : 0;
}

if (process.argv.includes("--self-test")) process.exit(selfTest());
process.exit(report() ? 1 : 0);
