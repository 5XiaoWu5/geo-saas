# Sprint 18-A Enterprise UX & AI Automation Experience Upgrade 设计

## 1. 目标

GeoPilot AI 已具备 SEO、GEO、Knowledge、AI Search、Growth Action、Growth Agent、Optimization、Report 与 Timeline 能力。本 Sprint 不增加大型业务模块，而是建立一套企业客户可以理解、控制和审计的操作体验：

- 第一次进入即可看懂当前状态和下一步动作；
- 每次执行均显示真实步骤、真实日志和真实结果；
- 内部安全操作可自动完成，有费用或外部影响的操作必须人工批准；
- 中文界面中文优先并保留必要英文术语，英文界面不混入中文；
- Before / After、Executive Summary 和 Impact Summary 只读取真实数据库证据；
- Desktop 与 Mobile 使用同一信息架构，不依赖横向页面滚动。

## 2. 已确认的方案

采用方案 B“统一执行审计内核”：

- `AutomationRun` 保存一次 Auto Mode 的整体状态、权限模式、进度、前后证据和错误；
- `AutomationStep` 保存每个步骤的顺序、风险、审批、输入证据、输出证据、耗时和错误；
- 现有 Growth、Action、Agent、Optimization、Report、Knowledge、AI Search 服务继续保持独立；
- 自动化编排层只调用现有受权 Service，不复制业务逻辑；
- 不引入 Queue、Worker、对象存储、CMS 写入或新的任务系统。

未采用：

- 仅用前端定时动画包装 API：刷新后无法恢复，也不能形成可靠审计；
- 本期直接建设事件队列和分布式 Worker：会扩大范围并增加运维成本。

## 3. Auto + Human Approval

### 3.1 权限等级

#### Safe Mode（默认）

- 允许读取项目真实数据、生成 Dry Run、分析缺口和展示预期步骤；
- 不创建 GrowthAction、GrowthAgentTask、OptimizationTask 或 GrowthReport；
- 允许写入 `AutomationRun`/`AutomationStep` 审计元数据。审计元数据不是业务优化结果，不得被计入增长成绩。

#### Standard Mode

- 包含 Safe Mode 能力；
- 允许基于真实证据生成 Growth Action、Growth Agent、Optimization Task、Growth Report；
- 允许更新 Dashboard 读模型及写入 Growth Timeline；
- 不允许真实 AI Provider、第三方付费 API、邮件、CMS 或网站修改。

#### Expert Mode

- 包含 Standard Mode 能力；
- 可以规划真实 AI Provider、第三方 API、CMS、发布和外部系统步骤；
- 每个可能产生费用或外部影响的步骤都进入 `AWAITING_APPROVAL`，展示操作、目标、可能费用、数据影响和回退方式；
- 用户明确点击“确认继续”后才允许执行。一次批准只适用于一个具体步骤，不允许笼统批准后续所有高风险动作。

### 3.2 Dry Run

任何模式首先创建 Preview：

1. 读取当前项目证据；
2. 计算实际可执行步骤；
3. 标记每步风险、写入影响、外部影响和费用可能性；
4. 展示预计步骤数；预计耗时只在有真实历史耗时样本时显示，否则为 `unavailable`；
5. 用户确认后才进入真实执行。

Dry Run 不创建业务优化数据，不调用 Provider，不产生外部影响。

### 3.3 暂停、继续、取消与失败

- 暂停在当前已完成步骤之后生效，不中断数据库事务中正在运行的单步；
- 继续从第一个未完成步骤恢复；
- 取消后不再执行新步骤，已经创建的真实业务记录保留并在日志中列出，不伪造回滚；
- 任一步失败，Run 立即进入 `FAILED`，后续步骤保持 `PENDING`，不得静默跳过；
- 重新执行必须显式选择“重试失败步骤”，并通过幂等键避免重复创建 Action、Agent、Optimization 或 Report。

## 4. 数据模型

使用 Prisma Migration，禁止运行时 DDL。

### 4.1 AutomationRun

建议字段：

- `id`
- `projectId`
- `createdBy`
- `mode`: `SAFE | STANDARD | EXPERT`
- `status`: `PREVIEW | AWAITING_APPROVAL | RUNNING | PAUSED | COMPLETED | FAILED | CANCELLED`
- `progress`: 基于已完成步骤/总步骤计算，不使用虚假平滑进度
- `currentStepKey`
- `beforeSnapshot Json`
- `afterSnapshot Json?`
- `summary Json?`
- `errorCode?`
- `errorMessage?`
- `startedAt?`
- `completedAt?`
- `cancelledAt?`
- `createdAt`
- `updatedAt`

所有查询必须同时约束 `projectId` 与 Project ownership。

### 4.2 AutomationStep

建议字段：

- `id`
- `runId`
- `projectId`
- `sequence`
- `stepKey`
- `stepType`
- `riskLevel`: `SAFE | INTERNAL_WRITE | EXTERNAL_COST | EXTERNAL_WRITE`
- `status`: `PENDING | AWAITING_APPROVAL | RUNNING | COMPLETED | FAILED | SKIPPED | CANCELLED`
- `title`
- `activityMessage`
- `inputEvidence Json`
- `outputEvidence Json?`
- `approvalSummary Json?`
- `approvedBy?`
- `approvedAt?`
- `errorCode?`
- `errorMessage?`
- `startedAt?`
- `completedAt?`
- `durationMs?`
- `createdAt`
- `updatedAt`

约束：

- `runId + sequence` 唯一；
- `runId + stepKey` 唯一；
- Step 的 `projectId` 必须与 Run 一致；
- 已完成步骤的输入/输出证据不可被后续 Run 改写。

## 5. 真实执行架构

### 5.1 Standard Mode 步骤

1. `LOAD_EVIDENCE`：读取真实项目证据并固化 Before Snapshot；
2. `GENERATE_ACTIONS`：调用现有 Growth Action Service；
3. `GENERATE_AGENT_TASKS`：调用现有 Growth Agent Service；
4. `SYNC_OPTIMIZATION`：复用现有 GrowthOpportunity/OptimizationTask 联动，不创建第二套任务；
5. `GENERATE_REPORT`：创建新的不可变 GrowthReport；
6. `REFRESH_TIMELINE`：写入真实执行事件；
7. `CAPTURE_AFTER`：读取执行后的真实证据并生成 After Snapshot；
8. `COMPLETE_RUN`：生成只基于已完成步骤的 Impact Summary。

若某项目没有可生成证据，对应步骤以真实 `unavailable` 输出完成；不得创建不存在的问题。`SKIPPED` 只用于用户取消或权限模式明确不允许的步骤，并必须写明原因。

### 5.2 单步推进

Cloudflare 环境本期不依赖后台 Queue。客户端在用户确认后逐步调用服务端“执行下一步”接口：

- 服务端使用事务原子领取一个 PENDING Step；
- 单个请求只执行一个步骤；
- 浏览器通过短轮询读取 Run/Step 状态和 Activity Log；
- 页面刷新或浏览器关闭不会丢失记录；重新打开后可继续未完成 Run；
- 进度条只根据数据库 Step 状态变化，不按定时器伪造进度。

## 6. API

建议新增：

- `POST /api/projects/[projectId]/automation/preview`
- `GET /api/projects/[projectId]/automation`
- `GET /api/projects/[projectId]/automation/[runId]`
- `POST /api/projects/[projectId]/automation/[runId]/start`
- `POST /api/projects/[projectId]/automation/[runId]/next`
- `PATCH /api/projects/[projectId]/automation/[runId]`
  - `pause`
  - `resume`
  - `cancel`
  - `retry`
- `POST /api/projects/[projectId]/automation/[runId]/steps/[stepId]/approve`

全部 API 要求：

- 未登录 `401`；
- 跨用户项目 `403`；
- 正常项目用户 `200`；
- Run、Step、Report、Action ID 必须再次校验同一 `projectId`，不得通过 ID 泄露其他项目数据；
- Expert 审批接口必须记录 `approvedBy` 和 `approvedAt`。

## 7. Provider UX

四个平台使用本地品牌资源，不将 API Key 暴露给前端。Provider 卡片展示：

- Logo、官方简介、当前模型；
- `Get API Key` 与“查看官方文档”，使用 `target="_blank" rel="noreferrer noopener"`；
- Timeline 向导：获取 Key → 保存服务端环境变量 → 填写 `env:` 引用 → 测试连接 → 开始 AI Search；
- 状态：
  - `Configured（已配置）`：启用且服务端可解析 Key 引用；
  - `Need API Key（需要配置）`：缺少或无法解析引用；
  - `Connection Failed（连接失败）`：最近一次用户主动测试连接失败；
  - `Disabled（已禁用）`：配置关闭。

官方入口：

| Provider | API Key | Docs |
| --- | --- | --- |
| OpenAI | `https://platform.openai.com/api-keys` | `https://platform.openai.com/docs/overview` |
| Gemini | `https://aistudio.google.com/app/apikey` | `https://ai.google.dev/gemini-api/docs` |
| Claude | `https://console.anthropic.com/settings/keys` | `https://docs.anthropic.com/en/api/overview` |
| Perplexity | `https://www.perplexity.ai/settings/api` | `https://docs.perplexity.ai/` |

“测试连接”属于用户主动触发的外部请求。界面在调用前说明会向对应 Provider 发出一次请求；失败保存真实错误状态，不伪造成功。

## 8. 国际化

复用现有 `I18nProvider` 与字典，不引入第二套国际化系统。

### 8.1 展示规则

- 中文：中文优先；核心专业名词使用“知识完整度（Knowledge Completeness）”格式；
- English：所有 UI 文案、状态、按钮、空状态和错误均使用英文，不混入中文；
- 顶部导航和用户菜单均提供 `中文 | English`；
- Locale 持久化，刷新和重新打开后保持；
- API 仍返回稳定错误码，客户端按 Locale 翻译，不在服务端返回混合自然语言。

### 8.2 覆盖范围

统一公共 Shell、导航、用户菜单、Provider、Auto Mode，并迁移以下完整旅程：

- Dashboard
- Growth Overview / Timeline
- Optimization Center
- Knowledge Center / Intelligence / Import
- AI Search Command Center / Monitoring
- Action Center
- Growth Agent
- Growth Report 列表与详情
- Insight

旧兼容路由不删除；所有仍可访问页面不得新增硬编码混用文本。通过静态扫描和浏览器遍历补齐其可见文案。

## 9. Execution Timeline 与 Activity Log

- Timeline 来自 AutomationStep，而非前端预设计时；
- Activity Log 以真实 `startedAt`、`completedAt`、`activityMessage`、`errorMessage` 展示；
- 当前步骤显示真实状态；剩余步骤为数据库中 PENDING 数量；
- 预计耗时由相同 `stepType` 历史 `durationMs` 计算；样本不足显示 `unavailable`；
- 动效仅表达当前真实状态，尊重 `prefers-reduced-motion`；
- 长任务列表使用可见性优化，避免不必要重渲染。

## 10. Before / After 与 Impact Summary

### 10.1 Snapshot

Before 在 Run 开始前固化，After 在所有允许步骤结束后读取。指标来源：

- SEO：WebsiteScan / GeoAnalysis 的真实评分和问题计数；
- AI Visibility：AISearchResult / VisibilityCheck；
- Knowledge：CompanyKnowledgeProfile；
- Citation：AISearchCitation；
- Entity：EntityProfile；
- Growth：AISearchGrowthScore；
- Tasks：GrowthAction、GrowthAgentTask、OptimizationTask；
- Report：本 Run 创建的 GrowthReport。

每个指标保存 `sourceId`、`sourceType`、`capturedAt`、`evidenceStatus`。缺少任一可比较端点即显示 `Unavailable`，不得推算。

### 10.2 Impact Summary

只列出本 Run 实际创建或完成的记录，例如：

- 创建了多少 Growth Action；
- 创建了多少 Agent 计划；
- 创建了多少 OptimizationTask；
- 是否生成新 Report；
- 哪些真实评分发生变化。

“预计提升”与“已经提升”必须分开；本 Sprint 的完成摘要不把规则预期当作真实结果。

## 11. Dashboard 商业展示

新增 Executive Summary，默认比较最近 7 天真实记录：

- 新增/完成 Action；
- 新增/完成 Agent；
- 新增 OptimizationTask；
- 新增 Knowledge 记录；
- AI Visibility、Citation、Score 的真实变化；
- 最新 Auto Mode 状态与 Top Alert。

没有可比较数据时显示 `Unavailable` 和下一步建议，不显示 `+0%` 冒充已经测量。

## 12. 帮助系统

建立中心化术语表和可复用 `MetricHelp`/Tooltip：

- Entity Authority
- Knowledge Completeness
- AI Recommendation Probability
- AI Visibility
- Citation Strength
- Competition Gap
- SEO Health
- GEO Score
- Confidence
- Evidence Status

Tooltip 在当前页面解释定义、数据来源和改进方向，不跳转页面；支持键盘聚焦、触屏点击和 Escape 关闭。

## 13. 移动端与视觉规范

- 1440px 使用高信息密度企业控制台；
- 375/390/430px 表格转换为 Card 或响应式数据列表；
- Project Tabs 和底部模块条可横向滑动，但 `documentElement` 不得横向溢出；
- 所有主操作按钮和触控目标至少 44px；
- Drawer 支持遮罩点击、Escape 和触屏滑动关闭；
- Provider Wizard、Execution Console 和 Before/After 在 Mobile 使用单列；
- 视觉签名为“可审计执行轨迹”：把状态、证据和审批作为结构，不增加无意义装饰。

## 14. 错误处理与安全

- API Key 只保存环境变量引用，不返回真实 Key；
- Provider 外链只打开官方站点；
- Automation 输入输出保存摘要和 sourceId，不保存 Provider 密钥或敏感原文；
- 执行失败展示稳定错误码、用户可读说明和下一步；
- 并发 start/next 使用事务和唯一约束，避免一步执行两次；
- 所有写操作记录创建人和项目；
- 不修改 Project、EntityProfile、SimulationResult、GrowthSnapshot、VisibilityCheck、CompanyKnowledgeProfile 的核心语义。

## 15. 测试与验收

### 自动测试

- Automation 状态机、权限模式、风险门、幂等和失败停止单元测试；
- Snapshot/Before-After 真实性测试；
- API 401/403/200 测试；
- Provider metadata/外链/status 测试；
- i18n 字典完整性及 English 混文扫描；
- `npm run lint`；
- `npm run build`；
- 全部现有单元测试回归。

### 浏览器验证

- Desktop 1440px；Mobile 375/390/430px；
- 中文 ↔ English 切换及刷新保持；
- Provider API Key 和 Docs 按钮打开官方新窗口；
- Dry Run 不产生业务数据；
- Standard Mode 完整执行并实时刷新 Step/Activity；
- Expert Mode 在外部步骤暂停并要求确认；
- 暂停、继续、取消、失败停止；
- Before/After 与数据库 sourceId 一致；
- Tooltip 支持鼠标、键盘和触屏；
- 无页面横向滚动、无白屏、无 React Error、无应用 Console Error；
- 主按钮高度不少于 44px，Tab 和模块列表可滑动及点击。

### 生产验收

- Push `main`；
- 等待 Cloudflare Pages Production 部署成功；
- 使用生产域名重复核心旅程、权限和 Remember Me 验证；
- Completion Report 只报告已实际验证内容。

## 16. 明确不在本期

- Queue、Worker、Cron 自动执行；
- WordPress、Shopify、Webflow、Notion、GitHub 或企业 CMS 写入；
- 邮件、短信、Webhook；
- 自动发布文章或 Schema；
- PDF/PPT 导出；
- AI 生成界面文案或虚构执行结果；
- 无人工确认的付费 Provider 调用。

这些能力以后通过 `AutomationStep` 执行器和 Expert Mode 审批门扩展，无需重构本期内核。
