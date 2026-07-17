# AI Recommendation Insight Center v1 Design

## Scope

Sprint 9 explains existing GeoPilot scores and recommendation probability. It does not crawl websites, call external AI, recalculate source scores, or add database tables.

The module reads only owned, persisted records from:

- `SimulationResult` and its `SimulationTask`
- `GrowthSnapshot`
- `GeoAnalysis`
- `EntityProfile`
- `VisibilityCampaign`, `VisibilityPrompt`, and `VisibilityCheck`
- `GeoCampaign`
- `OptimizationTask`

## Score Anchor

The current score is selected in this strict priority order:

1. latest completed `SimulationResult.probability`
2. latest `GrowthSnapshot.overallScore`
3. latest `GeoAnalysis.totalScore`

The anchor value and source record are returned unchanged. If no valid source exists, the project insight status is `unavailable`; no explanation ledger or recommendations are fabricated.

## Anchored Attribution Ledger

The engine analyzes existing component scores and issue signals to explain the anchor. It does not use these signals to replace or modify the anchor.

Positive signal weights are normalized into integer contributions whose sum exactly equals the current score. Negative and missing signal weights are normalized into integer deductions whose sum exactly equals `100 - currentScore`.

Rounding uses a largest-remainder allocation so both ledgers reconcile exactly without hidden residual values.

Each signal contains:

- `signalKey`
- `kind`: positive, negative, or missing
- `value`: positive contribution or deduction
- `sourceType`
- `sourceId`
- `confidence`
- `targetModule`
- `available`

Signals are produced only when their supporting source exists. Missing data is reported separately and never represented as a numeric signal.

## Signal Sources

- entity completeness: `SimulationResult.entityScore`, `GeoAnalysis.entityScore`, and `EntityProfile`
- schema coverage: `SimulationResult.schemaScore` and `GeoAnalysis.schemaScore`
- authority: `SimulationResult.authorityScore` and known analysis issues
- citation potential: `SimulationResult.citationScore` and known analysis issues
- visibility: persisted `VisibilityCheck` statistics
- content/FAQ/case/news gaps: persisted `GeoAnalysis.issues` and Simulator reason/missing codes
- campaign relevance: persisted task/campaign/query linkage

The engine uses stable signal keys rather than localized display strings.

## Recommendation Builder

Actionable negative or missing signals map to Optimization Center tasks. The stable issue identifier is:

```text
insight:{projectId}:{signalKey}
```

Creating a recommendation first checks `OptimizationTask` by `(projectId, issueId)`. Existing tasks are reused; otherwise one `PENDING` task is created. This operation remains user-scoped through project ownership.

The API returns the task and a deep link to `/optimization?projectId=...&issueId=...` so the UI can open and locate it.

## Module And API

Module files:

- `types.ts`
- `signal-analyzer.ts`
- `insight-engine.ts`
- `recommendation-builder.ts`
- `InsightSummary.tsx`
- `PositiveSignals.tsx`
- `NegativeSignals.tsx`
- `RecommendationList.tsx`
- `SignalBreakdown.tsx`
- `ExplainScoreCard.tsx`

Pages:

- `/insights`
- `/project/[projectId]/insights`

APIs:

- `GET /api/insights`
- `GET /api/insights/[projectId]`
- `POST /api/insights/[projectId]` for idempotent task creation from an allowed signal

All endpoints require a session. Unauthenticated requests return 401. Existing projects owned by another user return 403. The POST endpoint accepts only a signal key produced by the server-side engine and never accepts arbitrary task fields.

## Existing Module Integration

- Simulator adds a `View Insights` action for the active project.
- Analyzer shows the current insight score, confidence, and strongest positive/negative signals.
- Reports include the same owned Insight Summary.
- Recommendations deep-link to Optimization Center and locate the stable issue task.

No source module changes its score or data semantics.

## UI And Internationalization

The UI reuses the existing GeoPilot dashboard, Card, Badge, Button, and progress conventions. Desktop uses a score ledger plus signal columns. Mobile stacks all cards, converts lists into cards, and keeps controls within the viewport.

All new visible strings and signal labels are added to `src/i18n/dictionaries.ts` in Chinese and English.

## Verification And Release

- Prisma schema remains unchanged.
- Run `npm run lint` and `npm run build`.
- Verify `/insights`, project Insights, Simulator, Analyzer, and Reports locally at desktop, 430 px, 390 px, and 375 px.
- Verify no blank page, React error, console error, or horizontal overflow.
- Verify unauthenticated API responses return 401 and cross-user access code paths return 403.
- Commit and push `main`.
- Wait for automatic Cloudflare Pages Production deployment.
- Verify production routes and deployment commit without manual deployment.
