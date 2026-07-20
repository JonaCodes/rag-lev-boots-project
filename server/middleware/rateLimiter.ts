import { Request, Response, NextFunction } from 'express';

interface WindowState {
  count: number;
  windowStart: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// Hand-rolled per-IP fixed-window limiter. This app has exactly two routes
// to protect, so a small in-memory counter is enough — no need for the
// express-rate-limit dependency (and its shared-store config surface) for
// this scope. Note: relies on req.ip, which reflects the socket address
// unless `app.set('trust proxy', ...)` is configured — fine for local/single
// -instance use, would need revisiting behind a real reverse proxy.
export function createRateLimiter({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, WindowState>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const state = hits.get(key);

    if (!state || now - state.windowStart >= windowMs) {
      hits.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (state.count >= max) {
      const retryAfterSec = Math.ceil((state.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ answer: '', error: 'Too many requests, please try again later.' });
      return;
    }

    state.count++;
    next();
  };
}
