export type AuthResponsePayload = {
  error?: string;
  [key: string]: unknown;
};

export async function parseAuthResponse(response: Response): Promise<AuthResponsePayload> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return text ? (JSON.parse(text) as AuthResponsePayload) : {};
    } catch (error) {
      console.error("[auth:client] invalid json response", {
        status: response.status,
        contentType,
        bodyPreview: text.slice(0, 300),
        message: error instanceof Error ? error.message : String(error),
      });
      return { error: "认证服务返回格式异常，请刷新页面后重试" };
    }
  }

  console.error("[auth:client] non-json response", {
    status: response.status,
    contentType,
    bodyPreview: text.slice(0, 300),
  });

  if (response.redirected || response.url.includes("/login")) {
    return { error: "登录状态已过期，请刷新页面后重试" };
  }

  return { error: `认证服务暂时不可用（HTTP ${response.status}）` };
}
