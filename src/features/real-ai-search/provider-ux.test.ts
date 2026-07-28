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

test("provider deletion is explicit, confirmed, and never returns a saved plaintext key", async () => {
  const [workspace, route, repository] = await Promise.all([
    readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8"),
    readFile("src/app/api/ai-search-providers/[projectId]/route.ts", "utf8"),
    readFile("src/features/real-ai-search/repository.ts", "utf8"),
  ]);
  assert.match(workspace, /deleteDialogOpen/);
  assert.match(workspace, /method: "DELETE"/);
  assert.match(route, /export async function DELETE/);
  assert.doesNotMatch(repository, /keyMask:\s*row\?\.encryptedApiKey/);
  assert.doesNotMatch(workspace, /localStorage|sessionStorage/);
});

test("model selection is a server-fed dropdown and cannot be freely typed", async () => {
  const source = await readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8");
  assert.match(source, /\/models/);
  assert.match(source, /\/verify-model/);
  assert.match(source, /models\.map/);
  assert.match(source, /<Select[\s\S]*id=\{`\$\{stats\.provider\}-model`\}/);
  assert.doesNotMatch(source, /<Input[\s\S]{0,200}id=\{`\$\{stats\.provider\}-model`\}/);
});

test("official OpenAI and compatible gateways have distinct identity and logos", async () => {
  const [workspace, gatewayPanel, logo, metadata] = await Promise.all([
    readFile("src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx", "utf8"),
    readFile("src/features/real-ai-search/gateway-connections-panel.tsx", "utf8"),
    readFile("src/components/shared/provider-logo.tsx", "utf8"),
    readFile("src/features/real-ai-search/provider-metadata.ts", "utf8"),
  ]);
  assert.match(workspace, /OPENAI_OFFICIAL/);
  assert.match(workspace, /GatewayConnectionsPanel/);
  assert.match(gatewayPanel, /OPENAI_COMPATIBLE/);
  assert.match(gatewayPanel, /Third-party AI gateways/);
  assert.match(logo, /<Network/);
  assert.match(metadata, /provider-logos\/openai\.svg/);
  assert.match(logo, /onError/);
});

test("API responses never expose encrypted key material", async () => {
  const repository = await readFile("src/features/real-ai-search/repository.ts", "utf8");
  const view = repository.slice(repository.indexOf("function configView"), repository.indexOf("function resultView"));
  assert.doesNotMatch(view, /encryptedApiKey:\s*/);
  assert.doesNotMatch(view, /apiKeyIv:\s*/);
  assert.doesNotMatch(view, /apiKeyAuthTag:\s*/);
});
