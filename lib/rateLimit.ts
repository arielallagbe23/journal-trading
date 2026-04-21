const g = globalThis as typeof globalThis & Record<string, unknown>;
type RateLimitStore = Map<string, { count: number; resetAt: number }>;
const _store: RateLimitStore =
  (g.__RATE_LIMIT_STORE__ as RateLimitStore | undefined) ?? new Map();
if (!g.__RATE_LIMIT_STORE__) g.__RATE_LIMIT_STORE__ = _store;

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = _store.get(key);

  if (!entry || now > entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
