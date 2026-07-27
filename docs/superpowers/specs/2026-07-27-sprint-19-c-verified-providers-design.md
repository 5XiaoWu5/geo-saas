# Sprint 19-C：真实 AI 连接与验证式模型选择

## 目标与边界

GeoPilot AI 继续保留 `OPENAI / GEMINI / CLAUDE / PERPLEXITY` 平台语义，在 Provider 配置层区分 OpenAI 官方 API 与第三方 OpenAI 兼容接口。本 Sprint 不执行生产密钥轮换、不伪造付费 Provider 成功、不把 API 回答等同于真实产品界面结果。

## 数据设计

- `AISearchProviderConfig` 保存连接类型、脱敏服务名称、已清理 Base URL、已验证模型、能力证据、兼容等级与验证时间。
- API Key 继续使用现有 AES-256-GCM 版本化密钥架构；浏览器仅获得掩码、密钥版本和安全状态。
- `AISearchResult.detectionSource` 区分 `OFFICIAL_API`、`COMPATIBLE_GATEWAY` 与 `REAL_PRODUCT_VERIFICATION`。
- 旧 `OPENAI` 配置迁移为官方连接；已有成功连接按其真实历史测试映射为基础可用，不重写密文。

## 连接与验证流程

1. 用户选择连接方式并填写必要信息。
2. 服务端验证凭据和 Base URL，获取当前凭据可见的模型。
3. 浏览器只显示服务端返回的模型下拉选项，不允许自由输入。
4. 用户确认后，服务端向所选模型发送一次最小真实请求。
5. 服务端签发与项目、Provider、连接地址、模型和凭据指纹绑定的短时验证凭证。
6. 只有携带有效验证凭证的配置才允许保存为 `VERIFIED_AVAILABLE`。
7. API Key、Base URL、连接类型或服务商变化后，浏览器立即清空旧模型和验证状态。

## OpenAI 官方与兼容接口

- 官方连接固定使用 OpenAI 服务端地址，界面只要求 API Key 和模型。
- 兼容连接要求服务名称、公开 HTTPS Base URL、API Key 与模型。
- 兼容接口使用通用网络图标，明确标注第三方责任，不使用 OpenAI 官方身份。
- 兼容接口采用 OpenAI Chat Completions 兼容协议；正文 URL 不自动升级为 Citation。

## SSRF 与响应安全

- 拒绝 HTTP（生产）、URL 凭据、Query、Fragment、本机、私网、链路本地和云 Metadata 地址。
- 每次请求前执行公开 DNS 解析并复核结果稳定性；重定向目标逐次重新验证。
- 最多两次重定向、20 秒外层超时、1 MB 最大响应。
- Cloudflare 的 `global_fetch_strictly_public` 继续作为平台侧第二层保护。

## 迁移策略

- 新增时间顺序早于空 baseline 的幂等 bootstrap migration，补齐历史运行时 DDL 所负责的结构。
- bootstrap 只做添加和兼容补列，不删除数据；旧库、部分旧库与空库使用同一迁移链。
- Provider 新字段使用独立正式 migration。
- `src/features/auth/server/prisma.ts` 不再包含或执行任何结构 DDL。

## 界面与可访问性

- Provider 卡片采用五步渐进流程，每个状态只突出一个主要下一步操作。
- 技术枚举、模型 ID、Host 与能力详情默认折叠。
- 所有主按钮和输入达到至少 44px；移动端使用单列 Card，不产生页面横向滚动。
- `ProviderLogo` 使用本地品牌资源，兼容接口使用通用图标，加载失败显示稳定 fallback。
- 中文模式使用中文解释，英文模式保持纯英文。

## 错误与证据

- 模型验证区分无权限、模型不存在、余额不足、限流、暂不可用、不支持与验证失败。
- 失败不会静默跳过，也不会保存为成功。
- 官方 API 结果明确提示不等同于网页或手机产品体验；兼容结果不得写成“ChatGPT 已推荐”。
- 暂无真实产品自动验证能力时，不创建 `REAL_PRODUCT_VERIFICATION` 结果。

## 验证

- 单元测试覆盖 DDL 移除、SSRF、DNS、重定向、模型列表、模型错误、验证凭证、Citation 证据和 Logo 身份。
- 所有 API 保持 Session 与 Project ownership 验证。
- 执行全部测试、静态检查、OpenNext 构建与四视口 Chromium 验收。
- 无有效付费 Key 时，真实 Provider 成功测试明确记录为未执行。
