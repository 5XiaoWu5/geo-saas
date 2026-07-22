# Sprint 15-B AI Search Monitoring & Automation Center

## 实现边界

- 真实数据只来自 `AISearchResult` 与 `AISearchCitation`；没有检测结果时统一返回 `unavailable`。
- `MonitoringSchedule` 只保存日/周/月计划和下次运行时间，本 Sprint 不启动 Cron、Queue 或后台任务。
- 每次手动真实 Provider 执行都写入 `MonitoringHistory`；成功后才运行前后轮变化检测，失败只记录 Provider 失败事件。
- 变化联动复用 `GrowthSnapshot`、`OptimizationTask`，不创建第二套增长时间线或任务系统。
- 站内 `Notification` 只关联项目和可选优化任务，不发送邮件、短信或 Webhook。

## 真实变化规则

同一项目、同一 Provider 的最近两条成功 `AISearchResult` 才能比较：

- 上一轮提及、当前未提及：`REAL_AI_VISIBILITY_DROP`，HIGH。
- Citation 数下降：`CITATION_DROP`，下降 50% 及以上为 HIGH，否则 MEDIUM。
- 推荐排名数字变大：`RANKING_DROP`，下降 3 位及以上为 HIGH，否则 MEDIUM。
- 反向变化记录为提升事件，只写 Growth Timeline 和站内通知，不创建优化任务。
- 没有上一轮成功结果：变化状态 `unavailable`，不生成任何变化事件。

## 数据模型

- `MonitoringSchedule`：项目唯一，保存 enabled、frequency、dailyTime、timezone、nextRunAt、lastRunAt、status。
- `MonitoringHistory`：保存 Provider、开始/结束、成功/失败数量、耗时、错误、Result 数量和 Result ID。
- `Notification`：保存类型、标题、内容、等级、已读、项目、可选 OptimizationTask 和幂等 sourceKey。
- `GrowthEventType` 只扩展 `AI_SEARCH` 枚举值，不改变旧事件语义。

## API 与权限

- Monitoring Center 汇总、Schedule、History、Notification API 全部先校验 Session，再校验 Project ownership。
- 未登录返回 401，跨用户返回 403。
- History 支持 page/pageSize、Provider、状态和搜索词。
- Notification 支持列表和单条/全部已读。

## 页面

- `/projects/[projectId]/geo/monitoring-center`：平台状态、趋势、计划、变化、Top Alert、通知和下一模块。
- `/projects/[projectId]/geo/monitoring-center/history`：分页、筛选、搜索。
- `/projects/[projectId]/notifications`：项目站内通知基础页。
- Dashboard 增加最近检测、下降、提升、待处理变化和 Top Alert。

## 验证

执行变化检测与计划计算单元测试、Prisma validate/generate、专项检查、lint/build、401/403/200 生产 API 验证，以及 1440/375/390/430px 生产浏览器验证。浏览器验证覆盖项目 Tab 滑动、历史/通知/真实检测模块跳转、按钮高度、横向溢出、Console 与 React 错误。
