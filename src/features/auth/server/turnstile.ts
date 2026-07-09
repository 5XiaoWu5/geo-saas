export type TurnstileSiteverifyResult = {
  success?: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  metadata?: unknown;
};

function logTurnstile(event: string, data: Record<string, unknown>) {
  console.info(`[turnstile] ${event}`, data);
}

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  logTurnstile("verify:start", {
    tokenPresent: Boolean(token),
    tokenLength: token?.length ?? 0,
    ipPresent: Boolean(ip),
  });

  if (!token) {
    logTurnstile("verify:missing-token", { tokenPresent: false });
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    const allowedWithoutSecret = process.env.NODE_ENV !== "production";
    logTurnstile("verify:missing-secret", { nodeEnv: process.env.NODE_ENV, allowedWithoutSecret });
    return allowedWithoutSecret;
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const result = await response.json().catch((error: unknown) => ({
      success: false,
      "error-codes": ["invalid-json-response"],
      parseError: error instanceof Error ? error.message : String(error),
    })) as TurnstileSiteverifyResult & { parseError?: string };

    logTurnstile("verify:siteverify-result", {
      httpOk: response.ok,
      httpStatus: response.status,
      success: result.success === true,
      errorCodes: result["error-codes"] ?? [],
      hostname: result.hostname,
      challengeTs: result.challenge_ts,
      action: result.action,
      cdata: result.cdata,
      parseError: result.parseError,
    });

    if (!response.ok) return false;
    return result.success === true;
  } catch (error) {
    logTurnstile("verify:siteverify-error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
