import {
  type Answers,
  type Locale,
  type QuestionModule,
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
}

const relationshipWeights: Record<string, Partial<Record<QuestionModule, number>>> = {
  MARRIAGE: {
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
  },
  LONG_TERM: {
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
  },
  SERIOUS_OPEN: {
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
  },
  SHORT_TERM: {
    dating: 25,
    communication: 20,
    conflict: 8,
    lifestyle: 20,
    affection: 15,
    boundaries: 10,
    personality: 10,
    language: 4,
  },
  CASUAL: {
    dating: 30,
    boundaries: 20,
    communication: 18,
    lifestyle: 15,
    affection: 12,
    personality: 5,
    language: 4,
  },
  UNSURE: {
    communication: 20,
    lifestyle: 20,
    personality: 16,
    values: 14,
    crossBorder: 12,
    language: 8,
    affection: 6,
    dating: 4,
  },
};

const importanceMultiplier = (value: number | undefined) =>
  value === 4 ? 2.4 : value === 3 ? 1.75 : value === 2 ? 1.25 : 1;

function hardConflicts(a: MatchProfile, b: MatchProfile) {
  const conflicts: string[] = [];
  const aa = a.answers;
  const bb = b.answers;
  const isAbsolute = (profile: MatchProfile, id: string) => profile.importance?.[id] === 4;

  if (
    ((aa.R002 === "EXCLUSIVE" && bb.R002 === "OPEN") ||
      (aa.R002 === "OPEN" && bb.R002 === "EXCLUSIVE")) &&
    (isAbsolute(a, "R002") || isAbsolute(b, "R002"))
  ) {
    conflicts.push("독점 관계에 대한 절대 조건이 충돌합니다.");
  }

  if (
    ((aa.CH001 === "DEFINITELY_YES" && bb.CH001 === "DEFINITELY_NO") ||
      (aa.CH001 === "DEFINITELY_NO" && bb.CH001 === "DEFINITELY_YES"))
  ) {
    conflicts.push("자녀 계획이 서로 양립하기 어렵습니다.");
  }

  if (
    (aa.SM002 === "NON_SMOKER_ONLY" && bb.SM001 === "YES") ||
    (bb.SM002 === "NON_SMOKER_ONLY" && aa.SM001 === "YES")
  ) {
    conflicts.push("흡연에 대한 절대 조건이 충돌합니다.");
  }

  if (
    aa.CB001 &&
    bb.CB001 &&
    aa.CB001 !== bb.CB001 &&
    (aa.CB002 === "NO" || bb.CB002 === "NO")
  ) {
    conflicts.push("현재 거주 국가와 장거리 가능 조건이 충돌합니다.");
  }

  const aIntent = String(aa.R001 ?? "UNSURE");
  const bIntent = String(bb.R001 ?? "UNSURE");
  if (
    ((aIntent === "MARRIAGE" && ["CASUAL", "SHORT_TERM"].includes(bIntent)) ||
      (bIntent === "MARRIAGE" && ["CASUAL", "SHORT_TERM"].includes(aIntent))) &&
    (isAbsolute(a, "R001") || isAbsolute(b, "R001"))
  ) {
    conflicts.push("관계 목적에 대한 절대 조건이 다릅니다.");
  }

  return conflicts;
}

function categoricalScore(id: string, a: string, b: string) {
  if (a === b) return 100;
  if ([a, b].includes("UNSURE") || [a, b].includes("ANY")) return 68;

  if (id === "DT003") {
    if (new Set([a, b]).has("I_PLAN") && new Set([a, b]).has("PARTNER_PLAN")) return 100;
    if (a === "TOGETHER" || b === "TOGETHER") return 86;
    if (a === "SPONTANEOUS" || b === "SPONTANEOUS") return 72;
    return 48;
  }

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
  const conflicts = hardConflicts(a, b);
  const eligible = conflicts.length === 0;
  const moduleBuckets = new Map<QuestionModule, { weighted: number; weight: number; shared: number }>();
  const consumed = new Set<string>();

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
  }

  const modules = [...moduleBuckets.entries()]
    .map(([module, bucket]) => ({
      module,
      score: Math.round(bucket.weighted / Math.max(bucket.weight, 1)),
      shared: bucket.shared,
    }))
    .sort((left, right) => right.score - left.score);

  const intent = String(a.answers.R001 ?? b.answers.R001 ?? "UNSURE");
  const weights = relationshipWeights[intent] ?? relationshipWeights.UNSURE;
  let weightedTotal = 0;
  let availableWeights = 0;
  for (const result of modules) {
    const moduleWeight = weights[result.module] ?? 3;
    weightedTotal += result.score * moduleWeight;
    availableWeights += moduleWeight;
  }
  let overall = availableWeights ? weightedTotal / availableWeights : 0;

  if (a.answers.CB001 && b.answers.CB001 && a.answers.CB001 !== b.answers.CB001) {
    const flexibility = [a.answers.CB007, b.answers.CB007, a.answers.CB003, a.answers.CB004, b.answers.CB003, b.answers.CB004]
      .filter((value): value is number => typeof value === "number");
    if (flexibility.length) {
      const feasibility = flexibility.reduce((sum, value) => sum + value, 0) / flexibility.length;
      overall = overall * 0.9 + (feasibility / 10) * 100 * 0.1;
    }
  }

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
  };
}

export function profileCompletion(profile: MatchProfile) {
  const relevant = questions.filter((question) => !question.showIf || question.showIf(profile.answers));
  const answered = relevant.filter((question) => profile.answers[question.id] !== undefined).length;
  return Math.min(100, Math.round((answered / Math.max(32, relevant.length)) * 100));
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
