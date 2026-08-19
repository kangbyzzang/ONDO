import {
  type Answers,
  type Locale,
  type MatchLogic,
  type QuestionModule,
  answerLabel,
  getQuestionFlow,
  moduleLabels,
  questionMap,
  questions,
} from "../data/questions";

export interface MatchProfile {
  id: string;
  instagram: string;
  name?: string;
  locale?: Locale;
  answers: Answers;
  importance?: Record<string, number>;
  updatedAt?: string;
}

export interface ModuleResult {
  module: QuestionModule;
  score: number;
  shared: number;
}

export interface MatchResult {
  eligible: boolean;
  overall: number;
  tier: "exceptional" | "strong" | "good" | "possible" | "low" | "excluded";
  sharedAnswers: number;
  confidence: "low" | "medium" | "high" | "veryHigh";
  modules: ModuleResult[];
  strengths: string[];
  cautions: string[];
  conflicts: string[];
  hardChecks: HardCheckResult[];
  questionDetails: QuestionMatchDetail[];
  crossBorderFeasibility?: CrossBorderFeasibility;
}

export interface HardCheckResult {
  id: "gender" | "relationshipStyle" | "children" | "smoking" | "distance" | "intent" | "marriageReadiness";
  label: string;
  status: "pass" | "conflict" | "unknown";
  detail: string;
}

export interface QuestionMatchDetail {
  id: string;
  label: string;
  module: QuestionModule;
  logic: MatchLogic;
  score: number;
  weight: number;
  answerA: string;
  answerB: string;
}

export interface CrossBorderFeasibility {
  score: number;
  factors: { label: string; score: number }[];
}

export const relationshipWeights: Record<string, Partial<Record<QuestionModule, number>>> = {
  MARRIAGE: {
    intent: 10,
    future: 15,
    children: 15,
    communication: 12,
    conflict: 6,
    values: 12,
    lifestyle: 10,
    crossBorder: 12,
    language: 6,
    finance: 7,
    family: 7,
    career: 5,
    affection: 3,
    personality: 2,
    religion: 2,
  },
  LONG_TERM: {
    intent: 10,
    communication: 17,
    conflict: 7,
    lifestyle: 15,
    values: 15,
    crossBorder: 13,
    language: 6,
    affection: 10,
    personality: 8,
    future: 8,
    career: 6,
    children: 4,
    family: 2,
    finance: 2,
    religion: 2,
  },
  SERIOUS_OPEN: {
    intent: 10,
    communication: 20,
    conflict: 8,
    lifestyle: 18,
    personality: 15,
    affection: 15,
    values: 12,
    crossBorder: 10,
    language: 5,
    dating: 7,
    future: 3,
    boundaries: 6,
    religion: 2,
  },
  SHORT_TERM: {
    intent: 8,
    dating: 25,
    communication: 20,
    conflict: 8,
    lifestyle: 20,
    affection: 15,
    boundaries: 10,
    personality: 10,
    language: 4,
    religion: 1,
  },
  CASUAL: {
    intent: 8,
    dating: 30,
    boundaries: 20,
    communication: 18,
    lifestyle: 15,
    affection: 12,
    personality: 5,
    language: 4,
    religion: 1,
  },
  UNSURE: {
    intent: 8,
    communication: 20,
    lifestyle: 20,
    personality: 16,
    values: 14,
    crossBorder: 12,
    language: 8,
    affection: 6,
    dating: 4,
    conflict: 8,
    religion: 2,
  },
};

export const importanceMultipliers: Record<number, number> = {
  1: 1,
  2: 1.25,
  3: 1.75,
  4: 2.4,
};

const importanceMultiplier = (value: number | undefined) => importanceMultipliers[value ?? 1] ?? 1;

export const algorithmConfig = {
  version: "2.0.0",
  updatedAt: "2026-08-19",
  formulas: [
    "문항 점수 × 기본 가중치 × 두 사용자의 평균 중요도 배수",
    "모듈 점수 = 모듈 내 가중 점수 합 ÷ 실제 사용된 가중치 합",
    "최종 점수 = 두 사용자의 관계 목적별 모듈 가중치를 평균해 합산",
    "국가가 다르면 거리·이주·언어·선호 거주지 실행력을 최종 점수의 10%에 반영",
  ],
  hardConditions: [
    "서로의 성별 선호가 맞지 않거나 성별 정보가 없는 경우",
    "절대 조건인 독점 관계와 비독점 관계가 충돌하는 경우",
    "자녀를 반드시 원하는 사람과 절대 원하지 않는 사람이 만나는 경우",
    "비흡연자만 원하는 사람과 흡연자가 만나는 경우",
    "서로 다른 국가에 살면서 장거리 불가 또는 국내만 가능인 경우",
    "절대 조건인 결혼 목적과 단기·가벼운 만남 목적이 충돌하는 경우",
    "절대 조건인 결혼 의향이 8점 이상 대 3점 이하로 충돌하는 경우",
  ],
  importanceMultipliers,
  relationshipWeights,
  tiers: ["90–100 매우 높은 궁합", "80–89 높은 궁합", "70–79 좋은 궁합", "60–69 가능성이 있는 궁합", "0–59 추천 우선순위 낮음"],
  confidence: ["0–15 낮음", "16–35 보통", "36–70 높음", "71+ 매우 높음"],
} as const;

export function evaluateHardConditions(a: MatchProfile, b: MatchProfile): HardCheckResult[] {
  const checks: HardCheckResult[] = [];
  const aa = a.answers;
  const bb = b.answers;
  const isAbsolute = (profile: MatchProfile, id: string) => profile.importance?.[id] === 4;
  const acceptsGender = (preference: unknown, gender: unknown) =>
    preference === "ANY" || preference === gender;
  const add = (check: HardCheckResult) => checks.push(check);

  if (!aa.BIO001 || !aa.BIO002 || !bb.BIO001 || !bb.BIO002) {
    add({ id: "gender", label: "성별 선호", status: "conflict", detail: "성별 또는 선호 성별 정보가 없어 추천에서 제외됩니다." });
  } else if (!acceptsGender(aa.BIO002, bb.BIO001) || !acceptsGender(bb.BIO002, aa.BIO001)) {
    add({ id: "gender", label: "성별 선호", status: "conflict", detail: "서로가 원하는 상대 성별 조건이 맞지 않습니다." });
  } else {
    add({ id: "gender", label: "성별 선호", status: "pass", detail: "서로의 성별 선호 조건을 만족합니다." });
  }

  const relationshipStyleConflict =
    ((aa.R002 === "EXCLUSIVE" && bb.R002 === "OPEN") ||
      (aa.R002 === "OPEN" && bb.R002 === "EXCLUSIVE")) &&
    (isAbsolute(a, "R002") || isAbsolute(b, "R002"));
  if (!aa.R002 || !bb.R002) {
    add({ id: "relationshipStyle", label: "관계 형태", status: "unknown", detail: "관계 형태 답변이 부족합니다." });
  } else if (relationshipStyleConflict) {
    add({ id: "relationshipStyle", label: "관계 형태", status: "conflict", detail: "독점 관계에 대한 절대 조건이 충돌합니다." });
  } else {
    add({ id: "relationshipStyle", label: "관계 형태", status: "pass", detail: "관계 형태에 절대조건 충돌이 없습니다." });
  }

  const childrenConflict =
    ((aa.CH001 === "DEFINITELY_YES" && bb.CH001 === "DEFINITELY_NO") ||
      (aa.CH001 === "DEFINITELY_NO" && bb.CH001 === "DEFINITELY_YES"));
  if (!aa.CH001 || !bb.CH001) {
    add({ id: "children", label: "자녀 계획", status: "unknown", detail: "자녀 계획 답변이 없거나 현재 관계 목적에서 묻지 않았습니다." });
  } else if (childrenConflict) {
    add({ id: "children", label: "자녀 계획", status: "conflict", detail: "자녀 계획이 서로 양립하기 어렵습니다." });
  } else {
    add({ id: "children", label: "자녀 계획", status: "pass", detail: "자녀 계획에 절대적인 충돌이 없습니다." });
  }

  const smokingValues = new Set(["OCCASIONAL", "E_CIGARETTE", "YES"]);
  const smokingConflict =
    (aa.SM002 === "NON_SMOKER_ONLY" && smokingValues.has(String(bb.SM001))) ||
    (bb.SM002 === "NON_SMOKER_ONLY" && smokingValues.has(String(aa.SM001)));
  if (!aa.SM001 || !aa.SM002 || !bb.SM001 || !bb.SM002) {
    add({ id: "smoking", label: "흡연", status: "unknown", detail: "흡연 또는 상대 흡연 허용 답변이 부족합니다." });
  } else if (smokingConflict) {
    add({ id: "smoking", label: "흡연", status: "conflict", detail: "비흡연자 선호와 상대방의 흡연 여부가 충돌합니다." });
  } else {
    add({ id: "smoking", label: "흡연", status: "pass", detail: "흡연 조건을 서로 수용할 수 있습니다." });
  }

  const differentCountries = Boolean(aa.CB001 && bb.CB001 && aa.CB001 !== bb.CB001);
  const distanceConflict = differentCountries && [aa.CB002, bb.CB002].some((value) => value === "NO" || value === "DOMESTIC_ONLY");
  if (!aa.CB001 || !bb.CB001 || !aa.CB002 || !bb.CB002) {
    add({ id: "distance", label: "거리·거주국", status: "unknown", detail: "거주 국가 또는 장거리 가능 답변이 부족합니다." });
  } else if (distanceConflict) {
    add({ id: "distance", label: "거리·거주국", status: "conflict", detail: "서로 다른 국가에 살지만 장거리 조건을 충족하지 못합니다." });
  } else {
    add({ id: "distance", label: "거리·거주국", status: "pass", detail: differentCountries ? "국가가 다르지만 두 사람 모두 장거리 가능 범위입니다." : "현재 거주 조건이 양립합니다." });
  }

  const aIntent = String(aa.R001 ?? "UNSURE");
  const bIntent = String(bb.R001 ?? "UNSURE");
  const intentConflict =
    ((aIntent === "MARRIAGE" && ["CASUAL", "SHORT_TERM"].includes(bIntent)) ||
      (bIntent === "MARRIAGE" && ["CASUAL", "SHORT_TERM"].includes(aIntent))) &&
    (isAbsolute(a, "R001") || isAbsolute(b, "R001"));
  if (!aa.R001 || !bb.R001) {
    add({ id: "intent", label: "관계 목적", status: "unknown", detail: "관계 목적 답변이 부족합니다." });
  } else if (intentConflict) {
    add({ id: "intent", label: "관계 목적", status: "conflict", detail: "관계 목적에 대한 절대 조건이 다릅니다." });
  } else {
    add({ id: "intent", label: "관계 목적", status: "pass", detail: "관계 목적에 절대적인 충돌이 없습니다." });
  }

  const aMarriage = typeof aa.MR001 === "number" ? aa.MR001 : null;
  const bMarriage = typeof bb.MR001 === "number" ? bb.MR001 : null;
  const polarizedMarriage = aMarriage !== null && bMarriage !== null &&
    ((aMarriage >= 8 && bMarriage <= 3) || (bMarriage >= 8 && aMarriage <= 3));
  if (aMarriage === null || bMarriage === null) {
    add({ id: "marriageReadiness", label: "결혼 의향", status: "unknown", detail: "결혼 의향 답변이 없거나 현재 관계 목적에서 묻지 않았습니다." });
  } else if (polarizedMarriage && (isAbsolute(a, "MR001") || isAbsolute(b, "MR001"))) {
    add({ id: "marriageReadiness", label: "결혼 의향", status: "conflict", detail: "결혼 의향이 정반대이며 한 사람 이상이 절대 조건으로 설정했습니다." });
  } else {
    add({ id: "marriageReadiness", label: "결혼 의향", status: "pass", detail: "결혼 의향에 절대적인 충돌이 없습니다." });
  }

  return checks;
}

function categoricalScore(id: string, a: string, b: string) {
  if (id === "DT003") {
    if (new Set([a, b]).has("I_PLAN") && new Set([a, b]).has("PARTNER_PLAN")) return 100;
    if (a === "TOGETHER" && b === "TOGETHER") return 100;
    if (a === "I_PLAN" && b === "I_PLAN") return 65;
    if (a === "PARTNER_PLAN" && b === "PARTNER_PLAN") return 45;
    if (a === "TOGETHER" || b === "TOGETHER") return 86;
    if (a === "SPONTANEOUS" || b === "SPONTANEOUS") return 72;
    return 48;
  }

  if (a === b) return 100;
  if ([a, b].includes("UNSURE") || [a, b].includes("ANY")) return 68;

  if (id === "CB005") {
    if ([a, b].includes("BOTH")) return 92;
    if ([a, b].includes("THIRD_COUNTRY")) return 48;
    return 22;
  }

  const definition = questionMap.get(id);
  const values = definition?.options?.map((option) => option.value) ?? [];
  const ai = values.indexOf(a);
  const bi = values.indexOf(b);
  if (ai >= 0 && bi >= 0 && values.length > 1) {
    return Math.max(18, 100 * (1 - Math.abs(ai - bi) / (values.length - 1)));
  }
  return 44;
}

function directQuestionScore(id: string, av: string | number, bv: string | number) {
  if (typeof av === "number" && typeof bv === "number") {
    const definition = questionMap.get(id);
    const maxDifference = definition?.type === "scale5" || definition?.type === "frequency5" ? 4 : 9;
    return Math.max(0, 100 * (1 - Math.abs(av - bv) / maxDifference));
  }
  return categoricalScore(id, String(av), String(bv));
}

function oneWayScore(actualA: unknown, desiredA: unknown, actualB: unknown, desiredB: unknown) {
  if (![actualA, desiredA, actualB, desiredB].every((value) => typeof value === "number")) return null;
  const fitA = 100 * (1 - Math.abs((desiredA as number) - (actualB as number)) / 9);
  const fitB = 100 * (1 - Math.abs((desiredB as number) - (actualA as number)) / 9);
  return Math.max(0, (fitA + fitB) / 2);
}

function numericPercent(value: unknown, maximum: number) {
  if (typeof value === "number") return Math.max(0, Math.min(100, (value / maximum) * 100));
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, (parsed / maximum) * 100)) : null;
}

function calculateCrossBorderFeasibility(a: MatchProfile, b: MatchProfile): CrossBorderFeasibility | undefined {
  const aa = a.answers;
  const bb = b.answers;
  if (!aa.CB001 || !bb.CB001 || aa.CB001 === bb.CB001) return undefined;

  const factors: { label: string; score: number; weight: number }[] = [];
  const distanceValue = (value: unknown) => value === "YES" ? 100 : value === "SHORT_TERM" ? 55 : value === "DOMESTIC_ONLY" || value === "NO" ? 0 : null;
  const distance = [distanceValue(aa.CB002), distanceValue(bb.CB002)].filter((value): value is number => value !== null);
  if (distance.length) factors.push({ label: "장거리 수용성", score: distance.reduce((sum, value) => sum + value, 0) / distance.length, weight: 35 });

  const relocationAnswers = [
    bb.CB001 === "KOREA" ? aa.CB003 : bb.CB001 === "JAPAN" ? aa.CB004 : aa.CB007,
    aa.CB001 === "KOREA" ? bb.CB003 : aa.CB001 === "JAPAN" ? bb.CB004 : bb.CB007,
  ];
  const relocation = relocationAnswers.map((value) => typeof value === "number" ? ((value - 1) / 9) * 100 : null).filter((value): value is number => value !== null);
  if (relocation.length) factors.push({ label: "상대 국가 이주 가능성", score: relocation.reduce((sum, value) => sum + value, 0) / relocation.length, weight: 30 });

  const languageScores: number[] = [];
  if (aa.CB001 === "KOREA" && bb.CB001 === "JAPAN") {
    const aJapanese = numericPercent(aa.LG002, 5);
    const bKorean = numericPercent(bb.LG001, 5);
    if (aJapanese !== null) languageScores.push(aJapanese);
    if (bKorean !== null) languageScores.push(bKorean);
  } else if (aa.CB001 === "JAPAN" && bb.CB001 === "KOREA") {
    const aKorean = numericPercent(aa.LG001, 5);
    const bJapanese = numericPercent(bb.LG002, 5);
    if (aKorean !== null) languageScores.push(aKorean);
    if (bJapanese !== null) languageScores.push(bJapanese);
  }
  for (const willingness of [aa.LG004, bb.LG004]) {
    const score = numericPercent(willingness, 10);
    if (score !== null) languageScores.push(score);
  }
  if (languageScores.length) factors.push({ label: "언어 소통·학습", score: languageScores.reduce((sum, value) => sum + value, 0) / languageScores.length, weight: 20 });

  if (aa.CB005 !== undefined && bb.CB005 !== undefined) {
    factors.push({ label: "선호 거주지 겹침", score: categoricalScore("CB005", String(aa.CB005), String(bb.CB005)), weight: 15 });
  }

  if (!factors.length) return undefined;
  const availableWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  return {
    score: Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / availableWeight),
    factors: factors.map(({ label, score }) => ({ label, score: Math.round(score) })),
  };
}

function displayAnswer(id: string, value: string | number) {
  const question = questionMap.get(id);
  return question ? answerLabel(question, value, "ko") : String(value);
}

function confidenceFrom(shared: number): MatchResult["confidence"] {
  if (shared <= 15) return "low";
  if (shared <= 35) return "medium";
  if (shared <= 70) return "high";
  return "veryHigh";
}

function tierFrom(score: number, eligible: boolean): MatchResult["tier"] {
  if (!eligible) return "excluded";
  if (score >= 90) return "exceptional";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  if (score >= 60) return "possible";
  return "low";
}

export function calculateMatch(a: MatchProfile, b: MatchProfile): MatchResult {
  const hardChecks = evaluateHardConditions(a, b);
  const conflicts = hardChecks.filter((check) => check.status === "conflict").map((check) => check.detail);
  const eligible = conflicts.length === 0;
  const moduleBuckets = new Map<QuestionModule, { weighted: number; weight: number; shared: number }>();
  const consumed = new Set<string>();
  const questionDetails: QuestionMatchDetail[] = [];

  const paired = [
    ["CM001", "CM002"],
    ["AF001", "AF002"],
  ] as const;

  for (const [actualId, desiredId] of paired) {
    const score = oneWayScore(
      a.answers[actualId],
      a.answers[desiredId],
      b.answers[actualId],
      b.answers[desiredId],
    );
    if (score === null) continue;
    const definition = questionMap.get(actualId);
    if (!definition) continue;
    const importance = (importanceMultiplier(a.importance?.[desiredId]) + importanceMultiplier(b.importance?.[desiredId])) / 2;
    const weight = definition.baseWeight * importance;
    const bucket = moduleBuckets.get(definition.module) ?? { weighted: 0, weight: 0, shared: 0 };
    bucket.weighted += score * weight;
    bucket.weight += weight;
    bucket.shared += 2;
    moduleBuckets.set(definition.module, bucket);
    questionDetails.push({
      id: `${actualId}:${desiredId}`,
      label: `${definition.ko} ↔ 상대 기대`,
      module: definition.module,
      logic: "ONE_WAY_FIT",
      score: Math.round(score),
      weight: Number(weight.toFixed(2)),
      answerA: `${displayAnswer(actualId, a.answers[actualId] as string | number)} / 기대 ${displayAnswer(desiredId, a.answers[desiredId] as string | number)}`,
      answerB: `${displayAnswer(actualId, b.answers[actualId] as string | number)} / 기대 ${displayAnswer(desiredId, b.answers[desiredId] as string | number)}`,
    });
    consumed.add(actualId);
    consumed.add(desiredId);
  }

  for (const definition of questions) {
    if (consumed.has(definition.id) || definition.logic === "INFORMATION_ONLY") continue;
    const av = a.answers[definition.id];
    const bv = b.answers[definition.id];
    if (av === undefined || bv === undefined) continue;
    const score = directQuestionScore(definition.id, av, bv);
    const importance = (importanceMultiplier(a.importance?.[definition.id]) + importanceMultiplier(b.importance?.[definition.id])) / 2;
    const weight = definition.baseWeight * importance;
    const bucket = moduleBuckets.get(definition.module) ?? { weighted: 0, weight: 0, shared: 0 };
    bucket.weighted += score * weight;
    bucket.weight += weight;
    bucket.shared += 1;
    moduleBuckets.set(definition.module, bucket);
    questionDetails.push({
      id: definition.id,
      label: definition.ko,
      module: definition.module,
      logic: definition.logic,
      score: Math.round(score),
      weight: Number(weight.toFixed(2)),
      answerA: displayAnswer(definition.id, av),
      answerB: displayAnswer(definition.id, bv),
    });
  }

  const modules = [...moduleBuckets.entries()]
    .map(([module, bucket]) => ({
      module,
      score: Math.round(bucket.weighted / bucket.weight),
      shared: bucket.shared,
    }))
    .sort((left, right) => right.score - left.score);

  const aIntent = String(a.answers.R001 ?? "UNSURE");
  const bIntent = String(b.answers.R001 ?? "UNSURE");
  const aWeights = relationshipWeights[aIntent] ?? relationshipWeights.UNSURE;
  const bWeights = relationshipWeights[bIntent] ?? relationshipWeights.UNSURE;
  let weightedTotal = 0;
  let availableWeights = 0;
  for (const result of modules) {
    const moduleWeight = ((aWeights[result.module] ?? 0) + (bWeights[result.module] ?? 0)) / 2;
    if (moduleWeight <= 0) continue;
    weightedTotal += result.score * moduleWeight;
    availableWeights += moduleWeight;
  }
  let overall = availableWeights ? weightedTotal / availableWeights : 0;

  const crossBorderFeasibility = calculateCrossBorderFeasibility(a, b);
  if (crossBorderFeasibility) overall = overall * 0.9 + crossBorderFeasibility.score * 0.1;

  overall = Math.round(Math.max(0, Math.min(100, eligible ? overall : Math.min(overall, 42))));
  const sharedAnswers = modules.reduce((sum, module) => sum + module.shared, 0);
  const high = modules.filter((module) => module.score >= 80).slice(0, 3);
  const low = [...modules].sort((left, right) => left.score - right.score).filter((module) => module.score < 72).slice(0, 2);
  const strengths = high.map((module) => `${moduleLabels[module.module].ko} 영역의 응답이 잘 맞습니다.`);
  const cautions = low.map((module) => `${moduleLabels[module.module].ko}에 차이가 있어 대화로 확인하면 좋습니다.`);

  if (!strengths.length && eligible) strengths.push("핵심 관계 조건에서 큰 충돌이 발견되지 않았습니다.");
  if (!cautions.length && eligible) cautions.push("현재 답변 기준으로 뚜렷한 주의 영역이 적습니다.");

  return {
    eligible,
    overall,
    tier: tierFrom(overall, eligible),
    sharedAnswers,
    confidence: confidenceFrom(sharedAnswers),
    modules,
    strengths,
    cautions,
    conflicts,
    hardChecks,
    questionDetails: questionDetails.sort((left, right) => right.score - left.score),
    crossBorderFeasibility,
  };
}

export function profileCompletion(profile: MatchProfile) {
  const relevantIds = new Set(["BIO001", "BIO002", ...getQuestionFlow(profile.answers).map((question) => question.id)]);
  const relevant = questions.filter((question) => relevantIds.has(question.id));
  const answered = relevant.filter((question) => profile.answers[question.id] !== undefined).length;
  return Math.min(100, Math.round((answered / Math.max(1, relevant.length)) * 100));
}

export function profileSignals(profile: MatchProfile) {
  const answers = profile.answers;
  const average = (ids: string[], fallback = 5) => {
    const values = ids.map((id) => answers[id]).filter((value): value is number => typeof value === "number");
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  };

  return [
    {
      label: "국제연애 실행력",
      value: Math.round(average(["CB003", "CB004", "CB007", "LG004"]) * 10),
      note: "거리·이주·언어 학습 답변을 종합",
    },
    {
      label: "소통 안정성",
      value: Math.round(((average(["CF004"], 3) - 1) / 4) * 45 + (10 - average(["CF001"])) * 3 + 30),
      note: "갈등 처리와 연락 기대치 기준",
    },
    {
      label: "장기 관계 준비도",
      value: Math.round((average(["MR001", "CR001", "VL004"]) / 10) * 100),
      note: "관계 목적·미래 계획·양보 의향 기준",
    },
  ].map((signal) => ({ ...signal, value: Math.max(0, Math.min(100, signal.value)) }));
}

export const tierLabels: Record<MatchResult["tier"], string> = {
  exceptional: "매우 높은 궁합",
  strong: "높은 궁합",
  good: "좋은 궁합",
  possible: "가능성이 있는 궁합",
  low: "추천 우선순위 낮음",
  excluded: "절대 조건 충돌",
};

export const confidenceLabels: Record<MatchResult["confidence"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  veryHigh: "매우 높음",
};
