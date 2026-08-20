import assert from "node:assert/strict";
import test from "node:test";
import { getQuestionFlow } from "../app/data/questions";
import {
  calculateMatch,
  profileCompletion,
  type MatchProfile,
} from "../app/lib/matching";

function profile(
  id: string,
  answers: MatchProfile["answers"],
  importance: Record<string, number> = {},
): MatchProfile {
  return { id, instagram: `@${id}`, locale: "ko", answers, importance };
}

const reciprocalIdentity = {
  a: { BIO001: "WOMAN", BIO002: "MAN" },
  b: { BIO001: "MAN", BIO002: "WOMAN" },
};

test("identical scored answers produce a symmetric perfect score", () => {
  const shared = {
    R001: "LONG_TERM",
    R002: "EXCLUSIVE",
    CB001: "KOREA",
    CB002: "YES",
    CM001: 8,
    CM002: 8,
    LS001: 6,
    LS002: 6,
    LS003: 6,
    LS004: 6,
    PS001: 6,
    PS002: 6,
    VL001: 6,
    VL003: 6,
    RG001: "NONE",
  };
  const a = profile("a", { ...shared, ...reciprocalIdentity.a });
  const b = profile("b", { ...shared, ...reciprocalIdentity.b });
  const ab = calculateMatch(a, b);
  const ba = calculateMatch(b, a);

  assert.equal(ab.eligible, true);
  assert.equal(ab.overall, 100);
  assert.equal(ab.overall, ba.overall);
  assert.equal(ab.modules.find((module) => module.module === "religion")?.score, 100);
});

test("relationship-specific weights remain symmetric when intents differ", () => {
  const common = {
    R002: "EXCLUSIVE",
    CB001: "KOREA",
    CB002: "YES",
    CM001: 8,
    CM002: 8,
    LS001: 1,
    LS002: 1,
    LS003: 1,
    LS004: 1,
    PS001: 5,
    PS002: 5,
    VL001: 5,
    VL003: 5,
  };
  const a = profile("a", { ...common, ...reciprocalIdentity.a, R001: "MARRIAGE" });
  const b = profile("b", {
    ...common,
    ...reciprocalIdentity.b,
    R001: "CASUAL",
    LS001: 10,
    LS002: 10,
    LS003: 10,
    LS004: 10,
  });

  assert.equal(calculateMatch(a, b).overall, calculateMatch(b, a).overall);
});

test("all documented hard conflicts exclude the pair", () => {
  const baseA = {
    ...reciprocalIdentity.a,
    R001: "MARRIAGE",
    R002: "EXCLUSIVE",
    CB001: "KOREA",
    CB002: "YES",
    CH001: "DEFINITELY_YES",
    MR001: 10,
    SM001: "NO",
    SM002: "NON_SMOKER_ONLY",
  };
  const baseB = {
    ...reciprocalIdentity.b,
    R001: "MARRIAGE",
    R002: "EXCLUSIVE",
    CB001: "JAPAN",
    CB002: "YES",
    CH001: "PROBABLY_YES",
    MR001: 8,
    SM001: "NO",
    SM002: "ANY",
  };

  const cases: [string, MatchProfile, MatchProfile][] = [
    ["gender", profile("ga", { ...baseA, BIO002: "WOMAN" }), profile("gb", baseB)],
    ["missing gender", profile("ma", { ...baseA, BIO001: undefined } as never), profile("mb", baseB)],
    ["children", profile("ca", baseA), profile("cb", { ...baseB, CH001: "DEFINITELY_NO" })],
    ["occasional smoking", profile("sa", baseA), profile("sb", { ...baseB, SM001: "OCCASIONAL" })],
    ["electronic cigarette", profile("ea", baseA), profile("eb", { ...baseB, SM001: "E_CIGARETTE" })],
    ["cross-country domestic only", profile("da", { ...baseA, CB002: "DOMESTIC_ONLY" }), profile("db", baseB)],
    ["marriage readiness", profile("ra", baseA, { MR001: 4 }), profile("rb", { ...baseB, MR001: 1 })],
    ["relationship style", profile("xa", baseA, { R002: 4 }), profile("xb", { ...baseB, R002: "OPEN" })],
    ["relationship intent", profile("ia", baseA, { R001: 4 }), profile("ib", { ...baseB, R001: "CASUAL" })],
  ];

  for (const [name, a, b] of cases) {
    const result = calculateMatch(a, b);
    assert.equal(result.eligible, false, `${name} should exclude the pair`);
    assert.equal(result.tier, "excluded");
    assert.ok(result.conflicts.length > 0);
  }
});

test("the adaptive flow asks all essential dealbreakers and completes at 100 percent", () => {
  const answers: MatchProfile["answers"] = {
    ...reciprocalIdentity.a,
    BIO003: "테스트 사용자",
    BIO004: 25,
    R001: "MARRIAGE",
  };

  for (let step = 0; step < 60; step += 1) {
    const next = getQuestionFlow(answers).find((question) => answers[question.id] === undefined);
    if (!next) break;
    answers[next.id] = next.type === "single"
      ? next.options?.[0]?.value ?? "UNSURE"
      : next.type === "scale5"
        ? 3
        : 5;
  }

  const flow = getQuestionFlow(answers);
  assert.ok(flow.length <= 40);
  for (const id of ["R001", "R002", "CB002", "CH001", "MR001", "SM001", "SM002", "CB007"]) {
    assert.ok(flow.some((question) => question.id === id), `${id} should be asked`);
  }
  assert.equal(profileCompletion(profile("complete", answers)), 100);

  const peerAnswers = { ...answers, ...reciprocalIdentity.b };
  const result = calculateMatch(profile("complete", answers), profile("peer", peerAnswers));
  assert.ok(result.sharedAnswers >= 36);
  assert.equal(result.confidence, "high");
});

test("complementary planning uses the documented matrix", () => {
  const base = {
    R001: "CASUAL",
    R002: "EXCLUSIVE",
    CB001: "KOREA",
    CB002: "YES",
  };
  const result = calculateMatch(
    profile("planner", { ...base, ...reciprocalIdentity.a, DT003: "I_PLAN" }),
    profile("partner", { ...base, ...reciprocalIdentity.b, DT003: "PARTNER_PLAN" }),
  );
  assert.equal(result.questionDetails.find((detail) => detail.id === "DT003")?.score, 100);
});
