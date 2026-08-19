"use client";

import { useState } from "react";
import { algorithmSpecification, logicDescriptions, questionRuleSummary } from "../../lib/algorithm-documentation";
import { algorithmConfig } from "../../lib/matching";
import { moduleLabels, questions, type QuestionModule } from "../../data/questions";

const intentLabels: Record<string, string> = {
  MARRIAGE: "결혼 전제",
  LONG_TERM: "장기 연애",
  SERIOUS_OPEN: "진지한 만남",
  SHORT_TERM: "단기 연애",
  CASUAL: "가벼운 만남",
  UNSURE: "탐색 중",
};

export function AlgorithmPanel() {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copySpecification() {
    try {
      await navigator.clipboard.writeText(algorithmSpecification);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className="algorithm-panel" id="algorithm">
      <header className="algorithm-header">
        <div>
          <small>ALGORITHM REFERENCE</small>
          <h2>현재 매칭 알고리즘</h2>
          <p>실제 계산 코드의 판정 순서, 수식, 예외값, 누락 응답 처리와 모든 질문 설정을 설명합니다. 아래 전체 명세를 복사해 다른 AI에 그대로 전달할 수 있어요.</p>
        </div>
        <div className="algorithm-version"><span>VERSION</span><strong>{algorithmConfig.version}</strong><em>{algorithmConfig.updatedAt}</em></div>
      </header>

      <div className="algorithm-specification">
        <div className="algorithm-specification-head">
          <div><small>AI-READY SPECIFICATION</small><h3>AI 전달용 전체 알고리즘 명세</h3><p>요약이 아닌 현재 구현의 정확한 동작 명세입니다. 복사한 텍스트만으로 계산 순서와 변경 지점을 파악할 수 있습니다.</p></div>
          <button type="button" onClick={copySpecification}>{copyStatus === "copied" ? "복사 완료 ✓" : "전체 명세 복사"}</button>
        </div>
        <textarea aria-label="AI 전달용 전체 알고리즘 명세" readOnly spellCheck={false} value={algorithmSpecification} />
        <p className={`copy-status ${copyStatus}`} aria-live="polite">{copyStatus === "copied" ? "클립보드에 전체 명세를 복사했습니다." : copyStatus === "error" ? "자동 복사에 실패했습니다. 텍스트 영역을 직접 선택해 복사해주세요." : "버전, 하드 조건, 수식, 예외 처리, 질문별 설정이 모두 포함됩니다."}</p>
      </div>

      <div className="algorithm-overview-grid">
        <article>
          <small>CALCULATION</small>
          <h3>계산 순서</h3>
          <ol>{algorithmConfig.formulas.map((formula) => <li key={formula}>{formula}</li>)}</ol>
        </article>
        <article>
          <small>HARD CONDITIONS</small>
          <h3>추천 제외 조건</h3>
          <ul>{algorithmConfig.hardConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
        </article>
      </div>

      <div className="algorithm-section">
        <div className="section-heading"><div><small>SCORING FUNCTIONS</small><h3>로직 코드의 실제 계산 의미</h3></div><p>표시용 분류와 실제 실행 함수의 차이까지 명시</p></div>
        <div className="logic-rule-grid">
          {Object.entries(logicDescriptions).map(([logic, description]) => (
            <article key={logic}><code>{logic}</code><p>{description}</p></article>
          ))}
        </div>
      </div>

      <div className="algorithm-section">
        <div className="section-heading"><div><small>IMPORTANCE</small><h3>중요도 배수</h3></div><p>양쪽 사용자의 배수를 평균해 문항 가중치에 적용</p></div>
        <div className="importance-rule-grid">
          {Object.entries(algorithmConfig.importanceMultipliers).map(([importance, multiplier]) => (
            <div key={importance}><span>{importance}</span><strong>× {multiplier}</strong><small>{importance === "4" ? "절대 조건" : `${importance}단계 중요도`}</small></div>
          ))}
        </div>
      </div>

      <div className="algorithm-section">
        <div className="section-heading"><div><small>RELATIONSHIP WEIGHTS</small><h3>관계 목적별 모듈 가중치</h3></div><p>두 사용자의 가중치를 평균한 뒤 사용 가능한 모듈만 재정규화</p></div>
        <div className="weight-table-wrap">
          <table className="weight-table">
            <thead><tr><th>관계 목적</th><th>적용 모듈과 가중치</th></tr></thead>
            <tbody>
              {Object.entries(algorithmConfig.relationshipWeights).map(([intent, weights]) => (
                <tr key={intent}>
                  <th>{intentLabels[intent] ?? intent}<small>{intent}</small></th>
                  <td>
                    {Object.entries(weights)
                      .sort((left, right) => Number(right[1]) - Number(left[1]))
                      .map(([module, weight]) => (
                        <span key={module}>{moduleLabels[module as QuestionModule].ko}<b>{weight}</b></span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="algorithm-section">
        <div className="section-heading"><div><small>QUESTION RULES</small><h3>질문별 계산 설정</h3></div><p>{questions.length}개 질문 · ID를 지정해 변경 요청 가능</p></div>
        <div className="question-rule-table-wrap">
          <table className="question-rule-table">
            <thead><tr><th>ID</th><th>질문</th><th>응답 값</th><th>포함 조건</th><th>모듈</th><th>매칭 로직</th><th>기본 가중치</th><th>설정</th></tr></thead>
            <tbody>
              {questions.map((question) => {
                const rule = questionRuleSummary(question);
                return <tr key={question.id}>
                  <th><code>{question.id}</code></th>
                  <td>{question.ko}</td>
                  <td>{rule.answerSchema}</td>
                  <td><code>{rule.condition}</code></td>
                  <td>{moduleLabels[question.module].ko}</td>
                  <td><code>{question.logic}</code></td>
                  <td>× {question.baseWeight}</td>
                  <td>{[question.required ? "필수" : "", question.dealbreaker ? "절대조건 가능" : "", question.sensitive ? "민감" : "", question.showIf ? "조건부" : ""].filter(Boolean).join(" · ") || "일반"}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="algorithm-scale-grid">
        <article><small>MATCH TIERS</small><h3>추천 등급</h3>{algorithmConfig.tiers.map((tier) => <p key={tier}>{tier}</p>)}</article>
        <article><small>CONFIDENCE</small><h3>점수 신뢰도</h3>{algorithmConfig.confidence.map((confidence) => <p key={confidence}>{confidence}</p>)}</article>
      </div>
    </section>
  );
}
