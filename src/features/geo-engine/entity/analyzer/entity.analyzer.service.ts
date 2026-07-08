import type { EntityAnalysis, EntityScore, WebsiteEntity } from "@/features/geo-engine/entity/types/entity.types";

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzeEntities(entities: WebsiteEntity[]): Promise<EntityAnalysis> {
  const organizations = entities.filter((entity) => entity.type === "Organization");
  const products = entities.filter((entity) => entity.type === "Product");
  const services = entities.filter((entity) => entity.type === "Service");
  const places = entities.filter((entity) => entity.type === "Place");
  const articles = entities.filter((entity) => entity.type === "Article");
  const issues: string[] = [];
  const recommendations: string[] = [];
  const evidence: string[] = [];

  const brandPresence = clamp(organizations.length ? 72 + Math.min(20, organizations.length * 8) : 35);
  const organizationCompleteness = clamp((organizations.some((entity) => entity.source === "schema") ? 45 : 0) + (organizations.length ? 25 : 0) + (places.length ? 15 : 0) + (services.length ? 10 : 0));
  const authorSignals = clamp(articles.length ? 70 : 42);
  const relationshipSignals = clamp(40 + Math.min(25, products.length * 5) + Math.min(20, services.length * 4) + Math.min(15, places.length * 5));
  const score: EntityScore = { brandPresence, organizationCompleteness, authorSignals, relationshipSignals, overall: clamp(brandPresence * 0.32 + organizationCompleteness * 0.32 + authorSignals * 0.14 + relationshipSignals * 0.22) };

  if (!organizations.length) {
    issues.push("Organization entity is missing.");
    recommendations.push("Add consistent company name and Organization schema across key pages.");
  } else {
    evidence.push(`Detected ${organizations.length} organization entity signal(s).`);
  }

  if (!products.length) {
    issues.push("Product entities are weak or missing.");
    recommendations.push("Mention core product categories clearly on commercial pages.");
  } else {
    evidence.push(`Detected ${products.length} product entity signal(s).`);
  }

  if (!places.length) {
    issues.push("Location entity is missing.");
    recommendations.push("Add address, city, and service area signals to About and Contact pages.");
  }

  if (!articles.length) {
    recommendations.push("Add authored article schema or publisher signals for educational content.");
  }

  return { entities, score, issues, recommendations, evidence };
}
