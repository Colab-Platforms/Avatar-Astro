import type { Request, Response, NextFunction } from "express";

/** Admin and per-user responses must never be stored by browsers, proxies or CDNs. */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
}
