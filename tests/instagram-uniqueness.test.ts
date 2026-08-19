import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DUPLICATE_INSTAGRAM_MESSAGE, normalizeInstagramId } from "../app/lib/instagram";

test("instagram ids are normalized case-insensitively to one document key", () => {
  assert.equal(normalizeInstagramId(" @ByBye.05 "), "bybye.05");
  assert.equal(normalizeInstagramId("bybye.05"), "bybye.05");
  assert.equal(normalizeInstagramId("@@BYBYE.05"), "bybye.05");
  assert.match(DUPLICATE_INSTAGRAM_MESSAGE, /이미 제출된 인스타그램 아이디/);
});

test("submission storage and Firestore rules enforce the normalized document key", async () => {
  const [submissions, rules] = await Promise.all([
    readFile(new URL("../app/lib/firebase-submissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
  ]);

  assert.match(submissions, /doc\(firestore, "submissions", instagramKey\)/);
  assert.match(submissions, /permission-denied/);
  assert.doesNotMatch(submissions, /doc\(firestore, "submissions", user\.uid\)/);
  assert.match(rules, /match \/submissions\/\{instagramKey\}/);
  assert.match(rules, /request\.resource\.data\.instagramKey == instagramKey/);
  assert.match(rules, /allow update: if false/);
  assert.match(rules, /allow list: if isAdmin\(\)/);
});
