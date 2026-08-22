import test from "node:test";
import assert from "node:assert/strict";
import { progressDocumentsEqual } from "./migrate-user-progress-to-user-subcollection";

test("migration comparison preserves document values and array order", () => {
  assert.equal(progressDocumentsEqual({ xp: { total: 10 }, badges: ["a", "b"] }, { badges: ["a", "b"], xp: { total: 10 } }), true);
  assert.equal(progressDocumentsEqual({ badges: ["a", "b"] }, { badges: ["b", "a"] }), false);
});
test("migration detects divergent XP without overwriting it", () => assert.equal(progressDocumentsEqual({ xp: { total: 100 } }, { xp: { total: 200 } }), false));
