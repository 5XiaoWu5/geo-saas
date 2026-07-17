import assert from "node:assert/strict";
import { loadOptionalInsightSource } from "../src/features/insights/optional-source.ts";
import { analyzeSignals } from "../src/features/insights/signal-analyzer.ts";

const reports = [];
const report = (source) => reports.push(source);

const available = await loadOptionalInsightSource("GeoAnalysis", async () => ({ score: 72 }), null, report);
const unavailable = await loadOptionalInsightSource("SimulationResult", async () => {
  throw new TypeError("optional mapping failed");
}, [], report);

assert.deepEqual(available, { score: 72 });
assert.deepEqual(unavailable, []);
assert.deepEqual(reports, ["SimulationResult"]);

const ledger = analyzeSignals({
  anchor: { score: 82, sourceType: "SimulationResult", sourceId: "result", createdAt: new Date().toISOString() },
  simulation: {
    id: "result",
    taskId: "task",
    probability: 82,
    ranking: 3,
    confidence: 91,
    entityScore: 88,
    schemaScore: 79,
    authorityScore: 76,
    citationScore: 84,
    mentioned: true,
    reasons: ["faq_coverage"],
    missing: ["case_pages"],
    createdAt: new Date().toISOString(),
  },
  growth: null,
  analysis: null,
  entityProfile: null,
  visibilityChecks: [],
  campaigns: [],
  simulationCampaignId: null,
});

assert.equal(ledger.positiveSignals.reduce((sum, signal) => sum + signal.value, 0), 82);
assert.equal([...ledger.negativeSignals, ...ledger.missingSignals].reduce((sum, signal) => sum + signal.value, 0), 18);
assert.equal(ledger.reconciled, true);

console.log("Insights optional-source regression check passed");
