/**
 * Single place for the OpenRouter model used by the interpretation, daily-horoscope and chart-chat
 * features. Override with OPENROUTER_MODEL; the old default (openai/gpt-4-turbo-preview) is no
 * longer served by OpenRouter, so every request to it failed.
 */
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-3-27b-it";
