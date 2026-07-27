# Sprint 19-B Credential Rotation & Enterprise UX Design

## 1. Scope

Sprint 19-B extends the existing Sprint 19-A implementation without creating a new business task system. It delivers:

- versioned AES-256-GCM provider credential encryption and explicit key rotation;
- provider credential deletion/replacement hardening and sensitive-log redaction;
- migration of remaining primary write operations to the shared operation feedback pattern;
- clearer metric help and evidence-based next-step guidance;
- repeatable real-browser acceptance at 1440×900, 375×812, 390×844, and 430×932.

No mock results, simulated progress, fake before/after data, runtime DDL, or automatic credential rotation is permitted.

## 2. Considered approaches

### A. Replace the legacy key immediately

Simple configuration, but existing V1 ciphertext becomes unreadable during deployment. Rejected because it can break production credentials.

### B. Try every configured key during decryption

Convenient during rotation, but hides configuration errors, weakens deterministic failure handling, and makes integrity failures ambiguous. Rejected.

### C. Version-addressed keyring with a V1 compatibility alias

Selected. Each record is decrypted only with its recorded version. V1 first uses `PROVIDER_SECRET_ENCRYPTION_KEY_V1`, then the legacy `PROVIDER_SECRET_ENCRYPTION_KEY` alias. New writes use `PROVIDER_SECRET_ACTIVE_KEY_VERSION`. Rotation is an explicit command with dry-run and scoped execution.

## 3. Credential architecture

`secretVersion` remains the persisted key version; missing values are interpreted as V1 for compatibility. The keyring resolves:

- `PROVIDER_SECRET_ENCRYPTION_KEY_V{n}` for any version;
- `PROVIDER_SECRET_ENCRYPTION_KEY` only as the V1 compatibility fallback;
- `PROVIDER_SECRET_ACTIVE_KEY_VERSION` as the version used by new encryption.

The active version must be a positive integer and its 32-byte key must exist. Invalid active configuration prevents saving or replacing credentials. Decryption never tries another version after selecting the record version.

Errors are stable and secret-free:

- `ENCRYPTION_KEY_VERSION_MISSING`
- `ENCRYPTION_KEY_INVALID`
- `CREDENTIAL_DECRYPTION_FAILED`
- `CREDENTIAL_INTEGRITY_CHECK_FAILED`

The API only returns masks, status, and safe error codes.

## 4. Rotation flow

A server-only administrator script accepts dry-run/apply, optional project/provider filters, and batch size.

For each eligible row:

1. Read encrypted fields and recorded V1-or-newer version.
2. Skip rows already encrypted with the active version.
3. Decrypt using only the matching version key.
4. Encrypt using the active key.
5. In apply mode, atomically update the row only if its ciphertext and version still match the values read.
6. Record only IDs, provider, safe status, and error code.

Dry-run never writes. A failed record cannot overwrite another record. Re-running is idempotent because current-version rows are skipped.

## 5. Provider credential UX and logging

Saving with a blank key retains the existing secret; entering a new key replaces and re-encrypts it. A dedicated delete action requires confirmation and clears the whole provider configuration. Keys are never persisted in browser storage, URLs, returned payloads, automation evidence, or logs.

A reusable redaction helper sanitizes sensitive field names and credential-like values before server logging. Provider routes continue returning stable user-facing error codes.

## 6. Operation feedback migration

Primary write flows use a shared hook/component contract:

- immediate duplicate-submit locking;
- real operation state (`VALIDATING`, `ANALYZING`, `GENERATING`, `CREATING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`, or save-specific equivalents);
- evidence-based success messages;
- clear failure descriptions and retry where safe;
- confirmation dialogs for destructive actions.

Priority coverage is Provider delete/replace, project create/update/delete, GEO analysis, monitoring settings, competitor changes, optimization changes, data refresh, and other visible core write paths. Long-running Automation state continues to recover from persisted `AutomationRun`/`AutomationStep` records.

## 7. Help and next-step guidance

`MetricHelp` is extended through shared definitions for AI visibility, entity authority, knowledge completeness, citation rate/strength, recommendation rank, competition gap, growth opportunity, and related core metrics.

Chinese mode uses Chinese-first labels with the English term in help content. English mode is English-only. Guidance is selected from real provider, monitoring, action, and report state; no hard-coded counts or synthetic recommendations are introduced.

## 8. Browser acceptance

A terminal-driven real Chromium suite uses authenticated test data without committing passwords or provider keys. It records viewport-specific screenshots, console/page errors, horizontal overflow, key navigation, tooltip and locale interactions, button dimensions, and destructive confirmation behavior.

Production checks are non-destructive. Temporary projects/records are removed after verification. A real provider success check is marked not executed unless a user-provided valid key exists.

## 9. Testing and release

Unit and integration coverage includes the approved version-key compatibility matrix, tamper/integrity failures, rotation dry-run/apply/idempotency, safe failure, delete/replace behavior, response secrecy, redaction, operation feedback, confirmations, tooltips, and state-derived guidance.

Release requires all configured tests, `npm run lint`, the Cloudflare OpenNext build, real Chromium acceptance, Git push to `main`, Cloudflare deployment completion, and production verification.
