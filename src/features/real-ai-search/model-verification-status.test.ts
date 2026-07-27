import assert from "node:assert/strict";
import test from "node:test";
import { modelVerificationStatusForError } from "./ai-search-execution.service";

test("model verification exposes specific user-safe availability states", () => {
  assert.equal(modelVerificationStatusForError("API_KEY_PERMISSION_DENIED"), "NO_ACCESS");
  assert.equal(modelVerificationStatusForError("MODEL_NOT_FOUND"), "MODEL_NOT_FOUND");
  assert.equal(modelVerificationStatusForError("ACCOUNT_BALANCE_INSUFFICIENT"), "INSUFFICIENT_BALANCE");
  assert.equal(modelVerificationStatusForError("PROVIDER_RATE_LIMITED"), "RATE_LIMITED");
  assert.equal(modelVerificationStatusForError("PROVIDER_UNAVAILABLE"), "TEMPORARILY_UNAVAILABLE");
  assert.equal(modelVerificationStatusForError("MODEL_UNSUPPORTED"), "UNSUPPORTED");
  assert.equal(modelVerificationStatusForError("API_KEY_INVALID"), "VERIFICATION_FAILED");
});
