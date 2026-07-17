# GEO Growth Timeline v1 Design

## Purpose

GEO Growth Timeline v1 creates a project history center that records measurable changes after website scans, entity updates, AI search simulations, visibility checks, and optimization completions. It extends the existing product flow and does not create a separate analytics data source.

AI Search Simulator v1 is completed first according to its approved design. Growth Timeline then consumes persisted simulation results alongside existing real database records.

## Data Model

Add two Prisma enums:

```prisma
enum GrowthEventType {
  SCAN
  ENTITY
  SIMULATION
  VISIBILITY
  OPTIMIZATION
}

enum GrowthTriggerType {
  MANUAL
  AUTO
  SCHEDULE
  API
}
```

Add `GrowthSnapshot`:

- `id String @id @default(cuid())`
- `projectId String`
- `campaignId String?`
- `simulationId String?`
- `eventType GrowthEventType`
- `triggerType GrowthTriggerType @default(AUTO)`
- `sourceId String`
- `visibilityScore Int?`
- `entityScore Int?`
- `schemaScore Int?`
- `authorityScore Int?`
- `citationScore Int?`
- `overallScore Int?`
- `metadata Json @default("{}")`
- `createdAt DateTime @default(now())`

Relations are added to `Project`, `GeoCampaign`, and the simulator task or result model without changing existing core fields. The uniqueness constraint is:

```prisma
@@unique([projectId, eventType, sourceId])
```

Nullable score fields preserve the distinction between missing evidence and a real score of zero.

## Snapshot Service

`snapshot.service.ts` is the only module that creates or updates snapshots. It accepts an owned project ID, event type, source ID, trigger type, and optional relation IDs. It loads current database state on the server and computes metrics; clients cannot submit score values.

Creation is idempotent. Repeated processing of the same `(projectId, eventType, sourceId)` updates the existing snapshot instead of creating duplicate history entries.

`metadata` stores compact event context only, such as provider, query, scan ID, optimization status, or campaign name. It does not duplicate full analysis, answer, issue, or project records.

## Automatic Triggers

- Website scan and GeoAnalysis completion creates a `SCAN` snapshot using the analysis ID as `sourceId`.
- Entity profile save or entity analysis completion creates an `ENTITY` snapshot using the profile or analysis ID.
- Simulation completion creates a `SIMULATION` snapshot using the simulation result ID and stores its campaign relation when present.
- Visibility check creation creates a `VISIBILITY` snapshot using the check ID and its campaign relation.
- Optimization status transition to completed creates an `OPTIMIZATION` snapshot using the optimization task ID.

Automatic application flows use `AUTO`. The public snapshot endpoint uses `API`. Future background and explicit UI flows may use `SCHEDULE` and `MANUAL` without schema changes.

## Metric Calculation

Metrics are calculated from the latest owned records available at the trigger time:

- `overallScore`: latest GeoAnalysis total score, enhanced by the latest persisted simulation score when available.
- `visibilityScore`: real VisibilityCheck mention rate and score statistics.
- `entityScore`: latest GeoAnalysis, EntityProfile completeness, or Simulation result.
- `schemaScore`: latest GeoAnalysis and Simulation result.
- `authorityScore`: latest Simulation or GeoBrain authority score.
- `citationScore`: latest Simulation or GeoBrain citation score.

The score history engine normalizes values to 0-100 but never invents missing metrics. A missing source remains `null`.

## Trend Engine

`trend-engine.ts` filters snapshots into 7-day, 30-day, 90-day, and all-history windows. It produces:

- chronological chart points
- first-to-latest metric changes
- percentage-point improvements or declines
- latest project summary
- campaign-specific impact using snapshots associated with `campaignId`

When a period has fewer than two values for a metric, its change is reported as unavailable rather than zero.

## API

- `GET /api/growth`: return owned projects with latest snapshot and summary metrics.
- `GET /api/growth/[projectId]`: verify project ownership and return snapshots, chart series, range summaries, and campaign impact.
- `POST /api/growth/snapshot`: verify session and project ownership, validate event/source references, and request server-side snapshot generation.

Unauthenticated requests return 401. Existing projects owned by another user return 403. Invalid event references return 400 or 404. No endpoint accepts client-calculated scores.

## Pages And Components

Pages:

- `/growth`
- `/project/[projectId]/growth`

Module:

- `timeline.service.ts`: owned project history queries
- `snapshot.service.ts`: idempotent snapshot creation
- `score-history.ts`: metric extraction and normalization
- `trend-engine.ts`: range and delta calculations
- `GrowthTimeline.tsx`: chronological event feed
- `TrendChart.tsx`: responsive metric chart
- `MetricHistory.tsx`: metric history list/card presentation
- `ImprovementCard.tsx`: period delta presentation
- `GrowthSummary.tsx`: current state and improvement overview

The UI reuses the existing GeoPilot Card, Badge, Button, Tabs, and chart conventions. All visible strings are added to `src/i18n/dictionaries.ts` in Chinese and English.

## Existing Module Integration

- Analyzer displays a compact Historical Trend section linking to project growth details.
- Reports include growth trend and improvement summary when snapshots exist.
- Campaign detail displays Growth Impact calculated only from snapshots linked to that campaign.
- Simulator persists a snapshot after each completed provider result.
- Visibility and Optimization create snapshots at their existing successful write points.

Growth snapshots supplement source modules; they never replace their source records or alter Visibility analytics.

## Responsive Behavior

- Timeline is vertical at all sizes and reduces spacing on mobile.
- Charts use a stable responsive container with no fixed viewport width.
- Metric history uses rows on wide screens and card lists on mobile.
- Cards stack into one column below tablet widths.
- Controls use full-width inputs and adaptive buttons on mobile.
- Existing dashboard navigation remains responsible for its mobile drawer.
- All new layouts must remain free of horizontal overflow at 360, 375, 390, 393, 414, and 430 px.

## Empty And Error States

- Projects without snapshots show a prerequisite action rather than sample history.
- Missing individual metrics render as unavailable.
- A failed automatic snapshot must not fail the source operation after its primary database write succeeds; the failure is logged for recovery.
- The API reports actionable validation and permission errors without exposing internal database details.

## Verification And Release

- Generate and validate Prisma client/schema.
- Run `npm run lint`.
- Run `npm run build`.
- Start `npm run dev` and verify `/growth` and `/project/[projectId]/growth` at desktop, 430 px, 390 px, and 375 px.
- Verify no blank page, React error, console error, or horizontal overflow.
- Verify unauthenticated Growth and Simulator APIs return 401.
- Commit all intended changes, push `main`, and wait for the automatic Cloudflare Pages Production deployment.
- Confirm the production commit and routes on `geopilotapp.com`.
