import {
  AI_SEARCH_PROVIDER_TYPES,
  activeProviderSecretVersion,
  realAISearchDatabase,
  rotateProviderCredentials,
  type AISearchProviderType,
  type EncryptedProviderSecret,
  type ProviderCredentialRotationRecord,
  type ProviderCredentialRotationSummary,
} from "../src/features/real-ai-search/admin";

type Options = {
  dryRun: boolean;
  projectId: string | null;
  provider: AISearchProviderType | null;
  batchSize: number;
};

function parseOptions(args: string[]): Options {
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  if (apply && args.includes("--dry-run")) throw new Error("CHOOSE_DRY_RUN_OR_APPLY");
  const projectId = value(args, "--project");
  const providerValue = value(args, "--provider");
  const provider = providerValue?.toUpperCase() as AISearchProviderType | undefined;
  if (provider && !AI_SEARCH_PROVIDER_TYPES.includes(provider)) throw new Error("INVALID_PROVIDER");
  const batchSize = Number(value(args, "--batch-size") ?? "100");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error("INVALID_BATCH_SIZE");
  return { dryRun, projectId: projectId ?? null, provider: provider ?? null, batchSize };
}

function value(args: string[], name: string) {
  const inline = args.find(argument => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim() || undefined;
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1]?.trim() || undefined : undefined;
}

async function readBatch(options: Options, afterId: string | null) {
  const filters = ['config."encryptedApiKey" IS NOT NULL', 'config."id" > $1'];
  const params: unknown[] = [afterId ?? ""];
  if (options.projectId) {
    params.push(options.projectId);
    filters.push(`config."projectId" = $${params.length}`);
  }
  if (options.provider) {
    params.push(options.provider);
    filters.push(`config."provider" = $${params.length}::"AISearchProviderType"`);
  }
  params.push(options.batchSize);
  const rows = await realAISearchDatabase().query(
    `SELECT config."id", config."projectId", config."provider", config."encryptedApiKey",
      config."apiKeyIv", config."apiKeyAuthTag", config."secretVersion"
     FROM "AISearchProviderConfig" config
     WHERE ${filters.join(" AND ")}
     ORDER BY config."id"
     LIMIT $${params.length}`,
    params,
  );
  return rows.map(row => ({
    id: String(row.id),
    projectId: String(row.projectId),
    provider: String(row.provider) as AISearchProviderType,
    encryptedApiKey: row.encryptedApiKey ? String(row.encryptedApiKey) : null,
    apiKeyIv: row.apiKeyIv ? String(row.apiKeyIv) : null,
    apiKeyAuthTag: row.apiKeyAuthTag ? String(row.apiKeyAuthTag) : null,
    secretVersion: row.secretVersion === null || row.secretVersion === undefined ? null : Number(row.secretVersion),
  } satisfies ProviderCredentialRotationRecord));
}

async function updateCredential(current: ProviderCredentialRotationRecord, next: EncryptedProviderSecret) {
  const rows = await realAISearchDatabase().query(
    `UPDATE "AISearchProviderConfig"
     SET "encryptedApiKey" = $2, "apiKeyIv" = $3, "apiKeyAuthTag" = $4,
         "apiKeyHint" = $5, "secretVersion" = $6, "updatedAt" = $7
     WHERE "id" = $1
       AND "encryptedApiKey" = $8
       AND "apiKeyIv" = $9
       AND "apiKeyAuthTag" = $10
       AND COALESCE("secretVersion", 1) = $11
     RETURNING "id"`,
    [
      current.id,
      next.encryptedApiKey,
      next.apiKeyIv,
      next.apiKeyAuthTag,
      next.apiKeyHint,
      next.secretVersion,
      new Date(),
      current.encryptedApiKey,
      current.apiKeyIv,
      current.apiKeyAuthTag,
      current.secretVersion ?? 1,
    ],
  );
  return rows.length === 1;
}

function merge(target: ProviderCredentialRotationSummary, batch: ProviderCredentialRotationSummary) {
  target.inspected += batch.inspected;
  target.eligible += batch.eligible;
  target.skipped += batch.skipped;
  target.wouldRotate += batch.wouldRotate;
  target.rotated += batch.rotated;
  target.conflicts += batch.conflicts;
  target.failed += batch.failed;
  target.failures.push(...batch.failures);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const activeVersion = activeProviderSecretVersion();
  const total: ProviderCredentialRotationSummary = {
    dryRun: options.dryRun,
    activeVersion,
    inspected: 0,
    eligible: 0,
    skipped: 0,
    wouldRotate: 0,
    rotated: 0,
    conflicts: 0,
    failed: 0,
    failures: [],
  };
  let afterId: string | null = null;
  while (true) {
    const records = await readBatch(options, afterId);
    if (!records.length) break;
    const batch = await rotateProviderCredentials(records, {
      dryRun: options.dryRun,
      activeVersion,
      update: options.dryRun ? undefined : updateCredential,
    });
    merge(total, batch);
    afterId = records.at(-1)?.id ?? null;
    if (records.length < options.batchSize) break;
  }

  process.stdout.write(`${JSON.stringify({
    ...total,
    scope: {
      projectId: options.projectId ?? "all",
      provider: options.provider ?? "all",
      batchSize: options.batchSize,
    },
  }, null, 2)}\n`);
  if (total.failed > 0 || total.conflicts > 0) process.exitCode = 1;
}

main().catch(error => {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : "ROTATION_COMMAND_FAILED";
  process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exitCode = 1;
});
