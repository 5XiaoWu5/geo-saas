import { realAISearchDatabase, type Row } from "@/features/real-ai-search/database";
import type {
  AIPresenceEvidenceStatus,
  AIPresencePlatform,
  AIPresenceStatus,
  AIPresenceTaskType,
  AIPresenceTaskView,
  CompanyPresenceProfile,
  DiscoverabilityEvidence,
} from "./types";

const PROFILE_ATTRIBUTE_KEYS = [
  "legalName",
  "phone",
  "email",
  "address",
  "serviceAreas",
  "businessHours",
  "foundedAt",
  "representative",
  "businessType",
  "logoUrl",
  "socialProfiles",
  "trustedSources",
  "factoryName",
  "productionCapacity",
  "materials",
  "certifications",
  "minimumOrderQuantity",
  "exportRegions",
  "factoryAddress",
  "qualityStandards",
  "deliveryLeadTime",
] as const;

const ARRAY_KEYS = new Set(["serviceAreas", "socialProfiles", "trustedSources"]);

function iso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    if (value.startsWith("{") && value.endsWith("}")) {
      return value.slice(1, -1).split(",").map(item => item.replace(/^"|"$/g, "").trim()).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function taskView(row: Row): AIPresenceTaskView {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    taskType: String(row.taskType) as AIPresenceTaskType,
    platform: String(row.platform) as AIPresencePlatform,
    targetUrl: row.targetUrl ? String(row.targetUrl) : null,
    status: String(row.status) as AIPresenceStatus,
    source: String(row.source),
    submittedAt: iso(row.submittedAt),
    verifiedAt: iso(row.verifiedAt),
    evidenceStatus: String(row.evidenceStatus) as AIPresenceEvidenceStatus,
    evidenceSummary: String(row.evidenceSummary ?? ""),
    evidence: jsonObject(row.evidence),
    errorCode: row.errorCode ? String(row.errorCode) : null,
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
  };
}

function attributeMap(rows: Row[]) {
  return new Map(rows.map(row => [String(row.key), String(row.value ?? "")]));
}

export const aiPresenceRepository = {
  async projectAccess(userId: string, projectId: string) {
    const row = (await realAISearchDatabase().query(
      'SELECT "id", "userId" FROM "Project" WHERE "id" = $1 LIMIT 1',
      [projectId],
    ))[0];
    if (!row) return "NOT_FOUND" as const;
    return String(row.userId ?? "") === userId ? "OWNED" as const : "FORBIDDEN" as const;
  },

  async profile(userId: string, projectId: string): Promise<CompanyPresenceProfile | null> {
    const db = realAISearchDatabase();
    const [projectRows, entityRows, attributeRows, productRows, serviceRows] = await Promise.all([
      db.query(
        'SELECT p.* FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1',
        [projectId, userId],
      ),
      db.query(
        'SELECT entity.* FROM "EntityProfile" entity INNER JOIN "Project" p ON p."id" = entity."projectId" WHERE entity."projectId" = $1 AND p."userId" = $2 ORDER BY entity."updatedAt" DESC LIMIT 1',
        [projectId, userId],
      ),
      db.query(
        'SELECT attribute.* FROM "EntityAttribute" attribute INNER JOIN "EntityProfile" entity ON entity."id" = attribute."entityId" INNER JOIN "Project" p ON p."id" = entity."projectId" WHERE entity."projectId" = $1 AND p."userId" = $2 ORDER BY attribute."createdAt" DESC',
        [projectId, userId],
      ),
      db.query(
        'SELECT product."name" FROM "ProductEntity" product INNER JOIN "Project" p ON p."id" = product."projectId" WHERE product."projectId" = $1 AND p."userId" = $2 AND product."status" = \'ACTIVE\' ORDER BY product."updatedAt" DESC',
        [projectId, userId],
      ),
      db.query(
        'SELECT service."name" FROM "ServiceEntity" service INNER JOIN "Project" p ON p."id" = service."projectId" WHERE service."projectId" = $1 AND p."userId" = $2 AND service."status" = \'ACTIVE\' ORDER BY service."updatedAt" DESC',
        [projectId, userId],
      ),
    ]);
    const project = projectRows[0];
    if (!project) return null;
    const entity = entityRows[0] ?? {};
    const attributes = attributeMap(attributeRows);
    const entityProducts = stringArray(entity.products);
    const entityServices = stringArray(entity.services);
    return {
      projectId,
      projectName: String(project.name),
      officialWebsite: String(project.domain ?? ""),
      legalName: attributes.get("legalName") ?? "",
      brandName: String(entity.brandName ?? project.name ?? ""),
      description: String(entity.description ?? project.description ?? ""),
      industry: String(entity.industry ?? project.industry ?? ""),
      region: String(entity.region ?? project.country ?? ""),
      products: [...new Set([...productRows.map(row => String(row.name)), ...entityProducts])],
      services: [...new Set([...serviceRows.map(row => String(row.name)), ...entityServices])],
      phone: attributes.get("phone") ?? "",
      email: attributes.get("email") ?? "",
      address: attributes.get("address") ?? "",
      serviceAreas: stringArray(attributes.get("serviceAreas")),
      businessHours: attributes.get("businessHours") ?? "",
      foundedAt: attributes.get("foundedAt") ?? "",
      representative: attributes.get("representative") ?? "",
      businessType: attributes.get("businessType") ?? "",
      logoUrl: attributes.get("logoUrl") ?? "",
      socialProfiles: stringArray(attributes.get("socialProfiles")),
      trustedSources: stringArray(attributes.get("trustedSources")),
      factory: {
        factoryName: attributes.get("factoryName") ?? "",
        productionCapacity: attributes.get("productionCapacity") ?? "",
        materials: attributes.get("materials") ?? "",
        certifications: attributes.get("certifications") ?? "",
        minimumOrderQuantity: attributes.get("minimumOrderQuantity") ?? "",
        exportRegions: attributes.get("exportRegions") ?? "",
        factoryAddress: attributes.get("factoryAddress") ?? "",
        qualityStandards: attributes.get("qualityStandards") ?? "",
        deliveryLeadTime: attributes.get("deliveryLeadTime") ?? "",
      },
      updatedAt: iso(entity.updatedAt ?? project.updatedAt),
    };
  },

  async saveProfile(
    userId: string,
    projectId: string,
    input: Omit<CompanyPresenceProfile, "projectId" | "projectName" | "updatedAt">,
  ) {
    const db = realAISearchDatabase();
    const now = new Date();
    const project = (await db.query(
      'UPDATE "Project" SET "domain" = $3, "description" = $4, "industry" = $5, "updatedAt" = $6 WHERE "id" = $1 AND "userId" = $2 RETURNING "id"',
      [projectId, userId, input.officialWebsite, input.description, input.industry, now],
    ))[0];
    if (!project) return null;
    const existingEntity = (await db.query(
      'SELECT entity."id" FROM "EntityProfile" entity INNER JOIN "Project" p ON p."id" = entity."projectId" WHERE entity."projectId" = $1 AND p."userId" = $2 ORDER BY entity."updatedAt" DESC LIMIT 1',
      [projectId, userId],
    ))[0];
    const entity = existingEntity
      ? (await db.query(
        'UPDATE "EntityProfile" SET "brandName" = $3, "industry" = $4, "region" = $5, "description" = $6, "services" = $7::text[], "products" = $8::text[], "updatedAt" = $9 WHERE "id" = $1 AND EXISTS (SELECT 1 FROM "Project" WHERE "id" = $2 AND "userId" = $10) RETURNING *',
        [existingEntity.id, projectId, input.brandName, input.industry, input.region, input.description, input.services, input.products, now, userId],
      ))[0]
      : (await db.query(
        `INSERT INTO "EntityProfile" ("id", "projectId", "brandName", "industry", "region", "description", "services", "products", "advantages", "createdAt", "updatedAt")
         SELECT $1, p."id", $4, $5, $6, $7, $8::text[], $9::text[], ARRAY[]::text[], $10, $10
         FROM "Project" p WHERE p."id" = $2 AND p."userId" = $3
         RETURNING "EntityProfile".*`,
        [crypto.randomUUID(), projectId, userId, input.brandName, input.industry, input.region, input.description, input.services, input.products, now],
      ))[0];
    if (!entity) return null;
    const values: Record<string, string | string[]> = {
      legalName: input.legalName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      serviceAreas: input.serviceAreas,
      businessHours: input.businessHours,
      foundedAt: input.foundedAt,
      representative: input.representative,
      businessType: input.businessType,
      logoUrl: input.logoUrl,
      socialProfiles: input.socialProfiles,
      trustedSources: input.trustedSources,
      ...input.factory,
    };
    const attributes = PROFILE_ATTRIBUTE_KEYS
      .map(key => ({ id: crypto.randomUUID(), key, value: ARRAY_KEYS.has(key) ? JSON.stringify(values[key] ?? []) : String(values[key] ?? "") }))
      .filter(item => item.value !== "" && item.value !== "[]");
    await db.query(
      `WITH owned AS (
         SELECT entity."id" FROM "EntityProfile" entity
         INNER JOIN "Project" p ON p."id" = entity."projectId"
         WHERE entity."id" = $1 AND p."userId" = $2
       ), deleted AS (
         DELETE FROM "EntityAttribute"
         WHERE "entityId" IN (SELECT "id" FROM owned) AND "key" = ANY($3::text[])
       )
       INSERT INTO "EntityAttribute" ("id", "entityId", "key", "value", "source", "createdAt")
       SELECT input."id", owned."id", input."key", input."value", 'USER_CONFIRMED', $5
       FROM owned
       CROSS JOIN jsonb_to_recordset($4::jsonb) AS input("id" text, "key" text, "value" text)`,
      [entity.id, userId, PROFILE_ATTRIBUTE_KEYS, JSON.stringify(attributes), now],
    );
    return this.profile(userId, projectId);
  },

  async createCheck(
    userId: string,
    projectId: string,
    evidence: DiscoverabilityEvidence,
  ) {
    const failed = Boolean(evidence.errorCode);
    const status: AIPresenceStatus = failed
      ? "FAILED"
      : evidence.homepage.accessible
        && evidence.homepage.indexingAllowed !== false
        && !evidence.robots.crawlers.some(item => item.status === "BLOCKED")
        ? "READY"
        : "NEEDS_ATTENTION";
    const row = (await realAISearchDatabase().query(
      `INSERT INTO "AIPresenceTask" (
        "id", "projectId", "taskType", "platform", "targetUrl", "status", "source",
        "verifiedAt", "evidenceStatus", "evidenceSummary", "evidence", "errorCode",
        "createdAt", "updatedAt"
      )
      SELECT $1, p."id", 'CHECK_DISCOVERABILITY'::"AIPresenceTaskType", 'WEBSITE'::"AIPresencePlatform",
        $4, $5::"AIPresenceStatus", 'LIVE_WEBSITE_CHECK', $6,
        $7::"AIPresenceEvidenceStatus", $8, $9::jsonb, $10, $6, $6
      FROM "Project" p WHERE p."id" = $2 AND p."userId" = $3
      RETURNING "AIPresenceTask".*`,
      [
        crypto.randomUUID(),
        projectId,
        userId,
        evidence.targetUrl,
        status,
        new Date(evidence.checkedAt),
        failed ? "FAILED" : "VERIFIED",
        failed ? "网站检查失败" : evidence.homepage.accessible ? "网站实时检查已完成" : "网站当前无法访问",
        JSON.stringify(evidence),
        evidence.errorCode,
      ],
    ))[0];
    return row ? taskView(row) : null;
  },

  async list(userId: string, projectId: string, limit = 50) {
    const rows = await realAISearchDatabase().query(
      `SELECT task.* FROM "AIPresenceTask" task
       INNER JOIN "Project" p ON p."id" = task."projectId"
       WHERE task."projectId" = $1 AND p."userId" = $2
       ORDER BY task."createdAt" DESC LIMIT $3`,
      [projectId, userId, Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map(taskView);
  },

  async detail(userId: string, projectId: string, taskId: string) {
    const row = (await realAISearchDatabase().query(
      `SELECT task.* FROM "AIPresenceTask" task
       INNER JOIN "Project" p ON p."id" = task."projectId"
       WHERE task."id" = $1 AND task."projectId" = $2 AND p."userId" = $3 LIMIT 1`,
      [taskId, projectId, userId],
    ))[0];
    return row ? taskView(row) : null;
  },

  async createSubmission(
    userId: string,
    projectId: string,
    input: { taskType: AIPresenceTaskType; platform: AIPresencePlatform; targetUrl: string | null },
  ) {
    const now = new Date();
    const row = (await realAISearchDatabase().query(
      `INSERT INTO "AIPresenceTask" (
        "id", "projectId", "taskType", "platform", "targetUrl", "status", "source",
        "submittedAt", "evidenceStatus", "evidenceSummary", "evidence", "createdAt", "updatedAt"
      )
      SELECT $1, p."id", $4::"AIPresenceTaskType", $5::"AIPresencePlatform", $6,
        'SUBMITTED'::"AIPresenceStatus", 'USER_DECLARATION', $7,
        'USER_DECLARED'::"AIPresenceEvidenceStatus", '用户声明已在官方平台完成提交',
        $8::jsonb, $7, $7
      FROM "Project" p WHERE p."id" = $2 AND p."userId" = $3
      RETURNING "AIPresenceTask".*`,
      [
        crypto.randomUUID(),
        projectId,
        userId,
        input.taskType,
        input.platform,
        input.targetUrl,
        now,
        JSON.stringify({ declaredBy: userId, declaredAt: now.toISOString(), verification: "UNVERIFIED" }),
      ],
    ))[0];
    return row ? taskView(row) : null;
  },

  async aiEvidence(userId: string, projectId: string) {
    const row = (await realAISearchDatabase().query(
      `SELECT
        COUNT(DISTINCT result."id") FILTER (WHERE result."status" = 'SUCCEEDED')::int AS "resultCount",
        COUNT(DISTINCT citation."id")::int AS "citationCount",
        COALESCE(BOOL_OR(result."mentioned" = true AND result."status" = 'SUCCEEDED'), false) AS "mentioned",
        COALESCE(BOOL_OR(citation."id" IS NOT NULL), false) AS "cited",
        COALESCE(ARRAY_AGG(DISTINCT result."detectionSource"::text)
          FILTER (WHERE result."status" = 'SUCCEEDED'), ARRAY[]::text[]) AS "sources"
      FROM "Project" p
      LEFT JOIN "AISearchResult" result ON result."projectId" = p."id"
      LEFT JOIN "AISearchCitation" citation ON citation."resultId" = result."id"
      WHERE p."id" = $1 AND p."userId" = $2
      GROUP BY p."id"`,
      [projectId, userId],
    ))[0];
    return {
      resultCount: Number(row?.resultCount ?? 0),
      citationCount: Number(row?.citationCount ?? 0),
      mentioned: Boolean(row?.mentioned),
      cited: Boolean(row?.cited),
      sourceLabels: stringArray(row?.sources),
    };
  },
};
