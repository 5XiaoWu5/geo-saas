import test from "node:test";
import assert from "node:assert/strict";
import { calculateNextRunAt } from "./schedule.service";

test("每日计划计算未来时间", () => { const next = calculateNextRunAt("DAILY", "09:00", "Asia/Shanghai", new Date("2026-07-22T02:00:00.000Z")); assert.equal(next.toISOString(), "2026-07-23T01:00:00.000Z"); });
test("拒绝无效时区", () => { assert.throws(() => calculateNextRunAt("WEEKLY", "09:00", "Invalid/Zone"), /INVALID_TIMEZONE/); });
