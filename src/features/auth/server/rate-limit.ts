type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(rule.key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    buckets.set(rule.key, { count: 1, resetAt });
    return { success: true, remaining: rule.limit - 1, resetAt };
  }

  if (current.count >= rule.limit) {
    return { success: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(rule.key, current);
  return { success: true, remaining: rule.limit - current.count, resetAt: current.resetAt };
}

export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json({ error: "Too many requests. Please try again later.", resetAt }, { status: 429 });
}
