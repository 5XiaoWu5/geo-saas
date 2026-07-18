import { knowledgeRepository } from "./knowledge.repository";
import type { CreateCustomerCaseInput, CreateProductInput, CreateServiceInput, KnowledgeStatus, KnowledgeWorkspace } from "./types";

export class KnowledgeServiceError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

async function requireProject(userId: string, projectId: string) {
  const project = await knowledgeRepository.projectIdentity(userId, projectId);
  if (!project) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  return project;
}

async function requireKnowledgeBase(userId: string, projectId: string) {
  await requireProject(userId, projectId);
  const knowledgeBase = await knowledgeRepository.findForProject(userId, projectId);
  if (!knowledgeBase) throw new KnowledgeServiceError("KNOWLEDGE_BASE_REQUIRED", 409);
  return knowledgeBase;
}

export async function listKnowledgeProjects(userId: string) {
  return { projects: await knowledgeRepository.listProjectsForUser(userId) };
}

export async function createKnowledgeBase(userId: string, projectId: string) {
  await requireProject(userId, projectId);
  const knowledgeBase = await knowledgeRepository.createForUser(userId, projectId);
  if (!knowledgeBase) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  return knowledgeBase;
}

export async function updateKnowledgeBaseStatus(userId: string, projectId: string, status: KnowledgeStatus) {
  await requireKnowledgeBase(userId, projectId);
  const knowledgeBase = await knowledgeRepository.updateStatusForUser(userId, projectId, status);
  if (!knowledgeBase) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  return knowledgeBase;
}

export async function getKnowledgeWorkspace(userId: string, projectId: string): Promise<KnowledgeWorkspace> {
  const project = await requireProject(userId, projectId);
  const knowledgeBase = await requireKnowledgeBase(userId, projectId);
  const [products, services, cases, documents, technicalDocuments] = await Promise.all([
    knowledgeRepository.listProducts(userId, projectId),
    knowledgeRepository.listServices(userId, projectId),
    knowledgeRepository.listCases(userId, projectId),
    knowledgeRepository.listDocuments(userId, projectId),
    knowledgeRepository.listTechnicalDocuments(userId, projectId),
  ]);
  return { project: { id: String(project.id), name: String(project.name ?? ""), websiteUrl: String(project.domain ?? ""), industry: String(project.industry ?? "") }, knowledgeBase, products, services, cases, documents, technicalDocuments };
}

export async function createProduct(userId: string, input: CreateProductInput) {
  await requireKnowledgeBase(userId, input.projectId);
  const product = await knowledgeRepository.createProductForUser(userId, input);
  if (!product) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  await knowledgeRepository.refreshCompletenessForUser(userId, input.projectId);
  return product;
}

export async function createService(userId: string, input: CreateServiceInput) {
  await requireKnowledgeBase(userId, input.projectId);
  const service = await knowledgeRepository.createServiceForUser(userId, input);
  if (!service) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  await knowledgeRepository.refreshCompletenessForUser(userId, input.projectId);
  return service;
}

export async function createCustomerCase(userId: string, input: CreateCustomerCaseInput) {
  await requireKnowledgeBase(userId, input.projectId);
  const customerCase = await knowledgeRepository.createCaseForUser(userId, input);
  if (!customerCase) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  await knowledgeRepository.refreshCompletenessForUser(userId, input.projectId);
  return customerCase;
}
