export type Locale = "ko" | "ja";
export type AnswerValue = string | number;
export type Answers = Record<string, AnswerValue>;

export type QuestionModule =
  | "intent"
  | "crossBorder"
  | "language"
  | "future"
  | "children"
  | "communication"
  | "conflict"
  | "affection"
  | "boundaries"
  | "lifestyle"
  | "personality"
  | "career"
  | "finance"
  | "family"
  | "values"
  | "religion"
  | "dating";

export type MatchLogic =
  | "SIMILARITY"
  | "ONE_WAY_FIT"
  | "COMPLEMENTARY"
  | "CATEGORY_MATCH"
  | "RANGE_OVERLAP"
  | "HARD_CONDITION"
  | "INFORMATION_ONLY";

export interface QuestionOption {
  value: string;
  ko: string;
  ja: string;
}

export interface QuestionDefinition {
  id: string;
  module: QuestionModule;
  ko: string;
  ja: string;
  type: "scale10" | "scale5" | "single" | "frequency5";
  options?: QuestionOption[];
  left?: { ko: string; ja: string };
  right?: { ko: string; ja: string };
  required?: boolean;
  sensitive?: boolean;
  dealbreaker?: boolean;
  logic: MatchLogic;
  baseWeight: number;
  showIf?: (answers: Answers) => boolean;
}

const o = (value: string, ko: string, ja: string): QuestionOption => ({
  value,
  ko,
  ja,
});

const intentIs = (answers: Answers, ...intents: string[]) =>
  intents.includes(String(answers.R001 ?? ""));

const scale = (
  id: string,
  module: QuestionModule,
  ko: string,
  ja: string,
  leftKo: string,
  leftJa: string,
  rightKo: string,
  rightJa: string,
  extras: Partial<QuestionDefinition> = {},
): QuestionDefinition => ({
  id,
  module,
  ko,
  ja,
  type: "scale10",
  left: { ko: leftKo, ja: leftJa },
  right: { ko: rightKo, ja: rightJa },
  logic: "SIMILARITY",
  baseWeight: 1,
  ...extras,
});

export const questions: QuestionDefinition[] = [
  {
    id: "R001",
    module: "intent",
    ko: "지금 어떤 관계를 찾고 있나요?",
    ja: "今、どのような関係を探していますか？",
    type: "single",
    options: [
      o("MARRIAGE", "결혼을 전제로 만날 사람", "結婚を前提に付き合える相手"),
      o("LONG_TERM", "진지한 장기 연애", "真剣な長期交際"),
      o("SERIOUS_OPEN", "진지하게 만나되 미래는 열어두기", "真剣に付き合いたいが将来は未定"),
      o("SHORT_TERM", "단기 연애", "短期的な交際"),
      o("CASUAL", "가벼운 만남", "カジュアルな関係"),
      o("UNSURE", "아직 잘 모르겠어요", "まだよく分からない"),
    ],
    required: true,
    dealbreaker: true,
    logic: "HARD_CONDITION",
    baseWeight: 2,
  },
  {
    id: "R002",
    module: "intent",
    ko: "어떤 형태의 관계를 원하나요?",
    ja: "どのような交際スタイルを希望しますか？",
    type: "single",
    options: [
      o("EXCLUSIVE", "한 사람과만 만나는 관계", "一人の相手とだけ付き合う関係"),
      o("EXCLUSIVE_AFTER_DATING", "사귀기 전에는 열어두고, 이후에는 한 사람만", "交際前は複数でも、交際後は一人だけ"),
      o("OPEN", "비독점적 관계도 가능", "オープンな関係も可能"),
      o("UNSURE", "아직 모르겠어요", "まだ分からない"),
    ],
    required: true,
    dealbreaker: true,
    logic: "HARD_CONDITION",
    baseWeight: 2,
  },
  {
    id: "CB001",
    module: "crossBorder",
    ko: "현재 어디에 살고 있나요?",
    ja: "現在どこに住んでいますか？",
    type: "single",
    options: [o("KOREA", "한국", "韓国"), o("JAPAN", "일본", "日本"), o("OTHER", "그 외 국가", "その他")],
    required: true,
    logic: "INFORMATION_ONLY",
    baseWeight: 0,
  },
  {
    id: "CB002",
    module: "crossBorder",
    ko: "다른 지역이나 나라에 사는 사람과 연애할 수 있나요?",
    ja: "別の地域や国に住む相手と交際できますか？",
    type: "single",
    options: [
      o("NO", "어려워요", "難しい"),
      o("DOMESTIC_ONLY", "같은 나라라면 가능해요", "同じ国内なら可能"),
      o("SHORT_TERM", "일정 기간이라면 가능해요", "一定期間なら可能"),
      o("YES", "장거리도 괜찮아요", "遠距離でも問題ない"),
    ],
    required: true,
    dealbreaker: true,
    logic: "HARD_CONDITION",
    baseWeight: 1.8,
  },
  scale("CM001", "communication", "연애할 때 실제로 얼마나 자주 연락하는 편인가요?", "交際中、実際にはどの程度連絡するタイプですか？", "필요할 때만", "必要な時だけ", "하루 종일 자주", "一日中こまめに", { logic: "ONE_WAY_FIT", baseWeight: 1.4 }),
  scale("CM002", "communication", "상대방이 얼마나 자주 연락해주길 바라나요?", "相手にはどの程度連絡してほしいですか？", "필요할 때만", "必要な時だけ", "하루 종일 자주", "一日中こまめに", { logic: "ONE_WAY_FIT", baseWeight: 1.4 }),
  scale("LS001", "lifestyle", "평소 생활 리듬은 어느 쪽에 가까운가요?", "普段の生活リズムはどちらに近いですか？", "완전 야행성", "完全な夜型", "완전 아침형", "完全な朝型"),
  scale("LS002", "lifestyle", "쉬는 날, 어디에서 에너지를 얻나요?", "休日はどこでエネルギーを充電しますか？", "밖에서 활동", "外で活動", "집에서 휴식", "家で休む"),
  scale("LS003", "lifestyle", "약속과 여행을 얼마나 미리 계획하나요?", "予定や旅行をどのくらい計画しますか？", "그때그때 즉흥적", "その場で決める", "매우 계획적", "かなり計画的"),
  scale("LS004", "lifestyle", "생활 공간의 청결이 얼마나 중요한가요?", "生活空間の清潔さはどのくらい重要ですか？", "크게 신경 쓰지 않음", "あまり気にしない", "매우 중요", "とても重要", { baseWeight: 1.3 }),
  scale("PS001", "personality", "사람들과 함께 있을 때 에너지가 생기나요?", "人と一緒にいるとエネルギーが湧きますか？", "혼자 있을 때 충전", "一人で充電", "사람들과 있을 때 충전", "人といると充電"),
  scale("PS002", "personality", "관계 안에서도 혼자만의 시간이 얼마나 필요한가요?", "交際中でも一人の時間はどのくらい必要ですか？", "거의 필요 없음", "ほとんど不要", "아주 많이 필요", "かなり必要", { baseWeight: 1.2 }),
  scale("VL001", "values", "연애와 가정에 대한 생각은 어느 쪽에 가깝나요?", "恋愛や家庭についての考えはどちらに近いですか？", "매우 현대적", "とても現代的", "매우 전통적", "とても伝統的", { baseWeight: 1.25 }),
  scale("VL003", "values", "관계에서 각자의 독립성은 얼마나 중요한가요?", "関係の中で、お互いの自立はどのくらい重要ですか？", "많은 것을 함께", "多くを一緒に", "각자의 독립성 중시", "互いの自立を重視", { baseWeight: 1.25 }),
  {
    id: "SM001",
    module: "lifestyle",
    ko: "흡연을 하나요?",
    ja: "喫煙しますか？",
    type: "single",
    options: [o("NO", "하지 않아요", "吸わない"), o("OCCASIONAL", "가끔", "たまに"), o("E_CIGARETTE", "전자담배", "電子タバコ"), o("YES", "자주 해요", "よく吸う")],
    logic: "CATEGORY_MATCH",
    baseWeight: 1.2,
  },
  {
    id: "AL001",
    module: "lifestyle",
    ko: "술은 얼마나 자주 마시나요?",
    ja: "お酒はどのくらい飲みますか？",
    type: "single",
    options: [o("NEVER", "마시지 않아요", "飲まない"), o("MONTHLY", "월 1~2회", "月1〜2回"), o("WEEKLY", "주 1회", "週1回"), o("2_3_WEEK", "주 2~3회", "週2〜3回"), o("4_PLUS_WEEK", "주 4회 이상", "週4回以上")],
    logic: "CATEGORY_MATCH",
    baseWeight: 0.9,
  },
  scale("MR001", "future", "결혼에 대한 마음은 어느 정도인가요?", "結婚について、今どのくらい考えていますか？", "결혼 생각 없음", "結婚するつもりはない", "반드시 결혼하고 싶음", "必ず結婚したい", { dealbreaker: true, logic: "HARD_CONDITION", baseWeight: 1.8, showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM") }),
  {
    id: "MR002",
    module: "future",
    ko: "좋은 사람을 만난다면 언제쯤 결혼하고 싶나요?",
    ja: "良い相手に出会えたら、いつ頃結婚したいですか？",
    type: "single",
    options: [o("1_2_YEARS", "1~2년 안", "1〜2年以内"), o("3_5_YEARS", "3~5년 안", "3〜5年以内"), o("5_PLUS", "5년 이후", "5年以上先"), o("PARTNER_DEPENDENT", "상대와 상황에 따라", "相手と状況による"), o("UNSURE", "아직 모르겠어요", "まだ分からない")],
    logic: "RANGE_OVERLAP",
    baseWeight: 1.3,
    showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM"),
  },
  {
    id: "CH001",
    module: "children",
    ko: "미래에 자녀를 원하나요?",
    ja: "将来、子どもを望みますか？",
    type: "single",
    options: [o("DEFINITELY_YES", "반드시 원해요", "必ず欲しい"), o("PROBABLY_YES", "가능하면 원해요", "できれば欲しい"), o("UNSURE", "아직 모르겠어요", "まだ分からない"), o("PROBABLY_NO", "가능하면 원하지 않아요", "できれば欲しくない"), o("DEFINITELY_NO", "원하지 않아요", "欲しくない")],
    dealbreaker: true,
    logic: "HARD_CONDITION",
    baseWeight: 2,
    showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM"),
  },
  scale("CB003", "crossBorder", "장기적으로 한국에서 살 수 있나요?", "長期的に韓国で暮らせますか？", "절대 어려움", "絶対に難しい", "적극적으로 가능", "積極的に可能", { logic: "RANGE_OVERLAP", baseWeight: 1.4, showIf: (a) => !intentIs(a, "CASUAL", "SHORT_TERM") }),
  scale("CB004", "crossBorder", "장기적으로 일본에서 살 수 있나요?", "長期的に日本で暮らせますか？", "절대 어려움", "絶対に難しい", "적극적으로 가능", "積極的に可能", { logic: "RANGE_OVERLAP", baseWeight: 1.4, showIf: (a) => !intentIs(a, "CASUAL", "SHORT_TERM") }),
  {
    id: "CB005",
    module: "crossBorder",
    ko: "장기적으로 살고 싶은 곳은 어디인가요?",
    ja: "長期的に暮らしたい場所はどこですか？",
    type: "single",
    options: [o("KOREA", "한국", "韓国"), o("JAPAN", "일본", "日本"), o("BOTH", "한국·일본 모두", "韓国・日本どちらも"), o("THIRD_COUNTRY", "제3국", "第三国"), o("UNSURE", "아직 모르겠어요", "まだ分からない")],
    logic: "RANGE_OVERLAP",
    baseWeight: 1.4,
    showIf: (a) => !intentIs(a, "CASUAL"),
  },
  scale("CR001", "career", "내 삶에서 커리어는 얼마나 중요한가요?", "人生においてキャリアはどのくらい重要ですか？", "크게 중요하지 않음", "あまり重要ではない", "매우 중요", "とても重要", { baseWeight: 1, showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM", "SERIOUS_OPEN") }),
  scale("FN001", "finance", "돈을 사용하는 방식은 어느 쪽에 가깝나요?", "お金の使い方はどちらに近いですか？", "최대한 저축", "できるだけ貯蓄", "현재 경험에 적극 소비", "今の経験に使う", { sensitive: true, baseWeight: 1.2, showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM") }),
  scale("FM001", "family", "가족과 얼마나 가깝게 지내나요?", "家族とはどのくらい親しくしていますか？", "독립적으로 지냄", "独立している", "매우 가깝게 지냄", "とても親しい", { sensitive: true, baseWeight: 0.9, showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM") }),
  scale("FM003", "family", "가족이 한일 국제연애·결혼을 얼마나 수용할 것 같나요?", "家族は日韓国際恋愛・結婚をどのくらい受け入れそうですか？", "강하게 반대할 수 있음", "強く反対する可能性", "매우 긍정적", "とても前向き", { sensitive: true, baseWeight: 1.3, showIf: (a) => intentIs(a, "MARRIAGE", "LONG_TERM") }),
  {
    id: "DT001",
    module: "dating",
    ko: "이상적인 데이트 빈도는 어느 정도인가요?",
    ja: "理想のデート頻度はどのくらいですか？",
    type: "single",
    options: [o("DAILY", "거의 매일", "ほぼ毎日"), o("3_4_WEEK", "주 3~4회", "週3〜4回"), o("1_2_WEEK", "주 1~2회", "週1〜2回"), o("BIWEEKLY", "2주에 1회", "2週に1回"), o("FLEXIBLE", "상황에 따라", "状況による")],
    logic: "CATEGORY_MATCH",
    baseWeight: 1.3,
    showIf: (a) => intentIs(a, "SERIOUS_OPEN", "SHORT_TERM", "CASUAL", "UNSURE"),
  },
  {
    id: "DT002",
    module: "dating",
    ko: "처음 만나기 전, 어느 정도 대화하고 싶나요?",
    ja: "初めて会う前に、どのくらいやり取りしたいですか？",
    type: "single",
    options: [o("ASAP", "가능하면 빨리 만나기", "できるだけ早く会う"), o("FEW_DAYS", "며칠 정도", "数日程度"), o("1_2_WEEKS", "1~2주", "1〜2週間"), o("AFTER_KNOWING", "충분히 알고 난 뒤", "十分に知ってから")],
    logic: "CATEGORY_MATCH",
    baseWeight: 1,
    showIf: (a) => intentIs(a, "SERIOUS_OPEN", "SHORT_TERM", "CASUAL", "UNSURE"),
  },
  {
    id: "DT003",
    module: "dating",
    ko: "데이트 계획은 누가 세우면 좋나요?",
    ja: "デートの計画は誰が立てるのが理想ですか？",
    type: "single",
    options: [o("I_PLAN", "제가 주로 계획", "自分が主に計画"), o("PARTNER_PLAN", "상대가 주로 계획", "相手が主に計画"), o("TOGETHER", "함께 계획", "一緒に計画"), o("SPONTANEOUS", "즉흥적으로", "その場で決める")],
    logic: "COMPLEMENTARY",
    baseWeight: 1.2,
    showIf: (a) => intentIs(a, "SERIOUS_OPEN", "SHORT_TERM", "CASUAL", "UNSURE"),
  },
  scale("BD001", "boundaries", "연인이 이성 친구와 단둘이 만나는 것은 괜찮나요?", "恋人が異性の友人と二人で会うのは大丈夫ですか？", "받아들이기 어려움", "受け入れにくい", "전혀 문제없음", "全く問題ない", { baseWeight: 1.2, showIf: (a) => intentIs(a, "SERIOUS_OPEN", "SHORT_TERM", "CASUAL", "UNSURE") }),
  scale("BD002", "boundaries", "연인이 전 연인과 연락하는 것은 괜찮나요?", "恋人が元恋人と連絡を取るのは大丈夫ですか？", "받아들이기 어려움", "受け入れにくい", "전혀 문제없음", "全く問題ない", { baseWeight: 1.2, showIf: (a) => intentIs(a, "SERIOUS_OPEN", "SHORT_TERM", "CASUAL", "UNSURE") }),
  {
    id: "LG001",
    module: "language",
    ko: "한국어는 어느 정도 할 수 있나요?",
    ja: "韓国語はどのくらい話せますか？",
    type: "single",
    options: [o("0", "전혀 못해요", "全く話せない"), o("1", "기본 표현", "基本表現"), o("2", "간단한 대화", "簡単な会話"), o("3", "일상회화", "日常会話"), o("4", "업무·학업 가능", "仕事・学業で使用可能"), o("5", "원어민 수준", "ネイティブレベル")],
    logic: "INFORMATION_ONLY",
    baseWeight: 0.7,
  },
  {
    id: "LG002",
    module: "language",
    ko: "일본어는 어느 정도 할 수 있나요?",
    ja: "日本語はどのくらい話せますか？",
    type: "single",
    options: [o("0", "전혀 못해요", "全く話せない"), o("1", "기본 표현", "基本表現"), o("2", "간단한 대화", "簡単な会話"), o("3", "일상회화", "日常会話"), o("4", "업무·학업 가능", "仕事・学業で使用可能"), o("5", "원어민 수준", "ネイティブレベル")],
    logic: "INFORMATION_ONLY",
    baseWeight: 0.7,
  },
  scale("LG003", "language", "상대가 내 모국어를 잘하는 것이 얼마나 중요한가요?", "相手が自分の母語を話せることはどのくらい重要ですか？", "중요하지 않음", "重要ではない", "매우 중요", "とても重要", { logic: "ONE_WAY_FIT", baseWeight: 1.1 }),
  scale("LG004", "language", "상대방의 언어를 배울 의향이 있나요?", "相手の言語を学ぶ意欲はありますか？", "거의 없음", "ほとんどない", "적극적으로 배우고 싶음", "積極的に学びたい", { logic: "ONE_WAY_FIT", baseWeight: 1.2 }),
  {
    id: "LG005",
    module: "language",
    ko: "연애할 때 어떤 언어를 사용하고 싶나요?",
    ja: "交際中はどの言語を使いたいですか？",
    type: "single",
    options: [o("KOREAN", "한국어", "韓国語"), o("JAPANESE", "일본어", "日本語"), o("ENGLISH", "영어", "英語"), o("MIXED", "여러 언어를 섞어서", "複数の言語を混ぜて"), o("ANY", "어떤 언어든 괜찮아요", "どの言語でもいい")],
    logic: "RANGE_OVERLAP",
    baseWeight: 1,
  },
  scale("CM003", "communication", "답장 속도는 얼마나 중요한가요?", "返信の速さはどのくらい重要ですか？", "중요하지 않음", "重要ではない", "매우 중요", "とても重要", { baseWeight: 1 }),
  scale("CM005", "communication", "일상을 어느 정도 공유하고 싶나요?", "日常をどのくらい共有したいですか？", "중요한 일만", "大切なことだけ", "사소한 일까지", "些細なことまで", { baseWeight: 1.1 }),
  scale("CF001", "conflict", "갈등이 생기면 언제 이야기하고 싶나요?", "衝突が起きたら、いつ話したいですか？", "혼자 정리할 시간 필요", "一人で整理する時間が必要", "바로 이야기하고 싶음", "すぐに話したい", { baseWeight: 1.2 }),
  {
    id: "CF004",
    module: "conflict",
    ko: "제가 잘못했다고 생각하면 먼저 사과할 수 있어요.",
    ja: "自分が悪かったと思えば、先に謝ることができます。",
    type: "scale5",
    left: { ko: "전혀 그렇지 않다", ja: "全くそう思わない" },
    right: { ko: "매우 그렇다", ja: "とてもそう思う" },
    logic: "SIMILARITY",
    baseWeight: 1,
  },
  {
    id: "SM002",
    module: "lifestyle",
    ko: "상대방의 흡연은 어디까지 괜찮나요?",
    ja: "相手の喫煙はどこまで許容できますか？",
    type: "single",
    options: [o("ANY", "상관없어요", "気にしない"), o("OCCASIONAL_OK", "가끔이면 괜찮아요", "たまになら大丈夫"), o("NON_SMOKER_ONLY", "비흡연자만", "非喫煙者のみ")],
    dealbreaker: true,
    logic: "HARD_CONDITION",
    baseWeight: 1.5,
  },
  scale("LS005", "lifestyle", "운동은 얼마나 자주 하나요?", "運動はどのくらいしますか？", "거의 하지 않음", "ほとんどしない", "거의 매일", "ほぼ毎日", { baseWeight: 0.8 }),
  scale("LS008", "lifestyle", "여행을 얼마나 좋아하나요?", "旅行はどのくらい好きですか？", "집에 머무는 편", "家で過ごす方", "여행을 매우 좋아함", "旅行が大好き", { baseWeight: 0.8 }),
  scale("AF001", "affection", "말로 애정을 얼마나 자주 표현하나요?", "言葉で愛情をどのくらい表現しますか？", "거의 표현하지 않음", "ほとんど表現しない", "매우 자주 표현", "とてもよく表現", { logic: "ONE_WAY_FIT", baseWeight: 1 }),
  scale("AF002", "affection", "상대가 말로 애정을 얼마나 표현해주길 바라나요?", "相手に言葉でどのくらい愛情を表現してほしいですか？", "거의 필요 없음", "ほとんど必要ない", "많이 원함", "たくさん欲しい", { logic: "ONE_WAY_FIT", baseWeight: 1 }),
  scale("VL004", "values", "좋은 관계를 위해 어느 정도의 양보는 필요하다고 생각하나요?", "良い関係のために、ある程度の譲歩は必要だと思いますか？", "각자의 기준이 우선", "自分の基準を優先", "서로 많이 양보할 수 있음", "お互いに譲歩できる", { baseWeight: 1 }),
  {
    id: "RG001",
    module: "religion",
    ko: "종교가 있나요?",
    ja: "宗教はありますか？",
    type: "single",
    options: [o("NONE", "없음", "なし"), o("BUDDHIST", "불교", "仏教"), o("PROTESTANT", "개신교", "プロテスタント"), o("CATHOLIC", "천주교", "カトリック"), o("SHINTO", "신토", "神道"), o("OTHER", "기타", "その他"), o("PREFER_NOT_TO_SAY", "답변하지 않기", "回答しない")],
    sensitive: true,
    logic: "CATEGORY_MATCH",
    baseWeight: 0.6,
  },
  scale("MR003", "future", "결혼 전 동거에 대해 어떻게 생각하나요?", "結婚前の同棲についてどう思いますか？", "원하지 않음", "望まない", "꼭 해보고 싶음", "ぜひ経験したい", { baseWeight: 0.8, showIf: (a) => Number(a.MR001 ?? 0) >= 4 }),
  scale("CH003", "children", "육아는 얼마나 동등하게 나누어야 한다고 생각하나요?", "育児はどのくらい平等に分担すべきだと思いますか？", "한쪽이 주로 담당해도 됨", "片方が主に担当してもいい", "최대한 동등하게", "できるだけ平等に", { baseWeight: 1, showIf: (a) => ["DEFINITELY_YES", "PROBABLY_YES", "UNSURE"].includes(String(a.CH001 ?? "")) }),
  scale("CH005", "children", "자녀가 한국어와 일본어를 모두 배우는 것이 중요할까요?", "子どもが韓国語と日本語の両方を学ぶことは重要ですか？", "중요하지 않음", "重要ではない", "매우 중요", "とても重要", { baseWeight: 1.1, showIf: (a) => ["DEFINITELY_YES", "PROBABLY_YES", "UNSURE"].includes(String(a.CH001 ?? "")) }),
  scale("CB007", "crossBorder", "진지한 관계라면 상대를 위해 다른 나라로 이주할 수 있나요?", "真剣な関係なら、相手のために別の国へ移住できますか？", "절대 어려움", "絶対に難しい", "적극적으로 가능", "積極的に可能", { logic: "RANGE_OVERLAP", baseWeight: 1.4, showIf: (a) => !intentIs(a, "CASUAL") }),
];

const byId = new Map(questions.map((question) => [question.id, question]));

const phaseOne = ["R001", "R002", "CB001", "CB002"];
const core = ["CM001", "CM002", "LS001", "LS002", "LS003", "LS004", "PS001", "PS002", "VL001", "VL003", "SM001", "AL001"];
const marriage = ["MR001", "MR002", "CH001", "CB003", "CB004", "CB005", "CR001", "FN001", "FM001", "FM003"];
const longTerm = ["MR001", "CH001", "CB003", "CB004", "CB005", "CR001", "FN001", "FM003", "AF001", "AF002"];
const seriousOpen = ["DT001", "DT002", "CB003", "CB004", "CB005", "CR001", "AF001", "AF002", "BD001", "BD002"];
const casual = ["DT001", "DT002", "DT003", "BD001", "BD002", "AF001", "AF002"];
const detail = ["LG001", "LG002", "LG003", "LG004", "LG005", "CM003", "CM005", "CF001", "CF004", "SM002", "LS005", "LS008", "VL004", "RG001", "MR003", "CH003", "CH005", "CB007"];

export function getQuestionFlow(answers: Answers): QuestionDefinition[] {
  const intent = String(answers.R001 ?? "UNSURE");
  const dynamic = intent === "MARRIAGE"
    ? marriage
    : intent === "LONG_TERM"
      ? longTerm
      : intent === "SERIOUS_OPEN"
        ? seriousOpen
        : casual;
  const ordered = [...phaseOne, ...core, ...dynamic, ...detail];
  const seen = new Set<string>();

  return ordered
    .map((id) => byId.get(id))
    .filter((question): question is QuestionDefinition => Boolean(question))
    .filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return question.showIf ? question.showIf(answers) : true;
    })
    .slice(0, 32);
}

export const questionMap = byId;

export const moduleLabels: Record<QuestionModule, { ko: string; ja: string }> = {
  intent: { ko: "관계 목적", ja: "交際目的" },
  crossBorder: { ko: "한일 생활", ja: "日韓生活" },
  language: { ko: "언어", ja: "言語" },
  future: { ko: "미래 계획", ja: "将来設計" },
  children: { ko: "자녀", ja: "子ども" },
  communication: { ko: "소통", ja: "コミュニケーション" },
  conflict: { ko: "갈등 해결", ja: "衝突解決" },
  affection: { ko: "애정 표현", ja: "愛情表現" },
  boundaries: { ko: "관계 경계", ja: "境界線" },
  lifestyle: { ko: "라이프스타일", ja: "ライフスタイル" },
  personality: { ko: "성향", ja: "性格" },
  career: { ko: "커리어", ja: "キャリア" },
  finance: { ko: "재정", ja: "お金" },
  family: { ko: "가족", ja: "家族" },
  values: { ko: "가치관", ja: "価値観" },
  religion: { ko: "종교", ja: "宗教" },
  dating: { ko: "데이트 스타일", ja: "デートスタイル" },
};

export function answerLabel(question: QuestionDefinition, value: AnswerValue, locale: Locale) {
  if (typeof value === "number") return String(value);
  return question.options?.find((option) => option.value === value)?.[locale] ?? value;
}
