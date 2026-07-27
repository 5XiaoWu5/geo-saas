ALTER TABLE "AISearchProviderConfig"
  ADD COLUMN "encryptedApiKey" TEXT,
  ADD COLUMN "apiKeyIv" TEXT,
  ADD COLUMN "apiKeyAuthTag" TEXT,
  ADD COLUMN "apiKeyHint" TEXT,
  ADD COLUMN "secretVersion" INTEGER NOT NULL DEFAULT 1;
