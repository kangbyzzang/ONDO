import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the ONDO questionnaire landing experience", async () => {
  const [experience, layout, page] = await Promise.all([
    readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /온도 ONDO — 한일 진지한 관계 매칭/);
  assert.match(experience, /잘 맞는 사람은/);
  assert.match(experience, /인스타그램 아이디/);
  assert.match(experience, /나의 관계 온도 알아보기/);
  assert.match(page, /<UserExperience \/>/);
  assert.doesNotMatch(`${experience}${layout}${page}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("shows an unambiguous survey completion state", async () => {
  const experience = await readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8");
  assert.match(experience, /설문이 완료되었어요/);
  assert.match(experience, /응답 저장 완료/);
  assert.doesNotMatch(experience, /예상 상위 적합도|다음 5개 질문으로 정확도 높이기|displayCompletion/);
});

test("contains the admin compatibility dashboard", async () => {
  const [experience, adminPage, firebaseClient] = await Promise.all([
    readFile(new URL("../app/Experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/firebase.ts", import.meta.url), "utf8"),
  ]);
  assert.match(experience, /좋은 인연의 가능성/);
  assert.match(experience, /참여자/);
  assert.match(experience, /추천 후보/);
  assert.match(experience, /핵심 응답 요약/);
  assert.match(experience, /Google로 관리자 로그인/);
  assert.match(firebaseClient, /kangbyeongyeon05@gmail\.com/);
  assert.match(adminPage, /<AdminExperience \/>/);
});

test("stores survey answers in protected Firebase documents", async () => {
  const [firebaseClient, submissions, rules, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/firebase.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/firebase-submissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(firebaseClient, /data-platform-b4587/);
  assert.match(submissions, /signInAnonymously/);
  assert.match(submissions, /setDoc/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /kangbyeongyeon05@gmail\.com/);
  assert.match(packageJson, /"firebase"/);
  assert.doesNotMatch(`${firebaseClient}${submissions}${packageJson}`, /cloudflare:workers|drizzle-orm|vinext/);
});

test("ships the bespoke social card and removes the starter preview", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /\/og\.png/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app\/_sites-preview\/SkeletonPreview.tsx", import.meta.url)));
});
