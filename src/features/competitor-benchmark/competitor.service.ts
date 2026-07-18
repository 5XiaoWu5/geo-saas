import { competitorRepository, isUniqueConstraintError } from "./competitor.repository";
import type { CompetitorCreateInput, CompetitorProfile, CompetitorUpdateInput } from "./types";

export class CompetitorServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function normalizeDomain(value: string) {
  const trimmed = value.trim();
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new CompetitorServiceError("INVALID_DOMAIN", 400);
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!hostname || !hostname.includes(".") || hostname.length > 253) throw new CompetitorServiceError("INVALID_DOMAIN", 400);
  return hostname;
}

function cleanText(value: string | undefined, maxLength: number) {
  return (value ?? "").trim().slice(0, maxLength);
}

export async function listCompetitors(userId: string, projectId: string) {
  if (!projectId) throw new CompetitorServiceError("PROJECT_REQUIRED", 400);
  if (!(await competitorRepository.projectOwned(userId, projectId))) throw new CompetitorServiceError("PROJECT_FORBIDDEN", 403);
  return competitorRepository.listForProject(userId, projectId);
}

export async function getCompetitor(userId: string, competitorId: string) {
  const competitor = await competitorRepository.findByIdForUser(userId, competitorId);
  if (!competitor) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
  return competitor;
}

export async function createCompetitor(userId: string, input: CompetitorCreateInput) {
  const normalizedDomain = normalizeDomain(input.domain);
  const data: Omit<CompetitorProfile, "createdAt" | "updatedAt"> = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: cleanText(input.name, 160),
    domain: normalizedDomain,
    normalizedDomain,
    industry: cleanText(input.industry, 160),
    region: cleanText(input.region, 160),
    status: "ACTIVE",
    metadata: input.metadata ?? {},
  };
  if (!data.projectId || !data.name) throw new CompetitorServiceError("INVALID_COMPETITOR_INPUT", 400);
  try {
    const competitor = await competitorRepository.createForUser(userId, data);
    if (!competitor) throw new CompetitorServiceError("PROJECT_FORBIDDEN", 403);
    return competitor;
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new CompetitorServiceError("COMPETITOR_DOMAIN_EXISTS", 409);
    throw error;
  }
}

export async function updateCompetitor(userId: string, competitorId: string, input: CompetitorUpdateInput) {
  const current = await getCompetitor(userId, competitorId);
  const normalizedDomain = input.domain === undefined ? current.normalizedDomain : normalizeDomain(input.domain);
  const data: Omit<CompetitorProfile, "createdAt" | "updatedAt"> = {
    ...current,
    name: input.name === undefined ? current.name : cleanText(input.name, 160),
    domain: normalizedDomain,
    normalizedDomain,
    industry: input.industry === undefined ? current.industry : cleanText(input.industry, 160),
    region: input.region === undefined ? current.region : cleanText(input.region, 160),
    status: input.status ?? current.status,
    metadata: input.metadata ?? current.metadata,
  };
  if (!data.name) throw new CompetitorServiceError("INVALID_COMPETITOR_INPUT", 400);
  try {
    const competitor = await competitorRepository.updateForUser(userId, data);
    if (!competitor) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
    return competitor;
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new CompetitorServiceError("COMPETITOR_DOMAIN_EXISTS", 409);
    throw error;
  }
}

export async function deleteCompetitor(userId: string, competitorId: string) {
  if (!(await competitorRepository.deleteForUser(userId, competitorId))) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
  return { deleted: true };
}
