import type { AIProvider, AIProviderConfig, AIResponse } from "@/features/geo-brain/providers/types";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatChoice = {
  message?: {
    content?: string;
  };
};

type ChatCompletionResponse = {
  model?: string;
  choices?: ChatChoice[];
};

function toJsonContext(context: unknown) {
  if (typeof context === "undefined") return "";
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return String(context);
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  constructor(private readonly config: AIProviderConfig) {}

  async analyze(prompt: string, context?: unknown): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are GeoPilot AI Brain, a strict GEO analysis engine. Return concise JSON when requested and never expose credentials.",
      },
      {
        role: "user",
        content: `${prompt}\n\nContext:\n${toJsonContext(context)}`,
      },
    ];

    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.2,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";

    return {
      text,
      model: data.model ?? this.config.model,
      provider: this.config.provider,
      raw: data,
    };
  }
}
