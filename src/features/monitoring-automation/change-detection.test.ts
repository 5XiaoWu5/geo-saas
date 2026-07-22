import test from "node:test";
import assert from "node:assert/strict";
import { detectMonitoringChanges } from "./change-detection.service";

const round = (id: string, mentioned: boolean, rankPosition: number | null, citationCount: number) => ({ id, provider: "OPENAI" as const, mentioned, rankPosition, citationCount, completedAt: "2026-07-22T00:00:00.000Z" });
test("没有上一轮时严格返回 unavailable", () => { assert.equal(detectMonitoringChanges(round("now", true, 3, 12), null).status, "unavailable"); });
test("识别曝光、引用和排名真实下降", () => { const result = detectMonitoringChanges(round("now", false, 9, 4), round("before", true, 3, 12)); assert.deepEqual(result.changes.map((item) => item.type), ["REAL_AI_VISIBILITY_DROP", "CITATION_DROP", "RANKING_DROP"]); });
test("识别真实提升但不标记下降", () => { const result = detectMonitoringChanges(round("now", true, 2, 8), round("before", false, 6, 2)); assert.ok(result.changes.every((item) => item.direction === "IMPROVEMENT")); });
