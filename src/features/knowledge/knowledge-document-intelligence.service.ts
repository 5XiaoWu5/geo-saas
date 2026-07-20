import { analyzeCompanyKnowledge } from "./knowledge-intelligence.service";
import { knowledgeImportRepository } from "./knowledge-import.repository";
import { knowledgeRepository } from "./knowledge.repository";
import { DocumentParseError, extractDocumentText, extractWebsiteText, normalizedMimeType, splitKnowledgeChunks, supportedDocument } from "./document-file-parser";
import { ruleKnowledgeDocumentIntelligenceProvider } from "./knowledge-document-rule-provider";
import type { ConfirmProductResponse, KnowledgeImportJob, KnowledgeImportWorkspaceResponse } from "./knowledge-document-intelligence.types";

export class KnowledgeImportServiceError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

export async function listKnowledgeImports(userId: string, projectId: string): Promise<KnowledgeImportWorkspaceResponse> {
  const project = await knowledgeRepository.projectIdentity(userId, projectId);
  if (!project) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
  return {
    project: { id: String(project.id), name: String(project.name ?? ""), websiteUrl: String(project.domain ?? "") },
    jobs: await knowledgeImportRepository.listForProject(userId, projectId),
  };
}

export async function importKnowledgeFile(userId: string, projectId: string, file: File) {
  if (!file.name || !supportedDocument(file.name)) throw new KnowledgeImportServiceError("UNSUPPORTED_FILE_TYPE", 415);
  const metadata = await createMetadata(userId, { projectId, sourceType: "FILE", fileName: file.name, mimeType: normalizedMimeType(file.name, file.type), size: file.size });
  try {
    const text = await extractDocumentText(file.name, new Uint8Array(await file.arrayBuffer()));
    return await storeParsedText(userId, projectId, metadata, text);
  } catch (error) {
    await failImport(userId, projectId, metadata.id, errorCode(error));
    throw importError(error);
  }
}

export async function importKnowledgeWebsite(userId: string, projectId: string, url: string) {
  const fallbackName = websiteName(url);
  const metadata = await createMetadata(userId, { projectId, sourceType: "WEBSITE_URL", fileName: fallbackName, mimeType: "text/html", size: 0, url });
  try {
    const website = await extractWebsiteText(url);
    return await storeParsedText(userId, projectId, metadata, website.text);
  } catch (error) {
    await failImport(userId, projectId, metadata.id, errorCode(error));
    throw importError(error);
  }
}

export async function processKnowledgeImport(userId: string, projectId: string, jobId: string) {
  const job = await knowledgeImportRepository.findForProject(userId, projectId, jobId);
  if (!job) throw new KnowledgeImportServiceError("IMPORT_NOT_FOUND", 404);
  const input = await knowledgeImportRepository.loadDocumentInput(userId, projectId, jobId);
  if (!input) throw new KnowledgeImportServiceError("IMPORT_NOT_FOUND", 404);
  if (!input.chunks.length) throw new KnowledgeImportServiceError("DOCUMENT_TEXT_REQUIRED", 409);
  try {
    const draft = await ruleKnowledgeDocumentIntelligenceProvider.extract(input);
    await analyzeCompanyKnowledge(userId, projectId);
    const completed = await knowledgeImportRepository.complete(userId, projectId, jobId, draft);
    if (!completed) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
    return completed;
  } catch (error) {
    await failImport(userId, projectId, jobId, errorCode(error));
    throw error instanceof KnowledgeImportServiceError ? error : new KnowledgeImportServiceError("EXTRACTION_FAILED", 422);
  }
}

export async function confirmExtractedProduct(userId: string, projectId: string, jobId: string, productIndex: number): Promise<ConfirmProductResponse> {
  const job = await knowledgeImportRepository.findForProject(userId, projectId, jobId);
  if (!job) throw new KnowledgeImportServiceError("IMPORT_NOT_FOUND", 404);
  const suggestion = job.extraction?.extractedProducts[productIndex];
  if (!suggestion) throw new KnowledgeImportServiceError("PRODUCT_SUGGESTION_NOT_FOUND", 404);
  const result = await knowledgeImportRepository.createDraftProduct(userId, projectId, jobId, suggestion);
  if (!result) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
  await analyzeCompanyKnowledge(userId, projectId);
  return result;
}

async function createMetadata(userId: string, input: { projectId: string; sourceType: "FILE" | "WEBSITE_URL"; fileName: string; mimeType: string; size: number; url?: string }) {
  const base = await knowledgeRepository.createForUser(userId, input.projectId);
  if (!base) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
  const job = await knowledgeImportRepository.createMetadata(userId, input);
  if (!job) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
  return job;
}

async function storeParsedText(userId: string, projectId: string, job: KnowledgeImportJob, text: string) {
  const contents = splitKnowledgeChunks(text);
  if (!contents.length) throw new KnowledgeImportServiceError("NO_EXTRACTABLE_TEXT", 422);
  const chunks = await Promise.all(contents.map(async (content, order) => ({ id: crypto.randomUUID(), content, hash: await sha256(content), order, tokenCount: approximateTokens(content), confidence: 90 })));
  const updated = await knowledgeImportRepository.storeChunks(userId, projectId, job.id, chunks);
  if (!updated) throw new KnowledgeImportServiceError("PROJECT_FORBIDDEN", 403);
  return updated;
}

async function failImport(userId: string, projectId: string, jobId: string, code: string) {
  try { await knowledgeImportRepository.fail(userId, projectId, jobId, code); } catch { /* 保留原始解析错误。 */ }
}

function importError(error: unknown) {
  if (error instanceof KnowledgeImportServiceError) return error;
  if (error instanceof DocumentParseError) {
    const status = error.code === "FILE_TOO_LARGE" || error.code === "WEBSITE_TOO_LARGE" ? 413 : error.code === "UNSUPPORTED_FILE_TYPE" ? 415 : error.code.includes("URL") ? 400 : 422;
    return new KnowledgeImportServiceError(error.code, status);
  }
  return new KnowledgeImportServiceError("IMPORT_FAILED", 422);
}

function errorCode(error: unknown) { return error instanceof KnowledgeImportServiceError || error instanceof DocumentParseError ? error.code : "IMPORT_FAILED"; }
function approximateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)); }
async function sha256(text: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
function websiteName(value: string) { try { return `${new URL(value).hostname || "website"}.html`; } catch { return "website.html"; } }
