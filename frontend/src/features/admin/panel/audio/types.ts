export type TranslationStatus = "MISSING" | "SOURCE" | "REVIEWED";
export type AudioStatus = "PENDING" | "GENERATING" | "READY" | "FAILED" | "OUTDATED";

export interface AudioToolSummary {
  slug: string;
  label: string;
  languages: { code: string; name: string; translationStatus: TranslationStatus; version: number | null; published: boolean; generating: boolean }[];
}

export interface AudioAsset {
  id: string;
  language: string;
  contentVersion: number;
  contentHash: string;
  modelId: string;
  voiceId: string;
  cloudinaryUrl: string | null;
  cloudinaryPublicId: string | null;
  durationSeconds: number | null;
  status: AudioStatus;
  isPublished: boolean;
  publishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface VoiceConfig {
  id: string;
  languageCode: string;
  languageName: string;
  voiceId: string;
  voiceName: string;
  modelId: string;
  isActive: boolean;
}

export interface ModelInfo { id: string; label: string; languages: string[] }

export interface AudioToolDetail {
  slug: string;
  label: string;
  languages: {
    code: string;
    name: string;
    translationStatus: TranslationStatus;
    narration: { title: string; text: string; version: number; contentHash: string; updatedAt: string | null } | null;
    published: AudioAsset | null;
    assets: AudioAsset[];
  }[];
  voices: VoiceConfig[];
  models: ModelInfo[];
  elevenLabsConfigured: boolean;
}

export const STATUS_TONE: Record<AudioStatus, "neutral" | "good" | "bad" | "warn"> = {
  PENDING: "neutral",
  GENERATING: "warn",
  READY: "good",
  FAILED: "bad",
  OUTDATED: "warn",
};
