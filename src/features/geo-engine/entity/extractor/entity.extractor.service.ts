import type { WebsiteEntity, WebsiteEntityType } from "@/features/geo-engine/entity/types/entity.types";
import type { NormalizedPageSnapshot } from "@/features/geo-engine/types/scan.types";

const productKeywords = ["珠宝展示柜", "化妆品展示柜", "博物馆展柜", "商业空间", "展示柜定制"];
const serviceKeywords = ["设计", "制造", "安装", "售后", "定制服务"];
const placeKeywords = ["广州", "广东", "中国"];

function createEntity(input: Omit<WebsiteEntity, "id">): WebsiteEntity {
  return { ...input, id: `entity_${input.projectId}_${input.type}_${input.name}`.replace(/\s+/g, "_") };
}

function dedupeEntities(entities: WebsiteEntity[]) {
  const map = new Map<string, WebsiteEntity>();
  for (const entity of entities) {
    const key = `${entity.type}:${entity.name}`;
    const existing = map.get(key);
    if (!existing || existing.confidence < entity.confidence) {
      map.set(key, entity);
    }
  }
  return [...map.values()];
}

export async function extractEntities(projectId: string, snapshots: NormalizedPageSnapshot[]): Promise<WebsiteEntity[]> {
  const entities: WebsiteEntity[] = [];

  for (const snapshot of snapshots) {
    for (const schema of snapshot.schema) {
      if (["Organization", "Product", "Article"].includes(schema.type)) {
        const type = schema.type as WebsiteEntityType;
        entities.push(createEntity({ projectId, type, name: type === "Organization" ? "广州星河展示柜有限公司" : snapshot.title, description: `${type} detected from structured data on ${snapshot.url}`, source: "schema", confidence: schema.valid ? 92 : 64 }));
      }
    }

    const text = `${snapshot.title} ${snapshot.description} ${snapshot.content}`;
    const organizationMatch = text.match(/[\u4e00-\u9fa5A-Za-z0-9]+有限公司/);
    if (organizationMatch) {
      entities.push(createEntity({ projectId, type: "Organization", name: organizationMatch[0], description: "Company name detected from page text.", source: "text", confidence: 84 }));
    }

    for (const keyword of productKeywords) {
      if (text.includes(keyword)) {
        entities.push(createEntity({ projectId, type: "Product", name: keyword, description: `Product keyword detected on ${snapshot.url}`, source: "text", confidence: 78 }));
      }
    }

    for (const keyword of serviceKeywords) {
      if (text.includes(keyword)) {
        entities.push(createEntity({ projectId, type: "Service", name: keyword, description: `Service signal detected on ${snapshot.url}`, source: "text", confidence: 72 }));
      }
    }

    for (const keyword of placeKeywords) {
      if (text.includes(keyword)) {
        entities.push(createEntity({ projectId, type: "Place", name: keyword, description: `Location signal detected on ${snapshot.url}`, source: "text", confidence: 76 }));
      }
    }
  }

  return dedupeEntities(entities);
}
