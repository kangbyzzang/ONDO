import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the EEUM questionnaire landing experience", async () => {
  const [experience, layout, page] = await Promise.all([
    readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /이음 EEUM — 한일 진지한 관계 매칭/);
  assert.match(layout, /https:\/\/eeumdating\.vercel\.app/);
  assert.match(experience, /잘 맞는 사람은/);
  assert.match(experience, /인스타그램 ID/);
  assert.match(experience, /BASIC PROFILE/);
  assert.match(experience, /매칭 선호/);
  assert.match(experience, /이름/);
  assert.match(experience, /만 나이/);
  assert.match(experience, /年齢（満年齢）/);
  assert.match(experience, /나의 성별/);
  assert.match(experience, /만나고 싶은 상대/);
  assert.match(experience, /나와 잘 맞는 인연 알아보기/);
  assert.match(experience, /이음 운영팀/);
  assert.doesNotMatch(experience, /관리자 분석 화면 보기|管理者分析画面を見る|className="admin-link"|href="\/admin"/);
  assert.doesNotMatch(`${experience}${layout}`, /온도|ONDO/);
  assert.match(page, /<UserExperience \/>/);
  assert.doesNotMatch(`${experience}${layout}${page}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.doesNotMatch(experience, /different languages|same temperature|SERIOUS ONLY/);
});

test("shows an unambiguous survey completion state", async () => {
  const experience = await readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8");
  assert.match(experience, /설문이 완료되었어요/);
  assert.match(experience, /응답 저장 완료/);
  assert.doesNotMatch(experience, /예상 상위 적합도|다음 5개 질문으로 정확도 높이기|displayCompletion/);
});

test("contains the admin compatibility dashboard", async () => {
  const [experience, adminPage, adminAccess] = await Promise.all([
    readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/admin-access.ts", import.meta.url), "utf8"),
  ]);
  assert.match(experience, /좋은 인연의 가능성/);
  assert.match(experience, /참여자/);
  assert.match(experience, /추천 후보/);
  assert.match(experience, /핵심 응답 요약/);
  assert.match(experience, /Google로 관리자 로그인/);
  assert.doesNotMatch(experience, /ADMIN_EMAILS\.join/);
  assert.match(experience, /현재 알고리즘/);
  assert.match(experience, /MatchEvidence/);
  assert.doesNotMatch(experience, /demoProfiles/);
  assert.match(adminAccess, /kangbyeongyeon05@gmail\.com/);
  assert.match(adminAccess, /gim67507@gmail\.com/);
  assert.match(adminPage, /<AdminExperience \/>/);
});

test("stores survey answers in protected Firebase documents", async () => {
  const [firebaseClient, submissions, rules, firebaseConfig, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/firebase.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/firebase-submissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../firebase.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(firebaseClient, /data-platform-b4587/);
  assert.match(submissions, /signInAnonymously/);
  assert.match(submissions, /setDoc/);
  assert.match(submissions, /instagramKey/);
  assert.match(rules, /request\.resource\.data\.instagramKey == instagramKey/);
  assert.match(rules, /resource\.data\.ownerUid == request\.auth\.uid/);
  assert.match(rules, /kangbyeongyeon05@gmail\.com/);
  assert.match(rules, /gim67507@gmail\.com/);
  assert.match(firebaseConfig, /"anonymous": true/);
  assert.match(firebaseConfig, /"googleSignIn"/);
  assert.match(packageJson, /"firebase"/);
  assert.doesNotMatch(`${firebaseClient}${submissions}${packageJson}`, /cloudflare:workers|drizzle-orm|vinext/);
});

test("uses reciprocal gender preference as a matching condition", async () => {
  const [questions, matching] = await Promise.all([
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/matching.ts", import.meta.url), "utf8"),
  ]);
  assert.match(questions, /BIO001/);
  assert.match(questions, /BIO002/);
  assert.match(matching, /서로가 원하는 상대 성별 조건이 맞지 않습니다/);
});

test("asks and documents reciprocal age-gap preference", async () => {
  const [questions, matching, documentation] = await Promise.all([
    readFile(new URL("../app/data/questions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/matching.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/algorithm-documentation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(questions, /AGE001/);
  assert.match(questions, /최대 몇 살 차이까지/);
  assert.match(matching, /ageRange/);
  assert.match(documentation, /ageGap/);
});

test("ships the bespoke social card and removes the starter preview", async () => {
  const socialCard = await readFile(new URL("../app/opengraph-image.tsx", import.meta.url), "utf8");
  assert.match(socialCard, /ImageResponse/);
  assert.match(socialCard, /이음 EEUM/);
  assert.match(socialCard, /KOREA × JAPAN, SERIOUSLY/);
  assert.doesNotMatch(socialCard, /온도|ONDO/);
  await assert.rejects(access(new URL("../app\/_sites-preview\/SkeletonPreview.tsx", import.meta.url)));
});
