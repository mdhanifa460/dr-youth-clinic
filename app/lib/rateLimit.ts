interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>();

// Purge expired entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function tooManyRequestsResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
