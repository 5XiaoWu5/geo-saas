import { aiSearchQueryRepository } from "./query-repository";
import { RealAISearchError } from "./ai-search-execution.service";
import type { AISearchIntent } from "./types";

export async function listAISearchQueries(userId: string, projectId: string) {
  const queries = await aiSearchQueryRepository.list(userId, projectId);
  if (!queries.length) {
    const project = await import("./repository").then(({ realAISearchRepository }) =>
      realAISearchRepository.projectForUser(userId, projectId),
    );
    if (!project) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  }
  return { queries };
}

export async function saveAISearchQuery(
  userId: string,
  projectId: string,
  input: { query: string; intent: AISearchIntent },
) {
  const saved = await aiSearchQueryRepository.upsert(userId, projectId, input);
  if (!saved) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const queries = await aiSearchQueryRepository.list(userId, projectId);
  return queries.find(query => query.id === saved.id)!;
}

export async function archiveAISearchQuery(
  userId: string,
  projectId: string,
  queryId: string,
) {
  const archived = await aiSearchQueryRepository.archive(userId, projectId, queryId);
  if (!archived) throw new RealAISearchError("AI_SEARCH_QUERY_NOT_FOUND", 404);
  return { archived: true };
}
