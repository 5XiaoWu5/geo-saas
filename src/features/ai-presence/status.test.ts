import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPresenceStatus } from "./service";

test("user declaration can only establish submitted state", () => {
  assert.equal(canTransitionPresenceStatus("READY", "SUBMITTED", "USER_DECLARATION"), true);
  assert.equal(canTransitionPresenceStatus("SUBMITTED", "CRAWLED", "USER_DECLARATION"), false);
  assert.equal(canTransitionPresenceStatus("SUBMITTED", "INDEXED", "USER_DECLARATION"), false);
  assert.equal(canTransitionPresenceStatus("SUBMITTED", "MENTIONED", "USER_DECLARATION"), false);
  assert.equal(canTransitionPresenceStatus("SUBMITTED", "CITED", "USER_DECLARATION"), false);
});

test("advanced evidence states require their matching source", () => {
  assert.equal(canTransitionPresenceStatus("SUBMITTED", "CRAWLED", "LIVE_CRAWL"), true);
  assert.equal(canTransitionPresenceStatus("CRAWLED", "INDEXED", "SEARCH_CONSOLE"), true);
  assert.equal(canTransitionPresenceStatus("INDEXED", "MENTIONED", "AI_SEARCH_RESULT"), true);
  assert.equal(canTransitionPresenceStatus("MENTIONED", "CITED", "AI_SEARCH_CITATION"), true);
  assert.equal(canTransitionPresenceStatus("INDEXED", "CITED", "AI_SEARCH_RESULT"), false);
  assert.equal(canTransitionPresenceStatus("READY", "CITED", "AI_SEARCH_CITATION"), false);
});
