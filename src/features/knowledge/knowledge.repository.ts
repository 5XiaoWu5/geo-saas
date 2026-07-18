import { isoDate, jsonArray, jsonRecord, jsonValueArray, knowledgeDatabase, nullableNumber, type KnowledgeDatabaseRow } from "./database";
import {
  KNOWLEDGE_PROCESSING_STATUSES,
  KNOWLEDGE_STATUSES,
  type CompanyKnowledgeBase,
  type CompanyKnowledgeProfile,
  type CreateCustomerCaseInput,
  type CreateProductInput,
  type CreateServiceInput,
  type CustomerCase,
  type KnowledgeDocument,
  type KnowledgeChunk,
  type KnowledgeProcessingStatus,
  type KnowledgeProjectSummary,
  type KnowledgeStatus,
  type ProductEntity,
  type ServiceEntity,
  type TechnicalDocument,
} from "./types";
import type { KnowledgeProfileDraft } from "./knowledge-provider";

function knowledgeStatus(value: unknown): KnowledgeStatus {
  const status = String(value ?? "DRAFT");
  return KNOWLEDGE_STATUSES.includes(status as KnowledgeStatus) ? status as KnowledgeStatus : "DRAFT";
}

function processingStatus(value: unknown): KnowledgeProcessingStatus {
  const status = String(value ?? "PENDING");
  return KNOWLEDGE_PROCESSING_STATUSES.includes(status as KnowledgeProcessingStatus) ? status as KnowledgeProcessingStatus : "PENDING";
}

export function toKnowledgeBase(row: KnowledgeDatabaseRow): CompanyKnowledgeBase {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    status: knowledgeStatus(row.status),
    version: Number(row.version ?? 1),
    completenessScore: nullableNumber(row.completenessScore),
    understandingScore: nullableNumber(row.understandingScore),
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

function toProduct(row: KnowledgeDatabaseRow): ProductEntity {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), name: String(row.name ?? ""), category: String(row.category ?? ""), description: String(row.description ?? ""), features: jsonArray(row.features), applications: jsonArray(row.applications), targetCustomers: jsonArray(row.targetCustomers), confidence: nullableNumber(row.confidence), status: knowledgeStatus(row.status), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

function toService(row: KnowledgeDatabaseRow): ServiceEntity {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), name: String(row.name ?? ""), description: String(row.description ?? ""), industries: jsonArray(row.industries), confidence: nullableNumber(row.confidence), status: knowledgeStatus(row.status), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

function toCase(row: KnowledgeDatabaseRow): CustomerCase {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), customerName: String(row.customerName ?? ""), industry: String(row.industry ?? ""), problem: String(row.problem ?? ""), solution: String(row.solution ?? ""), result: String(row.result ?? ""), metrics: jsonRecord(row.metrics), confidence: nullableNumber(row.confidence), status: knowledgeStatus(row.status), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

function toDocument(row: KnowledgeDatabaseRow): KnowledgeDocument {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), name: String(row.name ?? ""), mimeType: String(row.mimeType ?? ""), size: Number(row.size ?? 0), processingStatus: processingStatus(row.processingStatus), extractedTextStatus: processingStatus(row.extractedTextStatus), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

function toTechnicalDocument(row: KnowledgeDatabaseRow): TechnicalDocument {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), title: String(row.title ?? ""), type: String(row.type ?? ""), summary: String(row.summary ?? ""), technicalFields: jsonRecord(row.technicalFields), confidence: nullableNumber(row.confidence), status: knowledgeStatus(row.status), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

function evidenceRef(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { sourceType: String(record.sourceType ?? "KnowledgeChunk") as CompanyKnowledgeProfile["mainProducts"][number]["sourceType"], sourceId: String(record.sourceId ?? "") };
}

function profileItems(value: unknown): CompanyKnowledgeProfile["mainProducts"] {
  return jsonValueArray(value).map((item) => {
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { ...evidenceRef(record), name: String(record.name ?? ""), ...(record.description ? { description: String(record.description) } : {}), ...(Array.isArray(record.details) ? { details: record.details.map(String) } : {}) };
  }).filter((item) => item.sourceId && item.name);
}

function certifications(value: unknown): CompanyKnowledgeProfile["certifications"] {
  return jsonValueArray(value).map((item) => {
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { ...evidenceRef(record), name: String(record.name ?? ""), ...(record.identifier ? { identifier: String(record.identifier) } : {}), ...(record.issuer ? { issuer: String(record.issuer) } : {}), excerpt: String(record.excerpt ?? "") };
  }).filter((item) => item.sourceId && item.name && item.excerpt);
}

function faqTopics(value: unknown): CompanyKnowledgeProfile["faqTopics"] {
  return jsonValueArray(value).map((item) => {
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { ...evidenceRef(record), question: String(record.question ?? ""), answer: String(record.answer ?? "") };
  }).filter((item) => item.sourceId && item.question && item.answer);
}

function missingKnowledge(value: unknown): CompanyKnowledgeProfile["missingKnowledge"] {
  return jsonValueArray(value).flatMap((item) => {
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const type = String(record.type ?? "");
    if (!["COMPANY_INFO", "PRODUCT_DETAIL", "SERVICE_DETAIL", "CUSTOMER_CASE", "TECHNICAL_PROOF", "CERTIFICATION", "FAQ"].includes(type)) return [];
    return [{ type, severity: String(record.severity ?? "MEDIUM"), reason: String(record.reason ?? `knowledge.intelligence.gapReasons.${type}`), sourceCount: Number(record.sourceCount ?? 0) } as CompanyKnowledgeProfile["missingKnowledge"][number]];
  });
}

export function toKnowledgeProfile(row: KnowledgeDatabaseRow): CompanyKnowledgeProfile {
  const businessType = String(row.businessType ?? "");
  return {
    id: String(row.id), projectId: String(row.projectId), companySummary: row.companySummary ? String(row.companySummary) : null,
    industry: row.industry ? String(row.industry) : null,
    businessType: businessType === "PRODUCT" || businessType === "SERVICE" || businessType === "HYBRID" ? businessType : null,
    mainProducts: profileItems(row.mainProducts), mainServices: profileItems(row.mainServices), targetCustomers: profileItems(row.targetCustomers),
    competitiveAdvantages: profileItems(row.competitiveAdvantages), certifications: certifications(row.certifications), customerProof: profileItems(row.customerProof),
    faqTopics: faqTopics(row.faqTopics), missingKnowledge: missingKnowledge(row.missingKnowledge), confidence: nullableNumber(row.confidence),
    status: knowledgeStatus(row.status), methodVersion: String(row.methodVersion ?? "rules-v1"), createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt),
  };
}

function toChunk(row: KnowledgeDatabaseRow): KnowledgeChunk {
  return { id: String(row.id), projectId: String(row.projectId), documentId: String(row.documentId), content: String(row.content ?? ""), hash: String(row.hash ?? ""), order: Number(row.order ?? 0), tokenCount: Number(row.tokenCount ?? 0), confidence: nullableNumber(row.confidence), createdAt: isoDate(row.createdAt) };
}

export const knowledgeRepository = {
  async projectOwned(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]);
    return Boolean(rows[0]);
  },

  async listProjectsForUser(userId: string): Promise<KnowledgeProjectSummary[]> {
    const rows = await knowledgeDatabase().query('SELECT p."id" AS "projectId", p."name" AS "projectName", p."domain" AS "websiteUrl", p."industry", kb.*, (SELECT COUNT(*)::int FROM "ProductEntity" product WHERE product."projectId" = p."id" AND product."status" <> \'ARCHIVED\') AS "productCount", (SELECT COUNT(*)::int FROM "ServiceEntity" service WHERE service."projectId" = p."id" AND service."status" <> \'ARCHIVED\') AS "serviceCount", (SELECT COUNT(*)::int FROM "CustomerCase" customer_case WHERE customer_case."projectId" = p."id" AND customer_case."status" <> \'ARCHIVED\') AS "caseCount", (SELECT COUNT(*)::int FROM "KnowledgeDocument" document WHERE document."projectId" = p."id") AS "documentCount", (SELECT COUNT(*)::int FROM "TechnicalDocument" technical WHERE technical."projectId" = p."id" AND technical."status" <> \'ARCHIVED\') AS "technicalDocumentCount" FROM "Project" p LEFT JOIN "CompanyKnowledgeBase" kb ON kb."projectId" = p."id" WHERE p."userId" = $1 ORDER BY p."updatedAt" DESC', [userId]);
    return rows.map((row) => ({ projectId: String(row.projectId), projectName: String(row.projectName ?? ""), websiteUrl: String(row.websiteUrl ?? ""), industry: String(row.industry ?? ""), knowledgeBase: row.id ? toKnowledgeBase(row) : null, productCount: Number(row.productCount ?? 0), serviceCount: Number(row.serviceCount ?? 0), caseCount: Number(row.caseCount ?? 0), documentCount: Number(row.documentCount ?? 0), technicalDocumentCount: Number(row.technicalDocumentCount ?? 0) }));
  },

  async createForUser(userId: string, projectId: string) {
    const id = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query('WITH owned_project AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), inserted AS (INSERT INTO "CompanyKnowledgeBase" ("id", "projectId", "status", "version", "completenessScore", "understandingScore", "createdAt", "updatedAt") SELECT $3, owned_project."id", \'DRAFT\', 1, 0, NULL, $4, $4 FROM owned_project ON CONFLICT ("projectId") DO NOTHING RETURNING *), existing AS (SELECT kb.* FROM "CompanyKnowledgeBase" kb INNER JOIN owned_project ON owned_project."id" = kb."projectId") SELECT * FROM inserted UNION ALL SELECT * FROM existing LIMIT 1', [projectId, userId, id, now]))[0];
    return row ? toKnowledgeBase(row) : null;
  },

  async findForProject(userId: string, projectId: string) {
    const row = (await knowledgeDatabase().query('SELECT kb.* FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" WHERE kb."projectId" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0];
    return row ? toKnowledgeBase(row) : null;
  },

  async projectIdentity(userId: string, projectId: string) {
    return (await knowledgeDatabase().query('SELECT p."id", p."name", p."domain", p."industry", p."description" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0] ?? null;
  },

  async updateStatusForUser(userId: string, projectId: string, status: KnowledgeStatus) {
    const row = (await knowledgeDatabase().query('UPDATE "CompanyKnowledgeBase" kb SET "status" = $1::"KnowledgeStatus", "updatedAt" = $2 FROM "Project" p WHERE kb."projectId" = $3 AND kb."projectId" = p."id" AND p."userId" = $4 RETURNING kb.*', [status, new Date(), projectId, userId]))[0];
    return row ? toKnowledgeBase(row) : null;
  },

  async listProducts(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT product.* FROM "ProductEntity" product INNER JOIN "Project" p ON p."id" = product."projectId" WHERE product."projectId" = $1 AND p."userId" = $2 AND product."status" <> \'ARCHIVED\' ORDER BY product."updatedAt" DESC', [projectId, userId]);
    return rows.map(toProduct);
  },

  async listServices(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT service.* FROM "ServiceEntity" service INNER JOIN "Project" p ON p."id" = service."projectId" WHERE service."projectId" = $1 AND p."userId" = $2 AND service."status" <> \'ARCHIVED\' ORDER BY service."updatedAt" DESC', [projectId, userId]);
    return rows.map(toService);
  },

  async listCases(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT customer_case.* FROM "CustomerCase" customer_case INNER JOIN "Project" p ON p."id" = customer_case."projectId" WHERE customer_case."projectId" = $1 AND p."userId" = $2 AND customer_case."status" <> \'ARCHIVED\' ORDER BY customer_case."updatedAt" DESC', [projectId, userId]);
    return rows.map(toCase);
  },

  async listDocuments(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT document.* FROM "KnowledgeDocument" document INNER JOIN "Project" p ON p."id" = document."projectId" WHERE document."projectId" = $1 AND p."userId" = $2 ORDER BY document."updatedAt" DESC', [projectId, userId]);
    return rows.map(toDocument);
  },

  async listTechnicalDocuments(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT technical.* FROM "TechnicalDocument" technical INNER JOIN "Project" p ON p."id" = technical."projectId" WHERE technical."projectId" = $1 AND p."userId" = $2 AND technical."status" <> \'ARCHIVED\' ORDER BY technical."updatedAt" DESC', [projectId, userId]);
    return rows.map(toTechnicalDocument);
  },

  async listChunks(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query('SELECT chunk.* FROM "KnowledgeChunk" chunk INNER JOIN "Project" p ON p."id" = chunk."projectId" WHERE chunk."projectId" = $1 AND p."userId" = $2 ORDER BY chunk."documentId", chunk."order"', [projectId, userId]);
    return rows.map(toChunk);
  },

  async findProfileForProject(userId: string, projectId: string) {
    const row = (await knowledgeDatabase().query('SELECT profile.* FROM "CompanyKnowledgeProfile" profile INNER JOIN "Project" p ON p."id" = profile."projectId" WHERE profile."projectId" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0];
    return row ? toKnowledgeProfile(row) : null;
  },

  async upsertProfileForUser(userId: string, profile: KnowledgeProfileDraft) {
    const id = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query(
      'WITH owned_project AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), upserted AS (INSERT INTO "CompanyKnowledgeProfile" ("id", "projectId", "companySummary", "industry", "businessType", "mainProducts", "mainServices", "targetCustomers", "competitiveAdvantages", "certifications", "customerProof", "faqTopics", "missingKnowledge", "confidence", "status", "methodVersion", "createdAt", "updatedAt") SELECT $3, owned_project."id", $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16::"KnowledgeStatus", $17, $18, $18 FROM owned_project ON CONFLICT ("projectId") DO UPDATE SET "companySummary" = EXCLUDED."companySummary", "industry" = EXCLUDED."industry", "businessType" = EXCLUDED."businessType", "mainProducts" = EXCLUDED."mainProducts", "mainServices" = EXCLUDED."mainServices", "targetCustomers" = EXCLUDED."targetCustomers", "competitiveAdvantages" = EXCLUDED."competitiveAdvantages", "certifications" = EXCLUDED."certifications", "customerProof" = EXCLUDED."customerProof", "faqTopics" = EXCLUDED."faqTopics", "missingKnowledge" = EXCLUDED."missingKnowledge", "confidence" = EXCLUDED."confidence", "status" = EXCLUDED."status", "methodVersion" = EXCLUDED."methodVersion", "updatedAt" = EXCLUDED."updatedAt" RETURNING *) SELECT * FROM upserted',
      [profile.projectId, userId, id, profile.companySummary, profile.industry, profile.businessType, JSON.stringify(profile.mainProducts), JSON.stringify(profile.mainServices), JSON.stringify(profile.targetCustomers), JSON.stringify(profile.competitiveAdvantages), JSON.stringify(profile.certifications), JSON.stringify(profile.customerProof), JSON.stringify(profile.faqTopics), JSON.stringify(profile.missingKnowledge), profile.confidence, profile.status, profile.methodVersion, now],
    ))[0];
    return row ? toKnowledgeProfile(row) : null;
  },

  async createProductForUser(userId: string, input: CreateProductInput) {
    const sourceId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query('WITH owned_base AS (SELECT kb."id" AS "knowledgeBaseId", p."id" AS "projectId" FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" WHERE kb."projectId" = $1 AND p."userId" = $2), source AS (INSERT INTO "KnowledgeSource" ("id", "projectId", "knowledgeBaseId", "type", "sourceName", "sourceKey", "confidence", "status", "createdAt", "updatedAt") SELECT $3, owned_base."projectId", owned_base."knowledgeBaseId", \'USER_INPUT\', $5, $4, NULL, \'ACTIVE\', $11, $11 FROM owned_base RETURNING *), inserted AS (INSERT INTO "ProductEntity" ("id", "projectId", "knowledgeBaseId", "sourceId", "name", "category", "description", "features", "applications", "targetCustomers", "confidence", "status", "createdAt", "updatedAt") SELECT $6, source."projectId", source."knowledgeBaseId", source."id", $5, $7, $8, $9::jsonb, $10::jsonb, $12::jsonb, NULL, \'ACTIVE\', $11, $11 FROM source RETURNING *) SELECT * FROM inserted', [input.projectId, userId, sourceId, `user:product:${productId}`, input.name, productId, input.category, input.description, JSON.stringify(input.features), JSON.stringify(input.applications), now, JSON.stringify(input.targetCustomers)]))[0];
    return row ? toProduct(row) : null;
  },

  async createServiceForUser(userId: string, input: CreateServiceInput) {
    const sourceId = crypto.randomUUID();
    const serviceId = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query('WITH owned_base AS (SELECT kb."id" AS "knowledgeBaseId", p."id" AS "projectId" FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" WHERE kb."projectId" = $1 AND p."userId" = $2), source AS (INSERT INTO "KnowledgeSource" ("id", "projectId", "knowledgeBaseId", "type", "sourceName", "sourceKey", "confidence", "status", "createdAt", "updatedAt") SELECT $3, owned_base."projectId", owned_base."knowledgeBaseId", \'USER_INPUT\', $5, $4, NULL, \'ACTIVE\', $9, $9 FROM owned_base RETURNING *), inserted AS (INSERT INTO "ServiceEntity" ("id", "projectId", "knowledgeBaseId", "sourceId", "name", "description", "industries", "confidence", "status", "createdAt", "updatedAt") SELECT $6, source."projectId", source."knowledgeBaseId", source."id", $5, $7, $8::jsonb, NULL, \'ACTIVE\', $9, $9 FROM source RETURNING *) SELECT * FROM inserted', [input.projectId, userId, sourceId, `user:service:${serviceId}`, input.name, serviceId, input.description, JSON.stringify(input.industries), now]))[0];
    return row ? toService(row) : null;
  },

  async createCaseForUser(userId: string, input: CreateCustomerCaseInput) {
    const sourceId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query('WITH owned_base AS (SELECT kb."id" AS "knowledgeBaseId", p."id" AS "projectId" FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" WHERE kb."projectId" = $1 AND p."userId" = $2), source AS (INSERT INTO "KnowledgeSource" ("id", "projectId", "knowledgeBaseId", "type", "sourceName", "sourceKey", "confidence", "status", "createdAt", "updatedAt") SELECT $3, owned_base."projectId", owned_base."knowledgeBaseId", \'USER_INPUT\', $5, $4, NULL, \'ACTIVE\', $12, $12 FROM owned_base RETURNING *), inserted AS (INSERT INTO "CustomerCase" ("id", "projectId", "knowledgeBaseId", "sourceId", "customerName", "industry", "problem", "solution", "result", "metrics", "confidence", "status", "createdAt", "updatedAt") SELECT $6, source."projectId", source."knowledgeBaseId", source."id", $5, $7, $8, $9, $10, $11::jsonb, NULL, \'ACTIVE\', $12, $12 FROM source RETURNING *) SELECT * FROM inserted', [input.projectId, userId, sourceId, `user:case:${caseId}`, input.customerName, caseId, input.industry, input.problem, input.solution, input.result, JSON.stringify(input.metrics), now]))[0];
    return row ? toCase(row) : null;
  },

  async refreshCompletenessForUser(userId: string, projectId: string) {
    const row = (await knowledgeDatabase().query('UPDATE "CompanyKnowledgeBase" kb SET "completenessScore" = (CASE WHEN EXISTS (SELECT 1 FROM "ProductEntity" product WHERE product."projectId" = kb."projectId" AND product."status" <> \'ARCHIVED\') THEN 30 ELSE 0 END) + (CASE WHEN EXISTS (SELECT 1 FROM "ServiceEntity" service WHERE service."projectId" = kb."projectId" AND service."status" <> \'ARCHIVED\') THEN 25 ELSE 0 END) + (CASE WHEN EXISTS (SELECT 1 FROM "CustomerCase" customer_case WHERE customer_case."projectId" = kb."projectId" AND customer_case."status" <> \'ARCHIVED\') THEN 25 ELSE 0 END) + (CASE WHEN EXISTS (SELECT 1 FROM "KnowledgeDocument" document WHERE document."projectId" = kb."projectId") THEN 20 ELSE 0 END), "version" = kb."version" + 1, "updatedAt" = $1 FROM "Project" p WHERE kb."projectId" = $2 AND kb."projectId" = p."id" AND p."userId" = $3 RETURNING kb.*', [new Date(), projectId, userId]))[0];
    return row ? toKnowledgeBase(row) : null;
  },
};
