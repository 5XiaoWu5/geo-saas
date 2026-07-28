# GeoPilot AI 多网关连接设计

日期：2026-07-27
状态：用户已确认

## 目标

把第三方中转站从 OpenAI 官方配置中独立出来。一个项目可以保存多条网关连接；每条连接使用独立加密密钥，并可以绑定多个已验证模型。官方 Provider 配置继续保持向后兼容。

## 数据边界

- `AISearchGatewayConnection`：连接级配置，只负责服务名称、Base URL、协议、加密密钥、启用状态与最近测试。
- `AISearchGatewayModel`：连接下的模型绑定，记录模型 ID、模型家族、验证状态、能力与默认路由。
- 业务检测结果继续写入现有 `AISearchResult`、`AISearchCitation`、Visibility 与 Optimization 链路。
- 密钥继续使用版本化 AES-GCM；AAD 使用 `GATEWAY:<connectionId>`，API 永不返回密文或明文。

## 协议

- `OPENAI_COMPATIBLE`：`/v1/models`、`/v1/chat/completions`。
- `ANTHROPIC_COMPATIBLE`：`/v1/models`（若支持）与 `/v1/messages`。
- `GEMINI_COMPATIBLE`：`/v1beta/models` 与 `generateContent`。

服务端根据模型 ID 识别 OpenAI、Claude、Gemini、Perplexity 或 Other；用户可修正模型家族。一个连接可选择多个模型，并为不同模型家族各设一个默认模型。

## UI

使用“连接资产列表 + 右侧/移动端全屏配置面板”：

1. 顶部显示连接总数、已验证模型数和异常连接数。
2. 每张连接卡显示服务名称、公开主机、协议、密钥掩码、模型数量和状态。
3. 主操作只有“添加中转站”；卡片提供“管理模型”“重新测试”“停用”次级操作。
4. 配置流程分为连接信息、测试并读取模型、选择多个模型、逐个验证、保存五步。
5. 错误信息显示真实安全错误码的用户说明，不泄露密钥或内部响应。

## 安全修复

Cloudflare Workers 不支持 `fetch(..., { redirect: "error" })`。DNS-over-HTTPS 请求改为 `manual` 并显式拒绝重定向。DNS Rebinding 判断从“两个答案集合必须完全一致”改为“每次解析结果均非私网”，兼容合法 CDN 轮询，同时每次真实请求和每次跳转都重新校验目标。

## 验收

- 指定中转站可完成安全校验并读取真实模型列表。
- 同项目可保存至少两条连接，每条连接可选择多个模型。
- 重复连接、跨项目访问和私网目标被拒绝。
- API 401/403/200；无密钥泄漏。
- 1440、375、390、430 四视口无横向滚动，按钮不小于 44px。
- lint、build、单元测试、生产部署与真实浏览器验证通过。
