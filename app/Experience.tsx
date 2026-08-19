"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { AlgorithmPanel } from "./components/admin/AlgorithmPanel";
import { MatchEvidence } from "./components/admin/MatchEvidence";
import {
  type AnswerValue,
  type Answers,
  type Locale,
  answerLabel,
  getQuestionFlow,
  moduleLabels,
  questionMap,
} from "./data/questions";
import {
  type MatchProfile,
  calculateMatch,
  confidenceLabels,
  profileCompletion,
  profileSignals,
  tierLabels,
} from "./lib/matching";
import {
  listSubmissionsForAdmin,
  saveSubmission,
  signInAdmin,
  signOutAdmin,
} from "./lib/firebase-submissions";
import {
  ADMIN_EMAIL,
  firebaseAuth,
  initializeAuthSession,
  initializeFirebaseAnalytics,
} from "./lib/firebase";

type Stage = "welcome" | "questions" | "complete";
type Gender = "WOMAN" | "MAN" | "NON_BINARY";
type GenderPreference = "WOMAN" | "MAN" | "ANY";

const copy = {
  ko: {
    eyebrow: "KOREA × JAPAN, SERIOUSLY",
    headlineA: "잘 맞는 사람은,",
    headlineB: "대화 전에도 보이는 게 있어요.",
    body: "당신이 원하는 관계와 생활의 온도를 차분히 알아보고, 서로에게 좋은 사람이 될 가능성을 섬세하게 분석해요.",
    instagram: "먼저 인스타그램 아이디를 알려주세요",
    gender: "나의 성별",
    preferredGender: "만나고 싶은 상대",
    genderRequired: "성별과 만나고 싶은 상대를 선택해주세요.",
    placeholder: "your.instagram",
    start: "나의 관계 온도 알아보기",
    privacy: "아이디는 운영팀 확인용이며 공개 프로필에 바로 노출되지 않아요.",
    minutes: "약 6분",
    questions: "30–40문항",
    adaptive: "맞춤형 질문",
    admin: "관리자 분석 화면 보기",
    next: "다음 질문",
    back: "이전",
    skip: "답변하지 않기",
    importance: "이 조건은 얼마나 중요한가요?",
    importanceHint: "절대 조건으로 선택하면 맞지 않는 상대는 추천에서 제외돼요.",
    save: "프로필 저장하기",
    saving: "분석하고 있어요…",
    completeTitle: "설문이 완료되었어요.",
    completeBody: "답변이 안전하게 저장되었고 관리자 매칭 분석에 반영됩니다.",
    completeStatus: "응답 저장 완료",
    retryStatus: "저장 확인 필요",
    retryBody: "설문은 완료되었지만 저장 상태를 확인하지 못했어요. 처음 화면으로 돌아가 다시 제출해주세요.",
    restart: "처음 화면으로",
  },
  ja: {
    eyebrow: "KOREA × JAPAN, SERIOUSLY",
    headlineA: "相性の良さは、",
    headlineB: "話す前から見えることがあります。",
    body: "あなたが望む関係と暮らしの温度を知り、お互いに良いパートナーになれる可能性を丁寧に分析します。",
    instagram: "まずInstagramのIDを教えてください",
    gender: "私の性別",
    preferredGender: "出会いたい相手",
    genderRequired: "性別と出会いたい相手を選択してください。",
    placeholder: "your.instagram",
    start: "私の関係温度を知る",
    privacy: "IDは運営チームの確認用で、公開プロフィールにはすぐ表示されません。",
    minutes: "約6分",
    questions: "30〜40問",
    adaptive: "適応型質問",
    admin: "管理者分析画面を見る",
    next: "次の質問",
    back: "戻る",
    skip: "回答しない",
    importance: "この条件はどのくらい重要ですか？",
    importanceHint: "絶対条件にすると、合わない相手は推薦から除外されます。",
    save: "プロフィールを保存",
    saving: "分析しています…",
    completeTitle: "アンケートが完了しました。",
    completeBody: "回答は安全に保存され、管理者のマッチング分析に反映されます。",
    completeStatus: "回答を保存しました",
    retryStatus: "保存状態の確認が必要です",
    retryBody: "アンケートは完了しましたが、保存状態を確認できませんでした。最初の画面に戻って、もう一度送信してください。",
    restart: "最初の画面へ",
  },
};

const importanceOptions = [
  { value: 1, ko: "별로 중요하지 않음", ja: "あまり重要ではない" },
  { value: 2, ko: "어느 정도 중요", ja: "ある程度重要" },
  { value: 3, ko: "매우 중요", ja: "とても重要" },
  { value: 4, ko: "절대 조건", ja: "絶対条件" },
];

const genderOptions: { value: Gender; ko: string; ja: string }[] = [
  { value: "WOMAN", ko: "여성", ja: "女性" },
  { value: "MAN", ko: "남성", ja: "男性" },
  { value: "NON_BINARY", ko: "기타", ja: "その他" },
];

const preferenceOptions: { value: GenderPreference; ko: string; ja: string }[] = [
  { value: "WOMAN", ko: "여성", ja: "女性" },
  { value: "MAN", ko: "남성", ja: "男性" },
  { value: "ANY", ko: "성별 무관", ja: "性別不問" },
];

function Logo() {
  return (
    <Link className="brand" href="/" aria-label="온도 홈">
      <span className="brand-mark"><i /><i /></span>
      <span>온도</span>
      <small>ONDO</small>
    </Link>
  );
}

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <Logo />
      <nav>
        <a className="active" href="#dashboard"><span>⌂</span>대시보드</a>
        <a href="#people"><span>◎</span>참여자</a>
        <a href="#matches"><span>↔</span>매칭 분석</a>
        <a href="#questions"><span>?</span>질문 응답</a>
        <a href="#algorithm"><span>⌘</span>현재 알고리즘</a>
      </nav>
      <div className="admin-sidebar-foot">
        <small>ADMIN MODE</small>
        <strong>온도 운영팀</strong>
        <Link href="/">사용자 화면으로 →</Link>
      </div>
    </aside>
  );
}

function LanguageToggle({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  return (
    <div className="language-toggle" aria-label="언어 선택">
      <button className={locale === "ko" ? "active" : ""} onClick={() => onChange("ko")} type="button">KO</button>
      <button className={locale === "ja" ? "active" : ""} onClick={() => onChange("ja")} type="button">JA</button>
    </div>
  );
}

function Landing({
  locale,
  instagram,
  gender,
  preferredGender,
  error,
  onInstagram,
  onGender,
  onPreferredGender,
  onStart,
}: {
  locale: Locale;
  instagram: string;
  gender: Gender | "";
  preferredGender: GenderPreference | "";
  error: string;
  onInstagram: (value: string) => void;
  onGender: (value: Gender) => void;
  onPreferredGender: (value: GenderPreference) => void;
  onStart: () => void;
}) {
  const t = copy[locale];
  return (
    <main className="landing page-shell">
      <section className="hero-copy">
        <div className="eyebrow"><span>●</span>{t.eyebrow}</div>
        <h1>{t.headlineA}<br /><em>{t.headlineB}</em></h1>
        <p className="hero-body">{t.body}</p>

        <form className="instagram-card" onSubmit={(event) => { event.preventDefault(); onStart(); }}>
          <label htmlFor="instagram">{t.instagram}</label>
          <div className={`instagram-input ${error ? "invalid" : ""}`}>
            <span>@</span>
            <input
              id="instagram"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={instagram.replace(/^@/, "")}
              onChange={(event) => onInstagram(event.target.value)}
              placeholder={t.placeholder}
              aria-describedby="instagram-note"
            />
          </div>
          <div className="identity-fields">
            <fieldset>
              <legend>{t.gender}</legend>
              <div className="identity-options">
                {genderOptions.map((option) => (
                  <button className={gender === option.value ? "selected" : ""} key={option.value} onClick={() => onGender(option.value)} type="button">
                    {option[locale]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{t.preferredGender}</legend>
              <div className="identity-options">
                {preferenceOptions.map((option) => (
                  <button className={preferredGender === option.value ? "selected" : ""} key={option.value} onClick={() => onPreferredGender(option.value)} type="button">
                    {option[locale]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit">{t.start}<span>↗</span></button>
          <p id="instagram-note" className="privacy-note"><span>⌁</span>{t.privacy}</p>
        </form>

        <Link className="admin-link" href="/admin">{t.admin}<span>→</span></Link>
      </section>
    </main>
  );
}

function QuestionScreen({
  locale,
  answers,
  importance,
  currentIndex,
  onAnswer,
  onImportance,
  onBack,
  onNext,
  onSkip,
  submitting,
}: {
  locale: Locale;
  answers: Answers;
  importance: Record<string, number>;
  currentIndex: number;
  onAnswer: (id: string, value: AnswerValue) => void;
  onImportance: (id: string, value: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  submitting: boolean;
}) {
  const flow = getQuestionFlow(answers);
  const safeIndex = Math.min(currentIndex, flow.length - 1);
  const question = flow[safeIndex];
  const value = answers[question.id];
  const progress = Math.round(((safeIndex + 1) / flow.length) * 100);
  const t = copy[locale];
  const isLast = safeIndex === flow.length - 1;

  return (
    <main className="question-page">
      <div className="question-shell">
        <div className="question-topline">
          <button className="icon-button" onClick={onBack} type="button" aria-label={t.back}>←</button>
          <div className="progress-meta"><strong>{String(safeIndex + 1).padStart(2, "0")}</strong><span>/ {flow.length}</span></div>
          <span className="module-chip">{moduleLabels[question.module][locale]}</span>
        </div>
        <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>

        <section className="question-card">
          <div className="question-number">Q{String(safeIndex + 1).padStart(2, "0")}</div>
          <h1>{question[locale]}</h1>
          {question.sensitive && <p className="sensitive-note">⌁ {locale === "ko" ? "이 답변은 알고리즘에만 사용되며 상대에게 공개되지 않아요." : "この回答はアルゴリズムにのみ使用され、相手には公開されません。"}</p>}

          {question.type === "single" ? (
            <div className="option-list">
              {question.options?.map((option, index) => (
                <button
                  className={`option-button ${value === option.value ? "selected" : ""}`}
                  key={option.value}
                  type="button"
                  onClick={() => onAnswer(question.id, option.value)}
                >
                  <span className="option-index">{String.fromCharCode(65 + index)}</span>
                  <span>{option[locale]}</span>
                  <i>{value === option.value ? "✓" : ""}</i>
                </button>
              ))}
            </div>
          ) : (
            <div className="scale-wrap">
              <div className="scale-labels"><span>{question.left?.[locale]}</span><span>{question.right?.[locale]}</span></div>
              <div className={`scale-grid ${question.type === "scale5" ? "five" : ""}`}>
                {Array.from({ length: question.type === "scale5" ? 5 : 10 }, (_, index) => index + 1).map((number) => (
                  <button
                    className={value === number ? "selected" : ""}
                    key={number}
                    type="button"
                    onClick={() => onAnswer(question.id, number)}
                    aria-label={`${number}점`}
                  >{number}</button>
                ))}
              </div>
            </div>
          )}

          {question.dealbreaker && value !== undefined && (
            <div className="importance-box">
              <div><strong>{t.importance}</strong><p>{t.importanceHint}</p></div>
              <div className="importance-options">
                {importanceOptions.map((option) => (
                  <button
                    className={importance[question.id] === option.value ? "selected" : ""}
                    key={option.value}
                    onClick={() => onImportance(question.id, option.value)}
                    type="button"
                  ><span>{option.value}</span>{option[locale]}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="question-actions">
          {question.sensitive ? <button className="skip-button" onClick={onSkip} type="button">{t.skip}</button> : <span />}
          <button className="primary-button compact" disabled={value === undefined || submitting} onClick={onNext} type="button">
            {submitting ? t.saving : isLast ? t.save : t.next}<span>→</span>
          </button>
        </div>
      </div>
    </main>
  );
}

function CompleteScreen({ locale, saved, onRestart }: { locale: Locale; saved: boolean; onRestart: () => void }) {
  const t = copy[locale];

  return (
    <main className="complete-page">
      <section className="complete-card">
        <div className={`completion-check ${saved ? "saved" : "pending"}`} aria-hidden="true">
          <span>{saved ? "✓" : "!"}</span>
        </div>
        <div className="complete-copy">
          <div className="eyebrow"><span>●</span>SURVEY COMPLETE</div>
          <h1>{t.completeTitle}</h1>
          <p>{saved ? t.completeBody : t.retryBody}</p>
          <div className={`completion-status ${saved ? "saved" : "pending"}`} role="status">
            <span>{saved ? "✓" : "!"}</span>
            <strong>{saved ? t.completeStatus : t.retryStatus}</strong>
          </div>
          <button className="primary-button" onClick={onRestart} type="button">{t.restart}<span>→</span></button>
        </div>
      </section>
    </main>
  );
}

export function UserExperience() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [stage, setStage] = useState<Stage>("welcome");
  const [instagram, setInstagram] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [preferredGender, setPreferredGender] = useState<GenderPreference | "">("");
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [importance, setImportance] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  const start = () => {
    const clean = instagram.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9._]{2,30}$/.test(clean)) {
      setError(locale === "ko" ? "인스타그램 아이디를 확인해주세요." : "Instagram IDを確認してください。");
      return;
    }
    if (!gender || !preferredGender) {
      setError(copy[locale].genderRequired);
      return;
    }
    setInstagram(`@${clean}`);
    setAnswers((current) => ({ ...current, BIO001: gender, BIO002: preferredGender }));
    setError("");
    setStage("questions");
  };

  const finish = async () => {
    setSubmitting(true);
    const flow = getQuestionFlow(answers);
    const answered = flow.filter((question) => answers[question.id] !== undefined).length;
    const completion = Math.round((answered / flow.length) * 100);
    try {
      await saveSubmission({ instagram, locale, answers, importance, completion });
      setSaved(true);
    } catch {
      setSaved(false);
    } finally {
      setSubmitting(false);
      setStage("complete");
    }
  };

  const next = () => {
    const flow = getQuestionFlow(answers);
    if (currentIndex >= flow.length - 1) {
      void finish();
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const skip = () => {
    const flow = getQuestionFlow(answers);
    const question = flow[Math.min(currentIndex, flow.length - 1)];
    setAnswers((current) => {
      const nextAnswers = { ...current };
      delete nextAnswers[question.id];
      return nextAnswers;
    });
    next();
  };

  return (
    <div className="site-frame">
      <header className="site-header">
        <Logo />
        <LanguageToggle locale={locale} onChange={setLocale} />
      </header>
      {stage === "welcome" && (
        <Landing
          locale={locale}
          instagram={instagram}
          gender={gender}
          preferredGender={preferredGender}
          error={error}
          onInstagram={(value) => { setInstagram(value); setError(""); }}
          onGender={(value) => { setGender(value); setError(""); }}
          onPreferredGender={(value) => { setPreferredGender(value); setError(""); }}
          onStart={start}
        />
      )}
      {stage === "questions" && (
        <QuestionScreen
          locale={locale}
          answers={answers}
          importance={importance}
          currentIndex={currentIndex}
          onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
          onImportance={(id, value) => setImportance((current) => ({ ...current, [id]: value }))}
          onBack={() => currentIndex === 0 ? setStage("welcome") : setCurrentIndex((index) => index - 1)}
          onNext={next}
          onSkip={skip}
          submitting={submitting}
        />
      )}
      {stage === "complete" && <CompleteScreen locale={locale} saved={saved} onRestart={() => { setAnswers({}); setImportance({}); setCurrentIndex(0); setStage("welcome"); }} />}
    </div>
  );
}

function countryLabel(value: unknown) {
  return value === "KOREA" ? "한국" : value === "JAPAN" ? "일본" : "기타";
}

function intentLabel(value: unknown) {
  const labels: Record<string, string> = { MARRIAGE: "결혼 전제", LONG_TERM: "장기 연애", SERIOUS_OPEN: "진지한 만남", SHORT_TERM: "단기 연애", CASUAL: "가벼운 만남", UNSURE: "탐색 중" };
  return labels[String(value)] ?? "탐색 중";
}

function genderLabel(value: unknown) {
  const labels: Record<string, string> = { WOMAN: "여성", MAN: "남성", NON_BINARY: "기타" };
  return labels[String(value)] ?? "미입력";
}

export function AdminExperience() {
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [matchTargetId, setMatchTargetId] = useState("");
  const [query, setQuery] = useState("");
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profilesReady, setProfilesReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    void initializeAuthSession().then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (!active) return;
        const allowedUser = user?.email === ADMIN_EMAIL ? user : null;
        setAdminUser(allowedUser);
        setAuthReady(true);
        if (!allowedUser) {
          setProfilesReady(false);
          return;
        }

        setProfilesReady(false);
        void listSubmissionsForAdmin()
          .then((real) => {
            if (!active) return;
            setProfiles(real);
            setSelectedId(real[0]?.id ?? "");
          })
          .catch((error: unknown) => {
            if (!active) return;
            setAuthError(error instanceof Error ? error.message : "응답을 불러오지 못했습니다.");
          })
          .finally(() => {
            if (active) setProfilesReady(true);
          });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      setAuthReady(true);
      setAuthError(error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다.");
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleAdminSignIn = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      setAdminUser(await signInAdmin());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authReady || !adminUser) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <Logo />
          <div className="admin-login-mark"><span>ON</span></div>
          <small>PRIVATE ADMIN</small>
          <h1>{authReady ? "관리자 로그인이 필요해요." : "로그인 상태를 확인하고 있어요."}</h1>
          <p>설문 응답과 매칭 분석은 지정된 운영자 계정으로만 볼 수 있습니다.</p>
          {authError && <p className="admin-login-error" role="alert">{authError}</p>}
          <button className="primary-button" disabled={!authReady || authBusy} onClick={() => void handleAdminSignIn()} type="button">
            {authBusy ? "로그인 중…" : "Google로 관리자 로그인"}<span>→</span>
          </button>
          <em>{ADMIN_EMAIL}</em>
          <Link href="/">← 사용자 설문으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  if (!profilesReady || profiles.length === 0) {
    return (
      <div className="admin-app">
        <AdminSidebar />
        <main className="admin-main" id="dashboard">
          <header className="admin-header">
            <div><p>ONDO ADMIN · LIVE</p><h1>매칭 운영 대시보드</h1></div>
            <button className="admin-avatar" onClick={() => void signOutAdmin()} title="관리자 로그아웃" type="button">ON</button>
          </header>
          <section className="admin-empty-state">
            <span>{profilesReady ? "0" : "…"}</span>
            <div><small>{profilesReady ? "NO SUBMISSIONS" : "LOADING"}</small><h2>{profilesReady ? "아직 저장된 실제 응답이 없어요." : "실제 응답을 불러오고 있어요."}</h2><p>{profilesReady ? "설문이 제출되면 이곳에 참여자와 상세 매칭 분석이 표시됩니다. 샘플 프로필은 실제 추천에 섞이지 않습니다." : "Firebase의 보호된 응답 데이터를 확인하고 있습니다."}</p></div>
          </section>
          <AlgorithmPanel />
        </main>
      </div>
    );
  }

  const filteredProfiles = profiles.filter((profile) => `${profile.name ?? ""} ${profile.instagram}`.toLowerCase().includes(query.toLowerCase()));
  const selected = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
  const candidates = profiles
    .filter((profile) => profile.id !== selected.id)
    .map((profile) => ({ profile, result: calculateMatch(selected, profile) }))
    .sort((left, right) => Number(right.result.eligible) - Number(left.result.eligible) || right.result.overall - left.result.overall);
  const topMatch = candidates.find((candidate) => candidate.profile.id === matchTargetId)
    ?? candidates.find((candidate) => candidate.result.eligible)
    ?? candidates[0];
  const completionAverage = Math.round(profiles.reduce((sum, profile) => sum + profileCompletion(profile), 0) / profiles.length);
  const absoluteCount = Object.values(selected.importance ?? {}).filter((value) => value === 4).length;

  return (
    <div className="admin-app">
      <AdminSidebar />

      <main className="admin-main" id="dashboard">
        <header className="admin-header">
          <div><p>2026. 08. 18 · TUESDAY</p><h1>좋은 인연의 가능성을 살펴볼게요.</h1></div>
          <button className="admin-avatar" onClick={() => void signOutAdmin()} title="관리자 로그아웃" type="button">ON</button>
        </header>

        <section className="stat-grid">
          <article className="stat-card warm"><span>전체 참여자</span><strong>{profiles.length}<small>명</small></strong><em>Firebase 실제 응답만 집계</em></article>
          <article className="stat-card mint"><span>평균 프로필 완성도</span><strong>{completionAverage}<small>%</small></strong><em>권장 기준 50% 이상</em></article>
          <article className="stat-card ink"><span>활성 매칭 후보</span><strong>{candidates.filter((item) => item.result.eligible).length}<small>쌍</small></strong><em>절대 조건 검증 완료</em></article>
        </section>

        <div className="admin-grid">
          <section className="people-panel" id="people">
            <div className="panel-title"><div><small>PARTICIPANTS</small><h2>참여자</h2></div><span>{filteredProfiles.length}</span></div>
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="아이디 검색" /></label>
            <div className="people-list">
              {filteredProfiles.map((profile) => {
                const active = profile.id === selected.id;
                return (
                  <button className={`person-row ${active ? "active" : ""}`} key={profile.id} onClick={() => setSelectedId(profile.id)} type="button">
                    <span className="person-avatar">{(profile.name ?? profile.instagram.replace("@", "")).slice(0, 1).toUpperCase()}</span>
                    <span><strong>{profile.name ?? profile.instagram}</strong><small>{profile.instagram}</small></span>
                    <span className="person-meta"><b>{profileCompletion(profile)}%</b><small>{genderLabel(profile.answers.BIO001)} · {countryLabel(profile.answers.CB001)}</small></span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-heading">
              <div className="profile-avatar">{(selected.name ?? selected.instagram).slice(0, 1)}</div>
              <div><small>SELECTED PROFILE</small><h2>{selected.name ?? selected.instagram.replace("@", "")}</h2><p>{selected.instagram} · {genderLabel(selected.answers.BIO001)} · {countryLabel(selected.answers.CB001)}</p></div>
              <span className="intent-badge">{intentLabel(selected.answers.R001)}</span>
            </div>

            <div className="profile-progress"><span><b>프로필 정밀도</b><em>{profileCompletion(selected)}%</em></span><i><b style={{ width: `${profileCompletion(selected)}%` }} /></i><small>공통 핵심 응답 {Object.keys(selected.answers).length}개</small></div>

            <div className="signal-grid">
              {profileSignals(selected).map((signal) => (
                <article key={signal.label}><div className="signal-ring" style={{ "--value": `${signal.value * 3.6}deg` } as React.CSSProperties}><span>{signal.value}</span></div><div><strong>{signal.label}</strong><small>{signal.note}</small></div></article>
              ))}
            </div>

            <div className="condition-box">
              <div><span>!</span><div><strong>절대 조건 {absoluteCount}개 설정</strong><small>관계 목적·자녀·흡연·장거리 조건을 우선 검증해요.</small></div></div>
              <button type="button">조건 보기</button>
            </div>

            <section className="answer-section" id="questions">
              <div className="section-heading"><div><small>CORE ANSWERS</small><h3>핵심 응답 요약</h3></div><button type="button">전체 보기 →</button></div>
              <div className="answer-grid">
                {["BIO001", "BIO002", "R001", "R002", "CB002", "CH001"].map((id) => {
                  const question = questionMap.get(id);
                  const value = selected.answers[id];
                  if (!question || value === undefined) return null;
                  return <div key={id}><small>{question.ko}</small><strong>{answerLabel(question, value, "ko")}</strong><span className={question.sensitive ? "private" : "match"}>{question.sensitive ? "PRIVATE" : "MATCH ONLY"}</span></div>;
                })}
              </div>
            </section>
          </section>

          <section className="match-panel" id="matches">
            <div className="panel-title"><div><small>COMPATIBILITY</small><h2>추천 후보</h2></div><span>LIVE</span></div>
            <div className="candidate-list">
              {candidates.slice(0, 6).map(({ profile, result }, index) => (
                <button className={`${!result.eligible ? "excluded" : ""} ${topMatch?.profile.id === profile.id ? "selected" : ""}`} key={profile.id} onClick={() => setMatchTargetId(profile.id)} type="button">
                  <div className="candidate-rank">0{index + 1}</div>
                  <div className="candidate-avatar">{(profile.name ?? profile.instagram).slice(0, 1)}</div>
                  <div className="candidate-copy"><strong>{profile.name ?? profile.instagram.replace("@", "")}</strong><small>{countryLabel(profile.answers.CB001)} · {tierLabels[result.tier]} · 공통 {result.sharedAnswers}개</small></div>
                  <div className="candidate-score"><strong>{result.overall}<small>%</small></strong><span>{result.eligible ? `신뢰도 ${confidenceLabels[result.confidence]}` : "추천 제외"}</span></div>
                </button>
              ))}
            </div>

            {topMatch ? <MatchEvidence selected={selected} candidate={topMatch.profile} result={topMatch.result} /> : <div className="no-candidate"><strong>비교할 후보가 없습니다.</strong><p>최소 두 명의 실제 응답이 필요합니다.</p></div>}
          </section>
        </div>
        <AlgorithmPanel />
      </main>
    </div>
  );
}
