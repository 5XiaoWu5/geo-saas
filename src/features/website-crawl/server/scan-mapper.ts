import type { WebsiteScan } from "@/features/website-crawl/types";

export function toWebsiteScan(row: Record<string, unknown>): WebsiteScan {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt));
  const schemaTypes = Array.isArray(row.schemaTypes) ? row.schemaTypes.map(String) : [];

  return {
    id: String(row.id),
    projectId: String(row.projectId),
    url: String(row.url),
    status: String(row.status) as WebsiteScan["status"],
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    h1Count: Number(row.h1Count ?? 0),
    h2Count: Number(row.h2Count ?? 0),
    internalLinkCount: Number(row.internalLinkCount ?? 0),
    externalLinkCount: Number(row.externalLinkCount ?? 0),
    schemaCount: Number(row.schemaCount ?? 0),
    schemaTypes,
    robotsExists: Boolean(row.robotsExists),
    sitemapExists: Boolean(row.sitemapExists),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
