import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const AUDIO_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
] as const;
export type AudioLanguage = (typeof AUDIO_LANGUAGES)[number]["code"];

export type PublishedAudio =
  | { available: false }
  | { available: true; url: string; durationSeconds: number | null; version: number };

/** Published audio metadata only. The MP3 itself is not requested until the visitor presses Play. */
export async function fetchPublishedAudio(toolSlug: string, language: AudioLanguage): Promise<PublishedAudio> {
  const res = await fetch(API + "/astrology/tools/" + encodeURIComponent(toolSlug) + "/audio?language=" + language);
  if (!res.ok) throw new Error(`Audio lookup failed (${res.status})`);
  const body = await res.json();
  const d = body?.data;
  if (d?.available === true && typeof d.url === "string" && d.url.startsWith("https://")) {
    return { available: true, url: d.url, durationSeconds: typeof d.durationSeconds === "number" ? d.durationSeconds : null, version: Number(d.version) || 1 };
  }
  return { available: false };
}

export function useAstrologyAudio(toolSlug: string, language: AudioLanguage) {
  return useQuery<PublishedAudio, Error>({
    queryKey: ["astrology-audio", toolSlug, language],
    queryFn: () => fetchPublishedAudio(toolSlug, language),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
