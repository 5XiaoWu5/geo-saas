import {
  activeProviderSecretVersion,
  decryptProviderApiKey,
  encryptProviderApiKey,
  ProviderSecretError,
  storedProviderSecretVersion,
  type EncryptedProviderSecret,
  type ProviderSecretErrorCode,
} from "./provider-secret";
import type { AISearchProviderType } from "./types";

export type ProviderCredentialRotationRecord = {
  id: string;
  projectId: string;
  provider: AISearchProviderType;
  encryptedApiKey: string | null;
  apiKeyIv: string | null;
  apiKeyAuthTag: string | null;
  secretVersion: number | null;
};

export type ProviderCredentialRotationFailure = {
  id: string;
  projectId: string;
  provider: AISearchProviderType;
  code: ProviderSecretErrorCode | "ROTATION_CONFLICT" | "ROTATION_UPDATE_FAILED";
};

export type ProviderCredentialRotationSummary = {
  dryRun: boolean;
  activeVersion: number;
  inspected: number;
  eligible: number;
  skipped: number;
  wouldRotate: number;
  rotated: number;
  conflicts: number;
  failed: number;
  failures: ProviderCredentialRotationFailure[];
};

export type ProviderCredentialRotationUpdate = (
  current: ProviderCredentialRotationRecord,
  next: EncryptedProviderSecret,
) => Promise<boolean>;

export async function rotateProviderCredentials(
  records: ProviderCredentialRotationRecord[],
  options: {
    dryRun: boolean;
    update?: ProviderCredentialRotationUpdate;
    activeVersion?: number;
  },
): Promise<ProviderCredentialRotationSummary> {
  const activeVersion = options.activeVersion ?? activeProviderSecretVersion();
  const summary: ProviderCredentialRotationSummary = {
    dryRun: options.dryRun,
    activeVersion,
    inspected: records.length,
    eligible: 0,
    skipped: 0,
    wouldRotate: 0,
    rotated: 0,
    conflicts: 0,
    failed: 0,
    failures: [],
  };

  for (const record of records) {
    if (!record.encryptedApiKey && !record.apiKeyIv && !record.apiKeyAuthTag) {
      summary.skipped += 1;
      continue;
    }

    try {
      const currentVersion = storedProviderSecretVersion(record.secretVersion);
      if (currentVersion === activeVersion) {
        summary.skipped += 1;
        continue;
      }
      summary.eligible += 1;
      const apiKey = decryptProviderApiKey(record, record.projectId, record.provider);
      if (!apiKey) throw new ProviderSecretError("CREDENTIAL_DECRYPTION_FAILED");
      const next = encryptProviderApiKey(apiKey, record.projectId, record.provider, activeVersion);
      summary.wouldRotate += 1;
      if (options.dryRun) continue;
      if (!options.update) throw new Error("ROTATION_UPDATE_FAILED");
      const updated = await options.update(record, next);
      if (!updated) {
        summary.conflicts += 1;
        summary.failures.push({
          id: record.id,
          projectId: record.projectId,
          provider: record.provider,
          code: "ROTATION_CONFLICT",
        });
        continue;
      }
      summary.rotated += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({
        id: record.id,
        projectId: record.projectId,
        provider: record.provider,
        code: error instanceof ProviderSecretError
          ? error.code
          : error instanceof Error && error.message === "ROTATION_UPDATE_FAILED"
            ? "ROTATION_UPDATE_FAILED"
            : "ROTATION_UPDATE_FAILED",
      });
    }
  }

  return summary;
}
