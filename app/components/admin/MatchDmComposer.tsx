"use client";

import { useState } from "react";
import type { MatchProfile, MatchResult } from "../../lib/matching";

type MessageLocale = "ko" | "ja";

function profileName(profile: MatchProfile) {
  return profile.name?.trim() || profile.instagram.replace(/^@/, "");
}

export function createMatchDmMessages(recipient: MatchProfile, match: MatchProfile, score: number) {
  return {
    ko: `${profileName(recipient)}님 조건에 맞는 사람이 나타났어요!\n지금 바로 연락해보세요🧡\n\n인스타그램 아이디: ${match.instagram}\n적합도: ${score}%`,
    ja: `${profileName(recipient)}さん、条件に合うお相手が見つかりました！\n今すぐ連絡してみてください🧡\n\nInstagram ID：${match.instagram}\n相性度：${score}%`,
  } satisfies Record<MessageLocale, string>;
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("copy failed");
}

export function MatchDmComposer({ recipient, candidate, result }: { recipient: MatchProfile; candidate: MatchProfile; result: MatchResult }) {
  const [copyStatus, setCopyStatus] = useState<MessageLocale | "error" | null>(null);
  const messages = createMatchDmMessages(recipient, candidate, result.overall);
  const recommendedLocale: MessageLocale = recipient.locale === "ja" ? "ja" : "ko";

  async function copyMessage(locale: MessageLocale) {
    if (!result.eligible) return;
    try {
      await writeToClipboard(messages[locale]);
      setCopyStatus(locale);
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className="dm-composer" aria-labelledby="dm-composer-title">
      <div className="dm-composer-heading">
        <div><small>MATCH NOTIFICATION</small><h3 id="dm-composer-title">매칭 안내 DM</h3></div>
        <span>{result.eligible ? `${profileName(recipient)}님에게 발송` : "추천 제외 · 발송 불가"}</span>
      </div>
      <p className="dm-composer-description">선택한 참여자에게 보낼 안내 문구예요. 추천 상대의 Instagram ID와 적합도가 자동으로 반영됩니다.</p>

      <div className="dm-message-grid">
        {(["ko", "ja"] as const).map((locale) => (
          <article className={recommendedLocale === locale ? "recommended" : ""} key={locale} lang={locale}>
            <div className="dm-language-line">
              <strong>{locale === "ko" ? "한국어" : "日本語"}</strong>
              {recommendedLocale === locale ? <span>{locale === "ko" ? "권장 언어" : "おすすめ"}</span> : null}
            </div>
            <textarea aria-label={locale === "ko" ? "한국어 매칭 안내 문구" : "日本語マッチング案内文"} readOnly value={messages[locale]} />
            <button disabled={!result.eligible} onClick={() => void copyMessage(locale)} type="button">
              <span aria-hidden="true">{copyStatus === locale ? "✓" : "□"}</span>
              {copyStatus === locale
                ? (locale === "ko" ? "복사 완료" : "コピーしました")
                : (locale === "ko" ? "한국어 문구 복사" : "日本語をコピー")}
            </button>
          </article>
        ))}
      </div>

      <p className={`dm-copy-feedback ${copyStatus === "error" ? "error" : ""}`} aria-live="polite">
        {!result.eligible
          ? "절대조건과 충돌한 조합입니다. 다른 추천 후보를 선택해주세요."
          : copyStatus === "error"
            ? "자동 복사에 실패했습니다. 문구를 직접 선택해 복사해주세요."
            : copyStatus
              ? "클립보드에 복사했습니다. Instagram DM에 바로 붙여넣을 수 있어요."
              : "발송 전 상대의 아이디와 적합도를 한 번 더 확인해주세요."}
      </p>
    </section>
  );
}
