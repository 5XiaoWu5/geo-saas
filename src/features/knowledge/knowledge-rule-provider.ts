import { assessKnowledge } from "./knowledge-assessment";
import type { KnowledgeIntelligenceInput, KnowledgeIntelligenceProvider, KnowledgeProfileDraft } from "./knowledge-provider";
import type { KnowledgeCertification, KnowledgeEvidenceRef, KnowledgeFaqTopic, KnowledgeProfileItem } from "./types";

const METHOD_VERSION = "strict-evidence-rules-v1";
const standardPattern = /(?:ISO(?:\/IEC)?\s*\d{3,6}(?::\d{4})?|GB\/T\s*\d{3,6}(?:-\d{4})?|\bCE\b|\bFCC\b|\bRoHS\b|\bUL\b)/i;
const certificationContext = /(?:ISO(?:\/IEC)?\s*\d{3,6}(?::\d{4})?|GB\/T\s*\d{3,6}(?:-\d{4})?|\bCE\b\s*(?:认证|certification|certificate)?|\bFCC\b\s*(?:认证|certification|certificate)?|\bRoHS\b\s*(?:认证|compliance|certificate)?|\bUL\b\s*(?:认证|listed|certificate)?|认证证书|资质证书|认证机构|发证机构|\bcertificate\b|\bcertification\b|\bcertified\b)/i;
const identifierPattern = /\b(?:ISO(?:\/IEC)?\s*\d{3,6}(?::\d{4})?|GB\/T\s*\d{3,6}(?:-\d{4})?|(?:certificate|certification|证书|认证)(?:\s*(?:no\.?|number|编号))?\s*[:：#]?\s*(?=[A-Z0-9./-]*\d)[A-Z0-9][A-Z0-9./-]{3,})\b/i;
const issuerPattern = /(?:issuer|issued by|certification body|颁发机构|认证机构|发证机构)\s*[:：]\s*([^\n,，;；]{2,80})/i;
const qaPattern = /(?:^|\n)\s*(?:Q(?:uestion)?|问题)\s*[:：]\s*(.+?)\s*(?:\r?\n)+\s*(?:A(?:nswer)?|回答|答案)\s*[:：]\s*([\s\S]+?)(?=(?:\r?\n)+\s*(?:Q(?:uestion)?|问题)\s*[:：]|$)/gi;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item).toLocaleLowerCase();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function flattenRecord(value: Record<string, unknown>): string[] {
  return Object.entries(value).flatMap(([key, item]) => {
    if (Array.isArray(item)) return item.map((entry) => `${key}: ${clean(entry)}`);
    if (item && typeof item === "object") return flattenRecord(item as Record<string, unknown>).map((entry) => `${key}: ${entry}`);
    return [`${key}: ${clean(item)}`];
  }).filter((item) => !item.endsWith(": "));
}

function item(ref: KnowledgeEvidenceRef, name: string, description?: string, details?: string[]): KnowledgeProfileItem {
  return { ...ref, name, ...(description ? { description } : {}), ...(details?.length ? { details } : {}) };
}

function certificationFromText(ref: KnowledgeEvidenceRef, text: string): KnowledgeCertification | null {
  const normalized = clean(text);
  if (!normalized || !certificationContext.test(normalized)) return null;
  const identifier = normalized.match(identifierPattern)?.[0];
  const issuer = normalized.match(issuerPattern)?.[1];
  const standard = normalized.match(standardPattern)?.[0];
  const explicitCertificate = /(?:认证证书|资质证书|\bcertificate\b|\bcertified\s+by\b)/i.test(normalized);
  if (!identifier && !issuer && !standard && !explicitCertificate) return null;
  const name = identifier ?? standard ?? issuer ?? normalized.match(/[^\n]{0,80}(?:认证证书|资质证书|\bcertificate\b)/i)?.[0] ?? "";
  if (!name) return null;
  return { ...ref, name: clean(name), ...(identifier ? { identifier: clean(identifier) } : {}), ...(issuer ? { issuer: clean(issuer) } : {}), excerpt: normalized.slice(0, 240) };
}

function extractFaq(ref: KnowledgeEvidenceRef, content: string): KnowledgeFaqTopic[] {
  const topics: KnowledgeFaqTopic[] = [];
  for (const match of content.matchAll(qaPattern)) {
    const question = clean(match[1]);
    const answer = clean(match[2]);
    if (question && answer) topics.push({ ...ref, question, answer: answer.slice(0, 600) });
  }
  return topics;
}

function confidenceValues(input: KnowledgeIntelligenceInput) {
  return [...input.products, ...input.services, ...input.cases, ...input.technicalDocuments, ...input.chunks]
    .map((source) => source.confidence)
    .filter((value): value is number => value !== null);
}

export class RuleKnowledgeIntelligenceProvider implements KnowledgeIntelligenceProvider {
  readonly methodVersion = METHOD_VERSION;

  async analyze(input: KnowledgeIntelligenceInput) {
    const mainProducts = input.products.map((product) => item(
      { sourceType: "ProductEntity", sourceId: product.id }, product.name, product.description || undefined,
      [...product.features, ...product.applications],
    ));
    const mainServices = input.services.map((service) => item(
      { sourceType: "ServiceEntity", sourceId: service.id }, service.name, service.description || undefined, service.industries,
    ));
    const targetCustomers = uniqueBy(input.products.flatMap((product) => product.targetCustomers.map((customer) => item(
      { sourceType: "ProductEntity", sourceId: product.id }, customer, undefined, [product.name],
    ))), (entry) => entry.name);
    const productAdvantages = input.products.flatMap((product) => product.features.map((feature) => item(
      { sourceType: "ProductEntity", sourceId: product.id }, feature, undefined, [product.name],
    )));
    const technicalAdvantages = input.technicalDocuments.flatMap((document) => flattenRecord(document.technicalFields)
      .filter((entry) => /advantage|benefit|strength|优势|特点|性能/i.test(entry))
      .map((entry) => item({ sourceType: "TechnicalDocument", sourceId: document.id }, entry, document.summary || undefined)));
    const competitiveAdvantages = uniqueBy([...productAdvantages, ...technicalAdvantages], (entry) => entry.name);
    const customerProof = input.cases.map((customerCase) => item(
      { sourceType: "CustomerCase", sourceId: customerCase.id }, customerCase.customerName,
      customerCase.result || customerCase.solution || undefined,
      [customerCase.industry, customerCase.problem, ...flattenRecord(customerCase.metrics)].filter(Boolean),
    ));

    const certificationCandidates = [
      ...input.technicalDocuments.map((document) => ({ ref: { sourceType: "TechnicalDocument" as const, sourceId: document.id }, text: [document.title, document.type, document.summary, ...flattenRecord(document.technicalFields)].filter(Boolean).join("\n") })),
      ...input.documents.map((document) => ({ ref: { sourceType: "KnowledgeDocument" as const, sourceId: document.id }, text: document.name })),
      ...input.chunks.map((chunk) => ({ ref: { sourceType: "KnowledgeChunk" as const, sourceId: chunk.id }, text: chunk.content })),
    ];
    const certifications = uniqueBy(certificationCandidates.flatMap(({ ref, text }) => {
      const found = certificationFromText(ref, text);
      return found ? [found] : [];
    }), (entry) => `${entry.name}:${entry.identifier ?? ""}:${entry.issuer ?? ""}`);
    const faqTopics = uniqueBy(input.chunks.flatMap((chunk) => extractFaq(
      { sourceType: "KnowledgeChunk", sourceId: chunk.id }, chunk.content,
    )), (entry) => entry.question);

    const companySummaryEvidence = [
      ...input.products.map((product) => clean(product.description)).filter(Boolean),
      ...input.services.map((service) => clean(service.description)).filter(Boolean),
      ...input.technicalDocuments.map((document) => clean(document.summary)).filter(Boolean),
    ];
    const companySummary = companySummaryEvidence.length ? companySummaryEvidence.slice(0, 3).join(" ").slice(0, 1200) : null;
    const industries = uniqueBy([
      ...input.services.flatMap((service) => service.industries),
      ...input.cases.map((customerCase) => customerCase.industry),
    ].map(clean).filter(Boolean), (value) => value);
    const businessType = input.products.length && input.services.length ? "HYBRID" : input.products.length ? "PRODUCT" : input.services.length ? "SERVICE" : null;
    const counts = {
      COMPANY_INFO: companySummary ? companySummaryEvidence.length : 0,
      PRODUCT_DETAIL: input.products.filter((product) => clean(product.description) || product.features.length || product.applications.length).length,
      SERVICE_DETAIL: input.services.filter((service) => clean(service.description) || service.industries.length).length,
      CUSTOMER_CASE: customerProof.length,
      TECHNICAL_PROOF: input.technicalDocuments.filter((document) => clean(document.summary) || Object.keys(document.technicalFields).length).length + input.chunks.filter((chunk) => clean(chunk.content)).length,
      CERTIFICATION: certifications.length,
      FAQ: faqTopics.length,
    };
    const assessment = assessKnowledge(input.project.id, counts, confidenceValues(input));
    const profile: KnowledgeProfileDraft = {
      projectId: input.project.id,
      companySummary,
      industry: industries[0] ?? null,
      businessType,
      mainProducts,
      mainServices,
      targetCustomers,
      competitiveAdvantages,
      certifications,
      customerProof,
      faqTopics,
      missingKnowledge: assessment.missing,
      confidence: assessment.confidence,
      status: assessment.status === "available" ? "ACTIVE" : "DRAFT",
      methodVersion: this.methodVersion,
    };
    return { profile, assessment };
  }
}

export const ruleKnowledgeIntelligenceProvider = new RuleKnowledgeIntelligenceProvider();
