import type { KnowledgeChunk } from "./types";
import type { ExtractedEvidenceItem, ExtractedFAQSuggestion, KnowledgeDocumentIntelligenceProvider } from "./knowledge-document-intelligence.types";

const labelPatterns = {
  productName: /^(?:产品名称|产品名|Product Name)\s*[：:]\s*(.+)$/i,
  productType: /^(?:产品类型|产品类别|类型|Product Type)\s*[：:]\s*(.+)$/i,
  description: /^(?:产品介绍|产品描述|简介|Product Description)\s*[：:]\s*(.+)$/i,
  advantages: /^(?:核心优势|产品优势|竞争优势|优势|亮点|Advantages?)\s*[：:]\s*(.+)$/i,
  features: /^(?:核心功能|产品功能|功能特点|技术特点|特性|Features?)\s*[：:]\s*(.+)$/i,
  parameters: /^(?:技术参数|产品参数|规格参数|Specifications?|Parameters?)\s*[：:]\s*(.+)$/i,
  applications: /^(?:应用行业|应用场景|适用行业|Applications?|Use Cases?)\s*[：:]\s*(.+)$/i,
  customers: /^(?:目标客户|适用客户|客户群体|Target Customers?)\s*[：:]\s*(.+)$/i,
  solves: /^(?:解决问题|客户痛点|解决的痛点|Problems? Solved)\s*[：:]\s*(.+)$/i,
};

export const ruleKnowledgeDocumentIntelligenceProvider: KnowledgeDocumentIntelligenceProvider = {
  id: "document-rules-v1",
  async extract({ document, chunks }) {
    const advantages = collect(chunks, labelPatterns.advantages);
    const features = collect(chunks, labelPatterns.features);
    const parameters = collect(chunks, labelPatterns.parameters);
    const applications = collect(chunks, labelPatterns.applications);
    const customers = collect(chunks, labelPatterns.customers);
    const solves = collect(chunks, labelPatterns.solves);
    const productNames = collect(chunks, labelPatterns.productName);
    const productTypes = collect(chunks, labelPatterns.productType);
    const descriptions = collect(chunks, labelPatterns.description);
    const faq = collectFaq(chunks);
    const evidenceCount = advantages.length + features.length + parameters.length + applications.length + customers.length + solves.length + faq.length;
    const fallbackName = evidenceCount >= 2 ? document.name.replace(/\.(?:pdf|docx|pptx|xlsx)$/i, "").replace(/[-_]+/g, " ").trim() : "";
    const productName = productNames[0]?.value || fallbackName;
    const evidenceChunkIds = unique([
      ...productNames, ...productTypes, ...descriptions, ...advantages, ...features, ...parameters, ...applications, ...customers, ...solves,
    ].map((item) => item.sourceChunkId));
    const fieldCount = [productName, productTypes.length, descriptions.length, advantages.length, features.length + parameters.length, applications.length, customers.length, solves.length].filter(Boolean).length;
    const productConfidence = productName ? Math.min(95, 35 + fieldCount * 8 + Math.min(12, evidenceChunkIds.length * 2)) : 0;
    const products = productName ? [{
      name: productName,
      type: productTypes[0]?.value ?? "",
      description: descriptions[0]?.value ?? "",
      technicalParameters: parameters.map((item) => item.value),
      advantages: advantages.map((item) => item.value),
      features: features.map((item) => item.value),
      applications: applications.map((item) => item.value),
      targetCustomers: customers.map((item) => item.value),
      solves: solves.map((item) => item.value),
      confidence: productConfidence,
      evidenceChunkIds,
      status: "DRAFT" as const,
    }] : [];
    const confidence = evidenceCount || products.length ? Math.min(95, Math.round((productConfidence + Math.min(90, 35 + evidenceCount * 5)) / (products.length ? 2 : 1))) : 0;
    return {
      extractedProducts: products,
      extractedAdvantages: advantages,
      extractedFeatures: [...features, ...parameters],
      extractedApplications: applications,
      extractedCustomers: customers,
      extractedFAQ: faq,
      confidence,
    };
  },
};

function collect(chunks: KnowledgeChunk[], pattern: RegExp): ExtractedEvidenceItem[] {
  const values: ExtractedEvidenceItem[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    for (const line of chunk.content.split(/\n+/).map((item) => item.trim()).filter(Boolean)) {
      const match = line.match(pattern);
      if (!match?.[1]) continue;
      for (const value of splitValues(match[1])) {
        const key = value.toLocaleLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        values.push({ value, sourceChunkId: chunk.id, status: "DRAFT" });
      }
    }
  }
  return values.slice(0, 30);
}

function collectFaq(chunks: KnowledgeChunk[]): ExtractedFAQSuggestion[] {
  const faq: ExtractedFAQSuggestion[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const content = chunk.content.replace(/\r/g, "");
    const pattern = /(?:^|\n)(?:Q|问题)\s*[：:]?\s*([^\n]+)\n+(?:A|答案)\s*[：:]?\s*([^\n]+)/gi;
    for (const match of content.matchAll(pattern)) {
      const question = match[1]?.trim();
      const answer = match[2]?.trim();
      if (!question || !answer || seen.has(question.toLocaleLowerCase())) continue;
      seen.add(question.toLocaleLowerCase());
      faq.push({ question, answer, sourceChunkId: chunk.id, status: "DRAFT" });
    }
  }
  return faq.slice(0, 20);
}

function splitValues(value: string) {
  return value.split(/[、,，;；|]/).map((item) => item.trim()).filter((item) => item.length >= 2).slice(0, 20);
}

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
