import type { GeoCampaignCategory, GeoCampaignCluster, GeoCampaignQueryDraft, GeoCampaignPriority } from "./types";

const PRIORITY_WEIGHT: Record<GeoCampaignPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function categoryLabel(category: GeoCampaignCategory) {
  return category;
}

export function clusterGeoQueries(queries: GeoCampaignQueryDraft[]): GeoCampaignCluster[] {
  const groups = new Map<GeoCampaignCategory, GeoCampaignQueryDraft[]>();

  for (const query of queries) {
    const items = groups.get(query.category) ?? [];
    items.push(query);
    groups.set(query.category, items);
  }

  return [...groups.entries()]
    .map(([category, items]) => {
      const queryCount = items.length;
      const queryCoverage = queries.length > 0 ? Math.round((queryCount / queries.length) * 100) : 0;
      const intent = items[0]?.intent ?? "";
      const priority = items.sort((left, right) => PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority])[0]?.priority ?? "medium";
      return {
        category,
        label: categoryLabel(category),
        intent,
        priority,
        queryCount,
        queryCoverage,
        queries: items,
      };
    })
    .sort((left, right) => right.queryCount - left.queryCount || left.category.localeCompare(right.category));
}

export function summarizeClusterCoverage(clusters: GeoCampaignCluster[]) {
  return clusters.reduce((total, cluster) => total + cluster.queryCoverage, 0);
}

