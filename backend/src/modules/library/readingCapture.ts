import type { Request, Response, NextFunction } from "express";
import { currentUsageStore, summarizeCalls } from "@/utils/aiUsageCapture.js";
import { appendExchange, createReading } from "./library.service.js";
import { SPECS, type CaptureSpec } from "./readingSpecs.js";

/**
 * Saves the ORIGINAL result of a successful AI generation to the signed-in user's library, at the moment it is generated, on the server.
 *
 *  - Identity comes only from req.user (set by auth() / optionalAuth() from the verified token). Anonymous requests save nothing.
 *  - Only 2xx responses are saved, and (unless a spec says otherwise) only when an AI provider call in this request succeeded, so
 *    failed generations and canned fallbacks are never stored as readings.
 *  - The response body is NOT changed. Headers tell the client what happened: X-Reading-Id or X-Conversation-Id, and X-Reading-Saved.
 *    If the save fails the header says "false" and the response is still delivered: the user is never told something was saved when it was not.
 *  - The response is sent after the save finishes, so the id is available to the client immediately.
 */
export function captureReadings(specs: CaptureSpec[] = SPECS) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "POST") return next();
    const path = req.originalUrl.split("?")[0].replace(/^\/api/, "");
    let match: RegExpMatchArray | null = null;
    const spec = specs.find((s) => s.method === req.method && (match = path.match(s.path)) !== null);
    if (!spec || !match) return next();
    const m = match as RegExpMatchArray;

    const origJson = res.json.bind(res);
    let intercepted = false;
    res.json = ((body: any) => {
      if (intercepted) return origJson(body);
      intercepted = true;
      const userId = (req as any).user?.id as string | undefined;
      const store = currentUsageStore();
      if (!userId || res.statusCode >= 400) return origJson(body);
      let built: ReturnType<CaptureSpec["build"]>;
      try {
        built = spec.build(req, body, m);
      } catch {
        built = null;
      }
      if (!built) return origJson(body);
      const providerOk = !!store?.calls.some((c) => c.ok);
      if (built.kind === "reading" && built.requiresProvider !== false && !providerOk) return origJson(body);
      if (built.kind === "conversation" && !providerOk) return origJson(body);

      const ai = summarizeCalls(store?.calls.filter((c) => c.ok) ?? []);
      const clientKey = typeof req.headers["x-client-request-id"] === "string" ? req.headers["x-client-request-id"] : null;
      const save =
        built.kind === "reading"
          ? createReading({ userId, feature: built.feature, title: built.title, output: built.output, summary: built.summary, inputMeta: built.inputMeta, provider: ai.aiProvider, model: ai.aiModel, clientRequestId: clientKey }).then((r) => ({ header: "X-Reading-Id", id: r.id }))
          : appendExchange({ userId, feature: built.feature, conversationId: built.conversationId, user: built.user, assistant: built.assistant }).then((r) => ({ header: "X-Conversation-Id", id: r.id }));
      save
        .then((r) => {
          res.setHeader(r.header, r.id);
          res.setHeader("X-Reading-Saved", "true");
        })
        .catch((err) => {
          console.warn("[library] result not saved:", err?.code ?? err?.message);
          res.setHeader("X-Reading-Saved", "false");
        })
        .finally(() => {
          origJson(body);
        });
      return res;
    }) as typeof res.json;
    next();
  };
}
