import { SOLVE_RATE_LIMIT_PER_HOUR } from '../config';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limit per IP / eenvoudige rate limit per IP */
export function checkRateLimit(clientIp: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const bucket = buckets.get(clientIp);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(clientIp, { count: 1, resetAt: now + hourMs });
    return { ok: true };
  }

  if (bucket.count >= SOLVE_RATE_LIMIT_PER_HOUR) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}

export function getClientIp(request: Request, fallback = 'unknown'): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || fallback;
  return request.headers.get('x-real-ip') || fallback;
}
