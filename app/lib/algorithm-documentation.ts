import { moduleLabels, questions, type QuestionDefinition } from "../data/questions";
import { algorithmConfig } from "./matching";

export const questionConditionDescriptions: Record<string, string> = {
  MR001: "R001 ∈ {MARRIAGE, LONG_TERM}",
  MR002: "R001 = MARRIAGE",
  CH001: "R001 ∈ {MARRIAGE, LONG_TERM}",
  CB003: "R001 ∈ {MARRIAGE, LONG_TERM, SERIOUS_OPEN}",
  CB004: "R001 ∈ {MARRIAGE, LONG_TERM, SERIOUS_OPEN}",
  CB005: "R001 ∈ {MARRIAGE, LONG_TERM, SERIOUS_OPEN}",
  CR001: "R001 ∈ {MARRIAGE, LONG_TERM, SERIOUS_OPEN}",
  FN001: "R001 ∈ {MARRIAGE, LONG_TERM}",
  FM001: "R001 = MARRIAGE",
  FM003: "R001 ∈ {MARRIAGE, LONG_TERM}",
  DT001: "R001 ∈ {SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  DT002: "R001 ∈ {SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  DT003: "R001 ∈ {SHORT_TERM, CASUAL, UNSURE}",
  BD001: "R001 ∈ {SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  BD002: "R001 ∈ {SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  AF001: "R001 ∈ {LONG_TERM, SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  AF002: "R001 ∈ {LONG_TERM, SERIOUS_OPEN, SHORT_TERM, CASUAL, UNSURE}",
  MR003: "상세 후보; R001 ∈ {MARRIAGE, LONG_TERM} AND MR001 ≥ 4",
  CH003: "상세 후보; R001 ∈ {MARRIAGE, LONG_TERM} AND CH001 ∈ {DEFINITELY_YES, PROBABLY_YES, UNSURE}",
  CH005: "상세 후보; R001 ∈ {MARRIAGE, LONG_TERM} AND CH001 ∈ {DEFINITELY_YES, PROBABLY_YES, UNSURE}",
  CB007: "상세 후보; R001 ≠ CASUAL",
};

export const logicDescriptions: Record<QuestionDefinition["logic"], string> = {
  SIMILARITY: "숫자는 거리 기반 유사도, 선택지는 동일/순서 거리 기반 점수",
  ONE_WAY_FIT: "CM001↔CM002와 AF001↔AF002만 교차 기대 적합도; 그 외 표기 문항은 현재 직접 유사도 계산",
  COMPLEMENTARY: "DT003 전용 역할 보완 매트릭스",
  CATEGORY_MATCH: "동일 선택 또는 선택지 배열상 거리 기반 점수",
  RANGE_OVERLAP: "현재 구현에서는 숫자/선택지 직접 유사도 점수",
  HARD_CONDITION: "먼저 제외 조건을 검사하고, 제외되지 않으면 일반 직접 유사도에도 포함",
  INFORMATION_ONLY: "일반 문항 점수에서는 제외; 일부는 하드 조건·국가 간 실행력 계산에 별도 사용",
};

const intakeQuestionIds = new Set(["BIO001", "BIO002", "BIO003", "BIO004"]);
const sharedQuestionIds = new Set([
  "R001", "R002", "AGE001", "CB001", "CB002", "CM001", "CM002", "LS001", "LS002", "LS003", "LS004",
  "PS001", "PS002", "VL001", "VL003", "SM001", "AL001",
]);
const detailQuestionIds = new Set([
  "SM002", "LG001", "LG002", "LG003", "LG004", "LG005", "CM003", "CM005", "CF001", "CF004",
  "VL004", "LS005", "LS008", "RG001",
]);

function inclusionDescription(question: QuestionDefinition) {
  const documentedCondition = questionConditionDescriptions[question.id];
  if (documentedCondition) return documentedCondition;
  if (intakeQuestionIds.has(question.id)) return "시작 화면에서 항상 수집(본 설문 40문항 제한 밖)";
  if (sharedQuestionIds.has(question.id)) return "모든 관계 목적의 공통 흐름에 포함";
  if (detailQuestionIds.has(question.id)) return "상세 질문 후보; 앞선 문항 포함 후 최대 40문항 제한 적용";
  return "적응형 흐름 규칙 확인 필요";
}

function answerSchema(question: QuestionDefinition) {
  if (question.type === "text") return "1..40자 자유 입력 문자열";
  if (question.type === "number") return "18..99 정수; 만 나이";
  if (question.options) {
    return question.options.map((option) => `${option.value}=${option.ko}`).join(" | ");
  }
  const range = question.type === "scale5" || question.type === "frequency5" ? "1..5" : "1..10";
  return `${range}; ${question.left?.ko ?? "낮음"} → ${question.right?.ko ?? "높음"}`;
}

export function questionRuleSummary(question: QuestionDefinition) {
  return {
    answerSchema: answerSchema(question),
    condition: inclusionDescription(question),
  };
}

function relationshipWeightText() {
  return Object.entries(algorithmConfig.relationshipWeights)
    .map(([intent, weights]) => {
      const entries = Object.entries(weights)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .map(([module, weight]) => `${module}(${moduleLabels[module as keyof typeof moduleLabels].ko})=${weight}`)
        .join(", ");
      return `- ${intent}: ${entries}`;
    })
    .join("\n");
}

function questionRuleText() {
  return questions
    .map((question) => {
      const { answerSchema: schema, condition } = questionRuleSummary(question);
      const flags = [
        question.required ? "required" : "",
        question.dealbreaker ? "dealbreaker-capable" : "",
        question.sensitive ? "sensitive" : "",
      ].filter(Boolean).join(", ") || "none";
      return `- ${question.id} | module=${question.module} | type=${question.type} | logic=${question.logic} | baseWeight=${question.baseWeight} | flags=${flags}\n  question=${question.ko}\n  answers=${schema}\n  inclusion=${condition}`;
    })
    .join("\n");
}

export function buildAlgorithmSpecification() {
  return `# EEUM 한일 매칭 알고리즘 전체 명세
Version: ${algorithmConfig.version}
Updated: ${algorithmConfig.updatedAt}

## 1. 목적과 기본 성질
- 입력은 두 사용자 프로필 A, B이다. 각 프로필은 answers(questionId → value), importance(questionId → 1..4), 관계 목적 R001을 가진다.
- 출력은 eligible, overall(0..100 정수), tier, confidence, 모듈 점수, 강점, 주의점, 하드 조건 판정, 문항별 근거, 국가 간 실행력이다.
- 계산은 A/B 순서를 바꿔도 같은 결과가 나오도록 대칭적으로 설계되어 있다.
- missing importance는 1로 처리한다. importance 값별 배수는 1→1.0, 2→1.25, 3→1.75, 4→2.4이다.
- importance=4는 모든 차이를 자동 제외하지 않는다. R001, R002, MR001의 명시된 하드 조건에서만 '절대 조건' 플래그로 사용된다. AGE001은 importance와 무관하게 양쪽 최대 허용 범위를 항상 적용한다.

## 2. 실행 순서
1. 8개 하드 조건을 먼저 평가한다.
2. status=conflict가 하나라도 있으면 eligible=false다. unknown은 단독으로 제외 사유가 아니다.
3. 일반 문항 점수와 두 개의 교차 기대 적합도 점수를 계산해 모듈별로 집계한다.
4. 두 사람의 R001별 모듈 가중치를 평균하고, 실제 점수가 존재하는 모듈만 재정규화해 raw overall을 계산한다.
5. 서로 다른 국가이면 국가 간 실행력 점수를 overall에 10% 혼합한다.
6. eligible=false면 overall을 최대 42점으로 제한한다. 이후 0..100 범위로 제한하고 반올림한다.
7. eligible 여부와 overall로 tier를, 실제 비교된 답변 수로 confidence를 정한다.

## 3. 하드 조건: 정확한 판정식
H1 성별 선호
- BIO001(본인 성별) 또는 BIO002(선호 성별)가 A/B 중 하나라도 없으면 conflict.
- accepts(preference, gender) := preference == ANY OR preference == gender.
- accepts(A.BIO002, B.BIO001) AND accepts(B.BIO002, A.BIO001)가 아니면 conflict, 둘 다 만족하면 pass.

H2 나이 차이
- BIO004(만 나이) 또는 AGE001(허용 가능한 최대 나이 차이)이 한쪽이라도 없거나 유효하지 않으면 unknown.
- AGE001 값은 0,2,4,6,10 또는 ANY이며 ANY의 허용 한도는 무한대로 처리한다.
- ageGap=abs(A.BIO004-B.BIO004).
- ageGap > A의 AGE001 한도 또는 ageGap > B의 AGE001 한도이면 conflict. 두 조건을 모두 통과하면 pass.
- AGE001의 일반 문항 점수는 하드 판정이 pass면 100, conflict면 0, unknown이면 점수 집계에서 제외한다.

H3 관계 형태
- R002가 한쪽이라도 없으면 unknown.
- {EXCLUSIVE, OPEN}의 정반대 조합이고 A 또는 B가 R002 importance=4이면 conflict. 그 외 pass.

H4 자녀 계획
- CH001이 한쪽이라도 없으면 unknown.
- DEFINITELY_YES와 DEFINITELY_NO의 정반대 조합이면 importance와 무관하게 conflict. 그 외 pass.

H5 흡연
- SM001 또는 SM002가 한쪽이라도 없으면 unknown.
- A.SM002=NON_SMOKER_ONLY이고 B.SM001∈{OCCASIONAL,E_CIGARETTE,YES}, 또는 그 반대이면 conflict. 그 외 pass.

H6 거리·거주국
- CB001 또는 CB002가 한쪽이라도 없으면 unknown.
- A.CB001 != B.CB001이고 A/B의 CB002 중 하나라도 NO 또는 DOMESTIC_ONLY이면 conflict. 그 외 pass.

H7 관계 목적
- R001이 한쪽이라도 없으면 unknown.
- 한 명이 MARRIAGE, 다른 한 명이 CASUAL 또는 SHORT_TERM이고 A 또는 B가 R001 importance=4이면 conflict. 그 외 pass.

H8 결혼 의향
- MR001 숫자 답변이 한쪽이라도 없으면 unknown.
- 한 명이 8 이상, 다른 한 명이 3 이하이고 A 또는 B가 MR001 importance=4이면 conflict. 그 외 pass.

## 4. 문항 점수 함수
### 4.1 숫자 직접 유사도
- scale10: score = max(0, 100 × (1 - abs(A-B)/9)).
- scale5 또는 frequency5: score = max(0, 100 × (1 - abs(A-B)/4)).

### 4.2 일반 선택지 점수
- 같은 값이면 100.
- 값이 다르고 둘 중 하나가 UNSURE 또는 ANY이면 68.
- 그 외 질문 options 배열에서의 인덱스가 모두 유효하면 score=max(18, 100 × (1 - abs(indexA-indexB)/(optionCount-1))).
- 인덱스를 찾지 못하면 44.
- 이 함수는 logic 이름과 무관하게 DT003 및 CB005를 제외한 모든 비숫자 직접 비교에 사용된다.

### 4.3 CB005 선호 거주지 예외
- 동일 값은 100. UNSURE가 포함되면 68.
- 값이 다르고 BOTH가 포함되면 92.
- 값이 다르고 THIRD_COUNTRY가 포함되면 48.
- 나머지 서로 다른 값은 22.

### 4.4 DT003 데이트 계획 보완 매트릭스
- I_PLAN + PARTNER_PLAN = 100.
- TOGETHER + TOGETHER = 100.
- I_PLAN + I_PLAN = 65.
- PARTNER_PLAN + PARTNER_PLAN = 45.
- 위 조건 이후 한쪽이라도 TOGETHER = 86.
- 위 조건 이후 한쪽이라도 SPONTANEOUS = 72.
- 그 밖의 조합 = 48.

### 4.5 교차 기대 적합도
- 현재 특별 교차 계산 대상은 CM001(actual 연락 빈도)↔CM002(desired 연락 빈도), AF001(actual 애정 표현)↔AF002(desired 애정 표현) 두 쌍뿐이다.
- fitA = 100 × (1 - abs(A.desired - B.actual)/9).
- fitB = 100 × (1 - abs(B.desired - A.actual)/9).
- pairScore = max(0, (fitA + fitB)/2).
- 쌍의 weight는 actual 문항 baseWeight × 양쪽 desired 문항 중요도 배수의 평균이다.
- 각 쌍은 sharedAnswers에 2를 더하고 actual/desired 문항은 이후 개별 계산에서 제외한다.
- LG003과 LG004는 ONE_WAY_FIT으로 표시되어 있지만 현재 특별 교차 쌍에는 없으므로 실제로는 숫자 직접 유사도로 계산된다.

## 5. 문항·모듈·최종 점수 집계
- INFORMATION_ONLY 문항은 일반 문항 점수에서 제외한다. BIO003(이름)은 관리자 식별 정보로만 사용하고, BIO004(만 나이)는 관리자 표시와 AGE001 나이 차이 하드 조건에 사용한다. 단, BIO001/BIO002/CB001은 하드 조건에, CB001/LG001/LG002는 국가 간 실행력에 별도 사용될 수 있다.
- 특별 교차 쌍이 아닌 문항은 A/B 모두 답했을 때만 점수에 포함한다. 한쪽이라도 누락되면 해당 문항은 건너뛴다.
- HARD_CONDITION 문항도 하드 판정 후 일반 직접 유사도 점수에 포함된다.
- importanceMultiplier(q) = (multiplier(A.importance[q]) + multiplier(B.importance[q])) / 2.
- effectiveQuestionWeight = baseWeight × importanceMultiplier.
- moduleScore = Σ(questionScore × effectiveQuestionWeight) / Σ(effectiveQuestionWeight). 결과는 정수 반올림.
- paired 질문의 sharedAnswers 증가는 2, 일반 비교 문항은 1이다.
- intentAWeights = relationshipWeights[A.R001], intentBWeights = relationshipWeights[B.R001]. R001이 없거나 알 수 없으면 UNSURE 가중치를 사용한다.
- effectiveModuleWeight(m) = (intentAWeights[m] + intentBWeights[m]) / 2. 한쪽 목적에서 모듈이 없으면 0으로 간주한다.
- effectiveModuleWeight가 0이거나 moduleScore가 없는 모듈은 최종 합산에서 제외한다.
- rawOverall = Σ(moduleScore × effectiveModuleWeight) / Σ(실제로 사용된 effectiveModuleWeight).
- 사용 가능한 모듈 가중치의 합이 0이면 rawOverall=0이다.
- 따라서 미응답 모듈의 가중치는 0점 벌점이 아니라 분모에서 빠지는 재정규화 방식이다.

## 6. 관계 목적별 모듈 가중치
${relationshipWeightText()}

## 7. 국가 간 실행력(Cross-border feasibility)
- CB001이 둘 다 있고 서로 다를 때만 계산한다. 같은 국가이거나 정보가 없으면 이 보정 자체가 없다.
- 사용 가능한 factor만 포함하고 factor 고유 가중치로 재정규화한다.
- 장거리 수용성(weight 35): 각 CB002를 YES=100, SHORT_TERM=55, DOMESTIC_ONLY=0, NO=0으로 변환한 뒤 가능한 값의 평균.
- 상대 국가 이주 가능성(weight 30): 상대가 한국이면 CB003, 일본이면 CB004, 그 외 국가이면 CB007을 사용. 숫자 1..10을 (value-1)/9×100으로 변환한 뒤 평균.
- 언어 소통·학습(weight 20): 한국 거주자와 일본 거주자 조합에서 한국인의 LG002(일본어), 일본인의 LG001(한국어)을 value/5×100으로 변환. 여기에 양쪽 LG004를 value/10×100으로 변환해 모두 평균. 사용 가능한 값만 포함.
- 선호 거주지 겹침(weight 15): 양쪽 CB005가 있을 때 4.3의 CB005 점수 사용.
- feasibility = round(Σ(factorScore × factorWeight) / Σ(사용 가능한 factorWeight)).
- 국가가 다르면 finalBeforeEligibilityCap = rawOverall×0.9 + feasibility×0.1. crossBorder 모듈이 rawOverall에도 포함될 수 있으므로 국가 간 요소는 두 경로로 영향을 줄 수 있다.

## 8. 최종 점수, 등급, 신뢰도, 설명문
- eligible=true: overall=round(clamp(blendedOverall, 0, 100)).
- eligible=false: overall=round(clamp(min(blendedOverall, 42), 0, 100)), tier는 점수와 무관하게 excluded.
- eligible tier: 90..100 exceptional, 80..89 strong, 70..79 good, 60..69 possible, 0..59 low.
- confidence는 점수 품질 검증치가 아니라 비교에 실제 사용된 sharedAnswers 개수다: 0..15 low, 16..35 medium, 36..70 high, 71 이상 veryHigh.
- strengths: 점수 80 이상 모듈을 높은 점수순 최대 3개. 없고 eligible이면 '핵심 관계 조건에서 큰 충돌이 없음'.
- cautions: 점수 72 미만 모듈을 낮은 점수순 최대 2개. 없고 eligible이면 '뚜렷한 주의 영역이 적음'.
- questionDetails는 최종 기여도나 가중치가 아니라 questionScore 내림차순으로 정렬한다.

## 9. 적응형 설문 흐름
- 최대 질문 수는 40개다. BIO001/BIO002/BIO003/BIO004(성별, 선호 성별, 이름, 만 나이)는 시작 화면에서 별도로 수집되고, 프로필 완성도 계산에는 포함된다.
- 본 설문 공통 시작: R001,R002,AGE001,CB001,CB002.
- 공통 핵심: CM001,CM002,LS001,LS002,LS003,LS004,PS001,PS002,VL001,VL003,SM001,AL001.
- R001=MARRIAGE 분기: MR001,MR002,CH001,CB003,CB004,CB005,CR001,FN001,FM001,FM003.
- R001=LONG_TERM 분기: MR001,CH001,CB003,CB004,CB005,CR001,FN001,FM003,AF001,AF002.
- R001=SERIOUS_OPEN 분기: DT001,DT002,CB003,CB004,CB005,CR001,AF001,AF002,BD001,BD002.
- 그 외(SHORT_TERM,CASUAL,UNSURE 포함) 분기: DT001,DT002,DT003,BD001,BD002,AF001,AF002.
- 마지막 상세 질문 후보: SM002,CB007,CH003,CH005,MR003,LG001,LG002,LG003,LG004,LG005,CM003,CM005,CF001,CF004,VL004,LS005,LS008,RG001.
- 위 순서에서 중복 ID를 제거하고 각 inclusion 조건을 평가한 뒤 앞에서부터 최대 40개만 사용한다.

## 10. 질문별 정확한 설정
${questionRuleText()}

## 11. 관리자 보조 지표(최종 매칭 점수와 별개)
- profileCompletion = answeredRelevantQuestions / relevantQuestions × 100. relevantQuestions는 BIO001,BIO002,BIO003,BIO004와 현재 answers로 생성한 적응형 질문 흐름이다. 최대 100, 정수 반올림.
- 국제연애 실행력 = round(avg(CB003,CB004,CB007,LG004; 숫자 답변만, 없으면 5) × 10), 0..100 제한.
- 소통 안정성 = round(((avg(CF004; 없으면 3)-1)/4)×45 + (10-avg(CF001; 없으면 5))×3 + 30), 0..100 제한.
- 장기 관계 준비도 = round(avg(MR001,CR001,VL004; 숫자 답변만, 없으면 5)/10×100), 0..100 제한.
- 이 세 보조 지표는 후보 간 overall 계산에 다시 투입되지 않는다.

## 12. 변경 요청 시 주의
- logic 문자열은 문서용 분류이며 모든 문자열이 독립된 점수 함수를 자동 선택하는 것은 아니다. 실제 분기 우선순위는 위 4장 규칙이다.
- 알고리즘 변경 요청은 질문 ID, 기존 규칙, 원하는 새 규칙, 예상 영향 범위를 함께 지정하는 것이 가장 정확하다.`;
}

export const algorithmSpecification = buildAlgorithmSpecification();
