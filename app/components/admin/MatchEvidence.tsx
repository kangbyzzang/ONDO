import { answerLabel, moduleLabels, questionMap } from "../../data/questions";
import {
  confidenceLabels,
  profileCompletion,
  tierLabels,
  type MatchProfile,
  type MatchResult,
} from "../../lib/matching";
import { MatchDmComposer } from "./MatchDmComposer";

function profileValue(profile: MatchProfile, id: string) {
  const question = questionMap.get(id);
  const value = profile.answers[id];
  if (!question || value === undefined) return "미입력";
  return answerLabel(question, value, "ko");
}

export function MatchEvidence({ selected, candidate, result }: { selected: MatchProfile; candidate: MatchProfile; result: MatchResult }) {
  const strongest = result.questionDetails.filter((detail) => detail.score >= 80).slice(0, 5);
  const differences = [...result.questionDetails].sort((left, right) => left.score - right.score).slice(0, 5);
  const evidence = [...differences, ...strongest].filter((detail, index, items) => items.findIndex((item) => item.id === detail.id) === index);

  return (
    <div className="match-evidence">
      <div className="match-score-hero">
        <div><small>FINAL COMPATIBILITY</small><strong>{result.overall}<em>%</em></strong><span className={result.eligible ? "eligible" : "excluded"}>{tierLabels[result.tier]}</span></div>
        <dl>
          <div><dt>추천 가능</dt><dd>{result.eligible ? "가능" : "제외"}</dd></div>
          <div><dt>공통 답변</dt><dd>{result.sharedAnswers}개</dd></div>
          <div><dt>신뢰도</dt><dd>{confidenceLabels[result.confidence]}</dd></div>
          <div><dt>국경 실행력</dt><dd>{result.crossBorderFeasibility ? `${result.crossBorderFeasibility.score}%` : "동일 국가·해당 없음"}</dd></div>
        </dl>
      </div>

      <MatchDmComposer recipient={selected} candidate={candidate} result={result} />

      <div className="pair-profile-grid">
        {[selected, candidate].map((profile, index) => (
          <article key={profile.id}>
            <small>{index === 0 ? "기준 사용자" : "비교 후보"}</small>
            <h4>{profile.name ?? profile.instagram.replace("@", "")}</h4>
            <p>{profile.instagram}</p>
            <dl>
              <div><dt>성별</dt><dd>{profileValue(profile, "BIO001")}</dd></div>
              <div><dt>선호 상대</dt><dd>{profileValue(profile, "BIO002")}</dd></div>
              <div><dt>만 나이</dt><dd>{profileValue(profile, "BIO004")}</dd></div>
              <div><dt>선호 나이 방향</dt><dd>{profileValue(profile, "AGE002")}</dd></div>
              <div><dt>허용 나이 차이</dt><dd>{profileValue(profile, "AGE001")}</dd></div>
              <div><dt>관계 목적</dt><dd>{profileValue(profile, "R001")}</dd></div>
              <div><dt>거주 국가</dt><dd>{profileValue(profile, "CB001")}</dd></div>
              <div><dt>프로필 완성도</dt><dd>{profileCompletion(profile)}%</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <section className="evidence-section">
        <div className="section-heading"><div><small>HARD CHECKS</small><h3>절대조건 판정</h3></div><p>충돌 1개 이상이면 추천 제외</p></div>
        <div className="hard-check-grid">
          {result.hardChecks.map((check) => (
            <article className={check.status} key={check.id}>
              <span>{check.status === "pass" ? "✓" : check.status === "conflict" ? "!" : "?"}</span>
              <div><strong>{check.label}</strong><p>{check.detail}</p></div>
              <em>{check.status === "pass" ? "통과" : check.status === "conflict" ? "충돌" : "정보 부족"}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="evidence-section">
        <div className="section-heading"><div><small>MODULE SCORES</small><h3>모듈별 적합도</h3></div><p>실제 공통 답변 기준</p></div>
        <div className="module-detail-grid">
          {result.modules.map((module) => (
            <div key={module.module}><span>{moduleLabels[module.module].ko}<small>{module.shared}개</small></span><i><b style={{ width: `${module.score}%` }} /></i><strong>{module.score}</strong></div>
          ))}
        </div>
      </section>

      {result.crossBorderFeasibility ? (
        <section className="evidence-section">
          <div className="section-heading"><div><small>CROSS-BORDER</small><h3>국경 간 실행력</h3></div><b>{result.crossBorderFeasibility.score}%</b></div>
          <div className="factor-grid">{result.crossBorderFeasibility.factors.map((factor) => <div key={factor.label}><span>{factor.label}</span><strong>{factor.score}%</strong></div>)}</div>
        </section>
      ) : null}

      <section className="evidence-section">
        <div className="section-heading"><div><small>QUESTION EVIDENCE</small><h3>문항별 계산 근거</h3></div><p>차이가 큰 문항과 강점을 함께 표시</p></div>
        <div className="evidence-table-wrap">
          <table className="evidence-table">
            <thead><tr><th>문항</th><th>{selected.name ?? selected.instagram}</th><th>{candidate.name ?? candidate.instagram}</th><th>로직</th><th>가중치</th><th>점수</th></tr></thead>
            <tbody>
              {evidence.map((detail) => (
                <tr key={detail.id}>
                  <th>{detail.label}<small>{moduleLabels[detail.module].ko}</small></th>
                  <td>{detail.answerA}</td><td>{detail.answerB}</td><td><code>{detail.logic}</code></td><td>×{detail.weight}</td><td><strong className={detail.score >= 80 ? "high" : detail.score < 60 ? "low" : ""}>{detail.score}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
