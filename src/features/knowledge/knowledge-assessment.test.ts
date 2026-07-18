import test from "node:test";
import assert from "node:assert/strict";
import { assessKnowledge } from "./knowledge-assessment";
import { RuleKnowledgeIntelligenceProvider } from "./knowledge-rule-provider";
import { toKnowledgeProjectSummary } from "./knowledge.repository";
import type { KnowledgeIntelligenceInput } from "./knowledge-provider";

const emptyInput: KnowledgeIntelligenceInput = {
  project: { id: "project-1", name: "Project", websiteUrl: "https://example.com", industry: "", description: "" },
  products: [], services: [], cases: [], documents: [], technicalDocuments: [], chunks: [],
};

test("assessment reports unavailable instead of a fabricated score when evidence is absent", () => {
  const result = assessKnowledge("project-1", { COMPANY_INFO: 0, PRODUCT_DETAIL: 0, SERVICE_DETAIL: 0, CUSTOMER_CASE: 0, TECHNICAL_PROOF: 0, CERTIFICATION: 0, FAQ: 0 }, []);
  assert.equal(result.status, "unavailable");
  assert.equal(result.completeness, null);
  assert.equal(result.confidence, null);
  assert.equal(result.missing.find((gap) => gap.type === "CERTIFICATION")?.sourceCount, 0);
});

test("project summary preserves the owned project id when no knowledge base exists", () => {
  const result = toKnowledgeProjectSummary({ projectId: "project-real", projectName: "Project", websiteUrl: "https://example.com", industry: "SaaS", knowledgeBaseId: null });
  assert.equal(result.projectId, "project-real");
  assert.equal(result.knowledgeBase, null);
});

test("strict provider only extracts explicit certification and Q&A evidence", async () => {
  const provider = new RuleKnowledgeIntelligenceProvider();
  const input: KnowledgeIntelligenceInput = {
    ...emptyInput,
    technicalDocuments: [{ id: "technical-1", projectId: "project-1", sourceId: "source-1", title: "ISO 9001 certificate", type: "certificate", summary: "Issuer: Bureau Veritas", technicalFields: {}, confidence: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
    chunks: [{ id: "chunk-1", projectId: "project-1", documentId: "document-1", content: "Q: How is delivery handled?\nA: Delivery is scheduled with the customer.", hash: "hash", order: 0, tokenCount: 12, confidence: null, createdAt: "2026-01-01T00:00:00.000Z" }],
  };
  const result = await provider.analyze(input);
  assert.equal(result.profile.certifications.length, 1);
  assert.equal(result.profile.certifications[0]?.sourceId, "technical-1");
  assert.equal(result.profile.faqTopics.length, 1);
  assert.equal(result.profile.missingKnowledge.some((gap) => gap.type === "CUSTOMER_CASE" && gap.sourceCount === 0), true);
});

test("strict provider does not infer certifications or FAQs from ordinary industry text", async () => {
  const provider = new RuleKnowledgeIntelligenceProvider();
  const result = await provider.analyze({
    ...emptyInput,
    products: [{ id: "product-1", projectId: "project-1", sourceId: "source-1", name: "Delivery service equipment", category: "Equipment", description: "Equipment for scheduled delivery", features: [], applications: [], targetCustomers: [], confidence: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
    chunks: [{ id: "chunk-1", projectId: "project-1", documentId: "document-1", content: "Companies often ask about delivery schedules and our certification process, and this paragraph provides general context.", hash: "hash", order: 0, tokenCount: 12, confidence: null, createdAt: "2026-01-01T00:00:00.000Z" }],
  });
  assert.deepEqual(result.profile.certifications, []);
  assert.deepEqual(result.profile.faqTopics, []);
  assert.equal(result.profile.missingKnowledge.some((gap) => gap.type === "CERTIFICATION"), true);
  assert.equal(result.profile.missingKnowledge.some((gap) => gap.type === "FAQ"), true);
});
