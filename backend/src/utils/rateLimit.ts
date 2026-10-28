import { Request, Response, NextFunction } from "express";

/**
 * Minimal in-memory fixed-window rate limiter keyed by client IP.
 * Per-process only: with multiple instances each keeps its own counters.
 */
export function createRateLimiter(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, opts.windowMs);
  timer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res
        .status(429)
        .json({ error: { message: opts.message ?? "Too many requests. Please try again shortly." } });
    }
    next();
  };
}
