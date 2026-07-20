# Sprint 15-A AI Search Growth Intelligence Center v2

## 范围

在不复制现有可见性、知识、竞品和优化模型的前提下，新增企业可理解的 AI 搜索增长驾驶舱、严格证据解释、固定权重增长评分和现有优化任务的 Top 10 路线图。

## 数据边界

- AI 可见性仅统计 `SUCCEEDED` 的 `AISearchResult`；没有成功检测时显示 `unavailable`。
- Citation 使用 `AISearchCitation.citationCount`，不把普通 URL 或规则模拟当成真实引用。
- 知识完整度使用持久化的 `CompanyKnowledgeBase.completenessScore`。
- 实体权威按最新 `EntityProfile` 已填写字段覆盖率计算。
- 竞争评分使用最新已完成 Benchmark 的自身与最高竞品综合分。
- 缺失维度按 0 参与固定权重总分，并通过可信度明确反映证据覆盖；不重新归一化。

## 评分

`overall = visibility × 25% + citation × 20% + knowledge × 20% + authority × 20% + competition × 15%`。

单维度没有证据时保存为 `null`。全部维度均无证据时，接口返回 `unavailable` 且不制造评分记录。

## 页面与交互

- 新入口：`/projects/[projectId]/geo/command-center`。
- 使用企业语言展示平台出现次数、引用、品牌提及、平均推荐排名、历史检测、竞争比较、推荐解释、增长评分和 AI Growth Roadmap。
- 关系链采用 `SEO → GEO → AI Recommendation` 的可追溯阶段展示。
- Dashboard 增加“企业 AI 增长健康度”，缺失指标显示 `unavailable`。
- 移动端顶部项目 Tab 保持横向滑动，页面卡片不产生整页横向滚动，操作按钮最小高度 44px。

## 安全与错误

- 新 API 强制 Session 和 Project ownership；未登录返回 401，跨用户返回 403。
- GET 只读取聚合数据，POST 才持久化新评分。
- 解释原因必须携带来源 ID；没有可追溯证据时返回 `unavailable`。
- Top 10 路线图只整理现有 `OptimizationTask`，不创建第二套任务系统。

## 验证

执行评分和解释单元测试、Prisma validate/generate、专项架构检查、`npm run lint`、`npm run build`、401/403/200 API 验证，以及 1440/375/390/430px 真实浏览器验证。
