import { assessKnowledge, unavailableKnowledgeResponse } from "./knowledge-assessment";
import { knowledgeRepository } from "./knowledge.repository";
import { ruleKnowledgeIntelligenceProvider } from "./knowledge-rule-provider";
import { KnowledgeServiceError } from "./knowledge.service";
import type { CompanyKnowledgeProfile, KnowledgeAssessment, KnowledgeIntelligenceResponse } from "./types";

async function requireProject(userId: string, projectId: string) {
  const project = await knowledgeRepository.projectIdentity(userId, projectId);
  if (!project) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  return { id: String(project.id), name: String(project.name ?? ""), websiteUrl: String(project.domain ?? ""), industry: String(project.industry ?? ""), description: String(project.description ?? "") };
}

async function loadInput(userId: string, projectId: string) {
  const project = await requireProject(userId, projectId);
  const knowledgeBase = await knowledgeRepository.findForProject(userId, projectId);
  if (!knowledgeBase) throw new KnowledgeServiceError("KNOWLEDGE_BASE_REQUIRED", 409);
  const [products, services, cases, documents, technicalDocuments, chunks] = await Promise.all([
    knowledgeRepository.listProducts(userId, projectId, true),
    knowledgeRepository.listServices(userId, projectId),
    knowledgeRepository.listCases(userId, projectId),
    knowledgeRepository.listDocuments(userId, projectId),
    knowledgeRepository.listTechnicalDocuments(userId, projectId),
    knowledgeRepository.listChunks(userId, projectId),
  ]);
  return { project, products, services, cases, documents, technicalDocuments, chunks };
}

function assessmentFromProfile(profile: CompanyKnowledgeProfile): KnowledgeAssessment {
  const missing = new Set(profile.missingKnowledge.map((gap) => gap.type));
  const counts = Object.fromEntries([
    "COMPANY_INFO", "PRODUCT_DETAIL", "SERVICE_DETAIL", "CUSTOMER_CASE", "TECHNICAL_PROOF", "CERTIFICATION", "FAQ",
  ].map((type) => [type, missing.has(type as CompanyKnowledgeProfile["missingKnowledge"][number]["type"]) ? 0 : 1])) as Parameters<typeof assessKnowledge>[1];
  return assessKnowledge(profile.projectId, counts, profile.confidence === null ? [] : [profile.confidence]);
}

export async function analyzeCompanyKnowledge(userId: string, projectId: string): Promise<KnowledgeIntelligenceResponse> {
  const input = await loadInput(userId, projectId);
  const output = await ruleKnowledgeIntelligenceProvider.analyze(input);
  const profile = await knowledgeRepository.upsertProfileForUser(userId, output.profile);
  if (!profile) throw new KnowledgeServiceError("PROJECT_FORBIDDEN", 403);
  return { project: input.project, status: output.assessment.status, profile, assessment: output.assessment };
}

export async function getCompanyKnowledgeProfile(userId: string, projectId: string): Promise<KnowledgeIntelligenceResponse> {
  const project = await requireProject(userId, projectId);
  const profile = await knowledgeRepository.findProfileForProject(userId, projectId);
  if (!profile) return unavailableKnowledgeResponse(project);
  if (profile.methodVersion !== ruleKnowledgeIntelligenceProvider.methodVersion) return analyzeCompanyKnowledge(userId, projectId);
  const assessment = assessmentFromProfile(profile);
  return { project, status: assessment.status, profile, assessment };
}

export async function getCompanyKnowledgeAssessment(userId: string, projectId: string): Promise<KnowledgeIntelligenceResponse> {
  const input = await loadInput(userId, projectId);
  const output = await ruleKnowledgeIntelligenceProvider.analyze(input);
  const storedProfile = await knowledgeRepository.findProfileForProject(userId, projectId);
  return { project: input.project, status: output.assessment.status, profile: storedProfile, assessment: output.assessment };
}

export async function getKnowledgeEvidenceForSimulation(userId: string, projectId: string) {
  let profile = await knowledgeRepository.findProfileForProject(userId, projectId);
  if (!profile) return null;
  if (profile.methodVersion !== ruleKnowledgeIntelligenceProvider.methodVersion) profile = (await analyzeCompanyKnowledge(userId, projectId)).profile;
  if (!profile) return null;
  return {
    profileId: profile.id,
    status: profile.status,
    methodVersion: profile.methodVersion,
    confidence: profile.confidence,
    products: profile.mainProducts,
    services: profile.mainServices,
    customerProof: profile.customerProof,
    competitiveAdvantages: profile.competitiveAdvantages,
    certifications: profile.certifications,
    faqTopics: profile.faqTopics,
    missingKnowledge: profile.missingKnowledge,
  };
}
