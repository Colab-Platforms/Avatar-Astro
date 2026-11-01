import { Router, type Request, type Response, type NextFunction } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { writeAudit } from "@/modules/admin/audit.js";
import type { MainAdminRequest } from "@/middleware/mainAdmin.js";
import { AUDIO_LANGUAGES, ELEVENLABS_MODELS } from "./astrologyAudio.config.js";
import * as svc from "./astrologyAudio.service.js";

const wrap =
  (fn: (req: MainAdminRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as MainAdminRequest, res).catch((err) => next(svc.toApiError(err)));

const body = (req: Request): Record<string, unknown> => (req.body && typeof req.body === "object" ? req.body : {});

/**
 * Admin API, mounted under /api/admin/astrology/audio. The parent admin router already requires a signed
 * token AND a database re-check of the main admin, so nothing here is reachable without both.
 */
export function createAstrologyAudioAdminRouter(): Router {
  const router = Router();
  // Every generation and preview spends ElevenLabs credits.
  const spend = createRateLimiter({ windowMs: 60_000, max: Number(process.env.ASTRO_AUDIO_SPEND_LIMIT_PER_MIN) || 20, envelope: true });

  router.get("/tools", wrap(async (_req, res) => {
    sendResponse(res, true, { tools: await svc.listTools() });
  }));

  router.get("/config", wrap(async (_req, res) => {
    sendResponse(res, true, {
      voices: await svc.listVoices(),
      models: ELEVENLABS_MODELS,
      languages: AUDIO_LANGUAGES,
      elevenLabsConfigured: svc.providers.isConfigured(),
    });
  }));

  router.put("/config/voices", wrap(async (req, res) => {
    const b = body(req);
    const { voice, verified } = await svc.upsertVoice({
      languageCode: b.languageCode, voiceId: b.voiceId, voiceName: b.voiceName, modelId: b.modelId, isActive: b.isActive,
    });
    await writeAudit(req, {
      action: "astrology_audio.voice.save",
      entityType: "astrology_voice",
      entityId: voice.id,
      summary: `Saved ${voice.languageCode} voice "${voice.voiceName}" (${voice.isActive ? "active" : "inactive"})`,
      metadata: { languageCode: voice.languageCode, modelId: voice.modelId, verified },
    });
    sendResponse(res, true, { voice, verified }, verified ? "Voice saved" : "Voice saved (could not be verified: ElevenLabs is not configured)");
  }));

  router.post("/preview", spend, wrap(async (req, res) => {
    const b = body(req);
    const audio = await svc.previewVoice({ language: b.language, voiceId: b.voiceId, modelId: b.modelId, text: b.text, toolSlug: b.toolSlug });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(STATUS_CODES.OK).send(audio);
  }));

  const generate = (force: boolean) =>
    wrap(async (req, res) => {
      const b = body(req);
      const asset = await svc.startGeneration(b.toolSlug, b.language, b.voiceId, b.modelId, { force, adminId: req.user!.id });
      await writeAudit(req, {
        action: force ? "astrology_audio.regenerate" : "astrology_audio.generate",
        entityType: "astrology_audio",
        entityId: asset.id,
        summary: `${force ? "Regenerating" : "Generating"} ${asset.language} audio for ${asset.toolSlug}`,
        metadata: { toolSlug: asset.toolSlug, language: asset.language, modelId: asset.modelId, contentVersion: asset.contentVersion },
      });
      sendResponse(res, true, { asset }, "Generation started", STATUS_CODES.ACCEPTED);
    });
  router.post("/generate", spend, generate(false));
  router.post("/regenerate", spend, generate(true));

  router.post("/generate-missing", spend, wrap(async (req, res) => {
    const b = body(req);
    if (b.confirm !== true) {
      return void sendResponse(res, false, null, "Confirmation required before generating all missing audio.", STATUS_CODES.BAD_REQUEST);
    }
    const result = await svc.startMissing(b.toolSlug, req.user!.id);
    await writeAudit(req, {
      action: "astrology_audio.generate_missing",
      entityType: "astrology_audio",
      entityId: String(b.toolSlug),
      summary: `Bulk generation for ${String(b.toolSlug)}: ${result.queued.length} queued, ${result.skipped.length} skipped`,
      metadata: { queued: result.queued.map((q) => q.language) },
    });
    sendResponse(res, true, result, "Generation started", STATUS_CODES.ACCEPTED);
  }));

  router.post("/publish", wrap(async (req, res) => {
    const asset = await svc.publishAsset(body(req).assetId);
    await writeAudit(req, {
      action: "astrology_audio.publish",
      entityType: "astrology_audio",
      entityId: asset.id,
      summary: `Published ${asset.language} audio for ${asset.toolSlug} (v${asset.contentVersion})`,
      metadata: { toolSlug: asset.toolSlug, language: asset.language, contentVersion: asset.contentVersion },
    });
    sendResponse(res, true, { asset }, "Audio published");
  }));

  router.get("/:toolSlug", wrap(async (req, res) => {
    sendResponse(res, true, await svc.getTool(req.params.toolSlug));
  }));

  router.put("/:toolSlug/content", wrap(async (req, res) => {
    const b = body(req);
    const n = await svc.saveNarration(req.params.toolSlug, b.language, { title: b.title, text: b.text }, req.user!.id);
    await writeAudit(req, {
      action: "astrology_audio.content.save",
      entityType: "astrology_narration",
      entityId: n.id,
      summary: `Saved ${n.language} narration for ${n.toolSlug} (v${n.version})`,
      metadata: { toolSlug: n.toolSlug, language: n.language, version: n.version },
    });
    sendResponse(res, true, { narration: n }, "Narration saved");
  }));

  return router;
}

/** Public, read-only: published audio metadata only. Mounted under /api/astrology. */
export function createAstrologyAudioPublicRouter(): Router {
  const router = Router();
  router.use(createRateLimiter({ windowMs: 60_000, max: 120, envelope: true }));

  router.get("/tools/:toolSlug/audio", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache");
    try {
      const lang = typeof req.query.language === "string" ? req.query.language : "en";
      sendResponse(res, true, await svc.getPublishedAudio(req.params.toolSlug, lang));
    } catch (err) {
      next(svc.toApiError(err));
    }
  });

  return router;
}
