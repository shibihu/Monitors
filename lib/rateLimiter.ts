type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

export class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number = 60_000,
    private readonly maxRequests: number = 60
  ) {}

  private prune(key: string, now: number) {
    const timestamps = this.requests.get(key) ?? [];
    const valid = timestamps.filter((ts) => now - ts < this.windowMs);

    if (valid.length === 0) {
      this.requests.delete(key);
      return [];
    }

    this.requests.set(key, valid);
    return valid;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const timestamps = this.prune(key, now);
    const remaining = this.maxRequests - timestamps.length;

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetInMs = Math.max(0, this.windowMs - (now - oldest));

      return {
        allowed: false,
        remaining: 0,
        resetInMs
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, remaining - 1),
      resetInMs: this.windowMs
    };
  }
}

export const rateLimiter = new InMemoryRateLimiter();
