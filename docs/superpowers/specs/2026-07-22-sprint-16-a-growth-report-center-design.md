# Sprint 16-A AI Search Growth Report Center v1 设计

## 目标与边界

Growth Report Center 将现有 SEO、GEO、真实 AI Search、Knowledge、Competitor、Insight、Growth Opportunity 与 Optimization 数据聚合为企业级只读报告。报告只使用生成时已经存在的数据库证据；没有证据的模块保存 `status: "unavailable"`，不补分、不推测提升数值、不调用 AI API。

本阶段不生成 PDF/PPT 文件，不接入 R2、队列或对象存储，不修改 `Project`、`EntityProfile`、`SimulationResult`、`GrowthSnapshot`、`VisibilityCheck`、`CompanyKnowledgeProfile` 的语义。

## 数据模型

新增独立 `GrowthReport`：

- `id: String`
- `projectId: String`
- `version: Int`
- `generatedBy: String`
- `status: PROCESSING | COMPLETED | FAILED`
- `dataVersion: String`
- `methodVersion: String`
- `snapshot: Json`
- `createdAt: DateTime`

约束与索引：

- `@@unique([projectId, version])`
- 按 `projectId, createdAt` 建历史查询索引
- Project 删除时级联删除报告；正常产品/API 不提供报告删除能力
- 只有 `PROCESSING` 可转换为 `COMPLETED` 或 `FAILED`
- `COMPLETED`、`FAILED` 都是不可变终态，不提供 update/delete API

版本分配使用当前项目最大版本加一，并对唯一冲突进行有限重试，确保并发生成不会覆盖既有版本。`generatedBy` 保存实际会话用户 ID。`methodVersion` 固定为 `growth-report-v1`；`dataVersion` 包含项目、报告版本、生成时间与证据来源摘要标识。

## Snapshot 合同

```json
{
  "reportMeta": {},
  "seoSnapshot": {},
  "geoSnapshot": {},
  "aiSearchSnapshot": {},
  "knowledgeSnapshot": {},
  "competitorSnapshot": {},
  "optimizationSnapshot": {},
  "insightSnapshot": {},
  "roadmapSnapshot": {}
}
```

每个模块必须包含：

- `status: "available" | "unavailable"`
- `sourceId`
- `sourceType`
- `generatedAt`
- `evidenceStatus`

模块可包含多个来源时，`sourceId` 保存来源 ID 数组。快照保存展示所需的完整事实值，而不是仅保存外键，因此源数据后续变化不会改变旧报告。`reportMeta` 保存版本、生成用户、项目、数据版本、方法版本、置信度、生成状态和执行摘要。

## 生成流程

1. 校验 Session 与 Project ownership。
2. 创建新的 `PROCESSING` 报告版本，占用不可重复版本号。
3. 并行读取真实数据库证据：
   - 最新 WebsiteScan、GeoAnalysis 与 SEO issue
   - EntityProfile、VisibilityCheck、AISearchResult、AISearchCitation
   - 最新 AISearchGrowthScore 与 AI Search Command Center 证据
   - CompanyKnowledgeBase、CompanyKnowledgeProfile、Knowledge Assessment 证据
   - 最新已完成 BenchmarkRun/BenchmarkResult/Gap
   - Growth Opportunity 所依赖的真实问题与差距
   - OptimizationTask Top Roadmap
   - Insight Center 的可追溯 Insight 数据
4. 规则生成老板视角 Executive Summary；只陈述存在的证据。
5. 校验 Snapshot 顶层模块、来源元数据和 unavailable 结构。
6. 仅当当前记录仍为 `PROCESSING` 时，将完整 Snapshot 一次写入并转为 `COMPLETED`。
7. 失败时仅当记录仍为 `PROCESSING`，写入最小失败快照和失败原因并转为 `FAILED`。

任何自动生成内容都不得作为新的业务事实写回核心模型。

## 组件边界

- `growth-report-repository.ts`：ownership、版本、证据读取、只读历史和终态写入。
- `growth-report-generator.ts`：证据映射、Snapshot 组装、完整性校验。
- `executive-summary.service.ts`：纯规则摘要，不访问网络。
- `report-exporter.ts`：`ReportExporter` 接口。
- `html-report-exporter.ts`：把已保存 Snapshot 转成安全 HTML 预览；PDF/PPT 只保留类型与未来 Provider 扩展点。
- API route：只负责认证、参数解析、状态码和服务调用。

## API

- `POST /api/projects/[projectId]/reports`：生成新快照。
- `GET /api/projects/[projectId]/reports`：按版本倒序读取历史列表。
- `GET /api/projects/[projectId]/reports/[reportId]`：读取单份完整报告。
- 不实现 `PUT`、`PATCH`、`DELETE`。

所有 API：未登录 `401`；项目不存在或跨用户访问 `403`；正常访问 `200`。报告 ID 属于其他项目或用户时也返回 `403`，不泄露其存在性。

## 页面与交互

- `/projects/[projectId]/reports`：生成按钮、当前健康摘要、历史版本列表、状态、数据版本和详情入口。
- `/projects/[projectId]/reports/[reportId]`：只读 Executive Summary、SEO、GEO、AI 推荐、知识、竞品、Top 10 机会、执行路线图与 HTML 预览入口。
- Project Workspace 新增“增长报告”Tab；Growth Center 增加项目报告入口。
- 页面底部提供横向可滑动的后续模块入口：Growth Timeline、Optimization Center、AI Search Command Center。
- 移动端使用单列卡片；所有可点击按钮最小高度 44px；顶层 Tab 和底部模块列表可横向滑动；页面本身不得横向溢出。

视觉延续现有深色玻璃面板体系，以“审计报告页”为签名元素：证据状态、数据版本、生成时间和来源标识始终可见，不引入新的全局字体或不相关视觉重构。

## 错误处理与一致性

- 未找到来源数据不是异常，对应模块写 `unavailable`。
- 数据库/生成器异常生成 `FAILED` 终态并保存安全失败原因。
- 历史详情始终从 `GrowthReport.snapshot` 渲染，不重新查询当前业务数据。
- HTML Preview 只读取已保存 Snapshot，并对文本进行 HTML 转义。
- 不记录或返回 API Key、Session Token、Provider 原始密钥等敏感数据。

## 验证

- 单元测试：摘要规则、unavailable、快照校验、HTML 转义。
- 两次生成得到 v1/v2；两份 Snapshot 独立。
- 修改当前业务数据后生成新版本，旧 Snapshot 序列化值保持不变。
- API：401、403、200；确认没有 PUT/DELETE。
- `npm run lint`、`npm run build`。
- 生产浏览器：1440、375、390、430；无白屏、横向滚动、Console Error、React Error；Tab 可滑动、返回路径与后续模块链接可用。

## 非目标

- PDF/PPT 二进制生成
- 邮件发送、分享链接、公开报告
- 报告编辑、删除、覆盖
- 自动定时生成报告
- AI Writer 调用
