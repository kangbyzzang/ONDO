import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_EMAILS, isAdminEmail } from "../app/lib/admin-access";

test("both configured Google accounts are recognized as administrators", () => {
  assert.deepEqual(ADMIN_EMAILS, ["kangbyeongyeon05@gmail.com", "gim67507@gmail.com"]);
  assert.equal(isAdminEmail("kangbyeongyeon05@gmail.com"), true);
  assert.equal(isAdminEmail("gim67507@gmail.com"), true);
  assert.equal(isAdminEmail("GIM67507@GMAIL.COM"), true);
  assert.equal(isAdminEmail("someone-else@gmail.com"), false);
  assert.equal(isAdminEmail(null), false);
});
