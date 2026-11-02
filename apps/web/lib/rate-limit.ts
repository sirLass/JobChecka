/**
 * Minimal per-user rate limiter for API routes (IMPLEMENTATION_PLAN section 8:
 * "rate limit per user"). This is a fixed-window counter held in module memory.
 *
 * Limits apply per server instance; on serverless platforms each instance
 * counts separately, so treat this as an abuse brake at Phase 1 scale. If we
 * need a hard global cap (Phase 5 hardening), move this to a durable store
 * (e.g. Upstash Redis) behind the same interface.
 */

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds to wait before retrying (0 when ok). */
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const list = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (list.length >= limit) {
    const oldest = list[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  list.push(now);
  hits.set(key, list);

  // Keep memory bounded; drop fully-expired buckets when the map grows.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => t > windowStart)) hits.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort identity for a request: the user id when signed in, otherwise IP. */
export function rateLimitKey(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("|") || "anonymous";
}
