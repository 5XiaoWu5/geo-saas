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
  OPENAI: { name: "OpenAI", logo: "/provider-logos/openai.svg?v=2", apiKeyUrl: "https://platform.openai.com/api-keys", docsUrl: "https://platform.openai.com/docs/overview", environmentReference: "env:OPENAI_API_KEY", description: { zh: "通过 OpenAI 官方 API 检测回答中的品牌出现与真实结构化引用。", en: "Check brand appearances and structured citations through the official OpenAI API." } },
  GEMINI: { name: "Gemini", logo: "/provider-logos/gemini.svg?v=2", apiKeyUrl: "https://aistudio.google.com/app/apikey", docsUrl: "https://ai.google.dev/gemini-api/docs", environmentReference: "env:GEMINI_API_KEY", description: { zh: "通过 Google Gemini API 检测企业实体与产品表现。", en: "Check business entity and product performance through the Google Gemini API." } },
  CLAUDE: { name: "Claude", logo: "/provider-logos/claude.svg?v=2", apiKeyUrl: "https://console.anthropic.com/settings/keys", docsUrl: "https://docs.anthropic.com/en/api/overview", environmentReference: "env:ANTHROPIC_API_KEY", description: { zh: "通过 Anthropic Claude API 检测品牌理解与回答表现。", en: "Check brand understanding and answer performance through the Anthropic Claude API." } },
  PERPLEXITY: { name: "Perplexity", logo: "/provider-logos/perplexity.svg?v=2", apiKeyUrl: "https://www.perplexity.ai/settings/api", docsUrl: "https://docs.perplexity.ai/", environmentReference: "env:PERPLEXITY_API_KEY", description: { zh: "检测 Perplexity API 回答中的品牌出现与真实来源引用。", en: "Check brand appearances and structured sources in Perplexity API answers." } },
};
