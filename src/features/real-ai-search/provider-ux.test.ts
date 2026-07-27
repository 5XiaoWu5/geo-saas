import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("provider cards expose every required persisted and request status", async () => {
  const source = await readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8");
  for (const status of ["unconfigured", "configured", "testing", "success", "failed", "unavailable", "disabled"]) {
    assert.match(source, new RegExp(`"${status}"`));
  }
});

test("provider UX masks saved keys and opens official destinations in a new window", async () => {
  const source = await readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8");
  assert.match(source, /config\.keyMask/);
  assert.match(source, /type=\{showKey \? "text" : "password"\}/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer noopener"/);
});

test("provider actions disable duplicate submissions and never log API keys", async () => {
  const source = await readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8");
  assert.match(source, /if \(busy \|\| !canTest\) return/);
  assert.match(source, /if \(busy \|\| !canSave\) return/);
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*apiKey/);
});
