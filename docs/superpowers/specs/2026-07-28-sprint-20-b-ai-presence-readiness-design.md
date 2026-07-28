# Sprint 20-B AI 收录准备与品牌可见性提升设计

## 1. 目标与边界

Sprint 20-B 建立企业可理解的“AI 收录准备”工作流，帮助用户整理公开企业知识、验证网站是否具备被搜索与 AI 搜索发现的基础条件，并以可追踪证据管理平台提交、抓取、索引、AI 提及和 Citation 状态。

本轮不承诺、模拟或伪造收录、推荐、排名、Citation 或固定时间内出现。允许爬虫访问仅表示具备抓取条件，不代表已经抓取、索引、提及、引用或推荐。

本轮不重构 Provider、多网关、模型验证、AI Search Query 历史、Sprint 20-A 引导系统或 `WebsiteScan` 核心语义。

## 2. 已确认方案

采用最小化方案 A：

1. 仅新增 `AIPresenceTask` 作为准备、提交、验证与证据审计模型。
2. 企业资料复用 `Project`、`EntityProfile`、`EntityAttribute`、`CompanyKnowledgeProfile`、`ProductEntity` 和 `ServiceEntity`。
3. 详细网站检查结果不写入或扩展 `WebsiteScan`，而是作为独立证据快照保存到 `AIPresenceTask`。
4. 页面复用 Sprint 20-A 的 `GuidedPageHeader`、`GuidedEmptyState`、`ActionFeedback` 和 `TechnicalDetails`。
5. 新增中心页面 `/projects/[projectId]/geo/ai-presence`，不删除任何旧路由。

## 3. 数据模型

新增 `AIPresenceTask`：

- `id`
- `projectId`
- `taskType`
- `platform`
- `targetUrl`
- `status`
- `source`
- `submittedAt`
- `verifiedAt`
- `evidenceStatus`
- `evidenceSummary`
- `evidence`
- `errorCode`
- `createdAt`
- `updatedAt`

其中：

- `taskType` 和 `platform` 使用结构化枚举或受控字符串，支持检索和聚合。
- `status` 保存业务状态，不依赖自由 JSON 推导。
- `evidenceStatus` 明确区分已验证、用户声明、尚未验证和失败。
- `evidenceSummary` 保存可查询的简短结论。
- `evidence` 保存完整证据快照，包括检查时间、目标 URL、来源、HTTP 状态、解析结果和安全错误码。
- 每次重新检查创建新的证据任务记录，不覆盖旧记录。
- 平台提交任务保留完整状态变化和时间。

建议状态：

- `NOT_STARTED`
- `NEEDS_ATTENTION`
- `READY`
- `SUBMITTED`
- `CRAWLED`
- `INDEXED`
- `MENTIONED`
- `CITED`
- `UNAVAILABLE`
- `FAILED`

状态升级规则：

```text
READY → SUBMITTED → CRAWLED → INDEXED → MENTIONED → CITED
```

状态只能根据对应证据升级。用户点击“我已提交”最多写入 `SUBMITTED`，其证据来源标记为用户声明。后续状态必须来自真实抓取、平台数据、真实 `AISearchResult` 或真实 `AISearchCitation`。

数据库变化使用正式 Prisma Migration，不增加运行时 DDL。

## 4. 企业资料复用

企业资料聚合服务按以下优先级读取：

1. `Project`：官网、行业、国家或地区、语言、项目描述。
2. `EntityProfile`：品牌名、企业描述、产品、服务、优势、地区。
3. `EntityAttribute`：法定名称、电话、邮箱、地址、营业时间、成立时间、负责人、企业类型、Logo、社交账号、服务地区、可信外部资料及工厂或服务企业扩展字段。
4. `ProductEntity` 和 `ServiceEntity`：正式产品、服务及其证据状态。
5. `CompanyKnowledgeProfile`：经知识证据汇总后的公司信息、认证、客户证明和缺失知识。

保存企业资料时：

- 服务端使用受控字段清单。
- 不适用字段允许留空。
- 不自动生成企业事实。
- 待用户确认的内容不能自动成为正式事实。
- 所有更新继续经过 Session 和 Project ownership 校验。

完整度不使用虚构百分比。界面按已填写、缺失、不适用、等待确认展示字段状态，并说明数据来源和最后更新时间。

## 5. 网站可发现性检查

新增独立的 AI Presence 网站检查服务，复用现有 SSRF 防护并扩展为通用安全抓取能力。

检查内容：

- 首页是否可访问及最终 URL
- HTTP 状态码
- HTTPS
- Content-Type
- 登录或挑战页迹象
- Meta Robots 与 X-Robots-Tag
- Canonical
- 页面语言
- 基础响应耗时
- 移动端抓取可访问性
- robots.txt 是否存在、可读取及响应状态
- Sitemap 是否存在、可读取及响应状态
- Sitemap 中核心页面线索
- JSON-LD 是否存在、能否解析及 Schema 类型
- 首页内部链接发现的核心页面

每次检查：

1. 创建新的 `AIPresenceTask`。
2. 对每次网络请求执行协议、DNS、私网、Metadata、重定向和超时保护。
3. 保存目标 URL、最终 URL、检查时间、来源、HTTP 状态和解析证据。
4. 失败时保存安全错误码和不包含敏感信息的错误摘要。
5. 不覆盖历史证据。

## 6. 爬虫访问规则

检查以下 robots.txt user-agent：

- `OAI-SearchBot`
- `ChatGPT-User`
- `Claude-SearchBot`
- `Googlebot`

界面同时说明用途和证据边界：

- `OAI-SearchBot`：OpenAI 搜索发现相关爬虫。
- `ChatGPT-User`：用户触发的网页访问请求。
- `Claude-SearchBot`：Anthropic 搜索发现相关爬虫。
- `Googlebot`：Google 搜索抓取器。

结果只显示允许、阻止、规则不明确、robots 不存在或无法验证。允许访问不能升级为已抓取、已索引或已推荐。

robots 解析使用最长匹配和明确 user-agent 组规则；无匹配规则时按公开 robots 标准表达为“未发现阻止规则”，而不是“已收录”。

## 7. 核心页面检查

从首页链接和 Sitemap URL 中识别：

- 首页
- 关于我们
- 联系我们
- 产品列表与详情
- 服务列表与详情
- 企业资质
- 客户案例
- 常见问题
- 隐私政策

工厂类企业额外检查工厂介绍、生产能力、质量控制、认证证书、设备、出口市场和定制能力。

页面分类采用透明的路径、锚文本和标题规则。未发现只能表示“本次证据中未发现”，不能断言网站一定不存在该页面。

每个缺口必须说明业务影响、证据来源、建议动作和完成标准。

## 8. Schema 检查与预览

支持分析和建议：

- `Organization`
- `LocalBusiness`
- `Corporation`
- `Product`
- `Service`
- `ContactPoint`
- `PostalAddress`
- `BreadcrumbList`
- `FAQPage`
- `WebSite`
- `WebPage`
- `Article`

Schema 生成器只读取真实企业资料。输出状态：

- 可以直接生成
- 等待补充
- 不适用
- 已经存在
- 存在错误
- 存在冲突

缺少必需事实时不生成看似完整的 JSON-LD。技术 JSON 默认收起，普通用户优先看到 Schema 用途、缺少资料和建议放置页面。

Sprint 20-B 不调用旧优化生成器中的硬编码 `generateMockContent` 或 `generateMockSchemas`。该旧代码作为独立遗留风险记录，不进入本轮证据链。

## 9. 平台提交中心

支持以下真实官方入口：

- Google Search Console
- Google Business Profile
- Google Merchant Center
- Bing Webmaster Tools
- IndexNow

V1 不保存第三方平台密码，不伪造 OAuth，不声称自动完成平台操作。

无正式 OAuth 或平台 API 时采用：

1. 打开官方入口。
2. 用户自行登录。
3. 用户完成操作。
4. 返回 GeoPilot。
5. 用户确认“我已提交”。
6. GeoPilot 仅保存 `SUBMITTED` 和用户声明证据。
7. 未来只有真实平台或抓取证据才能升级后续状态。

每项任务展示平台、目标 URL、当前状态、证据来源、提交时间、验证时间、步骤说明、完成标准和验证方式。

## 10. AI 搜索验证联动

复用现有 `AISearchQuery`、`AISearchResult` 和 `AISearchCitation`：

- 候选问题可根据已确认企业事实以规则方式整理，但必须由用户确认后保存。
- 检测继续复用 Sprint 20-A 的 Query 去重和历史 Result 机制。
- `OFFICIAL_API`、`COMPATIBLE_GATEWAY` 和 `REAL_PRODUCT_VERIFICATION` 保持明确区分。
- 兼容网关结果不得描述为官方 ChatGPT、Gemini 或 Claude 产品推荐。
- 只有真实成功 Result 中的品牌提及才能支持 `MENTIONED`。
- 只有真实 Citation 记录才能支持 `CITED`。

## 11. API

新增项目级 API：

- `GET /api/projects/[projectId]/ai-presence`
  - 返回企业资料状态、最新检查、历史证据摘要、三大问题、真实已完成工作和唯一下一步。
- `PATCH /api/projects/[projectId]/ai-presence/profile`
  - 更新受控企业资料字段。
- `POST /api/projects/[projectId]/ai-presence/checks`
  - 创建并执行新的网站可发现性检查，保留历史。
- `GET /api/projects/[projectId]/ai-presence/tasks`
  - 分页获取任务与证据历史。
- `POST /api/projects/[projectId]/ai-presence/tasks`
  - 创建准备或提交任务。
- `GET /api/projects/[projectId]/ai-presence/tasks/[taskId]`
  - 获取只读任务详情。
- `PATCH /api/projects/[projectId]/ai-presence/tasks/[taskId]`
  - 仅允许受控状态操作，例如用户确认提交；服务端验证合法状态转换。

所有 API：

- 未登录返回 401。
- Project 不属于当前用户返回 403。
- 输入使用 Zod 校验。
- URL 必须经过现有 SSRF 防护。
- 错误响应不泄露堆栈、数据库信息或敏感凭据。

## 12. 页面与交互

新增 `/projects/[projectId]/geo/ai-presence`。

默认首屏只显示：

1. 当前准备状态，不使用无证据百分比。
2. 三个最重要的问题。
3. 已经完成且有真实证据的工作。
4. 唯一推荐下一步。

详细区域包含：

- 企业资料
- 网站可发现性
- 爬虫访问
- Sitemap 与索引准备
- 核心页面
- Schema 建议
- 平台提交
- AI 搜索验证
- 历史证据

技术字段、原始响应摘要、内部状态和 JSON-LD 默认放入 `TechnicalDetails`。每个页面或状态面板只提供一个视觉主按钮，次要入口使用普通链接。

任务详情使用 `/projects/[projectId]/geo/ai-presence/tasks/[taskId]`，只读展示状态、证据、时间线、完成标准和验证方法。

入口加入 GEO 页面和 Project Workspace，但不删除旧路由。

## 13. 状态推导与唯一下一步

AI Presence 汇总服务只从真实业务数据和最新证据推导状态，不写入隐藏完成标记。

下一步优先级：

1. 企业关键资料缺失：完善企业资料。
2. 尚无网站证据：运行网站检查。
3. 网站无法访问或被阻止：查看修复建议。
4. 缺少核心页面：创建对应优化任务。
5. Schema 缺少事实：补充资料。
6. Schema 可生成但未实施：查看 Schema 方案。
7. 未提交真实平台：打开提交中心。
8. 已提交但未验证：等待或运行真实验证。
9. 尚无 AI Search Query：添加问题。
10. 有 Query 无 Result：运行真实检测。
11. 有结果无提及或 Citation：进入可追溯优化。

## 14. i18n 与移动端

所有新增文案进入现有中英文词典：

- 中文模式使用完整中文。
- 英文模式使用完整英文。
- 数据库枚举不直接暴露给普通用户。

验证视口：

- 1440×900
- 375×812
- 390×844
- 430×932

移动端使用卡片布局、可横向滑动的 Workspace Tab、按钮高度至少 44px、无页面级横向滚动。技术详情、长 URL 和 JSON 必须安全换行。

## 15. 测试

自动化测试至少覆盖：

- 企业资料字段映射与完整状态。
- 电话、地址等一致性检查。
- robots.txt 读取与四类爬虫规则。
- Sitemap 发现和解析。
- Meta Robots、X-Robots-Tag、Canonical 和 Schema 解析。
- 核心页面识别、工厂和服务企业差异化建议。
- Schema 缺失事实保护。
- 状态转换合法性。
- 用户声明提交不能升级为索引。
- 真实证据才能升级 CRAWLED、INDEXED、MENTIONED 和 CITED。
- 重复检查保留历史证据。
- 兼容网关来源标记。
- 无真实 Citation 时不创建 Citation。
- SSRF、权限隔离和安全错误。
- 中英文完整性、技术详情默认收起和唯一下一步。

质量门禁：

- 全部自动化测试
- `npm run lint`
- `npx tsc --noEmit`
- `npx prisma validate`
- `npm run build`

浏览器验收覆盖 AI Presence 首页、企业资料、网站检查、爬虫、Sitemap、核心页面、Schema、提交中心、任务详情、AI 搜索验证、导航和语言切换，并检查 Console、React、Page、Promise、横向滚动、按钮尺寸和状态表达。

## 16. 部署与生产验证

全部本地门禁通过后：

1. 检查敏感文件和 `.playwright-cli/` 未被暂存。
2. 提交到 `main`。
3. 推送 `origin/main`。
4. 等待 Cloudflare Pages 生产部署完成。
5. 在 `https://geopilotapp.com` 验证 401、200、403、Session、Remember Me、四视口、AI Presence 状态与无假收录表达。
6. 清理临时测试项目和数据。

## 17. 明确不在本轮范围

- 不新增企业资料表。
- 不修改 `WebsiteScan` 核心语义。
- 不自动修改客户网站、robots.txt、Sitemap、Schema 或 CMS。
- 不接入新的 AI Provider。
- 不实现 Google 或 Microsoft 密码代管。
- 不实现伪 OAuth。
- 不实现 R2、Queue、邮件、短信或 Webhook。
- 不清理旧优化生成器的硬编码示例；只保证其与 Sprint 20-B 完全隔离，并在完成报告列为遗留风险。
- 不承诺 AI 收录、推荐、排名或 Citation。
