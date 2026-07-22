import { readFile } from "node:fs/promises";

const files = {
  schema: await readFile("prisma/schema.prisma", "utf8"),
  migration: await readFile("prisma/migrations/20260722140000_add_growth_report_snapshots/migration.sql", "utf8"),
  repository: await readFile("src/features/growth-reports/repository.ts", "utf8"),
  detailApi: await readFile("src/app/api/projects/[projectId]/reports/[reportId]/route.ts", "utf8"),
  listApi: await readFile("src/app/api/projects/[projectId]/reports/route.ts", "utf8"),
};
function check(condition, message) { if (!condition) throw new Error(message); }
check(files.schema.includes("@@unique([projectId, version])"), "缺少 projectId + version 唯一约束");
check(files.schema.includes("snapshot      Json"), "缺少单表 snapshot JSON");
check(files.migration.includes('CREATE TABLE "GrowthReport"'), "缺少 GrowthReport migration");
check(files.repository.includes('ON CONFLICT ("projectId", "version") DO NOTHING'), "缺少并发版本冲突保护");
check((files.repository.match(/report\."status" = \\'PROCESSING\\'/g) ?? []).length >= 2, "完成/失败更新未限制 PROCESSING 状态");
check(files.repository.includes('SELECT report.* FROM "GrowthReport"'), "详情未从 GrowthReport 历史层读取");
check(!files.detailApi.includes("PUT") && !files.detailApi.includes("DELETE") && !files.listApi.includes("PUT") && !files.listApi.includes("DELETE"), "报告 API 禁止 PUT/DELETE");
check(files.detailApi.includes("getCurrentUser") && files.listApi.includes("getCurrentUser"), "报告 API 缺少 Session 验证");
for (const source of [files.repository, files.detailApi, files.listApi]) check(!/CREATE TABLE|ALTER TABLE/i.test(source), "运行时代码中出现 DDL");
console.log("GrowthReport 静态架构检查通过");
