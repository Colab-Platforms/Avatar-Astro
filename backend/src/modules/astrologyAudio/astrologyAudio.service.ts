import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { uploadAudioBuffer, type UploadedAudio } from "@/config/cloudinary.js";
import {
  AUDIO_LANGUAGES,
  AUDIO_TOOLS,
  ELEVENLABS_MODELS,
  NARRATION_MAX_CHARS,
  NARRATION_MIN_CHARS,
  PREVIEW_MAX_CHARS,
  VOICE_ID_PATTERN,
  contentHash,
  isLanguage,
  isToolSlug,
  languageName,
  looksLikeDevanagari,
  modelSupportsLanguage,
  normalizeText,
  type LanguageCode,
  type ToolSlug,
} from "./astrologyAudio.config.js";
import { ENGLISH_SEED, seedNarrationText } from "./astrologyAudio.seed.js";
import { ElevenLabsError, isElevenLabsConfigured, synthesizeSpeech, verifyVoice } from "./elevenlabs.js";

/** A generation that has been "running" longer than this is presumed dead (e.g. the server restarted). */
const STALE_MS = 10 * 60_000;

const bad = (m: string) => new ApiError(m, STATUS_CODES.BAD_REQUEST);
const conflict = (m: string) => new ApiError(m, STATUS_CODES.CONFLICT);
const notFound = (m: string) => new ApiError(m, STATUS_CODES.NOT_FOUND);

/** Swappable in tests so no real ElevenLabs/Cloudinary call is ever made. */
export const providers = {
  synthesize: synthesizeSpeech,
  verifyVoice,
  upload: uploadAudioBuffer as (buf: Buffer, publicId: string) => Promise<UploadedAudio>,
  isConfigured: isElevenLabsConfigured,
};

/** Maps a provider failure to an HTTP error with a message that is safe to show an admin. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ElevenLabsError) {
    const status =
      err.code === "INSUFFICIENT_CREDITS" ? 402
      : err.code === "RATE_LIMITED" ? STATUS_CODES.TOO_MANY_REQUESTS
      : err.code === "TIMEOUT" ? 504
      : err.code === "INVALID_REQUEST" || err.code === "VOICE_NOT_FOUND" ? STATUS_CODES.BAD_REQUEST
      : err.code === "NOT_CONFIGURED" ? 503
      : 502;
    return new ApiError(err.message, status);
  }
  console.error("[astrologyAudio] unexpected error:", (err as Error)?.message);
  return new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR);
}

type Tx = Prisma.TransactionClient;

/** Serialises changes for one tool+language across requests (and server instances) until commit. */
async function withLock<T>(toolSlug: string, language: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`astrology-audio:${toolSlug}:${language}`}))`;
      return fn(tx);
    },
    { timeout: 20_000 },
  );
}

export function assertToolAndLanguage(toolSlug: unknown, language?: unknown): { toolSlug: ToolSlug; language?: LanguageCode } {
  if (!isToolSlug(toolSlug)) throw notFound("Unknown astrology tool");
  if (language !== undefined && !isLanguage(language)) throw bad("Unsupported language. Use en, hi or mr.");
  return { toolSlug, language: language as LanguageCode | undefined };
}

/** Narration must be sane and, for Hindi/Marathi, genuinely in Devanagari. */
export function validateNarrationText(language: LanguageCode, raw: unknown): string {
  if (typeof raw !== "string") throw bad("Narration text is required.");
  const text = normalizeText(raw);
  if (text.length < NARRATION_MIN_CHARS) throw bad(`Narration text must be at least ${NARRATION_MIN_CHARS} characters.`);
  if (text.length > NARRATION_MAX_CHARS) throw bad(`Narration text must be at most ${NARRATION_MAX_CHARS} characters.`);
  if (language !== "en" && !looksLikeDevanagari(text)) {
    throw bad(`This text is not in ${languageName(language)} (Devanagari). Enter the ${languageName(language)} translation before generating audio.`);
  }
  return text;
}

// ── Content ────────────────────────────────────────────────────────────────

/** Creates the English row for each tool the first time. Never overwrites an existing (possibly edited) row. */
export async function ensureEnglishSeed(): Promise<void> {
  const data = AUDIO_TOOLS.map((t) => {
    const e = ENGLISH_SEED[t.slug];
    const text = normalizeText(seedNarrationText(e));
    return { toolSlug: t.slug, language: "en", title: e.title, text, contentHash: contentHash("en", text), translationStatus: "SOURCE" };
  });
  await prisma.astrologyNarration.createMany({ data, skipDuplicates: true });
}

export async function saveNarration(
  toolSlugIn: unknown,
  languageIn: unknown,
  input: { title?: unknown; text: unknown },
  adminId: string,
) {
  const { toolSlug, language } = assertToolAndLanguage(toolSlugIn, languageIn);
  if (!language) throw bad("language is required.");
  await ensureEnglishSeed();
  const text = validateNarrationText(language, input.text);
  const hash = contentHash(language, text);

  return withLock(toolSlug, language, async (tx) => {
    const existing = await tx.astrologyNarration.findUnique({ where: { toolSlug_language: { toolSlug, language } } });
    const english = language === "en" ? existing : await tx.astrologyNarration.findUnique({ where: { toolSlug_language: { toolSlug, language: "en" } } });
    const label = AUDIO_TOOLS.find((t) => t.slug === toolSlug)!.label;
    const title =
      typeof input.title === "string" && input.title.trim()
        ? input.title.trim().slice(0, 160)
        : existing?.title ?? english?.title ?? `About ${label}`;

    if (!existing) {
      return tx.astrologyNarration.create({
        data: { toolSlug, language, title, text, contentHash: hash, version: 1, translationStatus: "REVIEWED", updatedBy: adminId },
      });
    }
    const changed = existing.contentHash !== hash;
    const saved = await tx.astrologyNarration.update({
      where: { id: existing.id },
      data: {
        title,
        text,
        contentHash: hash,
        updatedBy: adminId,
        ...(changed ? { version: { increment: 1 }, translationStatus: "REVIEWED" } : {}),
      },
    });
    if (changed) {
      // Audio for the old wording is stale. A published one stays live (isPublished is untouched)
      // until a replacement is generated and approved; it just can no longer be re-published.
      await tx.astrologyAudioAsset.updateMany({
        where: { narrationId: existing.id, contentHash: { not: hash }, status: { in: ["READY", "PENDING"] } },
        data: { status: "OUTDATED" },
      });
    }
    return saved;
  });
}

// ── Voices ─────────────────────────────────────────────────────────────────

export const listVoices = () => prisma.astrologyVoiceConfig.findMany({ orderBy: [{ languageCode: "asc" }, { voiceName: "asc" }] });

export async function upsertVoice(input: {
  languageCode: unknown;
  voiceId: unknown;
  voiceName: unknown;
  modelId: unknown;
  isActive?: unknown;
}) {
  const { language } = assertToolAndLanguage("tarot", input.languageCode);
  if (!language) throw bad("languageCode is required.");
  const voiceId = typeof input.voiceId === "string" ? input.voiceId.trim() : "";
  if (!VOICE_ID_PATTERN.test(voiceId)) throw bad("Voice ID must be 8-40 letters/digits, as shown in ElevenLabs.");
  const voiceName = typeof input.voiceName === "string" ? input.voiceName.trim().slice(0, 80) : "";
  if (!voiceName) throw bad("Voice display name is required.");
  const modelId = typeof input.modelId === "string" ? input.modelId : "";
  if (!ELEVENLABS_MODELS.some((m) => m.id === modelId)) throw bad("Unknown ElevenLabs model.");
  if (!modelSupportsLanguage(modelId, language)) throw bad(`Model ${modelId} does not support ${languageName(language)}.`);

  // Confirm the voice exists on this ElevenLabs account when we can; otherwise save it flagged unverified.
  let verified = false;
  if (providers.isConfigured()) {
    try {
      await providers.verifyVoice(voiceId);
      verified = true;
    } catch (err) {
      throw toApiError(err);
    }
  }
  const isActive = input.isActive === undefined ? true : input.isActive === true;
  const voice = await prisma.astrologyVoiceConfig.upsert({
    where: { languageCode_voiceId: { languageCode: language, voiceId } },
    update: { voiceName, modelId, isActive, languageName: languageName(language) },
    create: { languageCode: language, languageName: languageName(language), voiceId, voiceName, modelId, isActive },
  });
  return { voice, verified };
}

/** The voice must be one an admin configured and activated for this language; client-sent ids are never used raw. */
async function resolveVoice(language: LanguageCode, voiceId: unknown, modelId: unknown) {
  if (typeof voiceId !== "string" || !VOICE_ID_PATTERN.test(voiceId)) throw bad("Select a valid voice.");
  const voice = await prisma.astrologyVoiceConfig.findUnique({ where: { languageCode_voiceId: { languageCode: language, voiceId } } });
  if (!voice || !voice.isActive) throw bad(`That voice is not configured and active for ${languageName(language)}.`);
  const model = typeof modelId === "string" && modelId ? modelId : voice.modelId;
  if (!ELEVENLABS_MODELS.some((m) => m.id === model)) throw bad("Unknown ElevenLabs model.");
  if (!modelSupportsLanguage(model, language)) throw bad(`Model ${model} does not support ${languageName(language)}. Choose a compatible model.`);
  return { voice, modelId: model };
}

export async function previewVoice(input: { language: unknown; voiceId: unknown; modelId: unknown; text?: unknown; toolSlug?: unknown }): Promise<Buffer> {
  const { language } = assertToolAndLanguage("tarot", input.language);
  if (!language) throw bad("language is required.");
  const { voice, modelId } = await resolveVoice(language, input.voiceId, input.modelId);

  let source = input.text;
  if (source === undefined && input.toolSlug !== undefined) {
    const { toolSlug } = assertToolAndLanguage(input.toolSlug);
    await ensureEnglishSeed();
    source = (await prisma.astrologyNarration.findUnique({ where: { toolSlug_language: { toolSlug, language } } }))?.text;
  }
  if (typeof source !== "string" || !source.trim()) throw bad("Nothing to preview. Enter narration text first.");
  const text = normalizeText(source).slice(0, PREVIEW_MAX_CHARS);
  if (language !== "en" && !looksLikeDevanagari(text)) {
    throw bad(`This text is not in ${languageName(language)}. Enter the translation first.`);
  }
  try {
    return await providers.synthesize({ text, voiceId: voice.voiceId, modelId });
  } catch (err) {
    throw toApiError(err);
  }
}

// ── Generation ─────────────────────────────────────────────────────────────

interface Job {
  assetId: string;
  text: string;
  toolSlug: ToolSlug;
  language: LanguageCode;
  voiceId: string;
  modelId: string;
  version: number;
  hash: string;
}

/** One generation at a time process-wide: keeps within ElevenLabs concurrency limits and orders bulk runs. */
let queue: Promise<unknown> = Promise.resolve();
export const whenIdle = () => queue;
function enqueue(jobs: Job[]) {
  for (const job of jobs) queue = queue.then(() => runJob(job)).catch(() => undefined);
}

/** Validates and records a new generation (status GENERATING). Does not start the work. */
async function createGeneration(
  toolSlugIn: unknown,
  languageIn: unknown,
  voiceIdIn: unknown,
  modelIdIn: unknown,
  opts: { force: boolean; adminId: string },
): Promise<Job & { asset: Awaited<ReturnType<typeof prisma.astrologyAudioAsset.create>> }> {
  const { toolSlug, language } = assertToolAndLanguage(toolSlugIn, languageIn);
  if (!language) throw bad("language is required.");
  await ensureEnglishSeed();
  const { voice, modelId } = await resolveVoice(language, voiceIdIn, modelIdIn);

  return withLock(toolSlug, language, async (tx) => {
    const narration = await tx.astrologyNarration.findUnique({ where: { toolSlug_language: { toolSlug, language } } });
    if (!narration) {
      throw bad(`There is no ${languageName(language)} text for this tool yet. Enter and save the translation first.`);
    }
    const text = validateNarrationText(language, narration.text);

    // A job that has run too long is dead (server restart); free the slot.
    await tx.astrologyAudioAsset.updateMany({
      where: { toolSlug, language, status: { in: ["PENDING", "GENERATING"] }, createdAt: { lt: new Date(Date.now() - STALE_MS) } },
      data: { status: "FAILED", errorMessage: "Generation did not finish (timed out). Please retry." },
    });
    const running = await tx.astrologyAudioAsset.findFirst({
      where: { toolSlug, language, status: { in: ["PENDING", "GENERATING"] } },
      select: { id: true },
    });
    if (running) throw conflict("Audio is already being generated for this tool and language. Wait for it to finish.");

    if (!opts.force) {
      const same = await tx.astrologyAudioAsset.findFirst({
        where: { narrationId: narration.id, contentHash: narration.contentHash, voiceId: voice.voiceId, modelId, status: "READY" },
        select: { id: true },
      });
      if (same) throw conflict("This text, voice and model already have generated audio. Use Regenerate to create a new take.");
    }

    const asset = await tx.astrologyAudioAsset.create({
      data: {
        narrationId: narration.id,
        toolSlug,
        language,
        contentVersion: narration.version,
        contentHash: narration.contentHash,
        modelId,
        voiceId: voice.voiceId,
        status: "GENERATING",
        createdBy: opts.adminId,
      },
    });
    return { asset, assetId: asset.id, text, toolSlug, language, voiceId: voice.voiceId, modelId, version: narration.version, hash: narration.contentHash };
  });
}

/** Starts generation in the background; the admin UI polls the asset status. */
export async function startGeneration(
  toolSlug: unknown,
  language: unknown,
  voiceId: unknown,
  modelId: unknown,
  opts: { force: boolean; adminId: string },
) {
  const { asset, ...job } = await createGeneration(toolSlug, language, voiceId, modelId, opts);
  enqueue([job]);
  return asset;
}

/** Generates every language that has approved text but no READY audio for it yet. Uses each language's first active voice. */
export async function startMissing(toolSlugIn: unknown, adminId: string) {
  const { toolSlug } = assertToolAndLanguage(toolSlugIn);
  await ensureEnglishSeed();
  const queued: { language: string; assetId: string }[] = [];
  const skipped: { language: string; reason: string }[] = [];
  const jobs: Job[] = [];

  for (const lang of AUDIO_LANGUAGES) {
    const narration = await prisma.astrologyNarration.findUnique({ where: { toolSlug_language: { toolSlug, language: lang.code } } });
    if (!narration) { skipped.push({ language: lang.code, reason: "No translation entered yet" }); continue; }
    const ready = await prisma.astrologyAudioAsset.findFirst({ where: { narrationId: narration.id, contentHash: narration.contentHash, status: "READY" }, select: { id: true } });
    if (ready) { skipped.push({ language: lang.code, reason: "Audio already generated for the current text" }); continue; }
    const voices = await prisma.astrologyVoiceConfig.findMany({ where: { languageCode: lang.code, isActive: true }, orderBy: { createdAt: "asc" } });
    const voice = voices.find((v) => modelSupportsLanguage(v.modelId, lang.code));
    if (!voice) { skipped.push({ language: lang.code, reason: "No active voice with a compatible model" }); continue; }
    try {
      const { asset, ...job } = await createGeneration(toolSlug, lang.code, voice.voiceId, voice.modelId, { force: false, adminId });
      jobs.push(job);
      queued.push({ language: lang.code, assetId: asset.id });
    } catch (err) {
      skipped.push({ language: lang.code, reason: err instanceof ApiError ? err.message : "Could not start" });
    }
  }
  enqueue(jobs);
  return { queued, skipped };
}

/** Runs one generation to completion. Never throws: every outcome is recorded on the asset row. */
export async function runJob(job: Job): Promise<void> {
  const fail = (message: string) =>
    prisma.astrologyAudioAsset.update({ where: { id: job.assetId }, data: { status: "FAILED", errorMessage: message.slice(0, 500) } }).catch(() => undefined);
  try {
    // The exact approved text goes to ElevenLabs.
    const audio = await providers.synthesize({ text: job.text, voiceId: job.voiceId, modelId: job.modelId });
    const publicId = `mybhagya/astrology/${job.toolSlug}/${job.language}/v${job.version}-${job.assetId}`;
    const uploaded = await providers.upload(audio, publicId);

    if (!uploaded.url?.startsWith("https://") || !uploaded.publicId) {
      return void (await fail("Cloudinary returned an unusable upload result. Please retry."));
    }
    // If the text changed while we were generating, this audio is already stale.
    const current = await prisma.astrologyNarration.findFirst({ where: { toolSlug: job.toolSlug, language: job.language }, select: { contentHash: true } });
    const stale = current?.contentHash !== job.hash;
    await prisma.astrologyAudioAsset.update({
      where: { id: job.assetId },
      data: {
        status: stale ? "OUTDATED" : "READY",
        cloudinaryUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        durationSeconds: uploaded.durationSeconds,
        bytes: uploaded.bytes,
        errorMessage: null,
      },
    });
  } catch (err) {
    await fail(toApiError(err).message);
  }
}

// ── Publishing ─────────────────────────────────────────────────────────────

/** Publishes a READY asset for the current text. The previous published asset is un-flagged, never deleted. */
export async function publishAsset(assetIdIn: unknown) {
  if (typeof assetIdIn !== "string" || !assetIdIn) throw bad("assetId is required.");
  const found = await prisma.astrologyAudioAsset.findUnique({ where: { id: assetIdIn }, include: { narration: true } });
  if (!found) throw notFound("Audio asset not found");

  return withLock(found.toolSlug, found.language, async (tx) => {
    const asset = await tx.astrologyAudioAsset.findUnique({ where: { id: found.id }, include: { narration: true } });
    if (!asset) throw notFound("Audio asset not found");
    if (asset.isPublished) return asset;
    if (asset.status === "OUTDATED" || asset.narration.contentHash !== asset.contentHash) {
      throw conflict("The narration text changed after this audio was made. Generate new audio before publishing.");
    }
    if (asset.status !== "READY" || !asset.cloudinaryUrl || !asset.cloudinaryPublicId) {
      throw conflict("Only audio that finished generating and uploading can be published.");
    }
    await tx.astrologyAudioAsset.updateMany({
      where: { toolSlug: asset.toolSlug, language: asset.language, isPublished: true },
      data: { isPublished: false },
    });
    return tx.astrologyAudioAsset.update({ where: { id: asset.id }, data: { isPublished: true, publishedAt: new Date() } });
  });
}

// ── Reads ──────────────────────────────────────────────────────────────────

const narrationStatus = (n: { translationStatus: string } | null) => (n ? n.translationStatus : "MISSING");

export async function listTools() {
  await ensureEnglishSeed();
  const [narrations, assets] = await Promise.all([
    prisma.astrologyNarration.findMany(),
    prisma.astrologyAudioAsset.findMany({
      where: { OR: [{ isPublished: true }, { status: { in: ["PENDING", "GENERATING", "FAILED"] } }] },
      select: { toolSlug: true, language: true, status: true, isPublished: true },
    }),
  ]);
  return AUDIO_TOOLS.map((t) => ({
    slug: t.slug,
    label: t.label,
    languages: AUDIO_LANGUAGES.map((l) => {
      const n = narrations.find((x) => x.toolSlug === t.slug && x.language === l.code) ?? null;
      const mine = assets.filter((a) => a.toolSlug === t.slug && a.language === l.code);
      return {
        code: l.code,
        name: l.name,
        translationStatus: narrationStatus(n),
        version: n?.version ?? null,
        published: mine.some((a) => a.isPublished),
        generating: mine.some((a) => a.status === "GENERATING" || a.status === "PENDING"),
      };
    }),
  }));
}

export async function getTool(toolSlugIn: unknown) {
  const { toolSlug } = assertToolAndLanguage(toolSlugIn);
  await ensureEnglishSeed();
  const [narrations, assets, voices] = await Promise.all([
    prisma.astrologyNarration.findMany({ where: { toolSlug } }),
    prisma.astrologyAudioAsset.findMany({ where: { toolSlug }, orderBy: { createdAt: "desc" }, take: 60 }),
    listVoices(),
  ]);
  const tool = AUDIO_TOOLS.find((t) => t.slug === toolSlug)!;
  return {
    slug: tool.slug,
    label: tool.label,
    languages: AUDIO_LANGUAGES.map((l) => {
      const n = narrations.find((x) => x.language === l.code) ?? null;
      const mine = assets.filter((a) => a.language === l.code);
      return {
        code: l.code,
        name: l.name,
        translationStatus: narrationStatus(n),
        narration: n && { title: n.title, text: n.text, version: n.version, contentHash: n.contentHash, updatedAt: n.updatedAt },
        published: mine.find((a) => a.isPublished) ?? null,
        assets: mine.slice(0, 10),
      };
    }),
    voices,
    models: ELEVENLABS_MODELS,
    elevenLabsConfigured: providers.isConfigured(),
  };
}

/** Public: published audio only, and only the fields the player needs. */
export async function getPublishedAudio(toolSlugIn: unknown, languageIn: unknown) {
  const { toolSlug, language } = assertToolAndLanguage(toolSlugIn, languageIn ?? "en");
  const lang = language ?? "en";
  const asset = await prisma.astrologyAudioAsset.findFirst({
    where: { toolSlug, language: lang, isPublished: true, cloudinaryUrl: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { cloudinaryUrl: true, durationSeconds: true, contentVersion: true },
  });
  if (!asset) return { toolSlug, language: lang, available: false as const };
  return { toolSlug, language: lang, available: true as const, url: asset.cloudinaryUrl!, durationSeconds: asset.durationSeconds, version: asset.contentVersion };
}
