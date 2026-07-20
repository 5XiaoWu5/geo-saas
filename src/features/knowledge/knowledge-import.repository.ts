import { isoDate, jsonArray, jsonValueArray, knowledgeDatabase, nullableNumber, type KnowledgeDatabaseRow } from "./database";
import type { KnowledgeChunk, KnowledgeDocument, ProductEntity } from "./types";
import type { ExtractedEvidenceItem, ExtractedFAQSuggestion, ExtractedProductSuggestion, KnowledgeExtractionDraft, KnowledgeExtractionResult, KnowledgeImportJob, KnowledgeImportSourceType, KnowledgeImportStatus } from "./knowledge-document-intelligence.types";

type ImportMetadata = { projectId: string; sourceType: KnowledgeImportSourceType; fileName: string; mimeType: string; size: number; url?: string | null };
type StoredChunk = { id: string; content: string; hash: string; order: number; tokenCount: number; confidence: number };

function importStatus(value: unknown): KnowledgeImportStatus {
  const status = String(value ?? "FAILED");
  return ["UPLOADING", "PROCESSING", "COMPLETED", "FAILED"].includes(status) ? status as KnowledgeImportStatus : "FAILED";
}

function evidenceItems(value: unknown): ExtractedEvidenceItem[] {
  return jsonValueArray(value).flatMap((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const text = String(row.value ?? "");
    return text ? [{ value: text, sourceChunkId: String(row.sourceChunkId ?? ""), status: "DRAFT" as const }] : [];
  });
}

function extractedProducts(value: unknown): ExtractedProductSuggestion[] {
  return jsonValueArray(value).flatMap((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const name = String(row.name ?? "");
    return name ? [{ name, type: String(row.type ?? ""), description: String(row.description ?? ""), technicalParameters: jsonArray(row.technicalParameters), advantages: jsonArray(row.advantages), features: jsonArray(row.features), applications: jsonArray(row.applications), targetCustomers: jsonArray(row.targetCustomers), solves: jsonArray(row.solves), confidence: Number(row.confidence ?? 0), evidenceChunkIds: jsonArray(row.evidenceChunkIds), status: "DRAFT" as const }] : [];
  });
}

function extractedFaq(value: unknown): ExtractedFAQSuggestion[] {
  return jsonValueArray(value).flatMap((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const question = String(row.question ?? "");
    const answer = String(row.answer ?? "");
    return question && answer ? [{ question, answer, sourceChunkId: String(row.sourceChunkId ?? ""), status: "DRAFT" as const }] : [];
  });
}

function toExtraction(row: KnowledgeDatabaseRow): KnowledgeExtractionResult {
  return {
    id: String(row.extractionId ?? row.id), projectId: String(row.projectId), importJobId: String(row.importJobId), sourceDocumentId: String(row.sourceDocumentId),
    extractedProducts: extractedProducts(row.extractedProducts), extractedAdvantages: evidenceItems(row.extractedAdvantages), extractedFeatures: evidenceItems(row.extractedFeatures),
    extractedApplications: evidenceItems(row.extractedApplications), extractedCustomers: evidenceItems(row.extractedCustomers), extractedFAQ: extractedFaq(row.extractedFAQ),
    confidence: nullableNumber(row.confidence), createdAt: isoDate(row.extractionCreatedAt ?? row.createdAt), updatedAt: isoDate(row.extractionUpdatedAt ?? row.updatedAt),
  };
}

function toImportJob(row: KnowledgeDatabaseRow): KnowledgeImportJob {
  return {
    id: String(row.id), projectId: String(row.projectId), sourceDocumentId: String(row.sourceDocumentId), sourceType: String(row.sourceType) as KnowledgeImportSourceType,
    fileName: String(row.fileName ?? ""), mimeType: String(row.mimeType ?? ""), status: importStatus(row.status), progress: Number(row.progress ?? 0), errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt), extraction: row.extractionId ? toExtraction(row) : null,
  };
}

function toDocument(row: KnowledgeDatabaseRow): KnowledgeDocument {
  return { id: String(row.documentId ?? row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), name: String(row.documentName ?? row.name ?? ""), mimeType: String(row.documentMimeType ?? row.mimeType ?? ""), size: Number(row.documentSize ?? row.size ?? 0), processingStatus: String(row.processingStatus ?? "PENDING") as KnowledgeDocument["processingStatus"], extractedTextStatus: String(row.extractedTextStatus ?? "PENDING") as KnowledgeDocument["extractedTextStatus"], createdAt: isoDate(row.documentCreatedAt ?? row.createdAt), updatedAt: isoDate(row.documentUpdatedAt ?? row.updatedAt) };
}

function toChunk(row: KnowledgeDatabaseRow): KnowledgeChunk {
  return { id: String(row.id), projectId: String(row.projectId), documentId: String(row.documentId), content: String(row.content ?? ""), hash: String(row.hash ?? ""), order: Number(row.order ?? 0), tokenCount: Number(row.tokenCount ?? 0), confidence: nullableNumber(row.confidence), createdAt: isoDate(row.createdAt) };
}

function toProduct(row: KnowledgeDatabaseRow): ProductEntity {
  return { id: String(row.id), projectId: String(row.projectId), sourceId: String(row.sourceId), name: String(row.name ?? ""), category: String(row.category ?? ""), description: String(row.description ?? ""), features: jsonArray(row.features), applications: jsonArray(row.applications), targetCustomers: jsonArray(row.targetCustomers), confidence: nullableNumber(row.confidence), status: String(row.status ?? "DRAFT") as ProductEntity["status"], createdAt: isoDate(row.createdAt), updatedAt: isoDate(row.updatedAt) };
}

const extractionColumns = 'extraction."id" AS "extractionId", extraction."importJobId", extraction."extractedProducts", extraction."extractedAdvantages", extraction."extractedFeatures", extraction."extractedApplications", extraction."extractedCustomers", extraction."extractedFAQ", extraction."confidence", extraction."createdAt" AS "extractionCreatedAt", extraction."updatedAt" AS "extractionUpdatedAt"';

export const knowledgeImportRepository = {
  async createMetadata(userId: string, input: ImportMetadata) {
    const jobId = crypto.randomUUID();
    const sourceId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const now = new Date();
    const sourceKind = input.sourceType === "FILE" ? "FILE_UPLOAD" : "WEBSITE_CRAWL";
    const row = (await knowledgeDatabase().query(
      `WITH owned_base AS (SELECT kb."id" AS "knowledgeBaseId", p."id" AS "projectId" FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" WHERE p."id" = $1 AND p."userId" = $2),
      source AS (INSERT INTO "KnowledgeSource" ("id", "projectId", "knowledgeBaseId", "type", "sourceName", "sourceKey", "url", "status", "createdAt", "updatedAt") SELECT $3, "projectId", "knowledgeBaseId", $4::"KnowledgeSourceType", $5, $6, $7, 'DRAFT', $8, $8 FROM owned_base RETURNING *),
      document AS (INSERT INTO "KnowledgeDocument" ("id", "projectId", "knowledgeBaseId", "sourceId", "name", "mimeType", "size", "processingStatus", "extractedTextStatus", "createdAt", "updatedAt") SELECT $9, source."projectId", source."knowledgeBaseId", source."id", $5, $10, $11, 'PENDING', 'PENDING', $8, $8 FROM source RETURNING *),
      job AS (INSERT INTO "KnowledgeImportJob" ("id", "projectId", "sourceDocumentId", "sourceType", "fileName", "mimeType", "status", "progress", "createdAt", "updatedAt") SELECT $12, document."projectId", document."id", $13::"KnowledgeImportSourceType", $5, $10, 'UPLOADING', 5, $8, $8 FROM document RETURNING *) SELECT * FROM job`,
      [input.projectId, userId, sourceId, sourceKind, input.fileName, `import:${jobId}`, input.url ?? null, now, documentId, input.mimeType, input.size, jobId, input.sourceType],
    ))[0];
    return row ? toImportJob(row) : null;
  },

  async storeChunks(userId: string, projectId: string, jobId: string, chunks: StoredChunk[]) {
    const now = new Date();
    const row = (await knowledgeDatabase().query(
      `WITH owned_job AS (SELECT job.* FROM "KnowledgeImportJob" job INNER JOIN "Project" p ON p."id" = job."projectId" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3),
      removed AS (DELETE FROM "KnowledgeChunk" chunk USING owned_job WHERE chunk."documentId" = owned_job."sourceDocumentId"),
      inserted AS (INSERT INTO "KnowledgeChunk" ("id", "projectId", "documentId", "content", "hash", "order", "tokenCount", "confidence", "createdAt") SELECT item."id", owned_job."projectId", owned_job."sourceDocumentId", item."content", item."hash", item."order", item."tokenCount", item."confidence", $4 FROM owned_job CROSS JOIN jsonb_to_recordset($5::jsonb) AS item("id" text, "content" text, "hash" text, "order" int, "tokenCount" int, "confidence" int) RETURNING *),
      document AS (UPDATE "KnowledgeDocument" document SET "processingStatus" = 'PROCESSING', "extractedTextStatus" = 'READY', "updatedAt" = $4 FROM owned_job WHERE document."id" = owned_job."sourceDocumentId" RETURNING document.*),
      updated AS (UPDATE "KnowledgeImportJob" job SET "status" = 'PROCESSING', "progress" = 65, "errorMessage" = NULL, "updatedAt" = $4 FROM owned_job WHERE job."id" = owned_job."id" RETURNING job.*) SELECT * FROM updated`,
      [jobId, projectId, userId, now, JSON.stringify(chunks)],
    ))[0];
    return row ? toImportJob(row) : null;
  },

  async listForProject(userId: string, projectId: string) {
    const rows = await knowledgeDatabase().query(`SELECT job.*, ${extractionColumns} FROM "KnowledgeImportJob" job INNER JOIN "Project" p ON p."id" = job."projectId" LEFT JOIN "KnowledgeExtractionResult" extraction ON extraction."importJobId" = job."id" WHERE job."projectId" = $1 AND p."userId" = $2 ORDER BY job."createdAt" DESC`, [projectId, userId]);
    return rows.map(toImportJob);
  },

  async findForProject(userId: string, projectId: string, jobId: string) {
    const row = (await knowledgeDatabase().query(`SELECT job.*, ${extractionColumns} FROM "KnowledgeImportJob" job INNER JOIN "Project" p ON p."id" = job."projectId" LEFT JOIN "KnowledgeExtractionResult" extraction ON extraction."importJobId" = job."id" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3 LIMIT 1`, [jobId, projectId, userId]))[0];
    return row ? toImportJob(row) : null;
  },

  async loadDocumentInput(userId: string, projectId: string, jobId: string) {
    const documentRow = (await knowledgeDatabase().query('SELECT document."id" AS "documentId", document."projectId", document."sourceId", document."name" AS "documentName", document."mimeType" AS "documentMimeType", document."size" AS "documentSize", document."processingStatus", document."extractedTextStatus", document."createdAt" AS "documentCreatedAt", document."updatedAt" AS "documentUpdatedAt" FROM "KnowledgeImportJob" job INNER JOIN "KnowledgeDocument" document ON document."id" = job."sourceDocumentId" AND document."projectId" = job."projectId" INNER JOIN "Project" p ON p."id" = job."projectId" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3 LIMIT 1', [jobId, projectId, userId]))[0];
    if (!documentRow) return null;
    const chunkRows = await knowledgeDatabase().query('SELECT chunk.* FROM "KnowledgeChunk" chunk INNER JOIN "Project" p ON p."id" = chunk."projectId" WHERE chunk."documentId" = $1 AND chunk."projectId" = $2 AND p."userId" = $3 ORDER BY chunk."order"', [documentRow.documentId, projectId, userId]);
    return { document: toDocument(documentRow), chunks: chunkRows.map(toChunk) };
  },

  async complete(userId: string, projectId: string, jobId: string, draft: KnowledgeExtractionDraft) {
    const id = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query(
      `WITH owned_job AS (SELECT job.* FROM "KnowledgeImportJob" job INNER JOIN "Project" p ON p."id" = job."projectId" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3),
      extraction AS (INSERT INTO "KnowledgeExtractionResult" ("id", "projectId", "importJobId", "sourceDocumentId", "extractedProducts", "extractedAdvantages", "extractedFeatures", "extractedApplications", "extractedCustomers", "extractedFAQ", "confidence", "createdAt", "updatedAt") SELECT $4, owned_job."projectId", owned_job."id", owned_job."sourceDocumentId", $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $12 FROM owned_job ON CONFLICT ("importJobId") DO UPDATE SET "extractedProducts" = EXCLUDED."extractedProducts", "extractedAdvantages" = EXCLUDED."extractedAdvantages", "extractedFeatures" = EXCLUDED."extractedFeatures", "extractedApplications" = EXCLUDED."extractedApplications", "extractedCustomers" = EXCLUDED."extractedCustomers", "extractedFAQ" = EXCLUDED."extractedFAQ", "confidence" = EXCLUDED."confidence", "updatedAt" = EXCLUDED."updatedAt" RETURNING *),
      document AS (UPDATE "KnowledgeDocument" document SET "processingStatus" = 'READY', "extractedTextStatus" = 'READY', "updatedAt" = $12 FROM owned_job WHERE document."id" = owned_job."sourceDocumentId" RETURNING document.*),
      updated AS (UPDATE "KnowledgeImportJob" job SET "status" = 'COMPLETED', "progress" = 100, "errorMessage" = NULL, "updatedAt" = $12 FROM owned_job WHERE job."id" = owned_job."id" RETURNING job.*) SELECT updated.*, extraction."id" AS "extractionId", extraction."importJobId", extraction."extractedProducts", extraction."extractedAdvantages", extraction."extractedFeatures", extraction."extractedApplications", extraction."extractedCustomers", extraction."extractedFAQ", extraction."confidence", extraction."createdAt" AS "extractionCreatedAt", extraction."updatedAt" AS "extractionUpdatedAt" FROM updated CROSS JOIN extraction`,
      [jobId, projectId, userId, id, JSON.stringify(draft.extractedProducts), JSON.stringify(draft.extractedAdvantages), JSON.stringify(draft.extractedFeatures), JSON.stringify(draft.extractedApplications), JSON.stringify(draft.extractedCustomers), JSON.stringify(draft.extractedFAQ), draft.confidence, now],
    ))[0];
    return row ? toImportJob(row) : null;
  },

  async fail(userId: string, projectId: string, jobId: string, errorMessage: string) {
    const now = new Date();
    const row = (await knowledgeDatabase().query(`WITH owned_job AS (SELECT job.* FROM "KnowledgeImportJob" job INNER JOIN "Project" p ON p."id" = job."projectId" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3), document AS (UPDATE "KnowledgeDocument" document SET "processingStatus" = 'FAILED', "extractedTextStatus" = 'FAILED', "updatedAt" = $4 FROM owned_job WHERE document."id" = owned_job."sourceDocumentId" RETURNING document.*) UPDATE "KnowledgeImportJob" job SET "status" = 'FAILED', "errorMessage" = $5, "updatedAt" = $4 FROM owned_job WHERE job."id" = owned_job."id" RETURNING job.*`, [jobId, projectId, userId, now, errorMessage]))[0];
    return row ? toImportJob(row) : null;
  },

  async createDraftProduct(userId: string, projectId: string, jobId: string, product: ExtractedProductSuggestion) {
    const id = crypto.randomUUID();
    const now = new Date();
    const row = (await knowledgeDatabase().query(
      `WITH owned_source AS (SELECT document."sourceId", document."knowledgeBaseId" FROM "KnowledgeImportJob" job INNER JOIN "KnowledgeDocument" document ON document."id" = job."sourceDocumentId" AND document."projectId" = job."projectId" INNER JOIN "Project" p ON p."id" = job."projectId" WHERE job."id" = $1 AND job."projectId" = $2 AND p."userId" = $3),
      existing AS (SELECT product.* FROM "ProductEntity" product INNER JOIN owned_source ON owned_source."sourceId" = product."sourceId" WHERE product."projectId" = $2 AND LOWER(product."name") = LOWER($4) LIMIT 1),
      inserted AS (INSERT INTO "ProductEntity" ("id", "projectId", "knowledgeBaseId", "sourceId", "name", "category", "description", "features", "applications", "targetCustomers", "confidence", "status", "createdAt", "updatedAt") SELECT $5, $2, owned_source."knowledgeBaseId", owned_source."sourceId", $4, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, 'DRAFT', $12, $12 FROM owned_source WHERE NOT EXISTS (SELECT 1 FROM existing) RETURNING *) SELECT *, TRUE AS "created" FROM inserted UNION ALL SELECT *, FALSE AS "created" FROM existing LIMIT 1`,
      [jobId, projectId, userId, product.name, id, product.type || "待确认", product.description || product.solves.join("；"), JSON.stringify([...product.features, ...product.technicalParameters, ...product.advantages]), JSON.stringify(product.applications), JSON.stringify(product.targetCustomers), product.confidence, now],
    ))[0];
    return row ? { product: toProduct(row), created: Boolean(row.created) } : null;
  },
};
