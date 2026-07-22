import type { AISearchProviderType } from "./types";

export type ProviderMetadata = {
  name: string;
  logo: string;
  apiKeyUrl: string;
  docsUrl: string;
  environmentReference: string;
  description: { zh: string; en: string };
};

export const PROVIDER_METADATA: Record<AISearchProviderType, ProviderMetadata> = {
  OPENAI: { name: "OpenAI", logo: "https://cdn.simpleicons.org/openai/FFFFFF", apiKeyUrl: "https://platform.openai.com/api-keys", docsUrl: "https://platform.openai.com/docs/overview", environmentReference: "env:OPENAI_API_KEY", description: { zh: "用于 ChatGPT / OpenAI 的品牌提及、推荐顺序与引用检测。", en: "Brand mention, recommendation order, and citation checks through OpenAI." } },
  GEMINI: { name: "Gemini", logo: "https://cdn.simpleicons.org/googlegemini/8E75B2", apiKeyUrl: "https://aistudio.google.com/app/apikey", docsUrl: "https://ai.google.dev/gemini-api/docs", environmentReference: "env:GEMINI_API_KEY", description: { zh: "通过 Google Gemini 检测企业实体与产品推荐表现。", en: "Business entity and product recommendation checks through Google Gemini." } },
  CLAUDE: { name: "Claude", logo: "https://cdn.simpleicons.org/anthropic/D4A27F", apiKeyUrl: "https://console.anthropic.com/settings/keys", docsUrl: "https://docs.anthropic.com/en/api/overview", environmentReference: "env:ANTHROPIC_API_KEY", description: { zh: "通过 Anthropic Claude 检测品牌理解与推荐回答。", en: "Brand understanding and recommendation response checks through Anthropic Claude." } },
  PERPLEXITY: { name: "Perplexity", logo: "https://cdn.simpleicons.org/perplexity/20B8CD", apiKeyUrl: "https://www.perplexity.ai/settings/api", docsUrl: "https://docs.perplexity.ai/", environmentReference: "env:PERPLEXITY_API_KEY", description: { zh: "检测 Perplexity 搜索回答中的品牌出现、排名与来源引用。", en: "Brand appearance, ranking, and source citation checks in Perplexity answers." } },
};
