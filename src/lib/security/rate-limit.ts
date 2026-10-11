interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, RateBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitResult {
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= nowMs) {
    const resetAt = nowMs + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

export function resetRateLimitBuckets(): void {
  memoryBuckets.clear();
}
