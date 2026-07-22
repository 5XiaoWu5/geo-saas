import type { MonitoringFrequency } from "./types";

function zonedParts(date: Date, timezone: string) { const values = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date); const value = (type: string) => Number(values.find((item) => item.type === type)?.value); return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") }; }
function fromZoned(year: number, month: number, day: number, hour: number, minute: number, timezone: string) { let guess = Date.UTC(year, month - 1, day, hour, minute); for (let index = 0; index < 2; index += 1) { const shown = zonedParts(new Date(guess), timezone); const offset = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute) - guess; guess = Date.UTC(year, month - 1, day, hour, minute) - offset; } return new Date(guess); }
function shifted(parts: ReturnType<typeof zonedParts>, days: number, months: number) { const date = new Date(Date.UTC(parts.year, parts.month - 1 + months, parts.day + days)); return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }; }

export function calculateNextRunAt(frequency: MonitoringFrequency, dailyTime: string, timezone: string, now = new Date()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) throw new Error("INVALID_DAILY_TIME");
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(now); } catch { throw new Error("INVALID_TIMEZONE"); }
  const [hour, minute] = dailyTime.split(":").map(Number);
  const current = zonedParts(now, timezone);
  let target = { year: current.year, month: current.month, day: current.day };
  let candidate = fromZoned(target.year, target.month, target.day, hour, minute, timezone);
  if (candidate <= now) { target = frequency === "DAILY" ? shifted(current, 1, 0) : frequency === "WEEKLY" ? shifted(current, 7, 0) : shifted(current, 0, 1); candidate = fromZoned(target.year, target.month, target.day, hour, minute, timezone); }
  return candidate;
}
