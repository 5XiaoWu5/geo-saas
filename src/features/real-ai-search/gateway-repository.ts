import { publicBaseUrlHost } from "./compatible-provider-security";
import { realAISearchDatabase, iso, type Row } from "./database";
import type {
  AISearchGatewayProtocol,
  AISearchModelFamily,
  GatewayConnectionView,
  GatewayModelView,
} from "./gateway-types";
import type { EncryptedProviderSecret } from "./provider-secret";
import type { ProviderCapabilities, ProviderCompatibilityLevel } from "./types";

function jsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function modelView(row: Row): GatewayModelView {
  return {
    id: String(row.id),
    modelId: String(row.modelId),
    displayName: String(row.displayName),
    family: String(row.family) as AISearchModelFamily,
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.isDefault),
    verificationStatus: String(row.verificationStatus) as GatewayModelView["verificationStatus"],
    verifiedAt: row.verifiedAt ? iso(row.verifiedAt) : null,
    capabilities: jsonObject(row.capabilitiesJson) as ProviderCapabilities,
    compatibilityLevel: String(row.compatibilityLevel) as ProviderCompatibilityLevel,
  };
}

function connectionView(row: Row, models: Row[]): GatewayConnectionView {
  return {
    id: String(row.id),
    name: String(row.name),
    baseUrlHost: publicBaseUrlHost(row.baseUrl) ?? "unavailable",
    protocol: String(row.protocol) as AISearchGatewayProtocol,
    enabled: Boolean(row.enabled),
    keyMask: String(row.apiKeyHint),
    keyVersion: Number(row.secretVersion ?? 1),
    lastTestStatus: row.lastTestStatus === "SUCCEEDED" || row.lastTestStatus === "FAILED"
      ? row.lastTestStatus
      : null,
    lastTestError: row.lastTestError ? String(row.lastTestError) : null,
    lastTestedAt: row.lastTestedAt ? iso(row.lastTestedAt) : null,
    models: models.filter(model => model.connectionId === row.id).map(modelView),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const gatewayRepository = {
  async list(userId: string, projectId: string) {
    const [connections, models] = await Promise.all([
      realAISearchDatabase().query(
        'SELECT connection.* FROM "AISearchGatewayConnection" connection INNER JOIN "Project" p ON p."id" = connection."projectId" WHERE connection."projectId" = $1 AND p."userId" = $2 ORDER BY connection."createdAt" DESC',
        [projectId, userId],
      ),
      realAISearchDatabase().query(
        'SELECT model.* FROM "AISearchGatewayModel" model INNER JOIN "Project" p ON p."id" = model."projectId" WHERE model."projectId" = $1 AND p."userId" = $2 ORDER BY model."family", model."displayName"',
        [projectId, userId],
      ),
    ]);
    return connections.map(connection => connectionView(connection, models));
  },

  async internal(userId: string, projectId: string, connectionId: string) {
    const rows = await realAISearchDatabase().query(
      'SELECT connection.* FROM "AISearchGatewayConnection" connection INNER JOIN "Project" p ON p."id" = connection."projectId" WHERE connection."id" = $3 AND connection."projectId" = $1 AND p."userId" = $2 LIMIT 1',
      [projectId, userId, connectionId],
    );
    return rows[0] ?? null;
  },

  async create(userId: string, projectId: string, input: {
    id: string;
    name: string;
    baseUrl: string;
    protocol: AISearchGatewayProtocol;
    encryptedSecret: EncryptedProviderSecret;
    models: Array<{
      id: string;
      modelId: string;
      displayName: string;
      family: AISearchModelFamily;
      isDefault: boolean;
      capabilities: ProviderCapabilities;
      compatibilityLevel: ProviderCompatibilityLevel;
      verifiedAt: Date;
    }>;
  }) {
    const now = new Date();
    const payload = input.models.map(model => ({
      ...model,
      verifiedAt: model.verifiedAt.toISOString(),
    }));
    const rows = await realAISearchDatabase().query(
      `WITH owned AS (
        SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2
      ), inserted_connection AS (
        INSERT INTO "AISearchGatewayConnection" (
          "id", "projectId", "name", "baseUrl", "protocol", "enabled",
          "encryptedApiKey", "apiKeyIv", "apiKeyAuthTag", "apiKeyHint", "secretVersion",
          "lastTestStatus", "lastTestedAt", "createdAt", "updatedAt"
        )
        SELECT $3, owned."id", $4, $5, $6::"AISearchGatewayProtocol", true,
          $7, $8, $9, $10, $11, 'SUCCEEDED', $12, $12, $12
        FROM owned
        RETURNING *
      ), model_data AS (
        SELECT * FROM jsonb_to_recordset($13::jsonb) AS item(
          "id" text, "modelId" text, "displayName" text, "family" text,
          "isDefault" boolean, "capabilities" jsonb, "compatibilityLevel" text, "verifiedAt" text
        )
      ), inserted_models AS (
        INSERT INTO "AISearchGatewayModel" (
          "id", "projectId", "connectionId", "modelId", "displayName", "family",
          "enabled", "isDefault", "verificationStatus", "verifiedAt",
          "capabilitiesJson", "compatibilityLevel", "createdAt", "updatedAt"
        )
        SELECT model_data."id", inserted_connection."projectId", inserted_connection."id",
          model_data."modelId", model_data."displayName", model_data."family"::"AISearchModelFamily",
          true, model_data."isDefault", 'VERIFIED_AVAILABLE', model_data."verifiedAt"::timestamp,
          model_data."capabilities", model_data."compatibilityLevel"::"AIProviderCompatibilityLevel",
          $12, $12
        FROM model_data CROSS JOIN inserted_connection
        RETURNING *
      )
      SELECT * FROM inserted_connection`,
      [
        projectId,
        userId,
        input.id,
        input.name,
        input.baseUrl,
        input.protocol,
        input.encryptedSecret.encryptedApiKey,
        input.encryptedSecret.apiKeyIv,
        input.encryptedSecret.apiKeyAuthTag,
        input.encryptedSecret.apiKeyHint,
        input.encryptedSecret.secretVersion,
        now,
        JSON.stringify(payload),
      ],
    );
    return rows[0] ? connectionView(rows[0], payload.map(model => ({
      ...model,
      connectionId: input.id,
      enabled: true,
      verificationStatus: "VERIFIED_AVAILABLE",
      capabilitiesJson: model.capabilities,
    }))) : null;
  },

  async remove(userId: string, projectId: string, connectionId: string) {
    const rows = await realAISearchDatabase().query(
      'DELETE FROM "AISearchGatewayConnection" connection USING "Project" p WHERE connection."id" = $3 AND connection."projectId" = $1 AND connection."projectId" = p."id" AND p."userId" = $2 RETURNING connection."id"',
      [projectId, userId, connectionId],
    );
    return rows.length > 0;
  },
};
