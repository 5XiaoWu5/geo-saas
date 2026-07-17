# AI Search Simulator v1 Design

## Scope

AI Search Simulator v1 adds a project-level simulation workflow to the existing Campaign, Visibility, Analyzer, and Reports modules. It does not call external AI APIs and does not claim to reproduce an actual provider response.

The simulator estimates recommendation probability from the current user's real project signals:

- latest `WebsiteScan`
- latest `GeoAnalysis`
- latest `GeoBrainAnalysis`, when available
- `EntityProfile`
- selected `GeoCampaign` and `GeoQuery`
- existing `VisibilityCheck` records

No random values, hard-coded company data, or sample result records are used.

## User Flow

1. The user opens `/simulator` or `/project/[projectId]/simulator`.
2. The user selects an owned project, campaign, query, and one or more providers.
3. The client calls `POST /api/simulator/run`.
4. The API validates the session and verifies `project.userId` ownership.
5. The rule-based provider evaluates the selected query against real project signals.
6. One `SimulationTask` and one `SimulationResult` per selected provider are persisted.
7. Results and history are returned to the workspace.
8. Analyzer and Reports read the latest owned simulation results as additional evidence.

## Provider Architecture

`SimulationProvider` exposes one method:

```ts
simulate(input: SimulationInput): Promise<SimulationResultDraft>
```

`ProviderManager` resolves provider names to implementations. v1 uses `mock-provider.ts` as a local deterministic implementation. The filename preserves the requested extension point, while the implementation is signal-based rather than fixture-based.

Provider profiles may apply small documented weighting differences to the same real signal set. They must not use random numbers. Future OpenAI-compatible, Gemini, Claude, DeepSeek, and Perplexity adapters can implement the same interface without changing the service or UI.

## Scoring

The score engine produces normalized scores from 0 to 100:

- entity score: latest entity and analysis completeness
- schema score: schema count, schema types, and analysis score
- authority score: external links, entity advantages, and available authority analysis
- citation score: content structure, sitemap/robots, visibility mentions, and query relevance
- confidence: data completeness and signal freshness
- probability: weighted recommendation estimate

`mentioned` is true when probability reaches the documented threshold. `ranking` is derived from probability bands and is null when the brand is not considered mentioned. Reasons and missing signals are generated from the same evaluated evidence.

## Persistence

Add `SimulationTask` and `SimulationResult` without changing existing core model fields.

`SimulationTask` belongs to `Project`, optionally references `GeoCampaign`, stores the selected query and provider, and tracks status. `SimulationResult` belongs to a task and stores numeric scores, mention state, reasons, and missing signals.

Relations use cascade deletion from the owning project or task. User isolation is always enforced through the task's project ownership.

## API

- `POST /api/simulator/run`: validate input, verify project and optional campaign/query ownership, run selected providers, persist results.
- `GET /api/simulator/history`: return only tasks belonging to the current user's projects, optionally filtered by project.
- `GET /api/simulator/[id]`: return one owned task and its result; return 403 for an existing task owned by another user.

Unauthenticated requests return 401. Cross-user project access returns 403. Validation failures return 400.

## UI

The workspace follows the existing GeoPilot dashboard visual language and reuses current Card, Badge, Button, input, and progress components.

The primary signature is a compact probability gauge paired with an evidence breakdown, making the simulated conclusion auditable rather than decorative.

Desktop uses a two-column configuration area and responsive result grid. Mobile stacks cards vertically, converts history rows into card lists, keeps provider tabs horizontally scrollable, and uses full-width form controls. The gauge scales within a fixed aspect ratio and respects reduced-motion preferences.

All new visible strings are added to `src/i18n/dictionaries.ts` for Chinese and English.

## Existing Module Integration

- Campaign pages provide a simulator entry for the selected query.
- Analyzer includes the latest simulation summary for each owned project.
- Reports include latest simulation probability, provider, rank, and evidence when present.
- Visibility remains the source of observed manual checks; simulation records remain explicitly separate and do not inflate visibility analytics.

## Error And Empty States

- No projects: direct the user to create a project.
- No campaign/query: allow a manual query while preserving project ownership.
- No scan/analysis: reject the run with an actionable prerequisite message instead of inventing a score.
- Provider failure: mark that task failed and return other provider results when possible.
- Empty history: show an action-oriented empty state.

## Verification

- Prisma client generation and production build
- lint and TypeScript checks through existing scripts
- unauthenticated API returns 401
- owned and cross-user access paths are enforced in service/API code
- browser checks at desktop, 430 px, 390 px, and 375 px
- no horizontal overflow, console errors, React errors, or blank states
- production deployment matches the pushed commit
