import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AlgorithmPanel } from "../app/components/admin/AlgorithmPanel";
import { MatchEvidence } from "../app/components/admin/MatchEvidence";
import { questionConditionDescriptions, questionRuleSummary } from "../app/lib/algorithm-documentation";
import { questions } from "../app/data/questions";
import { calculateMatch, type MatchProfile } from "../app/lib/matching";

const commonAnswers = {
  R001: "LONG_TERM",
  R002: "EXCLUSIVE",
  CB001: "KOREA",
  CB002: "YES",
  CM001: 8,
  CM002: 8,
  LS001: 6,
  LS002: 6,
  LS003: 7,
  LS004: 8,
  PS001: 5,
  PS002: 6,
  VL001: 5,
  VL003: 7,
  SM001: "NO",
  SM002: "ANY",
};

const selected: MatchProfile = {
  id: "selected",
  instagram: "@selected",
  name: "선택 사용자",
  locale: "ko",
  answers: { ...commonAnswers, BIO001: "WOMAN", BIO002: "MAN" },
  importance: { R001: 3 },
};

const candidate: MatchProfile = {
  id: "candidate",
  instagram: "@candidate",
  name: "비교 후보",
  locale: "ko",
  answers: { ...commonAnswers, BIO001: "MAN", BIO002: "WOMAN", LS001: 7 },
  importance: { R001: 3 },
};

test("admin match evidence renders detailed calculation data", () => {
  const html = renderToStaticMarkup(
    <MatchEvidence selected={selected} candidate={candidate} result={calculateMatch(selected, candidate)} />,
  );
  assert.match(html, /FINAL COMPATIBILITY/);
  assert.match(html, /절대조건 판정/);
  assert.match(html, /모듈별 적합도/);
  assert.match(html, /문항별 계산 근거/);
  assert.match(html, /공통 답변/);
  assert.match(html, /SIMILARITY|ONE_WAY_FIT|HARD_CONDITION/);
});

test("admin algorithm reference renders the live configuration", () => {
  const html = renderToStaticMarkup(<AlgorithmPanel />);
  assert.match(html, /현재 매칭 알고리즘/);
  assert.match(html, /2\.1\.0/);
  assert.match(html, /AI 전달용 전체 알고리즘 명세/);
  assert.match(html, /전체 명세 복사/);
  assert.match(html, /7개 하드 조건/);
  assert.match(html, /eligible=false/);
  assert.match(html, /LG003과 LG004/);
  assert.match(html, /국가 간 실행력/);
  assert.match(html, /추천 제외 조건/);
  assert.match(html, /로직 코드의 실제 계산 의미/);
  assert.match(html, /관계 목적별 모듈 가중치/);
  assert.match(html, /질문별 계산 설정/);
  assert.match(html, /R001 ∈ \{MARRIAGE, LONG_TERM\}/);
  assert.match(html, /SM002/);
  assert.match(html, /HARD_CONDITION/);
  assert.match(html, /절대 조건/);
});

test("every conditional question has a human and AI readable inclusion rule", () => {
  const conditionalQuestions = questions.filter((question) => question.showIf);
  assert.ok(conditionalQuestions.length > 0);
  for (const question of conditionalQuestions) {
    assert.ok(questionConditionDescriptions[question.id], `${question.id} inclusion rule is undocumented`);
  }
  for (const question of questions) {
    assert.doesNotMatch(questionRuleSummary(question).condition, /확인 필요/, `${question.id} flow position is undocumented`);
  }
});
